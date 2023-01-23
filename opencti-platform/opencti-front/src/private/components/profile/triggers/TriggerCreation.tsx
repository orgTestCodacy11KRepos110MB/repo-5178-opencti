/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { FunctionComponent, useState } from 'react';
import { Field, Form, Formik } from 'formik';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import {
  BackupTableOutlined,
  CampaignOutlined,
  Close,
} from '@mui/icons-material';
import * as Yup from 'yup';
import { graphql, useMutation } from 'react-relay';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import SpeedDial from '@mui/material/SpeedDial';
import makeStyles from '@mui/styles/makeStyles';
import { FormikConfig, FormikHelpers } from 'formik/dist/types';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import * as R from 'ramda';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import TextField from '../../../../components/TextField';
import MarkDownField from '../../../../components/MarkDownField';
import { Theme } from '../../../../components/Theme';
import { useFormatter } from '../../../../components/i18n';
import { handleErrorInForm } from '../../../../relay/environment';
import { insertNode } from '../../../../utils/store';
import { TriggersLinesPaginationQuery$variables } from './__generated__/TriggersLinesPaginationQuery.graphql';
import Filters from '../../common/lists/Filters';
import { isUniqFilter } from '../../../../utils/filters/filtersUtils';
import SelectField from '../../../../components/SelectField';
import FilterCard from '../../../../components/FilterCard';

const useStyles = makeStyles<Theme>((theme) => ({
  drawerPaper: {
    minHeight: '100vh',
    width: '50%',
    position: 'fixed',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    padding: 0,
  },
  dialogActions: {
    padding: '0 17px 20px 0',
  },
  createButton: {
    position: 'fixed',
    bottom: 30,
    right: 30,
    zIndex: 1100,
  },
  speedDialButton: {
    backgroundColor: theme.palette.secondary.main,
    color: '#ffffff',
    '&:hover': {
      backgroundColor: theme.palette.secondary.main,
    },
  },
  createButtonContextual: {
    position: 'fixed',
    bottom: 30,
    right: 30,
    zIndex: 2000,
  },
  buttons: {
    marginTop: 20,
    textAlign: 'right',
  },
  button: {
    marginLeft: theme.spacing(2),
  },
  header: {
    backgroundColor: theme.palette.background.nav,
    padding: '20px 20px 20px 60px',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    left: 5,
    color: 'inherit',
  },
  importButton: {
    position: 'absolute',
    top: 15,
    right: 20,
  },
  container: {
    padding: '10px 20px 20px 20px',
  },
  filters: {
    marginTop: 20,
  },
}));

interface TriggerCreationProps {
  contextual?: boolean;
  display?: boolean;
  open: boolean;
  handleClose: () => void;
  inputValue?: string;
  paginationOptions: TriggersLinesPaginationQuery$variables;
}

// region live
const triggerLiveAddMutation = graphql`
  mutation TriggerCreationLiveMutation($input: TriggerLiveAddInput!) {
    triggerLiveAdd(input: $input) {
      ...TriggerLine_node
    }
  }
`;

const triggerValidation = (t: (message: string) => string) => Yup.object().shape({
  name: Yup.string().required(t('This field is required')),
  description: Yup.string().nullable(),
  event_types: Yup.array().required(t('This field is required')),
  outcomes: Yup.array().required(t('This field is required')),
});

interface TriggerLiveAddInput {
  name: string;
  description: string;
  event_types: string[];
  outcomes: string[];
}

