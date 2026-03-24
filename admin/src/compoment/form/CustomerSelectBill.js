import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  MenuItem,
  Select,
} from '@material-ui/core';
import ManagerData from '../../actions/ManagerData.js'
import classNames from 'classnames';


const CustomerSelectBill = ({ typePermision,onChange }) => {
   // const [ handleClose] = useState()
   
    var TypeSelection =[{id:0,name :"Đơn hàng đang đợi"},{id:10,name :"Chấp Thuận đơn hàng"},
                        {id:20,name :"Chuyển cho cộng tác viên"},{id:30,name :"Kết thúc đơn hàng"}
                        ,{id:40,name :"Hủy đơn hàng "},{id:50,name :"Điều tra đơn hàng"}];
    return (
        <Select
            labelId="role"
            id="role"
            className="enterprise-form1 permison-box"
            label={"Trạng thái đơn hàng"}
            value={typePermision}
            onChange={(event) => {
                onChange(event);
            }}
            >
            {TypeSelection.map((vars) => (
                    <MenuItem value={vars.id} key={vars.name} >
                        {vars.name}
                    </MenuItem>
            ))}
        </Select>
    );
}

export default CustomerSelectBill;
