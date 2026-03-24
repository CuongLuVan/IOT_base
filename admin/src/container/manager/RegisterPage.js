
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
//https://www.programmersought.com/article/96678994232/
import PublishIcon from '@material-ui/icons/Publish';
import Swal from 'sweetalert2';
import { registerPageToWriter ,updatePageToWriter} from '../../api/httpBaseUtil.js';
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
import SelectLanggue from '../../compoment/form/SelectLanggue.js';
//import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
//import MediaEmbed from '../../compoment/mediaEmbed/mediaembed';


class RegisterPage extends Component {
    static propTypes = {
        handerClose: PropTypes.func.isRequired,
        is_update: PropTypes.bool.isRequired,
        data:PropTypes.array.isRequired,
        content:PropTypes.string.isRequired,
    };
    constructor(props) {
        super(props);
        if(this.props.is_update){
            this.state = {
                pages_content_id:this.props.data.pages_content_id ,
                group_content_sub_id:this.props.data.group_content_sub_id ,
                refesh:false,
                type_langue:this.props.data.type_langue ,
                detail_content_id:this.props.data.detail_content_id ,
                image_head:this.props.data.content_img ,
                title:this.props.data.title ,
                content:this.props.data.content ,
                is_main:this.props.data.is_main_pages_id ,
                content_html:this.props.content 
            };
        }
        else
        {
            if(this.props.data!=undefined&&this.props.data.group_content_sub_id!=undefined&&this.props.data.group_content_sub_id>0){
                this.state = {
                    pages_content_id:this.props.data.pages_content_id ,
                    group_content_sub_id:this.props.data.group_content_sub_id ,
                    refesh:false,
                    type_langue:this.props.data.type_langue ,
                    detail_content_id:this.props.data.detail_content_id ,
                    image_head:this.props.data.content_img ,
                    title:this.props.data.title ,
                    content:this.props.data.content ,
                    is_main:this.props.data.is_main_pages_id ,
                    content_html:this.props.content 
                };
            }
            else
            {
                this.state = {
                    pages_content_id:0,
                    group_content_sub_id:0,
                    refesh:false,
                    type_langue:0,
                    detail_content_id:0,
                    image_head:"",
                    title:"",
                    content:"",
                    is_main:0,
                    content_html:"<p>a</p>"
                }
            }
            
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
        formData.type_langue= this.state.type_langue;
        formData.detail_content_id= this.state.detail_content_id;       
        formData.content= this.state.content;
        formData.is_main_pages_id= this.state.is_main;
        formData.content_html= this.state.content_html;
        formData.pages_content_id= this.state.pages_content_id;
        formData.is_postPages=true;
        if(this.props.is_update)
        {
            updatePageToWriter(formData).then((response)=>{
                Swal.fire("Cập nhật thông tin thành công");
                if(!!this.props.handerClose){
                    this.props.handerClose();
                }
            });
        }
        else {
            registerPageToWriter(formData).then((response)=>{
                Swal.fire("Cập nhật thông tin thành công");
            });
        }
        
        
    }

    onChangeSub(content,detail){
       
        ManagerData.getLstDataPromise('gro_pages_content',{dataFind:{ group_content_sub_id:content.target.value,is_main_pages_id:-1 }} ).then(()=>{
            this.setState({ refesh:false});
            setTimeout(()=>{
                this.setState({ refesh:true});
            },200);
        });
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
        var showEditText=false; 
        
        showEditText= ManagerData.checkDataExistting('group_content_sub');
        if(!showEditText)
            showEditText= ManagerData.checkDataExistting('group_content');

        return (
            <div className="user-data">
                <h2> {this.props.is_update?"Sửa bài":"Đăng bài"}</h2>
                <br/>
                <div className={'row-register'} >
                    <div className={'column-register-left'} >
                        <UploadImage
                            urlImage={this.state.image_head}
                            uploadfileDataLink= {(url)=> {this.uploadImage(url)}}
                            style={{width:120}}
                        />
                        <p className={'line'}>Ngôn ngữ</p>
                        <SelectLanggue
                                style={{width:120}}
                                typePermision={this.state.type_langue}
                                onChange={(event) => {  this.setState({ title:event.target.type_langue}); }}
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
                       
                        <SearchPageData
                            id_select={this.state.is_main}
                            sub_id_select={this.state.group_content_sub_id}
                            changeID={(value)=>{this.choiceSubPages(value);}}
                        />
                        <div className={'register-content'}>

                       
                            <div className={'register-item'}>
                                <p className={'line'}>Tiêu đề bài viết</p>
                                <TextField variant="outlined"
                                multiline className={'register-text'}  
                                value={this.state.title}  
                                onChange={(event) => { this.onChangTitle(event);}} />
                            </div>
                            <div className={'register-item'}>
                            
                                <p className={'line'}>Mô tả cụ thể</p>
                                <TextField variant="outlined" multiline className={'register-text'} value={this.state.content}  onChange={(event) => {
                                                                                            this.onChangeContent(event);
                                                                                        }} />
                            </div>
                        </div>
                    </div>
                    <div className={'column-register-end'} >
                        <div className={'register-button'}>
                            <Button variant="outlined" component="label" disableElevation
                            style={{width:135, height:70, color: "blue"}}
                                        onClick={()=>{this.saveContentPageToDataBase()}}
                            >
                                {this.props.is_update?"Sửa bài":"Đăng bài"}
                            </Button>
                        </div>
                    </div>
                </div>
                <div className={'document-editor'}>
                <div id="toolbar-container"></div>
                <div className="document-editor__toolbar"></div>
                <div className="document-editor__editable-container">

                    <CKEditor
                        editor={ DecoupledEditor }
                        data={this.state.content_html}
                        config={custom_config}
                        
                        onInit={ editor => {
                            console.log( 'Editor is ready to use!', editor );
                            window.editor = editor;
          
                            // Add these two lines to properly position the toolbar
                            const toolbarContainer = document.querySelector( '.document-editor__toolbar' );
                            toolbarContainer.appendChild( editor.ui.view.toolbar.element );
                        } }
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
                 </div> 
            </div>
        );
    }
}

export default RegisterPage;