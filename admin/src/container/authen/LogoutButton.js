// in src/LogoutButton.js
import React from 'react';
import { connect } from 'react-redux';
import { Responsive, userLogout } from 'react-admin';
import MenuItem from '@material-ui/core/MenuItem';
import Button from '@material-ui/core/Button';
import ExitIcon from '@material-ui/icons/PowerSettingsNew';

const LogoutButton = ({ userLogout, ...rest }) => (
    <Responsive
        xsmall={
            <MenuItem
                onClick={userLogout}
                {...sanitizeRestProps(rest)}
            >
                <ExitIcon /> Logout
            </MenuItem>
        }
        medium={
            <Button
                onClick={userLogout}
                size="small"
                {...sanitizeRestProps(rest)}
            >
                <ExitIcon /> Logout
            </Button>
        }
    />
);
export default connect(undefined, { userLogout })(LogoutButton);


/*
- export default connect(undefined, { userLogout })(MyLogoutButton);
+ const redirectTo = '/';
+ const myCustomUserLogout = () => userLogout(redirectTo);
+ export default connect(undefined, { userLogout: myCustomUserLogout })(MyLogoutButton);
*/