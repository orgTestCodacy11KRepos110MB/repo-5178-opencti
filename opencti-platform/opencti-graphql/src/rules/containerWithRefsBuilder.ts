/* eslint-disable camelcase */
import type { AddOperation, Operation, ReplaceOperation } from 'fast-json-patch';
import * as jsonpatch from 'fast-json-patch';
import * as R from 'ramda';
import { createInferredRelation, deleteInferredRuleElement, stixLoadById, } from '../database/middleware';
import { RELATION_OBJECT } from '../schema/stixMetaRelationship';
import { createRuleContent } from './rules';
import { generateInternalType } from '../schema/schemaUtils';
import type { RelationTypes, RuleDefinition, RuleRuntime } from '../types/rules';
import type { StixId, StixObject } from '../types/stix-common';
import type { StixReport } from '../types/stix-sdo';
import type { StixRelation } from '../types/stix-sro';
import type { BasicStoreRelation, StoreObject } from '../types/store';
import { STIX_EXT_OCTI } from '../types/stix-extensions';
import { internalFindByIds, internalLoadById, listAllRelations } from '../database/middleware-loader';
import type { BaseEvent, RelationCreation, UpdateEvent } from '../types/event';
import {
  READ_DATA_INDICES,
  UPDATE_OPERATION_ADD,
  UPDATE_OPERATION_REMOVE,
  UPDATE_OPERATION_REPLACE
} from '../database/utils';
import type { AuthContext } from '../types/user';
import { executionContext, RULE_MANAGER_USER } from '../utils/access';
import { buildStixUpdateEvent, publishStixToStream } from '../database/redis';
import { RULE_PREFIX } from '../schema/general';

