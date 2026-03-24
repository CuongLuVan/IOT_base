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
import SelectPages from '../form/SelectPages.js';

  
const InfoService = ({info,select,changeData,sendTemplate}) => {
    const [product, setProduct] = useState({service_group_id:0,company_id:0,title:"",content:"",image:"" ,page_service_id:0,titleAb:""});
    const [productPages, setProductPages] = useState(false);
    useEffect(() => {
      setProduct(info);
    }, [info]);

    

    const onChange=(name,value)=>{
      var data= product;
      data[name]=value;
      setProduct(data);
      changeData(data);
    }

    const onChangeAdvertisement=(value,title)=>{
      setProduct((prev) => ({ ...prev, page_service_id: value,titleAb:title })); 
      changeData(product);
    }



    return (
        <div className={'title-dm-message'}>
            {productPages?<SelectPages id={product.page_service_id} 
                                onChange={(value,title)=>{onChangeAdvertisement(value,title)}}
                                handleClose={()=>{setProductPages(false);}} />:""}
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
                 chọn bài báo
                  <Button variant="contained" 
                      onClick={()=>{setProductPages(!productPages);}}
                      disableElevation color="primary">
                      {"chọn bài báo " +product.titleAb}
                  </Button> 
                <br/>
                Tên Dịch vụ
                <Input name="title" value={product.title} onChange={(e)=>onChange("title",e.target.value)} />
                chi tiết
                <Input name="content" value={product.content} onChange={(e)=>onChange("content",e.target.value)} /> 
            
            </div>
            <div className={'group-button-dm-message'}>
              <AcessButton
                name ={" Dịch vụ"}
                onClick={sendTemplate}
                id={product.service_group_id}
              />
            </div>
        </div>
    );
};
  
export default InfoService;
