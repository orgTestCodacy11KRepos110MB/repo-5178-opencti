import ejs from 'ejs';
import axios from 'axios';
import { clearIntervalAsync, setIntervalAsync, SetIntervalAsyncTimer } from 'set-interval-async/fixed';
import { createStreamProcessor, lockResource, NOTIFICATION_STREAM_NAME, StreamProcessor } from '../database/redis';
import conf, { basePath, baseUrl, logApp } from '../config/conf';
import { TYPE_LOCK_ERROR } from '../config/errors';
import { executionContext, SYSTEM_USER } from '../utils/access';
import type { NotificationEvent } from './notificationManager';
import { getNotifications, STATIC_OUTCOMES } from './notificationManager';
import type { StreamEvent } from '../types/event';
import { extractStixRepresentative } from '../database/stix-converter';
import { sendMail } from '../database/smtp';
import { getEntityFromCache } from '../database/cache';
import { ENTITY_TYPE_SETTINGS } from '../schema/internalObject';
import type { BasicStoreSettings } from '../types/store';
import { addNotification } from '../modules/notification/notification-domain';

const PUBLISHER_ENGINE_KEY = conf.get('publisher_manager:lock_key');
const STREAM_SCHEDULE_TIME = 10000;

const publisherStreamHandler = async (streamEvents: Array<StreamEvent<NotificationEvent>>) => {
  try {
    const context = executionContext('publisher_manager');
    const settings = await getEntityFromCache<BasicStoreSettings>(context, SYSTEM_USER, ENTITY_TYPE_SETTINGS);
    const notifications = await getNotifications(context); // TODO @JRI add caching
    const notificationMap = new Map(notifications.map((n) => [n.notification.internal_id, n.notification]));
    const outcomes = STATIC_OUTCOMES; // TODO @JRI add database fetching
    const outcomeMap = new Map(outcomes.map((n) => [n.internal_id, n]));
    for (let index = 0; index < streamEvents.length; index += 1) {
      const { data: { data, targets, notification_id } } = streamEvents[index];
      const notification = notificationMap.get(notification_id);
      if (notification) {
        for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
          const { user, type } = targets[targetIndex];
          const representativeData = extractStixRepresentative(data);
          for (let outcomeIndex = 0; outcomeIndex < user.outcomes.length; outcomeIndex += 1) {
            const outcome = user.outcomes[outcomeIndex];
            const { outcome_type, name, configuration } = outcomeMap.get(outcome) ?? {};
            const message = `${notification.name}: ${type}s ${representativeData}`;
            // region data generation
            const doc_uri = 'https://www.notion.so/OpenCTI-Public-Knowledge-Base-d411e5e477734c59887dad3649f20518';
            const platform_uri = baseUrl + basePath;
            const background_color = (settings.platform_theme_dark_background ?? '#507bc8').substring(1);
            const platformOpts = { doc_uri, platform_uri, background_color };
            const templateData = {
              title: notification.name,
              message,
              notification,
              settings,
              user,
              data,
              ...platformOpts
            };
            // endregion
            if (outcome_type === 'UI') {
              const createNotification = { user_id: user.user_id, messages: [message], is_read: false };
              addNotification(context, SYSTEM_USER, createNotification).then(() => {
                // eslint-disable-next-line no-console
                console.log(`[${name}] ${user.user_email} for ${message}`);
              }).catch((err) => {
                logApp.error('[OPENCTI-MODULE] Error executing publication', { error: err });
              });
            }
            if (outcome_type === 'EMAIL') {
              const { template } = configuration ?? {};
              const generatedEmail = ejs.render(template, templateData);
              const mail = {
                from: settings.platform_email,
                to: user.user_email,
                subject: notification.name,
                html: generatedEmail
              };
              sendMail(mail).then(() => {
                // eslint-disable-next-line no-console
                console.log(`[${name}] ${user.user_email} for ${message}`);
              }).catch((err) => {
                logApp.error('[OPENCTI-MODULE] Error executing publication', { error: err });
              });
            }
            if (outcome_type === 'WEBHOOK') {
              const { uri, template } = configuration ?? {};
              const generatedWebhook = ejs.render(template, templateData);
              const dataJson = JSON.parse(generatedWebhook);
              axios.post(uri, dataJson).then(() => {
                // eslint-disable-next-line no-console
                console.log(`[${name}] ${user.user_email} for ${message}`);
              }).catch((err) => {
                logApp.error('[OPENCTI-MODULE] Error executing publication', { error: err });
              });
            }
          }
        }
      }
    }
  } catch (e) {
    logApp.error('[OPENCTI-MODULE] Error executing publisher manager', { error: e });
  }
};

const initPublisherManager = () => {
  const WAIT_TIME_ACTION = 2000;
  let streamScheduler: SetIntervalAsyncTimer<[]>;
  let streamProcessor: StreamProcessor;
  let publisherListening = true;
  const wait = (ms: number) => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  };
  const notificationHandler = async () => {
    if (!publisherListening) return;
    let lock;
    try {
      // Lock the manager
      lock = await lockResource([PUBLISHER_ENGINE_KEY]);
      logApp.info('[OPENCTI-MODULE] Running publisher manager');
      const opts = { withInternal: false, streamName: NOTIFICATION_STREAM_NAME };
      streamProcessor = createStreamProcessor(SYSTEM_USER, 'Publisher manager', publisherStreamHandler, opts);
      await streamProcessor.start('live');
      while (publisherListening) {
        await wait(WAIT_TIME_ACTION);
      }
    } catch (e: any) {
      if (e.name === TYPE_LOCK_ERROR) {
        logApp.info('[OPENCTI-MODULE] Publisher manager already started by another API');
      } else {
        logApp.error('[OPENCTI-MODULE] Publisher manager failed to start', { error: e });
      }
    } finally {
      if (streamProcessor) await streamProcessor.shutdown();
      if (lock) await lock.unlock();
    }
  };
  return {
    start: async () => {
      streamScheduler = setIntervalAsync(() => notificationHandler(), STREAM_SCHEDULE_TIME);
    },
    shutdown: async () => {
      publisherListening = false;
      if (streamScheduler) await clearIntervalAsync(streamScheduler);
      return true;
    },
  };
};
const publisherManager = initPublisherManager();

export default publisherManager;
