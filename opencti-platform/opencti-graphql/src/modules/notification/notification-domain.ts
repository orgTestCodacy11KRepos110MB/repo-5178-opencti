import type { AuthContext, AuthUser } from '../../types/user';
import { createEntity, deleteElementById, patchAttribute, storeLoadById } from '../../database/middleware';
import { notify } from '../../database/redis';
import { BUS_TOPICS } from '../../config/conf';
import type { QueryNotificationsArgs } from '../../generated/graphql';
import { listEntitiesPaginated } from '../../database/middleware-loader';
import { BasicStoreEntityNotification, ENTITY_TYPE_NOTIFICATION, NotificationAddInput } from './notification-types';

export const findById = (context: AuthContext, user: AuthUser, narrativeId: string): BasicStoreEntityNotification => {
  return storeLoadById(context, user, narrativeId, ENTITY_TYPE_NOTIFICATION) as unknown as BasicStoreEntityNotification;
};

export const findAll = (context: AuthContext, user: AuthUser, opts: QueryNotificationsArgs) => {
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
