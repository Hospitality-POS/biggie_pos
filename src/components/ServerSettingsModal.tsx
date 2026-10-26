import { useEffect, useState } from "react";
import { Button, Divider, Input, InputNumber, Modal, Space, Typography, message } from "antd";
import {
    ApiOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    MinusOutlined,
    PlusOutlined,
} from "@ant-design/icons";
import {
    getApiBaseUrl,
    getTenantBaseUrl,
    setApiBaseUrl,
    setTenantBaseUrl,
} from "@utils/config";
import { getDesktopZoom, setDesktopZoom, isTauri } from "@utils/desktopZoom";

const { Text } = Typography;

interface ServerSettingsModalProps {
    open: boolean;
    onClose: () => void;
}

type TestState = "idle" | "testing" | "ok" | "fail";

const normalizeUrl = (value: string): string => {
    const trimmed = value.trim().replace(/\/+$/, "");
    return trimmed && !/^https?:\/\//i.test(trimmed) ? `http://${trimmed}` : trimmed;
};

const ServerSettingsModal = ({ open, onClose }: ServerSettingsModalProps) => {
    const [url, setUrl] = useState<string>(getApiBaseUrl());
    const [tenantUrl, setTenantUrl] = useState<string>(getTenantBaseUrl());
    const [zoom, setZoom] = useState<number>(getDesktopZoom());
    const [testState, setTestState] = useState<TestState>("idle");
    const [testMessage, setTestMessage] = useState<string>("");

    useEffect(() => {
        if (open) {
            setUrl(getApiBaseUrl());
            setTenantUrl(getTenantBaseUrl());
            setZoom(getDesktopZoom());
            setTestState("idle");
            setTestMessage("");
        }
    }, [open]);

    const handleTest = async () => {
        const base = normalizeUrl(url);
        if (!base) {
            setTestState("fail");
            setTestMessage("Enter a server URL first");
            return;
        }

        setTestState("testing");
        setTestMessage("");

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const response = await fetch(`${base}/health`, { signal: controller.signal });
            clearTimeout(timeout);

            if (response.ok) {
                setTestState("ok");
                setTestMessage("Server reachable");
            } else {
                setTestState("fail");
                setTestMessage(`Server responded with ${response.status}`);
            }
        } catch {
            setTestState("fail");
            setTestMessage("Could not reach the server");
        }
    };

    const handleSave = () => {
        setApiBaseUrl(url);
        setTenantBaseUrl(tenantUrl);
        message.success("Settings saved. Reloading…");
        setTimeout(() => window.location.reload(), 400);
    };

    const handleReset = () => {
        setApiBaseUrl("");
        setTenantBaseUrl("");
        message.success("Reset to default servers. Reloading…");
        setTimeout(() => window.location.reload(), 400);
    };

    const changeZoom = (factor: number) => {
        setDesktopZoom(factor).then(setZoom).catch(() => {});
    };

    return (
        <Modal
            title="Desktop Settings"
            open={open}
            onCancel={onClose}
            footer={
                <Space>
                    <Button onClick={handleReset}>Reset to defaults</Button>
                    <Button onClick={handleTest} loading={testState === "testing"}>
                        Test connection
                    </Button>
                    <Button type="primary" onClick={handleSave} disabled={!url.trim()}>
                        Save
                    </Button>
                </Space>
            }
        >
            <Space direction="vertical" style={{ width: "100%" }} size="small">
                <Text type="secondary">
                    Address of the POS API server this terminal should talk to.
                </Text>
                <Input
                    prefix={<ApiOutlined />}
                    value={url}
                    onChange={(e) => {
                        setUrl(e.target.value);
                        setTestState("idle");
                        setTestMessage("");
                    }}
                    placeholder="http://localhost:3002"
                    size="large"
                    autoComplete="off"
                    spellCheck={false}
                />
                {testState === "ok" && (
                    <Text type="success">
                        <CheckCircleOutlined /> {testMessage}
                    </Text>
                )}
                {testState === "fail" && (
                    <Text type="danger">
                        <CloseCircleOutlined /> {testMessage}
                    </Text>
                )}

                <Divider style={{ margin: "12px 0 4px" }} />

                <Text type="secondary">
                    Address of the tenant/admin API (manage subscriptions & modules).
                </Text>
                <Input
                    prefix={<ApiOutlined />}
                    value={tenantUrl}
                    onChange={(e) => setTenantUrl(e.target.value)}
                    placeholder="https://api.admin.reliatech.co.ke"
                    size="large"
                    autoComplete="off"
                    spellCheck={false}
                />

                {isTauri() && (
                    <>
                        <Divider style={{ margin: "12px 0 4px" }} />
                        <Text type="secondary">
                            Zoom — you can also use Ctrl +/− and Ctrl 0 to reset.
                        </Text>
                        <Space.Compact block>
                            <Button
                                icon={<MinusOutlined />}
                                onClick={() => changeZoom(zoom - 0.1)}
                                disabled={zoom <= 0.5}
                            />
                            <InputNumber
                                value={Math.round(zoom * 100)}
                                min={50}
                                max={200}
                                step={10}
                                formatter={(v) => `${v}%`}
                                parser={(v) => Number(String(v).replace("%", ""))}
                                onChange={(v) => typeof v === "number" && changeZoom(v / 100)}
                                style={{ width: "100%", textAlign: "center" }}
                            />
                            <Button
                                icon={<PlusOutlined />}
                                onClick={() => changeZoom(zoom + 0.1)}
                                disabled={zoom >= 2}
                            />
                            <Button onClick={() => changeZoom(1)}>Reset</Button>
                        </Space.Compact>
                    </>
                )}
            </Space>
        </Modal>
    );
};

export default ServerSettingsModal;
