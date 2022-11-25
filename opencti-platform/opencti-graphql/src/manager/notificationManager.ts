import * as R from 'ramda';
import { Promise as Bluebird } from 'bluebird';
import { clearIntervalAsync, setIntervalAsync, SetIntervalAsyncTimer } from 'set-interval-async/fixed';
import { createStreamProcessor, lockResource, storeNotificationEvent, StreamProcessor } from '../database/redis';
import conf, { logApp } from '../config/conf';
import { TYPE_LOCK_ERROR } from '../config/errors';
import { executionContext, SYSTEM_USER } from '../utils/access';
import type { StreamEvent } from '../types/event';
import type { BasicFilterValue } from '../utils/sseFiltering';
import { isInstanceMatchFilters } from '../utils/sseFiltering';
import type { AuthContext, AuthUser } from '../types/user';
import type { BasicStoreRelation } from '../types/store';
import { listAllRelations } from '../database/middleware-loader';
import { RELATION_MEMBER_OF } from '../schema/internalRelationship';
import { ES_MAX_CONCURRENCY } from '../database/engine';
import { resolveUserById } from '../domain/user';
import type { StixCoreObject } from '../types/stix-common';

const NOTIFICATION_ENGINE_KEY = conf.get('notification_manager:lock_key');
const SCHEDULE_TIME = 10000;

/*
Subscribe to reports (or any container) about a specific identity, location or threat (object_ref)
Subscribe to new victims (Identity or Location) of a specific threat (targets)
Subscribe to new indicators of a specific threat (indicates)
Subscribe to new threats targeting a specific identity or location (targets)
Subscribe to new sighting sighted-in a specific entity (sightings in France, IMPORTANT)
Subscribe to new malware used by a threat (uses)
 */

export type FrontendFilter = Record<string, Array<BasicFilterValue>>;

interface Notification {
  internal_id: string;
  user_id?: string;
  group_ids?: Array<string>;
  type: 'notification' | 'digest'
  event_types: Array<'update' | 'create' | 'delete'>;
  outcomes: Array<string>;
}
interface LiveNotification extends Notification {
  type: 'notification';
  filters: FrontendFilter;
}
interface ResolvedLiveNotification extends LiveNotification {
  users: Array<AuthUser>;
}
interface DigestNotification extends Notification {
  type: 'digest';
  rhythm: string;
  notifications: Array<string>;
}
interface NotificationEvent {
  notification_id: string;
  user_id: string;
  data: StixCoreObject;
  outcomes: Array<string>;
}

const OUTCOME_UI = 'f4ee7b33-006a-4b0d-b57d-411ad288653d';
const OUTCOME_MAIL = '44fcf1f4-8e31-4b31-8dbc-cd6993e1b822';

const notifications: Array<LiveNotification | DigestNotification> = [
  {
    internal_id: '1c449a99-4a7e-4fc6-a091-8935a8bfe2f8',
    user_id: 'd6c75e52-00f4-4216-ac31-98a0dd826fa4', // Julien
    type: 'notification', // or digest
    event_types: ['create', 'update'],
    filters: {
      entity_type: [{ id: 'Report', value: 'Report' }],
      objectContains: [{ id: '50767ae3-dbe6-4847-a3c1-4553ca157f97', value: 'Energy' }],
      // x_opencti_workflow_id: [{ id: '36d5c7bb-68a3-4d2e-af75-be9293d1f1fb', value: 'SHARED' }],
      // createdBy: [{ id: 'f7ada94a-6049-4161-a177-d8cb49d73349', value: 'FIREDEPT' }],
      // markedBy: [{ id: 'e4f234c6-f903-4705-85c0-aec20bdba304', value: 'TLP:GREEN' }]
    },
    outcomes: [OUTCOME_UI, OUTCOME_MAIL]
  },
  {
    internal_id: '8419ef73-6667-4a77-95e5-390275d2fc1d',
    group_ids: ['d8304260-5ebc-48da-b6db-91428d2c8bd2'], // GR group
    type: 'digest',
    event_types: ['create'],
    rhythm: 'P1M',
    notifications: ['1c449a99-4a7e-4fc6-a091-8935a8bfe2f8'],
    outcomes: ['f4ee7b33-006a-4b0d-b57d-411ad288653d']
  }
];

