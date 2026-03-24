
import React, { useState ,useEffect } from 'react';
import {
    FormControl,
    Button,
    InputLabel,
    MenuItem,
    Select,
    TextField
  } from '@material-ui/core';
import PublishIcon from '@material-ui/icons/Publish';
import Swal from 'sweetalert2';
import {HOST_HTTP}  from '../../config/config.js';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import Modal from '../modol/Modal.js';
import ManagerData from '../../actions/ManagerData.js'
import { DataGrid } from '@material-ui/data-grid';
import EditIcon from '@material-ui/icons/Edit';
import CheckBox from '@material-ui/icons/CheckBox';

function getColumeShow(){
    const columns = [
        {
            field: 'id',
            headerName: 'stt',
            width: 100,
        },
        {
            field: 'title',
            headerName: 'Tên ',
            width: 200,
        },
    ];
    return columns;
}

const SelectPages = ({id, onChange,handleClose }) => {
        const [state, setState] = useState({advertisement_id:0,
                                        group_content_sub_id:0,group_file:"",filesave:"",
                                        title:"",content:"",content_img:"",set_to_fist:0});
        const [listItem, getListItem] = useState(false);                                
        const [lstAdvertisement, setAdvertisement] = useState([]);
        const [findItem, setFindItem] = useState("");

        useEffect(() => {
            setState((prev) => ({ ...prev, advertisement_id: id })); 
            ManagerData.getLstDataPromise('advertisement_content').then(()=>{
                setAdvertisement(ManagerData.getTable('advertisement_content'));
            });
        }, []);

       
        const handleRowSelectBox = (e) => {
            console.log("handleRowSelectBox",e);
        }

        const handleRowSelection = (e) => {
            console.log("handleRowSelection....",e.row.advertisement_id);
            setState(e.row);
            onChange(e.row.advertisement_id,e.row.title);
        }


        const findName = () => {
            ManagerData.getLstDataPromise('advertisement_content',{dataFind:{title:findItem}}).then(()=>{
                setAdvertisement(ManagerData.getTable('advertisement_content'));
            });
        }

        

        return (
            <Modal
                title={'Chọn trang : ' +state.title}
                open={true}
                onClose={handleClose}
                className="enterprise-form1"
            >
                <br/>
                {state.content}
                <br/>
                <Button variant="contained" 
                    onClick={()=>{getListItem(true);}}
                    disableElevation color="primary">
                    {" chọn bải báo"}
                </Button> 
                vs
                <Button variant="contained" 
                    onClick={()=>{ window.open("./#/advertisementPages", '_blank').focus(); }}
                    disableElevation color="primary">
                    {state.advertisement_id==0? "Tạo bài báo mới":" Sửa bài báo"}
                </Button> 
                <br/>
                <div>
                    {listItem?
                        <div className="user-data">
                            <div>
                            <TextField variant="outlined"  
                                value={findItem}  
                                onChange={(e) => {setFindItem(e.target.value);}} />
                            <Button 
                                variant="outlined" 
                                component="label" 
                                disableElevation
                                onClick={(e)=>{findName();}} >
                                Lọc
                            </Button>
                            </div>
                            <br/>
                            <div style={{ height: 400, width: "100%" }}>
                                <DataGrid
                                    height={400}
                                    rows={lstAdvertisement} 
                                    columns={getColumeShow()}
                                    className={"table-table"}
                                    checkboxSelection={true}
                                    onSelectionModelChange={(val) =>handleRowSelectBox(val)}
                                    onRowClick={(val) =>handleRowSelection(val)}
                                />
                            </div>
                        </div>
                        :
                        ""
                    }
                </div>
            </Modal>  
        );
}

export default SelectPages;

