import React from 'react';
import DynamicForm from '../form/DynamicForm.js';

// Form fields of state.header; onchangeValue(value, view) on every change.
const DynamicLayout = ({ state,data, onchangeValue }) => {
    return (
            <div  className='test-main-info'>
                {state.header.map((vars) =>
                    <div className='text-info-layout' key={vars.view}>
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
