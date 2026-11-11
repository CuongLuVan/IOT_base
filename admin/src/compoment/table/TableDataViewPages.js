import React from 'react';
import TableDataView from './TableDataView.js';
import { MODE_PAPER_LIBRARRY } from '../../config/config.js';

// Page contents: 10 rows per page, only main pages in the default language.
function getPageFilter() {
    const dataFind = {is_main_pages_id:[-1,0],type_langue:0};
    if (MODE_PAPER_LIBRARRY) dataFind.detail_content_id = 0;
    return dataFind;
}

const TableDataViewPages = (props) => (
    <TableDataView {...props} pageSize={10} getFilter={getPageFilter} />
);

export default TableDataViewPages;
