import React, { FunctionComponent } from 'react';
import { usePaginationLocalStorage } from '../../../utils/hooks/useLocalStorage';
import type { Filters } from '../../../components/list_lines';
import ListLines from '../../../components/list_lines/ListLines';
import useQueryLoading from '../../../utils/hooks/useQueryLoading';
import TriggersLines, { triggersLinesQuery } from './triggers/TriggersLines';
import {
  TriggersLinesPaginationQuery,
  TriggersLinesPaginationQuery$variables,
} from './triggers/__generated__/TriggersLinesPaginationQuery.graphql';
import { TriggerLineDummy } from './triggers/TriggerLine';
import TriggerCreation from './triggers/TriggerCreation';

export const LOCAL_STORAGE_KEY_DATA_SOURCES = 'view-triggers';

const Triggers: FunctionComponent = () => {
  const { viewStorage, helpers, paginationOptions } = usePaginationLocalStorage<TriggersLinesPaginationQuery$variables>(
    LOCAL_STORAGE_KEY_DATA_SOURCES,
    {
      searchTerm: '',
      sortBy: 'name',
      orderAsc: true,
      openExports: false,
      filters: {} as Filters,
      numberOfElements: {
        number: 0,
        symbol: '',
      },
    },
  );
  const renderLines = () => {
    const {
      searchTerm,
      sortBy,
      orderAsc,
      filters,
      openExports,
      numberOfElements,
    } = viewStorage;
    const dataColumns = {
      name: {
        label: 'Name',
        width: '35%',
        isSortable: true,
      },
    };
    const queryRef = useQueryLoading<TriggersLinesPaginationQuery>(triggersLinesQuery, paginationOptions);
    return (
      <ListLines
        sortBy={sortBy}
        orderAsc={orderAsc}
        dataColumns={dataColumns}
        handleSort={helpers.handleSort}
        handleSearch={helpers.handleSearch}
        handleAddFilter={helpers.handleAddFilter}
        handleRemoveFilter={helpers.handleRemoveFilter}
        handleToggleExports={helpers.handleToggleExports}
        openExports={openExports}
        exportEntityType="Trigger"
        keyword={searchTerm}
        filters={filters}
        paginationOptions={paginationOptions}
        numberOfElements={numberOfElements}
        availableFilterKeys={[]}
      >
        {queryRef && (
          <React.Suspense
            fallback={
              <>
                {Array(20)
                  .fill(0)
                  .map((idx) => (
                    <TriggerLineDummy key={idx} dataColumns={dataColumns} />
                  ))}
              </>
            }
          >
            <TriggersLines
              queryRef={queryRef}
              paginationOptions={paginationOptions}
              dataColumns={dataColumns}
              onLabelClick={helpers.handleAddFilter}
              setNumberOfElements={helpers.handleSetNumberOfElements}
            />
          </React.Suspense>
        )}
      </ListLines>
    );
  };

  return (
    <div>
      {renderLines()}
      <TriggerCreation paginationOptions={paginationOptions} />
    </div>
  );
};

export default Triggers;
