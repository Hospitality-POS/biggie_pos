import React from "react";
import { Editor } from "@tinymce/tinymce-react";

interface TinyMCEInputProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    height?: number;
    plainText?: boolean;
    /** Full formatting toolbar (headings, paragraphs, lists) for long-form content. */
    rich?: boolean;
}

const RICH_TOOLBAR =
    "blocks | bold italic underline | bullist numlist | alignleft aligncenter | link | removeformat";

const TinyMCEInput: React.FC<TinyMCEInputProps> = ({
    value,
    onChange,
    placeholder,
    height = 200,
    plainText = false,
    rich = false,
}) => {
    // Plain-text values carry "\n" line breaks; the editor renders HTML, so
    // without converting them every line would collapse into one.
    const editorValue =
        plainText && value && !/<[a-z][\s\S]*>/i.test(value)
            ? value
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/\n/g, "<br>")
            : value;

    return (
        <Editor
            tinymceScriptSrc="https://cdn.jsdelivr.net/npm/tinymce@6/tinymce.min.js"
            value={editorValue}
            onEditorChange={(content, editor) => {
                onChange?.(plainText ? editor.getContent({ format: "text" }) : content);
            }}
            init={{
                height,
                menubar: false,
                statusbar: false,
                plugins: "lists link",
                toolbar: plainText ? false : rich ? RICH_TOOLBAR : "bold italic | bullist numlist | link",
                block_formats: "Paragraph=p; Heading=h3; Subheading=h4",
                placeholder,
                paste_as_text: plainText,
                // Strip Word/Docs styling on paste so the website keeps its own fonts
                paste_remove_styles_if_webkit: true,
                invalid_styles: rich ? { "*": "font-family font-size color background-color" } : undefined,
                content_style:
                    "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; padding: 12px; }",
                // Rich content needs real paragraphs; short fields keep the old inline behaviour
                // (TinyMCE's types only allow a string, but `false` is what short fields always used)
                forced_root_block: rich ? "p" : (false as unknown as string),
            }}
        />
    );
};

export default TinyMCEInput;
