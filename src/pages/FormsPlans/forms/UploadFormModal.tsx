import React, { useState } from "react";
import { Modal, Upload, Input, Select, Typography, message, Space } from "antd";
import type { UploadFile } from "antd";
import { CloudUploadOutlined, FilePdfOutlined, FileWordOutlined, CameraOutlined } from "@ant-design/icons";
import { THEME_C } from "@utils/getPrimaryColor";
import { uploadFormTemplate, apiErrorMessage } from "@services/formTemplates";
import { useAudience } from "../audience";
import type { FormCategory, FormTemplate } from "./types";

const { Text } = Typography;
const C = THEME_C;

const ACCEPT = ".pdf,.docx,image/*";
const MAX_FILES = 10;
const MAX_MB = 10;

interface Props {
  open: boolean;
  onClose: () => void;
  onUploaded: (form: FormTemplate) => void;
}

const Hint: React.FC<{ icon: React.ReactNode; text: string; color: string }> = ({ icon, text, color }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}>
    <span style={{ color, fontSize: 14, display: "inline-flex" }}>{icon}</span>
    {text}
  </div>
);

const UploadFormModal: React.FC<Props> = ({ open, onClose, onUploaded }) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<FormCategory | undefined>();
  const [uploading, setUploading] = useState(false);
  const a = useAudience();

  const reset = () => {
    setFiles([]);
    setName("");
    setCategory(undefined);
  };

  const handleOk = async () => {
    if (files.length === 0) {
      message.warning("Add the form’s file or photos first");
      return;
    }
    setUploading(true);
    try {
      const form = await uploadFormTemplate({
        audience: a.audience,
        files: files.map((f) => f.originFileObj as File),
        name: name.trim() || undefined,
        category,
      });
      reset();
      onUploaded(form);
    } catch (error) {
      const msg = apiErrorMessage(error, "Upload failed. Please try again.");
      if (msg) message.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={
        <Space>
          <CloudUploadOutlined style={{ color: C.primary }} />
          Upload a paper form
        </Space>
      }
      okText="Upload & read form"
      onOk={handleOk}
      confirmLoading={uploading}
      onCancel={() => {
        if (!uploading) {
          reset();
          onClose();
        }
      }}
      width={560}
      destroyOnHidden
    >
      <Text style={{ color: C.subText, display: "block", marginBottom: 14, fontSize: 13 }}>
        Upload the form as a PDF or Word file, or take photos of each page. The AI reads every question
        and builds a draft you can review. Anything you crossed out on the paper is switched off for you.
      </Text>

      <Upload.Dragger
        multiple
        accept={ACCEPT}
        fileList={files}
        beforeUpload={(file) => {
          if (file.size > MAX_MB * 1024 * 1024) {
            message.error(`${file.name} is larger than ${MAX_MB} MB`);
            return Upload.LIST_IGNORE;
          }
          return false; // keep in the list; we upload on OK
        }}
        onChange={({ fileList }) => setFiles(fileList.slice(0, MAX_FILES))}
        style={{ borderRadius: 12, background: "#fafbff" }}
      >
        <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
          <CloudUploadOutlined style={{ color: C.primary, fontSize: 40 }} />
        </p>
        <p className="ant-upload-text" style={{ fontWeight: 600 }}>
          Drop files here or click to choose
        </p>
        <p className="ant-upload-hint" style={{ fontSize: 12 }}>
          Several photos of one form? Add them all — they’re read as pages of the same form.
        </p>
      </Upload.Dragger>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "10px 2px 18px" }}>
        <Hint icon={<FilePdfOutlined />} text="PDF" color="#ef4444" />
        <Hint icon={<FileWordOutlined />} text="Word (.docx)" color="#2563eb" />
        <Hint icon={<CameraOutlined />} text="Phone photos" color="#0d9488" />
        <Text style={{ fontSize: 12, color: C.subText }}>
          Up to {MAX_FILES} files, {MAX_MB} MB each
        </Text>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <Text style={{ fontSize: 12.5, color: C.subText, display: "block", marginBottom: 4 }}>
            Form name <span style={{ color: "#94a3b8" }}>(optional)</span>
          </Text>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Read from the form"
            maxLength={200}
          />
        </div>
        <div>
          <Text style={{ fontSize: 12.5, color: C.subText, display: "block", marginBottom: 4 }}>
            {a.audience === "employee" ? "Type" : "Treatment"} <span style={{ color: "#94a3b8" }}>(optional)</span>
          </Text>
          <Select
            value={category}
            onChange={setCategory}
            options={a.categoryOptions}
            placeholder="Detected automatically"
            allowClear
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </Modal>
  );
};

export default UploadFormModal;
