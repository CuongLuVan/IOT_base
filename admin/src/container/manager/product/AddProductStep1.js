import React, {useState,useEffect } from 'react';
import classNames from 'classnames';
import {
  Collapse as MuiCollapse,
  Input,
  Button,
  MenuItem,
  Select,
} from '@material-ui/core';
import AcessButton from '../../../compoment/button/AcessButton.js';
import UploadImage from '../../../compoment/form/UploadImage.js';
import {addOneDataToTable} from '../../../api/httpBaseUtil.js';
import ManagerData from '../../../actions/ManagerData.js';
  
const AddProductStep1 = ({sendTemplate}) => {
    const [select, setSelect] = useState([]);
    const [company_id, set_company_id] = useState(0);
    const [product_group_id, set_product_group_id] = useState(0);
    const [name, set_name] = useState("");
    const [detail, set_detail] = useState("");
    const [image, set_image] = useState("");
    const [product_group, set_product_group] = useState([]);

    useEffect(() => {
        ManagerData.getLstDataPromise('company').then(() => {
            setSelect(ManagerData.getTable('company'));
        });
        ManagerData.getLstDataPromise('product_group').then(() => {
            set_product_group(ManagerData.getTable('product_group'));
        });

    }, []);
    const ApplyDataChange=()=>{
      var data= {product_id:0,product_group_id:product_group_id, company_id:company_id,name:name,detail:detail,image:image ,store:0};
      addOneDataToTable("product",data).then((response) => {
            data["product_id"]=response.data.result.insertId;
            sendTemplate(data);
      }).catch((error) => {reject(error);});  
    }

    return ( 
        <div >
              Tạo sản phẩm
             <div className={'title-dm-message'}>
              <UploadImage  urlImage={image}   uploadfileDataLink= {(url)=> {set_image(url)}} />
                <div  style={{ marginLeft: 40}}>
                    <label className="margin-label-right">Nhóm sản phẩm </label>
                    <Select
                        labelId="role"
                        id="role"
                        className="enterprise-form1 permison-box"
                        label={"Công ty"}
                        value={product_group_id}
                        onChange={(event) => {set_product_group_id(event.target.value); }}
                      >
                        {product_group.map((vars) => (
                          <MenuItem value={vars.product_group_id} >
                                    {vars.product_group_content}
                            </MenuItem>
                        ))}
                    </Select>
                    <br/>
                    <label className="margin-label-right">Công ty </label>
                    <Select
                        labelId="role"
                        id="role"
                        className="enterprise-form1 permison-box"
                        label={"Công ty"}
                        value={company_id}
                        onChange={(event) => {set_company_id(event.target.value); }}
                      >
                        {select.map((vars) => (
                          <MenuItem value={vars.company_id} >
                                    {vars.companyname}
                            </MenuItem>
                        ))}
                    </Select>
                    <br/>
                    <label className="margin-label-right">Tên Sản phẩm </label>
                    <Input name="name" value={name} onChange={(e)=>set_name(e.target.value)} />
                    <br/>
                    <label className="margin-label-right"> Chi tiết</label>
                    <Input name="detail" value={detail} onChange={(e)=>set_detail(e.target.value)} /> 
                </div>
                <div className={'group-button-dm-message'}>
                  <AcessButton
                    name ={" sản phẩm"}
                    id={0}
                    onClick={()=>ApplyDataChange()}
                  />
                </div>
            </div>
        </div>
    );
};
  
export default AddProductStep1;
