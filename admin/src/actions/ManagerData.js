import { getallInfoTable,getNumberPageOnTable,getCurUser,httpPostDataAPI }
 from '../api/httpBaseUtil';
 import {ActionControl} from '../utils/commonUtil';


let ManagerData={
    // Filled by FooterChat from the chat server (getInfoClientMqtt).
    mqtt:{isloaded:false, topic_pub:"public", topic_sub:"#public", client:null },
    lstData:{},
    callBackFunc:null,
    saveInfoUser:{},
    infoMachine:{Ipv4:"",ipv6:""},
    dialogueNomalSave:{},
    dialogueCustomizationSave:{},
    // Cache entry of a table, created on first use.
    ensureTable(table){
      if(!ManagerData.lstData[table]) ManagerData.lstData[table] ={data:[], page:0,numberPage:0 ,dataToFindMain:{}};
      return ManagerData.lstData[table];
    },
    checkTableInfoUpdate(table,data){
      ManagerData.ensureTable(table).data = data;
    },
    getTable(table){
      return ManagerData.ensureTable(table).data;
    },
    setNumberPagesData(table,data){
      ManagerData.ensureTable(table).numberPage = data;
    },
    setFindMainData(table,data){
      ManagerData.ensureTable(table).dataToFindMain = data;
    },
    checkDataExistting(table){
      return !!ManagerData.lstData[table];
    },
    // Rows of the table (DataGrid needs an "id": the row number), also kept in the cache.
    getLstDataPromise(tableName,fillter=null) {
      return getallInfoTable(tableName,fillter).then((result) => {
        const rows = (result.data && result.data.result) || [];
        rows.forEach((row, i) => { row.id = i+1; });
        ManagerData.checkTableInfoUpdate(tableName,rows);
        return rows;
      });
    },
    // Row count of the table (kept as lstData[table].numberPage) and its search fields.
    getNumberDataTableDetail(table,addInfo=null){
      return getNumberPageOnTable(table,addInfo).then((result) => {
        const dataFillter={};
        (result.detailFillter || []).forEach((field) => { dataFillter[field]=null; });
        ManagerData.setFindMainData(table,dataFillter);
        ManagerData.setNumberPagesData(table,result.numberPage);
        return result.numberPage;
      });
    },
    initdialogueNomal(table,inputToSheetX){
      ManagerData.dialogueNomalSave={
        titleDialogue:"",
        action:ActionControl.NO_ACTION,
        format:{ inputToSheet:inputToSheetX,dataTitleDetail:null},
        dataInput:{},
        tableToManager:table
      };
    },
    actionChangeInfoDataDialogueNomal(name,actionSelect){
      ManagerData.dialogueNomalSave.titleDialogue=name;
      ManagerData.dialogueNomalSave.action= actionSelect;
      if(actionSelect==ActionControl.ACTION_ADD){
        ManagerData.dialogueNomalSave.dataInput = {};
        for (var k in ManagerData.dialogueNomalSave.format.inputToSheet) 
          ManagerData.dialogueNomalSave.dataInput[ManagerData.dialogueNomalSave.format.inputToSheet[k]] = null;
      }
    },
    initdialogueCustomization(table){
      ManagerData.dialogueCustomizationSave={
        titleDialogue:"",
        action:ActionControl.NO_ACTION,
        dataInput:{},
        tableToManager:table
      };
    },
    actionChangeInfoDataDialogueCustomization(name,actionSelect){
      ManagerData.dialogueCustomizationSave.titleDialogue=name;
      ManagerData.dialogueCustomizationSave.action= actionSelect;
      if(actionSelect==ActionControl.ACTION_ADD){
        ManagerData.dialogueCustomizationSave.dataInput = {};
      }
    },

    selectActionManager(action){
      if(ManagerData.callBackFunc!=null) ManagerData.callBackFunc(action);
    },
    // Refreshes saveInfoUser on every call (errors are already shown by httpBaseUtil).
    getInfoUser(){
      ManagerData.saveInfoUser.is_checked=false;
      getCurUser().then((infoUser)=>{
        Object.assign(ManagerData.saveInfoUser, (infoUser.data && infoUser.data.user) || {});
        ManagerData.saveInfoUser.is_checked =true;
      }).catch(()=>{});
    },
    httpPostData(url,data) {
      return httpPostDataAPI(url,data).then((result) => result.data.result);
    },
}

export default ManagerData;