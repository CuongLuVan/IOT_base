
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
import { registerServicePageToWriter ,updateServicePageToWriter} from '../../../api/httpBaseUtil.js';
import '../../../config/config.js'
import { HOST_HTTP } from '../../../config/config.js';
import PropTypes from 'prop-types';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';
import {MyCustomUploadAdapterPlugin} from '../../../api/uploadAdatapter.js';
import {providers} from '../../../compoment/editor/videoProviders';


class AddServiceStep2 extends Component {
    static propTypes = {
        sendTemplate: PropTypes.func.isRequired,
        product: PropTypes.array.isRequired,
        isNew: PropTypes.bool.isRequired,
        content_html:PropTypes.string.isRequired,
    };
    constructor(props) {
        super(props);
        this.state = {
            service_pages_id:this.props.isNew?0:this.props.product.service_pages_id,
            service_group_id:this.props.isNew?0:this.props.product.service_group_id,
            filesave:"",
            content_html:this.props.content_html,
            lst_service:this.props.isNew?[]:[this.props.product]
        }
    }
    componentDidMount(){
        if(this.props.isNew){
            this.setState({lst_service:ManagerData.getTable('service_group')});
        }     
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
        formData.service_pages_id= this.state.service_pages_id;
        formData.service_group_id= this.state.service_group_id;
        formData.filesave= this.state.filesave;
        formData.content_html= this.state.content_html;
        formData.is_postPages=true;
        if(this.props.isNew){
            registerServicePageToWriter(formData).then((response)=>{
                Swal.fire("Cập nhật thông tin thành công");
                if(!!this.props.sendTemplate){
                    this.props.sendTemplate();
                }
            });
        }
        else
        {
            updateServicePageToWriter(formData).then((response)=>{
                Swal.fire("Cập nhật thông tin thành công");
                if(!!this.props.sendTemplate){
                    this.props.sendTemplate();
                }
            });
        } 
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
                <div className={'row-register'} >
                    Dịch vụ : 
                    <Select
                            className={'select-product'} 
                            value={this.state.service_group_id}
                            onChange={(event) => {this.setState({ service_group_id: event.target.value}); }}
                            >
                            {this.state.lst_service.map((vars) => (
                                <MenuItem value={vars.service_group_id} key={vars.service_group_id}>
                                    {vars.title}
                                </MenuItem>)
                            )}
                    </Select>
                    <Button variant="outlined" component="label" disableElevation
                         style={{width:135, height:30, color: "blue",marginLeft:40 }}
                                    onClick={()=>{this.saveContentPageToDataBase()}}
                        >
                              {"Đăng bài"}
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
                            }}
                        onChange={ ( event, editor ) => {
                            const data = editor.getData();
                            this.onChange(data);
                        } }
                    />
                 </div> 
            </div>
        );
    }
}

export default AddServiceStep2;