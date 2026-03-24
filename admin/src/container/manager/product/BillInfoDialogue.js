import React, { useState,useEffect } from 'react';
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
import Modal from '../../../compoment/modol/Modal.js';
import Swal from 'sweetalert2';
import {exportColumeEdit,exportColumeAdd,checkValidateValue ,getValueDetail } from '../../../config/table/ManagerToView.js';
import {updateOneDataInfoTable,customerInCompany} from '../../../api/httpBaseUtil.js'
import ManagerData from '../../../actions/ManagerData.js';
import CustomerSelectBill from '../../../compoment/form/CustomerSelectBill.js';

import LazyLoad from 'react-lazyload';



const BillInfoDialogue = ({ dataInput,handleClose }) => {
    const [dataBill, setDataBill] = useState({});
    const [dataInfo, setDataInfo] = useState([]);
    const [statusBill, setStatusBill] = useState(0);
    const [statusUserConfirm, setUserConfirm] = useState(0);
    const [lstManager, setLstManager] = useState([]);
    useEffect(()  =>  {
            console.log("dataInput  ",dataInput);
            var  fieldToFind = {buyproduct_id:dataInput.buyproduct_id};
            setDataBill(dataInput);
            setStatusBill(dataInput.status);
            setUserConfirm(dataInput.selled_id);
            ManagerData.getLstDataPromise("product_buy_detail",fieldToFind)
            .then((data)=>{
                setDataInfo(data);
                var lstData =[];
                data.forEach(element => {
                    lstData.push(element.image_id);
                });
                customerInCompany({data:lstData}).then((res)=>{
                    setLstManager(res.data.result);
                });
            });
           

    }, [dataInput]);

    const onchangeCustomer=(value)=>{
        var infoBill = dataBill;
        infoBill.selled_id = value.target.value;
        setUserConfirm(value.target.value);
        setDataBill(infoBill)
    };
    const onchangeStatus=(value)=>{
        var infoBill = dataBill;
        infoBill.status = value.target.value;
        setStatusBill(value.target.value);
        setDataBill(infoBill);
    };

    const onSaveChange=(value)=>{
        updateOneDataInfoTable("product_buy",dataBill).then(()=>{
            Swal.fire({
                title: 'Sửa dữ liệu thành công '
            });
            handleClose();
            
        });
    };
    

    return (
        <Modal
            title={'Chi tiết đơn hàng'}
            open={true}
            onClose={handleClose}
            className="enterprise-form1"
        >
            <Divider />
            <div className='div-bill-title-row'>
                <div className='div-bill-title-column'> 
                    <div> Người gửi : {dataBill.name} </div>
                    <div> Giá tiên : {dataBill.Total}   VND</div>
                    <div> Ngày đặt hàng : {dataBill.created_at} </div>
                    <div> Địa chỉ : {dataBill.address} </div>
                    
                </div >
                <div className='div-bill-title-column' >  
                    <CustomerSelectBill
                            typePermision={statusBill}
                            onChange={(event) => {
                                onchangeStatus(event);
                            }}/> <br/>
                    <Select
                        labelId="role"
                        id="role"
                        className="enterprise-form1 permison-box"
                        label={"Bàn giao"}
                        value={statusUserConfirm}
                        onChange={(event) => {
                            onchangeCustomer(event);
                        }}
                        >
                        {lstManager&&lstManager.map((vars) => (
                                <MenuItem value={vars.customer_id} key={vars.name} >
                                    {vars.name}
                                </MenuItem>
                        ))}
                    </Select>
                    <br/>
                </div>
            </div>
          

            <Divider />
            <div  className='div-bill-body-detail'>
                <div className="div-bill-message"> 
                            <label className="text-bill-message"> Số thứ tự </label>
                            <label className="text-bill-message"  width="90px" height="90px" > hình ảnh</label>
                            <label className="text-bill-message"> Tên sản phẩm</label>
                            <label className="text-bill-message"> Số lượng </label>
                            <label className="text-bill-message"> Số tiền </label>
                </div>
                {dataInfo.map((vars,index)=>
                        <div className="div-bill-message"> 
                            <label className="text-bill-message"> {index} </label>
                            <img  src={vars.image_info_detail} width="90px" height="90px" />
                            <label className="text-bill-message"> {vars.name_image_detail} </label>
                            <label className="text-bill-message"> {vars.quantity} </label>
                            <label className="text-bill-message"> {vars.cost_detail} </label>
                            <br/>
                        </div>

                )}
                {dataInfo.length}
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
                    onClick={onSaveChange}
                >
                    Xác nhận
                </Button>
            </div>
        </Modal>
    );
}

// export default AddTextForm;
export default BillInfoDialogue;
