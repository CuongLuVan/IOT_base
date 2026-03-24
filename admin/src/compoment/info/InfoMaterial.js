import React, {useState,useEffect } from 'react';
import classNames from 'classnames';
import {
  Collapse as MuiCollapse,
  Input,
  Button,
  MenuItem,
  Select,
} from '@material-ui/core';
import AcessButton from '../button/AcessButton.js';
import UploadImage from '../form/UploadImage.js';

  
const InfoMaterial = ({info,select,changeData,sendTemplate}) => {
    const [product, setProduct] = useState({product_id:0,company_id:0,name:"",detail:"",image:"" ,store:0});
    useEffect(() => {
      setProduct(info);
    }, [info]);

    const onChange=(name,value)=>{
      var data= product;
      data[name]=value;
      setProduct(data);
      changeData(data);
    }

    return (
        <div className={'title-dm-message'}>
            <UploadImage  urlImage={product.image}   uploadfileDataLink= {(url)=> {onChange("image",url)}} />
            <div  style={{ marginLeft: 40}}>
                Tên Công ty :
                <Select
                    labelId="role"
                    id="role"
                    className="enterprise-form1 permison-box"
                    label={"Công ty"}
                    value={product.company_id}
                    onChange={(event) => {
                      onChange("company_id",event.target.value);
                    }}
                    label="Công ty"
                  >
                    {!!!select?"":select.map((vars) => (
                      <MenuItem value={vars.company_id} key={vars.companyname} >
                                {vars.companyname}
                            </MenuItem>
                    ))}
                </Select>
                <br/>
                Tên Sản phẩm
                <Input name="name" value={product.name} onChange={(e)=>onChange("name",e.target.value)} />
                chi tiết
                <Input name="detail" value={product.detail} onChange={(e)=>onChange("detail",e.target.value)} /> 
            
            </div>
            <div className={'group-button-dm-message'}>
              <AcessButton
                name ={" sản phẩm"}
                onClick={sendTemplate}
                id={product.product_id}
              />
            </div>
        </div>
    );
};
  
export default InfoMaterial;
