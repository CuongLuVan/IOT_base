import React, { useState } from 'react';
import { Divider } from '@material-ui/core';
import Modal from '../modol/Modal.js';
import Swal from 'sweetalert2';
import { exportColumeAdd, checkValidateValue, getValueDetail } from '../../config/table/ManagerToView.js';
import { addOneDataToTable } from '../../api/httpBaseUtil.js';
import DynamicLayout from './DynamicLayout.js';
import ButtonOkCancelLayout from './ButtonOkCancelLayout.js';
import { buildDialogueHeader, useDialogueSubmit } from './dialogueUtil.js';

const AddNomalDialogue = ({ table, handleClose }) => {
    const [state, setState] = useState(() => buildDialogueHeader(exportColumeAdd(table), () => ""));
    const [submitting, submit] = useDialogueSubmit(table, handleClose);

    const onChange = () => {
        const checkValue = checkValidateValue(state.header, state.value);
        if (!checkValue.validate) {
            Swal.fire({ title: checkValue.err });
            return;
        }
        const dataAdd = getValueDetail(state.header, state.value);
        submit(() => addOneDataToTable(table, dataAdd), 'Thêm dữ liệu thành công ');
    };
    const onchangeValue = (value, type) => {
        setState((prev) => ({ ...prev, value: { ...prev.value, [type]: value } }));
    };

    return (
        <Modal
            title={'Thêm dữ liệu'}
            open={true}
            onClose={handleClose}
            className="enterprise-form1"
        >
            <Divider />
            <DynamicLayout state={state} data={state.value} onchangeValue={onchangeValue} />
            <Divider />
            <ButtonOkCancelLayout handleClose={handleClose} onChange={onChange} disabled={submitting} />
        </Modal>
    );
}

export default AddNomalDialogue;
