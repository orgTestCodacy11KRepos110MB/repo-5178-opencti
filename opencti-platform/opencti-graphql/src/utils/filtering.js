import { buildRefRelationKey } from '../schema/general';
import {
  RELATION_CREATED_BY,
  RELATION_OBJECT,
  RELATION_OBJECT_LABEL,
  RELATION_OBJECT_MARKING,
} from '../schema/stixMetaRelationship';
import { RELATION_INDICATES } from '../schema/stixCoreRelationship';
import { internalFindByIds } from '../database/middleware-loader';
import { isUserCanAccessStixElement, SYSTEM_USER } from './access';
import { STIX_EXT_OCTI } from '../types/stix-extensions';
import { getParentTypes } from '../schema/schemaUtils';

// Resolutions
export const MARKING_FILTER = 'markedBy';
export const CREATOR_FILTER = 'createdBy';
export const ASSIGNEE_FILTER = 'assigneeTo';
export const OBJECT_CONTAINS_FILTER = 'objectContains';
export const RESOLUTION_FILTERS = [MARKING_FILTER, CREATOR_FILTER, ASSIGNEE_FILTER, OBJECT_CONTAINS_FILTER];
// Values
export const LABEL_FILTER = 'labelledBy';
export const TYPE_FILTER = 'entity_type';
export const INDICATOR_FILTER = 'indicator_types';
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
    const adaptedFilters = await convertFiltersFrontendFormat(filters);
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

