
import React, { Component } from 'react';
import ManagerData from '../../actions/ManagerData.js'
import { DataGrid } from '@material-ui/data-grid';
import {
    Button,
    TextField,
    Select,MenuItem
  } from '@material-ui/core';

import PropTypes from 'prop-types';
import {exportColumeData,getLstInfoToSearch } from '../../config/table/ManagerToView.js';
import DeleteDialogue from '../dialogue/DeleteDialogue.js';
import EditNomalDialogue from '../dialogue/EditNomalDialogue.js';
import AddNomalDialogue from '../dialogue/AddNomalDialogue.js';
import { fillterDataInfo ,fillterDataSearch } from '../../utils/commonUtil.js';
import Pagination from '../pagination/index.js';

import {ActionControl} from '../../utils/commonUtil';

// Paged table with search and add / edit / delete dialogues.
// pageSize: rows per page; getFilter: () => dataFind sent with every page request (or null).
class TableDataView extends Component {
    static propTypes = {
        selectChange: PropTypes.func,
        table: PropTypes.string.isRequired,
        pageSize: PropTypes.number,
        getFilter: PropTypes.func,
    };
    static defaultProps = {
        pageSize: 1000,
        getFilter: () => null,
    };
    constructor(props) {
        super(props);
        this.state = {
            columns: [],
            data:[],
            table:props.table,
            value_fillter:"",
            dialogueEdit:false,
            dialogueDelete:false,
            dialogueAdd:false,
            hiddenfind:true,
            typeFind:0,
            lstInfoFind:[],
            totalPages:1,
            location:0
        }
    }

    componentDidMount(){
        this._mounted = true;
        const columns = exportColumeData(this.state.table,this.callBackEdit);
        const lstInfoFind = getLstInfoToSearch(this.state.table);
        this.setState({columns: columns,lstInfoFind:lstInfoFind,hiddenfind:true });
        ManagerData.initdialogueCustomization(this.state.table);
        this.handleSelectPages(0);
        const filter = this.props.getFilter();
        ManagerData.getNumberDataTableDetail(this.state.table, filter ? {dataFind: filter} : undefined)
        .then(()=>{
            // Same count as before: one extra row, at least one page.
            const numberData = 1 + ManagerData.lstData[this.state.table]['numberPage'];
            this.safeSetState({ totalPages: Math.max(1, Math.ceil(numberData / this.props.pageSize)) });
        })
        .catch((error)=>console.error("Count failed", this.state.table, error));
    }

    componentWillUnmount(){
        this._mounted = false;
    }

    safeSetState(state){
        if (this._mounted) this.setState(state);
    }

    // location: page index from 0. Requests answered out of order are ignored.
    handleSelectPages = (location) => {
        const pageSize = this.props.pageSize;
        const filter = this.props.getFilter();
        const request = Object.assign(filter ? {dataFind: filter} : {}, {startPage:location*pageSize,endPage:pageSize});
        const requestId = (this._requestId || 0) + 1;
        this._requestId = requestId;
        return ManagerData.getLstDataPromise(this.state.table,request)
        .then((data)=>{
            if (requestId !== this._requestId) return;
            this.safeSetState({ data:data,location:location,hiddenfind:false });
        })
        .catch((error)=>{
            console.error("Load page failed", this.state.table, error);
            this.safeSetState({ hiddenfind:false });
        });
    }

    callBackEdit = (type) => {
        if(ActionControl.ACTION_ADD==type)  this.setState({ dialogueAdd:true});
        if(ActionControl.ACTION_UPDATE==type)  this.setState({ dialogueEdit:true});
        if(ActionControl.ACTION_DELETE==type)  this.setState({ dialogueDelete:true});
    }

    handleRowSelectBox = (e) => {
        ManagerData.dialogueCustomizationSave.lstSelect = e;
    }

    handleRowSelection = (e) => {
        ManagerData.dialogueCustomizationSave.dataInput = e.row;
        if(this.props.selectChange!=undefined){
           return this.props.selectChange(e.row);
        }
    }

    // After add / edit / delete: reload the current page with the table's filter.
    handleClose=()=>{
        this.setState({
            dialogueEdit:false,
            dialogueDelete:false,
            dialogueAdd:false
        });
        this.handleSelectPages(this.state.location);
    }

    filterTextChange=(e)=>{
        var infoText = e.target.value;
        this.setState({
            value_fillter: infoText,
            data: fillterDataInfo(infoText,ManagerData.getTable(this.state.table),this.state.columns),
        });
    }
    onFindData=()=>{
        var fieldToFind =  fillterDataSearch(this.state.typeFind,this.state.lstInfoFind,this.state.value_fillter);
        if(fieldToFind == null) return;
        this._requestId = (this._requestId || 0) + 1;
        ManagerData.getLstDataPromise(this.state.table,fieldToFind)
        .then(()=>{
          this.safeSetState({ data: ManagerData.getTable(this.state.table) });
        })
        .catch((error)=>console.error("Search failed", this.state.table, error));
    }

    renderDialogue(Dialogue, open){
        if (!open) return "";
        return (
            <Dialogue
                table={this.state.table}
                dataInput={ManagerData.dialogueCustomizationSave.dataInput}
                handleClose={this.handleClose}
            />
        );
    }

    render() {
        return (
            <div className="user-data">
                <div className="filter-box-search">
                        <TextField variant="outlined"
                            value={this.state.value_fillter}
                            className="text-box-search"
                            size="small"
                            onChange={this.filterTextChange} />
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
                            onClick={this.onFindData} >
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
                            onSelectionModelChange={this.handleRowSelectBox}
                            onRowClick={this.handleRowSelection}
                        />:""}
                </div>
                <div>
                    <Pagination
                        totalPages =  {this.state.totalPages}
                        handerPages={(pages_info)=>this.handleSelectPages(pages_info-1)}
                        inputPages = {this.state.location+1}
                    />
                </div>
                {this.renderDialogue(DeleteDialogue, this.state.dialogueDelete)}
                {this.renderDialogue(EditNomalDialogue, this.state.dialogueEdit)}
                {this.renderDialogue(AddNomalDialogue, this.state.dialogueAdd)}
            </div>
        );
    }
}

export default TableDataView;
