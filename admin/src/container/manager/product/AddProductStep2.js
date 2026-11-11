import React, {useState } from 'react';
import { Input } from '@material-ui/core';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import RemoveCircleOutlineIcon from '@material-ui/icons/RemoveCircleOutline';
import AcessButton from '../../../compoment/button/AcessButton.js';
import UploadImage from '../../../compoment/form/UploadImage.js';
import Collapse from '../../../compoment/modol/Collapse.js';
import useEditableRows from '../useEditableRows.js';
import Swal from 'sweetalert2';
  
const AddProductStep2 = ({product,sendTemplate}) => {
    const [collapses, setCollapses] = useState(true);
    // Detail images and prices; image_id is the row key.
    const { rows, edit, add, remove, save } = useEditableRows("product_image", "image_id", (image_id) => ({
        product_id:product.product_id, name_image_detail:" ", image_info_detail:" ",
        cost_detail:1000, cost_real:1000, promotion:"", image_id, id:0,
    }));

    const ApplyDataChange=()=>{
           if(rows.length<1){
                Swal.fire("Không có thông tin cập nhật giá sản phẩm, xin vui lòng check lại");
           }
           else
           {
                sendTemplate(rows);
           }
    }

    return (
        <div className="layout-info-group" >
                <div className={'group-button-dm-layout'}>
                    <AcessButton
                    name ={" Chi tiết"}
                    onClick={()=>ApplyDataChange()}
                    id={product.product_id}
                    />
                </div>
                <Collapse
                title="Hình ảnh chi tiết sản phẩm và giá"
                expanded={collapses}
                setExpand={() => {
                    setCollapses(!collapses);
                }}
                >
                <div className={'text-box-dm-message'}>
                <span>Nội dung</span>
                    <div className={'messages-dm-message'}>
                    {rows.map((item, index) => (
                        <div className={'title-dm-message messages-dm-message'} key={item.image_id}>
                            <div onClick={() => { remove(index);}}>
                                    <RemoveCircleOutlineIcon />
                            </div>
                           
                            <UploadImage  urlImage={item.image_info_detail}   
                                uploadfileDataLink= {(url)=> {edit(index,"image_info_detail",url)}} />
                            <div>  
                                <div>
                                    <label className="margin-label-right">Chi tiết sản phẩm </label>
                                    <Input name="name_image_detail" value={item.name_image_detail} 
                                        style ={{width: '100%' }}
                                        onChange={(e)=>edit(index,"name_image_detail",e.target.value)} />
                                </div>
                                <div>
                                    <label className="margin-label-right">Giá đăng</label>
                                    <Input name="cost_detail" value={item.cost_detail} 
                                        style ={{width: 120 ,fontSize: 20 }}
                                        onChange={(e)=>edit(index,"cost_detail",e.target.value)} /> 
                                
                                    <label className="margin-label-right">Giá thật </label>
                                    <Input name="cost_real" value={item.cost_real} 
                                        style ={{width:  120 ,fontSize: 20 }}
                                        onChange={(e)=>edit(index,"cost_real",e.target.value)} />
                                    <label className="margin-label-right">Khuyến mại </label>
                                    <Input name="promotion" value={item.promotion} 
                                        style ={{width:  120,fontSize: 20 }}
                                        onChange={(e)=>edit(index,"promotion",e.target.value)} /> 
                                </div>
                            </div>
                            {item.id==0?
                                <AcessButton
                                    name ={" Chi tiết"}
                                    onClick={()=> {save(index)} }
                                    id={item.id}
                                />     :"" 
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
  
export default AddProductStep2;
