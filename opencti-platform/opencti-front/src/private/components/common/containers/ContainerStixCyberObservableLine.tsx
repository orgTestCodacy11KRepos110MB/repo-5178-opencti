import React, { FunctionComponent } from 'react';
import * as R from 'ramda';
import { Link } from 'react-router-dom';
import { createFragmentContainer, graphql } from 'react-relay';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import { MoreVert } from '@mui/icons-material';
import { AutoFix, HexagonOutline } from 'mdi-material-ui';
import Checkbox from '@mui/material/Checkbox';
import Skeleton from '@mui/material/Skeleton';
import makeStyles from '@mui/styles/makeStyles';
import Tooltip from '@mui/material/Tooltip';
import { useFormatter } from '../../../../components/i18n';
import ItemMarking from '../../../../components/ItemMarking';
import ContainerStixCoreObjectPopover from './ContainerStixCoreObjectPopover';
import StixCoreObjectLabels from '../stix_core_objects/StixCoreObjectLabels';
import { renderObservableValue } from '../../../../utils/String';
import { Theme } from '../../../../components/Theme';
import {
  StixCyberObservableLine_node$data,
} from '../../observations/stix_cyber_observables/__generated__/StixCyberObservableLine_node.graphql';
import { DataColumns } from '../../../../components/list_lines';
import {
  ContainerStixCyberObservableLine_node$data,
} from './__generated__/ContainerStixCyberObservableLine_node.graphql';
import {
  ContainerStixCyberObservablesLinesQuery$variables,
} from './__generated__/ContainerStixCyberObservablesLinesQuery.graphql';

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
  itemIconDisabled: {
    color: theme.palette.grey?.[700],
  },
  placeholder: {
    display: 'inline-block',
    height: '1em',
    backgroundColor: theme.palette.grey?.[700],
  },
}));

interface ContainerStixCyberObservableLineComponentProps {
  node?: StixCyberObservableLine_node$data,
  types: string[],
  dataColumns: DataColumns,
  containerId: string,
  paginationOptions: ContainerStixCyberObservablesLinesQuery$variables,
  onToggleEntity: (entity: StixCyberObservableLine_node$data, event: React.SyntheticEvent) => void,
  selectedElements: Record<string, StixCyberObservableLine_node$data>,
  deSelectedElements: Record<string, StixCyberObservableLine_node$data>,
  selectAll: boolean,
  setSelectedElements: (selectedElements: Record<string, StixCyberObservableLine_node$data>) => void,
}

const ContainerStixCyberObservableLineComponent: FunctionComponent<ContainerStixCyberObservableLineComponentProps> = ({
  node,
  types,
  dataColumns,
  containerId,
  paginationOptions,
  onToggleEntity,
  selectedElements,
  deSelectedElements,
  selectAll,
  setSelectedElements,
}) => {
  const classes = useStyles();
  const { t, fd } = useFormatter();
  const refTypes = types ?? ['manual'];
  const isThroughInference = refTypes.includes('inferred');
  const isOnlyThroughInference = isThroughInference && !refTypes.includes('manual');
  return (
    <ListItem
      classes={{ root: classes.item }}
      divider={true}
      button={true}
      component={Link}
      to={`/dashboard/observations/${
        node?.entity_type === 'Artifact' ? 'artifacts' : 'observables'
      }/${node?.id}`}
    >
      <ListItemIcon
        classes={{ root: classes.itemIcon }}
        style={{ minWidth: 40 }}
        onClick={node ? (event) => !isOnlyThroughInference && onToggleEntity(node, event) : () => {} }
      >
        <Checkbox
          edge="start"
          disabled={isOnlyThroughInference}
          checked={
            (selectAll
              && !isOnlyThroughInference
              && (node?.id ? !(node.id in (deSelectedElements)) : true))
            || (node?.id ? node.id in (selectedElements) : false)
          }
          disableRipple={true}
        />
      </ListItemIcon>
      <ListItemIcon classes={{ root: classes.itemIcon }}>
        <HexagonOutline />
      </ListItemIcon>
      <ListItemText
        primary={
          <div>
            <div
              className={classes.bodyItem}
              style={{ width: dataColumns.entity_type.width }}
            >
              {t(`entity_${node?.entity_type}`)}
            </div>
            <div
              className={classes.bodyItem}
              style={{ width: dataColumns.observable_value.width }}
            >
              {renderObservableValue(node)}
            </div>
            <div
              className={classes.bodyItem}
              style={{ width: dataColumns.objectLabel.width }}
            >
              <StixCoreObjectLabels
                variant="inList"
                labels={node?.objectLabel}
              />
            </div>
            <div
              className={classes.bodyItem}
              style={{ width: dataColumns.createdBy.width }}
            >
              {R.pathOr('', ['createdBy', 'name'], node)}
            </div>
            <div
              className={classes.bodyItem}
              style={{ width: dataColumns.created_at.width }}
            >
              {fd(node?.created_at)}
            </div>
            <div
              className={classes.bodyItem}
              style={{ width: dataColumns.objectMarking.width }}
            >
              {R.take(1, node?.objectMarking?.edges ?? []).map(
                (markingDefinition) => (
                  <ItemMarking
                    key={markingDefinition.node.id}
                    variant="inList"
                    label={markingDefinition.node.definition}
                    color={markingDefinition.node.x_opencti_color}
                  />
                ),
              )}
            </div>
          </div>
        }
      />
      <ListItemSecondaryAction>
        {isOnlyThroughInference ? (
          <Tooltip title={t('Inferred knowledge')}>
            <AutoFix fontSize="small" style={{ marginLeft: -30 }} />
          </Tooltip>
        ) : (
          <ContainerStixCoreObjectPopover
            containerId={containerId}
            toId={node?.id ?? ''}
            menuDisable={isOnlyThroughInference}
            relationshipType="object"
            paginationKey="Pagination_objects"
            paginationOptions={paginationOptions}
            selectedElements={selectedElements}
            setSelectedElements={setSelectedElements}
          />
        )}
      </ListItemSecondaryAction>
    </ListItem>
  );
};

