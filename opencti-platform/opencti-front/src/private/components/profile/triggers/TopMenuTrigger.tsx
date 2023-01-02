import React from 'react';
import makeStyles from '@mui/styles/makeStyles';
import { Theme } from '@mui/material/styles/createTheme';
import { Link, useLocation, useParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import { ArrowForwardIosOutlined } from '@mui/icons-material';
import { Fire } from 'mdi-material-ui';
import { useFormatter } from '../../../../components/i18n';

const useStyles = makeStyles<Theme>((theme) => ({
  buttonHome: {
    marginRight: theme.spacing(2),
    padding: '0 5px 0 5px',
    minHeight: 20,
    textTransform: 'none',
  },
  button: {
    marginRight: theme.spacing(2),
    padding: '0 5px 0 5px',
    minHeight: 20,
    minWidth: 20,
    textTransform: 'none',
  },
  icon: {
    marginRight: theme.spacing(1),
  },
  arrow: {
    verticalAlign: 'middle',
    marginRight: 10,
  },
}));

const TopMenuTrigger = () => {
  const location = useLocation();
  const { t } = useFormatter();
  const { triggerId } = useParams() as { triggerId: string };
  const classes = useStyles();
  const computePath = (path?: string) => `/dashboard/profile/triggers/${triggerId}${path ?? ''}`;
  const isCompatiblePath = (path?: string) => (path ? location.pathname.includes(computePath(path)) : location.pathname === computePath(path));
  const computeVariant = (path?: string) => (isCompatiblePath(path) ? 'contained' : 'text');
  const computeColor = (path?: string) => (isCompatiblePath(path) ? 'secondary' : 'primary');
  const computeLocatedButton = (title: string, basePath?: string) => {
    return (
      <Button component={Link} size="small"
        to={computePath(basePath)}
        variant={computeVariant(basePath)}
        color={computeColor(basePath)}
        classes={{ root: classes.button }}>
        {t(title)}
      </Button>
    );
  };
  return (
    <div>
      <Button component={Link}
        to="/dashboard/profile/triggers" variant="contained"
        size="small" color="primary"
        classes={{ root: classes.buttonHome }}>
        <Fire className={classes.icon} fontSize="small" />
        {t('Triggers')}
      </Button>
      <ArrowForwardIosOutlined color="primary" classes={{ root: classes.arrow }} />
      {computeLocatedButton('Overview')}
    </div>
  );
};

export default TopMenuTrigger;
