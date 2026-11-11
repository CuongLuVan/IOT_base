import { useState } from 'react';
import Swal from 'sweetalert2';
import ManagerData from '../../actions/ManagerData.js';

// Form fields of a table dialogue (exportColumeAdd(table)), with the initial values.
// initialValueOf(view) gives the start value of each field ("" for add, the row value for edit).
export function buildDialogueHeader(infoTitle, initialValueOf) {
    const header = [];
    const value = {};
    infoTitle.view.forEach((view, i) => {
        value[view] = initialValueOf(view);
        header.push({
            view,
            title: infoTitle.title[i],
            html: infoTitle.html[i],
            typeSelect: infoTitle.typeSelect[i],
            selectTabble: infoTitle.selectTabble[i],
            selectValidate: infoTitle.selectValidate[i],
        });
    });
    return { header, value };
}

// "<headerName> :<value>" of the row's main field, or "".
export function mainInfoText(infoTitle, dataInput) {
    if (!infoTitle.mainInfo || !dataInput) return "";
    return infoTitle.mainInfo.headerName + " :" + dataInput[infoTitle.mainInfo.field];
}

// Sends request() once at a time: shows successTitle, reloads the table cache
// (other pages read it) and closes. On error (already shown by httpBaseUtil) the
// dialogue stays open and the button is enabled again.
export function useDialogueSubmit(table, handleClose) {
    const [submitting, setSubmitting] = useState(false);
    const submit = (request, successTitle) => {
        if (submitting) return;
        setSubmitting(true);
        request()
            .then(() => {
                Swal.fire({ title: successTitle });
                return ManagerData.getLstDataPromise(table).then(() => handleClose());
            })
            .catch((error) => {
                console.error('Dialogue request failed', table, error);
                setSubmitting(false);
            });
    };
    return [submitting, submit];
}