export const ContainerStixCyberObservableLine = createFragmentContainer(
  ContainerStixCyberObservableLineComponent,
  {
    node: graphql`
      fragment ContainerStixCyberObservableLine_node on StixCyberObservable {
        id
        observable_value
        entity_type
        parent_types
        created_at
        ... on IPv4Addr {
          countries {
            edges {
              node {
                name
                x_opencti_aliases
              }
            }
          }
        }
        ... on IPv6Addr {
          countries {
            edges {
              node {
                name
                x_opencti_aliases
              }
            }
          }
        }
        objectLabel {
          edges {
            node {
              id
              value
              color
            }
          }
        }
        createdBy {
          ... on Identity {
            id
            name
            entity_type
          }
        }
        objectMarking {
          edges {
            node {
              id
              definition
              x_opencti_color
            }
          }
        }
      }
    `,
  },
);

export const ContainerStixCyberObservableLineDummy = ({ dataColumns }: { dataColumns: DataColumns }) => {
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
            <div
              className={classes.bodyItem}
              style={{ width: dataColumns.entity_type.width }}
            >
              <Skeleton
                animation="wave"
                variant="rectangular"
                width="90%"
                height="100%"
              />
            </div>
            <div
              className={classes.bodyItem}
              style={{ width: dataColumns.observable_value.width }}
            >
              <Skeleton
                animation="wave"
                variant="rectangular"
                width="90%"
                height="100%"
              />
            </div>
            <div
              className={classes.bodyItem}
              style={{ width: dataColumns.objectLabel.width }}
            >
              <Skeleton
                animation="wave"
                variant="rectangular"
                width="90%"
                height="100%"
              />
            </div>
            <div
              className={classes.bodyItem}
              style={{ width: dataColumns.createdBy.width }}
            >
              <Skeleton
                animation="wave"
                variant="rectangular"
                width="90%"
                height="100%"
              />
            </div>
            <div
              className={classes.bodyItem}
              style={{ width: dataColumns.created_at.width }}
            >
              <Skeleton
                animation="wave"
                variant="rectangular"
                width="90%"
                height="100%"
              />
            </div>
            <div
              className={classes.bodyItem}
              style={{ width: dataColumns.objectMarking.width }}
            >
              <Skeleton
                animation="wave"
                variant="rectangular"
                width={100}
                height="100%"
              />
            </div>
          </div>
        }
      />
      <ListItemSecondaryAction classes={{ root: classes.itemIconDisabled }}>
        <MoreVert />
      </ListItemSecondaryAction>
    </ListItem>
  );
};
