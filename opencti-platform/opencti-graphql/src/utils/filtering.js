import { buildRefRelationKey } from '../schema/general';
import {
  RELATION_CREATED_BY,
  RELATION_OBJECT,
  RELATION_OBJECT_LABEL,
  RELATION_OBJECT_MARKING,
} from '../schema/stixMetaRelationship';
import { RELATION_INDICATES } from '../schema/stixCoreRelationship';
import { internalFindByIds } from '../database/middleware';
import { SYSTEM_USER } from './access';

// Resolutions
export const MARKING_FILTER = 'markedBy';
export const CREATOR_FILTER = 'createdBy';
export const OBJECT_CONTAINS_FILTER = 'objectContains';
export const RESOLUTION_FILTERS = [MARKING_FILTER, CREATOR_FILTER, OBJECT_CONTAINS_FILTER];
// Values
export const LABEL_FILTER = 'labelledBy';
export const TYPE_FILTER = 'entity_type';
export const SCORE_FILTER = 'x_opencti_score';
export const DETECTION_FILTER = 'x_opencti_detection';
export const WORKFLOW_FILTER = 'x_opencti_workflow_id';
export const CONFIDENCE_FILTER = 'confidence';
export const REVOKED_FILTER = 'revoked';
export const PATTERN_FILTER = 'pattern_type';

export const GlobalFilters = {
  createdBy: buildRefRelationKey(RELATION_CREATED_BY),
  markedBy: buildRefRelationKey(RELATION_OBJECT_MARKING),
  labelledBy: buildRefRelationKey(RELATION_OBJECT_LABEL),
  indicates: buildRefRelationKey(RELATION_INDICATES),
  containedBy: buildRefRelationKey(RELATION_OBJECT),
  creator: 'creator_id',
};

export const convertFiltersFrontendFormat = async (context, filters) => {
  const adaptedFilters = [];
  const filterEntries = Object.entries(filters);
  // Grab all values that are internal_id that needs to be converted to standard_ids
  const resolvedMap = new Map();
  const internalIdsToResolve = filterEntries.filter(([key]) => RESOLUTION_FILTERS.includes(key))
    .map(([, values]) => values.map((v) => v.id)).flat();
  if (internalIdsToResolve.length > 0) {
    // TODO @JRI Think about caching of filters ids
    const resolvedElements = (await internalFindByIds(context, SYSTEM_USER, internalIdsToResolve)) ?? [];
    resolvedElements.forEach((element) => resolvedMap.set(element.id, element.standard_id));
  }
  // Remap the format of specific keys
  for (let index = 0; index < filterEntries.length; index += 1) {
    const [key, values] = filterEntries[index];
    if (key.endsWith('start_date') || key.endsWith('_gt')) {
      const workingKey = key.replace('_start_date', '').replace('_gt', '');
      adaptedFilters.push({ key: workingKey, operator: 'gt', values });
    } else if (key.endsWith('end_date') || key.endsWith('_lt')) {
      const workingKey = key.replace('_end_date', '').replace('_lt', '');
      adaptedFilters.push({ key: workingKey, operator: 'lt', values });
    } else if (key.endsWith('_lte')) {
      const workingKey = key.replace('_lte', '');
      adaptedFilters.push({ key: workingKey, operator: 'lte', values });
    } else if (key.endsWith('_not_eq')) {
      const workingKey = key.replace('_not_eq', '');
      adaptedFilters.push({ key: workingKey, operator: 'not_eq', values, filterMode: 'and' });
    } else if (RESOLUTION_FILTERS.includes(key)) {
      const mappedValues = values.map((v) => [v, { id: resolvedMap.get(v.id), value: v.value }]).flat();
      adaptedFilters.push({ key, operator: 'eq', values: mappedValues });
    } else {
      adaptedFilters.push({ key, operator: 'eq', values, filterMode: 'or' });
    }
  }
  return adaptedFilters;
};

export const convertFiltersToQueryOptions = async (context, filters, opts = {}) => {
  const { after, before, defaultTypes = [], field = 'updated_at', orderMode = 'asc' } = opts;
  const queryFilters = [];
  const types = [...defaultTypes];
  if (filters) {
    const adaptedFilters = convertFiltersFrontendFormat(filters);
    for (let index = 0; index < adaptedFilters.length; index += 1) {
      // eslint-disable-next-line prefer-const
      let { key, operator, values, filterMode } = adaptedFilters[index];
      if (key === TYPE_FILTER) {
        types.push(...values.map((v) => v.id));
      } else {
        queryFilters.push({ key: GlobalFilters[key] || key, values: values.map((v) => v.id), operator, filterMode });
      }
    }
  }
  if (after) {
    queryFilters.push({ key: field, values: [after], operator: 'gte' });
  }
  if (before) {
    queryFilters.push({ key: field, values: [before], operator: 'lte' });
  }
  return { types, orderMode, orderBy: [field, 'internal_id'], filters: queryFilters };
};
