

import React, { Component  } from 'react';
import TableDataViewPages from '../../compoment/table/TableDataViewPages.js'
import ManagerData from '../../actions/ManagerData.js'
import Modal90 from '../../compoment/modol/Modal90.js';
import RegisterPage from './RegisterPage.js';
import { HOST_HTTP } from '../../config/config.js';
import { httpGetData } from '../../api/httpBaseUtil.js';
import Swal from 'sweetalert2';
import {updatePagesToFist} from '../../api/httpBaseUtil.js';

import PagesLanggue from '../pages/PagesLanggue';


class PagesContent extends Component {
  constructor(props) {
      super(props);
      this.state = {
        data:null,
        enableDialogue:false,
        content:"",
        pagesLanggueDialogue:false
      };
  }

  componentDidMount(){
      ManagerData.getLstDataPromise('group_content_sub');
      ManagerData.getLstDataPromise('group_content');
      ManagerData.callBackFunc =  this.changeState;
  }
  changeState = (type) => {
    console.log(".............changeState",type);
  }
  selectChangeValue = (value) => {
    console.log("..selectChangeValue...........changeState",value);
    this.setState({ data:value});
  }

  selectEditPages = (enableDialogue) => {
    console.log(".............changeState",enableDialogue);
    if(!!this.state.data){
      httpGetData(HOST_HTTP+this.state.data.filesave,{})
      .then((value)=>{
        console.log(".............selectEditPages",value.data);
        this.setState({enableDialogue:enableDialogue,content:value.data});
      });
    }
  }
  selectClose = () => {
    this.setState({enableDialogue:false});

  }
  selectPagesToTop = () => {
    console.log(".............changeState");
    if(!!this.state.data){
      Swal.fire({
        title: 'Bạn muốn trang này lên đầu chứ?',
        showCancelButton: true,
        confirmButtonText: `Save`,
      }).then((result) => {
        /* Read more about isConfirmed, isDenied below */
        if (result.isConfirmed) {
          updatePagesToFist(this.state.data)
          .then((value)=>{

            Swal.fire('Saved!', '', 'success');
          })
        }
      })
    }
  }

  render() {
    return (
      <div>
         <TableDataViewPages
          selectChange={(value)=>{ this.selectChangeValue(value);}}
          table ={"gro_pages_content"} />
          <br/>
          {this.state.enableDialogue?
            <Modal90
                title={'Thêm dữ liệu'}
                open={true}
                onClose={()=>{this.selectEditPages(false)}}
                className="enterprise-form1"
            >
              <RegisterPage 
                handerClose={()=>{this.selectClose()}}
                is_update={true}
                data={this.state.data}
                content={this.state.content}
              />
            </Modal90>:""
            }
          {this.state.pagesLanggueDialogue? 
              <PagesLanggue  option = {{pages_content_id:this.state.data.pages_content_id }} handleClose ={()=>{ this.setState({ pagesLanggueDialogue:false});} }/>
              :""
          }
          <br/>
          <div>
            <button className='div-padding-pages' onClick={()=>{this.selectEditPages(true)} }> Edit Page </button>
            <button className='div-padding-pages' onClick={()=>{this.selectPagesToTop()} }> Đưa bài lên top </button>
            <button className='div-padding-pages' onClick={()=>{ this.setState({ pagesLanggueDialogue:true});} }> Danh sách bài viết </button>
          </div>
          
      </div>
       
    );
  }

}

export default PagesContent;