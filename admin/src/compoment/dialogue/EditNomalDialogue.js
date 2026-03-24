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
import {exportColumeEdit,exportColumeAdd ,checkValidateValue ,getValueDetail} from '../../config/table/ManagerToView.js';
import DynamicForm from '../form/DynamicForm.js';
import {updateOneDataInfoTable} from '../../api/httpBaseUtil.js'
import ManagerData from '../../actions/ManagerData.js'

const EditNomalDialogue = ({ table, dataInput,handleClose }) => {
    var infoTitle =exportColumeAdd(table);
    var newInfo = {};
    var header =[];
    for(var i=0;i<infoTitle.view.length;i++){
        newInfo[infoTitle.view[i]]=dataInput[infoTitle.view[i]];
        var detail={};
        detail.view=infoTitle.view[i];
        detail.title=infoTitle.title[i];
        detail.html=infoTitle.html[i];
        detail.typeSelect=infoTitle.typeSelect[i];
        detail.selectTabble=infoTitle.selectTabble[i];
        detail.selectValidate=infoTitle.selectValidate[i];
        header.push(detail);
    }
   
    var infoTitleInfo =exportColumeEdit(table);
    var dataInfo ="";
    if(!!infoTitleInfo.mainInfo) {
        dataInfo = infoTitleInfo.mainInfo.headerName + " :"+ dataInput[infoTitleInfo.mainInfo.field];
    }
    if(!!infoTitleInfo.mainID) {
        newInfo[infoTitleInfo.mainID]=dataInput[infoTitleInfo.mainID];
    }
    var dataDetail = {header:header,value:newInfo};
     const [state, setState] = useState(dataDetail);
     const onChange = () => {
        var checkValue = checkValidateValue(state.header,state.value);
        if(checkValue.validate){
            var dataEdit =getValueDetail(state.header,state.value);
            updateOneDataInfoTable(table,dataEdit).then(()=>{
                Swal.fire({
                    title: 'Sửa dữ liệu thành công '
                });
                ManagerData.getLstDataPromise(table).then(()=>{
                   handleClose();
               });
            });
        }
        else {
            Swal.fire({
                title: checkValue.err
            });
        }
        
         
     };
     const onchangeValue=(value,type)=>{
         var stateValue = state.value;
         console.log(type,value,stateValue);
         stateValue[type] = value.target.value;
         setState((prev) => ({
             ...prev
           }));
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
                    {`Sửa `+dataInfo }
                </Typography>
            </div>
            <Divider />
            <div  className='test-main-info'>
                {state.header.map((vars) =>
                    <div className='text-info-layout'>
                        <DynamicForm
                            value = {vars}
                            valueDetail ={state.value[vars.view]}
                            selectTabble={vars.selectTabble}
                            objectData ={state.value}
                            onChange={(event) => {
                                onchangeValue(event, vars.view);
                            }}
                        />
                    </div>
                )}
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
export default EditNomalDialogue;
