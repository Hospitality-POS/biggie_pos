import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Popconfirm, Switch, Tooltip, Typography, message } from "antd";
import { PoweroffOutlined } from "@ant-design/icons";
import { fetchAuditSettings, updateAuditSettings, AuditSettings } from "@services/audit";

const { Text } = Typography;

/** The business's audit trail on/off setting (system settings → audit_trail_enabled). */
export const useAuditSettings = () => {
  const queryClient = useQueryClient();

  const query = useQuery<AuditSettings>({
    queryKey: ["audit-settings"],
    queryFn: fetchAuditSettings,
    staleTime: 60000,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: (enabled: boolean) => updateAuditSettings(enabled),
    onSuccess: (data) => {
      queryClient.setQueryData(["audit-settings"], data);
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["audit-analytics"] });
      message.success(data.enabled ? "Audit trail switched on. New activity will appear within a minute." : "Audit trail switched off.");
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Could not change the audit trail setting");
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    isSaving: mutation.isLoading,
    setEnabled: (enabled: boolean) => mutation.mutate(enabled),
  };
};

/** Header switch: shows the current state and turns it on or off. */
export const AuditSwitch: React.FC = () => {
  const { settings, isLoading, isSaving, setEnabled } = useAuditSettings();
  const enabled = !!settings?.enabled;
  const unavailable = settings?.available === false;

  const control = (
    <Switch
      checked={enabled}
      loading={isLoading || isSaving}
      disabled={unavailable}
      checkedChildren="On"
      unCheckedChildren="Off"
      onChange={(checked) => checked && setEnabled(true)}
      aria-label="Audit trail recording"
    />
  );

  return (
    <Tooltip title={unavailable ? "Switched off on the server" : undefined}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          padding: "4px 10px",
          height: 32,
          background: "#fff",
        }}
      >
        <Text style={{ fontSize: 13, color: "#334155" }}>Recording</Text>
        {enabled ? (
          // Turning off asks first; turning on is immediate
          <Popconfirm
            title="Stop recording activity?"
            description="Activity already recorded stays visible until it expires."
            okText="Turn off"
            okButtonProps={{ danger: true }}
            onConfirm={() => setEnabled(false)}
          >
            <span>{control}</span>
          </Popconfirm>
        ) : (
          control
        )}
      </div>
    </Tooltip>
  );
};

/** Shown above the tabs while the audit trail is off for this business. */
export const AuditOffNotice: React.FC = () => {
  const { settings, isSaving, setEnabled } = useAuditSettings();
  if (!settings || settings.enabled) return null;

  if (!settings.available) {
    return (
      <Alert
        type="warning"
        showIcon
        message="The audit trail is switched off on the server"
        description="Ask your Base administrator to remove AUDIT_ENABLED=false from the API server settings."
        style={{ marginBottom: 12 }}
      />
    );
  }

  return (
    <Alert
      type="info"
      showIcon
      icon={<PoweroffOutlined />}
      message={<Text strong>The audit trail is off for this business</Text>}
      description="Turn it on to record who creates, changes or deletes what, and how long each person spends on Base. Activity recorded earlier still shows below."
      action={
        <Button type="primary" loading={isSaving} onClick={() => setEnabled(true)}>
          Turn on
        </Button>
      }
      style={{ marginBottom: 12 }}
    />
  );
};
