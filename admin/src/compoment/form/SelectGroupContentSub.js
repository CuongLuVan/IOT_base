import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
    FormControl,
    Button,
    InputLabel,
    MenuItem,
    Select,
    TextField
} from '@material-ui/core';
import ManagerData from '../../actions/ManagerData.js'


const SelectGroupContentSub = ({ detailValue,onChange }) => {
   // const [ handleClose] = useState()
   console.log("Cho nay OK");
   var group_content_sub =ManagerData.getTable("group_content_sub");
   var group_content = ManagerData.getTable("group_content");
   var idSelect = 0;
   var item = group_content_sub.filter(o=>o.group_content_sub_id==detailValue);
   if(item.length>0){
       var itemMainMenu = group_content.filter(o=>o.group_content_id==item[0].group_content_id);
       if(itemMainMenu.length>0){
        idSelect=itemMainMenu[0].group_content_id;
       }   
   }
    var  data_group_content=group_content_sub.filter(o=>o.group_content_id==idSelect);

    const [state, setState] = useState({
        group_content: group_content ,
        group_content_sub: data_group_content,
        detailInfo:{sub_id:detailValue,id:idSelect},
    });


    const  onChangeSub= (content,detail)=>{
            var value= state.detailInfo;
            value[detail] =content.target.value;
            console.log("Content: " + content);
            if(detail=='id')
            {
                value.sub_id=0;
                var group_content_sub =ManagerData.getTable("group_content_sub");
                var group_content_select  = group_content_sub.filter(o=>o.group_content_id==content.target.value);
                setState((prev) => ({
                    ...prev,
                    group_content_sub:group_content_select,
                    detailInfo: value
                  })
                );
            }
            else
            {
                setState((prev) => ({
                    ...prev,
                    detailInfo: value
                  })
                );
                onChange(content);
            }               
    }

    

    return (
        <div className={'dp-i'}>
            <FormControl variant="outlined" className={'input-pages-register'}>
                <InputLabel className={'register-label'} shrink id="demo-simple-select-menu">
                    Chuyên mục (menu)
                </InputLabel>
                <Select
                    className={'margin-right-register'}
                    labelId="demo-simple-select-menu"
                    id="status"
                    value={state.detailInfo.id}
                    onChange={(event) => {
                        onChangeSub(event,"id");
                    // setRole(event.target.value);
                    }}
                >
                    {state.group_content.map((vars) => (
                        <MenuItem value={vars.group_content_id} key={vars.group_content_id}>
                        {vars.group_content}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <FormControl variant="outlined" className={'input-pages-register'}>
                <InputLabel className={'register-label'} shrink id="demo-simple-select-menu1">
                    Chuyên mục chi tiết
                </InputLabel>
                <Select
                    className={'margin-right-register'}
                    labelId="demo-simple-select-menu1"
                    id="status"
                    value={state.detailInfo.sub_id}
                    onChange={(event) => {
                        onChangeSub(event,"sub_id");
                    // setRole(event.target.value);
                    }}
                >
                    {state.group_content_sub.map((vars) => (
                        <MenuItem value={vars.group_content_sub_id} key={vars.group_content_sub_id}>
                        {vars.group_content}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </div>
    );
}

export default SelectGroupContentSub;
