

import React, {useState, useEffect }  from 'react';
import TableDataView from '../../../compoment/table/TableDataView.js'
import ManagerData from '../../../actions/ManagerData.js'
import Modal90 from '../../../compoment/modol/Modal90.js';
import { HOST_HTTP } from '../../../config/config.js';
import { httpGetData } from '../../../api/httpBaseUtil.js';
import Swal from 'sweetalert2';
import AddServiceStep2 from "./AddServiceStep2";

const ServicePagesContent = ()=> {
    const [dataPages, setDataPages] = useState(null);
    const [enableDialogue, setEnableDialogue] = useState(false);
    const [dataContent, setDataContent] = useState("");

    useEffect(() => {
        ManagerData.getLstDataPromise('service_pages');
        ManagerData.getLstDataPromise('service_group').then(()=>{
        });
       // ManagerData.callBackFunc =  changeState;
    }, []);
    /*const changeState = (type) => {
    }*/
    const selectChangeValue = (value) => {
        setDataPages(value);
    }

    const selectEditPages = (dialogue) => {
        if(dataPages!=null){
            httpGetData(HOST_HTTP+dataPages.filesave,{})
            .then((value)=>{
                setDataContent(value.data);
                setEnableDialogue(true);      
            });
        }
        else{
            if(!dialogue){
                setEnableDialogue(true);
            }
            else
            {
                Swal.fire("Xin vui lòng lựa chọn item ?");
            } 
        }
    }

    return (
      <div>
         <TableDataView
          selectChange={(value)=>{ selectChangeValue(value);}}
          table ={"service_pages"} />
          <br/>
          {enableDialogue?
                <Modal90
                    title={"Sửa Bài viết sản phẩm "+"Đăng Sản phẩm"}
                    open={true}
                    onClose={()=>{setEnableDialogue(false)}}
                    className="enterprise-form1"
                >
                    <AddServiceStep2 product={dataPages} 
                        content_html={dataContent}
                        isNew={dataPages==null} 
                        sendTemplate={()=>{ ManagerData.getLstDataPromise('service_pages'); setEnableDialogue(false); }} />
                </Modal90>:""
            }
          <br/>
          <button onClick={()=>{selectEditPages(true)} }> sửa bài </button>
          <button onClick={()=>{ setDataContent(""); setDataPages(null); selectEditPages(false);} }> Tạo bài viết </button>
      </div>
    );
}

export default ServicePagesContent;