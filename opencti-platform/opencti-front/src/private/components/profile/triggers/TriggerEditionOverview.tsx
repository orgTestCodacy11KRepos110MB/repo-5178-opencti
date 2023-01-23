import React, { FunctionComponent } from 'react';
import { graphql, useFragment, useMutation } from 'react-relay';
import { Field, Form, Formik } from 'formik';
import * as Yup from 'yup';
import MenuItem from '@mui/material/MenuItem';
import { FormikConfig } from 'formik/dist/types';
import * as R from 'ramda';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import { useFormatter } from '../../../../components/i18n';
import TextField from '../../../../components/TextField';
import { Option } from '../../common/form/ReferenceField';
import { TriggerEditionOverview_trigger$key } from './__generated__/TriggerEditionOverview_trigger.graphql';
import MarkDownField from '../../../../components/MarkDownField';
import SelectField from '../../../../components/SelectField';
import Filters from '../../common/lists/Filters';
import FilterCard from '../../../../components/FilterCard';
import { isUniqFilter } from '../../../../utils/filters/filtersUtils';

const triggerMutationFieldPatch = graphql`
  mutation TriggerEditionOverviewFieldPatchMutation(
    $id: ID!
    $input: [EditInput!]!
  ) {
    triggerFieldPatch(id: $id, input: $input) {
      ...TriggerEditionOverview_trigger
    }
  }
`;

const triggerEditionOverviewFragment = graphql`
  fragment TriggerEditionOverview_trigger on Trigger {
    id
    name
    description
    event_types
    outcomes
    filters
  }
`;

const triggerValidation = (t: (v: string) => string) => Yup.object().shape({
  name: Yup.string().required(t('This field is required')),
  description: Yup.string().nullable(),
  event_types: Yup.array().required(t('This field is required')),
  outcomes: Yup.array().required(t('This field is required')),
});

interface TriggerEditionOverviewProps {
  data: TriggerEditionOverview_trigger$key;
  handleClose: () => void;
}

interface TriggerEditionFormValues {
  name: string;
  description: string | null;
  event_types: string[];
  outcomes: string[];
}

const TriggerEditionOverview: FunctionComponent<
TriggerEditionOverviewProps
> = ({ data, handleClose }) => {
  const { t } = useFormatter();
  const trigger = useFragment(triggerEditionOverviewFragment, data);
  const filters = JSON.parse(trigger.filters ?? '{}');
  const [commitFieldPatch] = useMutation(triggerMutationFieldPatch);
  const handleAddFilter = (key: string, id: string, value: unknown) => {
    if (filters[key] && filters[key].length > 0) {
      const updatedFilters = R.assoc(
        key,
        isUniqFilter(key)
          ? [{ id, value }]
          : R.uniqBy(R.prop('id'), [{ id, value }, ...filters[key]]),
        filters,
      );
      commitFieldPatch({
        variables: {
          id: trigger.id,
          input: { key: 'filters', value: JSON.stringify(updatedFilters) },
        },
      });
    } else {
      const updatedFilters = R.assoc(key, [{ id, value }], filters);
      commitFieldPatch({
        variables: {
          id: trigger.id,
          input: { key: 'filters', value: JSON.stringify(updatedFilters) },
        },
      });
    }
  };
  const handleRemoveFilter = (key: string) => {
    const updatedFilters = R.dissoc(key, filters);
    commitFieldPatch({
      variables: {
        id: trigger.id,
        input: { key: 'filters', value: JSON.stringify(updatedFilters) },
      },
    });
  };
  const onSubmit: FormikConfig<TriggerEditionFormValues>['onSubmit'] = (
    values,
    { setSubmitting },
  ) => {
    commitFieldPatch({
      variables: {
        id: trigger.id,
        input: values,
      },
      onCompleted: () => {
        setSubmitting(false);
        handleClose();
      },
    });
  };

  const handleSubmitField = (
    name: string,
    value: Option | string | string[],
  ) => {
    triggerValidation(t)
      .validateAt(name, { [name]: value })
      .then(() => {
        commitFieldPatch({
          variables: {
            id: trigger.id,
            input: { key: name, value: value || '' },
          },
        });
      })
      .catch(() => false);
  };

  const initialValues = {
    name: trigger.name,
    description: trigger.description,
    event_types: trigger.event_types,
    outcomes: trigger.outcomes,
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
  return (
    <Formik
      enableReinitialize={true}
      initialValues={initialValues as never}
      validationSchema={triggerValidation(t)}
      onSubmit={onSubmit}
    >
      {({ values }) => (
        <Form style={{ margin: '20px 0 20px 0' }}>
          <Field
            component={TextField}
            variant="standard"
            name="name"
            label={t('Name')}
            fullWidth={true}
            onSubmit={handleSubmitField}
          />
          <Field
            component={MarkDownField}
            name="description"
            label={t('Description')}
            fullWidth={true}
            multiline={true}
            rows="4"
            onSubmit={handleSubmitField}
            style={{ marginTop: 20 }}
          />
          <Field
            component={SelectField}
            variant="standard"
            name="event_types"
            label={t('Triggering on')}
            fullWidth={true}
            multiple={true}
            onChange={(name: string, value: string[]) => handleSubmitField('event_types', value)
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
            onChange={(name: string, value: string[]) => handleSubmitField('outcomes', value)
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
                  values.outcomes.indexOf(
                    'f4ee7b33-006a-4b0d-b57d-411ad288653d',
                  ) > -1
                }
              />
              <ListItemText
                primary={
                  outcomesOptions['f4ee7b33-006a-4b0d-b57d-411ad288653d']
                }
              />
            </MenuItem>
            <MenuItem value="44fcf1f4-8e31-4b31-8dbc-cd6993e1b822">
              <Checkbox
                checked={
                  values.outcomes.indexOf(
                    '44fcf1f4-8e31-4b31-8dbc-cd6993e1b822',
                  ) > -1
                }
              />
              <ListItemText
                primary={
                  outcomesOptions['44fcf1f4-8e31-4b31-8dbc-cd6993e1b822']
                }
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
                'markedBy',
                'labelledBy',
                'objectContains',
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
          <FilterCard
            filters={filters}
            handleRemoveFilter={handleRemoveFilter}
          />
        </Form>
      )}
    </Formik>
  );
};

export default TriggerEditionOverview;
