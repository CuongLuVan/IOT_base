import * as React  from 'react';
import PostIcon from '@material-ui/icons/Book';
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
import { Comment, Settings, Send, Contacts, FeaturedPlayList, KeyboardBackspace, TextFormat, Business, GroupWork ,Accessibility } from '@material-ui/icons';
import AccountBalanceIcon from '@material-ui/icons/AccountBalance';
import ShoppingCartIcon from '@material-ui/icons/ShoppingCart';
import { Admin, Resource, ListGuesser ,Layout } from 'react-admin';
import jsonServerProvider from 'ra-data-json-server';
import { configureStore } from '@reduxjs/toolkit'
import { PostList, PostEdit, PostCreate, PostShow } from './posts';
import UserList  from './container/manager/users.js';
import PagesContent  from './container/manager/PagesContent.js';
import ProductPagesContent  from './container/manager/product/ProductPagesContent';
import RegisterPage  from './container/manager/RegisterPage.js';
import AdvertisementPage  from './container/manager/AdvertisementPage.js';
import AdvertisementProductPage  from './container/manager/product/AdvertisementProductPage.js';

import LockScreen  from './container/manager/LockScreen.js';
import NomalTable  from './container/manager/NomalTable.js';
import LogoutPage  from './container/authen/LogoutPage.js';
import ChatBoxInternal  from './container/message/ChatBoxInternal.js';
import FormChatBox  from './compoment/chat/chatbox.js';
import DialogChat  from './container/message/DialogChat';
//import FooterChat  from './container/message/FooterChat';
//import './styles/index.js';
import Dashboard from './container/manager/Dashboard';
import authProvider from './api/authProvider';
import {HOST_HTTP}  from './config/config.js';
import TreeMenu from './compoment/ra-treemenu';
import { connect } from 'react-redux';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, compose, createStore } from 'redux';
import messageInfo  from './reducers/index';
import MenuHeader from './container/head/menuHeader';
import LoginPage from './container/authen/LoginPage';
import AddProduct from './container/manager/product/AddProduct.js';
import LostProductTable from './container/manager/product/LostProductTable.js';

import AddService from './container/manager/service/AddService';
import ServicePagesContent from './container/manager/service/ServicePagesContent';
import BuyProductTable from './container/manager/product/BuyProductTable.js';
import SaleCompany from './container/manager/report/SaleCompany.js';
import CustomerApproval from './container/manager/CustomerApproval.js';
import DataAllCompany from './container/manager/report/DataAllCompany.js';
import ReportSpecial from './container/manager/report/ReportSpecial.js';

import store from './store/index.jsx';
import chatBoxData from './reducers/chat-box-acess';

