import React, { useState } from 'react';
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
import {exportColumeEdit,exportColumeAdd,checkValidateValue  } from '../../config/table/ManagerToView.js';
import {addOneDataToTable} from '../../api/httpBaseUtil.js'
import DynamicForm from '../form/DynamicForm.js';
import ManagerData from '../../actions/ManagerData.js'

const SelectItem = ({ table, dataInput,handleClose }) => {
   // const [ handleClose] = useState()
   var infoTitle =exportColumeAdd(table);
    
   var newInfo = {};
   var header =[];
   for(var i=0;i<infoTitle.view.length;i++){
        newInfo[infoTitle.view[i]]="";
        var detail={};
        detail.view=infoTitle.view[i];
        detail.title=infoTitle.title[i];
        detail.html=infoTitle.html[i];
        detail.typeSelect=infoTitle.typeSelect[i];
        detail.selectTabble=infoTitle.selectTabble[i];
        detail.selectValidate=infoTitle.selectValidate[i];

        header.push(detail);
   }
   var dataDetail = {header:header,value:newInfo};
   
    const [state, setState] = useState(dataDetail);
    const onChange = () => {
        var checkValue = checkValidateValue(state.header,state.value);
        if(checkValue.validate){
            addOneDataToTable(table,state.value).then(()=>{
                Swal.fire({
                    title: 'Thêm dữ liệu thành công '
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
            ...prev,
            value: stateValue
          }));
    };
   
    
    return (
        <Modal
            title={'Thêm dữ liệu'}
            open={true}
            onClose={handleClose}
            className="enterprise-form1"
        >
            <Divider />
            {state.header.map((vars) =>
                <DynamicForm
                    value = {vars}
                    valueDetail ={state.value[vars.view]}
                    selectTabble={vars.selectTabble}
                    objectData ={state.value}
                    onChange={(event) => {
                        onchangeValue(event, vars.view);
                      }}
                />
            )}
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
                    className={'margin-right-account1'}
                    onClick={onChange}
                >
                    Xác nhận
                </Button>
            </div>
        </Modal>
    );
}


export default SelectItem;
