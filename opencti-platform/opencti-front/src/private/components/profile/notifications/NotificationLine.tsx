import React, { FunctionComponent } from 'react';
import { Link } from 'react-router-dom';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { KeyboardArrowRightOutlined } from '@mui/icons-material';
import Skeleton from '@mui/material/Skeleton';
import { graphql, useFragment } from 'react-relay';
import makeStyles from '@mui/styles/makeStyles';
import { Theme } from '@mui/material/styles/createTheme';
import { DataColumns } from '../../../../components/list_lines';
import ItemIcon from '../../../../components/ItemIcon';
import { NotificationLine_node$key } from './__generated__/NotificationLine_node.graphql';
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
}

const notificationLineFragment = graphql`
  fragment NotificationLine_node on Notification {
    id
    name
    created
    notification_type
    content {
      title
      messages
    }
  }
`;

export const NotificationLineComponent: FunctionComponent<NotificationLineProps> = ({ dataColumns, node }) => {
  const classes = useStyles();
  const { fldt } = useFormatter();
  const data = useFragment(notificationLineFragment, node);
  const messageText = data.content.map((c) => c.messages).flat().join(', ');
  const shortMessage = messageText.substring(0, Math.max(200, messageText.length));
  const message = `${shortMessage}${messageText.length > shortMessage.length ? '...' : ''}`;
  return (
    <ListItem classes={{ root: classes.item }}
      divider={true} button={true} component={Link}
      to={`/dashboard/profile/notifications/${data.id}`}>
      <ListItemIcon classes={{ root: classes.itemIcon }}>
        <ItemIcon type={data.notification_type === 'live' ? 'LiveNotification' : 'DigestNotification'} />
      </ListItemIcon>
      <ListItemText
        primary={
          <div>
            <div className={classes.bodyItem} style={{ width: dataColumns.created.width }}>
              {fldt(data.created)}
            </div>
            <div className={classes.bodyItem} style={{ width: dataColumns.name.width }}>
              {data.name}
            </div>
            <div className={classes.bodyItem} style={{ width: dataColumns.message.width }}>
              {message}
            </div>
          </div>
        }
      />
      <ListItemIcon classes={{ root: classes.goIcon }}>
        <KeyboardArrowRightOutlined />
      </ListItemIcon>
    </ListItem>
  );
};

export const NotificationLineDummy = ({ dataColumns }: { dataColumns: DataColumns }) => {
  const classes = useStyles();
  return (
    <ListItem classes={{ root: classes.item }} divider={true}>
      <ListItemIcon classes={{ root: classes.itemIcon }}>
        <Skeleton animation="wave" variant="circular" width={30} height={30} />
      </ListItemIcon>
      <ListItemText
        primary={
          <div>
            <div className={classes.bodyItem} style={{ width: dataColumns.created.width }}>
              <Skeleton animation="wave" variant="rectangular" width="90%" height="100%" />
            </div>
            <div className={classes.bodyItem} style={{ width: dataColumns.name.width }}>
              <Skeleton animation="wave" variant="rectangular" width="90%" height="100%" />
            </div>
            <div className={classes.bodyItem} style={{ width: dataColumns.message.width }}>
              <Skeleton animation="wave" variant="rectangular" width="90%" height="100%" />
            </div>
          </div>
        }
      />
      <ListItemIcon classes={{ root: classes.goIcon }}>
        <KeyboardArrowRightOutlined />
      </ListItemIcon>
    </ListItem>
  );
};
