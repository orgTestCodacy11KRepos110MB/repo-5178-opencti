/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { FunctionComponent, useState } from 'react';
import { Field, Form, Formik } from 'formik';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Fab from '@mui/material/Fab';
import { Add, Close } from '@mui/icons-material';
import * as Yup from 'yup';
import { graphql, useMutation } from 'react-relay';
import makeStyles from '@mui/styles/makeStyles';
import { FormikConfig, FormikHelpers } from 'formik/dist/types';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import * as R from 'ramda';
import MenuItem from '@mui/material/MenuItem';
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

const triggerMutation = graphql`
  mutation TriggerCreationMutation($input: TriggerLiveAddInput!) {
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

interface TriggerAddInput {
  name: string
  description: string
  event_types: string[]
  outcomes: string[]
}

interface TriggerCreationProps {
  contextual?: boolean;
  display?: boolean;
  inputValue?: string;
  paginationOptions: TriggersLinesPaginationQuery$variables;
}

const TriggerCreation: FunctionComponent<TriggerCreationProps> = ({
  contextual,
  display,
  inputValue,
  paginationOptions,
}) => {
  const { t } = useFormatter();
  const classes = useStyles();

  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, object[]>>({});
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
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

  const [commit] = useMutation(triggerMutation);

  const initialValues: TriggerAddInput = {
    name: inputValue || '',
    description: '',
    event_types: ['create'],
    outcomes: [],
  };

  const onSubmit: FormikConfig<TriggerAddInput>['onSubmit'] = (
    values: TriggerAddInput,
    { setSubmitting, setErrors, resetForm }: FormikHelpers<TriggerAddInput>,
  ) => {
    const jsonFilters = JSON.stringify(filters);
    const finalValues = {
      name: values.name,
      event_types: values.event_types,
      outcomes: values.outcomes,
      description: values.description,
      filters: jsonFilters,
    };
    commit({
      variables: {
        input: finalValues,
      },
      updater: (store) => {
        insertNode(store, 'Pagination_triggers', paginationOptions, 'triggerLiveAdd');
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

  const fields = (
    setFieldValue: (
      field: string,
      value: unknown,
      shouldValidate?: boolean | undefined
    ) => void,
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
      <Field component={SelectField}
        variant="standard"
        name="event_types"
        label={t('Triggering on')}
        fullWidth={true}
        multiple={true}
        onChange={(name: string, value: string[]) => setFieldValue('event_types', value)}
        inputProps={{ name: 'type', id: 'type' }}
        containerstyle={{ marginTop: 20, width: '100%' }}>
        <MenuItem value="create">{t('Creation')}</MenuItem>
        <MenuItem value="update">{t('Update')}</MenuItem>
        <MenuItem value="delete">{t('Deletion')}</MenuItem>
      </Field>
      <Field component={SelectField}
             variant="standard"
             name="outcomes"
             label={t('Targeting')}
             fullWidth={true}
             multiple={true}
             onChange={(name: string, value: string[]) => setFieldValue('outcomes', value)}
             inputProps={{ name: 'type', id: 'type' }}
             containerstyle={{ marginTop: 20, width: '100%' }}>
        <MenuItem value='f4ee7b33-006a-4b0d-b57d-411ad288653d'>{t('User interface')}</MenuItem>
        <MenuItem value='44fcf1f4-8e31-4b31-8dbc-cd6993e1b822'>{t('Email')}</MenuItem>
      </Field>
      <div style={{ marginTop: 35 }}>
        <Filters
          variant="text"
          availableFilterKeys={[
            'entity_type',
            'markedBy',
            'labelledBy',
            'createdBy',
            'x_opencti_score',
            'x_opencti_detection',
            'revoked',
            'confidence',
            'indicator_types',
            'pattern_type',
          ]}
          handleAddFilter={handleAddFilter}
          noDirectFilters={true}
          disabled={undefined} size={undefined} fontSize={undefined}
          availableEntityTypes={undefined} availableRelationshipTypes={undefined} allEntityTypes={undefined}
          type={undefined} />
      </div>
      <FilterCard filters={filters} handleRemoveFilter={handleRemoveFilter}/>
    </React.Fragment>
  );

  const renderClassic = () => (
    <div>
      <Fab
        onClick={handleOpen}
        color="secondary"
        aria-label="Add"
        className={classes.createButton}
      >
        <Add />
      </Fab>
      <Drawer
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
          <Formik<TriggerAddInput>
            initialValues={initialValues}
            validationSchema={triggerValidation(t)}
            onSubmit={onSubmit}
            onReset={onReset}
          >
            {({
              submitForm,
              handleReset,
              isSubmitting,
              setFieldValue,
            }) => (
              <Form style={{ margin: '20px 0 20px 0' }}>
                {fields(setFieldValue)}
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
      <Fab
        onClick={handleOpen}
        color="secondary"
        aria-label="Add"
        className={classes.createButtonContextual}
      >
        <Add />
      </Fab>
      <Dialog open={open} onClose={handleClose} PaperProps={{ elevation: 1 }}>
        <Formik
          initialValues={initialValues}
          validationSchema={triggerValidation(t)}
          onSubmit={onSubmit}
          onReset={onReset}
        >
          {({
            submitForm,
            handleReset,
            isSubmitting,
            setFieldValue,
          }) => (
            <div>
              <DialogTitle>{t('Create a trigger')}</DialogTitle>
              <DialogContent>{fields(setFieldValue)}</DialogContent>
              <DialogActions classes={{ root: classes.dialogActions }}>
                <Button onClick={handleReset} disabled={isSubmitting}>
                  {t('Cancel')}
                </Button>
                <Button color="secondary" onClick={submitForm} disabled={isSubmitting}>
                  {t('Create')}
                </Button>
              </DialogActions>
            </div>
          )}
        </Formik>
      </Dialog>
    </div>
  );

  if (contextual) {
    return renderContextual();
  }
  return renderClassic();
};

export default TriggerCreation;
