import * as React from 'react';
import { AppBar, UserMenu, useTranslate } from 'react-admin';
import Typography from '@material-ui/core/Typography';
import Avatar from '@material-ui/core/Avatar';
import ManagerData from '../../actions/ManagerData';
import LanguageSelector from './LanguageSelector';

const UserMenuData = props => {
    const [linkAvartar, setLinkAvartar] = React.useState('');
    const [nameUser, setNameUser] = React.useState('');
    React.useEffect(() => {
        const checkUser = () => {
            if (ManagerData.saveInfoUser.username) {
                setLinkAvartar(ManagerData.saveInfoUser.avatar);
                setNameUser(ManagerData.saveInfoUser.username);
            }
        };
        checkUser();
        const intervalId = window.setInterval(checkUser, 5000);
        return () => window.clearInterval(intervalId);
    }, []);

    return (
        <UserMenu label={nameUser} {...props} icon={<Avatar src={linkAvartar} />} />
    );
};

const MenuHeader = props => {
    const translate = useTranslate();
    return (
        <AppBar {...props} color="primary" userMenu={<UserMenuData />}>
            <Typography
                variant="h6"
                color="inherit"
                className="menu-header-title"
                id="react-admin-title"
            />
            {translate('app.title')}
            <span className="menu-header-spacer" />
            <LanguageSelector />
        </AppBar>
    );
};

export default MenuHeader;
