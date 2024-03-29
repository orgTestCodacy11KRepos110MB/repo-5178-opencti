import type { BasicStoreEntity, StoreEntity } from '../../types/store';
import type { StixDomainObject, StixOpenctiExtensionProperty, StixId } from '../../types/stix-common';
import { STIX_EXT_OCTI } from '../../types/stix-extensions';

export const ENTITY_TYPE_CONTAINER_GROUPING = 'Grouping';

// region Database types
export interface BasicStoreEntityGrouping extends BasicStoreEntity {
  name: string;
  description: string;
  context: string;
  object_refs: Array<string>;
}

export interface StoreEntityGrouping extends StoreEntity {
  name: string;
  description: string;
  context: string;
  object_refs: Array<string>;
}
// endregion

// region Stix type
export interface StixGrouping extends StixDomainObject {
  name: string;
  description: string;
  context: string;
  object_refs: Array<StixId>;
  extensions: {
    [STIX_EXT_OCTI] : StixOpenctiExtensionProperty
  };
}
// endregion

export interface GroupingNumberResult {
  count: number;
  total: number;
}
