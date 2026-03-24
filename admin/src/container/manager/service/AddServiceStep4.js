import React from 'react';
import {
    Collapse as MuiCollapse,
    Button
  } from '@material-ui/core';

const AddServiceStep4 = ({sendTemplate}) => {
    return (
        <div  className="layout-info-group">
            <h1>Tạo sản phẩm thành công </h1>
            <br/>
            <center>
                <Button variant="contained" 
                    onClick={()=>{ sendTemplate(false);}}
                    disableElevation color="primary">
                    Tạo sản phẩm khác
                </Button> 
            </center>
        </div>
    );
};
  
export default AddServiceStep4;
