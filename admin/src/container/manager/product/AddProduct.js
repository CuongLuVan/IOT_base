"use strict";

import React, {useState, useEffect } from 'react';
import classNames from 'classnames';
import ManagerData from '../../../actions/ManagerData.js'
import AddProductStep1 from './AddProductStep1';
import AddProductStep2 from './AddProductStep2';
import AddProductStep3 from './AddProductStep3';
import AddProductStep4 from './AddProductStep4';
import AddProductStep5 from './AddProductStep5';

  const AddProduct = () => {
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
        {stepInfo<5? <h2> { "Tạo sản phẩm  : Bước "+stepInfo+"/4"} </h2>:""}
        <br/>
        {stepInfo==1?  
            <AddProductStep1 sendTemplate={(data)=>{setProduct(data);setStepInfo(2); }} />:"" }
        {stepInfo==2?  
            <AddProductStep2 product={product} sendTemplate={(data)=>{setProductImage(data); console.log("setProductImage",product_image); setStepInfo(3); }} />:"" }
        {stepInfo==3?  
            <AddProductStep3 product={product} imageProduct={product_image} sendTemplate={()=>{setStepInfo(4); }} />:"" }
        {stepInfo==4?  
            <AddProductStep4 product={product} sendTemplate={(data)=>{ setStepInfo(5); setProduct(null); }} />:"" }
        {stepInfo==5?  
            <AddProductStep5 sendTemplate={(data)=>{ setStepInfo(1); }} />:"" }

      </div>
    );
  };
  
  export default AddProduct;