// TODO Add filtering testing JRI
export const isStixMatchFilters = async (context, user, stix, filters) => {
  // We can start checking the user can access the stix (marking + segregation).
  const isUserHasAccessToElement = await isUserCanAccessStixElement(context, user, stix);
  if (!isUserHasAccessToElement) {
    return false;
  }
  // Pre-filter transformation to handle specific frontend format
  const adaptedFilters = await convertFiltersFrontendFormat(context, filters);
  // User is granted, but we still need to apply filters if needed
  for (let index = 0; index < adaptedFilters.length; index += 1) {
    const { key, operator, values } = adaptedFilters[index];
    if (values.length > 0) {
      // Markings filtering
      if (key === MARKING_FILTER) {
        const instanceMarkings = stix.object_marking_refs || [];
        const ids = values.map((v) => v.id);
        const isMarkingAvailable = ids.some((r) => instanceMarkings.includes(r));
        // If marking is available but must not be
        if (operator === 'not_eq' && isMarkingAvailable) {
          return false;
        }
        // If marking is not available but must be
        if (operator === 'eq' && !isMarkingAvailable) {
          return false;
        }
      }
      // Entity type filtering
      if (key === TYPE_FILTER) {
        const instanceType = stix.extensions[STIX_EXT_OCTI].type;
        const instanceAllTypes = [instanceType, ...getParentTypes(instanceType)];
        const isTypeAvailable = values.some((v) => instanceAllTypes.includes(v.id));
        // If entity type is available but must not be
        if (operator === 'not_eq' && isTypeAvailable) {
          return false;
        }
        // If entity type is not available but must be
        if (operator === 'eq' && !isTypeAvailable) {
          return false;
        }
      }
      // Indicator type filtering
      if (key === INDICATOR_FILTER) {
        const indicators = stix.indicator_types ?? [];
        const extractedValues = values.map((v) => v.value);
        const isTypeAvailable = extractedValues.some((r) => indicators.includes(r));
        // If indicator type is available but must not be
        if (operator === 'not_eq' && isTypeAvailable) {
          return false;
        }
        // If indicator type is not available but must be
        if (operator === 'eq' && !isTypeAvailable) {
          return false;
        }
      }
      // Workflow filtering
      if (key === WORKFLOW_FILTER) {
        const workflowId = stix.extensions[STIX_EXT_OCTI].workflow_id;
        const isWorkflowAvailable = workflowId && values.map((v) => v.id).includes(workflowId);
        // If workflow is available but must not be
        if (operator === 'not_eq' && isWorkflowAvailable) {
          return false;
        }
        // If workflow is not available but must be
        if (operator === 'eq' && !isWorkflowAvailable) {
          return false;
        }
      }
      // Creator filtering
      if (key === CREATOR_FILTER) {
        const ids = values.map((v) => v.id);
        const isCreatorAvailable = stix.created_by_ref && ids.includes(stix.created_by_ref);
        // If creator is available but must not be
        if (operator === 'not_eq' && isCreatorAvailable) {
          return false;
        }
        // If creator is not available but must be
        if (operator === 'eq' && !isCreatorAvailable) {
          return false;
        }
      }
      // Assignee filtering
      if (key === ASSIGNEE_FILTER) {
        const assignees = stix.extensions[STIX_EXT_OCTI]?.object_assignee_refs ?? [];
        const extractedValues = values.map((v) => v.id);
        const isAssigneeAvailable = extractedValues.some((r) => assignees.includes(r));
        // If assignee is available but must not be
        if (operator === 'not_eq' && isAssigneeAvailable) {
          return false;
        }
        // If assignee is not available but must be
        if (operator === 'eq' && !isAssigneeAvailable) {
          return false;
        }
      }
      // Labels filtering
      if (key === LABEL_FILTER) {
        // Handle no label filtering
        const isNoLabelRequire = values.map((v) => v.id).includes(null);
        if (operator === 'not_eq' && isNoLabelRequire && (stix.labels ?? []).length === 0) {
          return false;
        }
        if (operator === 'eq' && isNoLabelRequire && (stix.labels ?? []).length > 0) {
          return false;
        }
        // Get only required labels
        const labels = values.map((v) => (v.id ? v.value : null)).filter((v) => v !== null);
        if (labels.length > 0) {
          const isLabelAvailable = labels.some((r) => (stix.labels ?? []).includes(r));
          // If label is available but must not be
          if (operator === 'not_eq' && isLabelAvailable) {
            return false;
          }
          // If label is not available but must be
          if (operator === 'eq' && !isLabelAvailable) {
            return false;
          }
        }
      }
      // Revoked or Detected filtering
      if (key === REVOKED_FILTER || key === DETECTION_FILTER) {
        const { id } = values.at(0) ?? {};
        const isRevoked = (id === 'true') === stix.revoked;
        if (!isRevoked) {
          return false;
        }
      }
      // Numeric filtering
      if (key === SCORE_FILTER || key === CONFIDENCE_FILTER) {
        const { id } = values.at(0) ?? {};
        let found = false;
        const numeric = parseInt(id, 10);
        const instanceValue = stix[key];
        switch (operator) {
          case 'lt':
            found = instanceValue < numeric;
            break;
          case 'lte':
            found = instanceValue <= numeric;
            break;
          case 'gt':
            found = instanceValue > numeric;
            break;
          case 'gte':
            found = instanceValue >= numeric;
            break;
          default:
            found = instanceValue === numeric;
        }
        if (!found) {
          return false;
        }
      }
      // Pattern type filtering
      if (key === PATTERN_FILTER) {
        const currentPattern = stix.pattern_type;
        const isPatternFound = values.map((v) => v.id).includes(currentPattern);
        // If pattern is available but must not be
        if (operator === 'not_eq' && isPatternFound) {
          return false;
        }
        // If pattern is not available but must be
        if (operator === 'eq' && !isPatternFound) {
          return false;
        }
      }
      // object Refs filtering
      if (key === OBJECT_CONTAINS_FILTER) {
        const instanceObjects = [...(stix.object_refs ?? []), ...(stix.extensions[STIX_EXT_OCTI].object_refs_inferred ?? [])];
        const ids = values.map((v) => v.id);
        const isRefFound = ids.some((r) => instanceObjects.includes(r));
        // If ref is available but must not be
        if (operator === 'not_eq' && isRefFound) {
          return false;
        }
        // If ref is not available but must be
        if (operator === 'eq' && !isRefFound) {
          return false;
        }
      }
    }
  }
  return true;
};
