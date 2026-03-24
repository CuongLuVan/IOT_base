
import React, { useState } from 'react';
import {
    FormControl,
    Button,
    InputLabel,
    MenuItem,
    Select,
    TextField
  } from '@material-ui/core';
import PublishIcon from '@material-ui/icons/Publish';
import { uploadfileDataImageAdmin } from '../../api/httpBaseUtil.js';
import Swal from 'sweetalert2';
import {HOST_IMG}  from '../../config/config.js';

const UploadImage = ({ urlImage, uploadfileDataLink }) => {
        const [state, setState] = useState({link:urlImage});
        console.log("urlImage: " + urlImage);
        const uploadImageData=(event)=>{
            console.log("Content: " + event);
            event.preventDefault();
            const data = new FormData() 
            data.append('file', event.target.files[0]);    
            uploadfileDataImageAdmin(data).then((response)=>{
                Swal.fire("Cập nhật thông tin thành công");
                setState({ link:response.url});
                uploadfileDataLink(response.url);
            });
        }

        return (
            <Button variant="outlined" component="label" disableElevation style={{width:200,height: 60}}>
                <PublishIcon />
                <label style={{fontSize:8,lineHeight: 1.6 ,height: 30}}>Upload Ảnh</label>  
                <input type="file" 
                        name="fileUpload1"
                        id="fileUpload1"
                        accept=".png,.jpg,.jpeg"
                        onChange={(event)=> {uploadImageData(event)}}
                        hidden />
                <img  src={HOST_IMG+state.link}  height="60px" />
            </Button>
        );
}

export default UploadImage;

