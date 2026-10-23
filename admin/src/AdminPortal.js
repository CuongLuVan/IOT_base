import React from 'react';
import UserIcon from '@material-ui/icons/Group';
import ExtensionIcon from '@material-ui/icons/Extension';
import SupervisorAccountIcon from '@material-ui/icons/SupervisorAccount';
import ListAltIcon from '@material-ui/icons/ListAlt';
import LocationCityIcon from '@material-ui/icons/LocationCity';
import BuildIcon from '@material-ui/icons/Build';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import RoomServiceIcon from '@material-ui/icons/RoomService';
import ReceiptIcon from '@material-ui/icons/Receipt';
import AttachMoneyIcon from '@material-ui/icons/AttachMoney';
import KeyboardReturnIcon from '@material-ui/icons/KeyboardReturn';
import ControlPointIcon from '@material-ui/icons/ControlPoint';
import DetailsIcon from '@material-ui/icons/Details';
import { Accessibility, Business, Comment, Contacts, FeaturedPlayList, GroupWork, Send, Settings, TextFormat } from '@material-ui/icons';
import AccountBalanceIcon from '@material-ui/icons/AccountBalance';
import ShoppingCartIcon from '@material-ui/icons/ShoppingCart';
import { Admin, Layout, Resource } from 'react-admin';
import jsonServerProvider from 'ra-data-json-server';
import LockScreen from './container/manager/LockScreen.js';
import authProvider from './api/authProvider';
import { HOST_HTTP } from './config/config.js';
import TreeMenu from './compoment/ra-treemenu';
import MenuHeader from './container/head/menuHeader';
import LoginPage from './container/authen/LoginPage';
import chatBoxData from './reducers/chat-box-acess';

const ResourceLoading = () => <div style={{ padding: 24 }}>Đang tải màn hình…</div>;
const lazyResource = (loader) => {
  const Screen = React.lazy(loader);
  return (props) => (
    <React.Suspense fallback={<ResourceLoading />}>
      <Screen {...props} />
    </React.Suspense>
  );
};

const UserList = lazyResource(() => import(/* webpackChunkName: "admin-users" */ './container/manager/users.js'));
const PagesContent = lazyResource(() => import(/* webpackChunkName: "admin-pages" */ './container/manager/PagesContent.js'));
const ProductPagesContent = lazyResource(() => import(/* webpackChunkName: "admin-product-pages" */ './container/manager/product/ProductPagesContent'));
const RegisterPage = lazyResource(() => import(/* webpackChunkName: "admin-register-page" */ './container/manager/RegisterPage.js'));
const AdvertisementPage = lazyResource(() => import(/* webpackChunkName: "admin-advertisement" */ './container/manager/AdvertisementPage.js'));
const AdvertisementProductPage = lazyResource(() => import(/* webpackChunkName: "admin-product-advertisement" */ './container/manager/product/AdvertisementProductPage.js'));
const NomalTable = lazyResource(() => import(/* webpackChunkName: "admin-table" */ './container/manager/NomalTable.js'));
const ChatBoxInternal = lazyResource(() => import(/* webpackChunkName: "admin-chat" */ './container/message/ChatBoxInternal.js'));
const DialogChat = lazyResource(() => import(/* webpackChunkName: "admin-dialog-chat" */ './container/message/DialogChat'));
const Dashboard = lazyResource(() => import(/* webpackChunkName: "admin-dashboard" */ './container/manager/Dashboard'));
const AddProduct = lazyResource(() => import(/* webpackChunkName: "admin-product-editor" */ './container/manager/product/AddProduct.js'));
const LostProductTable = lazyResource(() => import(/* webpackChunkName: "admin-product-lost" */ './container/manager/product/LostProductTable.js'));
const AddService = lazyResource(() => import(/* webpackChunkName: "admin-service-editor" */ './container/manager/service/AddService'));
const ServicePagesContent = lazyResource(() => import(/* webpackChunkName: "admin-service-pages" */ './container/manager/service/ServicePagesContent'));
const BuyProductTable = lazyResource(() => import(/* webpackChunkName: "admin-product-buy" */ './container/manager/product/BuyProductTable.js'));
const SaleCompany = lazyResource(() => import(/* webpackChunkName: "admin-sale-company" */ './container/manager/report/SaleCompany.js'));
const CustomerApproval = lazyResource(() => import(/* webpackChunkName: "admin-customer-approval" */ './container/manager/CustomerApproval.js'));
const AdminDocumentReview = lazyResource(() => import(/* webpackChunkName: "admin-document-review" */ './container/manager/AdminDocumentReview.js'));
const DataAllCompany = lazyResource(() => import(/* webpackChunkName: "admin-report-table" */ './container/manager/report/DataAllCompany.js'));
const ReportSpecial = lazyResource(() => import(/* webpackChunkName: "admin-report-special" */ './container/manager/report/ReportSpecial.js'));
const MachineMonitoring = lazyResource(() => import(/* webpackChunkName: "admin-machine-monitoring" */ './container/pages/MachineMonitoring'));
const OeeDashboard = lazyResource(() => import(/* webpackChunkName: "admin-oee-dashboard" */ './container/pages/OeeDashboard'));
const LineOeeDashboard = lazyResource(() => import(/* webpackChunkName: "admin-line-oee" */ './container/pages/LineOeeDashboard'));
const adminDataProvider = jsonServerProvider(HOST_HTTP);
const adminReducers = { chatBoxData };
const AdminLayout = (props) => <Layout {...props} menu={TreeMenu} appBar={MenuHeader} />;

