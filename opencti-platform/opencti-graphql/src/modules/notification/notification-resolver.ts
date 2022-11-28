import { withFilter } from 'graphql-subscriptions';
import type { Notification, Resolvers } from '../../generated/graphql';
import { findAll, findById, notificationDelete, notificationEditRead } from './notification-domain';
import { pubsub } from '../../database/redis';
import { BUS_TOPICS } from '../../config/conf';
import { ENTITY_TYPE_NOTIFICATION } from './notification-types';

const notificationResolvers: Resolvers = {
  Query: {
    notification: (_, { id }, context) => findById(context, context.user, id),
    notifications: (_, args, context) => findAll(context, context.user, args),
  },
  Mutation: {
    notificationDelete: (_, { id }, context) => notificationDelete(context, context.user, id),
    notificationMarkRead: (_, { id, read }, context) => notificationEditRead(context, context.user, id, read),
  },
  Subscription: {
    notification: {
      resolve: /* istanbul ignore next */ (payload: any) => payload.instance,
      subscribe: /* istanbul ignore next */ (_, __, context) => {
        const asyncIterator = pubsub.asyncIterator<Notification>(BUS_TOPICS[ENTITY_TYPE_NOTIFICATION].ADDED_TOPIC);
        const filtering = withFilter(() => asyncIterator, (payload) => payload && payload.user.id !== context.user.id)();
        return { [Symbol.asyncIterator]() { return filtering; } };
      },
    },
  },
};

export default notificationResolvers;
