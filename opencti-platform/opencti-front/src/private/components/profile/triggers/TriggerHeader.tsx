import React, { FunctionComponent, ReactElement } from 'react';
import { createFragmentContainer, graphql } from 'react-relay';
import Typography from '@mui/material/Typography';
import makeStyles from '@mui/styles/makeStyles';
import { truncate } from '../../../../utils/String';
import Security from '../../../../utils/Security';
import { TriggerHeader_trigger$data } from './__generated__/TriggerHeader_trigger.graphql';
import { KNOWLEDGE_KNUPDATE } from '../../../../utils/hooks/useGranted';

const useStyles = makeStyles(() => ({
  title: {
    float: 'left',
  },
  popover: {
    float: 'left',
    marginTop: '-13px',
  },
  aliases: {
    marginRight: 7,
  },
  aliasesInput: {
    margin: '4px 0 0 10px',
    float: 'right',
  },
  modes: {
    margin: '-10px 0 0 0',
    float: 'right',
  },
  button: {
    marginRight: 20,
  },
  export: {
    margin: '-10px 0 0 0',
    float: 'right',
  },
}));

interface TriggerHeaderComponentProps {
  trigger: TriggerHeader_trigger$data,
  PopoverComponent: ReactElement<{ id: string; }>,
}

const TriggerHeaderComponent: FunctionComponent<TriggerHeaderComponentProps> = ({
  trigger,
  PopoverComponent,
}) => {
  const classes = useStyles();
  return (
    <div>
      <Typography variant="h1" gutterBottom={true} classes={{ root: classes.title }}>
        {truncate(trigger.name, 80)}
      </Typography>
      <Security needs={[KNOWLEDGE_KNUPDATE]}>
        <div className={classes.popover}>
          {React.cloneElement(PopoverComponent, { id: trigger.id })}
        </div>
      </Security>
      <div className="clearfix" />
    </div>
  );
};

const TriggerHeader = createFragmentContainer(
  TriggerHeaderComponent,
  {
    trigger: graphql`
      fragment TriggerHeader_trigger on Trigger {
        id
        name
        description
      }
    `,
  },
);

export default TriggerHeader;
