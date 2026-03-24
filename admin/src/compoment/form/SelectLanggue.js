import React, { useState } from 'react';
import {
  MenuItem,
  Select,
} from '@material-ui/core';
import classNames from 'classnames';


const SelectLanggue = ({ typePermision,onChange }) => {
   // const [ handleClose] = useState()
    var TypeSelection =[{id:0,name :"Tiếng Việt"},{id:2,name :"English"}];
    
    return (
        <Select
            labelId="role"
            id="role"
            className="enterprise-form1 permison-box"
            label={"Ngôn ngữ"}
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

export default SelectLanggue;
