import React, { useEffect, useState } from "react";
import { Modal, Input, Typography, message } from "antd";
import { MailOutlined, FilePdfOutlined } from "@ant-design/icons";
import { THEME_C } from "@utils/getPrimaryColor";
import { emailSignedPdf, submissionError } from "@services/formSubmissions";
import type { Audience } from "../types";

const { Text } = Typography;
const C = THEME_C;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  /** The signed form to email; null closes the dialog. */
  submission: { _id: string; subject_snapshot?: { name?: string; email?: string }; form?: { name?: string } } | null;
  audience?: Audience;
  onClose: () => void;
}

/** Email the signed PDF — to the person's email on file, or any address typed in. */
const EmailSignedCopyModal: React.FC<Props> = ({ submission, audience, onClose }) => {
  const fileEmail = submission?.subject_snapshot?.email || "";
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (submission) setEmail(fileEmail);
  }, [submission, fileEmail]);

  const send = async () => {
    const to = email.trim();
    if (!EMAIL_RE.test(to)) {
      message.warning("Enter a valid email address");
      return;
    }
    setSending(true);
    try {
      const res = await emailSignedPdf(submission!._id, audience, { email: to });
      message.success(res.message || `Signed copy emailed to ${to}`);
      onClose();
    } catch (e) {
      const err = submissionError(e, "Couldn't send the email");
      if (!err.alreadyShown) message.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const name = submission?.subject_snapshot?.name || "";

  return (
    <Modal
      open={!!submission}
      onCancel={onClose}
      title="Email signed copy"
      okText="Send email"
      okButtonProps={{ icon: <MailOutlined />, disabled: !email.trim() }}
      onOk={send}
      confirmLoading={sending}
      width={480}
      destroyOnHidden
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          padding: "10px 12px",
          background: C.primaryLight,
          borderRadius: 10,
          marginBottom: 16,
        }}
      >
        <FilePdfOutlined style={{ fontSize: 20, color: C.primary }} />
        <span>
          <span style={{ display: "block", fontWeight: 600, color: "#0f172a", fontSize: 13.5 }}>{submission?.form?.name || "Signed form"}</span>
          {name && <span style={{ display: "block", fontSize: 12, color: C.subText }}>Signed for {name} · PDF attached</span>}
        </span>
      </div>
      <Text style={{ fontSize: 12.5, color: C.subText, display: "block", marginBottom: 4 }}>Send to</Text>
      <Input
        type="email"
        size="large"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onPressEnter={send}
        placeholder="name@example.com"
        prefix={<MailOutlined style={{ color: "#94a3b8" }} />}
        allowClear
        autoFocus
      />
      <Text style={{ fontSize: 12, color: "#94a3b8", display: "block", marginTop: 6 }}>
        {!fileEmail
          ? "No email on file — type the address to send the signed copy to."
          : email.trim().toLowerCase() === fileEmail.toLowerCase()
            ? "Their email on file — change it to send somewhere else."
            : `Sending to a different address than the one on file (${fileEmail}).`}
      </Text>
    </Modal>
  );
};

export default EmailSignedCopyModal;
