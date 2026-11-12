import polyglotI18nProvider from 'ra-i18n-polyglot';
import englishMessages from 'ra-language-english';

const resourceNames = {
  users: ['Accounts', 'Tài khoản', '帐户'],
  room_management: ['Room management', 'Quản lý phòng', '房间管理'],
  mqtt: ['MQTT management', 'Quản lý MQTT', 'MQTT 管理'],
  mqtt_microservice: ['Create microservice', 'Tạo microservice', '创建微服务'],
  mqtt_user: ['MQTT customers', 'Khách hàng MQTT', 'MQTT 客户'],
  mqtt_device_certificate: ['Device certificates', 'Chứng chỉ thiết bị', '设备证书'],
  mqtt_device_history: ['Device status history', 'Lịch sử trạng thái thiết bị', '设备状态历史'],
  machine_monitoring: ['Machine monitoring', 'Giám sát máy', '机器监控'],
  oee_dashboard: ['OEE dashboard', 'Bảng điều khiển OEE', 'OEE 仪表板'],
  line_oee: ['Line OEE overview', 'Tổng quan OEE dây chuyền', '生产线 OEE 概览'],
  sPages: ['Article groups', 'Nhóm bài báo', '文章分组'],
  group_content_sub: ['Article groups', 'Nhóm bài báo', '文章分组'],
  managerpages: ['Manage articles', 'Quản lý bài báo', '文章管理'],
  registerPage: ['Write an article', 'Viết bài', '撰写文章'],
  advertisementDetail: ['Advertising', 'Quảng cáo', '广告'],
  advertisement_content: ['List', 'Danh sách', '列表'],
  advertisementPages: ['Advertising articles', 'Bài quảng bá', '广告文章'],
  advertisement_product: ['Product ads', 'Quảng cáo sản phẩm', '产品广告'],
  advertisementProductPages: ['Product advertising', 'Quảng cáo sản phẩm', '产品推广'],
  service_x: ['Services', 'Dịch vụ', '服务'],
  addservice: ['Add a service', 'Thêm dịch vụ', '添加服务'],
  service_group: ['Service groups', 'Nhóm dịch vụ', '服务分组'],
  service: ['Service details', 'Chi tiết dịch vụ', '服务详情'],
  service_bill: ['Invoices', 'Hóa đơn', '账单'],
  service_charging: ['Top up', 'Nạp tiền', '充值'],
  return_service: ['Service returns', 'Trả lại dịch vụ', '退还服务'],
  service_pages: ['Articles', 'Bài viết', '文章'],
  products: ['Products', 'Sản phẩm', '产品'],
  addproduct: ['Add a product', 'Thêm sản phẩm', '添加产品'],
  product_buy: ['Purchases', 'Mua hàng', '采购'],
  product_buy_detail: ['Invoices', 'Hóa đơn', '账单'],
  product_lost: ['Lost items', 'Thất lạc', '遗失物品'],
  product: ['Product details', 'Chi tiết sản phẩm', '产品详情'],
  product_store: ['Inventory', 'Kho', '库存'],
  product_pages: ['Articles', 'Bài viết', '文章'],
  cost: ['Additional expenses', 'Chi phí phát sinh', '额外费用'],
  cost_transport: ['Shipping types', 'Loại vận chuyển', '运输类型'],
  payment_type: ['Expense types', 'Loại chi phí', '费用类型'],
  payment_internal: ['Internal expenses', 'Chi phí nội bộ', '内部费用'],
  payment_transport: ['Shipping', 'Vận chuyển', '运输'],
  customers: ['Customers', 'Khách hàng', '客户'],
  company: ['Companies', 'Công ty', '公司'],
  customer: ['Customers', 'Khách hàng', '客户'],
  detailbank: ['Banks', 'Ngân hàng', '银行'],
  enterprise: ['Enterprises', 'Doanh nghiệp', '企业'],
  social_user: ['Messages', 'Tin nhắn', '消息'],
  group_company: ['Business groups', 'Nhóm kinh doanh', '业务组'],
  group_company_detail: ['Business group details', 'Chi tiết nhóm kinh doanh', '业务组详情'],
  customer_check: ['Company approval', 'Duyệt công ty', '公司审核'],
  customer_document_review: ['Document review', 'Duyệt giấy tờ', '文件审核'],
  report: ['Reports', 'Báo cáo', '报告'],
  report_all: ['Companies', 'Công ty', '公司'],
  report_table: ['Sales report', 'Báo cáo doanh số', '销售报告'],
  report_special: ['Special reports', 'Báo cáo đặc thù', '专项报告'],
  report_iot_operations: ['IoT operations report', 'Báo cáo vận hành IoT', '物联网运行报告'],
  comments: ['Comments', 'Bình luận', '评论'],
  chatbox: ['Messages', 'Nhắn tin', '聊天'],
};

const locales = ['en', 'vi', 'zh'];
const makeMessages = locale => {
  const index = locales.indexOf(locale);
  const resources = Object.keys(resourceNames).reduce((result, name) => {
    result[name] = { name: resourceNames[name][index] };
    return result;
  }, {});
  const app = {
    language: ['Language', 'Ngôn ngữ', '语言'][index],
    title: ['Data Management System', 'Hệ thống quản lý dữ liệu', '数据管理系统'][index],
    greeting: ['Welcome', 'Xin chào', '欢迎'][index],
    dashboardWelcome: ['Have a productive day', 'Hãy làm việc vui vẻ', '祝您工作愉快'][index],
  };
  const common = {
    action: {
      create: ['Create', 'Tạo mới', '创建'][index],
      edit: ['Edit', 'Sửa', '编辑'][index],
      show: ['Show', 'Xem', '查看'][index],
      list: ['List', 'Danh sách', '列表'][index],
      save: ['Save', 'Lưu', '保存'][index],
      delete: ['Delete', 'Xóa', '删除'][index],
      cancel: ['Cancel', 'Hủy', '取消'][index],
      search: ['Search', 'Tìm kiếm', '搜索'][index],
      refresh: ['Refresh', 'Làm mới', '刷新'][index],
      export: ['Export', 'Xuất', '导出'][index],
    },
    navigation: {
      page_rows_per_page: ['Rows per page:', 'Số dòng mỗi trang:', '每页行数：'][index],
      page: ['Page', 'Trang', '页'][index],
      next: ['Next', 'Tiếp', '下一页'][index],
      prev: ['Previous', 'Trước', '上一页'][index],
    },
  };
  const englishRa = englishMessages.ra || {};
  return {
    ...englishMessages,
    ra: {
      ...englishRa,
      action: { ...(englishRa.action || {}), ...common.action },
      navigation: { ...(englishRa.navigation || {}), ...common.navigation },
    },
    resources: { ...(englishMessages.resources || {}), ...resources },
    app,
  };
};

const getInitialLocale = () => {
  try {
    const savedLocale = window.localStorage.getItem('admin.locale');
    return locales.includes(savedLocale) ? savedLocale : 'vi';
  } catch (error) {
    return 'vi';
  }
};

const i18nProvider = polyglotI18nProvider(
  locale => makeMessages(locales.includes(locale) ? locale : 'vi'),
  getInitialLocale()
);

const changeLocale = i18nProvider.changeLocale;
i18nProvider.changeLocale = locale => {
  if (locales.includes(locale)) {
    try {
      window.localStorage.setItem('admin.locale', locale);
    } catch (error) {
      // Language switching still works when browser storage is unavailable.
    }
  }
  return changeLocale(locale);
};

export default i18nProvider;
