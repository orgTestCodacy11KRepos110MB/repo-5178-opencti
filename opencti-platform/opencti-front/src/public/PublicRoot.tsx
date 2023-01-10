import CssBaseline from '@mui/material/CssBaseline';
import { StyledEngineProvider } from '@mui/material/styles';
import makeStyles from '@mui/styles/makeStyles';
import { useTheme } from '@mui/styles';
import { loadQuery, usePreloadedQuery } from 'react-relay';
import { ConnectedThemeProvider } from '../components/AppThemeProvider';
import { ConnectedIntlProvider } from '../components/AppIntlProvider';
import { environment, fileUri } from '../relay/environment';
import logo from '../static/images/logo.png';
import { Theme } from '../components/Theme';
import { rootPublicQuery } from './LoginRoot';
import { RootPublicQuery, RootPublicQuery$data } from './__generated__/RootPublicQuery.graphql';
import PublicStreamLines from '../private/components/data/stream/PublicStreamLines';

const useStyles = makeStyles({
  container: {
    textAlign: 'center',
    margin: '0 auto',
    width: '70%',
    marginTop: '8rem',
  },
  logo: {
    width: 200,
    margin: '0px 0px 50px 0px',
  },
});

const PublicRootWithStyle = ({ settings }: { settings: RootPublicQuery$data['settings'] }) => {
  const theme = useTheme<Theme>();
  const classes = useStyles();

  const loginLogo = theme.palette.mode === 'dark'
    ? settings.platform_theme_dark_logo_login
    : settings.platform_theme_light_logo_login;

  return (
    <div className={classes.container}>
      <img src={loginLogo && loginLogo.length > 0 ? loginLogo : fileUri(logo)} alt="logo" className={classes.logo} />
      <PublicStreamLines />
    </div>
  );
};

const queryRef = loadQuery<RootPublicQuery>(environment, rootPublicQuery, {});
const PublicRoot = () => {
  const { settings } = usePreloadedQuery<RootPublicQuery>(rootPublicQuery, queryRef);

  return (
    <StyledEngineProvider injectFirst={true}>
      <ConnectedThemeProvider settings={settings}>
        <CssBaseline />
        <ConnectedIntlProvider settings={settings}>
          <PublicRootWithStyle settings={settings} />
        </ConnectedIntlProvider>
      </ConnectedThemeProvider>
    </StyledEngineProvider>
  );
};

export default PublicRoot;
