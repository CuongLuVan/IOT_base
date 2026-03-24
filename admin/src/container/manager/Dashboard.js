
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardHeader from '@material-ui/core/CardHeader';
import React, {useState, useEffect } from 'react';
import { getCurUser } from '../../api/httpBaseUtil';
import ManagerData from '../../actions/ManagerData.js';

const Dashboard =() =>{
    useEffect(() => {
        getCurUser().then((infoUser)=>{
            for(var k in infoUser.data.user) {
              ManagerData.saveInfoUser[k]=infoUser.data.user[k];
            }
            ManagerData.saveInfoUser.is_checked =true;
          });
    }, []);
    return (
        <Card>
            <CardHeader title="Xin chào" />
            <CardContent> Hãy làm việc vui vẻ </CardContent>
        </Card>
    )
};
export default Dashboard;

