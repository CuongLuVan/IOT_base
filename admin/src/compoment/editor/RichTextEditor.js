import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
 // Custom image upload function
 import {MyCustomUploadAdapterPlugin} from '../../api/uploadAdatapter.js';
 // Introducing the ckeditor5 plugin
import { CKEditor } from '@ckeditor/ckeditor5-react';
import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';

export default class Rich_text_editor extends PureComponent {
    static propTypes = {
        handerUpdate: PropTypes.func.isRequired,
        content:PropTypes.string.isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
          loading: false,
        }
        this.editor = {};
      }
      render () {
        const custom_config = {
            extraPlugins: [ MyCustomUploadAdapterPlugin ],
          };
            return (
                <div className={'document-editor'}>
                <div id="toolbar-container"></div>
                <CKEditor
                    editor={DecoupledEditor}
                    data={this.props.content}
                    config={custom_config}
                    onReady={(editor) => {
                    const toolbarContainer = document.querySelector("#toolbar-container");
                    toolbarContainer.appendChild(editor.ui.view.toolbar.element);
                    window.editor = editor;
                    console.log("Editor is ready to use!", editor);
                    }}
                    onChange={(event, editor) => {
                    const data = editor.getData();
                    this.props.handerUpdate(data);
                    console.log({ event, editor, data });
                    }}
                    onBlur={(event, editor) => {
                    console.log("Blur.", editor);
                    console.log(editor.getData());
                    }}
                    onFocus={(event, editor) => {
                    console.log("Focus.", editor);
                    }}
                />
                </div>
            );
        }
     
  /*    componentDidMount() {
             // accept incoming initial content
        this.init();
      }
     
      init(){

        DecoupledEditor
            .create(
                    // the label of the text content
            document.querySelector( '#editor' ),
            {
                plugin:"Link",
                requiredBy:"CKFinder",
                extraPlugins: [ MyCustomUploadAdapterPlugin ],
                        // remove the component
                removePlugins: [ 'Link', 'MediaEmbed' ],
                        // Custom font size list
                fontSize: {options: [10,12,14,16,18,20,24,36]},
                        // Custom font list
                fontFamily:{
                options: [
                        'default',
                        'Arial, Helvetica, sans-serif',
                        'Courier New, Courier, monospace',
                        'Georgia, serif',
                        'Lucida Sans Unicode, Lucida Grande, sans-serif',
                        'Tahoma, Geneva, sans-serif',
                        'Times New Roman, Times, serif',
                        'Trebuchet MS, Helvetica, sans-serif',
                        'Verdana, Geneva, sans-serif',
                    ]},
                        // Custom heading list
                heading: {
                options: [
                                { model: 'paragraph', title: 'body', class: 'ck-heading_paragraph' },
                                { model: 'heading1', view: 'h1', title: 'title 1', class: 'ck-heading_heading1' },
                                { model: 'heading2', view: 'h2', title: 'title 2', class: 'ck-heading_heading2' },
                                { model: 'heading3', view: 'h3', title: 'title 3', class: 'ck-heading_heading3' },
                                { model: 'heading4', view: 'h4', title: 'title 4', class: 'ck-heading_heading4' },
                        ]
                },
                        // Custom image toolbar content
                image: {
                toolbar: [  'imageStyle:full', 'imageStyle:side', '|', 'imageTextAlternative' ]
                }
                        // There are other, please check the official documentation if necessary, the format is basically the same
            }
            )
            .then( editor => {
                    // Select the label where the toolbar is located
                const toolbarContainer = document.querySelector( '#toolbar-container' );
                toolbarContainer.appendChild( editor.ui.view.toolbar.element );
            
                this.editor = editor;
                        // Triggered when the content changes, get the content, because I wrote the next step directly.
                editor.model.document.on('change:data', (e)=>{
                    let richText = editor.getData();
                    this.props.handerUpdate(richText);
                })
            })
            .catch( error => {
                console.error( error );
            });
        }
     
         // image upload status
    uploadType=(type)=>{
        this.setState({
          loading: type
        })
    }
     
    render () {
        return (

              <div className={'document-editor-edit'} >
                <div id="toolbar-container" className={'document-editor__toolbar'}></div>
                <div id="editor" className={'document-editor'} >
                                 <p>Please enter text content...</p>
                </div>
              </div>
        );
    }

*/
}