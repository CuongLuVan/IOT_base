

import React, {useState, useEffect }  from 'react';
import TableDataView from '../../../compoment/table/TableDataView.js'
import ManagerData from '../../../actions/ManagerData.js'
import Modal90 from '../../../compoment/modol/Modal90.js';
import RegisterProductPage from './RegisterProductPage.js';
import { HOST_HTTP } from '../../../config/config.js';
import { httpGetData } from '../../../api/httpBaseUtil.js';
import Swal from 'sweetalert2';

const ProductPagesContent = ()=> {
    const [dataPages, setDataPages] = useState(null);
    const [enableDialogue, setEnableDialogue] = useState(false);
    const [dataContent, setDataContent] = useState("");

    useEffect(() => {
        ManagerData.getLstDataPromise('product_pages');
        ManagerData.getLstDataPromise('group_content_sub');
        ManagerData.getLstDataPromise('group_content');
       // ManagerData.callBackFunc =  changeState;
    }, []);
    /*const changeState = (type) => {
        console.log(".............changeState",type);
    }*/
    const selectChangeValue = (value) => {
        console.log("..selectChangeValue...........changeState",value);
        setDataPages(value);
    }

    const selectEditPages = (dialogue) => {
        console.log("selectEditPages .............................................",dialogue);
        if(dataPages!=null){
            console.log("selectEditPages ......................................dataPages.......",dataPages);
            console.log("selectEditPages ............HOST_HTTP+dataPages.filesave.......",HOST_HTTP+dataPages.filesave);
            httpGetData(HOST_HTTP+dataPages.filesave,{})
            .then((value)=>{
                console.log("selectEditPages ......value.......",value);
                setDataContent(value.data);
                setEnableDialogue(true);      
            });
        }
        else{
            console.log("selectEditPages ......else.......");
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
          table ={"product_pages"} />
          <br/>
          {enableDialogue?
            <Modal90
                title={"Sửa Bài viết sản phẩm "+"Đăng Sản phẩm"}
                open={true}
                onClose={()=>{setEnableDialogue(false)}}
                className="enterprise-form1"
            >
              <RegisterProductPage 
                handerClose={()=>{setEnableDialogue(false)}}
                is_update={dataPages!=null}
                set_up_product={dataPages==null?0:dataPages.product_id}
                data={dataPages}
                content={dataContent}
              />
            </Modal90>:""
            }
          <br/>
          <button onClick={()=>{selectEditPages(true)} }> sửa bài </button>
          <button onClick={()=>{setDataPages(null); selectEditPages(false);} }> Tạo bài viết </button>
      </div>
    );
}

export default ProductPagesContent;