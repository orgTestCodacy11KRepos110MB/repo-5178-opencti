import https from 'node:https';
import http from 'node:http';
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs';
import { readFileSync } from 'node:fs';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import nconf from 'nconf';
import cors from 'cors';
import { json } from 'body-parser';
import express from 'express';
import { expressMiddleware } from '@apollo/server/express4';
import conf, { basePath, booleanConf, logApp, PORT } from '../config/conf';
import createApp from './httpPlatform';
import createApolloServer from '../graphql/graphql';
import { isStrategyActivated, STRATEGY_CERT } from '../config/providers';
import { initializeSession } from '../database/session';
import { executionContext } from '../utils/access';
import { authenticateUserFromRequest, userWithOrigin } from '../domain/user';
import createSchema from '../graphql/schema';

const MIN_20 = 20 * 60 * 1000;
const REQ_TIMEOUT = conf.get('app:request_timeout');
const CERT_KEY_PATH = conf.get('app:https_cert:key');
const CERT_KEY_CERT = conf.get('app:https_cert:crt');
const CA_CERTS = conf.get('app:https_cert:ca');
const rejectUnauthorized = booleanConf('app:https_cert:reject_unauthorized', true);

const createHttpServer = async () => {
  const app = express();
  const schema = createSchema();
  const appSessionHandler = initializeSession();
  app.use(appSessionHandler.session);
  let httpServer;
  if (CERT_KEY_PATH && CERT_KEY_CERT) {
    const key = readFileSync(CERT_KEY_PATH);
    const cert = readFileSync(CERT_KEY_CERT);
    const ca = CA_CERTS.map((path) => readFileSync(path));
    const requestCert = isStrategyActivated(STRATEGY_CERT);
    const passphrase = conf.get('app:https_cert:passphrase');
    const options = { key, cert, passphrase, requestCert, rejectUnauthorized, ca };
    httpServer = https.createServer(options, app);
  } else {
    httpServer = http.createServer(app);
  }
  httpServer.setTimeout(REQ_TIMEOUT || MIN_20);
  const wsServer = new WebSocketServer({ server: httpServer, path: `${basePath}/graphql` });
  const serverCleanup = useServer({
    schema,
    context: (ctx, msg, args) => {
      console.log(msg);
      console.log(ctx);
      console.log(args);
      if (ctx.user) {
        const context = executionContext('api');
        context.user = ctx.user;
        return context;
      }
      throw new Error('User must be authenticated');
    }
  }, wsServer);
  const apolloServer = createApolloServer(schema, httpServer, serverCleanup);
  await apolloServer.start();
  const requestSizeLimit = nconf.get('app:max_payload_body_size') || '50mb';
  app.use(graphqlUploadExpress());
  app.use(
    `${basePath}/graphql`,
    cors(),
    json({ limit: requestSizeLimit }),
    expressMiddleware(apolloServer, {
      context: async ({ req, res, connection }) => {
        const executeContext = executionContext('api');
        executeContext.req = req;
        executeContext.res = res;
        executeContext.workId = req.headers['opencti-work-id'];
        if (connection && connection.context.user) {
          executeContext.user = userWithOrigin(req, connection.context.user);
        } else {
          const user = await authenticateUserFromRequest(executeContext, req, res);
          if (user) {
            executeContext.user = userWithOrigin(req, user);
          }
        }
        return executeContext;
      },
    }),
  );
  const { seeMiddleware } = await createApp(app);
  return { httpServer, seeMiddleware };
};

const listenServer = async () => {
  return new Promise((resolve, reject) => {
    try {
      const serverPromise = createHttpServer();
      serverPromise.then(({ httpServer, seeMiddleware }) => {
        httpServer.on('close', () => {
          seeMiddleware.shutdown();
        });
        const server = httpServer.listen(PORT);
        resolve({ server });
      });
    } catch (e) {
      logApp.error('[OPENCTI] API start fail', { error: e });
      reject(e);
    }
  });
};

const stopServer = async ({ server }) => {
  return new Promise((resolve) => {
    server.close(() => {
      resolve();
    });
    server.emit('close'); // force server close
  });
};

const initHttpServer = () => {
  let server;
  return {
    start: async () => {
      server = await listenServer();
    },
    shutdown: async () => {
      if (server) {
        await stopServer(server);
      }
    },
  };
};
const httpServer = initHttpServer();

export default httpServer;
