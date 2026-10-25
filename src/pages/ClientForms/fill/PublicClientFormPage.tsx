import React, { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button, Result, Spin, Typography } from "antd";
import { DownloadOutlined, ClockCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  fetchPublicForm,
  savePublicAnswers,
  signPublicForm,
  fetchPublicPdfUrl,
  submissionError,
} from "@services/formSubmissions";
import FillFlow from "./FillFlow";
import { SubmitError } from "./utils";
import type { PublicFormView } from "./types";
import type { Answers } from "../components/FormRenderer";
import type { FormSection, FormSigner } from "../types";

const { Text, Title } = Typography;

/**
 * The page a client opens from the link the spa sent them (no login).
 * Route: /f/:token?c=<companyCode>
 */
const PublicClientFormPage: React.FC = () => {
  const { token = "" } = useParams<{ token: string }>();
  const [search] = useSearchParams();
  const companyCode = search.get("c") || search.get("companycode") || "";

  const [view, setView] = useState<PublicFormView | null>(null);
  const [error, setError] = useState<{ title: string; expired?: boolean } | null>(null);
  const [hasPdf, setHasPdf] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token || !companyCode) {
      setError({ title: "This link is incomplete. Please open the full link the spa sent you." });
      return;
    }
    fetchPublicForm(token, companyCode)
      .then((v) => {
        setView(v);
        setHasPdf(v.has_pdf);
      })
      .catch((e) => {
        const err = submissionError(e, "This link is not valid.");
        setError({ title: err.message, expired: err.expired });
      });
  }, [token, companyCode]);

  const autosave = useCallback((answers: Answers) => savePublicAnswers(token, companyCode, answers), [token, companyCode]);

  const download = async () => {
    setDownloading(true);
    try {
      window.location.href = await fetchPublicPdfUrl(token, companyCode);
    } catch (e) {
      setError({ title: submissionError(e, "Your copy isn't ready yet.").message });
    } finally {
      setDownloading(false);
    }
  };

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 16 }}>
        <Result
          icon={error.expired ? <ClockCircleOutlined style={{ color: "#f59e0b" }} /> : undefined}
          status={error.expired ? undefined : "warning"}
          title={error.expired ? "This link has expired" : "We couldn't open this form"}
          subTitle={error.title}
        />
      </div>
    );
  }

  if (!view) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  const doneMessage = (completed: boolean) => (
    <>
      <Title level={3} style={{ marginBottom: 6 }}>Thank you!</Title>
      <Text style={{ fontSize: 15, color: "#475569", display: "block", maxWidth: 420, margin: "0 auto" }}>
        {completed
          ? `Your signed ${view.form.name} has been sent to ${view.business_name || "the spa"}.`
          : `${view.business_name || "The spa"} has your answers. Your therapist will countersign before your treatment.`}
      </Text>
      {completed && hasPdf && (
        <Button size="large" icon={<DownloadOutlined />} onClick={download} loading={downloading} style={{ marginTop: 22 }}>
          Download my copy
        </Button>
      )}
      <Text style={{ fontSize: 12.5, color: "#94a3b8", display: "block", marginTop: 20 }}>You can close this page now.</Text>
    </>
  );

  // Opened again after signing
  if (view.signed) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "64px 16px", textAlign: "center" }}>
        <Text style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: "#a855f7", textTransform: "uppercase" }}>
          {view.business_name}
        </Text>
        <div style={{ marginTop: 18 }}>{doneMessage(view.status === "completed")}</div>
      </div>
    );
  }

  return (
    <FillFlow
      businessName={view.business_name}
      formName={view.form.name}
      description={view.form.description}
      clientName={view.client_name}
      sections={(view.form.sections ?? []) as FormSection[]}
      signers={(view.form.signers ?? []) as FormSigner[]}
      declaration={view.form.declaration}
      initialAnswers={view.answers}
      onAutosave={autosave}
      onSubmit={async (answers, signature) => {
        try {
          const res = await signPublicForm(token, companyCode, answers, signature);
          setHasPdf(res.has_pdf);
          setView((v) => (v ? { ...v, status: res.status as PublicFormView["status"] } : v));
        } catch (e) {
          const err = submissionError(e, "We couldn't submit your form.");
          throw new SubmitError(err.message, err.missing);
        }
      }}
      renderDone={() => doneMessage(view.status === "completed")}
      note={
        <Text style={{ fontSize: 12, color: "#94a3b8" }}>
          <ClockCircleOutlined /> This link works until {dayjs(view.expires_at).format("D MMM, HH:mm")}. Your answers save as you go.
        </Text>
      }
    />
  );
};

export default PublicClientFormPage;
