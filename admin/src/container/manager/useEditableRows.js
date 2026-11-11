import { useState } from 'react';
import { addOneDataToTable, deleteOneDataToTable } from '../../api/httpBaseUtil.js';

/**
 * Editable rows of a wizard step (product images, product store, services).
 *   table:   table name for addOneDataToTable / deleteOneDataToTable
 *   idField: row key; a new row gets a local id (max + 1) until it is saved,
 *            then the insertId from the server
 *   makeRow: (localId) => new row; "id" 0 means "not saved yet"
 * Returns { rows, edit(index, name, value), add(), remove(index), save(index) }.
 * Errors are shown by httpBaseUtil; the rows are left unchanged.
 */
export default function useEditableRows(table, idField, makeRow) {
    const [rows, setRows] = useState([]);

    const updateRow = (index, changes) => {
        setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...changes } : row)));
    };

    const edit = (index, name, value) => updateRow(index, { [name]: value });

    const add = () => {
        setRows((prev) => {
            const maxId = prev.reduce((max, row) => Math.max(max, Number(row[idField]) || 0), 0);
            return prev.concat(makeRow(maxId + 1));
        });
    };

    const removeLocal = (key) => setRows((prev) => prev.filter((row) => row[idField] !== key));

    // A row that was never saved (id 0) only exists here.
    const remove = (index) => {
        const row = rows[index];
        if (!row) return;
        if (!row.id) {
            removeLocal(row[idField]);
            return;
        }
        deleteOneDataToTable(table, row)
            .then(() => removeLocal(row[idField]))
            .catch(() => {});
    };

    const save = (index) => {
        const row = rows[index];
        if (!row) return;
        const key = row[idField];
        addOneDataToTable(table, row)
            .then((response) => {
                const insertId = response.data.result.insertId;
                // By key: the row may have moved if another row was removed meanwhile.
                setRows((prev) => prev.map((r) => (r[idField] === key ? { ...r, [idField]: insertId, id: insertId } : r)));
            })
            .catch(() => {});
    };

    return { rows, edit, add, remove, save };
}
