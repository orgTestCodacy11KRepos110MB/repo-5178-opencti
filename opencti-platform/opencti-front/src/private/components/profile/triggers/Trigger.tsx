import React from 'react';
import { graphql, useFragment } from 'react-relay';
import Grid from '@mui/material/Grid';
import makeStyles from '@mui/styles/makeStyles';
import { Trigger_trigger$key } from './__generated__/Trigger_trigger.graphql';
import TriggerHeader from './TriggerHeader';
import TriggerPopover from './TriggerPopover';
import TriggerEdition from './TriggerEdition';
import FilterCard from '../../../../components/FilterCard';

const useStyles = makeStyles(() => ({
  gridContainer: {
    marginBottom: 20,
  },
  container: {
    margin: 0,
  },
  title: {
    float: 'left',
    textTransform: 'uppercase',
  },
  popover: {
    float: 'left',
    marginTop: '-13px',
  },
}));

const triggerFragment = graphql`
  fragment Trigger_trigger on Trigger {
    id
    standard_id
    name
    filters
    created
    modified
    ...TriggerHeader_trigger
  }
`;

const TriggerComponent = ({ data }: { data: Trigger_trigger$key }) => {
  const classes = useStyles();
  const trigger = useFragment(triggerFragment, data);
  return (
    <div className={classes.container}>
      <TriggerHeader trigger={trigger} PopoverComponent={<TriggerPopover id={trigger.id} />} />
      <Grid container={true} spacing={3} classes={{ container: classes.gridContainer }}>
        <Grid item={true} xs={12} style={{ paddingTop: 10 }}>
          <FilterCard filters={JSON.parse(trigger.filters ?? '{}')} handleRemoveFilter={undefined}/>
        </Grid>
      </Grid>
      <TriggerEdition triggerId={trigger.id} />
    </div>
  );
};

export default TriggerComponent;
