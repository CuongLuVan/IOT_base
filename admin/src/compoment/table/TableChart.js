import React from "react";
import {CanvasJSChart} from 'canvasjs-react-charts'


const TableChart = ({ data,title_table }) => {
  // Chuyển đổi dữ liệu đầu vào thành dạng dataPoints của CanvasJS
  const formattedData = data.map((item) => ({
    label: item.month, // Nhãn trục X (yyyy-mm)
    y: item.total_table, // Giá trị trục Y
  }));

  const options = {
    animationEnabled: true,
    title: {
      text: "Doanh Số Theo Tháng",
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
        dataPoints: formattedData,
      },
    ],
  };

  return( <div>
            <h2>{title_table}</h2>
            <CanvasJSChart options={options} /> 
          </div>
  );
};
//<CanvasJSChart options={options} /> 
export default TableChart;