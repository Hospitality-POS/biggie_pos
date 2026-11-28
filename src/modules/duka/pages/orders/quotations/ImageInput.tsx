import React, { useState } from "react";
import { Button, Upload, message } from "antd";
import { DeleteOutlined, LoadingOutlined, PictureOutlined } from "@ant-design/icons";
import { apiErrorMessage, uploadQuotationImage } from "@services/quotations";

const MAX_MB = 5;

/** Picks an image, uploads it to DigitalOcean Spaces and stores its URL */
const ImageInput: React.FC<{
    value?: string;
    onChange: (url: string | undefined) => void;
    label?: string;
    /** Wide banners (header/footer) vs. small item pictures */
    wide?: boolean;
}> = ({ value, onChange, label = "Add image", wide }) => {
    const [busy, setBusy] = useState(false);
    const size = wide ? { width: 260, height: 60 } : { width: 72, height: 56 };

    const beforeUpload = async (file: File) => {
        if (!file.type.startsWith("image/")) {
            message.error("Choose an image file");
            return Upload.LIST_IGNORE;
        }
        if (file.size > MAX_MB * 1024 * 1024) {
            message.error(`Images must be ${MAX_MB}MB or smaller`);
            return Upload.LIST_IGNORE;
        }
        setBusy(true);
        try {
            onChange(await uploadQuotationImage(file));
        } catch (err) {
            message.error(apiErrorMessage(err, "Couldn't upload the image"));
        } finally {
            setBusy(false);
        }
        // Uploaded by hand above, so antd doesn't send it again
        return Upload.LIST_IGNORE;
    };

    if (value) {
        return (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <img src={value} alt="" style={{ ...size, objectFit: "contain", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }} />
                <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => onChange(undefined)} aria-label="Remove image" />
            </div>
        );
    }

    return (
        <Upload accept="image/*" showUploadList={false} beforeUpload={beforeUpload} disabled={busy}>
            <Button size="small" icon={busy ? <LoadingOutlined /> : <PictureOutlined />} disabled={busy}>
                {busy ? "Uploading…" : label}
            </Button>
        </Upload>
    );
};

export default ImageInput;
