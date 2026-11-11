import React, {useState } from 'react';
import { Input } from '@material-ui/core';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import RemoveCircleOutlineIcon from '@material-ui/icons/RemoveCircleOutline';
import AcessButton from '../../../compoment/button/AcessButton.js';
import UploadImage from '../../../compoment/form/UploadImage.js';
import Collapse from '../../../compoment/modol/Collapse.js';
import useEditableRows from '../useEditableRows.js';
import Swal from 'sweetalert2';
  
const AddServiceStep3 = ({product,sendTemplate}) => {
    const [collapses, setCollapses] = useState(true);
    // Services of the group; service_id is the row key (insertId once saved).
    const { rows, edit, add, remove, save } = useEditableRows("service", "service_id", (service_id) => ({
        service_group_id:product.service_group_id, name:" ", content:" ", image:"",
        cost:'0', downloads:'0', id:0, service_id,
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
                    name ={" Chi Tiết"}
                    onClick={()=>ApplyDataChange()}
                    id={0}
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
                        <div className={'title-dm-message messages-dm-message'} key={item.service_id}>
                            <div onClick={() => { remove(index);}}>
                                    <RemoveCircleOutlineIcon />
                            </div>
                           
                            <UploadImage  urlImage={item.image}   
                                uploadfileDataLink= {(url)=> {edit(index,"image",url)}} />
                            <div>  
                                <div>
                                    <label className="margin-label-right">Tên dịch vụ </label>
                                    <Input name="name" value={item.name} 
                                        style ={{width: '80%' }}
                                        onChange={(e)=>edit(index,"name",e.target.value)} />
                                    <label className="margin-label-right">Nội dung dịch vụ </label>
                                    <Input name="content" value={item.content} 
                                        style ={{width: '80%' }}
                                        onChange={(e)=>edit(index,"content",e.target.value)} />
                                </div>
                                <div>
                                    <label className="margin-label-right">Giá đăng</label>
                                    <Input name="cost" value={item.cost} 
                                        style ={{width: 120 ,fontSize: 20 }}
                                        onChange={(e)=>edit(index,"cost",e.target.value)} /> 
                                
                                    <label className="margin-label-right">Số lượng tải </label>
                                    <Input name="downloads" value={item.downloads} 
                                        style ={{width:  120 ,fontSize: 20 }}
                                        onChange={(e)=>edit(index,"downloads",e.target.value)} />
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
  
export default AddServiceStep3;
