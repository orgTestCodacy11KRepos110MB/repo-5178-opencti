import React, { FunctionComponent } from 'react';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import {
  BackupTableOutlined,
  CampaignOutlined,
  MoreVert,
} from '@mui/icons-material';
import Skeleton from '@mui/material/Skeleton';
import { graphql, useFragment } from 'react-relay';
import makeStyles from '@mui/styles/makeStyles';
import { Theme } from '@mui/material/styles/createTheme';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import Chip from '@mui/material/Chip';
import { DataColumns } from '../../../../components/list_lines';
import { TriggerLine_node$key } from './__generated__/TriggerLine_node.graphql';
import FilterIconButton from '../../../../components/FilterIconButton';
import TriggerPopover from './TriggerPopover';
import { TriggersLinesPaginationQuery$variables } from './__generated__/TriggersLinesPaginationQuery.graphql';
import { useFormatter } from '../../../../components/i18n';

const useStyles = makeStyles<Theme>((theme) => ({
  item: {
    paddingLeft: 10,
    height: 50,
  },
  itemIcon: {
    color: theme.palette.primary.main,
  },
  bodyItem: {
    height: 20,
    fontSize: 13,
    float: 'left',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    paddingRight: 5,
  },
  goIcon: {
    position: 'absolute',
    right: -10,
  },
  itemIconDisabled: {
    color: theme.palette.grey?.[700],
  },
  placeholder: {
    display: 'inline-block',
    height: '1em',
    backgroundColor: theme.palette.grey?.[700],
  },
  chipInList: {
    fontSize: 12,
    height: 20,
    float: 'left',
    width: 100,
    marginRight: 10,
  },
}));

interface TriggerLineProps {
  node: TriggerLine_node$key;
  dataColumns: DataColumns;
  onLabelClick: (
    k: string,
    id: string,
    value: Record<string, unknown>,
    event: React.KeyboardEvent
  ) => void;
  paginationOptions?: TriggersLinesPaginationQuery$variables;
}

const triggerLineFragment = graphql`
  fragment TriggerLine_node on Trigger {
    id
    name
    trigger_type
    event_types
    description
    filters
    created
    modified
    outcomes
  }
`;

export const TriggerLineComponent: FunctionComponent<TriggerLineProps> = ({
  dataColumns,
  node,
  paginationOptions,
}) => {
  const classes = useStyles();
  const { t } = useFormatter();
  const data = useFragment(triggerLineFragment, node);
  const filters = JSON.parse(data.filters ?? '{}');
  const outcomesOptions: Record<string, string> = {
    'f4ee7b33-006a-4b0d-b57d-411ad288653d': t('User interface'),
    '44fcf1f4-8e31-4b31-8dbc-cd6993e1b822': t('Email'),
    webhook: t('Webhook'),
  };
  const eventTypes: Record<string, string> = {
    create: t('Creation'),
    update: t('Modification'),
    delete: t('Deletion'),
    none: t('Unknown'),
  };
  return (
    <ListItem classes={{ root: classes.item }} divider={true}>
      <ListItemIcon classes={{ root: classes.itemIcon }}>
        {data.trigger_type === 'live' ? (
          <CampaignOutlined />
        ) : (
          <BackupTableOutlined />
        )}
      </ListItemIcon>
      <ListItemText
        primary={
          <div>
            <div
              className={classes.bodyItem}
              style={{ width: dataColumns.name.width }}
            >
              {data.name}
            </div>
            <div
              className={classes.bodyItem}
              style={{ width: dataColumns.description.width }}
            >
              {data.description}
            </div>
            <div
              className={classes.bodyItem}
              style={{ width: dataColumns.outcomes.width }}
            >
              {data.outcomes.map((n) => outcomesOptions[n]).join(', ')}
            </div>
            <div
              className={classes.bodyItem}
              style={{ width: dataColumns.event_types.width }}
            >
              {data.event_types.map((n: string) => (
                <Chip
                  classes={{ root: classes.chipInList }}
                  color="primary"
                  variant="outlined"
                  label={eventTypes[n]}
                />
              ))}
            </div>
            <FilterIconButton
              filters={filters}
              dataColumns={dataColumns}
              classNameNumber={3}
              styleNumber={3}
            />
          </div>
        }
      />
      <ListItemIcon classes={{ root: classes.goIcon }}>
        <TriggerPopover id={data.id} paginationOptions={paginationOptions} />
      </ListItemIcon>
    </ListItem>
  );
};

export const TriggerLineDummy = ({
  dataColumns,
}: {
  dataColumns: DataColumns;
}) => {
  const classes = useStyles();
  return (
    <ListItem classes={{ root: classes.item }} divider={true}>
      <ListItemIcon classes={{ root: classes.itemIcon }}>
        <Skeleton animation="wave" variant="circular" width={30} height={30} />
      </ListItemIcon>
      <ListItemText
        primary={
          <div>
            {Object.values(dataColumns).map((value) => (
              <div
                key={value.label}
                className={classes.bodyItem}
                style={{ width: value.width }}
              >
                <Skeleton
                  animation="wave"
                  variant="rectangular"
                  width="90%"
                  height={20}
                />
              </div>
            ))}
          </div>
        }
      />
      <ListItemSecondaryAction classes={{ root: classes.itemIconDisabled }}>
        <MoreVert />
      </ListItemSecondaryAction>
    </ListItem>
  );
};