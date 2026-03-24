// in src/LoginPage.js
import React, { Component } from 'react';
import { forwardRef } from 'react';
import { useLogout } from 'react-admin';
import { MuiThemeProvider } from '@material-ui/core/styles';
import MenuItem from '@material-ui/core/MenuItem';
import ExitIcon from '@material-ui/icons/PowerSettingsNew';

const  LogoutPage = forwardRef((props, ref) => {
    const logout = useLogout();
    
   // logout();
    const handleClick = () => logout();
    return (
        <MenuItem
            onClick={handleClick}
            ref={ref}
        >
            <ExitIcon /> Logout
        </MenuItem>
    );
});

export default LogoutPage;