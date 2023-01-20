import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { dissocPath } from 'ramda';
import { ApolloServerPluginLandingPageGraphQLPlayground } from '@apollo/server-plugin-landing-page-graphql-playground';
import { createApollo4QueryValidationPlugin } from 'graphql-constraint-directive/apollo4';
import { basePath, DEV_MODE, ENABLED_TRACING } from '../config/conf';
import loggerPlugin from './loggerPlugin';
import telemetryPlugin from './telemetryPlugin';
import httpResponsePlugin from './httpResponsePlugin';

const createApolloServer = (schema, httpServer, serverCleanup) => {
  // In production mode, we use static from the server
  const playgroundOptions = DEV_MODE ? {} : {
    cdnUrl: `${basePath}/static`,
    title: 'OpenCTI Playground',
    faviconUrl: `${basePath}/static/@apollographql/graphql-playground-react@1.7.42/build/static/favicon.png`
  };
  const playgroundPlugin = ApolloServerPluginLandingPageGraphQLPlayground(playgroundOptions);
  const constraintPlugin = createApollo4QueryValidationPlugin({ schema });
  const apolloDrainPlugin = ApolloServerPluginDrainHttpServer({ httpServer });
  const webSocketDrainPlugin = {
    async serverWillStart() {
      return {
        async drainServer() {
          await serverCleanup.dispose();
        },
      };
    },
  };
  const appolloPlugins = [
    playgroundPlugin, apolloDrainPlugin, webSocketDrainPlugin,
    constraintPlugin, loggerPlugin, httpResponsePlugin
  ];
  if (ENABLED_TRACING) {
    appolloPlugins.push(telemetryPlugin);
  }
  return new ApolloServer({
    schema,
    introspection: true,
    persistedQueries: false,
    // tracing: DEV_MODE,
    plugins: appolloPlugins,
    formatError: (formattedError, error) => {
      // if (error.originalError instanceof ConstraintDirectiveError) {
      //   const { originalError } = error;
      //   const { fieldName } = originalError;
      //   const ConstraintError = ValidationError(fieldName, originalError);
      //   e = apolloFormatError(ConstraintError);
      // }
      // Remove the exception stack in production.
      return DEV_MODE ? error : dissocPath(['extensions', 'exception'], error);
    },
  });
};

export default createApolloServer;
