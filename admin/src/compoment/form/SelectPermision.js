import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  MenuItem,
  Select,
} from '@material-ui/core';
import ManagerData from '../../actions/ManagerData.js'
import classNames from 'classnames';


const SelectPermision = ({ typePermision,onChange }) => {
   // const [ handleClose] = useState()
   
    var TypeSelection =[{id:1,name :"Quản trị cấp cao"},{id:2,name :"Quản trị trang"},
                        {id:3,name :"Trợ lý trang"},{id:4,name :"Kế toán"},
                        {id:10,name :"Cộng tác viên"},{id:11,name :"Ghi danh"}];
    console.log("ManagerData.saveInfoUser.permission_id",ManagerData.saveInfoUser.permission_id);
    return (
        <Select
            labelId="role"
            id="role"
            className="enterprise-form1 permison-box"
            label={"Cấp quyền"}
            value={typePermision}
            onChange={(event) => {
                onChange(event);
            }}
            label="Quyền"
            >
            {TypeSelection.map((vars) => (
                 vars.id<=ManagerData.saveInfoUser.permission_id?"":
                    <MenuItem value={vars.id} key={vars.name} >
                        {vars.name}
                    </MenuItem>
            ))}
        </Select>
    );
}

export default SelectPermision;
