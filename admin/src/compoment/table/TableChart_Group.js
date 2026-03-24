import React, {useState, useEffect }  from 'react';
import {CanvasJSChart} from 'canvasjs-react-charts'
import {addOneDataToTable,httpPostDataAPI} from '../../api/httpBaseUtil.js'


const TableChart_Group = ({ table,title_table }) => {
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
    const [optionA7day, setoption7day] = useState(null);
    const [showChart,setShowChart]= useState(false);

    useEffect(()  =>  {
            
    }, [table]);
    const checkDataToSetup=()=>{
      if(!showChart){
        setShowChart(true);
        httpPostDataAPI("users/report-detail",table).then((response)=>{
          setDataTableResponse(response.data.result);
          const formattedDataAll = response.data.result.all_year.data.map((item) => ({
            label: item.month, // Nhãn trục X (yyyy-mm)
            y: item.total_table, // Giá trị trục Y
          }));
          const formattedData5year = response.data.result.last1year.data.map((item) => ({
            label: item.month, // Nhãn trục X (yyyy-mm)
            y: item.total_table, // Giá trị trục Y
          }));
          const formattedData7day = response.data.result.last7day.data.map((item) => ({
            label: item.month, // Nhãn trục X (yyyy-mm)
            y: item.total_table, // Giá trị trục Y
          }));
          
          if(formattedDataAll.length>0){
            var jsonDataAll = JSON.parse(JSON.stringify(options));
            jsonDataAll.data[0].dataPoints = formattedDataAll;
            jsonDataAll.title.text = table.optionAll;
            setoptionAll(jsonDataAll);
          }
          if(formattedData5year.length>0){
            var jsonData5 = JSON.parse(JSON.stringify(options));
            jsonData5.data[0].dataPoints = formattedData5year;
            jsonData5.title.text = table.option1year;
            setoption1year(jsonData5);
          }
          if(formattedData7day.length>0){
            setoption7day(formattedData7day);
          }

        });
      }

    }

  return( <div>
            <h2>{table.table_name}</h2>
            <button onClick={()=>checkDataToSetup()}> {!showChart? "Hiện biểu đồ":"biểu đồ"} </button>

                                        <div class="parent-ground-chart"> 
                                            {optionAll? 
                                                <div class="child-ground-chart">
                                                    <CanvasJSChart options={optionAll} /> 
                                                </div>
                                            :""}
                                            {option1year?  
                                                <div class="child-ground-chart">
                                                   <CanvasJSChart options={option1year} /> 
                                                </div>
                                            :""}
                                            
                                        </div>
    
          </div>
  );
};
//<CanvasJSChart options={options} /> 
export default TableChart_Group;