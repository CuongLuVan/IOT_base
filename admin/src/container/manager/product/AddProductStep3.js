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
import {addOneDataToTable,deleteOneDataToTable} from '../../../api/httpBaseUtil.js';
import ManagerData from '../../../actions/ManagerData.js';
import DateTimePicker from 'react-datetime-picker';


const AddProductStep3 = ({product,imageProduct,sendTemplate}) => {
    const [collapses, setCollapses] = useState(true);
    const [state, setState] = useState({content:[]});
    useEffect(() => {
    }, []);

    const editInfoProduct = (index,name,value) => {
      var prevContent = [...state.content];
      prevContent[index][name] =value
      setState((prev) => ({ ...prev, content: prevContent }));
    }

    const addInfoProduct = () => {
      var maxValue=0;
      state.content.forEach(function(item) {
          if(maxValue<item.image_id) maxValue=item.image_id;
      });
      maxValue =maxValue+1;
      setState((prev) => ({ ...prev,
            content: prev.content.concat({ product_id:product.product_id,company_id:product.company_id,content:""
                    ,image_id:"", number:1000,contain:0,expridate:"", store_product_id: maxValue ,id:0
                }),
      }));
   };
  
    const removeInfoProduct = (id) => {
        let data=currenInfo.content[index];
        deleteOneDataToTable("product_store",data).then((response) => {
            setState((prev) => ({
                ...prev,
                content: prev.content.filter((product) => product.store_product_id !== id),
            }));
        });
     
    };
    const ApplyDataChange=(index)=>{
        var currenInfo=state;
        let data=currenInfo.content[index];
        addOneDataToTable("product_store",data).then((response) => {
            currenInfo.content[index].store_product_id= response.data.result.insertId;
            currenInfo.content[index].id=response.data.result.insertId;
            setState((prev) => ({ ...prev, content: currenInfo.content}));
        });
    }

    return (
        <div  className="layout-info-group" >
                <div className={'group-button-dm-layout'}>
                    <AcessButton
                        name ={" sản phẩm"}
                        onClick={()=>sendTemplate(state.content)}
                        id={product.product_id}
                    />
                </div>
                <Collapse
                        title="Kho bãi"
                        expanded={collapses}
                        setExpand={() => {
                            setCollapses(!collapses);
                        }}
                    >
                    <div className={'text-box-dm-message'}>
                    <div className={'messages-dm-message'}>
                        {state.content.map((item, index) => (
                            <div className={'title-dm-message messages-dm-message'}>
                                <div onClick={() => { removeInfoProduct(item.store_product_id);}}>
                                            <RemoveCircleOutlineIcon />
                                </div>
                                <div>
                                    <div>
                                        <label className="margin-label-right">Sản phẩm</label>
                                        <Select
                                                labelId="role"
                                                id="role"
                                                className="enterprise-form1 permison-box"
                                                label={"Công ty"}
                                                value={item.image_id}
                                                onChange={(event) => {
                                                    editInfoProduct(index,"image_id",event.target.value);
                                                }}
                                                label="Công ty"
                                            >
                                            {!!!imageProduct?"":imageProduct.map((vars) => (
                                                <MenuItem value={vars.image_id} key={vars.name_image_detail} >
                                                    {vars.name_image_detail}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                        <label className="margin-label-right"> Nội dung </label>
                                        <Input name="content" value={item.content} onChange={(e)=>editInfoProduct(index,"content",e.target.value)} />
                                    </div>  
                                    <div>
                                        <label className="margin-label-right"> Số lượng </label>
                                        <Input name="number" value={item.number} 
                                            style ={{width:  120 ,fontSize: 20 }}
                                            onChange={(e)=>editInfoProduct(index,"number",e.target.value)} />
                                        <label className="margin-label-right"> Còn lại </label>
                                        <Input name="contain" value={item.contain} 
                                            style ={{width:  120 ,fontSize: 20 }}
                                            onChange={(e)=>editInfoProduct(index,"contain",e.target.value)} />
                                        <label className="margin-label-right"> Hết hạn </label>
                                        
                                        <DateTimePicker 
                                                format="y-MM-dd h:mm:ss"
                                                locale=""
                                                style ={{width:  120 ,fontSize: 20 }}
                                                onChange={(e) => {
                                                    var data= {target:{value:e} };
                                                    console.log("event ...",data); 
                                                    editInfoProduct(index,"expridate",e);
                                                }} 
                                                value={item.expridate} />
                                    </div>  
                                </div>
                                {item.id==0?
                                    <AcessButton
                                        name ={" Kho"}
                                        onClick={()=> {ApplyDataChange(index)} }
                                        id={item.id}
                                    />  :"" 
                                }
                            </div>
                            ))}
                        </div>
                        <div onClick={addInfoProduct}>
                                <AddCircleOutlineIcon />
                        </div>
                    </div>
                </Collapse>
        </div>
    );
};
  
export default AddProductStep3;
