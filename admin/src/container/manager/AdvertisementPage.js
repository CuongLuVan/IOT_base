
import React, { Component } from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {exportColumeData } from '../../config/table/ManagerToView.js'
import {
    FormControl,
    Button,
    InputLabel,
    MenuItem,
    Select,
    TextField
  } from '@material-ui/core';
//import { CKEditor } from '@ckeditor/ckeditor5-react';
//import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import PublishIcon from '@material-ui/icons/Publish';
import Swal from 'sweetalert2';
import { uploadfileDataImage,updatePageToAdvertisement ,registerPageToAdvertisement} from '../../api/httpBaseUtil.js';
import UploadImage from '../../compoment/form/UploadImage.js';
import SelectGroupContentSub from '../../compoment/form/SelectGroupContentSub.js';
import SearchPageData from '../../compoment/form/SearchPageData.js';
import '../../config/config.js'
import { HOST_HTTP } from '../../config/config.js';
import PropTypes from 'prop-types';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';
import {MyCustomUploadAdapterPlugin} from '../../api/uploadAdatapter.js';
import {providers} from '../../compoment/editor/videoProviders';

class AdvertisementPage extends Component {
    static propTypes = {
        handerClose: PropTypes.func.isRequired,
        is_update: PropTypes.bool.isRequired,
        data:PropTypes.array.isRequired,
        content:PropTypes.string.isRequired,
    };
    constructor(props) {
        super(props);
        this.state = {
            advertisement_id:this.props.is_update?this.props.data.advertisement_id :0,
            group_content_sub_id:this.props.is_update?this.props.data.group_content_sub_id :0,
            refesh:false,
            image_head:this.props.is_update?this.props.data.content_img :"",
            title:this.props.is_update?this.props.data.title :"",
            content:this.props.is_update?this.props.data.content :"",
            is_main:this.props.is_update?this.props.data.is_main_pages_id :0,
            content_html:this.props.is_update?this.props.content :"",
            
        }
    }
    componentDidMount(){
        ManagerData.getLstDataPromise('group_content_sub').then(()=>{
            this.setState({ refesh:false});
            console.log("componentDidMount......................");
            setTimeout(()=>{
                this.setState({ refesh:true});
            },200);
        });
        ManagerData.getLstDataPromise('group_content').then(()=>{
            this.setState({ refesh:false});
            console.log("componentDidMount......................");
            setTimeout(()=>{
                this.setState({ refesh:true});
            },200);
        });
    }
    handleRowSelectBox = (e) => {
        ManagerData.dialogueCustomizationSave.lstSelect = e;
    }

    handleRowSelection = (e) => {
        ManagerData.dialogueCustomizationSave.dataInput = e.data;
    }

    onChange(content){
        console.log("Content: " + content);
        this.setState({ content_html:content});
    }

    saveContentPageToDataBase(){
        var formData={};
        if(this.props.is_update){
            formData=this.props.data;
        }
        formData.group_content_sub_id= this.state.group_content_sub_id;
        formData.content_img= this.state.image_head;
        formData.group_file= "group_file";
        formData.filesave= "filesave";
        formData.title= this.state.title;
        formData.content= this.state.content;
        formData.content_html= this.state.content_html;
        formData.advertisement_id= this.state.advertisement_id;
        data.is_postPages=true;
        if(this.props.is_update)
        {
            updatePageToAdvertisement(formData).then((response)=>{
                Swal.fire("Cập nhật thông tin thành công");
                if(!!this.props.handerClose){
                    this.props.handerClose();
                }
            });
        }
        else {
            registerPageToAdvertisement(formData).then((response)=>{
                Swal.fire("Cập nhật thông tin thành công");
            });
        }
    }

    onChangeSub(content,detail){
        this.setState({ group_content_sub_id:content.target.value});
    }

    onChangTitle(content){
        console.log("Content: " + content);
        this.setState({ title:content.target.value});
    }

