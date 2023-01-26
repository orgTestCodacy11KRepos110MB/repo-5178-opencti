import React, { FunctionComponent, useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '@mui/material/Badge';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { ExpandLessOutlined, ExpandMoreOutlined } from '@mui/icons-material';
import {
  BellPlusOutline,
  BellRemoveOutline,
  BellCogOutline,
  BellOutline,
} from 'mdi-material-ui';
import Skeleton from '@mui/material/Skeleton';
import { graphql, useFragment } from 'react-relay';
import makeStyles from '@mui/styles/makeStyles';
import { Theme } from '@mui/material/styles/createTheme';
import Checkbox from '@mui/material/Checkbox';
import { deepPurple, green, indigo, red } from '@mui/material/colors';
import Collapse from '@mui/material/Collapse';
import List from '@mui/material/List';
import { ListItemButton } from '@mui/material';
import Chip from '@mui/material/Chip';
import { DataColumns } from '../../../../components/list_lines';
import {
  NotificationLine_node$data,
  NotificationLine_node$key,
} from './__generated__/NotificationLine_node.graphql';
import { useFormatter } from '../../../../components/i18n';
import { hexToRGB } from '../../../../utils/Colors';

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
  chipInList: {
    fontSize: 12,
    height: 20,
    float: 'left',
    width: 100,
    marginRight: 10,
  },
  chipInList2: {
    fontSize: 12,
    height: 20,
    float: 'left',
    width: 120,
    textTransform: 'uppercase',
    borderRadius: '0',
  },
  placeholder: {
    display: 'inline-block',
    height: '1em',
    backgroundColor: theme.palette.grey?.[700],
  },
}));

interface NotificationLineProps {
  node: NotificationLine_node$key;
  dataColumns: DataColumns;
  onLabelClick: (
    k: string,
    id: string,
    value: Record<string, unknown>,
    event: React.KeyboardEvent
  ) => void;
  selectedElements: Record<string, NotificationLine_node$data>;
  deSelectedElements: Record<string, NotificationLine_node$data>;
  onToggleEntity: (
    entity: NotificationLine_node$data,
    event: React.SyntheticEvent
  ) => void;
  selectAll: boolean;
  onToggleShiftEntity: (
    index: number,
    entity: NotificationLine_node$data,
    event: React.SyntheticEvent
  ) => void;
  index: number;
}

const notificationLineFragment = graphql`
  fragment NotificationLine_node on Notification {
    id
    name
    created
    notification_type
    is_read
    content {
      title
      events {
        message
        operation
        instance_id
      }
    }
  }
`;

