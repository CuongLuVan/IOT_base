
import React, { Component } from 'react';
import ManagerData from '../../actions/ManagerData.js'
import { DataGrid } from '@material-ui/data-grid';
import {
    Button,
    Divider,
    TextField,
    Select,MenuItem
  } from '@material-ui/core';
import Spellcheck from '@material-ui/icons/Spellcheck';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import PropTypes from 'prop-types';
import {exportColumeData,getLstInfoToSearch } from '../../config/table/ManagerToView.js';
import {  getLstApproved,setDataApproved ,setDataApprovedCompany} from '../../api/httpBaseUtil';
import Modal from '../../compoment/modol/Modal.js';


import {ActionControl} from '../../utils/commonUtil';

class CustomerApproval extends Component {
    constructor(props) {
        super(props);
        this.state = {
            columns: [],
            data:[],
            refesh:false,
            table:"customer_approved",
            value_fillter:"",
            dialogue:false,
            hiddenfind:true,
            typeFind:0,
            lstInfoFind:[]
        }
    }
    componentDidMount(){
        const columns =  [
                            {   field: 'id',headerName: 'stt',flex:1},
                            {   field: 'username', headerName: 'tên tài khoản', flex:1},
                            {   field: 'email', headerName: 'email',flex:1 },
                            {   field: 'address', headerName: 'Địa chỉ',flex:1 },
                            {   field: 'companyname', headerName: 'Công ty',flex:1},  
                            {   field: 'action', headerName: 'Chấp thuận',flex:1,
                                renderCell: () => (
                                    <div> <span onClick={(e) =>this.callBackEdit(e)}><Spellcheck /></span></div>
                                ),
                            }
                        ]; 
        this.setState({columns: columns,lstInfoFind:[],hiddenfind:true });
        ManagerData.initdialogueCustomization(this.state.table);
        this.setState({ data: [],columns: columns,hiddenfind:false  });
        setTimeout(()=>{
            this.getAllInfoCompanyAproved();
        },200);  
       
    }

    callBackEdit = (type) => {
        console.log(".............changeState",type);
        setTimeout(()=>{
            this.setState({ dialogue: true  });
        },500);
    }
    setDataApproved=(index)=>{
        let that= this;
        var dataInfo = JSON.parse(JSON.stringify( ManagerData.dialogueCustomizationSave.dataInput));
        if(index<0){
            delete dataInfo["lstCompany"];
            setDataApproved(dataInfo).then(()=>{
                that.setState({ dialogue:false  });
                let that1= that;
                setTimeout(()=>{
                    that1.getAllInfoCompanyAproved();
                },200);  
            });
        }   
        else
        {
            dataInfo = JSON.parse(JSON.stringify( ManagerData.dialogueCustomizationSave.dataInput.lstCompany[index]));
            setDataApprovedCompany(dataInfo).then(()=>{
                that.setState({ dialogue:false  });
                let that1= that;
                setTimeout(()=>{
                    that1.getAllInfoCompanyAproved();
                },200);  
            });
        } 
    }

    getAllInfoCompanyAproved=()=>{
        getLstApproved()
            .then((data)=>{
                var useList=[];
                var stt =0;
                for (var i = 0; i < data.data.result.length; i++){
                    let item= data.data.result[i];
                    let indexInfo = useList.findIndex(o=>o.customer_id==item.customer_id);
                    
                    if(indexInfo>-1){
                        if(item.deleteflag==2)
                            useList[indexInfo].lstCompany.push(JSON.parse(JSON.stringify(item)));
                    }
                    else
                    {
                        item.id = stt+1;
                        item.lstCompany=[];
                        if(item.deleteflag==2)
                            item.lstCompany.push(JSON.parse(JSON.stringify(item)));
                        useList.push(item);
                        stt= stt+1;
                    }
                } 
                this.setState({ data: useList,hiddenfind:false  });     
            });
    }

    handleRowSelectBox = (e) => {
        console.log("handleRowSelectBox",e);
        ManagerData.dialogueCustomizationSave.lstSelect = e;
    }

    handleRowSelection = (e) => {
        console.log("handleRowSelection",e);
        ManagerData.dialogueCustomizationSave.dataInput = e.row;
    }

// rowHeight={125}
    render() {
        let headerData = ["email","fullname","username","phone","address"];
        let headerData1 = ["companyname","company_phone","company_adresss"];
        let headerName = ["email","Họ và tên","Acao","Số điện thoại","Địa chỉ"];
        let headerName1 = ["Tên công ty","Số điện thoại công ty","Địa chỉ công ty"];
        return (
            <div className="user-data">
                <div className="filter-box-search">
                    <h3>Cấp quyền cho doanh nghiệp </h3>    
                </div>
                <div style={{ height: 400, width: "100%" }}>
                    {!this.state.hiddenfind?
                        <DataGrid
                            height={400}
                            autoHeight
                            rows={this.state.data} 
                            columns={this.state.columns}
                            className={"table-table"}
                            checkboxSelection={true}
                            onSelectionModelChange={(val) =>this.handleRowSelectBox(val)}
                            onRowClick={(val) =>this.handleRowSelection(val)}
                        />:""}
                </div>
                {this.state.dialogue?
                    <div>
                        <Modal
                            title={'Tông tin người dùng'}
                            open={true}
                            onClose={()=>{ this.setState({ dialogue: false  });}}
                            className="enterprise-form1"
                        >
                            <Divider />
                            <div  className='test-main-info'>
                                <img style={{margin: 10}} src={ManagerData.dialogueCustomizationSave.dataInput["avatar"]} width="100px" height="100px" />
                                {headerData.map((vars,index) =>
                                    <div className='text-info-layout'>
                                            <TextField variant="outlined"
                                                label={headerName[index]} className="enterprise-form1"
                                                value={ManagerData.dialogueCustomizationSave.dataInput[vars]}
                                            />
                                    </div>
                                )}
                               
                            </div>
                            <Divider />
                            {ManagerData.dialogueCustomizationSave.dataInput["companyname"]!==null?
                                ManagerData.dialogueCustomizationSave.dataInput.lstCompany.map((info,indexInfo)=>
                                    <div>
                                         <Divider />
                                        <div  className='test-main-info'>
                                            <Divider />
                                            <img style={{margin: 10}} src={info["icon_company"]} width="100px" height="100px" />
                                            {headerData1.map((vars,index) =>
                                                <div className='text-info-layout'>
                                                        <TextField variant="outlined"
                                                            label={headerName1[index]} className="enterprise-form1"
                                                            value={info[vars]}
                                                        />
                                                </div>
                                            )}
                                            <Divider />
                                        </div>
                                        <Divider />
                                        <div style={{textAlign: "center"}}>
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                className={'margin-right-account1 button-info-layout'}
                                                onClick={()=>{this.setDataApproved(indexInfo)}}
                                            >
                                                Xác nhận
                                            </Button>
                                        </div>
                                    </div>
                                )

                            :""}
                           
                            
                            <Divider />
                            <div className={'action-account1'}>
                                <Button
                                    color="primary"
                                    variant="outlined"
                                    className={'margin-right-account'}
                                    onClick={()=>{ this.setState({ dialogue: false  });}}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    className={'margin-right-account1 button-info-layout'}
                                    onClick={()=>{this.setDataApproved(-1)}}
                                >
                                    Xác nhận
                                </Button>
                            </div>
                        </Modal>


                    </div>

                    :
                    ""
                }
                

            </div>
        );
    }
}
//AddNomalDialogue
export default CustomerApproval;