const TriggerLiveCreation: FunctionComponent<TriggerCreationProps> = ({
  contextual,
  display,
  inputValue,
  paginationOptions,
  open,
  handleClose,
}) => {
  const { t } = useFormatter();
  const classes = useStyles();
  const [filters, setFilters] = useState<Record<string, object[]>>({});
  const onReset = () => handleClose();
  const handleAddFilter = (key: string, id: string, value: unknown) => {
    if (filters[key] && filters[key].length > 0) {
      setFilters(
        R.assoc(
          key,
          isUniqFilter(key)
            ? [{ id, value }]
            : R.uniqBy(R.prop('id'), [{ id, value }, ...filters[key]]),
          filters,
        ),
      );
    } else {
      setFilters(R.assoc(key, [{ id, value }], filters));
    }
  };
  const handleRemoveFilter = (key: string) => {
    setFilters(R.dissoc(key, filters));
  };
  const [commitLive] = useMutation(triggerLiveAddMutation);
  const liveInitialValues: TriggerLiveAddInput = {
    name: inputValue || '',
    description: '',
    event_types: ['create'],
    outcomes: [],
  };
  const eventTypesOptions: Record<string, string> = {
    create: t('Creation'),
    update: t('Modification'),
    delete: t('Deletion'),
  };
  const outcomesOptions: Record<string, string> = {
    'f4ee7b33-006a-4b0d-b57d-411ad288653d': t('User interface'),
    '44fcf1f4-8e31-4b31-8dbc-cd6993e1b822': t('Email'),
    webhook: t('Webhook'),
  };
  const onLiveSubmit: FormikConfig<TriggerLiveAddInput>['onSubmit'] = (
    values: TriggerLiveAddInput,
    { setSubmitting, setErrors, resetForm }: FormikHelpers<TriggerLiveAddInput>,
  ) => {
    const jsonFilters = JSON.stringify(filters);
    const finalValues = {
      name: values.name,
      event_types: values.event_types,
      outcomes: values.outcomes,
      description: values.description,
      filters: jsonFilters,
    };
    commitLive({
      variables: {
        input: finalValues,
      },
      updater: (store) => {
        insertNode(
          store,
          'Pagination_triggers',
          paginationOptions,
          'triggerLiveAdd',
        );
      },
      onError: (error: Error) => {
        handleErrorInForm(error, setErrors);
        setSubmitting(false);
      },
      onCompleted: () => {
        setSubmitting(false);
        resetForm();
        handleClose();
      },
    });
  };
  const liveFields = (
    setFieldValue: (
      field: string,
      value: unknown,
      shouldValidate?: boolean | undefined
    ) => void,
    values: TriggerLiveAddInput,
  ) => (
    <React.Fragment>
      <Field
        component={TextField}
        variant="standard"
        name="name"
        label={t('Name')}
        fullWidth={true}
      />
      <Field
        component={MarkDownField}
        name="description"
        label={t('Description')}
        fullWidth={true}
        multiline={true}
        rows="4"
        style={{ marginTop: 20 }}
      />
      <Field
        component={SelectField}
        variant="standard"
        name="event_types"
        label={t('Triggering on')}
        fullWidth={true}
        multiple={true}
        onChange={(name: string, value: string[]) => setFieldValue('event_types', value)
        }
        inputProps={{ name: 'event_types', id: 'event_types' }}
        containerstyle={{ marginTop: 20, width: '100%' }}
        renderValue={(selected: Array<string>) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selected.map((value) => (
              <Chip key={value} label={eventTypesOptions[value]} />
            ))}
          </Box>
        )}
      >
        <MenuItem value="create">
          <Checkbox checked={values.event_types.indexOf('create') > -1} />
          <ListItemText primary={eventTypesOptions.create} />
        </MenuItem>
        <MenuItem value="update">
          <Checkbox checked={values.event_types.indexOf('update') > -1} />
          <ListItemText primary={eventTypesOptions.update} />
        </MenuItem>
        <MenuItem value="delete">
          <Checkbox checked={values.event_types.indexOf('delete') > -1} />
          <ListItemText primary={eventTypesOptions.delete} />
        </MenuItem>
      </Field>
      <Field
        component={SelectField}
        variant="standard"
        name="outcomes"
        label={t('Notification')}
        fullWidth={true}
        multiple={true}
        onChange={(name: string, value: string[]) => setFieldValue('outcomes', value)
        }
        inputProps={{ name: 'outcomes', id: 'outcomes' }}
        containerstyle={{ marginTop: 20, width: '100%' }}
        renderValue={(selected: Array<string>) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selected.map((value) => (
              <Chip key={value} label={outcomesOptions[value]} />
            ))}
          </Box>
        )}
      >
        <MenuItem value="f4ee7b33-006a-4b0d-b57d-411ad288653d">
          <Checkbox
            checked={
              values.outcomes.indexOf('f4ee7b33-006a-4b0d-b57d-411ad288653d')
              > -1
            }
          />
          <ListItemText
            primary={outcomesOptions['f4ee7b33-006a-4b0d-b57d-411ad288653d']}
          />
        </MenuItem>
        <MenuItem value="44fcf1f4-8e31-4b31-8dbc-cd6993e1b822">
          <Checkbox
            checked={
              values.outcomes.indexOf('44fcf1f4-8e31-4b31-8dbc-cd6993e1b822')
              > -1
            }
          />
          <ListItemText
            primary={outcomesOptions['44fcf1f4-8e31-4b31-8dbc-cd6993e1b822']}
          />
        </MenuItem>
        <MenuItem value="webhook" disabled={true}>
          <Checkbox checked={values.outcomes.indexOf('webhook') > -1} />
          <ListItemText primary={outcomesOptions.webhook} />
        </MenuItem>
      </Field>
      <div style={{ marginTop: 35 }}>
        <Filters
          variant="text"
          availableFilterKeys={[
            'entity_type',
            'x_opencti_workflow_id',
            'assigneeTo',
            'objectContains',
            'markedBy',
            'labelledBy',
            'createdBy',
            'x_opencti_score',
            'x_opencti_detection',
            'revoked',
            'confidence',
            'indicator_types',
            'pattern_type',
            'fromId',
            'toId',
            'fromTypes',
            'toTypes',
          ]}
          handleAddFilter={handleAddFilter}
          noDirectFilters={true}
          disabled={undefined}
          size={undefined}
          fontSize={undefined}
          availableEntityTypes={undefined}
          availableRelationshipTypes={undefined}
          allEntityTypes={undefined}
          type={undefined}
          availableRelationFilterTypes={undefined}
        />
      </div>
      <FilterCard filters={filters} handleRemoveFilter={handleRemoveFilter} />
    </React.Fragment>
  );
  const renderClassic = () => (
    <div>
      <Drawer
        disableRestoreFocus={true}
        open={open}
        anchor="right"
        elevation={1}
        sx={{ zIndex: 1202 }}
        classes={{ paper: classes.drawerPaper }}
        onClose={handleClose}
      >
        <div className={classes.header}>
          <IconButton
            aria-label="Close"
            className={classes.closeButton}
            onClick={handleClose}
            size="large"
            color="primary"
          >
            <Close fontSize="small" color="primary" />
          </IconButton>
          <Typography variant="h6">{t('Create a live trigger')}</Typography>
        </div>
        <div className={classes.container}>
          <Formik<TriggerLiveAddInput>
            initialValues={liveInitialValues}
            validationSchema={triggerValidation(t)}
            onSubmit={onLiveSubmit}
            onReset={onReset}
          >
            {({
              submitForm,
              handleReset,
              isSubmitting,
              setFieldValue,
              values,
            }) => (
              <Form style={{ margin: '20px 0 20px 0' }}>
                {liveFields(setFieldValue, values)}
                <div className={classes.buttons}>
                  <Button
                    variant="contained"
                    onClick={handleReset}
                    disabled={isSubmitting}
                    classes={{ root: classes.button }}
                  >
                    {t('Cancel')}
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={submitForm}
                    disabled={isSubmitting}
                    classes={{ root: classes.button }}
                  >
                    {t('Create')}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </Drawer>
    </div>
  );
  const renderContextual = () => (
    <div style={{ display: display ? 'block' : 'none' }}>
      <Dialog
        disableRestoreFocus={true}
        open={open}
        onClose={handleClose}
        PaperProps={{ elevation: 1 }}
      >
        <Formik
          initialValues={liveInitialValues}
          validationSchema={triggerValidation(t)}
          onSubmit={onLiveSubmit}
          onReset={onReset}
        >
          {({
            submitForm,
            handleReset,
            isSubmitting,
            setFieldValue,
            values,
          }) => (
            <div>
              <DialogTitle>{t('Create a live trigger')}</DialogTitle>
              <DialogContent>{liveFields(setFieldValue, values)}</DialogContent>
              <DialogActions classes={{ root: classes.dialogActions }}>
                <Button onClick={handleReset} disabled={isSubmitting}>
                  {t('Cancel')}
                </Button>
                <Button
                  color="secondary"
                  onClick={submitForm}
                  disabled={isSubmitting}
                >
                  {t('Create')}
                </Button>
              </DialogActions>
            </div>
          )}
        </Formik>
      </Dialog>
    </div>
  );
  return contextual ? renderContextual() : renderClassic();
};
// endregion

// region digest
const triggerDigestAddMutation = graphql`
  mutation TriggerCreationDigestMutation($input: TriggerDigestAddInput!) {
    triggerDigestAdd(input: $input) {
      ...TriggerLine_node
    }
  }
`;

interface TriggerDigestAddInput {
  name: string;
  description: string;
  outcomes: string[];
}

const TriggerDigestCreation: FunctionComponent<TriggerCreationProps> = ({
  contextual,
  display,
  inputValue,
  paginationOptions,
  open,
  handleClose,
}) => {
  const { t } = useFormatter();
  const classes = useStyles();
  const onReset = () => handleClose();
  const [commitDigest] = useMutation(triggerDigestAddMutation);
  const digestInitialValues: TriggerDigestAddInput = {
    name: inputValue || '',
    description: '',
    outcomes: [],
  };
  const eventTypesOptions: Record<string, string> = {
    create: t('Creation'),
    update: t('Modification'),
    delete: t('Deletion'),
  };
  const outcomesOptions: Record<string, string> = {
    'f4ee7b33-006a-4b0d-b57d-411ad288653d': t('User interface'),
    '44fcf1f4-8e31-4b31-8dbc-cd6993e1b822': t('Email'),
    webhook: t('Webhook'),
  };
  const onDigestSubmit: FormikConfig<TriggerDigestAddInput>['onSubmit'] = (
    values: TriggerDigestAddInput,
    {
      setSubmitting,
      setErrors,
      resetForm,
    }: FormikHelpers<TriggerDigestAddInput>,
  ) => {
    const finalValues = {
      name: values.name,
      outcomes: values.outcomes,
      description: values.description,
    };
    commitDigest({
      variables: {
        input: finalValues,
      },
      updater: (store) => {
        insertNode(
          store,
          'Pagination_triggers',
          paginationOptions,
          'triggerDigestAdd',
        );
      },
      onError: (error: Error) => {
        handleErrorInForm(error, setErrors);
        setSubmitting(false);
      },
      onCompleted: () => {
        setSubmitting(false);
        resetForm();
        handleClose();
      },
    });
  };
  const digestFields = (
    setFieldValue: (
      field: string,
      value: unknown,
      shouldValidate?: boolean | undefined
    ) => void,
    values: TriggerDigestAddInput,
  ) => (
    <React.Fragment>
      <Field
        component={TextField}
        variant="standard"
        name="name"
        label={t('Name')}
        fullWidth={true}
      />
      <Field
        component={MarkDownField}
        name="description"
        label={t('Description')}
        fullWidth={true}
        multiline={true}
        rows="4"
        style={{ marginTop: 20 }}
      />
      <Field
        component={SelectField}
        variant="standard"
        name="outcomes"
        label={t('Notification')}
        fullWidth={true}
        multiple={true}
        onChange={(name: string, value: string[]) => setFieldValue('outcomes', value)
        }
        inputProps={{ name: 'outcomes', id: 'outcomes' }}
        containerstyle={{ marginTop: 20, width: '100%' }}
        renderValue={(selected: Array<string>) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selected.map((value) => (
              <Chip key={value} label={outcomesOptions[value]} />
            ))}
          </Box>
        )}
      >
        <MenuItem value="f4ee7b33-006a-4b0d-b57d-411ad288653d">
          <Checkbox
            checked={
              values.outcomes.indexOf('f4ee7b33-006a-4b0d-b57d-411ad288653d')
              > -1
            }
          />
          <ListItemText
            primary={outcomesOptions['f4ee7b33-006a-4b0d-b57d-411ad288653d']}
          />
        </MenuItem>
        <MenuItem value="44fcf1f4-8e31-4b31-8dbc-cd6993e1b822">
          <Checkbox
            checked={
              values.outcomes.indexOf('44fcf1f4-8e31-4b31-8dbc-cd6993e1b822')
              > -1
            }
          />
          <ListItemText
            primary={outcomesOptions['44fcf1f4-8e31-4b31-8dbc-cd6993e1b822']}
          />
        </MenuItem>
        <MenuItem value="webhook" disabled={true}>
          <Checkbox checked={values.outcomes.indexOf('webhook') > -1} />
          <ListItemText primary={outcomesOptions.webhook} />
        </MenuItem>
      </Field>
    </React.Fragment>
  );
  const renderClassic = () => (
    <div>
      <Drawer
        disableRestoreFocus={true}
        open={open}
        anchor="right"
        elevation={1}
        sx={{ zIndex: 1202 }}
        classes={{ paper: classes.drawerPaper }}
        onClose={handleClose}
      >
        <div className={classes.header}>
          <IconButton
            aria-label="Close"
            className={classes.closeButton}
            onClick={handleClose}
            size="large"
            color="primary"
          >
            <Close fontSize="small" color="primary" />
          </IconButton>
          <Typography variant="h6">{t('Create a regular digest')}</Typography>
        </div>
        <div className={classes.container}>
          <Formik<TriggerDigestAddInput>
            initialValues={digestInitialValues}
            validationSchema={triggerValidation(t)}
            onSubmit={onDigestSubmit}
            onReset={onReset}
          >
            {({
              submitForm,
              handleReset,
              isSubmitting,
              setFieldValue,
              values,
            }) => (
              <Form style={{ margin: '20px 0 20px 0' }}>
                {digestFields(setFieldValue, values)}
                <div className={classes.buttons}>
                  <Button
                    variant="contained"
                    onClick={handleReset}
                    disabled={isSubmitting}
                    classes={{ root: classes.button }}
                  >
                    {t('Cancel')}
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={submitForm}
                    disabled={isSubmitting}
                    classes={{ root: classes.button }}
                  >
                    {t('Create')}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </Drawer>
    </div>
  );
  const renderContextual = () => (
    <div style={{ display: display ? 'block' : 'none' }}>
      <Dialog
        disableRestoreFocus={true}
        open={open}
        onClose={handleClose}
        PaperProps={{ elevation: 1 }}
      >
        <Formik
          initialValues={digestInitialValues}
          validationSchema={triggerValidation(t)}
          onSubmit={onDigestSubmit}
          onReset={onReset}
        >
          {({
            submitForm,
            handleReset,
            isSubmitting,
            setFieldValue,
            values,
          }) => (
            <div>
              <DialogTitle>{t('Create a regular digest')}</DialogTitle>
              <DialogContent>
                {digestFields(setFieldValue, values)}
              </DialogContent>
              <DialogActions classes={{ root: classes.dialogActions }}>
                <Button onClick={handleReset} disabled={isSubmitting}>
                  {t('Cancel')}
                </Button>
                <Button
                  color="secondary"
                  onClick={submitForm}
                  disabled={isSubmitting}
                >
                  {t('Create')}
                </Button>
              </DialogActions>
            </div>
          )}
        </Formik>
      </Dialog>
    </div>
  );
  return contextual ? renderContextual() : renderClassic();
};
// endregion

const TriggerCreation: FunctionComponent<TriggerCreationProps> = ({
  contextual,
  display,
  inputValue,
  paginationOptions,
}) => {
  const { t } = useFormatter();
  const classes = useStyles();
  const [openSpeedDial, setOpenSpeedDial] = useState(false);
  // Live
  const [openLive, setOpenLive] = useState(false);
  const handleOpenCreateLive = () => {
    setOpenSpeedDial(false);
    setOpenLive(true);
  };
  // Digest
  const [openDigest, setOpenDigest] = useState(false);
  const handleOpenCreateDigest = () => {
    setOpenSpeedDial(false);
    setOpenDigest(true);
  };
  return (
    <>
      <SpeedDial
        className={classes.createButton}
        ariaLabel="Create"
        icon={<SpeedDialIcon />}
        onClose={() => setOpenSpeedDial(false)}
        onOpen={() => setOpenSpeedDial(true)}
        open={openSpeedDial}
        FabProps={{ color: 'secondary' }}
      >
        <SpeedDialAction
          title={t('Live trigger')}
          icon={<CampaignOutlined />}
          tooltipTitle={t('Create a live trigger')}
          onClick={handleOpenCreateLive}
          FabProps={{ classes: { root: classes.speedDialButton } }}
        />
        <SpeedDialAction
          title={t('Regular digest')}
          icon={<BackupTableOutlined />}
          tooltipTitle={t('Create a regular digest')}
          onClick={handleOpenCreateDigest}
          FabProps={{ classes: { root: classes.speedDialButton } }}
        />
      </SpeedDial>
      <TriggerLiveCreation
        contextual={contextual}
        display={display}
        inputValue={inputValue}
        paginationOptions={paginationOptions}
        open={openLive}
        handleClose={() => setOpenLive(false)}
      />
      <TriggerDigestCreation
        contextual={contextual}
        display={display}
        inputValue={inputValue}
        paginationOptions={paginationOptions}
        open={openDigest}
        handleClose={() => setOpenDigest(false)}
      />
    </>
  );
};

export default TriggerCreation;