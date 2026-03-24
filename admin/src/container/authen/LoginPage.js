// in src/LoginPage.js
import React, { useState } from 'react';
import { useLogin } from 'react-admin';
import { MuiThemeProvider } from '@material-ui/core/styles';
import './authen.css';
const LoginPage = () => {
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const login = useLogin();

    const submit = (e) => {
        e.preventDefault();
        // gather your data/credentials here
        const credentials = { 
          username: userName,
          password: password
        };
        // Dispatch the userLogin action (injected by connect)
        login(credentials);
    }

        return (
            <MuiThemeProvider>
                <div className="auth-container">
                  <div className="auth-deco">
                  {/* Decoration */}
                    <img src="../../../public/image/leaf.svg" alt className="leaf pos-abs" />
                    <img src="../../../public/image/leaf-1.svg" alt className="leaf-1 pos-abs" />
                    <img src="../../../public/image/leaf-2.svg" alt className="leaf-2 pos-abs" />
                    <img src="../../../public/image/leaf-3.svg" alt className="leaf-3 pos-abs" />
                    <img src="../../../public/image/decor.svg" alt className="decor pos-abs" />
                    <img src="../../../public/image/side-image.svg" alt className="side-image pos-abs" />
                    <img src="../../../public/image/decor-1.svg" alt className="decor-1 pos-abs" />
                    <img src="../../../public/image/decor-point.svg" alt className="decor-point pos-abs" />
                    <img src="../../../public/image/decor-point.svg" alt className="decor-point-1 pos-abs" />
                    <img src="../../../public/image/decor-point.svg" alt className="decor-point-2 pos-abs" />
                    <img src="../../../public/image/decor-point.svg" alt className="decor-point-3 pos-abs" />
                    <img src="../../../public/image/decor-point.svg" alt className="decor-point-4 pos-abs" />
                    <img src="../../../public/image/line.svg" alt className="line pos-abs" />
                    <img src="../../../public/image/circle.svg" alt className="circle pos-abs" />
                    <button className="close pos-abs">X</button>  
                    {/* Login */}
                    <form className="box-login" onSubmit={(e) => submit(e)}>
                      <p className="caption">Đăng nhập</p>
                      <p className="font-small">Điền tên đăng nhập</p>
                      <input type="text" placeholder="Tên đăng nhập" className="username" value={userName} onChange={e =>setUserName(e.target.value)} />
                      <p className="font-small">Mật khẩu</p>
                      <input type="password" placeholder="Mật khẩu" className="password" value={password} onChange={e => setPassword(e.target.value)} />
                      <div className="check-pass">
                        <input type="checkbox" />
                        <label for="remember-check" className="remember-pass">Ghi nhớ mật khẩu</label>
                        <span className="forget-pass">Quên mật khẩu?</span>
                      </div>
                      <button type='submit' className="login">Đăng nhập</button>
                      <div className="other-regis">
                        <p className="other-login">Hoặc đăng nhập qua</p>
                        <img src="../../../public/image/facebook.svg" alt className="facebook" />
                        <img src="../../../public/image/google.svg" alt className="google" />
                        <span className="no-account">Chưa có tài khoản?<span className="register-now">
                            Đăng ký</span></span>
                      </div>
                    </form>
                  </div>
                </div>
            </MuiThemeProvider>
        ); 
};

export default LoginPage;