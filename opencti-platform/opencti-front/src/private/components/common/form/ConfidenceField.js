import React, { Component } from 'react';
import { Field } from 'formik';
import inject18n from '../../../../components/i18n';
import { SubscriptionFocus } from '../../../../components/Subscription';
import SliderField from '../../../../components/SliderField';

class ConfidenceField extends Component {
  render() {
    const {
      name,
      label,
      variant,
      onChange,
      onFocus,
      containerStyle,
      editContext,
      disabled,
    } = this.props;
    if (variant === 'edit') {
      /* TODO Migrate to vocab with range 2555 */
      return (
        <Field
          component={SliderField}
          variant="standard"
          name={name}
          type="number"
          onFocus={onFocus}
          onSubmit={onChange}
          label={label}
          fullWidth={true}
          style={{ marginTop: 20 }}
          disabled={disabled}
          helpertext={
            <SubscriptionFocus context={editContext} fieldName={name} />
          }>
        </Field>
      );
    }
    return (
      <Field
        component={SliderField}
        variant="standard"
        name={name}
        type="number"
        label={label}
        fullWidth={true}
        style={{ marginTop: 20 }}
        onFocus={onFocus}
        onSubmit={onChange}
        disabled={disabled}
        containerStyle={containerStyle}
      />
    );
  }
}

export default inject18n(ConfidenceField);
