import React, {useState, useEffect }  from 'react';
import { Button } from '@material-ui/core';
import {httpPostDataAPI} from '../../../api/httpBaseUtil.js'
import {CanvasJSChart} from 'canvasjs-react-charts';

// Chart options from the report rows: revenue (total_value / Total) and bill count (total).
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
    data = data || [];
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


const SaleCompany =() =>{
    const [data7day, setData7Day] = useState({});
    const [data1year, setData1Year] = useState({});
    const [dataAll, setDataAll] = useState({});
    const [dataOption, setDataOption] = useState({});
    const [totalBuyInfo, setDataTotalBuyInfo] = useState(0);
    const [countBillInfo, setDataTotalBillInfo] = useState(0);

    useEffect(()  =>  {
        // Errors are shown by httpBaseUtil; the chart keeps its previous data.
        httpPostDataAPI("users/report_admin/buy_last7day",{}).then((response)=>{
            var data = findInfoData(response.data.result,"Doanh thu 1 tuần",true);
            setData7Day(data);
            setDataOption(data);
        }).catch(()=>{});
        httpPostDataAPI("users/report_admin/buy_last1year",{}).then((response)=>{
            setData1Year(findInfoData(response.data.result,"Doanh thu 1 năm"));
        }).catch(()=>{});
        httpPostDataAPI("users/report_admin/buy_all",{}).then((response)=>{
            setDataAll(findInfoData(response.data.result,"Doanh thu all"));
        }).catch(()=>{});

    }, []);
    

    // data.data[0]: revenue, data.data[1]: bill count. Nothing to show before the data is loaded.
    const checkDataToSetup=(data)=>{
        if(!data || !data.data) return;
        const sum = (series) => series.dataPoints.reduce((total, element) => total + (Number(element.y) || 0), 0);
        const allVND = sum(data.data[0]);
        const countBill = sum(data.data[1]);
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

export default SaleCompany;