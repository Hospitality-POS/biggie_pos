import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button, Modal, Result, Spin, Typography, message } from "antd";
import { CloseOutlined, DownloadOutlined, EditOutlined, CheckOutlined, MailOutlined } from "@ant-design/icons";
import { usePermissions } from "@hooks/usePermissions";
import {
  fetchFormSubmission,
  saveSubmissionAnswers,
  clientSignInStore,
  fetchSignedPdfUrl,
  fetchSavedClientSignature,
  submissionError,
} from "@services/formSubmissions";
import { useQuery } from "@tanstack/react-query";
import { fetchShop } from "@services/shops";
import FillFlow from "./FillFlow";
import StaffSignModal from "./StaffSignModal";
import EmailSignedCopyModal from "./EmailSignedCopyModal";
import { SubmitError, questionLead } from "./utils";
import type { FormSubmission } from "./types";
import type { Answers } from "../components/FormRenderer";
import { AudienceContext, audienceConfig, audienceFromPath } from "../../audience";

const { Text, Title } = Typography;

/**
 * Full-screen form on the shop's tablet: the client (or employee) fills and
 * signs, hands the device back, and staff (therapist, HR…) countersign right away.
 * Routes: /forms/fill/:id, /hr/forms/fill/:id  (state.returnTo = where to go afterwards)
 */
const InStoreFillPage: React.FC = () => {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  const { can } = usePermissions();
  const pathAudience = audienceFromPath(location.pathname);

  const [submission, setSubmission] = useState<FormSubmission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countersignOpen, setCountersignOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const shopId = localStorage.getItem("shopId") || "";
  const { data: shop } = useQuery({ queryKey: ["shop", shopId], queryFn: () => fetchShop(shopId), enabled: !!shopId });
  const businessName = (shop as { name?: string } | undefined)?.name ?? "";

  useEffect(() => {
    fetchFormSubmission(id, "fill", pathAudience)
      .then(setSubmission)
      .catch((e) => setError(submissionError(e, "Couldn't open this form").message));
  }, [id, pathAudience]);

  const a = audienceConfig(submission ? (submission.subject_type === "employee" ? "employee" : "client") : pathAudience);
  const aud = a.audience;

  const leave = () => (returnTo ? navigate(returnTo) : navigate(-1));

  const autosave = useCallback((answers: Answers) => saveSubmissionAnswers(id, answers, aud), [id, aud]);
  const loadSaved = useCallback(() => fetchSavedClientSignature(id, aud), [id, aud]);

  const download = async () => {
    setDownloading(true);
    try {
      window.open(await fetchSignedPdfUrl(id, aud), "_blank", "noopener");
    } catch (e) {
      const err = submissionError(e, "Couldn't download the PDF");
      if (!err.alreadyShown) message.error(err.message);
    } finally {
      setDownloading(false);
    }
  };

  if (error) {
    return (
      <Result status="warning" title={error} extra={<Button onClick={leave}>Go back</Button>} style={{ paddingTop: 80 }} />
    );
  }
  if (!submission) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  const needsCountersign = submission.status === "awaiting_therapist";
  const staffLabel = submission.form.signers?.find((s) => s.role === "therapist")?.label || a.staff;

  const staffPanel = (
    <>
      <Title level={3} style={{ marginBottom: 6 }}>
        {submission.status === "completed" ? "All signed" : "Thank you!"}
      </Title>
      <Text style={{ fontSize: 15, color: "#475569", display: "block", maxWidth: 440, margin: "0 auto" }}>
        {submission.status === "completed"
          ? `${submission.form.name} is complete and saved to ${submission.subject_snapshot.name}'s profile.`
          : aud === "employee"
            ? `Thank you. Please hand the device back to ${staffLabel}.`
            : `Please hand the device back to your ${staffLabel.toLowerCase()}.`}
      </Text>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 24 }}>
        {needsCountersign && can(a.perms.countersign) && (
          <Button type="primary" size="large" icon={<EditOutlined />} onClick={() => setCountersignOpen(true)}>
            Countersign as {staffLabel}
          </Button>
        )}
        {submission.status === "completed" && submission.has_pdf && can(a.perms.viewFilled) && (
          <Button size="large" icon={<DownloadOutlined />} onClick={download} loading={downloading}>
            Signed PDF
          </Button>
        )}
        {submission.status === "completed" && can(a.perms.viewFilled) && (
          <Button size="large" icon={<MailOutlined />} onClick={() => setEmailOpen(true)}>
            Email signed copy
          </Button>
        )}
        <Button size="large" icon={<CheckOutlined />} onClick={leave}>
          {needsCountersign ? "Countersign later" : "Done"}
        </Button>
      </div>
      {submission.alerts.length > 0 && (
        <div style={{ maxWidth: 440, margin: "24px auto 0", textAlign: "left", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 14px" }}>
          <Text strong style={{ color: "#b91c1c" }}>For {staffLabel} — {a.alertsLabel.toLowerCase()}</Text>
          {submission.alerts.map((al) => (
            <div key={al.field_key} style={{ fontSize: 13, color: "#7f1d1d", marginTop: 4 }}>
              {questionLead(al.question)} <strong>{al.answer}</strong>
            </div>
          ))}
        </div>
      )}
      <EmailSignedCopyModal submission={emailOpen ? submission : null} audience={aud} onClose={() => setEmailOpen(false)} />
      <StaffSignModal
        open={countersignOpen}
        submission={submission}
        onClose={() => setCountersignOpen(false)}
        onSigned={(updated) => {
          setSubmission(updated);
          setCountersignOpen(false);
        }}
      />
    </>
  );

  // Already signed (e.g. reopened from the person's profile)
  if (!["pending", "in_progress"].includes(submission.status)) {
    return (
      <AudienceContext.Provider value={a}>
        <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "64px 16px", textAlign: "center" }}>{staffPanel}</div>
      </AudienceContext.Provider>
    );
  }

  return (
    <AudienceContext.Provider value={a}>
    <FillFlow
      businessName={businessName}
      formName={submission.form.name}
      description={submission.form.description}
      clientName={submission.subject_snapshot.name}
      sections={submission.form.sections}
      signers={submission.form.signers}
      declaration={submission.form.declaration}
      initialAnswers={submission.answers}
      onAutosave={autosave}
      onSubmit={async (answers, signature) => {
        try {
          setSubmission(await clientSignInStore(id, answers, signature, aud));
        } catch (e) {
          const err = submissionError(e, "Couldn't submit the form");
          // The request layer already toasted 403/404/409s
          throw new SubmitError(err.alreadyShown ? "" : err.message, err.missing);
        }
      }}
      renderDone={() => staffPanel}
      loadSavedSignature={loadSaved}
      headerExtra={
        <Button
          type="text"
          icon={<CloseOutlined />}
          aria-label="Exit"
          onClick={() =>
            Modal.confirm({
              title: "Leave this form?",
              content: `Answers so far are saved. You can continue later from ${aud === "employee" ? "Signed by employees" : "the customer's profile"}.`,
              okText: "Leave",
              onOk: leave,
            })
          }
        />
      }
    />
    </AudienceContext.Provider>
  );
};

export default InStoreFillPage;
