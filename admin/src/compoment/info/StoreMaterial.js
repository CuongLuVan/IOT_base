import React, {useState,useEffect } from 'react';
import classNames from 'classnames';
import {
  Collapse as MuiCollapse,
  FormControl,
  InputLabel,
  Select,
  Input,
  Button,
  MenuItem,
} from '@material-ui/core';
import Collapse from '../modol/Collapse.js';
import AcessButton from '../button/AcessButton.js';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import RemoveCircleOutlineIcon from '@material-ui/icons/RemoveCircleOutline';
  
const StoreMaterial = ({info,changeData,sendTemplate,image_id,idProduct,companyId}) => {
  const [collapses, setCollapses] = useState(false);
  const [state, setState] = useState({content:[]});
    useEffect(() => {
      setState((prev) => ({ ...prev, content: info }));
    }, [info]);

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
            content: prev.content.concat({ product_id:idProduct,company_id:companyId,content:""
                    ,image_id:"", number:1000,contain:0,expridate:"", store_product_id: maxValue ,id:0
                }),
      }));
      changeData(state.content);
   };
  
    const removeInfoProduct = (id) => {
      setState((prev) => ({
        ...prev,
        content: prev.content.filter((product) => product.store_product_id !== id),
      }));
      changeData(state.content);
    };
    return (
        <Collapse
          title="Kho bãi"
          expanded={collapses}
          setExpand={() => {
            setCollapses(!collapses);
          }}
        >
          <div className={'official-account-dm-message'}>
          {state.content.map((item, index) => (
              <div className={'title-dm-message'}>
                  <div onClick={() => { removeInfoProduct(item.store_product_id);}}>
                            <RemoveCircleOutlineIcon />
                  </div>
                  chi tiết sản phẩm:
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
                      {!!!image_id?"":image_id.map((vars) => (
                          <MenuItem value={vars.image_id} key={vars.name_image_detail} >
                              {vars.name_image_detail}
                          </MenuItem>
                      ))}
                  </Select>
                  
                  Nội dung
                  <Input name="content" value={item.content} onChange={(e)=>editInfoProduct(index,"content",e.target.value)} />
                  <div>
                      Số lượng
                      <Input name="number" value={item.number} onChange={(e)=>editInfoProduct(index,"number",e.target.value)} />
                      Còn lại
                      <Input name="contain" value={item.contain} onChange={(e)=>editInfoProduct(index,"contain",e.target.value)} />
                      Ngày hết hạn
                      <Input name="expridate" value={item.expridate} onChange={(e)=>editInfoProduct(index,"expridate",e.target.value)} />
                  </div>
                  <AcessButton
                        name ={" Kho"}
                        onClick={()=> {sendTemplate(index)} }
                        id={item.id}
                    />
              </div>
              ))}
              <div onClick={addInfoProduct}>
                    <AddCircleOutlineIcon />
              </div>
          </div>
        </Collapse>
    );
};
  
export default StoreMaterial;
