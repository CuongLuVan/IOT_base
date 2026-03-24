import React, {
    ReactElement,
    useCallback,
    useMemo,
    useRef,
    useEffect,
    useState,
  } from 'react';
import { EditorState ,ContentState,RichUtils,Modifier  } from 'draft-js';
import Editor,{createEditorStateWithText} from '@draft-js-plugins/editor';
import createMentionPlugin, {defaultSuggestionsFilter,} from '@draft-js-plugins/mention';
import { useDispatch,useSelector } from 'react-redux';
import { convertToHTML, convertFromHTML } from 'draft-convert';
/*  onFocus={() => { this.setState({ inputActive: true }); }}
          onBlur={() => { this.setState({ inputActive: false }); }}
          ref={(e) => { this.userInput = e; }}
          onKeyDown={this.handleKeyDown.bind(this)}
          onKeyUp={this.handleKeyUp.bind(this)}
*/
var listUserData = null;

export default function UserInputEditor({summitData}) {
    const ref = useRef(null);
    const [editorState, setEditorState] = useState(EditorState.createEmpty());
    const [open, setOpen] = useState(false);
    const [onChange, setOnChange] = useState(true);
    const [suggestions, setSuggestions] = useState([]);
    const listUser = useSelector(state => state.chatBoxData.list_user);

    const { MentionSuggestions, plugins } = useMemo(() => {
      const mentionPlugin = createMentionPlugin({
        entityMutability: 'IMMUTABLE',
       // theme: mentionsStyles,
        mentionPrefix: '@',
        supportWhitespace: true,
      });
      // eslint-disable-next-line no-shadow
      const { MentionSuggestions } = mentionPlugin;
      // eslint-disable-next-line no-shadow
      const plugins = [mentionPlugin];
      return { plugins, MentionSuggestions };
    }, []);

    useEffect(() => {
        var infoValue = JSON.parse(JSON.stringify(listUser));
        listUserData = infoValue;
    },[listUser])
  
    const onOpenChange = useCallback((_open) => { setOpen(_open); }, []);
    const onSearchChange = useCallback(({ value }) => {
        setSuggestions(defaultSuggestionsFilter(value, listUserData));
    }, []);

    const checkKey=(e)=> {
        e = e || window.event;
        if (e.keyCode == '13') {
            // right arrow
            e.preventDefault(); //Prevent default browser behavior mentionsRef.current.toHtml()
            //convertToHTML(this.state.editorState.getCurrentContent()
            console.log("...listUser ",ref);
            console.log("...listUser ",editorState.getCurrentContent().getPlainText());
            // ref.current.editor.editor.innerHTML
            
            var stringValue = editorState.getCurrentContent().getPlainText();
            var stringHtml = convertToHTML(editorState.getCurrentContent());
            if(stringValue.length > 0) {
                summitData(stringValue);
            }
            let contentState = editorState.getCurrentContent();
            console.log("...listUser stringValue stringHtml",stringValue,stringHtml);
            setTimeout(() => {
              setEditorState(EditorState.createEmpty());
            }, 100);
        }
    }
  
    return (
      <div
        className={"editor"}
        onClick={() => { ref.current.focus();}}>
          {onChange?
        <Editor
          editorKey={'editor'}
          editorState={editorState}
          onChange={setEditorState}
          keyBindingFn={checkKey}
          plugins={plugins}
          ref={ref}
        />:""}
        <MentionSuggestions
          open={open}
          onOpenChange={onOpenChange}
          suggestions={suggestions}
          onSearchChange={onSearchChange}
          onAddMention={() => {
            // get the mention object selected
          }}
        />
      </div>
    );
  }
