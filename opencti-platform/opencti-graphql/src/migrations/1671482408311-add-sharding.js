import { logApp } from '../config/conf';
import { elUpdateByQueryForMigration } from '../database/engine';
import { READ_DATA_INDICES } from '../database/utils';
import { SHARDED_TYPES } from '../schema/general';

export const up = async (next) => {
  logApp.info('[MIGRATION] Starting the migration to shard data');
  for (let index = 0; index < SHARDED_TYPES.length; index += 1) {
    const shardedType = SHARDED_TYPES[index];
    await elUpdateByQueryForMigration(`[MIGRATION] Sharding ${shardedType}`, READ_DATA_INDICES, {
      script: {
        source: `
        def base = [];
        for (item in ctx._source['rel_${shardedType}.internal_id']) {
          def shard = (int) Math.abs(item.replace('-', '').sha256().hashCode()) % 32;
          if (shard == 0) {
            base.add(item);
          } else {
            def shardAttr = 'rel_${shardedType}.internal_id_' + shard;
            if (ctx._source[shardAttr] == null) {
              ctx._source[shardAttr] = [item]
            } else {
              ctx._source[shardAttr].add(item)
            }
          }
        }
        ctx._source['rel_${shardedType}.internal_id'] = base;
        `
      },
      query: {
        bool: {
          must: [
            {
              exists: {
                field: `rel_${shardedType}.internal_id`
              }
            }
          ]
        }
      }
    });
  }
  logApp.info('[MIGRATION] End sharding data');
  next();
};

export const down = async (next) => {
  next();
};
