import React, { useState } from 'react';
import { Divider, Typography } from '@material-ui/core';
import Modal from '../modol/Modal.js';
import Swal from 'sweetalert2';
import { exportColumeEdit, exportColumeAdd, checkValidateValue, getValueDetail } from '../../config/table/ManagerToView.js';
import { updateOneDataInfoTable } from '../../api/httpBaseUtil.js';
import DynamicLayout from './DynamicLayout.js';
import ButtonOkCancelLayout from './ButtonOkCancelLayout.js';
import { buildDialogueHeader, mainInfoText, useDialogueSubmit } from './dialogueUtil.js';

// Fields of the row plus its key (mainID), which getValueDetail sends with the update.
function initialState(table, dataInput) {
    const detail = buildDialogueHeader(exportColumeAdd(table), (view) => dataInput[view]);
    const infoTitleInfo = exportColumeEdit(table);
    if (infoTitleInfo.mainID) {
        detail.value[infoTitleInfo.mainID] = dataInput[infoTitleInfo.mainID];
    }
    return detail;
}

const EditNomalDialogue = ({ table, dataInput, handleClose }) => {
    const [state, setState] = useState(() => initialState(table, dataInput));
    const [submitting, submit] = useDialogueSubmit(table, handleClose);
    const dataInfo = mainInfoText(exportColumeEdit(table), dataInput);

    const onChange = () => {
        const checkValue = checkValidateValue(state.header, state.value);
        if (!checkValue.validate) {
            Swal.fire({ title: checkValue.err });
            return;
        }
        const dataEdit = getValueDetail(state.header, state.value);
        submit(() => updateOneDataInfoTable(table, dataEdit), 'Sửa dữ liệu thành công ');
    };
    const onchangeValue = (value, type) => {
        setState((prev) => ({ ...prev, value: { ...prev.value, [type]: value } }));
    };

    return (
        <Modal
            title={'Sửa dữ liệu'}
            open={true}
            onClose={handleClose}
            className="enterprise-form1"
        >
            <div>
                <Typography variant="h6">
                    {`Sửa ` + dataInfo}
                </Typography>
            </div>
            <Divider />
            <DynamicLayout state={state} data={state.value} onchangeValue={onchangeValue} />
            <Divider />
            <ButtonOkCancelLayout handleClose={handleClose} onChange={onChange} disabled={submitting} />
        </Modal>
    );
}

export default EditNomalDialogue;
