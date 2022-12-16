import type { Resolvers } from '../../generated/graphql';
import { addLanguage, findAll, findById } from './language-domain';
import { buildRefRelationSearchKey } from '../../schema/general';
import { RELATION_CREATED_BY, RELATION_OBJECT_LABEL, RELATION_OBJECT_MARKING } from '../../schema/stixMetaRelationship';
import {
  stixDomainObjectAddRelation,
  stixDomainObjectCleanContext,
  stixDomainObjectDelete,
  stixDomainObjectDeleteRelation,
  stixDomainObjectEditContext,
  stixDomainObjectEditField
} from '../../domain/stixDomainObject';

const languageResolvers: Resolvers = {
  Query: {
    language: (_, { id }, context) => findById(context, context.user, id),
    languages: (_, args, context) => findAll(context, context.user, args),
  },
  LanguagesFilter: {
    createdBy: buildRefRelationSearchKey(RELATION_CREATED_BY),
    markedBy: buildRefRelationSearchKey(RELATION_OBJECT_MARKING),
    labelledBy: buildRefRelationSearchKey(RELATION_OBJECT_LABEL),
  },
  Mutation: {
    languageAdd: (_, { input }, context) => {
      return addLanguage(context, context.user, input);
    },
    languageDelete: (_, { id }, context) => {
      return stixDomainObjectDelete(context, context.user, id);
    },
    languageFieldPatch: (_, { id, input, commitMessage, references }, context) => {
      return stixDomainObjectEditField(context, context.user, id, input, { commitMessage, references });
    },
    languageContextPatch: (_, { id, input }, context) => {
      return stixDomainObjectEditContext(context, context.user, id, input);
    },
    languageContextClean: (_, { id }, context) => {
      return stixDomainObjectCleanContext(context, context.user, id);
    },
    languageRelationAdd: (_, { id, input }, context) => {
      return stixDomainObjectAddRelation(context, context.user, id, input);
    },
    languageRelationDelete: (_, { id, toId, relationship_type: relationshipType }, context) => {
      return stixDomainObjectDeleteRelation(context, context.user, id, toId, relationshipType);
    },
  },
};

export default languageResolvers;
