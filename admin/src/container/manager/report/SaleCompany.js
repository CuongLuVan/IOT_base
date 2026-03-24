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
import {addOneDataToTable,httpPostDataAPI} from '../../../api/httpBaseUtil.js'
import {CanvasJSChart} from 'canvasjs-react-charts';


  

function findInfoData(data,Titles,is7day=false){
    var dataVND = {
        type: "line",
        name: "Doanh thu",
        color: "#C24642",
        axisYIndex: 0,
        showInLegend: true,
        dataPoints: []
    };
    var dataBill = {
        type: "line",
        name: "lượt truy cập",
        color: "#7F6084",
        axisYType: "secondary",
        showInLegend: true,
        dataPoints: []
    };
    if(is7day){
        data.forEach(element => {
            dataVND.dataPoints.push({x:new Date(element.created_at),y:element.Total});
            dataBill.dataPoints.push({x:new Date(element.created_at),y:0});
        });
    }
    else 
    {
        var lastTime=0;
        var saveLastTime=0;
        data.forEach(element => {
            dataVND.dataPoints.push({x:(element.month+lastTime*12),y:element.total_value});
            if(element.hasOwnProperty("total"))
                dataBill.dataPoints.push({x:(element.month+lastTime*12),y:element.total});
           // else dataBill.dataPoints.push({x:(element.month+lastTime*12),y:0});
            if(saveLastTime>=element.month) lastTime ++;
            saveLastTime =element.month;
        });
    }

    return {
        title:{
            text: Titles
        },
        axisY:[{
            title: "Số tiền",
            lineColor: "#C24642",
            tickColor: "#C24642",
            labelFontColor: "#C24642",
            titleFontColor: "#C24642",
            includeZero: true,
            suffix: "vnd"
        }],
        axisY2: {
            title: "lượng truy cập",
            lineColor: "#7F6084",
            tickColor: "#7F6084",
            labelFontColor: "#7F6084",
            titleFontColor: "#7F6084",
            includeZero: true,
            suffix: "k"
        },
        data: [dataVND,dataBill]
    };

}


const LostProductTable =(props) =>{
    const [data7day, setData7Day] = useState({});
    const [data1year, setData1Year] = useState({});
    const [dataAll, setDataAll] = useState({});
    const [dataOption, setDataOption] = useState({});
    const [totalBuyInfo, setDataTotalBuyInfo] = useState(0);
    const [countBillInfo, setDataTotalBillInfo] = useState(0);

    useEffect(()  =>  {
        httpPostDataAPI("users/report_admin/buy_last7day",{}).then((response)=>{
            var data = findInfoData(response.data.result,"Doanh thu 1 tuần",true);
            setData7Day(data);
            setDataOption(data);
        });
        httpPostDataAPI("users/report_admin/buy_last1year",{}).then((response)=>{
            setData1Year(findInfoData(response.data.result,"Doanh thu 1 năm"));
        });
        httpPostDataAPI("users/report_admin/buy_all",{}).then((response)=>{
            setDataAll(findInfoData(response.data.result,"Doanh thu all"));
        });

    }, []);
    

    const checkDataToSetup=(data)=>{
        var allVND=0;
        var countBill=0;

        data.data[0].dataPoints.forEach(element => {
            allVND = allVND +element.y;
        });
        data.data[0].dataPoints.forEach(element => {
            countBill = countBill +element.y;
        });
        setDataTotalBuyInfo(allVND);
        setDataTotalBillInfo(countBill);
        setDataOption(data);
    }

    return (
        <div className="user-data">
            <div> Doanh thu : {totalBuyInfo} VND</div>
            <div> Lượng đơn hàng : {countBillInfo} </div>
            <div> Đang giao</div>
            <div> Đang xử lý</div>
            <div> Hủy</div>
            <div>
                <Button onClick={()=>{checkDataToSetup(data7day)}}> 1 Tuần </Button>
                <Button onClick={()=>{checkDataToSetup(data1year)}}> 1 năm </Button>
                <Button onClick={()=>{checkDataToSetup(dataAll)}}> Tất cả </Button>
            </div>
            <CanvasJSChart options = {dataOption}/>
        </div>
    );
};

//
export default LostProductTable;