import { withFilter } from 'graphql-subscriptions';
import type { Notification, Resolvers } from '../../generated/graphql';
import {
  addLiveTrigger,
  notificationDelete,
  notificationEditRead,
  notificationGet,
  notificationsFind,
  triggerDelete,
  triggerEdit,
  triggerGet,
  triggersFind
} from './notification-domain';
import { pubsub } from '../../database/redis';
import { BUS_TOPICS } from '../../config/conf';
import { ENTITY_TYPE_NOTIFICATION } from './notification-types';

const notificationResolvers: Resolvers = {
  Query: {
    // Triggers
    trigger: (_, { id }, context) => triggerGet(context, context.user, id),
    triggers: (_, args, context) => triggersFind(context, context.user, args),
    // Notifications
    notification: (_, { id }, context) => notificationGet(context, context.user, id),
    notifications: (_, args, context) => notificationsFind(context, context.user, args),
  },
  Mutation: {
    triggerFieldPatch: (_, { id, input }, context) => triggerEdit(context, context.user, id, input),
    triggerDelete: (_, { id }, context) => triggerDelete(context, context.user, id),
    triggerLiveAdd: (_, { input }, context) => addLiveTrigger(context, context.user, input),
    notificationDelete: (_, { id }, context) => notificationDelete(context, context.user, id),
    notificationMarkRead: (_, { id, read }, context) => notificationEditRead(context, context.user, id, read),
  },
  Subscription: {
    notification: {
      resolve: /* istanbul ignore next */ (payload: any) => payload.instance,
      subscribe: /* istanbul ignore next */ (_, __, context) => {
        const asyncIterator = pubsub.asyncIterator<Notification>(BUS_TOPICS[ENTITY_TYPE_NOTIFICATION].ADDED_TOPIC);
        const filtering = withFilter(() => asyncIterator, (payload) => {
          return payload && payload.instance.user_id === context.user.id;
        })();
        return { [Symbol.asyncIterator]() { return filtering; } };
      },
    },
  },
};

export default notificationResolvers;
