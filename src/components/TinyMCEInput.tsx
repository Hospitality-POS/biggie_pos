import React from "react";
import { Editor } from "@tinymce/tinymce-react";

interface TinyMCEInputProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    height?: number;
    plainText?: boolean;
}

const TinyMCEInput: React.FC<TinyMCEInputProps> = ({
    value,
    onChange,
    placeholder,
    height = 200,
    plainText = false,
}) => {
    return (
        <Editor
            tinymceScriptSrc="https://cdn.jsdelivr.net/npm/tinymce@6/tinymce.min.js"
            value={value}
            onEditorChange={(content, editor) => {
                onChange?.(plainText ? editor.getContent({ format: "text" }) : content);
            }}
            init={{
                height,
                menubar: false,
                statusbar: false,
                plugins: "lists link",
                toolbar: plainText ? false : "bold italic | bullist numlist | link",
                placeholder,
                paste_as_text: plainText,
                content_style:
                    "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; padding: 12px; }",
                forced_root_block: false,
            }}
        />
    );
};

export default TinyMCEInput;
