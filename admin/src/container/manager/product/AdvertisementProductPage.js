
import React, { Component } from 'react';
import ManagerData from '../../../actions/ManagerData';
import {exportColumeData } from '../../../config/table/ManagerToView.js';
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
import { uploadfileDataImage,updatePageToAdvertisement ,registerPageToAdvertisement} from '../../../api/httpBaseUtil.js';
import UploadImage from '../../../compoment/form/UploadImage.js';
import SelectGroupContentSub from '../../../compoment/form/SelectGroupContentSub.js';
import SearchPageData from '../../../compoment/form/SearchPageData.js';
import '../../../config/config.js'
import { HOST_HTTP } from '../../../config/config.js';
import PropTypes from 'prop-types';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';
import {MyCustomUploadAdapterPlugin} from '../../../api/uploadAdatapter.js';
import {providers} from '../../../compoment/editor/videoProviders';

class AdvertisementProductPage extends Component {
    static propTypes = {
        handerClose: PropTypes.func.isRequired,
        is_update: PropTypes.bool.isRequired,
        data:PropTypes.array.isRequired,
        content:PropTypes.string.isRequired,
    };
    constructor(props) {
        super(props);
        this.state = {
            lstProductGroup:[],
            advertisement_id:this.props.is_update?this.props.data.advertisement_id :0,
            filesave:"",
            group_product_id:this.props.is_update?this.props.data.group_product_id :0,
            refesh:false,
            image_head:this.props.is_update?this.props.data.content_img :"",
            title:this.props.is_update?this.props.data.title :"",
            content:this.props.is_update?this.props.data.content :"",
            is_main:this.props.is_update?this.props.data.is_main_pages_id :0,
            content_html:this.props.is_update?this.props.content :"",
            content_img:this.props.is_update?this.props.content_img :"",
            land_image:this.props.is_update?this.props.land_image :"",
            set_to_fist:0,

        }
    }
    componentDidMount(){
        ManagerData.getLstDataPromise('product_group').then(()=>{
            this.setState({ refesh:false,lstProductGroup:ManagerData.getTable('product_group')});
            console.log("componentDidMount......................");
            setTimeout(()=>{
                this.setState({ refesh:true});
            },200);
        });
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
        formData.group_product_id= this.state.group_product_id;
        formData.content_img= this.state.image_head;
        formData.group_file= "group_file";
        formData.filesave= "filesave";
        formData.title= this.state.title;
        formData.content= this.state.content;
        formData.content_html= this.state.content_html;
        formData.advertisement_id= this.state.advertisement_id;
        formData.land_image= this.state.land_image;
        
        formData.is_postPages=false;
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
                            uploadfileDataLink= {(url)=> {this.setState({ image_head:url});}}
                        />
                    </div>
                    <div className={'column-register-right'} >
                        <div className={'dp-i'}>
                            ảnh nền
                            <UploadImage
                                urlImage={this.state.land_image}
                                uploadfileDataLink= {(url)=> {this.setState({ land_image:url});}}
                            />
                        </div>
                        <FormControl variant="outlined" className={'input-pages-register'}>
                            <InputLabel className={'register-label'} shrink id="demo-simple-select-menu1">
                                Chuyên mục 
                            </InputLabel>
                            <Select
                                className={'margin-right-register'}
                                labelId="demo-simple-select-menu1"
                                id="status"
                                value={this.state.group_product_id}
                                onChange={(event) => {
                                    this.setState({ group_product_id:content.target.value});
                                }}
                            >
                                {this.state.lstProductGroup.map((vars) => (
                                    <MenuItem value={vars.product_group_id} key={vars.product_group_id}>
                                    {vars.product_group_content}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button variant="outlined" component="label" disableElevation
                         style={{width:200, color: "blue"}}
                                    onClick={()=>{this.saveContentPageToDataBase()}}
                         >
                              {this.props.is_update?"Sửa Quảng cáo":"Đăng Quảng cáo"}
                        </Button>
                        
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
            </div>
        );
    }
}

export default AdvertisementProductPage;