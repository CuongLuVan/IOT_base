const report_sale ={
   // doanh số 1 tuần gần nhất
   report_product_sale:{
    a_week:`SELECT 
                    pb.buyproduct_id,
                    pb.name AS customer_name,
                    pb.phone,
                    pb.address,
                    SUM(pbd.quantity) AS total_quantity,
                    SUM(pbd.quantity * pb.Total) AS total_revenue,
                    pb.created_at
                FROM product_buy pb
                JOIN product_buy_detail pbd ON pb.buyproduct_id = pbd.buyproduct_id
                WHERE pb.created_at >= NOW() - INTERVAL 7 DAY
                AND pb.deleteflag = 0  -- Chỉ lấy dữ liệu hợp lệ
                AND pbd.deleteflag = 0 -- Chỉ lấy dữ liệu hợp lệ
                GROUP BY pb.buyproduct_id, pb.name, pb.phone, pb.address, pb.created_at
                ORDER BY pb.created_at ASC;`,
    every_month:`SELECT 
                    DATE_FORMAT(pb.created_at, '%Y-%m') AS month,  -- Lấy tháng và năm
                    COUNT(pb.buyproduct_id) AS total_orders,      -- Tổng số đơn hàng hợp lệ
                    SUM(pbd.quantity) AS total_quantity,         -- Tổng số lượng sản phẩm bán ra
                    SUM(pbd.quantity * pb.Total) AS total_revenue -- Tổng doanh thu
                FROM product_buy pb
                JOIN product_buy_detail pbd ON pb.buyproduct_id = pbd.buyproduct_id
                WHERE pb.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH) -- Lọc dữ liệu 12 tháng gần nhất
                AND pb.deleteflag = 0  -- Chỉ lấy dữ liệu hợp lệ
                AND pbd.deleteflag = 0 -- Chỉ lấy dữ liệu hợp lệ
                GROUP BY month
                ORDER BY month ASC;`,
    every_year:`SELECT 
            YEAR(pb.created_at) AS year,  -- Lấy năm
            COUNT(pb.buyproduct_id) AS total_orders,      -- Tổng số đơn hàng hợp lệ
            SUM(pbd.quantity) AS total_quantity,         -- Tổng số lượng sản phẩm bán ra
            SUM(pbd.quantity * pb.Total) AS total_revenue -- Tổng doanh thu
        FROM product_buy pb
        JOIN product_buy_detail pbd ON pb.buyproduct_id = pbd.buyproduct_id
        WHERE pb.deleteflag = 0  -- Chỉ lấy dữ liệu hợp lệ
        AND pbd.deleteflag = 0 -- Chỉ lấy dữ liệu hợp lệ
        GROUP BY year
        ORDER BY year ASC;`
    },
    report_product_return:{
        a_week:`SELECT 
                YEARWEEK(created_at, 1) AS year_week, 
                COUNT(product_buy_return_id) AS total_return_orders, 
                SUM(cost_confirm) AS total_cost_return
            FROM product_buy_return
            WHERE deleteflag = 0 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)  -- Chỉ lấy dữ liệu trong tuần gần nhất
            GROUP BY year_week
            ORDER BY year_week ASC;`,
        every_month:`SELECT 
                YEAR(created_at) AS year, 
                MONTH(created_at) AS month, 
                COUNT(product_buy_return_id) AS total_return_orders, 
                SUM(cost_confirm) AS total_cost_return
            FROM product_buy_return
            WHERE deleteflag = 0 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)  -- Chỉ lấy dữ liệu trong tháng gần nhất
            GROUP BY year, month
            ORDER BY year ASC, month ASC;`,
            every_year:`SELECT 
                    YEAR(created_at) AS year, 
                    COUNT(product_buy_return_id) AS total_return_orders, 
                    SUM(cost_confirm) AS total_cost_return
                FROM product_buy_return
                WHERE deleteflag = 0
                GROUP BY year
                ORDER BY year ASC;`,
    },
    report_product_lost:{
        a_week:`SELECT 
                YEARWEEK(created_at, 1) AS year_week, 
                COUNT(stord_id) AS total_lost_cases
            FROM product_lost
            WHERE deleteflag = 0 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)  -- Chỉ lấy dữ liệu trong tuần gần nhất
            GROUP BY year_week
            ORDER BY year_week ASC;`,
        every_month:`SELECT 
                    DATE_FORMAT(created_at, '%Y-%m') AS month,  -- Lấy tháng và năm
                COUNT(stord_id) AS total_lost_cases
            FROM product_lost
            WHERE deleteflag = 0 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)  -- Chỉ lấy dữ liệu trong tháng gần nhất
            GROUP BY month ASC;`,
        every_year:`SELECT 
                YEAR(created_at) AS year, 
                COUNT(stord_id) AS total_lost_cases
            FROM product_lost
            WHERE deleteflag = 0
            GROUP BY year
            ORDER BY year ASC;`
    },
    report_warehouse:{
        a_week:`SELECT 
                        DATE_FORMAT(pbd.created_at, '%Y-%m-%d') AS export_date,
                        SUM(pbd.quantity) AS total_quantity,
                        SUM(pbd.quantity * pi.cost_real) AS total_export_value
                    FROM product_buy_detail pbd
                    JOIN product_image pi ON pbd.image_id = pi.image_id
                    WHERE pbd.deleteflag = 0
                        AND pi.deleteflag = 0
                        AND pbd.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                    GROUP BY export_date
                    ORDER BY export_date ASC;`,
        every_month:`SELECT 
                            DATE_FORMAT(pbd.created_at, '%Y-%m') AS export_month,
                            SUM(pbd.quantity) AS total_quantity,
                            SUM(pbd.quantity * pi.cost_real) AS total_export_value
                        FROM product_buy_detail pbd
                        JOIN product_image pi ON pbd.image_id = pi.image_id
                        WHERE pbd.deleteflag = 0
                            AND pi.deleteflag = 0
                            AND pbd.created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                        GROUP BY export_month
                        ORDER BY export_month ASC;`,
        every_year:`SELECT 
                            YEAR(pbd.created_at) AS export_year,
                            SUM(pbd.quantity) AS total_quantity,
                            SUM(pbd.quantity * pi.cost_real) AS total_export_value
                        FROM product_buy_detail pbd
                        JOIN product_image pi ON pbd.image_id = pi.image_id
                        WHERE pbd.deleteflag = 0
                            AND pi.deleteflag = 0
                            AND pbd.created_at >= DATE_SUB(CURDATE(), INTERVAL 5 YEAR)
                        GROUP BY export_year
                        ORDER BY export_year ASC;`
    },
    //Doanh thu theo ngày/tuần/tháng/năm ✔ Tổng số đơn hàng & giá trị đơn hàng
    sum_productbuy:{
        a_week:`SELECT 
                        COUNT(buyproduct_id) AS total_orders,
                        SUM(Total - KM) AS total_revenue
                    FROM product_buy
                    WHERE deleteflag = 0
                        AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY);`,
        every_month:`SELECT 
                            DATE_FORMAT(created_at, '%Y-%m') AS month,
                            COUNT(buyproduct_id) AS total_orders,
                            SUM(Total - KM) AS total_revenue
                        FROM product_buy
                        WHERE deleteflag = 0
                        GROUP BY month
                        ORDER BY month ASC;`,
        every_year:`SELECT 
                    YEAR(created_at) AS year,
                    COUNT(buyproduct_id) AS total_orders,
                    SUM(Total - KM) AS total_revenue
                FROM product_buy
                WHERE deleteflag = 0
                GROUP BY year
                ORDER BY year ASC;`
    },
//✔ Hiệu suất bán hàng theo nhân viên/nhóm kinh doanh
    sale_productbuy:{
        a_week:`SELECT 
                        WEEK(created_at, 1) AS week_number, 
                        YEAR(created_at) AS year,
                        selled_id AS employee_id,
                        COUNT(buyproduct_id) AS total_orders,
                        SUM(Total - KM) AS total_revenue
                    FROM product_buy
                    WHERE deleteflag = 0 
                    AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                    GROUP BY year, week_number, employee_id
                    ORDER BY year ASC, week_number ASC, total_revenue ASC;`,
        every_month:`SELECT 
                            YEAR(created_at) AS year,
                            MONTH(created_at) AS month,
                            selled_id AS employee_id,
                            COUNT(buyproduct_id) AS total_orders,
                            SUM(Total - KM) AS total_revenue
                        FROM product_buy
                        WHERE deleteflag = 0 
                        AND created_at >= DATE_FORMAT(CURDATE() - INTERVAL 12 MONTH, '%Y-%m-01')  -- Lọc từ tháng gần nhất trở lại
                        GROUP BY year, month, employee_id
                        ORDER BY year ASC, month ASC, total_revenue ASC;`,
        every_year:`SELECT 
                    YEAR(created_at) AS year,
                    selled_id AS employee_id,
                    COUNT(buyproduct_id) AS total_orders,
                    SUM(Total - KM) AS total_revenue
                FROM product_buy
                WHERE deleteflag = 0 
                -- AND created_at >= '2023-01-01'  -- Điều chỉnh để lọc theo năm bắt đầu (ví dụ: năm 2023)
                GROUP BY year, employee_id
                ORDER BY year ASC, total_revenue ASC;`
    },
    //✔ Tỷ lệ chuyển đổi từ khách tiềm năng → khách hàng thực sự
    customer_to_sale:{
        a_week:`SELECT 
                    COUNT(DISTINCT c.customer_id) AS total_potential_customers,
                    COUNT(DISTINCT pb.customer_id) AS total_real_customers,
                    (COUNT(DISTINCT pb.customer_id) / COUNT(DISTINCT c.customer_id)) * 100 AS conversion_rate
                FROM 
                    customer c
                LEFT JOIN 
                    product_buy pb ON c.customer_id = pb.customer_id
                WHERE 
                    c.created_at BETWEEN CURDATE() - INTERVAL 7 DAY AND CURDATE()  -- Lọc khách hàng tiềm năng đăng ký trong 1 tuần
                    AND pb.created_at BETWEEN CURDATE() - INTERVAL 7 DAY AND CURDATE()  -- Lọc đơn hàng trong 1 tuần
                    AND c.deleteflag = 0  -- Khách hàng hợp lệ
                    AND pb.deleteflag = 0  -- Đơn hàng hợp lệ
                GROUP BY
                    WEEK(c.created_at);
                `,
        every_month:`SELECT 
                        COUNT(DISTINCT c.customer_id) AS total_potential_customers,
                        COUNT(DISTINCT pb.customer_id) AS total_real_customers,
                        (COUNT(DISTINCT pb.customer_id) / COUNT(DISTINCT c.customer_id)) * 100 AS conversion_rate
                    FROM 
                        customer c
                    LEFT JOIN 
                        product_buy pb ON c.customer_id = pb.customer_id
                    WHERE 
                        c.created_at BETWEEN CURDATE() - INTERVAL 1 MONTH AND CURDATE()  -- Lọc khách hàng tiềm năng đăng ký trong 1 tháng
                        AND pb.created_at BETWEEN CURDATE() - INTERVAL 1 MONTH AND CURDATE()  -- Lọc đơn hàng trong 1 tháng
                        AND c.deleteflag = 0  -- Khách hàng hợp lệ
                        AND pb.deleteflag = 0  -- Đơn hàng hợp lệ
                    GROUP BY
                        MONTH(c.created_at);
                    `,
        every_year:`SELECT 
                            COUNT(DISTINCT c.customer_id) AS total_potential_customers,
                            COUNT(DISTINCT pb.customer_id) AS total_real_customers,
                            (COUNT(DISTINCT pb.customer_id) / COUNT(DISTINCT c.customer_id)) * 100 AS conversion_rate
                        FROM 
                            customer c
                        LEFT JOIN 
                            product_buy pb ON c.customer_id = pb.customer_id
                        WHERE 
                            c.created_at BETWEEN CURDATE() - INTERVAL 1 YEAR AND CURDATE()  -- Lọc khách hàng tiềm năng đăng ký trong 1 năm
                            AND pb.created_at BETWEEN CURDATE() - INTERVAL 1 YEAR AND CURDATE()  -- Lọc đơn hàng trong 1 năm
                            AND c.deleteflag = 0  -- Khách hàng hợp lệ
                            AND pb.deleteflag = 0  -- Đơn hàng hợp lệ
                        GROUP BY
                            YEAR(c.created_at);
                        `
    },
   // ✔ Phân tích xu hướng mua hàng của khách hàng
   
   report_product_new:{
        a_week:`SELECT 
                        pb.customer_id, 
                        pi.name_image_detail AS product_name, 
                        SUM(pbd.quantity) AS total_quantity
                    FROM 
                        product_buy_detail pbd
                    JOIN 
                        product_buy pb ON pbd.buyproduct_id = pb.buyproduct_id
                    JOIN 
                        product_image pi ON pbd.image_id = pi.image_id
                    WHERE 
                        pb.created_at BETWEEN CURDATE() - INTERVAL 1 WEEK AND CURDATE()  -- Lọc đơn hàng trong tuần qua
                        AND pb.deleteflag = 0  -- Đảm bảo đơn hàng hợp lệ
                        AND pbd.deleteflag = 0  -- Đảm bảo chi tiết đơn hàng hợp lệ
                    GROUP BY 
                        pb.customer_id, pi.name_image_detail
                    ORDER BY 
                        total_quantity ASC;  -- Sắp xếp theo số lượng mua
                    `,
        every_month:`SELECT 
                        pb.customer_id, 
                        pi.name_image_detail AS product_name, 
                        SUM(pbd.quantity) AS total_quantity
                    FROM 
                        product_buy_detail pbd
                    JOIN 
                        product_buy pb ON pbd.buyproduct_id = pb.buyproduct_id
                    JOIN 
                        product_image pi ON pbd.image_id = pi.image_id
                    WHERE 
                        pb.created_at BETWEEN DATE_FORMAT(CURDATE(), '%Y-%m-01') AND LAST_DAY(CURDATE()) 
                        AND pb.deleteflag = 0  -- Đảm bảo đơn hàng hợp lệ
                        AND pbd.deleteflag = 0  -- Đảm bảo chi tiết đơn hàng hợp lệ
                    GROUP BY 
                        pb.customer_id, pi.name_image_detail
                    ORDER BY 
                        total_quantity ASC;  -- Sắp xếp theo số lượng mua
                    `,
        every_year:`SELECT 
                        pb.customer_id, 
                        pi.name_image_detail AS product_name, 
                        SUM(pbd.quantity) AS total_quantity
                    FROM 
                        product_buy_detail pbd
                    JOIN 
                        product_buy pb ON pbd.buyproduct_id = pb.buyproduct_id
                    JOIN 
                        product_image pi ON pbd.image_id = pi.image_id
                    WHERE 
                        YEAR(pb.created_at) = YEAR(CURDATE())  -- Lọc theo năm hiện tại
                        AND pb.deleteflag = 0  -- Đảm bảo đơn hàng hợp lệ
                        AND pbd.deleteflag = 0  -- Đảm bảo chi tiết đơn hàng hợp lệ
                    GROUP BY 
                        pb.customer_id, pi.name_image_detail
                    ORDER BY 
                        total_quantity ASC;  -- Sắp xếp theo số lượng mua
                    `
    },

    // ✔ Số lượng khách hàng mới & khách hàng cũ
    report_customer_all:{
        a_week:``,
        every_month:``,
        every_year:``
    },
    //✔ Tần suất mua hàng của khách hàng
    report_frequency_buy_customer:{
        a_week:``,
        every_month:``,
        every_year:``
    },
   // ✔ Tỷ lệ khách hàng quay lại mua hàng
   report_ratio_customer:{
    a_week:``,
    every_month:``,
    every_year:``
},
//✔ Khách hàng VIP (có giá trị đơn hàng cao nhất)
report_vip_customer:{
    a_week:``,
    every_month:``,
    every_year:``
},
//✔ Lịch sử giao dịch chi tiết theo từng khách hàng
report_history_of_customer:{
    a_week:``,
    every_month:``,
    every_year:``
},
//✔ Tỷ lệ khách hàng quay lại mua hàng
report_ratio_buy_again:{
    a_week:``,
    every_month:``,
    every_year:``
},
//✔ Khách hàng VIP (có giá trị đơn hàng cao nhất)
report_vip_customer:{
    a_week:``,
    every_month:``,
    every_year:``
},
//✔ Lịch sử giao dịch chi tiết theo từng khách hàng
history_customer:{
    a_week:``,
    every_month:``,
    every_year:``
},
//Báo cáo chăm sóc khách hàng (Customer Service Reports)
//✔ Số lượng yêu cầu hỗ trợ, khiếu nại theo thời gian
report_complaint:{
    a_week:``,
    every_month:``,
    every_year:``
},
//✔ Thời gian trung bình xử lý yêu cầu hỗ trợ
report_average_suport:{
    a_week:``,
    every_month:``,
    every_year:``
},
//✔ Đánh giá mức độ hài lòng của khách hàng
report_satisfaction_rating_customer:{
    a_week:``,
    every_month:``,
    every_year:``
},
//✔ Hiệu suất làm việc của từng nhân viên chăm sóc khách hàng
report_ratting_staff_performance:{
    a_week:``,
    every_month:``,
    every_year:``
},
/*báo cáo marketing (Marketing Reports)
✔ Hiệu quả của từng chiến dịch marketing (Email, Ads, SMS, v.v.)
✔ Tỷ lệ mở email, tỷ lệ nhấp chuột vào quảng cáo
✔ Chi phí quảng cáo so với doanh thu mang lại (ROI)
✔ Số lượng khách hàng tiềm năng thu được từ mỗi kênh marketing

5️⃣ Báo cáo công nợ & tài chính (Financial Reports)
✔ Tổng doanh thu & lợi nhuận ròng
✔ Tình trạng công nợ của khách hàng (đã thanh toán/chưa thanh toán)
✔ Dòng tiền thu vào & chi ra theo thời gian
✔ Chi phí vận hành hệ thống CRM

6️⃣ Báo cáo kho hàng (Inventory Reports)
✔ Tồn kho hiện tại của từng sản phẩm
✔ Tỷ lệ hàng hóa bị lỗi, hư hỏng, mất mát
✔ Tổng số lượng hàng nhập vào & xuất ra
✔ Cảnh báo hàng tồn kho thấp (cần nhập hàng)

7️⃣ Báo cáo hiệu suất nhân viên (Employee Performance Reports)
✔ Số lượng khách hàng mà mỗi nhân viên quản lý
✔ Tổng số đơn hàng được nhân viên xử lý
✔ Doanh số bán hàng cá nhân so với mục tiêu đặt ra
✔ Mức độ phản hồi & hỗ trợ khách hàng của từng nhân viên

  
*/
    report_product_new:{
        a_week:``,
        every_month:``,
        every_year:``
    },

    
  };

  module.exports = report_sale;