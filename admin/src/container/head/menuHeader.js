import * as React from 'react';
import { AppBar ,UserMenu ,MenuItemLink } from 'react-admin';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import { Layout } from 'react-admin';
import AccountCircle from '@material-ui/icons/AccountCircle';
import SettingsIcon from "@material-ui/icons/Settings";
import Avatar from '@material-ui/core/Avatar';
import ManagerData from '../../actions/ManagerData';


  

const UserMenuData = (props) => {
    const [linkAvartar, setLinkAvartar] = React.useState("");
    const [nameUser, setNameUser] = React.useState("");
    const checkUser=()=>{
        if(!!ManagerData.saveInfoUser.username){
                setLinkAvartar(ManagerData.saveInfoUser.avatar);
                setNameUser(ManagerData.saveInfoUser.username);
        }
    };
    setTimeout(()=>{checkUser() },5000);
    return (
      <UserMenu  label={nameUser}  {...props}
        icon={
            <Avatar
                src={linkAvartar}
            />
        }
      >
      </UserMenu>
    );
};
  

const MenuHeader = props => {
    return (
        <AppBar {...props} color="primary"  userMenu={<UserMenuData />} >
            <Typography
                variant="h6"
                color="inherit"
                className={'menu-header-title'}
                id="react-admin-title"
            />
            Hệ thống quản lý dữ liệu
            <span className={'menu-header-spacer'} />
        </AppBar>
    );
};


export default MenuHeader;