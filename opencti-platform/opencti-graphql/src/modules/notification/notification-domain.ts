import type { AuthContext, AuthUser } from '../../types/user';
import {
  createEntity,
  deleteElementById,
  patchAttribute,
  updateAttribute
} from '../../database/middleware';
import { notify } from '../../database/redis';
import { BUS_TOPICS } from '../../config/conf';
import type {
  EditInput,
  QueryNotificationsArgs,
  QueryTriggersArgs,
  TriggerDigestAddInput,
  TriggerLiveAddInput
} from '../../generated/graphql';
import {
  internalFindByIds,
  listEntitiesPaginated,
  storeLoadById,
} from '../../database/middleware-loader';
import {
  BasicStoreEntityDigestTrigger,
  BasicStoreEntityLiveTrigger,
  BasicStoreEntityNotification,
  BasicStoreEntityTrigger,
  ENTITY_TYPE_NOTIFICATION,
  ENTITY_TYPE_TRIGGER,
  NotificationAddInput
} from './notification-types';
import { now } from '../../utils/format';

// Outcomes

// Triggers
export const addLiveTrigger = async (context: AuthContext, user: AuthUser, trigger: TriggerLiveAddInput) => {
  const defaultOpts = { trigger_type: 'live', user_ids: [user.id], group_ids: [], created: now(), updated: now() };
  const liveTrigger = { ...trigger, ...defaultOpts };
  const created = await createEntity(context, user, liveTrigger, ENTITY_TYPE_TRIGGER);
  return notify(BUS_TOPICS[ENTITY_TYPE_TRIGGER].ADDED_TOPIC, created, user) as BasicStoreEntityLiveTrigger;
};
export const addDigestTrigger = async (context: AuthContext, user: AuthUser, trigger: TriggerDigestAddInput) => {
  const defaultOpts = { trigger_type: 'digest', user_ids: [user.id], group_ids: [], created: now(), updated: now() };
  const digestTrigger = { ...trigger, ...defaultOpts };
  const created = await createEntity(context, user, digestTrigger, ENTITY_TYPE_TRIGGER);
  return notify(BUS_TOPICS[ENTITY_TYPE_TRIGGER].ADDED_TOPIC, created, user) as BasicStoreEntityDigestTrigger;
};
export const triggerGet = (context: AuthContext, user: AuthUser, triggerId: string): BasicStoreEntityTrigger => {
  return storeLoadById(context, user, triggerId, ENTITY_TYPE_TRIGGER) as unknown as BasicStoreEntityTrigger;
};

export const triggersGet = (context: AuthContext, user: AuthUser, triggerIds: string[]): BasicStoreEntityTrigger[] => {
  return internalFindByIds(context, user, triggerIds) as unknown as BasicStoreEntityTrigger[];
};

export const triggerEdit = async (context: AuthContext, user: AuthUser, triggerId: string, input: EditInput[]) => {
  const { element: updatedElem } = await updateAttribute(context, user, triggerId, ENTITY_TYPE_TRIGGER, input);
  return updatedElem;
};
export const triggerDelete = (context: AuthContext, user: AuthUser, triggerId: string) => {
  return deleteElementById(context, user, triggerId, ENTITY_TYPE_TRIGGER);
};
export const triggersFind = (context: AuthContext, user: AuthUser, opts: QueryTriggersArgs) => {
  return listEntitiesPaginated<BasicStoreEntityTrigger>(context, user, [ENTITY_TYPE_TRIGGER], opts);
};

// region Notifications
export const notificationGet = (context: AuthContext, user: AuthUser, narrativeId: string): BasicStoreEntityNotification => {
  return storeLoadById(context, user, narrativeId, ENTITY_TYPE_NOTIFICATION) as unknown as BasicStoreEntityNotification;
};

export const notificationsFind = (context: AuthContext, user: AuthUser, opts: QueryNotificationsArgs) => {
  return listEntitiesPaginated<BasicStoreEntityNotification>(context, user, [ENTITY_TYPE_NOTIFICATION], opts);
};

export const notificationDelete = (context: AuthContext, user: AuthUser, notificationId: string) => {
  return deleteElementById(context, user, notificationId, ENTITY_TYPE_NOTIFICATION);
};

export const notificationEditRead = async (context: AuthContext, user: AuthUser, notificationId: string, read: boolean) => {
  const { element } = await patchAttribute(context, user, notificationId, ENTITY_TYPE_NOTIFICATION, { is_read: read });
  return notify(BUS_TOPICS[ENTITY_TYPE_NOTIFICATION].EDIT_TOPIC, element, user);
};

export const addNotification = async (context: AuthContext, user: AuthUser, notification: NotificationAddInput) => {
  const created = await createEntity(context, user, notification, ENTITY_TYPE_NOTIFICATION);
  return notify(BUS_TOPICS[ENTITY_TYPE_NOTIFICATION].ADDED_TOPIC, created, user);
};
// endregion
