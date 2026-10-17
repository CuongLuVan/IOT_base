import React from 'react';
import { AppBar, DashboardMenuItem, Layout, MenuItemLink } from 'react-admin';
import Typography from '@material-ui/core/Typography';
import BusinessIcon from '@material-ui/icons/Business';
import CategoryIcon from '@material-ui/icons/Category';
import DescriptionIcon from '@material-ui/icons/Description';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import LocalShippingIcon from '@material-ui/icons/LocalShipping';
import ReportProblemIcon from '@material-ui/icons/ReportProblem';
import RoomServiceIcon from '@material-ui/icons/RoomService';
import ShoppingCartIcon from '@material-ui/icons/ShoppingCart';

const CustomerAppBar = (props) => (
  <AppBar {...props} color="primary">
    <Typography variant="h6" color="inherit" id="react-admin-title">Customer Portal</Typography>
  </AppBar>
);

const CustomerMenu = ({ dense, onMenuClick }) => (
  <div>
    <DashboardMenuItem onClick={onMenuClick} dense={dense} primaryText="Tổng quan" />
    <MenuItemLink to="/company" primaryText="Công ty" leftIcon={<BusinessIcon />} onClick={onMenuClick} dense={dense} />
    <MenuItemLink to="/product_group" primaryText="Danh mục sản phẩm" leftIcon={<CategoryIcon />} onClick={onMenuClick} dense={dense} />
    <MenuItemLink to="/product" primaryText="Sản phẩm" leftIcon={<ShoppingCartIcon />} onClick={onMenuClick} dense={dense} />
    <MenuItemLink to="/product_buy" primaryText="Đơn hàng" leftIcon={<LocalShippingIcon />} onClick={onMenuClick} dense={dense} />
    <MenuItemLink to="/product_back" primaryText="Sản phẩm trả lại" leftIcon={<LocalShippingIcon />} onClick={onMenuClick} dense={dense} />
    <MenuItemLink to="/product_lost" primaryText="Sản phẩm thất lạc" leftIcon={<ReportProblemIcon />} onClick={onMenuClick} dense={dense} />
    <MenuItemLink to="/service" primaryText="Dịch vụ" leftIcon={<RoomServiceIcon />} onClick={onMenuClick} dense={dense} />
    <MenuItemLink to="/documents" primaryText="Giấy tờ" leftIcon={<DescriptionIcon />} onClick={onMenuClick} dense={dense} />
    <MenuItemLink to="/logout" primaryText="Đăng xuất" leftIcon={<ExitToAppIcon />} onClick={onMenuClick} dense={dense} />
  </div>
);

const CustomerLayout = (props) => <Layout {...props} appBar={CustomerAppBar} menu={CustomerMenu} />;

export default CustomerLayout;

