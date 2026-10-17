import React, { useEffect } from 'react';
import { useLogout } from 'react-admin';

const CustomerLogoutPage = () => {
  const logout = useLogout();
  useEffect(() => { logout(); }, [logout]);
  return <p>Đang đăng xuất…</p>;
};

export default CustomerLogoutPage;

