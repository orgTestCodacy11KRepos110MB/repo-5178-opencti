import { v4 as uuidv4 } from 'uuid';
import notificationTypeDefs from './notification.graphql';
import convertNotificationToStix from './notification-converter';
import notificationResolvers from './notification-resolver';
import { ENTITY_TYPE_NOTIFICATION, StoreEntityNotification } from './notification-types';
import type { ModuleDefinition } from '../../types/module';
import { registerDefinition } from '../../types/module';
import { ABSTRACT_INTERNAL_OBJECT } from '../../schema/general';

const NOTIFICATION_DEFINITION: ModuleDefinition<StoreEntityNotification> = {
  type: {
    id: 'notifications',
    name: ENTITY_TYPE_NOTIFICATION,
    category: ABSTRACT_INTERNAL_OBJECT
  },
  graphql: {
    schema: notificationTypeDefs,
    resolver: notificationResolvers,
  },
  identifier: {
    definition: {
      [ENTITY_TYPE_NOTIFICATION]: () => uuidv4(),
    },
  },
  attributes: [
    { name: 'messages', type: 'string', multiple: true, upsert: false },
    { name: 'is_read', type: 'boolean', multiple: false, upsert: true },
  ],
  relations: [],
  converter: convertNotificationToStix
};

registerDefinition(NOTIFICATION_DEFINITION);
