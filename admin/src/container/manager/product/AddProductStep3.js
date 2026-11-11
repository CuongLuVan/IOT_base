import React, {useState } from 'react';
import {
  Input,
  MenuItem,
  Select,
} from '@material-ui/core';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import RemoveCircleOutlineIcon from '@material-ui/icons/RemoveCircleOutline';
import AcessButton from '../../../compoment/button/AcessButton.js';
import Collapse from '../../../compoment/modol/Collapse.js';
import useEditableRows from '../useEditableRows.js';
import DateTimePicker from 'react-datetime-picker';


const AddProductStep3 = ({product,imageProduct,sendTemplate}) => {
    const [collapses, setCollapses] = useState(true);
    // Store rows; store_product_id is the row key (image_id is the selected product image).
    const { rows, edit, add, remove, save } = useEditableRows("product_store", "store_product_id", (store_product_id) => ({
        product_id:product.product_id, company_id:product.company_id, content:"",
        image_id:"", number:1000, contain:0, expridate:"", store_product_id, id:0,
    }));

    return (
        <div  className="layout-info-group" >
                <div className={'group-button-dm-layout'}>
                    <AcessButton
                        name ={" sản phẩm"}
                        onClick={()=>sendTemplate(rows)}
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
                        {rows.map((item, index) => (
                            <div className={'title-dm-message messages-dm-message'} key={item.store_product_id}>
                                <div onClick={() => { remove(index);}}>
                                            <RemoveCircleOutlineIcon />
                                </div>
                                <div>
                                    <div>
                                        <label className="margin-label-right">Sản phẩm</label>
                                        <Select
                                                labelId="role"
                                                id="role"
                                                className="enterprise-form1 permison-box"
                                                value={item.image_id}
                                                onChange={(event) => {
                                                    edit(index,"image_id",event.target.value);
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
                                        <Input name="content" value={item.content} onChange={(e)=>edit(index,"content",e.target.value)} />
                                    </div>  
                                    <div>
                                        <label className="margin-label-right"> Số lượng </label>
                                        <Input name="number" value={item.number} 
                                            style ={{width:  120 ,fontSize: 20 }}
                                            onChange={(e)=>edit(index,"number",e.target.value)} />
                                        <label className="margin-label-right"> Còn lại </label>
                                        <Input name="contain" value={item.contain} 
                                            style ={{width:  120 ,fontSize: 20 }}
                                            onChange={(e)=>edit(index,"contain",e.target.value)} />
                                        <label className="margin-label-right"> Hết hạn </label>
                                        
                                        <DateTimePicker 
                                                format="y-MM-dd h:mm:ss"
                                                locale=""
                                                style ={{width:  120 ,fontSize: 20 }}
                                                onChange={(e) => edit(index,"expridate",e)}
                                                value={item.expridate} />
                                    </div>  
                                </div>
                                {item.id==0?
                                    <AcessButton
                                        name ={" Kho"}
                                        onClick={()=> {save(index)} }
                                        id={item.id}
                                    />  :"" 
                                }
                            </div>
                            ))}
                        </div>
                        <div onClick={add}>
                                <AddCircleOutlineIcon />
                        </div>
                    </div>
                </Collapse>
        </div>
    );
};
  
export default AddProductStep3;
