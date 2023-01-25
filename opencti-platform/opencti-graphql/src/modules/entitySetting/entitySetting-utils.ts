import type { JSONSchemaType } from 'ajv';
import {
  ABSTRACT_STIX_CORE_RELATIONSHIP,
  ABSTRACT_STIX_CYBER_OBSERVABLE,
  ABSTRACT_STIX_DOMAIN_OBJECT
} from '../../schema/general';
import { STIX_SIGHTING_RELATIONSHIP } from '../../schema/stixSightingRelationship';
import { ENTITY_TYPE_DATA_COMPONENT, isStixDomainObject } from '../../schema/stixDomainObject';
import { UnsupportedError, ValidationError } from '../../config/errors';
import type { AttributeConfiguration, BasicStoreEntityEntitySetting } from './entitySetting-types';
import { ENTITY_TYPE_ENTITY_SETTING } from './entitySetting-types';
import { getEntitiesFromCache, getEntitiesMapFromCache } from '../../database/cache';
import { SYSTEM_USER } from '../../utils/access';
import type { AuthContext, AuthUser } from '../../types/user';
import { isStixCoreRelationship } from '../../schema/stixCoreRelationship';
import { isStixCyberObservable } from '../../schema/stixCyberObservable';
import { schemaDefinition } from '../../schema/schema-register';
import type { ValidatorFn } from '../../schema/validator-register';

export type AvailableSetting = keyof Omit<BasicStoreEntityEntitySetting, 'target_type'>;

const isOfTypeAvailableSetting = (key: string) => ['platform_entity_files_ref', 'platform_hidden_type', 'enforce_reference', 'attributes_configuration'].includes(key);

export const defaultEntitySetting: Record<string, () => boolean> = {
  platform_entity_files_ref: () => false,
  platform_hidden_type: () => false,
  enforce_reference: () => false,
};

export const availableSettings: Record<string, Array<AvailableSetting>> = {
  [ENTITY_TYPE_DATA_COMPONENT]: ['attributes_configuration'],
  [ABSTRACT_STIX_DOMAIN_OBJECT]: ['platform_entity_files_ref', 'platform_hidden_type', 'enforce_reference'],
  [ABSTRACT_STIX_CYBER_OBSERVABLE]: ['platform_entity_files_ref'],
  [ABSTRACT_STIX_CORE_RELATIONSHIP]: ['enforce_reference'],
  [STIX_SIGHTING_RELATIONSHIP]: ['platform_entity_files_ref'],
};

export const getAvailableSettings = (targetType: string) => {
  let settings;
  if (isStixDomainObject(targetType)) {
    settings = [...availableSettings[targetType] ?? [], ...availableSettings[ABSTRACT_STIX_DOMAIN_OBJECT]];
  } else {
    settings = availableSettings[targetType];
  }

  if (!settings) {
    throw UnsupportedError('This entity type is not support for entity settings', { target_type: targetType });
  }

  return settings;
};

// -- HELPERS --

export const getEntitySettingFromCache = async (context: AuthContext, type: string) => {
  const entitySettings = await getEntitiesFromCache<BasicStoreEntityEntitySetting>(context, SYSTEM_USER, ENTITY_TYPE_ENTITY_SETTING);
  let entitySetting = entitySettings.find((es) => es.target_type === type);

  if (!entitySetting) {
    // Inheritance
    if (isStixCoreRelationship(type)) {
      entitySetting = entitySettings.find((es) => es.target_type === ABSTRACT_STIX_CORE_RELATIONSHIP);
    } else if (isStixCyberObservable(type)) {
      entitySetting = entitySettings.find((es) => es.target_type === ABSTRACT_STIX_CYBER_OBSERVABLE);
    }
  }

  return entitySetting;
};

export const getAttributesConfiguration = (entitySetting: BasicStoreEntityEntitySetting) => {
  if (entitySetting?.attributes_configuration) {
    return JSON.parse(entitySetting.attributes_configuration as string) as AttributeConfiguration[];
  }
  return null;
};

// -- VALIDATOR --

const optionsValidation = async (context: AuthContext, user: AuthUser, targetType: string, input: BasicStoreEntityEntitySetting) => {
  const settings = getAvailableSettings(targetType);
  const inputSettings = Object.entries(input);
  inputSettings.forEach(([key]) => {
    if (isOfTypeAvailableSetting(key) && !settings.includes(key as AvailableSetting)) {
      throw UnsupportedError('This setting is not available for this entity', {
        setting: key,
        entity: targetType
      });
    }
  });
};

const customizableAttributesValidation = (entitySetting: BasicStoreEntityEntitySetting) => {
  const attributesConfiguration = getAttributesConfiguration(entitySetting);

  if (attributesConfiguration) {
    const customizableAttributeNames = schemaDefinition.getAttributes(entitySetting.target_type)
      .filter((attr) => attr.mandatoryType === 'customizable')
      .map((attr) => attr.name);

    attributesConfiguration.forEach((attr) => {
      if (!customizableAttributeNames.includes(attr.name)) {
        throw ValidationError(attr.name, {
          message: 'This attribute is not customizable for this entity',
          data: { attribute: attr.name, entityType: entitySetting.target_type }
        });
      }
    });
  }
};

export const validateEntitySetting: ValidatorFn = async (context: AuthContext, user: AuthUser, input: Record<string, unknown>, id: string | undefined) => {
  let entitySetting;
  if (id) { // Update
    const entitySettings = await getEntitiesMapFromCache<BasicStoreEntityEntitySetting>(context, user, ENTITY_TYPE_ENTITY_SETTING);
    entitySetting = entitySettings.get(id);
  } else { // Create
    entitySetting = (input as unknown as BasicStoreEntityEntitySetting);
  }

  if (!entitySetting || !entitySetting.target_type) {
    throw UnsupportedError('The target type is not defined for this setting', { entitySetting, entitySettingId: id });
  } else {
    // Validate Options
    await optionsValidation(context, user, entitySetting.target_type, input as unknown as BasicStoreEntityEntitySetting);
    customizableAttributesValidation(entitySetting);
  }

  return true;
};

// -- AJV --

export const attributeConfiguration: JSONSchemaType<AttributeConfiguration[]> = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      mandatory: { type: 'boolean' }
    },
    required: ['name', 'mandatory']
  },
};