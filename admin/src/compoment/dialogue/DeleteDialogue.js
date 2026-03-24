import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  withStyles,
} from '@material-ui/core';
import Modal from '../modol/Modal.js';
import Swal from 'sweetalert2';
import {exportColumeEdit } from '../../config/table/ManagerToView.js'
import {deleteOneDataToTable} from '../../api/httpBaseUtil.js'
import ManagerData from '../../actions/ManagerData.js'

const DeleteDialogue = ({ table, dataInput,handleClose }) => {
   // const [ handleClose] = useState()
    
    var infoTitle =exportColumeEdit(table);
    var dataInfo ="";
    var newInfo = {};
    if(!!infoTitle.mainInfo) {
        dataInfo = infoTitle.mainInfo.headerName + " :"+ dataInput[infoTitle.mainInfo.field];
    }
    if(!!infoTitle.mainID) {
        newInfo[infoTitle.mainID]=dataInput[infoTitle.mainID];
    }
    var dataDetail = {value:newInfo};
    const [state, setState] = useState(dataDetail);
    console.log(table,dataInfo);
    console.log(dataInput)
    const onChange = () => {
        deleteOneDataToTable(table,state.value).then(()=>{
            Swal.fire({
                title: 'Xóa dữ liệu thành công '
            });
            ManagerData.getLstDataPromise(table).then(()=>{
                handleClose();
            });
            
        });

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
                    {`Xóa `+dataInfo +`?`}
                </Typography>
            </div>
            <Divider />
            <div className={'action-account1'}>
                <Button
                    color="primary"
                    variant="outlined"
                    className={'margin-right-account'}
                    onClick={handleClose}
                >
                    Hủy
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    className={'margin-right-account1 button-info-layout'}
                    onClick={onChange}
                >
                    Xác nhận
                </Button>
            </div>
        </Modal>
    );
}

// export default AddTextForm;
export default DeleteDialogue;
