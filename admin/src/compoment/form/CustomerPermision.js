import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  MenuItem,
  Select,
} from '@material-ui/core';
import ManagerData from '../../actions/ManagerData.js'
import classNames from 'classnames';


const CustomerPermision = ({ typePermision,onChange }) => {
   // const [ handleClose] = useState()
   
    var TypeSelection =[{id:1,name :"Admin"},{id:4,name :"Phó nhóm"},
                        {id:10,name :"Cộng tác viên"}];
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
                 vars.id<ManagerData.saveInfoUser.permission_id?"":
                    <MenuItem value={vars.id} key={vars.name} >
                        {vars.name}
                    </MenuItem>
            ))}
        </Select>
    );
}

export default CustomerPermision;
