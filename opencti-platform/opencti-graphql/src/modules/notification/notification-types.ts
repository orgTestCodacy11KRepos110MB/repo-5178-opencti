import type { BasicStoreEntity, StoreEntity } from '../../types/store';
import type { StixObject, StixOpenctiExtensionSDO } from '../../types/stix-common';
import { STIX_EXT_OCTI } from '../../types/stix-extensions';

export const ENTITY_TYPE_NOTIFICATION = 'Notification';

export interface NotificationAddInput {
  messages: Array<string>;
  user_id: string;
  is_read: boolean;
}

// region Database types
export interface BasicStoreEntityNotification extends BasicStoreEntity {
  messages: Array<string>;
  is_read: boolean;
  notification_id: string;
  notification_uri: string;
}

export interface StoreEntityNotification extends StoreEntity {
  messages: Array<string>;
  is_read: boolean;
  notification_id: string;
  notification_uri: string;
}
// endregion

// region Stix type
export interface StixNotification extends StixObject {
  messages: Array<string>;
  is_read: boolean;
  extensions: {
    [STIX_EXT_OCTI]: StixOpenctiExtensionSDO
  };
}
// endregion
