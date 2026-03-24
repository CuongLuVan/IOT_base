import React, {useState, useEffect }  from 'react';
//import {CanvasJSChart} from 'canvasjs-react-charts';
import ReportSaleCommon from '../../../compoment/table/ReportSaleCommon.js';


const ReportSpecial =(props) =>{
    const [dataTable, setDataTable] = useState(
        [
            {'table': 'report_product_sale',
                report:{every_month:{name:"month",value:"total_revenue",detailName:"Tháng",detailValue:"VND"} 
                ,every_year:{name:"year",value:"total_revenue",detailName:"Năm",detailValue:"VND"} ,
                a_week:{name:"week",value:"total_revenue",detailName:"Tuần",detailValue:"VND"}  },
            'name': "Doanh số bán hàng"},
            {'table': 'report_product_return',
                report:{every_month:{name:"month",value:"total_cost_return",detailName:"Tháng",detailValue:"sản phẩm"} 
                ,every_year:{name:"year",value:"total_cost_return",detailName:"Năm",detailValue:"sản phẩm"} ,
                a_week:{name:"week",value:"total_revenue",detailName:"Tuần",detailValue:"sản phẩm"} },
            'name': "Trả lại hàng"},
            {'table': 'report_product_lost',
                report:{every_month:{name:"month",value:"total_lost_cases",detailName:"Tháng",detailValue:"sản phẩm"} 
                ,every_year:{name:"year",value:"total_lost_cases",detailName:"Năm",detailValue:"sản phẩm"} ,
                a_week:{name:"week",value:"total_lost_cases",detailName:"Tuần",detailValue:"sản phẩm"}},
            'name': "Sản phẩm bị thất lạc"},
            {'table': 'report_warehouse',
                report:{every_month:{name:"month",value:"total_export_value",detailName:"Tháng",detailValue:"sản phẩm"} 
                ,every_year:{name:"export_year",value:"total_export_value",detailName:"Năm",detailValue:"sản phẩm"} ,
                a_week:{name:"week",value:"total_export_value",detailName:"Tuần",detailValue:"sản phẩm"}},
            'name': "Báo cáo kho hàng"},
            {'table': 'sum_productbuy',
                report:{every_month:{name:"month",value:"total_revenue",detailName:"Tháng",detailValue:"VND"} 
                ,every_year:{name:"year",value:"total_revenue",detailName:"Năm",detailValue:"VND"},
                a_week:{name:"week",value:"total_revenue",detailName:"Tuần",detailValue:"VND"} },
            'name': "Doanh thu"},
            {'table': 'sale_productbuy',
                report:{every_month:{name:"month",value:"total_revenue",detailName:"Tháng",detailValue:"VND"} 
                ,every_year:{name:"year",value:"total_revenue",detailName:"Năm",detailValue:"VND"} ,
                a_week:{name:"week",value:"total_revenue",detailName:"Tuần",detailValue:"VND"} },
            'name': "Doanh số sale"},
            {'table': 'customer_to_sale',
                report:{every_month:{name:"month",value:"total_real_customers",detailName:"Tháng",detailValue:"VND"} 
                ,every_year:{name:"year",value:"total_real_customers",detailName:"Năm",detailValue:"VND"},
                a_week:{name:"week",value:"total_real_customers",detailName:"Tuần",detailValue:"VND"} },
            'name': "Tỷ lệ chuyển đổi từ khách tiềm năng → khách hàng thực sự"},
            {'table': 'report_product_new',
                report:{every_month:{name:"month",value:"total_quantity",detailName:"Tháng",detailValue:"số lượng"} 
                ,every_year:{name:"year",value:"total_quantity",detailName:"Năm",detailValue:"số lượng"} ,
                a_week:{name:"week",value:"total_quantity",detailName:"Tuần",detailValue:"VND"} },
            'name': "✔ Phân tích xu hướng mua hàng của khách hàng"},
            
        ]
        
    );
        const [dataTableResponse, setDataTableResponse] = useState([]);

    


    return (
        <div className="user-data">
            <div> Bảng báo cáo Doanh số</div>
                    {dataTable.map((info) => (
                        <ReportSaleCommon table={info} title_table=""  />
                         
                )           
            )}
           
        </div>
    );
};
// <CanvasJSChart options = {dataOption}/>
//
export default ReportSpecial;