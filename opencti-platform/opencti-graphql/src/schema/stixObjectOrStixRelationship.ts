import { buildRefRelationSearchKey } from './general';
import {
  RELATION_CREATED_BY,
  RELATION_EXTERNAL_REFERENCE,
  RELATION_OBJECT_LABEL,
  RELATION_OBJECT_MARKING
} from './stixMetaRelationship';
import { RELATION_RELATED_TO } from './stixCoreRelationship';
import { STIX_SIGHTING_RELATIONSHIP } from './stixSightingRelationship';

export const stixObjectOrStixRelationshipOptions = {
  StixObjectOrStixRelationshipsFilter: {
    createdBy: buildRefRelationSearchKey(RELATION_CREATED_BY),
    markedBy: buildRefRelationSearchKey(RELATION_OBJECT_MARKING),
    labelledBy: buildRefRelationSearchKey(RELATION_OBJECT_LABEL),
    relatedTo: buildRefRelationSearchKey(RELATION_RELATED_TO),
    hasExternalReference: buildRefRelationSearchKey(RELATION_EXTERNAL_REFERENCE),
    sightedBy: buildRefRelationSearchKey(STIX_SIGHTING_RELATIONSHIP),
    hashes_MD5: 'hashes.MD5',
    hashes_SHA1: 'hashes.SHA-1',
    hashes_SHA256: 'hashes.SHA-256',
  },
};
