import React, { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal, Typography, message } from "antd";
import { useAppSelector } from "src/store";
import { staffCountersign, submissionError, fetchMySignatures, saveMySignature } from "@services/formSubmissions";
import SignaturePad, { type SignaturePadHandle } from "./SignaturePad";
import { questionLead } from "./utils";
import type { FormSubmission, FormSubmissionSummary, SavedSignatureOption } from "./types";

const { Text } = Typography;

interface Props {
  open: boolean;
  submission: Pick<FormSubmission | FormSubmissionSummary, "_id" | "customer_snapshot" | "form" | "alerts">;
  role?: "therapist" | "witness";
  onClose: () => void;
  onSigned: (updated: FormSubmission) => void;
}

/**
 * Therapist (or witness) countersigns a form the client has signed — with a
 * signature from their own library (shared with E-Signature) or a new one,
 * which they can keep for next time.
 */
const StaffSignModal: React.FC<Props> = ({ open, submission, role = "therapist", onClose, onSigned }) => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((s) => s.auth);
  const [name, setName] = useState<string>((user as { name?: string } | null)?.name ?? "");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const pad = useRef<SignaturePadHandle>(null);
  const label = submission.form.signers?.find((s) => s.role === role)?.label ?? (role === "witness" ? "Witness" : "Therapist");

  const { data: library = [] } = useQuery({
    queryKey: ["my-signatures"],
    queryFn: fetchMySignatures,
    enabled: open,
    staleTime: 60_000,
  });

  // Drawn signatures need their image data; typed ones just the text
  const savedOptions = useMemo<SavedSignatureOption[]>(
    () =>
      library
        .filter((s) => (s.signature_type === "type" ? !!s.data : !!s.data?.startsWith("data:image")))
        .map((s) => ({
          id: s._id,
          label: s.name,
          method: s.signature_type === "type" ? "type" : "draw",
          data: s.signature_type === "type" ? null : s.data,
          typed_name: s.signature_type === "type" ? s.data : undefined,
          signer_name: s.name,
        })),
    [library]
  );

  const sign = async () => {
    const signature = pad.current?.value();
    if (!signature) {
      message.warning("Enter your name and sign");
      return;
    }
    setSaving(true);
    try {
      const { save_for_later, ...toSend } = signature;
      const updated = await staffCountersign(submission._id, role, toSend);
      message.success(updated.status === "completed" ? "Signed — the PDF is ready" : "Signature saved");
      // Keep a new signature in the staff member's library for next time
      if (save_for_later && (toSend.method === "draw" || toSend.method === "type")) {
        saveMySignature({
          name: toSend.signer_name,
          signature_type: toSend.method,
          data: toSend.method === "draw" ? toSend.data ?? "" : toSend.typed_name ?? toSend.signer_name,
        })
          .then(() => queryClient.invalidateQueries({ queryKey: ["my-signatures"] }))
          .catch(() => message.info("Signed, but couldn't save the signature to your library"));
      }
      onSigned(updated);
    } catch (e) {
      const err = submissionError(e, "Couldn't save the signature");
      if (!err.alreadyShown) message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={`Countersign as ${label.toLowerCase()}`}
      okText="Sign"
      onOk={sign}
      okButtonProps={{ disabled: !ready }}
      confirmLoading={saving}
      onCancel={onClose}
      destroyOnHidden
      width={560}
    >
      <Text style={{ color: "#64748b", display: "block", marginBottom: 12 }}>
        {submission.customer_snapshot.name} has signed <strong>{submission.form.name}</strong>. Check their answers, then sign
        to complete the form.
      </Text>
      {submission.alerts?.length > 0 && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
          <Text strong style={{ color: "#b91c1c", fontSize: 12.5 }}>Medical alerts</Text>
          {submission.alerts.map((a) => (
            <div key={a.field_key} style={{ fontSize: 12.5, color: "#7f1d1d" }}>
              {questionLead(a.question)} <strong>{a.answer}</strong>
            </div>
          ))}
        </div>
      )}
      <SignaturePad
        ref={pad}
        signerName={name}
        onSignerNameChange={setName}
        onChange={setReady}
        height={150}
        nameLabel={`${label}'s name`}
        savedOptions={savedOptions}
        savedAs="inline"
        saveLabel="Save to my signatures for next time"
      />
    </Modal>
  );
};

export default StaffSignModal;
