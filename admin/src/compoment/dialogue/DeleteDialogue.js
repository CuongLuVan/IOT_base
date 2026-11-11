import React from 'react';
import { Divider, Typography } from '@material-ui/core';
import Modal from '../modol/Modal.js';
import { exportColumeEdit } from '../../config/table/ManagerToView.js';
import { deleteOneDataToTable } from '../../api/httpBaseUtil.js';
import ButtonOkCancelLayout from './ButtonOkCancelLayout.js';
import { mainInfoText, useDialogueSubmit } from './dialogueUtil.js';

const DeleteDialogue = ({ table, dataInput, handleClose }) => {
    const infoTitle = exportColumeEdit(table);
    const dataInfo = mainInfoText(infoTitle, dataInput);
    const [submitting, submit] = useDialogueSubmit(table, handleClose);

    // Only the row key (mainID) is sent.
    const onChange = () => {
        const key = {};
        if (infoTitle.mainID) key[infoTitle.mainID] = dataInput[infoTitle.mainID];
        submit(() => deleteOneDataToTable(table, key), 'Xóa dữ liệu thành công ');
    };

    return (
        <Modal
            title={'Xóa dữ liệu'}
            open={true}
            onClose={handleClose}
            className="enterprise-form1"
        >
            <div>
                <Typography variant="h6">
                    {`Xóa ` + dataInfo + `?`}
                </Typography>
            </div>
            <Divider />
            <ButtonOkCancelLayout handleClose={handleClose} onChange={onChange} disabled={submitting} />
        </Modal>
    );
}

export default DeleteDialogue;