const AdminPortal = ({ onSwitchPortal }) => {
  const AdminLoginPage = React.useCallback(
    (props) => <LoginPage {...props} onSwitchPortal={onSwitchPortal} />,
    [onSwitchPortal]
  );

  return (
    <Admin
      dataProvider={adminDataProvider}
      authProvider={authProvider}
      loginPage={AdminLoginPage}
      dashboard={Dashboard}
      customReducers={adminReducers}
      layout={AdminLayout}
    >
      <Resource name="users" options={{ label: 'Tài khoản' }} icon={UserIcon} list={UserList} />

      <Resource name="mqtt" options={{ label: 'Quản lý mqtt', isMenuParent: true }} icon={BuildIcon} list={LockScreen} />
      <Resource name="mqtt_microservice" options={{ label: 'Tạo microservice', menuParent: 'mqtt' }} icon={BuildIcon} list={NomalTable} />
      <Resource name="mqtt_user" options={{ label: 'mqtt khách hàng', menuParent: 'mqtt' }} icon={SupervisorAccountIcon} list={NomalTable} />
      <Resource name="machine_monitoring" options={{ label: 'Machine Monitor', menuParent: 'mqtt' }} icon={BuildIcon} list={MachineMonitoring} />
      <Resource name="oee_dashboard" options={{ label: 'OEE Dashboard', menuParent: 'mqtt' }} icon={BuildIcon} list={OeeDashboard} />
      <Resource name="line_oee" options={{ label: 'Line OEE Overview', menuParent: 'mqtt' }} icon={BuildIcon} list={LineOeeDashboard} />

      <Resource name="sPages" options={{ label: 'Nhóm bài báo', isMenuParent: true }} icon={FeaturedPlayList} list={LockScreen} />
      <Resource name="group_content_sub" options={{ label: 'Nhóm bài báo', menuParent: 'sPages' }} icon={FeaturedPlayList} list={NomalTable} />
      <Resource name="managerpages" options={{ label: 'Quản lý bài báo', menuParent: 'sPages' }} icon={Settings} list={PagesContent} />
      <Resource name="registerPage" options={{ label: 'Viết bài', menuParent: 'sPages' }} icon={TextFormat} list={RegisterPage} />

      <Resource name="advertisementDetail" options={{ label: 'Quảng bá', isMenuParent: true }} icon={ExtensionIcon} list={LockScreen} />
      <Resource name="advertisement_content" options={{ label: 'Danh sách', menuParent: 'advertisementDetail' }} icon={ListAltIcon} list={NomalTable} />
      <Resource name="advertisementPages" options={{ label: 'BVQB', menuParent: 'advertisementDetail' }} icon={ExtensionIcon} list={AdvertisementPage} />
      <Resource name="advertisement_product" options={{ label: 'DSQC', menuParent: 'advertisementDetail' }} icon={ListAltIcon} list={NomalTable} />
      <Resource name="advertisementProductPages" options={{ label: 'Quảng cáo', menuParent: 'advertisementDetail' }} icon={ExtensionIcon} list={AdvertisementProductPage} />

      <Resource name="service_x" options={{ label: 'Dịch vụ', isMenuParent: true }} icon={RoomServiceIcon} list={LockScreen} />
      <Resource name="addservice" options={{ label: 'Thêm sản phẩm', menuParent: 'service_x' }} icon={ControlPointIcon} list={AddService} />
      <Resource name="service_group" options={{ label: 'Dịch vụ', menuParent: 'service_x' }} icon={ListAltIcon} list={NomalTable} />
      <Resource name="service" options={{ label: 'Chi tiết dịch vụ', menuParent: 'service_x' }} icon={ListAltIcon} list={NomalTable} />
      <Resource name="service_bill" options={{ label: 'Hóa đơn', menuParent: 'service_x' }} icon={ReceiptIcon} list={NomalTable} />
      <Resource name="service_charging" options={{ label: 'Nạp tiền', menuParent: 'service_x' }} icon={AttachMoneyIcon} list={NomalTable} />
      <Resource name="return_service" options={{ label: 'Trả lại dịch vụ', menuParent: 'service_x' }} icon={KeyboardReturnIcon} list={NomalTable} />
      <Resource name="service_pages" options={{ label: 'Bài viết', menuParent: 'service_x' }} icon={KeyboardReturnIcon} list={ServicePagesContent} />

      <Resource name="products" options={{ label: 'Sản phẩm', isMenuParent: true }} icon={ShoppingCartIcon} list={LockScreen} />
      <Resource name="addproduct" options={{ label: 'Thêm sản phẩm', menuParent: 'products' }} icon={ControlPointIcon} list={AddProduct} />
      <Resource name="product_buy" options={{ label: 'Mua hàng', menuParent: 'products' }} icon={ShoppingCartIcon} list={BuyProductTable} />
      <Resource name="product_buy_detail" options={{ label: 'Hóa đơn', menuParent: 'products' }} icon={ReceiptIcon} list={NomalTable} />
      <Resource name="product_lost" options={{ label: 'Thất lạc', menuParent: 'products' }} icon={HighlightOffIcon} list={LostProductTable} />
      <Resource name="product" options={{ label: 'Chi tiết sản phẩm', menuParent: 'products' }} icon={DetailsIcon} list={NomalTable} />
      <Resource name="product_store" options={{ label: 'Kho', menuParent: 'products' }} icon={GroupWork} list={NomalTable} />
      <Resource name="product_pages" options={{ label: 'Bài viết', menuParent: 'products' }} icon={GroupWork} list={ProductPagesContent} />

      <Resource name="cost" options={{ label: 'Chi phí phát sinh', isMenuParent: true }} icon={ShoppingCartIcon} list={LockScreen} />
      <Resource name="cost_transport" options={{ label: 'Loại vận chuyển', menuParent: 'cost' }} icon={GroupWork} list={NomalTable} />
      <Resource name="payment_type" options={{ label: 'Loại chi phí', menuParent: 'cost' }} icon={GroupWork} list={NomalTable} />
      <Resource name="payment_internal" options={{ label: 'Chi phí nội bộ', menuParent: 'cost' }} icon={GroupWork} list={NomalTable} />
      <Resource name="payment_transport" options={{ label: 'Vận chuyển', menuParent: 'cost' }} icon={GroupWork} list={NomalTable} />

      <Resource name="customers" options={{ label: 'Khách hàng', isMenuParent: true }} icon={Contacts} list={LockScreen} />
      <Resource name="company" options={{ label: 'Công ty', menuParent: 'customers' }} icon={Business} list={NomalTable} />
      <Resource name="customer" options={{ label: 'Khách hàng', menuParent: 'customers' }} icon={Contacts} list={NomalTable} />
      <Resource name="detailbank" options={{ label: 'Ngân hàng', menuParent: 'customers' }} icon={AccountBalanceIcon} list={NomalTable} />
      <Resource name="enterprise" options={{ label: 'Doanh nghiệp', menuParent: 'customers' }} icon={LocationCityIcon} list={NomalTable} />
      <Resource name="social_user" options={{ label: 'Báo Tin nhắn', menuParent: 'customers' }} icon={Accessibility} list={NomalTable} />
      <Resource name="group_company" options={{ label: 'Nhóm kinh doanh', menuParent: 'customers' }} icon={Accessibility} list={NomalTable} />
      <Resource name="group_company_detail" options={{ label: 'Chi tiết Nhóm kinh doanh', menuParent: 'customers' }} icon={Accessibility} list={NomalTable} />
      <Resource name="customer_check" options={{ label: 'Duyệt công ty', menuParent: 'customers' }} icon={Contacts} list={CustomerApproval} />
      <Resource name="customer_document_review" options={{ label: 'Duyệt giấy tờ', menuParent: 'customers' }} icon={Contacts} list={AdminDocumentReview} />

      <Resource name="report" options={{ label: 'Báo cáo', isMenuParent: true }} icon={Contacts} list={LockScreen} />
      <Resource name="report_all" options={{ label: 'Công ty', menuParent: 'report' }} icon={Business} list={SaleCompany} />
      <Resource name="report_table" options={{ label: 'Báo cáo doanh số', menuParent: 'report' }} icon={Business} list={DataAllCompany} />
      <Resource name="report_special" options={{ label: 'Báo đặc thù', menuParent: 'report' }} icon={Business} list={ReportSpecial} />

      <Resource name="comments" options={{ label: 'comments' }} icon={Comment} list={DialogChat} />
      <Resource name="chatbox" options={{ label: 'Nhắn tin' }} icon={Send} list={ChatBoxInternal} />
    </Admin>
  );
};

export default AdminPortal;
