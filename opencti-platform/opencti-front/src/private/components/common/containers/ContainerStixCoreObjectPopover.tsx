import React, { FunctionComponent, useState } from 'react';
import * as R from 'ramda';
import { graphql } from 'react-relay';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import Slide, { SlideProps } from '@mui/material/Slide';
import MoreVert from '@mui/icons-material/MoreVert';
import { Store } from 'relay-runtime';
import makeStyles from '@mui/styles/makeStyles';
import { useFormatter } from '../../../../components/i18n';
import { commitMutation } from '../../../../relay/environment';
import {
  StixCyberObservableLine_node$data,
} from '../../observations/stix_cyber_observables/__generated__/StixCyberObservableLine_node.graphql';
import { Theme } from '../../../../components/Theme';
import { deleteNodeFromId } from '../../../../utils/store';
import {
  ContainerStixCyberObservablesLinesQuery$variables,
} from './__generated__/ContainerStixCyberObservablesLinesQuery.graphql';

const useStyles = makeStyles<Theme>((theme) => ({
  container: {
    margin: 0,
  },
  drawerPaper: {
    minHeight: '100vh',
    width: '50%',
    position: 'fixed',
    overflow: 'auto',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    padding: 0,
  },
}));

const Transition = React.forwardRef((props: SlideProps, ref) => (
  <Slide direction="up" ref={ref} {...props} />
));
Transition.displayName = 'TransitionSlide';

export const containerStixCoreObjectPopoverRemoveMutation = graphql`
  mutation ContainerStixCoreObjectPopoverRemoveMutation(
    $id: ID!
    $toId: StixRef!
    $relationship_type: String!
  ) {
    containerEdit(id: $id) {
      relationDelete(toId: $toId, relationship_type: $relationship_type) {
        id
      }
    }
  }
`;

export const containerStixCoreObjectPopoverDeleteMutation = graphql`
  mutation ContainerStixCoreObjectPopoverDeleteMutation($id: ID!) {
    stixCoreObjectEdit(id: $id) {
      delete
    }
  }
`;

interface ContainerStixCoreObjectPopoverProps {
  containerId: string,
  toId: string,
  relationshipType: string,
  paginationKey: string,
  paginationOptions: ContainerStixCyberObservablesLinesQuery$variables,
  selectedElements: Record<string, StixCyberObservableLine_node$data>,
  setSelectedElements: (selectedElements: Record<string, StixCyberObservableLine_node$data>) => void,
  menuDisable: boolean,
}

const ContainerStixCoreObjectPopover: FunctionComponent<ContainerStixCoreObjectPopoverProps> = ({
  containerId,
  toId,
  relationshipType,
  paginationKey,
  paginationOptions,
  selectedElements,
  setSelectedElements,
  menuDisable,
}) => {
  const { t } = useFormatter();
  const classes = useStyles();

  const [anchorEl, setAnchorEl] = useState<Element | null>(null);
  const [displayRemove, setDisplayRemove] = useState(false);
  const [displayDelete, setDisplayDelete] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleOpen = (event: React.SyntheticEvent) => {
    setAnchorEl(event.currentTarget);
    event.stopPropagation();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleOpenRemove = () => {
    setDisplayRemove(true);
    handleClose();
  };

  const handleCloseRemove = () => {
    setRemoving(false);
    setDisplayRemove(false);
  };

  const handleOpenDelete = () => {
    setDisplayDelete(true);
    handleClose();
  };

  const handleCloseDelete = () => {
    setDeleting(false);
    setDisplayDelete(false);
  };

  const submitRemove = () => {
    setRemoving(true);
    commitMutation({
      mutation: containerStixCoreObjectPopoverRemoveMutation,
      variables: {
        id: containerId,
        toId,
        relationship_type: relationshipType,
      },
      updater: (store: Store) => {
        // ID is not valid pagination options, will be handled better when hooked
        if (toId) {
          deleteNodeFromId(store, containerId, paginationKey, paginationOptions, toId);
        }
      },
      onCompleted: () => {
        handleCloseRemove();
        const newSelectedElements = R.omit([toId], selectedElements);
        setSelectedElements(newSelectedElements);
      },
      optimisticUpdater: undefined,
      optimisticResponse: undefined,
      onError: undefined,
      setSubmitting: undefined,
    });
  };

  const submitDelete = () => {
    setDeleting(true);
    commitMutation({
      mutation: containerStixCoreObjectPopoverDeleteMutation,
      variables: {
        id: toId,
      },
      updater: (store: Store) => {
        // ID is not valid pagination options, will be handled better when hooked
        if (toId) {
          deleteNodeFromId(store, containerId, paginationKey, paginationOptions, toId);
        }
      },
      onCompleted: () => {
        handleCloseDelete();
        const newSelectedElements = R.omit([toId], selectedElements);
        setSelectedElements(newSelectedElements);
      },
      optimisticUpdater: undefined,
      optimisticResponse: undefined,
      onError: undefined,
      setSubmitting: undefined,
    });
  };

  return (
    <div className={classes.container}>
      <IconButton
        onClick={handleOpen}
        disabled={menuDisable ?? false}
        aria-haspopup="true"
        style={{ marginTop: 3 }}
        size="large"
      >
        <MoreVert />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={handleOpenRemove}>
          {t('Remove')}
        </MenuItem>
        <MenuItem onClick={handleOpenDelete}>
          {t('Delete')}
        </MenuItem>
      </Menu>
      <Dialog
        PaperProps={{ elevation: 1 }}
        open={displayRemove}
        keepMounted={true}
        TransitionComponent={Transition}
        onClose={handleCloseRemove}
      >
        <DialogContent>
          <DialogContentText>
            {t('Do you want to remove the entity from this container?')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseRemove}
            disabled={removing}
          >
            {t('Cancel')}
          </Button>
          <Button
            color="secondary"
            onClick={submitRemove}
            disabled={removing}
          >
            {t('Remove')}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        PaperProps={{ elevation: 1 }}
        open={displayDelete}
        keepMounted={true}
        TransitionComponent={Transition}
        onClose={handleCloseDelete}
      >
        <DialogContent>
          <DialogContentText>
            {t('Do you want to delete this entity?')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDelete}
            disabled={deleting}
          >
            {t('Cancel')}
          </Button>
          <Button
            color="secondary"
            onClick={submitDelete}
            disabled={deleting}
          >
            {t('Delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ContainerStixCoreObjectPopover;
