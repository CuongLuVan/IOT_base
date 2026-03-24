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
import Swal from 'sweetalert2';
  
const AddServiceStep3 = ({product,sendTemplate}) => {
    const [state, setState] = useState({content:[]});
    const [collapses, setCollapses] = useState(true);

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
         content: prev.content.concat({ service_group_id:product.service_group_id,name:" "
                      ,content:" ", image:"",cost:'0',downloads:'0',id:0,service_id:maxValue
                  }),
       }));
       console.log("addd state.content",state.content);
    };

    const removeInfoProduct = (id) => {
        let data=currenInfo.content[index];
        deleteOneDataToTable("service",data).then((response) => {
                setState((prev) => ({
                    ...prev,
                    content: prev.content.filter((product) => product.service_id !== data.service_id),
                }));
        });
    };
    const sendDetailImageProduct=(index)=>{
        var currenInfo=state;
        let data=currenInfo.content[index];
        addOneDataToTable("service",data).then((response) => {
            currenInfo.content[index].service_id=response.data.result.service_id;
            currenInfo.content[index].id= response.data.result.insertId;
            setState((prev) => ({ ...prev, content: currenInfo.content}));
        //    console.log("sendDetailImageProduct",state);
        });
      }

    const ApplyDataChange=()=>{
           if(state.content.length<1){
                Swal.fire("Không có thông tin cập nhật giá sản phẩm, xin vui lòng check lại");
           }
           else
           {
                console.log("state.content",state.content);
                sendTemplate(state.content);
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
                    {state.content.map((item, index) => (
                        <div className={'title-dm-message messages-dm-message'}>
                            <div onClick={() => { removeInfoProduct(index);}}>
                                    <RemoveCircleOutlineIcon />
                            </div>
                           
                            <UploadImage  urlImage={item.image}   
                                uploadfileDataLink= {(url)=> {editInfoProduct(index,"image",url)}} />
                            <div>  
                                <div>
                                    <label className="margin-label-right">Tên dịch vụ </label>
                                    <Input name="name" value={item.name} 
                                        style ={{width: '80%' }}
                                        onChange={(e)=>editInfoProduct(index,"name",e.target.value)} />
                                    <label className="margin-label-right">Nội dung dịch vụ </label>
                                    <Input name="content" value={item.content} 
                                        style ={{width: '80%' }}
                                        onChange={(e)=>editInfoProduct(index,"content",e.target.value)} />
                                </div>
                                <div>
                                    <label className="margin-label-right">Giá đăng</label>
                                    <Input name="cost" value={item.cost} 
                                        style ={{width: 120 ,fontSize: 20 }}
                                        onChange={(e)=>editInfoProduct(index,"cost",e.target.value)} /> 
                                
                                    <label className="margin-label-right">Số lượng tải </label>
                                    <Input name="downloads" value={item.downloads} 
                                        style ={{width:  120 ,fontSize: 20 }}
                                        onChange={(e)=>editInfoProduct(index,"downloads",e.target.value)} />
                                </div>
                            </div>
                            {item.id==0?
                                <AcessButton
                                    name ={" Chi tiết"}
                                    onClick={()=> {sendDetailImageProduct(index)} }
                                    id={item.id}
                                />     :"" 
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
  
export default AddServiceStep3;
