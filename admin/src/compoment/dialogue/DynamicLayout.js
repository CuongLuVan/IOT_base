import React, { useState } from 'react';
import DynamicForm from '../form/DynamicForm.js';

//"content","number","contain","expridate"
const DynamicLayout = ({ state,data, onchangeValue }) => {
    return (
            <div  className='test-main-info'>
                {state.header.map((vars) =>
                    <div className='text-info-layout'>
                        <DynamicForm
                            value = {vars}
                            valueDetail ={data[vars.view]}
                            selectTabble={vars.selectTabble}
                            objectData ={data}
                            onChange={(event) => {
                                onchangeValue(event.target.value, vars.view); 
                            }}
                        />
                    </div>
                )}
            </div>
            
            
    );
}

export default DynamicLayout;