const buildContainerRefsRule = (ruleDefinition: RuleDefinition, containerType: string, relationTypes: RelationTypes): RuleRuntime => {
  const { id } = ruleDefinition;
  const leftTypeRefFilter = (ref: string) => {
    const [type] = ref.split('--');
    return type === relationTypes.leftType.toLowerCase();
  };
  const generateDependencies = (reportId: string, partOfFromId: string, partOfId: string, partOfTargetId: string) => {
    return [
      reportId,
      partOfFromId,
      partOfId,
      partOfTargetId,
    ];
  };
  type ArrayRefs = Array<{ partOfFromId: string, partOfId: string, partOfStandardId: StixId; partOfTargetId: string; partOfTargetStandardId: StixId }>;
  // eslint-disable-next-line max-len
  const createObjectRefsInferences = async (context: AuthContext, report: StixReport, refs: ArrayRefs, deletedTargets: Array<BasicStoreRelation>): Promise<Array<BaseEvent>> => {
    const events:Array<BaseEvent> = [];
    if (refs.length === 0 && deletedTargets.length === 0) {
      return events;
    }
    const opts = { publishStreamEvent: false };
    const createdTargets: Array<StixId> = [];
    const { id: reportId, object_refs } = report.extensions[STIX_EXT_OCTI];
    const reportObjectRefIds = [...(report.object_refs ?? []), ...(object_refs ?? [])];
    // region handle creation
    for (let index = 0; index < refs.length; index += 1) {
      const { partOfFromId, partOfId, partOfStandardId, partOfTargetId, partOfTargetStandardId } = refs[index];
      // When generating inferences, no need to listen internal generated events
      // relationships are internal meta so creation will be in the stream directly
      const dependencies = generateDependencies(reportId, partOfFromId, partOfId, partOfTargetId);
      if (!reportObjectRefIds.includes(partOfStandardId)) {
        const ruleRelationContent = createRuleContent(id, dependencies, [reportId, partOfId], {});
        const inputForRelation = { fromId: reportId, toId: partOfId, relationship_type: RELATION_OBJECT };
        const inferredRelation = await createInferredRelation(context, inputForRelation, ruleRelationContent, opts) as RelationCreation;
        if (inferredRelation.isCreation) {
          createdTargets.push(inferredRelation.element.standard_id);
        }
      }
      // -----------------------------------------------------------------------------------------------------------
      if (!reportObjectRefIds.includes(partOfTargetStandardId)) {
        const ruleIdentityContent = createRuleContent(id, dependencies, [reportId, partOfTargetId], {});
        const inputForIdentity = { fromId: reportId, toId: partOfTargetId, relationship_type: RELATION_OBJECT };
        const inferredTarget = await createInferredRelation(context, inputForIdentity, ruleIdentityContent) as RelationCreation;
        if (inferredTarget.isCreation) {
          createdTargets.push(inferredTarget.element.standard_id);
        }
      }
    }
    // endregion
    // region handle deletion
    const deletedTargetRefs: Array<StixId> = [];
    for (let indexDeletion = 0; indexDeletion < deletedTargets.length; indexDeletion += 1) {
      const inferenceToDelete = deletedTargets[indexDeletion];
      const event = await deleteInferredRuleElement(id, inferenceToDelete, [], opts);
      if (event?.type === 'delete') {
        // if delete really occurs
        const deletedTarget = await internalLoadById(context, RULE_MANAGER_USER, inferenceToDelete.toId) as unknown as StoreObject;
        deletedTargetRefs.push(deletedTarget.standard_id);
      }
    }
    // endregion
    if (createdTargets.length > 0 || deletedTargetRefs.length > 0) {
      const updatedReport = { ...report };
      const refsWithoutDeletion = (object_refs ?? []).filter((o) => deletedTargetRefs.includes(o));
      updatedReport.extensions[STIX_EXT_OCTI].object_refs = [...refsWithoutDeletion, ...createdTargets];
      const updateEvent = buildStixUpdateEvent(RULE_MANAGER_USER, report, updatedReport, '');
      await publishStixToStream(context, RULE_MANAGER_USER, updateEvent);
    }
    return events;
  };
  const handleReportCreation = async (context: AuthContext, report: StixReport, addedRefs: Array<string>, removedRefs: Array<string>): Promise<Array<BaseEvent>> => {
    const addedTargets: ArrayRefs = [];
    const { id: reportId } = report.extensions[STIX_EXT_OCTI];
    const identities = await internalFindByIds(context, RULE_MANAGER_USER, addedRefs) as Array<StoreObject>;
    const fromIds = identities.map((i) => i.internal_id);
    const fromIdsMap = new Map(identities.map((i) => [i.internal_id, i.standard_id]));
    // Find all identities part of current identities
    const listFromArgs = { fromId: fromIds, toTypes: [relationTypes.rightType] };
    const relations = await listAllRelations<BasicStoreRelation>(context, RULE_MANAGER_USER, relationTypes.creationType, listFromArgs);
    if (relations.length > 0) {
      const targets = await internalFindByIds(context, RULE_MANAGER_USER, R.uniq(relations.map((r) => r.toId))) as Array<StoreObject>;
      const toIdsMap = new Map(targets.map((i) => [i.internal_id, i.standard_id]));
      for (let relIndex = 0; relIndex < relations.length; relIndex += 1) {
        const { internal_id: partOfId, fromId: partOfFromId, toId: partOfTargetId } = relations[relIndex];
        const partOfStandardId = fromIdsMap.get(partOfFromId);
        const partOfTargetStandardId = toIdsMap.get(partOfTargetId);
        if (partOfStandardId && partOfTargetStandardId) {
          addedTargets.push({ partOfFromId, partOfId, partOfStandardId, partOfTargetId, partOfTargetStandardId });
        }
      }
    }
    // Find all current inferences that need to be deleted
    const filters = [{ key: `${RULE_PREFIX}*.dependencies`, values: removedRefs, operator: 'wildcard' }];
    const deletedTargets = await listAllRelations<BasicStoreRelation>(context, RULE_MANAGER_USER, RELATION_OBJECT, { filters, indices: READ_DATA_INDICES });
    // update the report
    return createObjectRefsInferences(context, reportId, addedTargets, deletedTargets);
  };
  const handlePartOfRelationCreation = async (context: AuthContext, partOfRelation: StixRelation): Promise<Array<BaseEvent>> => {
    const events: Array<BaseEvent> = [];
    const { id: partOfId, source_ref: partOfFromId, target_ref: partOfTargetId } = partOfRelation.extensions[STIX_EXT_OCTI];
    const partOfSource = await internalLoadById(context, RULE_MANAGER_USER, partOfFromId) as unknown as StoreObject;
    const partOfStandardId = partOfSource.standard_id;
    const partOfTarget = await internalLoadById(context, RULE_MANAGER_USER, partOfTargetId) as unknown as StoreObject;
    const partOfTargetStandardId = partOfTarget.standard_id;
    const listFromCallback = async (relationships: Array<BasicStoreRelation>) => {
      for (let objectRefIndex = 0; objectRefIndex < relationships.length; objectRefIndex += 1) {
        const { fromId: reportId } = relationships[objectRefIndex];
        const report = await stixLoadById(context, RULE_MANAGER_USER, reportId) as StixReport;
        const addedRefs = [{ partOfFromId, partOfId, partOfStandardId, partOfTargetId, partOfTargetStandardId }];
        const inferredEvents = await createObjectRefsInferences(context, report, addedRefs, []);
        events.push(...inferredEvents);
      }
    };
    const listReportArgs = { fromTypes: [containerType], toId: partOfFromId, callback: listFromCallback };
    await listAllRelations(context, RULE_MANAGER_USER, RELATION_OBJECT, listReportArgs);
    return events;
  };
  const applyInsert = async (data: StixObject): Promise<Array<BaseEvent>> => {
    const context = executionContext(ruleDefinition.name, RULE_MANAGER_USER);
    const events: Array<BaseEvent> = [];
    const entityType = generateInternalType(data);
    if (entityType === containerType) {
      const report = data as StixReport;
      const { object_refs: reportObjectRefs } = report;
      // Get all identities from the report refs
      const leftRefs = (reportObjectRefs ?? []).filter(leftTypeRefFilter);
      if (leftRefs.length > 0) {
        return handleReportCreation(context, report, leftRefs, []);
      }
    }
    const upsertRelation = data as StixRelation;
    const { relationship_type: relationType } = upsertRelation;
    if (relationType === relationTypes.creationType) {
      return handlePartOfRelationCreation(context, upsertRelation);
    }
    return events;
  };
  const applyUpdate = async (data: StixObject, event: UpdateEvent): Promise<Array<BaseEvent>> => {
    const context = executionContext(ruleDefinition.name, RULE_MANAGER_USER);
    const events: Array<BaseEvent> = [];
    const entityType = generateInternalType(data);
    if (entityType === containerType) {
      const report = data as StixReport;
      const operations: Array<Operation> = event.context.patch;
      const previousPatch = event.context.reverse_patch;
      const previousData = jsonpatch.applyPatch<StixReport>(R.clone(report), previousPatch).newDocument;
      const refOperations = operations.filter((o) => o.path.startsWith('/object_refs'));
      const addedRefs: Array<StixId> = [];
      const removedRefs: Array<StixId> = [];
      // Replace operations behavior
      const replaceOperations = refOperations.filter((o) => o.op === UPDATE_OPERATION_REPLACE) as Array<ReplaceOperation<string>>;
      for (let replaceIndex = 0; replaceIndex < replaceOperations.length; replaceIndex += 1) {
        const replaceOperation = replaceOperations[replaceIndex];
        addedRefs.push(replaceOperation.value as StixId);
        // For replace we need to look into the previous data, the deleted element
        const opPath = replaceOperation.path.substring(replaceOperation.path.indexOf('/object_refs'));
        const removeObjectIndex = R.last(opPath.split('/'));
        if (removeObjectIndex) {
          const replaceObjectRefIndex = parseInt(removeObjectIndex, 10);
          const removeRefId = (previousData.object_refs ?? [])[replaceObjectRefIndex];
          removedRefs.push(removeRefId);
        }
      }
      // Add operations behavior
      const addOperations = refOperations.filter((o) => o.op === UPDATE_OPERATION_ADD) as Array<AddOperation<string>>;
      for (let addIndex = 0; addIndex < addOperations.length; addIndex += 1) {
        const addOperation = addOperations[addIndex];
        const addedValues = Array.isArray(addOperation.value) ? addOperation.value : [addOperation.value];
        addedRefs.push(...addedValues);
      }
      // Remove operations behavior
      const removeOperations = refOperations.filter((o) => o.op === UPDATE_OPERATION_REMOVE);
      for (let removeIndex = 0; removeIndex < removeOperations.length; removeIndex += 1) {
        const removeOperation = removeOperations[removeIndex];
        // For remove op we need to look into the previous data, the deleted element
        const previousObjectRefs = previousData.object_refs;
        const opPath = removeOperation.path.substring(removeOperation.path.indexOf('/object_refs'));
        const [,, index] = opPath.split('/');
        if (index) {
          const replaceObjectRefIndex = parseInt(index, 10);
          const removeRefId = previousObjectRefs[replaceObjectRefIndex];
          removedRefs.push(removeRefId);
        } else {
          const removeRefIds = previousObjectRefs ?? [];
          removedRefs.push(...removeRefIds);
        }
      }
      // Apply operations
      // For added identities
      const leftAddedRefs = addedRefs.filter(leftTypeRefFilter);
      const removedLeftRefs = removedRefs.filter(leftTypeRefFilter);
      if (leftAddedRefs.length > 0 || removedLeftRefs.length > 0) {
        const createEvents = await handleReportCreation(context, report, leftAddedRefs, removedLeftRefs);
        events.push(...createEvents);
      }
      return events;
    }
    // We don't care about the relation update
    // We have nothing to complete inside an internal meta.
    return events;
  };
  // Contract
  const clean = (element: StoreObject, deletedDependencies: Array<string>): Promise<BaseEvent> => {
    return deleteInferredRuleElement(id, element, deletedDependencies) as Promise<BaseEvent>;
  };
  const insert = async (element: StixObject): Promise<Array<BaseEvent>> => applyInsert(element);
  const update = async (element: StixObject, event: UpdateEvent): Promise<Array<BaseEvent>> => applyUpdate(element, event);
  return { ...ruleDefinition, insert, update, clean };
};

export default buildContainerRefsRule;