const App = () => {
    return (
    <div>
        <Admin
            dataProvider={jsonServerProvider(HOST_HTTP)}
            authProvider={authProvider}
            loginPage = {LoginPage}
            dashboard={Dashboard}
            customReducers={{ chatBoxData }}
            layout={(props) => <Layout {...props} menu={TreeMenu}  appBar={MenuHeader}  />}
            >
            <Resource name="users" options={{label:'Tài khoản'  }} icon={UserIcon} list={UserList} />
            {/*  Mqtt*/}
            <Resource name="mqtt" options={{label:'Quản lý mqtt' ,"isMenuParent": true }} icon={BuildIcon} list={LockScreen} />
            <Resource name="mqtt_microservice" options={{label:'Tạo microservice',"menuParent": "mqtt"}} icon={BuildIcon} list={NomalTable} />
            <Resource name="mqtt_user" options={{label:'mqtt khách hàng',"menuParent": "mqtt"}} icon={SupervisorAccountIcon} list={NomalTable} />
            {/* bài báo*/}
            <Resource name="sPages" options={{label:'Nhóm bài báo' ,"isMenuParent": true }} icon={FeaturedPlayList}  list={LockScreen} />
            <Resource name="group_content_sub" options={{label:'Nhóm bài báo' ,"menuParent": "sPages"}} icon={FeaturedPlayList} list={NomalTable} />
            <Resource name="managerpages" options={{label:'Quản lý bài báo',"menuParent": "sPages" }} icon={Settings} list={PagesContent} />
            <Resource name="registerPage" options={{label:'viết bài',"menuParent": "sPages" }} icon={TextFormat} list={RegisterPage} />
            {/* Quảng bá*/}
            <Resource name="advertisementDetail" options={{label:'Quảng bá' ,"isMenuParent": true }} icon={ExtensionIcon} list={LockScreen} />
            <Resource name="advertisement_content" options={{label:'Danh sách',"menuParent": "advertisementDetail" }} icon={ListAltIcon}  list={NomalTable} />
            <Resource name="advertisementPages" options={{label:'BVQB',"menuParent": "advertisementDetail" }} icon={ExtensionIcon} list={AdvertisementPage} />
            <Resource name="advertisement_product" options={{label:'DSQC',"menuParent": "advertisementDetail" }} icon={ListAltIcon}  list={NomalTable} />
            <Resource name="advertisementProductPages" options={{label:'Quảng cáo',"menuParent": "advertisementDetail" }} icon={ExtensionIcon} list={AdvertisementProductPage} />
            {/* Dịch vụ*/}
            <Resource name="service_x" options={{label:'Dịch vụ' ,"isMenuParent": true }} icon={RoomServiceIcon}  list={LockScreen} />
            <Resource name="addservice" options={{label:'Thêm sản phẩm',"menuParent": "service_x" }} icon={ControlPointIcon}  list={AddService} />
            <Resource name="service_group" options={{label:'Dịch vụ',"menuParent": "service_x" }} icon={ListAltIcon}  list={NomalTable} />
            <Resource name="service" options={{label:'Chi tiết dịch vụ',"menuParent": "service_x" }} icon={ListAltIcon}  list={NomalTable} />
            <Resource name="service_bill" options={{label:'Hóa đơn',"menuParent": "service_x" }} icon={ReceiptIcon}  list={NomalTable} />
            <Resource name="service_charging" options={{label:'Nạp tiền',"menuParent": "service_x" }} icon={AttachMoneyIcon}  list={NomalTable} />
            <Resource name="return_service" options={{label:'Trả lại dịch vụ',"menuParent": "service_x" }} icon={KeyboardReturnIcon}  list={NomalTable} />
            <Resource name="service_pages" options={{label:'Bài viết',"menuParent": "service_x" }} icon={KeyboardReturnIcon}  list={ServicePagesContent} />
            
        
            {/* Sản phẩm*/}
            <Resource name="products" options={{label:'Sản phẩm' ,"isMenuParent": true }} icon={ShoppingCartIcon}  list={LockScreen} />
            <Resource name="addproduct" options={{label:'Thêm sản phẩm',"menuParent": "products" }} icon={ControlPointIcon}  list={AddProduct} />
           
            <Resource name="product_buy" options={{label:'Mua hàng',"menuParent": "products" }} icon={ShoppingCartIcon}  list={BuyProductTable} />
            <Resource name="product_buy_detail" options={{label:'Hóa đơn',"menuParent": "products" }} icon={ReceiptIcon}  list={NomalTable} />
            {/*<Resource name="product_back" options={{label:'Trả lại hàng',"menuParent": "products" }} icon={KeyboardReturnIcon}  list={NomalTable} />  */}
            <Resource name="product_lost" options={{label:'Thất lạc',"menuParent": "products" }} icon={HighlightOffIcon}  list={LostProductTable} />
            <Resource name="product" options={{label:'Chi tiết sản phẩm',"menuParent": "products" }} icon={DetailsIcon}  list={NomalTable} />
            <Resource name="product_store" options={{label:'Kho',"menuParent": "products" }} icon={GroupWork}  list={NomalTable}  />
            <Resource name="product_pages" options={{label:'Bài viết',"menuParent": "products" }} icon={GroupWork}  list={ProductPagesContent}  />

            <Resource name="cost" options={{label:'Chi phí phát sinh' ,"isMenuParent": true }} icon={ShoppingCartIcon}  list={LockScreen} />
            <Resource name="cost_transport" options={{label:'Loại vận chuyển',"menuParent": "cost" }} icon={GroupWork}  list={NomalTable}  />
            <Resource name="payment_type" options={{label:'Loại chi phí',"menuParent": "cost" }} icon={GroupWork}  list={NomalTable}  />
            <Resource name="payment_internal" options={{label:'Chi phí nội bộ',"menuParent": "cost" }} icon={GroupWork}  list={NomalTable}  />
            <Resource name="payment_transport" options={{label:'Vận chuyển',"menuParent": "cost" }} icon={GroupWork}  list={NomalTable}  />

            {/* Khách hàng */}
            <Resource name="customers" options={{label:'Khách hàng' ,"isMenuParent": true }} icon={Contacts}  list={LockScreen} />
            <Resource name="company" options={{label:'Công ty',"menuParent": "customers" }} icon={Business}  list={NomalTable} />
            <Resource name="customer" options={{label:'Khách hàng',"menuParent": "customers" }} icon={Contacts}  list={NomalTable} />
            <Resource name="detailbank" options={{label:'Ngân hàng',"menuParent": "customers" }} icon={AccountBalanceIcon}  list={NomalTable} />
            <Resource name="enterprise" options={{label:'Doanh nghiệp',"menuParent": "customers" }} icon={LocationCityIcon} list={NomalTable} />
            <Resource name="social_user" options={{label:'Báo Tin nhắn',"menuParent": "customers" }} icon={Accessibility} list={NomalTable} />
            <Resource name="group_company" options={{label:'Nhóm kinh doanh',"menuParent": "customers" }} icon={Accessibility} list={NomalTable} />
            <Resource name="group_company_detail" options={{label:'Chi tiết Nhóm kinh doanh',"menuParent": "customers" }} icon={Accessibility} list={NomalTable} />
            <Resource name="customer_check" options={{label:'Duyệt công ty',"menuParent": "customers" }} icon={Contacts}  list={CustomerApproval} />

            {/* Khách hàng */}
            <Resource name="report" options={{label:'Báo cáo' ,"isMenuParent": true }} icon={Contacts}  list={LockScreen} />
            <Resource name="report_all" options={{label:'Công ty',"menuParent": "report" }} icon={Business}  list={SaleCompany} />
            <Resource name="report_table" options={{label:'Báo cáo doanh số',"menuParent": "report" }} icon={Business}  list={DataAllCompany} />
            <Resource name="report_special" options={{label:'Báo đặc thù',"menuParent": "report" }} icon={Business}  list={ReportSpecial} />
        
            <Resource name="comments" options={{label:'comments'  }} icon={Comment} list={DialogChat} />
            <Resource name="chatbox" options={{label:'Nhắn tin'}} icon={Send} list={ChatBoxInternal} /> 
            {/*<FooterChat />*/}
        </Admin>
        
    </div>
    );
    
    };
export default App;
