import React, { useState } from 'react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import MoreVert from '@mui/icons-material/MoreVert';
import makeStyles from '@mui/styles/makeStyles';
import { graphql, useMutation } from 'react-relay';
import { useNavigate } from 'react-router-dom-v5-compat';
import { useFormatter } from '../../../../components/i18n';
import Loader, { LoaderVariant } from '../../../../components/Loader';
import { Theme } from '../../../../components/Theme';
import useQueryLoading from '../../../../utils/hooks/useQueryLoading';
import { TriggerEditionContainerQuery } from './__generated__/TriggerEditionContainerQuery.graphql';
import TriggerEditionContainer, { triggerEditionQuery } from './TriggerEditionContainer';
import Transition from '../../../../components/Transition';

const useStyles = makeStyles<Theme>((theme) => ({
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

const TriggerPopoverDeletionMutation = graphql`
  mutation TriggerPopoverDeletionMutation($id: ID!) {
    triggerDelete(id: $id)
  }
`;

const TriggerPopover = ({ id }: { id: string }) => {
  const { t } = useFormatter();
  const classes = useStyles();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [displayDelete, setDisplayDelete] = useState<boolean>(false);
  const [displayEdit, setDisplayEdit] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  const [commit] = useMutation(TriggerPopoverDeletionMutation);
  const queryRef = useQueryLoading<TriggerEditionContainerQuery>(triggerEditionQuery, { id });

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleOpenDelete = () => {
    setDisplayDelete(true);
    handleClose();
  };

  const handleCloseDelete = () => setDisplayDelete(false);

  const submitDelete = () => {
    setDeleting(true);
    commit({
      variables: {
        id,
      },
      onCompleted: () => {
        setDeleting(false);
        handleClose();
        navigate('/dashboard/profile/triggers');
      },
    });
  };

  const handleOpenEdit = () => {
    setDisplayEdit(true);
    handleClose();
  };

  const handleCloseEdit = () => setDisplayEdit(false);

  return (
    <div className={classes.container}>
      <IconButton
        onClick={handleOpen}
        aria-haspopup="true"
        style={{ marginTop: 3 }}
        size="large">
        <MoreVert />
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem onClick={handleOpenEdit}>
          {t('Update')}
        </MenuItem>
        <MenuItem onClick={handleOpenDelete}>
          {t('Delete')}
        </MenuItem>
      </Menu>
      <Dialog
        open={displayDelete}
        keepMounted={true}
        TransitionComponent={Transition}
        PaperProps={{ elevation: 1 }}
        onClose={handleCloseDelete}
      >
        <DialogContent>
          <DialogContentText>
            {t('Do you want to delete this trigger?')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete} disabled={deleting}>
            {t('Cancel')}
          </Button>
          <Button color="secondary" onClick={submitDelete} disabled={deleting}>
            {t('Delete')}
          </Button>
        </DialogActions>
      </Dialog>
      <Drawer
        open={displayEdit}
        anchor="right"
        elevation={1}
        sx={{ zIndex: 1202 }}
        classes={{ paper: classes.drawerPaper }}
        onClose={handleCloseEdit}
      >
        {queryRef && (
          <React.Suspense fallback={<Loader variant={LoaderVariant.inElement} />}>
            <TriggerEditionContainer
              queryRef={queryRef}
              handleClose={handleClose}
            />
          </React.Suspense>
        )}
      </Drawer>
    </div>
  );
};

export default TriggerPopover;
