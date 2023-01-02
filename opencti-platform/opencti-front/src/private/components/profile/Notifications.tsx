import React, { FunctionComponent } from 'react';
import { usePaginationLocalStorage } from '../../../utils/hooks/useLocalStorage';
import type { Filters } from '../../../components/list_lines';
import ListLines from '../../../components/list_lines/ListLines';
import useQueryLoading from '../../../utils/hooks/useQueryLoading';
import NotificationsLines, { notificationsLinesQuery } from './notifications/NotificationsLines';
import {
  NotificationsLinesPaginationQuery, NotificationsLinesPaginationQuery$variables,
} from './notifications/__generated__/NotificationsLinesPaginationQuery.graphql';
import { NotificationLineDummy } from './notifications/NotificationLine';

export const LOCAL_STORAGE_KEY_DATA_SOURCES = 'view-alerts';

const Notifications: FunctionComponent = () => {
  const { viewStorage, helpers, paginationOptions } = usePaginationLocalStorage<NotificationsLinesPaginationQuery$variables>(
    LOCAL_STORAGE_KEY_DATA_SOURCES,
    {
      searchTerm: '',
      sortBy: 'created',
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
    const queryRef = useQueryLoading<NotificationsLinesPaginationQuery>(notificationsLinesQuery, paginationOptions);
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
                    <NotificationLineDummy key={idx} dataColumns={dataColumns} />
                  ))}
              </>
            }
          >
            <NotificationsLines
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
    </div>
  );
};

export default Notifications;
