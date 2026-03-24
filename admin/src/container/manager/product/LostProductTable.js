import React, {useState, useEffect }  from 'react';
import ManagerData from '../../../actions/ManagerData.js';
import { fillterDataInfo ,fillterDataSearch } from '../../../utils/commonUtil.js';
import { DataGrid } from '@material-ui/data-grid';
import {
    Button,
    Divider,
    TextField,
    Select,MenuItem
  } from '@material-ui/core';
  import Swal from 'sweetalert2';
import PropTypes from 'prop-types';
import {exportColumeData,getLstInfoToSearch } from '../../../config/table/ManagerToView.js';
import ButtonOkCancelLayout from '../../../compoment/dialogue/ButtonOkCancelLayout.js';
import DynamicLayout from '../../../compoment/dialogue/DynamicLayout.js';
import ProductCompanySelect from '../../../compoment/form/ProductCompanySelect.js';
import Modal from '../../../compoment/modol/Modal.js';
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../../utils/commonUtil';
import {addOneDataToTable,deleteOneDataToTable} from '../../../api/httpBaseUtil.js'


const LostProductTable =(props) =>{
    const [columns, setDataInfo] = useState([]);
    const [columnsData, setDataInfoData] = useState([]);
    const [dialogue, setDialogueInfo ] = useState(ActionControl.NO_ACTION);
    const [value_fillter, setValueFillter] = useState("");
    const [lstInfoFind, setLstInfoFind] = useState([]);
    const [typeFind, setTypeFind] = useState(0);
    const [dataItem, setDataItem] = useState({});
    const [stateTable, setStateTable] = useState(null);

    useEffect(()  =>  {
        //"image_id","company_id"
        var header = [{view:"content",title:"content",html:TypeDialgueShow.EDIT_TEXT,typeSelect:SelectHTml.NOT_CHECK_HTML,selectTabble:"",selectValidate:""},
                    {view:"number",title:"number",html:TypeDialgueShow.EDIT_TEXT,typeSelect:SelectHTml.NOT_CHECK_HTML,selectTabble:"",selectValidate:"number"},
                    {view:"contain",title:"contain",html:TypeDialgueShow.EDIT_TEXT,typeSelect:SelectHTml.NOT_CHECK_HTML,selectTabble:"",selectValidate:""},
                    {view:"expridate",title:"expridate",html:TypeDialgueShow.EDIT_DATE_TIME,typeSelect:SelectHTml.NOT_CHECK_HTML,selectTabble:"",selectValidate:"date"}];
        var dataDetail = {header:header,value:{content:"",number:0,contain:"",expridate:""}};
        setStateTable(dataDetail);
        setDataItem({content:"",number:0,contain:"",expridate:"",image_id:0,product_id:0});
        var infoView= exportColumeData('product_lost',onDeleteData);

        setDataInfo(infoView);

        setLstInfoFind(getLstInfoToSearch('product_lost'));
        ManagerData.getLstDataPromise('product_lost').then(()=>{
            setTimeout(()=>{
                setDataInfoData(ManagerData.getTable("product_lost"));
            },200);
        });
        ManagerData.initdialogueCustomization('product_lost');
        ManagerData.dataInput ={};
    }, []);
    const callBackEdit = (type) => {
        console.log(".............changeState",type);
        setDialogueInfo(type);
    }

    const handleRowSelectBox = (e) => {
        console.log("handleRowSelectBox",e);
        ManagerData.dialogueCustomizationSave.lstSelect = e;
        setDataItem(e);
    }

    const handleRowSelection = (e) => {
        console.log("handleRowSelection",e);
        ManagerData.dataInput = e.row;
        setDataItem(e.row);
    }
    const onChangeProduct = (image_id,company_id) => {
        var data = dataItem;
        data['image_id'] = image_id; //image_id:0,company_id
        data['company_id'] = company_id;
        setDataItem((prev) => ({
            ...prev,
            image_id: image_id,
            company_id:company_id
          }));
    }
    const onChange = (value,type) => {
        var data = dataItem;
        data[type] = value;
        console.log("onChange",value,type,dataItem);
        setDataItem((prev) => ({
            ...prev
          }));
    }
    const handleClose=()=>{ 
        setDialogueInfo(ActionControl.NO_ACTION);
    }
    const filterTextChange=(e)=>{
        //this.setState({ value_fillter: infoText});
        setValueFillter(e.target.value);
        setDataInfoData(fillterDataInfo(e.target.value,ManagerData.getTable("product_lost"),columns));
    }

    const onFindData=()=>{
        var fieldToFind =  fillterDataSearch(typeFind,lstInfoFind,value_fillter);
        if(fieldToFind == null) return;
        ManagerData.getLstDataPromise("product_lost",fieldToFind)
        .then((data)=>{
            setDataInfoData(ManagerData.getTable("product_lost"));
        });
    }

    const onAddData = async ()=>{
        handleClose();
        await addOneDataToTable("product_lost",dataItem);
        ManagerData.getLstDataPromise('product_lost').then(()=>{
            setTimeout(()=>{
                setDataInfoData(ManagerData.getTable("product_lost"));
            },200);
        });

    }
    const onDeleteData=()=>{
        handleClose();
        console.log("handleRowSelectBox ......................",dataItem);
        setTimeout(()=>{
            Swal.fire({
                title: 'Bạn chắc chắn xóa chứ'
            }).then((result)=>{
                if (result.isConfirmed) 
                    deleteOneDataToTable("product_lost",ManagerData.dataInput).then(()=>{
                        ManagerData.getLstDataPromise('product_lost').then(()=>{
                            setDataInfoData(ManagerData.getTable("product_lost"));
                        });
                    });
            });
        });
        
       
    }

    return (
        <div className="user-data">
            <div className="filter-box-search">
                    <TextField variant="outlined"  
                        value={value_fillter}  
                        className="text-box-search"
                        size="small" 
                        onChange={(event) => {filterTextChange(event);}} />
                    <label  className="text-box-search">
                    Lựa chọn
                    </label>
                    <Select
                        value={typeFind}
                        style ={{width:  120 ,fontSize: 20 }}
                        onChange={(event) => {setTypeFind(event.target.value); }}
                    >
                       {lstInfoFind.map((vars) => (
                            <MenuItem value={vars.id} key={vars.id}>
                            {vars.headerName}
                            </MenuItem>)
                        )}
                    </Select>
                    <Button 
                        variant="outlined" 
                        component="label" 
                        className="text-box-search"
                        disableElevation
                        onClick={()=>{onFindData();}} >
                        tìm kiếm
                    </Button>

                    <Button 
                        variant="outlined" 
                        component="label" 
                        disableElevation
                        onClick={()=>{callBackEdit(ActionControl.ACTION_ADD)}} >
                        Thêm mới
                    </Button>
            </div>
            <div style={{ height: 400, width: "100%" }}>
                <DataGrid
                    height={400}
                    autoHeight
                    rows={columnsData} 
                    columns={columns}
                    className={"table-table"}
                    checkboxSelection={true}
                    onSelectionModelChange={(val) =>handleRowSelectBox(val)}
                    onRowClick={(val) =>handleRowSelection(val)}
                />
            </div>
            {dialogue==ActionControl.ACTION_DELETE?
                <Modal title={'Xóa dữ liệu'} dataInput={ManagerData.dialogueCustomizationSave.dataInput} open={true} onClose={handleClose} className="enterprise-form1" >
                    <Divider />
                    <ButtonOkCancelLayout onChange={onDeleteData} handleClose={handleClose}/>
                </Modal>
                :"" 
            }
            {dialogue==ActionControl.ACTION_UPDATE&&stateTable!=null?
                <Modal title={'Sửa dữ liệu'} dataInput={ManagerData.dialogueCustomizationSave.dataInput} open={true} onClose={handleClose} className="enterprise-form1" >
                    <Divider />
                        Chức năng này không khả dụng    
                    <Divider />
                    <ButtonOkCancelLayout onChange={handleClose} handleClose={handleClose}/>
                </Modal> : ""
            }
            {dialogue==ActionControl.ACTION_ADD&&stateTable!=null?  
                <Modal title={'Thêm dữ liệu'} open={true} onClose={handleClose} className="enterprise-form1" >
                    <Divider />
                        <ProductCompanySelect image_id={dataItem.image_id===undefined?0:dataItem.image_id} onChange={onChangeProduct} />
                        <DynamicLayout state={stateTable} onchangeValue={onChange} data={dataItem} />    
                    <Divider />
                    <ButtonOkCancelLayout onChange={onAddData} handleClose={handleClose}/> 
                </Modal>
                :
                ""
            }
            

        </div>
    );
};

//
export default LostProductTable;