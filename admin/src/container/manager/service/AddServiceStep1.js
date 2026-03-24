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
  
const AddServiceStep1 = ({sendTemplate}) => {
    const [select, setSelect] = useState([]);
    const [company_id, set_company_id] = useState(0);
    const [content, set_content] = useState("");
    const [image, set_image] = useState("");
    const [title, set_title] = useState("");
    useEffect(() => {
        ManagerData.getLstDataPromise('company').then(() => {
            setSelect(ManagerData.getTable('company'));
        });
    }, []);
    const ApplyDataChange=()=>{
      var data= {service_group_id:0,image:image,title:title ,content:content,company_id:company_id};
      addOneDataToTable("service_group",data).then((response) => {
            data["service_group_id"]=response.data.result.insertId;
            sendTemplate(data);
      }).catch((error) => {reject(error);});  
    }

    return ( 
        <div >
              Tạo sản phẩm
             <div className={'title-dm-message'}>
                <UploadImage  urlImage={image}   uploadfileDataLink= {(url)=> {set_image(url)}} />
                <div  style={{ marginLeft: 40}}>
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
                    <Input name="title" value={title} onChange={(e)=>set_title(e.target.value)} />
                    <br/>
                    <label className="margin-label-right"> Chi tiết</label>
                    <Input name="content" value={content} onChange={(e)=>set_content(e.target.value)} /> 
                </div>
                <div className={'group-button-dm-message'}>
                  <AcessButton
                    name ={" dịch vụ"}
                    id={0}
                    onClick={()=>ApplyDataChange()}
                  />
                </div>
            </div>
        </div>
        
    );
};
  
export default AddServiceStep1;
