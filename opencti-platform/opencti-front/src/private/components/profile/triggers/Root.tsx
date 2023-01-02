/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO Remove this when V6
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import React from 'react';
import { Route, Switch, useParams } from 'react-router-dom';
import { graphql, usePreloadedQuery } from 'react-relay';
import TopBar from '../../nav/TopBar';
import ErrorNotFound from '../../../../components/ErrorNotFound';
import { TriggerQuery } from './__generated__/TriggerQuery.graphql';
import useQueryLoading from '../../../../utils/hooks/useQueryLoading';
import Loader, { LoaderVariant } from '../../../../components/Loader';
import Trigger from './Trigger';

const triggerQuery = graphql`
  query RootTriggerQuery($id: String!) {
    trigger(id: $id) {
      id
      name
      ...Trigger_trigger
    }
  }
`;

const RootTriggerComponent = ({ queryRef }) => {
  const data = usePreloadedQuery(triggerQuery, queryRef);
  const { trigger } = data;
  return (
    <div>
      <TopBar />
      <>
        {trigger ? (
          <Switch>
            <Route exact path="/dashboard/profile/triggers/:triggerId" render={() => <Trigger data={trigger} />} />
          </Switch>
        ) : (
          <ErrorNotFound />
        )}
      </>
    </div>
  );
};

const RootTrigger = () => {
  const { triggerId } = useParams() as { triggerId: string };
  const queryRef = useQueryLoading<TriggerQuery>(triggerQuery, { id: triggerId });
  return queryRef ? (
    <React.Suspense fallback={<Loader variant={LoaderVariant.inElement} />}>
      <RootTriggerComponent queryRef={queryRef} />
    </React.Suspense>
  ) : (
    <Loader variant={LoaderVariant.inElement} />
  );
};

export default RootTrigger;