    onChangeContent(content){
        console.log("Content: " + content);
        this.setState({ content:content.target.value});
    }

    uploadImage(url){
        console.log("Content: " + url);
        this.setState({ image_head:url});
    }
    choiceSubPages=(value)=>{
        console.log("Content: " + value);
        this.setState({ is_main:value});
    }



    render() {
        const custom_config = {
            extraPlugins: [ MyCustomUploadAdapterPlugin ],
            mediaEmbed: {
                providers:providers,
                previewsInData: true
            }
          };
        return (
            <div className="user-data">
                <h2> {this.props.is_update?"Sửa bài":"Đăng bài"}</h2>
                <br/>
                <div className={'row-register'} >
                    <div className={'column-register-left'} >
                        <UploadImage
                            urlImage={this.state.image_head}
                            uploadfileDataLink= {(url)=> {this.uploadImage(url)}}
                        />
                    </div>
                    <div className={'column-register-right'} >
                        {this.state.refesh?
                         <SelectGroupContentSub 
                            detailValue={this.state.group_content_sub_id}
                            onChange={(event) => {
                                this.onChangeSub(event,"id");
                            }}
                        />
                        :""}
                        <div className='register-button'>
                        <Button variant="outlined" component="label" disableElevation
                         style={{width:200, color: "blue"}}
                                    onClick={()=>{this.saveContentPageToDataBase()}}
                         >
                              {this.props.is_update?"Sửa Quảng cáo":"Đăng Quảng cáo"}
                        </Button>
                        </div>
                        
                        <div className={'register-content'}>
                        <div className={'register-item'}>
                        <p className={'line'}>Tiêu đề bài viết</p>
                        <TextField variant="outlined" multiline className={'register-text'}  value={this.state.title}  onChange={(event) => {
                                                                                    this.onChangTitle(event);
                                                                                }} />
                        </div>
                        <div className={'register-item'}>
                        
                        <p className={'line'}>Mô tả cụ thể</p>
                        <TextField variant="outlined" multiline className={'register-text'} value={this.state.content}  onChange={(event) => {
                                                                                    this.onChangeContent(event);
                                                                                }} />
                        </div>
                    </div>
                    </div>
                </div>
                <br/>
                <div className={'document-editor'}>
                <div id="toolbar-container"></div>

                    <CKEditor
                        editor={ DecoupledEditor }
                        data={this.state.content_html}
                        config={custom_config}
                        onReady={(editor) => {
                            const toolbarContainer = document.querySelector("#toolbar-container");
                            toolbarContainer.appendChild(editor.ui.view.toolbar.element);
                            window.editor = editor;
                            console.log("Editor is ready to use!", editor);
                            }}
                        onChange={ ( event, editor ) => {
                            const data = editor.getData();
                            this.onChange(data);
                            console.log( { event, editor, data } );
                        } }
                        onBlur={ ( event, editor ) => {
                            console.log( 'Blur.', editor );
                        } }
                        onFocus={ ( event, editor ) => {
                            console.log( 'Focus.', editor );
                        } }
                    />
                 </div>
                
  {/*                                                                                  
                <CKEditor
                    editor={ ClassicEditor }
                    data={this.state.content_html}
                    config={custom_config}
                    onReady={ editor => {
                        // You can store the "editor" and use when it is needed. this.state.content_html
                        //editor.ui.view.editable.element.style.minHeight = '500px';
                        console.log( 'Editor is ready to use!', editor );
                    } }
                    onChange={ ( event, editor ) => {
                        const data = editor.getData();
                        this.onChange(data);
                        console.log( { event, editor, data } );
                    } }
                    onBlur={ ( event, editor ) => {
                        console.log( 'Blur.', editor );
                    } }
                    onFocus={ ( event, editor ) => {
                        console.log( 'Focus.', editor );
                    } }
                /> */}
            </div>
        );
    }
}

export default AdvertisementPage;