export const NotificationLineComponent: FunctionComponent<
NotificationLineProps
> = ({
  dataColumns,
  node,
  selectedElements,
  deSelectedElements,
  onToggleEntity,
  selectAll,
  onToggleShiftEntity,
  index,
}) => {
  const classes = useStyles();
  const { t, fldt } = useFormatter();
  const [open, setOpen] = useState('');
  const data = useFragment(notificationLineFragment, node);
  const allEvents = data.content.map((n) => n.events).flat();
  const firstEvent = allEvents.at(0);
  const otherEvents = allEvents;
  otherEvents.shift();
  const eventTypes: Record<string, string> = {
    create: t('Creation'),
    update: t('Modification'),
    delete: t('Deletion'),
    none: t('Unknown'),
  };
  const colors: Record<string, string> = {
    create: green[500],
    update: deepPurple[500],
    delete: red[500],
    none: indigo[500],
  };
  const iconSelector = (operation: string) => {
    switch (operation) {
      case 'create':
        return <BellPlusOutline style={{ color: colors[operation] }} />;
      case 'update':
        return <BellCogOutline style={{ color: colors[operation] }} />;
      case 'delete':
        return <BellRemoveOutline style={{ color: colors[operation] }} />;
      default:
        return <BellOutline style={{ color: colors[operation] }} />;
    }
  };
  const firstOperation = firstEvent?.operation ?? 'none';
  return (
    <div>
      <ListItem
        classes={{ root: classes.item }}
        divider={true}
        button={true}
        component={Link}
        to={`/dashboard/id/${firstEvent?.instance_id}`}
      >
        <ListItemIcon
          classes={{ root: classes.itemIcon }}
          style={{ minWidth: 40 }}
          onClick={(event) => (event.shiftKey
            ? onToggleShiftEntity(index, data, event)
            : onToggleEntity(data, event))
          }
        >
          <Checkbox
            edge="start"
            checked={
              (selectAll && !(data.id in (deSelectedElements || {})))
              || data.id in (selectedElements || {})
            }
            disableRipple={true}
          />
        </ListItemIcon>
        <ListItemIcon classes={{ root: classes.itemIcon }}>
          <Badge color="warning" variant="dot" invisible={data.is_read}>
            {iconSelector(firstOperation)}
          </Badge>
        </ListItemIcon>
        <ListItemText
          primary={
            <div>
              <div
                className={classes.bodyItem}
                style={{ width: dataColumns.operation.width }}
              >
                <Chip
                  classes={{ root: classes.chipInList2 }}
                  style={{
                    backgroundColor: hexToRGB(colors[firstOperation], 0.08),
                    color: colors[firstOperation],
                    border: `1px solid ${colors[firstOperation]}`,
                  }}
                  label={eventTypes[firstEvent?.operation ?? 'none']}
                />
              </div>
              <div
                className={classes.bodyItem}
                style={{ width: dataColumns.message.width }}
              >
                {firstEvent?.message}
              </div>
              <div
                className={classes.bodyItem}
                style={{ width: dataColumns.created.width }}
              >
                {fldt(data.created)}
              </div>
              <div
                className={classes.bodyItem}
                style={{ width: dataColumns.name.width }}
              >
                <Chip
                  classes={{ root: classes.chipInList }}
                  color={
                    data.notification_type === 'live' ? 'warning' : 'secondary'
                  }
                  variant="outlined"
                  label={data.name}
                />
              </div>
            </div>
          }
        />
        {otherEvents.length > 0 && (
          <ListItemIcon
            classes={{ root: classes.goIcon }}
            onClick={(event) => {
              event.stopPropagation();
              event.preventDefault();
              setOpen(open === data.id ? '' : data.id);
            }}
          >
            {open === data.id ? <ExpandLessOutlined /> : <ExpandMoreOutlined />}
          </ListItemIcon>
        )}
      </ListItem>
      {otherEvents.length > 0 && (
        <Collapse in={open === data.id} timeout="auto" unmountOnExit={true}>
          <List component="div" disablePadding>
            {otherEvents.map((event, i) => (
              <ListItemButton
                key={i}
                sx={{ pl: 4 }}
                component={Link}
                to={`/dashboard/id/${event.instance_id}`}
              >
                <ListItemIcon classes={{ root: classes.itemIcon }}>
                  <Badge color="warning" variant="dot" invisible={data.is_read}>
                    {iconSelector(event.operation ?? 'none')}
                  </Badge>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <div>
                      <div
                        className={classes.bodyItem}
                        style={{ width: '30%' }}
                      >
                        <Chip
                          classes={{ root: classes.chipInList }}
                          color="primary"
                          variant="outlined"
                          label={eventTypes[event.operation ?? 'none']}
                        />
                      </div>
                      <div
                        className={classes.bodyItem}
                        style={{ width: '50%' }}
                      >
                        {event.message}
                      </div>
                    </div>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        </Collapse>
      )}
    </div>
  );
};

export const NotificationLineDummy = ({
  dataColumns,
}: {
  dataColumns: DataColumns;
}) => {
  const classes = useStyles();
  return (
    <ListItem classes={{ root: classes.item }} divider={true}>
      <ListItemIcon
        classes={{ root: classes.itemIconDisabled }}
        style={{ minWidth: 40 }}
      >
        <Checkbox edge="start" disabled={true} disableRipple={true} />
      </ListItemIcon>
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
    </ListItem>
  );
};