export const isLive = (notification: LiveNotification | DigestNotification): notification is LiveNotification => {
  return notification.type === 'notification';
};
export const isDefine = (elem: any): elem is any => {
  return elem !== undefined;
};
export const resolveLiveNotifications = async (context: AuthContext): Promise<Array<ResolvedLiveNotification>> => {
  const liveNotifications = notifications.filter(isLive);
  const notificationUserIds: Array<string> = liveNotifications.map((l) => l.user_id).filter(isDefine);
  const groupsIds = liveNotifications.map((l) => (l.group_ids ?? [])).flat();
  const membersRel = await listAllRelations<BasicStoreRelation>(context, SYSTEM_USER, RELATION_MEMBER_OF, { toId: groupsIds });
  const userIdGroup: Array<{ group: string; user: string; }> = membersRel.map((rel) => ({ group: rel.toId, user: rel.fromId }));
  const groupUserIds = R.groupBy((userGroup) => userGroup.group, userIdGroup);
  const allUserIds: Array<string> = [...notificationUserIds, ...Object.values(groupUserIds).flat().map((v) => v.user)];
  const userMaps = new Map();
  const userResolver = async (userId: string) => {
    const user = await resolveUserById(context, userId);
    userMaps.set(user.internal_id, user);
  };
  await Bluebird.map(allUserIds, userResolver, { concurrency: ES_MAX_CONCURRENCY });
  return liveNotifications.map((l) => {
    const userIds = new Set([l.user_id, ...(l.group_ids ?? []).map((id) => groupUserIds[id]).flat()].filter(isDefine));
    return { ...l, users: Array.from(userIds).map((i) => userMaps.get(i)) };
  });
};

const notificationStreamHandler = async (streamEvents: Array<StreamEvent>) => {
  try {
    const context = executionContext('notification_manager');
    const liveNotifications = await resolveLiveNotifications(context); // TODO @JRI add caching
    for (let index = 0; index < streamEvents.length; index += 1) {
      const { data: { data }, event: eventType } = streamEvents[index];
      // For each event we need to check if
      for (let notifIndex = 0; notifIndex < liveNotifications.length; notifIndex += 1) {
        const { internal_id: notification_id, users, filters, event_types, outcomes } = liveNotifications[notifIndex];
        if (event_types.includes(eventType)) {
          for (let indexUser = 0; indexUser < users.length; indexUser += 1) {
            const user = users[indexUser];
            // TODO @JRI isInstanceMatchFilters currently resolving filter without caching
            const isMatch = await isInstanceMatchFilters(context, user, data, filters);
            if (isMatch) {
              const notificationEvent: NotificationEvent = { notification_id, user_id: user.internal_id, data, outcomes };
              await storeNotificationEvent(context, user, notificationEvent);
            }
          }
        }
      }
    }
  } catch (e) {
    logApp.error('[OPENCTI-MODULE] Error executing notification manager', { error: e });
  }
};

const initNotificationManager = () => {
  const WAIT_TIME_ACTION = 2000;
  let scheduler: SetIntervalAsyncTimer<[]>;
  let streamProcessor: StreamProcessor;
  let notificationListening = true;
  const wait = (ms: number) => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  };
  const notificationHandler = async (lastEventId: string) => {
    let lock;
    try {
      // Lock the manager
      lock = await lockResource([NOTIFICATION_ENGINE_KEY]);
      logApp.info('[OPENCTI-MODULE] Running notification manager');
      streamProcessor = createStreamProcessor(SYSTEM_USER, 'Notification manager', false, notificationStreamHandler);
      await streamProcessor.start(lastEventId);
      while (notificationListening) {
        await wait(WAIT_TIME_ACTION);
      }
    } catch (e: any) {
      if (e.name === TYPE_LOCK_ERROR) {
        logApp.info('[OPENCTI-MODULE] Notification manager already started by another API');
      } else {
        logApp.error('[OPENCTI-MODULE] Notification manager failed to start', { error: e });
      }
    } finally {
      if (streamProcessor) await streamProcessor.shutdown();
      if (lock) await lock.unlock();
    }
  };
  return {
    start: async () => {
      // To start the manager we need to find the last event id indexed
      // and restart the stream consumption from this point.
      const lastEventId = 'live';
      // Start the listening of events
      scheduler = setIntervalAsync(async () => {
        if (notificationListening) {
          await notificationHandler(lastEventId);
        }
      }, SCHEDULE_TIME);
    },
    shutdown: async () => {
      notificationListening = false;
      if (scheduler) {
        await clearIntervalAsync(scheduler);
      }
      return true;
    },
  };
};
const notificationManager = initNotificationManager();

export default notificationManager;
