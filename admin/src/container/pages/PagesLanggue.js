

import React, {
    ReactElement,
    useCallback,
    useMemo,
    useRef,
    useEffect,
    useState,
  } from 'react';
import {
    Button,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
  } from '@material-ui/core';
import Modal from '../../compoment/modol/Modal.js';
import ManagerData from '../../actions/ManagerData.js'
import Modal90 from '../../compoment/modol/Modal90.js';
import {exportColumeData,getLstInfoToSearch } from '../../config/table/ManagerToView.js';
import { DataGrid } from '@material-ui/data-grid';
import { HOST_HTTP } from '../../config/config.js';
import { httpGetData } from '../../api/httpBaseUtil.js';
import Swal from 'sweetalert2';
import {updatePagesToFist} from '../../api/httpBaseUtil.js';
import SelectLanggue from '../../compoment/form/SelectLanggue.js';
import RegisterPage from '../../container/manager/RegisterPage.js';

export default function PagesLanggue ({option,handleClose}) {
    const [lstPages, setLstPages] = useState([]);
    const [step, setStep] = useState(0);
    const [dataPages, setDataPages] = useState(null);
    const [contentPages, setContentPages] = useState("");
    useEffect(async ()  =>  {
        let dataInfo = [];
        if(option){
            dataInfo = await ManagerData.getLstDataPromise('gro_pages_content',{dataFind: {pages_content_id:option.pages_content_id}});
            let dataInfoSp =  await ManagerData.getLstDataPromise('gro_pages_content',{dataFind: {detail_content_id:option.pages_content_id}});
            dataInfoSp.forEach(element => {
                dataInfo.push(element);
            });
            let dataInfoSp1 =  await ManagerData.getLstDataPromise('gro_pages_content',{dataFind: {is_main_pages_id:option.pages_content_id}});
            dataInfoSp1.forEach(element => {
                dataInfo.push(element);
            });
        }     
        else 
            dataInfo = await ManagerData.getLstDataPromise('gro_pages_content');
        setLstPages(dataInfo);
    }, [option]);

    const callBackEdit = () => {


    }

    const  handleRowSelectBox = (e) => {
        console.log("handleRowSelectBox",e);
        ManagerData.dialogueCustomizationSave.lstSelect = e;
    }

    const  handleRowSelection = (e) => {
        console.log("handleRowSelection",e);
        ManagerData.dialogueCustomizationSave.dataInput = e.row;
       
    }
    const  editPages = (pages) => {
        console.log("handleRowSelection");
        setDataPages(pages);
        httpGetData(HOST_HTTP+pages.filesave,{})
        .then((value)=>{
          console.log(".............selectEditPages",value.data);
          setContentPages(value.data);
          setStep(1);
        });
       
        
    }
    const  updatelanguePages = (pages) => {
        console.log("handleRowSelection");
        setDataPages(pages);
        httpGetData(HOST_HTTP+pages.filesave,{})
        .then((value)=>{
          console.log(".............selectEditPages",value.data);
          var TypeSelection =[{id:0,name :"Tiếng Việt"},{id:2,name :"English"}];
          var langgueInfo =0;
          let fillterSelectTion = TypeSelection.filter(o=>(o.id!=pages.type_langue));
          if(fillterSelectTion.length>0) langgueInfo = fillterSelectTion[0].id;
          setDataPages({content:pages!=null?pages.content:"", content_img:pages!=null?pages.content_img:"",
            created_at : pages!=null?pages.created_at:"", deleteflag:0,
           detail_content_id:pages.detail_content_id, filesave:"", group_content:pages!=null?pages.group_content:"",
           group_content_sub_id:pages!=null?pages.group_content_sub_id:"", group_file:  "group_file",
           id_created:pages!=null?pages.id_created:"", id_updated:pages!=null?pages.id_updated:"",
           is_main_pages_id:pages!=null?pages.is_main_pages_id:"", 
           name_short:pages!=null?pages.name_short:"", oldid:0,pages_content_id:0,
           set_to_fist:pages!=null?pages.set_to_fist:"",
           support_product:pages!=null?pages.support_product:"",
           title:pages!=null?pages.title:"",
           type_langue:langgueInfo, updated_at: pages!=null?pages.updated_at:""});
          setContentPages(value.data);
          setStep(2);
        });
    }


    const  addNewPages = () => {
        console.log("handleRowSelection");
        var TypeSelection =[{id:0,name :"Tiếng Việt"},{id:2,name :"English"}];
        var langgueInfo =0;
        var includeLanggue = [];

        lstPages.forEach(element => {includeLanggue.push(element.type_langue);});
        let fillterSelectTion = TypeSelection.filter(o=>(!includeLanggue.includes(o.id)));
        if(fillterSelectTion.length>0) langgueInfo = fillterSelectTion[0].id;
        let pages_setup = null;
        if(lstPages.length>0) pages_setup = lstPages[0];

        setDataPages({content:pages_setup!=null?pages_setup.content:"", content_img:pages_setup!=null?pages_setup.content_img:"",
             created_at : pages_setup!=null?pages_setup.created_at:"", deleteflag:0,
            detail_content_id:option.pages_content_id, filesave:"", group_content:pages_setup!=null?pages_setup.group_content:"",
            group_content_sub_id:pages_setup!=null?pages_setup.group_content_sub_id:"", group_file:  "group_file",
            id_created:pages_setup!=null?pages_setup.id_created:"", id_updated:pages_setup!=null?pages_setup.id_updated:"",
            is_main_pages_id:pages_setup!=null?pages_setup.is_main_pages_id:"", 
            name_short:pages_setup!=null?pages_setup.name_short:"", oldid:0,pages_content_id:0,
            set_to_fist:pages_setup!=null?pages_setup.set_to_fist:"",
            support_product:pages_setup!=null?pages_setup.support_product:"",
            title:pages_setup!=null?pages_setup.title:"",
            type_langue:langgueInfo, updated_at: pages_setup!=null?pages_setup.updated_at:""});
        setStep(2);
    }

    const columns = exportColumeData('gro_pages_content',callBackEdit);
    return (
        <Modal
                title={'Quản lý ngôn ngữ bài viết'}
                open={true}
                onClose={handleClose}
                className="enterprise-form1"
                type_model={2}
            >
            <Divider />
            <div>{step==0? <button onClick={()=>{addNewPages()} }>+ Thêm bài viết </button> :"" }</div>  
            <Divider />
            {step==0?
            <div style={{height:300}}>
                {lstPages.map(data=>{
                    return (<div>
                         <label className='div-padding-langgue' > Bài viết: </label>
                        <label className='div-padding-langgue' style={{width:500}} >{data.title.length>100?data.title.substring(0, 100):data.title} </label> 
                        <SelectLanggue
                            className='div-padding-langgue'
                            style={{width:120}}
                            typePermision={data.type_langue}
                            onChange={(event) => {  }}
                        />
                        <button className='div-padding-langgue'  onClick={()=>{ editPages(data) }}> Sửa lại</button>
                        <button className='div-padding-langgue'  onClick={()=>{ updatelanguePages(data) }}> Thêm ngôn ngữ</button>
                    </div>);
                })}
            </div>:""}
            {step==1?
            <div style={{height:400}}>
                <RegisterPage 
                    handerClose={()=>{handleClose()}}
                    is_update={true}
                    data={dataPages}
                    content={contentPages}
                />
            </div>:""}
            {step==2?
            <div style={{height:400}}>
                <RegisterPage 
                    handerClose={()=>{handleClose()}}
                    is_update={false}
                    data={dataPages}
                    content={contentPages}
                />

            </div>:""}


           
        </Modal>
       
    );
}

