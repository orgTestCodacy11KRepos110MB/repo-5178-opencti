import { useFragment } from 'react-relay';
import * as Yup from 'yup';
import { ObjectShape } from 'yup/lib/object';
import { AnySchema } from 'yup/lib/schema';
import useAuth from './useAuth';
import {
  entitySettingFragment,
  entitySettingsFragment,
} from '../../private/components/settings/sub_types/EntitySetting';
import {
  EntitySetting_entitySetting$data,
} from '../../private/components/settings/sub_types/__generated__/EntitySetting_entitySetting.graphql';
import {
  EntitySettingConnection_entitySettings$data,
} from '../../private/components/settings/sub_types/__generated__/EntitySettingConnection_entitySettings.graphql';
import {
  AttributeConfiguration,
} from '../../private/components/settings/sub_types/EntitySettingAttributesConfiguration';

const useEntitySettings = () => {
  const { entitySettings } = useAuth();
  return useFragment(entitySettingsFragment, entitySettings) as EntitySettingConnection_entitySettings$data;
};

export const useIsHiddenEntities = (...ids: string[]): boolean => {
  return useEntitySettings().edges.map((edgeNode) => edgeNode.node)
    .map((node) => useFragment(entitySettingFragment, node) as EntitySetting_entitySetting$data)
    .filter((node) => ids.includes(node.target_type) && node.platform_hidden_type !== null)
    .every((node) => node.platform_hidden_type);
};

export const useIsHiddenEntity = (id: string): boolean => {
  return useEntitySettings().edges.map((edgeNode) => edgeNode.node)
    .map((node) => useFragment(entitySettingFragment, node) as EntitySetting_entitySetting$data)
    .some((node) => id === node.target_type && node.platform_hidden_type !== null && node.platform_hidden_type);
};

export const useIsEnforceReference = (id: string): boolean => {
  return useEntitySettings().edges.map((edgeNode) => edgeNode.node)
    .map((node) => useFragment(entitySettingFragment, node) as EntitySetting_entitySetting$data)
    .some((node) => id === node.target_type && node.enforce_reference !== null && node.enforce_reference);
};

const useAttributesConfiguration = (id: string): AttributeConfiguration[] | null => {
  const entitySetting = useEntitySettings().edges.map((edgeNode) => edgeNode.node)
    .map((node) => useFragment(entitySettingFragment, node) as EntitySetting_entitySetting$data)
    .find((node) => id === node.target_type && node.attributes_configuration !== null);

  if (!entitySetting || !entitySetting.attributes_configuration) {
    return null;
  }

  return JSON.parse(entitySetting.attributes_configuration);
};

export const useCustomYup = <TNextShape extends ObjectShape>(id: string, existingShape: TNextShape, t: (message: string) => string): TNextShape => {
  const attributesConfiguration = useAttributesConfiguration(id);
  if (!attributesConfiguration) {
    return existingShape;
  }

  const existingKeys = Object.keys(existingShape);

  const newShape = Object.fromEntries(
    attributesConfiguration
      .filter((attr: AttributeConfiguration) => attr.mandatory)
      .map((attr: AttributeConfiguration) => attr.name)
      .map((attrName: string) => {
        let validator;
        if (existingKeys.includes(attrName)) {
          validator = (existingShape[attrName] as AnySchema).required(t('This field is required'));
        } else {
          validator = Yup.mixed().required(t('This field is required')); // try if's work
        }
        return [attrName, validator];
      }),
  );
  return {
    ...existingShape,
    ...newShape,
  };
};

export default useEntitySettings;
