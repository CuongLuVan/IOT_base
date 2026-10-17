import React from 'react';
import BusinessIcon from '@material-ui/icons/Business';
import CategoryIcon from '@material-ui/icons/Category';
import DescriptionIcon from '@material-ui/icons/Description';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import LocalShippingIcon from '@material-ui/icons/LocalShipping';
import ReportProblemIcon from '@material-ui/icons/ReportProblem';
import RoomServiceIcon from '@material-ui/icons/RoomService';
import ShoppingCartIcon from '@material-ui/icons/ShoppingCart';
import { Admin, Resource } from 'react-admin';
import customerAuthProvider from './authProvider';
import customerDataProvider from './dataProvider';
import CustomerLayout from './CustomerLayout';
import CustomerLoginPage from './CustomerLoginPage';
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerDocumentsPage from './pages/CustomerDocumentsPage';
import CustomerLogoutPage from './pages/CustomerLogoutPage';
import CustomerOrdersPage from './pages/CustomerOrdersPage';
import {
  CustomerCompanyPage,
  CustomerLostProductPage,
  CustomerProductGroupPage,
  CustomerProductPage
} from './pages/CustomerRecordsPage';
import CustomerServicesPage from './pages/CustomerServicesPage';

const CustomerApp = ({ onSwitchPortal }) => {
  const LoginPage = (props) => <CustomerLoginPage {...props} onSwitchPortal={onSwitchPortal} />;

  return (
    <Admin
      authProvider={customerAuthProvider}
      dataProvider={customerDataProvider}
      dashboard={CustomerDashboard}
      layout={CustomerLayout}
      loginPage={LoginPage}
      title="Customer Portal"
    >
      <Resource name="company" options={{ label: 'Công ty' }} icon={BusinessIcon} list={CustomerCompanyPage} />
      <Resource name="product_group" options={{ label: 'Danh mục sản phẩm' }} icon={CategoryIcon} list={CustomerProductGroupPage} />
      <Resource name="product" options={{ label: 'Sản phẩm' }} icon={ShoppingCartIcon} list={CustomerProductPage} />
      <Resource name="product_buy" options={{ label: 'Đơn hàng' }} icon={LocalShippingIcon} list={CustomerOrdersPage} />
      <Resource name="product_back" options={{ label: 'Sản phẩm trả lại' }} icon={LocalShippingIcon} list={() => <CustomerOrdersPage isReturn />} />
      <Resource name="product_lost" options={{ label: 'Sản phẩm thất lạc' }} icon={ReportProblemIcon} list={CustomerLostProductPage} />
      <Resource name="service" options={{ label: 'Dịch vụ' }} icon={RoomServiceIcon} list={CustomerServicesPage} />
      <Resource name="documents" options={{ label: 'Giấy tờ' }} icon={DescriptionIcon} list={CustomerDocumentsPage} />
      <Resource name="logout" options={{ label: 'Đăng xuất' }} icon={ExitToAppIcon} list={CustomerLogoutPage} />
    </Admin>
  );
};

export default CustomerApp;

