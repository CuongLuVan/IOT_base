import React, {useState,useEffect } from 'react';
import classNames from 'classnames';
import {
  Collapse as MuiCollapse,
  FormControl,
  InputLabel,
  Select,
  Input,
  Button,
} from '@material-ui/core';
import Collapse from '../modol/Collapse.js';
import UploadImage from '../form/UploadImage.js';
import PublishIcon from '@material-ui/icons/Publish';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import RemoveCircleOutlineIcon from '@material-ui/icons/RemoveCircleOutline';
import AcessButton from '../button/AcessButton.js';

const DetailProduct = ({info,changeData,sendTemplate,idProduct}) => {
    const [state, setState] = useState({content:[]});
    const [collapses, setCollapses] = useState(false);

    useEffect(() => {
      setState((prev) => ({ ...prev, content: info }));
      //setState({company_id:company_id,name:name,detail:detail,image:image,store:store});
    }, []);

    const editInfoProduct = (index,name,value) => {
        var prevContent = [...state.content];
        prevContent[index][name] =value
        setState((prev) => ({ ...prev, content: prevContent }));
        changeData(state.content);
      }
    const addInfoProduct = () => {
        var maxValue=0;
        state.content.forEach(function(item) {
            if(maxValue<item.image_id) maxValue=item.image_id;
        });
        maxValue =maxValue+1;
       setState((prev) => ({ ...prev,
         content: prev.content.concat({ product_id:idProduct,name_image_detail:""
                      ,image_info_detail:"", cost_detail:1000, image_id: maxValue ,id:0
                  }),
       }));
       changeData(state.content);
     };

     const removeInfoProduct = (id) => {
      setState((prev) => ({
        ...prev,
        content: prev.content.filter((product) => product.image_id !== id),
      }));
      changeData(state.content);
    };
    return (
        <Collapse
          title="Hình ảnh chi tiết và giá"
          expanded={collapses}
          setExpand={() => {
            setCollapses(!collapses);
          }}
        >
          <div className={'text-box-dm-message'}>
        <span>Nội dung</span>
            <div className={'messages-dm-message'}>
              {state.content.map((item, index) => (
                <div className={'title-dm-message'}>
                    <div onClick={() => { removeInfoProduct(item.image_id);}}>
                            <RemoveCircleOutlineIcon />
                    </div>
                    <UploadImage  urlImage={item.image_info_detail}   
                        uploadfileDataLink= {(url)=> {editInfoProduct(index,"image_info_detail",url)}} />
                    Tên Sản phẩm
                    <Input name="name_image_detail" value={item.name_image_detail} 
                        onChange={(e)=>editInfoProduct(index,"name_image_detail",e.target.value)} />
                    giá sản phẩm
                    <Input name="cost_detail" value={item.cost_detail} 
                      onChange={(e)=>editInfoProduct(index,"cost_detail",e.target.value)} /> 
                    <AcessButton
                        name ={" Chi tiết"}
                        onClick={()=> {sendTemplate(index)} }
                        id={item.id}
                    />                
                </div>
              ))}
          </div>
          <div onClick={addInfoProduct}>
                    <AddCircleOutlineIcon />
                  </div>
          </div>
        </Collapse>
    );
}
  
export default DetailProduct;
