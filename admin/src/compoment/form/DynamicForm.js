import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  MenuItem,
  Select,
  TextField,
  Label
} from '@material-ui/core';
import classNames from 'classnames';
import SelectPermision from '../form/SelectPermision.js';
import CustomerSelectBill from '../form/CustomerSelectBill.js';
import SelectLanggue from '../form/SelectLanggue.js';


import CustomerPermision from '../form/CustomerPermision.js';
import SelectGroupContentSub from '../form/SelectGroupContentSub.js';
import UploadImage from './UploadImage.js';
import SelectInTable from '../form/SelectInTable.js';
import SelectInArrayJsonTable from '../form/SelectInArrayJsonTable.js';
import moment from 'moment';
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';
import DateTimePicker from 'react-datetime-picker';
import {cityInfoData } from '../../config/city';
import {provinceInfoData } from '../../config/province';
import {villageInfoData } from '../../config/village';

const DynamicForm = ({value, valueDetail,selectTabble ,onChange ,objectData=null}) => {
   // const [ handleClose] = useState()
    console.log("value, valueDetail",value, valueDetail);
    

    if(value.html==TypeDialgueShow.NO_CHECK){
        return(<></>);
    } else if(value.html==TypeDialgueShow.EDIT_TEXT){
        return(
            <TextField
                variant="outlined"
                label={value.title}
                className="enterprise-form1"
                value={valueDetail}
                onChange={(event) => {
                    onChange(event);
                }}
            />
        );
    } else if(value.html==TypeDialgueShow.EDIT_CUSTOM){
        if(value.typeSelect==SelectHTml.SelectPermision){
            return(
                <div>
                    <div> Cấp quyền</div>
                    <SelectPermision
                        typePermision={valueDetail}
                        onChange={(event) => {
                            onChange(event);
                        }}
                    />
                </div>
            );
        }else if(value.typeSelect==SelectHTml.CUSTOMER_PERMISION){
            return(
                <div>
                <div> Quyền khách hàng</div>
                <CustomerPermision
                    typePermision={valueDetail}
                    onChange={(event) => {
                        onChange(event);
                    }}
                />
                </div>
            );
        }else if(value.typeSelect==SelectHTml.CUSTOMER_SELECT_BILL){
            return(
                <div>
                    <div> Tình trạng đơn hàng</div>
                    <CustomerSelectBill
                        typePermision={valueDetail}
                        onChange={(event) => {
                            onChange(event);
                        }}
                    />
                </div>
            );
        }

        

        
        
    } else if(value.html==TypeDialgueShow.SELECT_TABLE){
        return (
            <div>
                <div>{ value.title}</div>
                <SelectInTable
                    table={selectTabble}
                    value={valueDetail}
                    onChange={(event) => {
                        onChange(event);
                }} />
             </div>
            );
    } else if(value.html==TypeDialgueShow.SELECT_CUSTOM){
        if(value.typeSelect==SelectHTml.SelectGroupContentSub){
            return(
                <div>
                    <div>{ value.title}</div>
                    <SelectGroupContentSub
                        detailValue={valueDetail}
                        onChange={(event) => {
                            onChange(event);
                        }}
                    />
                 </div>
            );
        } else if(value.typeSelect==SelectHTml.SELECT_IMAGE_UP_LOAD){
            return(
                <UploadImage  
                    urlImage={valueDetail}
                    uploadfileDataLink={(event) => {
                        onChange({target:{value:event}});
                    }}
                />
            );
        } 
        return(<></>);
    }
    else if(value.html==TypeDialgueShow.EDIT_DATE_TIME){
       // if(valueDetail!=null&&valueDetail!=undefined&&valueDetail.length>2)  newTime= valueDetail+"z";
        var curentDateTime = [];  
        if(valueDetail!=null)   curentDateTime =valueDetail.split("T");
        // new Date(valueDetail);
        return  <input type="date" value={curentDateTime[0]} 
                    onChange={(event) => {
                        var data= event.target.value +`T23:59:00`;
                        onChange({target:{value:data}});
                    }} />;
            /*
            <DateTimePicker 
                format="y-MM-dd h:mm:ss"
                locale=""
                onChange={(event) => {
                        var yy = event.getFullYear();
                        var mm = event.getMonth()+1;
                        var dd = event.getDate();
                        var h = event.getHours();
                        var m = event.getMinutes();
                        var s = event.getSeconds();

                        var data= {target:{value:`${yy}-${mm}-${dd}T${h}:${m}:${s}` } };
                        //var data= {target:{value:event.replace("z","") } };
                        console.log("event ...",data); 
                        onChange(data);
                    }} 
                value={curentDateTime} />
            */
    } else if(value.html==TypeDialgueShow.SELECT_CITY){
        return (
                <SelectInArrayJsonTable
                    value={valueDetail}
                    dataInfo={cityInfoData}
                    dataIDMain = "city_id"
                    dataLabelMain="name_city"
                    label="Thành phố"
                    fatherId={-1}
                    fatherIdMain="city_id"
                    onChange={(event) => {
                            onChange(event);
                    }}/>
        );
    } else if(value.html==TypeDialgueShow.SELECT_PROVINCE){
        return (
                <SelectInArrayJsonTable
                    value={valueDetail}
                    dataInfo={provinceInfoData}
                    dataIDMain = "province_id"
                    dataLabelMain="name_province"
                    label="Quận huyện"
                    fatherId={isNaN(objectData.city_id)?0:objectData.city_id}
                    fatherIdMain="city_id"
                    onChange={(event) => {
                            onChange(event);
                    }}/>
        );
    } else if(value.html==TypeDialgueShow.SELECT_VILLAGE){
        return (
                <SelectInArrayJsonTable
                    value={valueDetail}
                    dataInfo={villageInfoData}
                    dataIDMain = "village_id"
                    dataLabelMain="name_village"
                    label="Xã / Phường"
                    fatherId={isNaN(objectData.province_id)?0:objectData.province_id}
                    fatherIdMain="province_id"
                    onChange={(event) => {
                            onChange(event);
                    }}/>
        );
    }else if(value.html==TypeDialgueShow.PASSWORD){
        return(
            <TextField
                variant="outlined"
                label={value.title}
                className="enterprise-form1"
                value={valueDetail}
                onChange={(event) => {
                    onChange(event);
                }}
            />
        );
    } else if(value.html==TypeDialgueShow.UN_EDIT){
        return(
            <TextField
                variant="outlined"
                disabled
                label={value.title}
                className="enterprise-form1"
                value={valueDetail}
            />
        );
    } else if(value.html==TypeDialgueShow.TYPE_PAPER_UN_EDIT){
        return(
            <TextField
                variant="outlined"
                disabled
                label={value.title}
                className="enterprise-form1"
                value={valueDetail==-1?"Bài đơn lẻ":"Bài phụ"}
            />
        );
    }else if(value.html==TypeDialgueShow.TYPE_TOP_UN_EDIT){
        return(
            <TextField
                variant="outlined"
                disabled
                label={value.title}
                className="enterprise-form1"
                value={valueDetail==0?"Chưa đưa lên top":"Đã đưa lên top"}
            />
        );
    }else if(value.html==TypeDialgueShow.SELECT_LANGGUE){
        return (
            <SelectLanggue
                typePermision={valueDetail}
                onChange={(event) => {  onChange(event); }}
            />
        );
    }
    
    
    
    return(<></>);
    
}

export default DynamicForm;
