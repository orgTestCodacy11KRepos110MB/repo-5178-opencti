import React, { useState } from 'react';
import Drawer from '@mui/material/Drawer';
import Fab from '@mui/material/Fab';
import { Edit } from '@mui/icons-material';
import makeStyles from '@mui/styles/makeStyles';
import Loader, { LoaderVariant } from '../../../../components/Loader';
import { Theme } from '../../../../components/Theme';
import useQueryLoading from '../../../../utils/hooks/useQueryLoading';
import TriggerEditionContainer, { triggerEditionQuery } from './TriggerEditionContainer';
import { TriggerEditionContainerQuery } from './__generated__/TriggerEditionContainerQuery.graphql';

const useStyles = makeStyles<Theme>((theme) => ({
  editButton: {
    position: 'fixed',
    bottom: 30,
    right: 30,
    zIndex: 400,
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

const TriggerEdition = ({ triggerId } : { triggerId: string }) => {
  const classes = useStyles();
  const [open, setOpen] = useState<boolean>(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
  };

  const queryRef = useQueryLoading<TriggerEditionContainerQuery>(triggerEditionQuery, { id: triggerId });

  return (
    <div>
      <Fab onClick={handleOpen} color="secondary" aria-label="Edit" className={classes.editButton}>
        <Edit />
      </Fab>
      <Drawer open={open}
        anchor="right"
        elevation={1}
        sx={{ zIndex: 1202 }}
        classes={{ paper: classes.drawerPaper }}
        onClose={handleClose}>
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

export default TriggerEdition;
