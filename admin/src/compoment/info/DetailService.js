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
import SelectPages from '../form/SelectPages.js';


const DetailService = ({info,changeData,sendTemplate,idProduct}) => {
    const [state, setState] = useState({content:[]});
    const [collapses, setCollapses] = useState(false);
    const [productPages, setProductPages] = useState(false);
    const [indexProductPages, setIndexProductPages] = useState(0);

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
    const editInfoProductAds = (index,id,value) => {
        var prevContent = [...state.content];
        prevContent[index]["page_service_id"] =id;
        
        prevContent[index]["titleAb"] =value;
        setState((prev) => ({ ...prev, content: prevContent }));
        changeData(state.content);
      }
    const addInfoProduct = () => {
        var maxValue=0;
        state.content.forEach(function(item) {
            if(maxValue<item.service_id) maxValue=item.service_id;
        });
        maxValue =maxValue+1;
        //["name", "content", "image","page_service_id", "cost", "downloads","service_group_id"]
        setState((prev) => ({ ...prev,
                                content: prev.content.concat({ service_group_id:idProduct,name:""
                                ,content:"", image:"",page_service_id:0,cost:1000,
                                downloads:0,service_id: maxValue,titleAb:"" ,id:0}),
        }));
       changeData(state.content);
     };

     const removeInfoProduct = (id) => {
      setState((prev) => ({
        ...prev,
        content: prev.content.filter((product) => product.service_id !== id),
      }));
      changeData(state.content);
    };

    return (
        <Collapse
          title="Chi tiết dịch vụ"
          expanded={collapses}
          setExpand={() => {
            setCollapses(!collapses);
          }}
        >
          <div className={'text-box-dm-message'}>
            <span>Nội dung</span>
            {productPages?<SelectPages id={state.content[indexProductPages].page_service_id} 
                                onChange={(value,title)=>{editInfoProductAds(indexProductPages,value,title)}}
                                handleClose={()=>{setProductPages(false);}} />:""}
            <div className={'messages-dm-message'}>
              {state.content.map((item, index) => (
                <div className={'title-dm-message'}>
                    <div>
                        <div onClick={() => { removeInfoProduct(item.pages_content_id);}}>
                                <RemoveCircleOutlineIcon />
                        </div>
                        <UploadImage  urlImage={item.image}   
                            uploadfileDataLink= {(url)=> {editInfoProduct(index,"image",url)}} />
                        Tên dịch vụ
                        <Input name="name" value={item.name} 
                            onChange={(e)=>editInfoProduct(index,"name",e.target.value)} />
                        Nội dung dịch vụ
                        <Input name="content" value={item.content} 
                            onChange={(e)=>editInfoProduct(index,"content",e.target.value)} />
                        <br/>
                        <br/>
                        <Button variant="contained" 
                            onClick={()=>{ setProductPages(true);}}
                            disableElevation color="primary">
                            {"chọn bài báo "+ item.titleAb}
                        </Button>
                        <br/>
                        Giá dịch vụ
                        <Input name="cost" value={item.cost} 
                            onChange={(e)=>editInfoProduct(index,"cost",e.target.value)} /> 
                        Lượt tải
                        <Input name="downloads" value={item.downloads} 
                            onChange={(e)=>editInfoProduct(index,"downloads",e.target.value)} />
                        <AcessButton
                            name ={" Dịch vụ"}
                            onClick={()=> {sendTemplate(index)} }
                            id={item.id}
                        />                
                    </div>
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
  
export default DetailService;
