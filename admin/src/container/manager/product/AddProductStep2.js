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
  
const AddProductStep2 = ({product,sendTemplate}) => {
    const [state, setState] = useState({content:[]});
    const [collapses, setCollapses] = useState(true);

    useEffect(() => {
        ManagerData.getLstDataPromise('company').then(() => {
            setSelect(ManagerData.getTable('company'));
        });
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
         content: prev.content.concat({ product_id:product.product_id,name_image_detail:" "
                      ,image_info_detail:" ", cost_detail:1000,cost_real:1000,promotion:"",
                       image_id: maxValue ,id:0
                  }),
       }));
       console.log("addd state.content",state.content);
    };

    const removeInfoProduct = (id) => {
        let data=currenInfo.content[index];
        deleteOneDataToTable("product_image",data).then((response) => {
                setState((prev) => ({
                    ...prev,
                    content: prev.content.filter((product) => product.image_id !== data.image_id),
                }));
        });
    };
    const sendDetailImageProduct=(index)=>{
        var currenInfo=state;
        let data=currenInfo.content[index];
        addOneDataToTable("product_image",data).then((response) => {
            currenInfo.content[index].image_id=response.data.result.insertId;
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
                    {state.content.map((item, index) => (
                        <div className={'title-dm-message messages-dm-message'}>
                            <div onClick={() => { removeInfoProduct(index);}}>
                                    <RemoveCircleOutlineIcon />
                            </div>
                           
                            <UploadImage  urlImage={item.image_info_detail}   
                                uploadfileDataLink= {(url)=> {editInfoProduct(index,"image_info_detail",url)}} />
                            <div>  
                                <div>
                                    <label className="margin-label-right">Chi tiết sản phẩm </label>
                                    <Input name="name_image_detail" value={item.name_image_detail} 
                                        style ={{width: '100%' }}
                                        onChange={(e)=>editInfoProduct(index,"name_image_detail",e.target.value)} />
                                </div>
                                <div>
                                    <label className="margin-label-right">Giá đăng</label>
                                    <Input name="cost_detail" value={item.cost_detail} 
                                        style ={{width: 120 ,fontSize: 20 }}
                                        onChange={(e)=>editInfoProduct(index,"cost_detail",e.target.value)} /> 
                                
                                    <label className="margin-label-right">Giá thật </label>
                                    <Input name="cost_real" value={item.cost_real} 
                                        style ={{width:  120 ,fontSize: 20 }}
                                        onChange={(e)=>editInfoProduct(index,"cost_real",e.target.value)} />
                                    <label className="margin-label-right">Khuyến mại </label>
                                    <Input name="promotion" value={item.promotion} 
                                        style ={{width:  120,fontSize: 20 }}
                                        onChange={(e)=>editInfoProduct(index,"promotion",e.target.value)} /> 
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
  
export default AddProductStep2;
