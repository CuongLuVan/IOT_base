"use strict";

import React, {useState, useEffect } from 'react';
import classNames from 'classnames';
import ManagerData from '../../../actions/ManagerData.js'
import AddServiceStep1 from './AddServiceStep1';
import AddServiceStep2 from './AddServiceStep2';
import AddServiceStep3 from './AddServiceStep3';
import AddServiceStep4 from './AddServiceStep4';

const AddService = () => {
    const [product, setProduct] = useState(null);
    const [product_image, setProductImage] = useState([]);
    const [stepInfo, setStepInfo] = useState(1);

    useEffect(() => {
        ManagerData.getLstDataPromise('company').then(()=>{
        });
    }, []);

    return (
      <div className={'root-dm-message'}>
        <br/>
        {stepInfo<4? <h2> { "Tạo sản phẩm  : Bước "+stepInfo+"/4"} </h2>:""}
        <br/>
        {stepInfo==1?  
            <AddServiceStep1 sendTemplate={(data)=>{setProduct(data);setStepInfo(2); }} />:"" }
        {stepInfo==2?  
            <AddServiceStep2 product={product} isNew={true} content_html={""} sendTemplate={()=>{ setStepInfo(3); }} />:"" }
        {stepInfo==3?  
            <AddServiceStep3 product={product}  sendTemplate={()=>{setStepInfo(4); }} />:"" }
        {stepInfo==4?  
            <AddServiceStep4 sendTemplate={(data)=>{ setStepInfo(1); }} />:"" }

      </div>
    );
};
  
export default AddService;
