
import React, { Component } from 'react';
import ManagerData from '../../../actions/ManagerData.js'
import {exportColumeData } from '../../../config/table/ManagerToView.js'
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
import { registerProductPageToWriter ,updateProductPageToWriter} from '../../../api/httpBaseUtil.js';
import '../../../config/config.js'
import { HOST_HTTP } from '../../../config/config.js';
import PropTypes from 'prop-types';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';
import {MyCustomUploadAdapterPlugin} from '../../../api/uploadAdatapter.js';
import {providers} from '../../../compoment/editor/videoProviders';


class RegisterProductPage extends Component {
    static propTypes = {
        handerClose: PropTypes.func.isRequired,
        is_update: PropTypes.bool.isRequired,
        data:PropTypes.array.isRequired,
        content:PropTypes.string.isRequired,
        set_up_product: PropTypes.bool.isRequired,
        
    };
    constructor(props) {
        super(props);
        this.state = {
            product_pages_id:this.props.is_update?this.props.data.product_pages_id :0,
            product_id:this.props.is_update?this.props.data.product_id :0,
            refesh:false,
            filesave:this.props.is_update?this.props.data.filesave :"",
            content_html:this.props.is_update?this.props.content :"",
            lstInfoProduct:[],
        }
    }
    componentDidMount(){
        ManagerData.getLstDataPromise('product').then(()=>{
            if(this.props.set_up_product==0){
                this.setState({lstInfoProduct:ManagerData.getTable('product')});
            }
            else
            {
                this.setState({lstInfoProduct:ManagerData.getTable('product')
                                                .filter(o=>(o.product_id==this.props.set_up_product)),
                                                product_id:this.props.set_up_product});
            }
           
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
        formData.product_pages_id= this.state.product_pages_id;
        formData.product_id= this.state.product_id;
        formData.filesave= this.state.filesave;
        formData.content_html= this.state.content_html;
        formData.is_postPages=true;
        if(!this.props.is_update)
        {
            registerProductPageToWriter(formData).then((response)=>{
                Swal.fire("Cập nhật thông tin thành công");
                if(!!this.props.handerClose){
                    this.props.handerClose();
                }
            });
        }
        else {
            updateProductPageToWriter(formData).then((response)=>{
                Swal.fire("Cập nhật thông tin thành công");
                if(!!this.props.handerClose){
                    this.props.handerClose();
                }
            });
        }
    }
    
    onChangTitle(content){
        console.log("Content: " + content);
        this.setState({ title:content.target.value});
    }
    onChangeContent(content){
        this.setState({lstInfoProduct:ManagerData.getTable('product').filter(o=>o.name.includes(content.target.value))});
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
                <div className={'row-register'} >
                    Tìm kiếm : 
                    <TextField variant="outlined" 
                            className={'register-product'} 
                            inputProps={{style: {height: 30 ,padding:0}}}
                            value={this.state.content}  
                            onChange={(event) => {this.onChangeContent(event);}} />
                    Chọn  sản phẩm : 
                    <Select
                            className={'select-product'} 
                            value={this.state.product_id}
                            onChange={(event) => {this.setState({ product_id: event.target.value}); }}>
                            {this.state.lstInfoProduct.map((vars) => (
                                <MenuItem value={vars.product_id} key={vars.product_id}>
                                    {vars.name}
                                </MenuItem>)
                            )}
                    </Select>
                    <Button variant="outlined" component="label" disableElevation
                         style={{width:135, height:30, color: "blue",marginLeft:40 }}
                                    onClick={()=>{this.saveContentPageToDataBase()}}
                         >
                              {this.props.is_update?"Sửa bài":"Đăng bài"}
                    </Button>

                </div>
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

export default RegisterProductPage;