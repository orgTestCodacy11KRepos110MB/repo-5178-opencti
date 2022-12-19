import { describe, expect, it } from 'vitest';
import { v4 as uuid } from 'uuid';
import { hashMergeValidation } from '../../../src/database/middleware';
import { RELATION_OBJECT } from '../../../src/schema/stixMetaRelationship';
import { generatedUuidShardingIndex } from '../../../src/schema/general';

describe.concurrent('middleware', () => {
  it('should hashes allowed to merge', () => {
    const instanceOne = { hashes: { MD5: 'md5', 'SHA-1': 'SHA' } };
    const instanceTwo = { hashes: { MD5: 'md5' } };
    hashMergeValidation([instanceOne, instanceTwo]);
  });

  it('should hashes have collisions', () => {
    const instanceOne = { hashes: { MD5: 'md5instanceOne' } };
    const instanceTwo = { hashes: { MD5: 'md5instanceTwo' } };
    const merge = () => hashMergeValidation([instanceOne, instanceTwo]);
    expect(merge).toThrow();
  });

  it('should hashes have complex collisions', () => {
    const instanceOne = { hashes: { MD5: 'md5', 'SHA-1': 'SHA' } };
    const instanceTwo = { hashes: { MD5: 'md5', 'SHA-1': 'SHA2' } };
    const merge = () => hashMergeValidation([instanceOne, instanceTwo]);
    expect(merge).toThrow();
  });

  it('should uuids correctly sharded', () => {
    const result = {};
    for (let index = 0; index < 500; index += 1) {
      const data = uuid();
      const shard = generatedUuidShardingIndex(RELATION_OBJECT, data);
      if (result[shard]) {
        result[shard] = [...result[shard], data];
      } else {
        result[shard] = [data];
      }
    }
    expect(Object.keys(result).length).toBe(32);
  });
});
