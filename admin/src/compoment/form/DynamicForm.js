import React from 'react';
import { TextField } from '@material-ui/core';
import SelectPermision from '../form/SelectPermision.js';
import CustomerSelectBill from '../form/CustomerSelectBill.js';
import SelectLanggue from '../form/SelectLanggue.js';
import CustomerPermision from '../form/CustomerPermision.js';
import SelectGroupContentSub from '../form/SelectGroupContentSub.js';
import UploadImage from './UploadImage.js';
import SelectInTable from '../form/SelectInTable.js';
import SelectInArrayJsonTable from '../form/SelectInArrayJsonTable.js';
import {TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';
import {cityInfoData } from '../../config/city';
import {provinceInfoData } from '../../config/province';
import {villageInfoData } from '../../config/village';

// Number id of the parent (city / province) for the cascading selects, 0 when unknown.
function parentId(objectData, field) {
    const id = objectData ? objectData[field] : undefined;
    return isNaN(id) ? 0 : id;
}

// One field of a table dialogue, chosen by value.html (TypeDialgueShow) and
// value.typeSelect (SelectHTml). onChange always receives { target: { value } }.
const DynamicForm = ({value, valueDetail,selectTabble ,onChange ,objectData=null}) => {
    const textField = (props) => (
        <TextField
            variant="outlined"
            label={value.title}
            className="enterprise-form1"
            value={valueDetail}
            {...props}
        />
    );
    const titled = (title, child) => (
        <div>
            <div>{title}</div>
            {child}
        </div>
    );

    // A field without html (config array shorter than view) is a plain text field,
    // as before (the old "PASSWORD" branch compared with an undefined constant).
    if (value.html === undefined || value.html === null) return textField({ onChange });

    switch (Number(value.html)) {
    case TypeDialgueShow.EDIT_TEXT:
        return textField({ onChange });
    case TypeDialgueShow.UN_EDIT:
        return textField({ disabled: true });
    case TypeDialgueShow.TYPE_PAPER_UN_EDIT:
        return textField({ disabled: true, value: valueDetail==-1?"Bài đơn lẻ":"Bài phụ" });
    case TypeDialgueShow.TYPE_TOP_UN_EDIT:
        return textField({ disabled: true, value: valueDetail==0?"Chưa đưa lên top":"Đã đưa lên top" });
    case TypeDialgueShow.EDIT_CUSTOM:
        if(value.typeSelect==SelectHTml.SelectPermision){
            return titled(" Cấp quyền", <SelectPermision typePermision={valueDetail} onChange={onChange} />);
        }
        if(value.typeSelect==SelectHTml.CUSTOMER_PERMISION){
            return titled(" Quyền khách hàng", <CustomerPermision typePermision={valueDetail} onChange={onChange} />);
        }
        if(value.typeSelect==SelectHTml.CUSTOMER_SELECT_BILL){
            return titled(" Tình trạng đơn hàng", <CustomerSelectBill typePermision={valueDetail} onChange={onChange} />);
        }
        return(<></>);
    case TypeDialgueShow.SELECT_TABLE:
        return titled(value.title, <SelectInTable table={selectTabble} value={valueDetail} onChange={onChange} />);
    case TypeDialgueShow.SELECT_CUSTOM:
        if(value.typeSelect==SelectHTml.SelectGroupContentSub){
            return titled(value.title, <SelectGroupContentSub detailValue={valueDetail} onChange={onChange} />);
        }
        if(value.typeSelect==SelectHTml.SELECT_IMAGE_UP_LOAD){
            return (
                <UploadImage
                    urlImage={valueDetail}
                    uploadfileDataLink={(link) => onChange({target:{value:link}})}
                />
            );
        }
        return(<></>);
    case TypeDialgueShow.EDIT_DATE_TIME: {
        // Stored as "YYYY-MM-DDT..."; the input edits the date part only.
        const date = valueDetail != null ? String(valueDetail).split("T")[0] : "";
        return (
            <input type="date" value={date}
                onChange={(event) => onChange({target:{value:event.target.value +`T23:59:00`}})} />
        );
    }
    case TypeDialgueShow.SELECT_CITY:
        return (
            <SelectInArrayJsonTable
                value={valueDetail}
                dataInfo={cityInfoData}
                dataIDMain = "city_id"
                dataLabelMain="name_city"
                label="Thành phố"
                fatherId={-1}
                fatherIdMain="city_id"
                onChange={onChange}/>
        );
    case TypeDialgueShow.SELECT_PROVINCE:
        return (
            <SelectInArrayJsonTable
                value={valueDetail}
                dataInfo={provinceInfoData}
                dataIDMain = "province_id"
                dataLabelMain="name_province"
                label="Quận huyện"
                fatherId={parentId(objectData, "city_id")}
                fatherIdMain="city_id"
                onChange={onChange}/>
        );
    case TypeDialgueShow.SELECT_VILLAGE:
        return (
            <SelectInArrayJsonTable
                value={valueDetail}
                dataInfo={villageInfoData}
                dataIDMain = "village_id"
                dataLabelMain="name_village"
                label="Xã / Phường"
                fatherId={parentId(objectData, "province_id")}
                fatherIdMain="province_id"
                onChange={onChange}/>
        );
    case TypeDialgueShow.SELECT_LANGGUE:
        return <SelectLanggue typePermision={valueDetail} onChange={onChange} />;
    default:
        return(<></>);
    }
}

export default DynamicForm;
