
import React, { Component } from 'react';
import ManagerData from '../../actions/ManagerData.js'
import { DataGrid } from '@material-ui/data-grid';
import {
    Button,
    TextField,
    Select,MenuItem
  } from '@material-ui/core';

import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import PropTypes from 'prop-types';
import {exportColumeData,getLstInfoToSearch } from '../../config/table/ManagerToView.js';
import DeleteDialogue from '../dialogue/DeleteDialogue.js';
import EditNomalDialogue from '../dialogue/EditNomalDialogue.js';
import AddNomalDialogue from '../dialogue/AddNomalDialogue.js';
import { fillterDataInfo ,fillterDataSearch } from '../../utils/commonUtil.js';
import Pagination from '../pagination/index.js';

import {ActionControl} from '../../utils/commonUtil';

class TableDataView extends Component {
    static propTypes = {
        selectChange: PropTypes.func.isRequired,
        table: PropTypes.string.isRequired,
    };
    constructor(props) {
        super(props);
        this.state = {
            columns: [],
            data:[],
            refesh:false,
            table:props.table,
            value_fillter:"",
            dialogueEdit:false,
            dialogueDelete:false,
            dialogueAdd:false,
            hiddenfind:true,
            typeFind:0,
            lstInfoFind:[],
            numberPages:0,
            arrayList:[0],
            location:0
        }
    }
    componentDidMount(){
        const columns = exportColumeData(this.state.table,this.callBackEdit);
        const lstInfoFind = getLstInfoToSearch(this.state.table);
        this.setState({columns: columns,lstInfoFind:lstInfoFind,hiddenfind:true });
        ManagerData.initdialogueCustomization(this.state.table);
        ManagerData.getLstDataPromise(this.state.table,{startPage:0,endPage:1000})
        .then((data)=>{
            setTimeout(()=>{
                this.setState({ data: data,columns: columns,lstInfoFind:lstInfoFind ,hiddenfind:false  });
            },200);
                
        });
        var numberData =1;
        ManagerData.getNumberDataTableDetail(this.state.table)
        .then((data)=>{
            numberData = numberData + ManagerData.lstData[this.state.table]['numberPage'];
            numberData= numberData;
            var listArray = [];
            var count =0;
            for(var i=numberData;i>0;i=i-1000){
                listArray.push(count);
                count++;
            }
            this.setState({ numberPages:numberData ,arrayList:listArray});
        });
    }

    handleSelectPages = (location) => {
        ManagerData.getLstDataPromise(this.state.table,{startPage:location*1000,endPage:1000}) 
        .then((data)=>{
            setTimeout(()=>{
                this.setState({ data:data,location:location});
            },200);
        });
    }

    callBackEdit = (type) => {
        console.log(".............changeState",type);
        if(ActionControl.ACTION_ADD==type)  this.setState({ dialogueAdd:true});
        if(ActionControl.ACTION_UPDATE==type)  this.setState({ dialogueEdit:true});
        if(ActionControl.ACTION_DELETE==type)  this.setState({ dialogueDelete:true});
        
    }

    handleRowSelectBox = (e) => {
        console.log("handleRowSelectBox",e);
        ManagerData.dialogueCustomizationSave.lstSelect = e;
    }

    handleRowSelection = (e) => {
        console.log("handleRowSelection",e);
        ManagerData.dialogueCustomizationSave.dataInput = e.row;
        if(this.props.selectChange!=undefined){
           return this.props.selectChange(e.row);
        } 
    }
    handleClose=()=>{ 
        this.setState({
            dialogueEdit:false,
            dialogueDelete:false,
            dialogueAdd:false
        });
        this.setState({ 
            data: ManagerData.getTable(this.state.table)
        });
    }

    filterTextChange=(e)=>{
        console.log("filterTextChange",e);
        var infoText = e.target.value;
        this.setState({ value_fillter: infoText});
        this.setState({ data: fillterDataInfo(infoText,ManagerData.getTable(this.state.table),this.state.columns)});
    }
    onFindData=()=>{
        var fieldToFind =  fillterDataSearch(this.state.typeFind,this.state.lstInfoFind,this.state.value_fillter);
        if(fieldToFind == null) return;
        ManagerData.getLstDataPromise(this.state.table,fieldToFind)
        .then((data)=>{
          this.setState({ data: ManagerData.getTable(this.state.table),
          });
        });
    }
// rowHeight={125}
    render() {
        return (
            <div className="user-data">
                <div className="filter-box-search">
                        <TextField variant="outlined"  
                            value={this.state.value_fillter}  
                            className="text-box-search"
                            size="small" 
                            onChange={(event) => {this.filterTextChange(event);}} />
                        <label  className="text-box-search">
                        Lựa chọn
                        </label>
                        <Select
                            value={this.state.typeFind}
                            style ={{width:  120 ,fontSize: 20 }}
                            onChange={(event) => {
                                this.setState({ typeFind: event.target.value});
                            }}
                        >
                           {this.state.lstInfoFind.map((vars) => (
                                <MenuItem value={vars.id} key={vars.id}>
                                {vars.headerName}
                                </MenuItem>)
                            )}
                        </Select>
                        <Button 
                            variant="outlined" 
                            component="label" 
                            className= { "box-button-common " + (this.state.hiddenfind?" hidden-button":"") }
                            disableElevation
                            onClick={()=>{this.onFindData()}} >
                            tìm kiếm
                        </Button>

                        <Button 
                            variant="outlined" 
                            component="label" 
                            className="box-button-common"
                            disableElevation
                            onClick={()=>{this.callBackEdit(ActionControl.ACTION_ADD)}} >
                            Thêm mới
                        </Button>
                </div>
                <div style={{ height: 440, width: "100%" }}>
                    {!this.state.hiddenfind?
                        <DataGrid
                            height={400}
                            rows={this.state.data} 
                            columns={this.state.columns}
                            className={"table-table"}
                            checkboxSelection={false}
                            onSelectionModelChange={(val) =>this.handleRowSelectBox(val)}
                            onRowClick={(val) =>this.handleRowSelection(val)}
                        />:""}
                </div>
                <div>
                <Pagination
                        totalPages =  {this.state.arrayList.length}
                        handerPages={(pages_info)=>this.handleSelectPages(pages_info-1)}
                        inputPages = {this.state.location+1}
                    />
                </div>
                {this.state.dialogueDelete?
                    <DeleteDialogue
                        table={this.state.table}
                        dataInput={ManagerData.dialogueCustomizationSave.dataInput}
                        handleClose={()=>{this.handleClose()}}
                    />
                    :
                    ""
                }
                {this.state.dialogueEdit?
                    <EditNomalDialogue
                        table={this.state.table}
                        dataInput={ManagerData.dialogueCustomizationSave.dataInput}
                        handleClose={()=>{this.handleClose()}}
                     />
                    :
                    ""
                }
                {this.state.dialogueAdd?
                    <AddNomalDialogue
                        table={this.state.table}
                        dataInput={ManagerData.dialogueCustomizationSave.dataInput}
                        handleClose={()=>{this.handleClose()}}
                     />
                    :
                    ""
                }

            </div>
        );
    }
}
//AddNomalDialogue
export default TableDataView;