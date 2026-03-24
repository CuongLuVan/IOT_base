import React, {useState, useEffect }  from 'react';
import ManagerData from '../../../actions/ManagerData.js';
import { fillterDataInfo ,fillterDataSearch } from '../../../utils/commonUtil.js';
import { DataGrid } from '@material-ui/data-grid';
import {
    Button,
    TextField,
    Select,MenuItem
  } from '@material-ui/core';
  import {ActionControl} from '../../../utils/commonUtil';
import EditIcon from '@material-ui/icons/Edit';
import DesktopWindows from '@material-ui/icons/DesktopWindows';
import DeleteIcon from '@material-ui/icons/Delete';
import PropTypes from 'prop-types';
import {exportColumeData,getLstInfoToSearch } from '../../../config/table/ManagerToView.js';
import DeleteDialogue from '../../../compoment/dialogue/DeleteDialogue.js';
import EditNomalDialogue from '../../../compoment/dialogue/EditNomalDialogue.js';
import AddNomalDialogue from '../../../compoment/dialogue/AddNomalDialogue.js';
import BillInfoDialogue from './BillInfoDialogue.js';


const BuyProductTable =(props) =>{
    const [columns, setDataInfo] = useState([]);
    const [columnsData, setDataInfoData] = useState([]);
    const [dialogue, setDialogueInfo ] = useState(ActionControl.NO_ACTION);
    const [value_fillter, setValueFillter] = useState("");
    const [lstInfoFind, setLstInfoFind] = useState([]);
    const [typeFind, setTypeFind] = useState(0);
    const [infoTheBill, setInfoTheBill] = useState(false);
    

    useEffect(()  =>  {
            var infoView= exportColumeData('product_buy',callBackEdit);
            infoView.push({
                field: 'bill',
                headerName: 'Trạng Thái',
                flex:1,
                renderCell: () => (
                  <div>
                    <span onClick={() => {setInfoTheBill(true); }}>
                    <DesktopWindows />
                    </span>
                  </div>
                ),
            });
            setDataInfo(infoView);
            setLstInfoFind(getLstInfoToSearch('product_buy'));
            ManagerData.getLstDataPromise('product_buy').then(()=>{
                var  dataInfo = ManagerData.getTable("product_buy");
                dataInfo.map((item)=>{
                    if(item.sale_name==null||item.sale_name==""){
                        item.sale_name = "Chưa chỉ định";
                    }
                });
                setDataInfoData(dataInfo);
            });
            ManagerData.initdialogueCustomization('product_buy');
        
    }, []);
    const callBackEdit = (type) => {
        console.log(".............changeState",type);
        setDialogueInfo(type);
    }

    const handleRowSelectBox = (e) => {
        console.log("handleRowSelectBox",e);
        ManagerData.dialogueCustomizationSave.lstSelect = e;
    }

    const handleRowSelection = (e) => {
        console.log("handleRowSelection",e);
        ManagerData.dialogueCustomizationSave.dataInput = e.row;
        
    }
    const handleClose=()=>{ 
        setDialogueInfo(ActionControl.NO_ACTION);
        setInfoTheBill(false);
        setDataInfoData(ManagerData.getTable("product_buy"));
    }
    const filterTextChange=(e)=>{
        //this.setState({ value_fillter: infoText});
        setValueFillter(e.target.value);
        setDataInfoData(fillterDataInfo(e.target.value,ManagerData.getTable("product_buy"),columns));
    }

    const onFindData=()=>{
        var fieldToFind =  fillterDataSearch(typeFind,lstInfoFind,value_fillter);
        if(fieldToFind == null) return;
        ManagerData.getLstDataPromise("product_buy",fieldToFind)
        .then((data)=>{
            setDataInfoData(ManagerData.getTable("product_buy"));
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
                <DeleteDialogue
                    table={"product_buy"}
                    dataInput={ManagerData.dialogueCustomizationSave.dataInput}
                    handleClose={()=>{handleClose()}}
                />
                :
                ""
            }
            {dialogue==ActionControl.ACTION_UPDATE?
                <EditNomalDialogue
                    table={"product_buy"}
                    dataInput={ManagerData.dialogueCustomizationSave.dataInput}
                    handleClose={()=>{handleClose()}}
                 />
                :
                ""
            }
            {dialogue==ActionControl.ACTION_ADD?
                <AddNomalDialogue
                    table={"product_buy"}
                    dataInput={ManagerData.dialogueCustomizationSave.dataInput}
                    handleClose={()=>{handleClose()}}
                 />
                :
                ""
            }
            {infoTheBill? <BillInfoDialogue
                    dataInput={ManagerData.dialogueCustomizationSave.dataInput}
                    handleClose={()=>{handleClose()}}
                 />:""}

        </div>
    );
};
export default BuyProductTable;
