import {
  CONFIDENCE_FILTER,
  convertFiltersFrontendFormat,
  CREATOR_FILTER,
  DETECTION_FILTER,
  LABEL_FILTER,
  MARKING_FILTER, OBJECT_CONTAINS_FILTER,
  PATTERN_FILTER,
  REVOKED_FILTER,
  SCORE_FILTER,
  TYPE_FILTER,
  WORKFLOW_FILTER
} from './filtering';
import { STIX_EXT_OCTI } from '../types/stix-extensions';
import { getParentTypes } from '../schema/schemaUtils';
import type { AuthContext, AuthUser } from '../types/user';
import type { FrontendFilter } from '../manager/notificationManager';
import { isUserCanAccessStixElement } from './access';
import type { StixCoreObject } from '../types/stix-common';

export interface BasicFilterValue {
  id: string;
  value: string;
}

export const isInstanceMatchFilters = async (context: AuthContext, user:AuthUser, instance: Record<string, any>, filters: FrontendFilter) => {
  // We can start checking the user can access the instance (marking + segregation).
  const isUserHasAccessToElement = await isUserCanAccessStixElement(context, user, instance as StixCoreObject);
  if (!isUserHasAccessToElement) {
    return false;
  }
  // Pre-filter transformation to handle specific frontend format
  const adaptedFilters = await convertFiltersFrontendFormat(context, filters);
  // User is granted, but we still need to apply filters if needed
  for (let index = 0; index < adaptedFilters.length; index += 1) {
    const { key, operator, values } = adaptedFilters[index];
    // Markings filtering
    if (key === MARKING_FILTER) {
      if (values.length === 0) {
        return true;
      }
      const instanceMarkings = instance.object_marking_refs || [];
      if (values.length > 0 && instanceMarkings.length === 0) {
        return false;
      }
      const ids = values.map((v: BasicFilterValue) => v.id);
      const found = ids.some((r: string) => instanceMarkings.includes(r));
      if (!found) {
        return false;
      }
    }
    // Entity type filtering
    if (key === TYPE_FILTER) {
      const instanceType = instance.extensions[STIX_EXT_OCTI].type;
      const instanceAllTypes = [instanceType, ...getParentTypes(instanceType)];
      let found = false;
      if (values.length === 0) {
        found = true;
      } else {
        // eslint-disable-next-line no-restricted-syntax
        for (const filter of values) {
          if (instanceAllTypes.includes(filter.id)) {
            found = true;
          }
        }
      }
      if (!found) {
        return false;
      }
    }
    // Workflow
    if (key === WORKFLOW_FILTER) {
      const workflowId = instance.extensions[STIX_EXT_OCTI].workflow_id;
      if (!workflowId) {
        return false;
      }
      const found = values.map((v: BasicFilterValue) => v.id).includes(workflowId);
      if (!found) {
        return false;
      }
    }
    // Creator filtering
    if (key === CREATOR_FILTER) {
      if (values.length === 0) {
        return true;
      }
      if (values.length > 0 && instance.created_by_ref === undefined) {
        return false;
      }
      const ids = values.map((v: BasicFilterValue) => v.id);
      const found = ids.includes(instance.created_by_ref);
      if (!found) {
        return false;
      }
    }
    // Labels filtering
    if (key === LABEL_FILTER) {
      const labels = values.map((v: BasicFilterValue) => v.value);
      const found = labels.some((r: string) => instance.labels.includes(r));
      if (!found) {
        return false;
      }
    }
    // Boolean filtering
    if (key === REVOKED_FILTER || key === DETECTION_FILTER) {
      const { id } = values.at(0) ?? {};
      const found = (id === 'true') === instance.revoked;
      if (!found) {
        return false;
      }
    }
    // Numeric filtering
    if (key === SCORE_FILTER || key === CONFIDENCE_FILTER) {
      const { id } = values.at(0) ?? {};
      let found = false;
      const numeric = parseInt(id, 10);
      const instanceValue = instance[key];
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
    // String filtering
    if (key === PATTERN_FILTER) {
      const currentPattern = instance[key];
      const found = values.map((v: BasicFilterValue) => v.id).includes(currentPattern);
      if (!found) {
        return false;
      }
    }
    // object Refs filtering
    if (key === OBJECT_CONTAINS_FILTER) {
      if (values.length === 0) {
        return true;
      }
      const instanceObjects = instance.object_refs || [];
      if (values.length > 0 && instanceObjects.length === 0) {
        return false;
      }
      const ids = values.map((v: BasicFilterValue) => v.id);
      const found = ids.some((r: string) => instanceObjects.includes(r));
      if (!found) {
        return false;
      }
    }
  }
  return true;
};
