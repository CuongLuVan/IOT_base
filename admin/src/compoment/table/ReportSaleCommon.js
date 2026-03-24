import React, {useState, useEffect }  from 'react';
import {CanvasJSChart} from 'canvasjs-react-charts'
import {addOneDataToTable,httpPostDataAPI} from '../../api/httpBaseUtil.js'


const ReportSaleCommon = ({ table,title_table }) => {
  // Chuyển đổi dữ liệu đầu vào thành dạng dataPoints của CanvasJS
  const options = {
    animationEnabled: true,
    title: {
      text: "Doanh Số",
    },
    axisX: {
      title: "Tháng",
      interval: 1,
    },
    axisY: {
      title: "Số lượng",
      suffix: "",
    },
    data: [
      {
        type: "column",
        dataPoints: [],
      },
    ],
  };

    const [dataTableResponse, setDataTableResponse] = useState({});
    const [optionAll, setoptionAll] = useState(null);
    const [option1year, setoption1year] = useState(null);
    const [optionA7day, setoption7day] = useState([]);
    const [showChart,setShowChart]= useState(false);

    const [showOptionAll, setShowOptionAll] = useState(false);
    const [showOption1year, setShowOption1year] = useState(false);
    const [showOptionA7day, setShowOption7day] = useState(false);

    useEffect(()  =>  {
            
    }, [table]);
    const checkDataToSetup=()=>{
      if(!showChart){
        setShowChart(true);
        httpPostDataAPI("users/report-special",{info:table.table,select:"every_year"}).then((response)=>{
          console.log({info:table.table,select:"every_year"},response);

          const formattedDataAll = response.data.result.map((item) => ({
            label: item[table.report.every_year.name], // Nhãn trục X (yyyy-mm)
            y: item[table.report.every_year.value], // Giá trị trục Y
          }));

          var jsonDataAll = JSON.parse(JSON.stringify(options));
          jsonDataAll.axisX.title = table.report.every_year.detailName;
          jsonDataAll.axisY.title = table.report.every_year.detailValue;
          jsonDataAll.data[0].dataPoints = formattedDataAll;

          jsonDataAll.title.text = table.name  + " theo năm";
          setoptionAll(jsonDataAll);
          setShowOptionAll(response.data.result.length>0);

        });
        httpPostDataAPI("users/report-special",{info:table.table,select:"every_month"}).then((response)=>{
          console.log({info:table.table,select:"every_month"},response);
          const formattedDataAll = response.data.result.map((item) => ({
            label: item[table.report.every_month.name], // Nhãn trục X (yyyy-mm)
            y: item[table.report.every_month.value], // Giá trị trục Y
          }));

          var jsonDataAll = JSON.parse(JSON.stringify(options));
          jsonDataAll.axisX.title = table.report.every_month.detailName;
          jsonDataAll.axisY.title = table.report.every_month.detailValue;
          jsonDataAll.data[0].dataPoints = formattedDataAll;
          jsonDataAll.title.text = table.name + " theo tháng";;
          setoption1year(jsonDataAll);
          setShowOption1year(response.data.result.length>0);
          
        });
        httpPostDataAPI("users/report-special",{info:table.table,select:"a_week"}).then((response)=>{
          console.log({info:table.table,select:"a_week"},response);
          setoption7day(response.data.result);
          setShowOption7day(response.data.result.length>0);
        });
      }

    }

  return( <div>
            <h2>{table.name}</h2>
            <button onClick={()=>checkDataToSetup()}> {!showChart? "Hiện biểu đồ":"biểu đồ"} </button>
            <br/>
            {showOptionA7day? table.name +" trong 1 tuần :" 
                  + (optionA7day.length>0?(optionA7day[0][table.report.a_week.value]!=null?optionA7day[0][table.report.a_week.value]:0):0 )
                  +table.report.a_week.detailValue:""}
            <br/>
            <div class="parent-ground-chart"> 
                {optionAll&&showOptionAll? 
                    <div class="child-ground-chart">
                        <CanvasJSChart options={optionAll} /> 
                    </div>
                :""}
                {option1year&&showOption1year?  
                    <div class="child-ground-chart">
                        <CanvasJSChart options={option1year} /> 
                    </div>
                :""}
                
            </div>
          </div>
  );
};
//<CanvasJSChart options={options} /> 
export default ReportSaleCommon;