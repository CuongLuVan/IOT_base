import React, { ReactElement,
    useCallback,
    useMemo,
    useRef,
    useState } from 'react';
import '@draft-js-plugins/mention/lib/plugin.css';


import { EditorState,convertToRaw,ContentState  } from 'draft-js';
import Editor from '@draft-js-plugins/editor';
import createMentionPlugin, {
defaultSuggestionsFilter,
} from '@draft-js-plugins/mention';


const isMessageEmpty = (textMessage) => {
    return textMessage.length === 0;
}

const adjustTextMessage = (textMessage) => {
    return textMessage.trim();
};

const TextFormChat = ({dataUserConversation, selectedConversation, onMessageSubmitted }) => {
    const ref = useRef(null);
    const [editorState, setEditorState] = useState(() => EditorState.createEmpty());
    const [open, setOpen] = useState(false);
    const [suggestions, setSuggestions] = useState(dataUserConversation);

    const { MentionSuggestions, plugins } = useMemo(() => {
        const mentionPlugin = createMentionPlugin({
        entityMutability: 'IMMUTABLE',
        mentionPrefix: '@',
        supportWhitespace: true,
        });
    // eslint-disable-next-line no-shadow
    const { MentionSuggestions } = mentionPlugin;
    // eslint-disable-next-line no-shadow
    const plugins = [mentionPlugin];
        return { plugins, MentionSuggestions };
        }, []);

    const onOpenChange = useCallback((_open) => { setOpen(_open); }, []);
    const onSearchChange = useCallback(({ value }) => {
        setSuggestions(defaultSuggestionsFilter(value, dataUserConversation));
    }, []);


    const handleFormSubmit = (e) => {
        e.preventDefault();
        console.log("handleFormSubmit.........",ref.current.editor.editor.textContent);
        if (!isMessageEmpty(ref.current.editor.editor.textContent)) {
            onMessageSubmitted(ref.current.editor.editor.textContent);
            setEditorState((prev) => (EditorState.createEmpty()));
        } 
    };

    function checkKey(e) {

        e = e || window.event;


        if (e.keyCode == '13') {
            // right arrow
            e.preventDefault(); //Prevent default browser behavior
            if (window.getSelection) {
                var selection = window.getSelection(),
                    range = selection.getRangeAt(0),
                    br = document.createElement("br"),
                    textNode = document.createTextNode("\u00a0"); //Passing " " directly will not end up being shown correctly
                range.deleteContents();//required or not?
                range.insertNode(br);
                range.collapse(false);
                range.insertNode(textNode);
                range.selectNodeContents(textNode);

                selection.removeAllRanges();
                selection.addRange(range);
            }
        }

    }


    return (
        <form className="chat-form" onSubmit={handleFormSubmit}>
            <div title="Add Attachment">
                    
            </div>

            <div className={"editor"}
                onClick={() => {
                    ref.current.focus();
                }}>
                    <Editor
                        editorKey={'editor'}
                        editorState={editorState}
                        onChange={setEditorState}
                        plugins={plugins}
                        ref={ref}
                    />
                    <MentionSuggestions
                        open={open}
                        onOpenChange={onOpenChange}
                        suggestions={suggestions}
                        onSearchChange={onSearchChange}
                        onAddMention={() => {
                            // get the mention object selected
                        }} />
            </div>

            <button 
                    type="submit" 
                    className="primary-button"
                    disabled={editorState.length>0}>Send</button>
        </form> 



    );
}

export default TextFormChat;