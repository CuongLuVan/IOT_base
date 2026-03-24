import React, {useState,useEffect } from 'react';
import classNames from 'classnames';
import {
  Collapse as MuiCollapse,
  Input,
  Button,
  MenuItem,
  Select,
} from '@material-ui/core';
import PublishIcon from '@material-ui/icons/Publish';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import RemoveCircleOutlineIcon from '@material-ui/icons/RemoveCircleOutline';
import AcessButton from '../../../compoment/button/AcessButton.js';
import UploadImage from '../../../compoment/form/UploadImage.js';
import Collapse from '../../../compoment/modol/Collapse.js';
import {addOneDataToTable,updateOneDataInfoTable} from '../../../api/httpBaseUtil.js';
import ManagerData from '../../../actions/ManagerData.js';
import RegisterProductPage from './RegisterProductPage';

const AddProductStep4 = ({product,sendTemplate}) => {
    return (
        <div  className="layout-info-group">
                <RegisterProductPage 
                    handerClose={()=>{ sendTemplate(false);}}
                    is_update={false}
                    set_up_product={product.product_id}
                    data={null}
                    content={""}
                />
        </div>
    );
};
  
export default AddProductStep4;
