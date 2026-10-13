import { useEffect, useState } from "react";
import { Button, Typography, Spin, Alert } from "antd";
import { WindowsOutlined, DownloadOutlined, DesktopOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";

const { Text } = Typography;

const RELEASES_URL = "https://github.com/Hospitality-POS/base_desktop/releases/latest";
const RELEASE_API = "https://api.github.com/repos/Hospitality-POS/base_desktop/releases/latest";
const APP_SCHEME = "base://open";

interface ReleaseAsset {
    name: string;
    browser_download_url: string;
    size: number;
}

interface ReleaseInfo {
    tag_name: string;
    published_at: string;
    assets: ReleaseAsset[];
}

const formatSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const DownloadPage = () => {
    const [release, setRelease] = useState<ReleaseInfo | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        fetch(RELEASE_API)
            .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
            .then(setRelease)
            .catch(() => setFailed(true));
    }, []);

    const installer = release?.assets.find((a) => a.name.endsWith("_x64-setup.exe"));
    const msi = release?.assets.find((a) => a.name.endsWith(".msi"));

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #1F2B5D 0%, #0E388A 55%, #14EF4A 100%)",
                padding: "1.5rem",
            }}
        >
            <ProCard
                boxShadow
                style={{ maxWidth: 480, width: "100%", borderRadius: 12 }}
                bodyStyle={{ padding: "2rem", textAlign: "center" }}
            >
                <img
                    src="/relia.png"
                    alt="Base"
                    style={{ maxWidth: 140, maxHeight: 48, objectFit: "contain", marginBottom: "1rem" }}
                />
                <Typography.Title level={3} style={{ marginBottom: "0.25rem" }}>
                    Base for Windows
                </Typography.Title>

                {!release && !failed && <Spin style={{ margin: "2rem 0" }} />}

                {failed && (
                    <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: "1.5rem", textAlign: "left" }}
                        message="Couldn't load the latest version automatically."
                        description="You can still grab it from the releases page."
                    />
                )}

                {release && (
                    <Text type="secondary" style={{ display: "block", marginBottom: "1.5rem" }}>
                        Version {release.tag_name} · released{" "}
                        {new Date(release.published_at).toLocaleDateString()}
                    </Text>
                )}

                <Button
                    type="primary"
                    size="large"
                    block
                    icon={<WindowsOutlined />}
                    href={installer?.browser_download_url || RELEASES_URL}
                    disabled={!release && !failed}
                    style={{ marginBottom: "0.75rem" }}
                >
                    Download for Windows
                    {installer ? ` (${formatSize(installer.size)})` : ""}
                </Button>

                <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: "1.5rem" }}>
                    {msi && (
                        <a href={msi.browser_download_url}>
                            <DownloadOutlined /> MSI installer
                        </a>
                    )}
                    <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer">
                        All releases
                    </a>
                </div>

                <div
                    style={{
                        borderTop: "1px solid #f0f0f0",
                        paddingTop: "1.25rem",
                        color: "#666",
                        fontSize: 13,
                    }}
                >
                    <p style={{ marginBottom: "0.75rem" }}>
                        Already have Base installed?
                    </p>
                    <Button icon={<DesktopOutlined />} href={APP_SCHEME}>
                        Open in app
                    </Button>
                    <p style={{ marginTop: "1rem", fontSize: 12, color: "#999" }}>
                        Windows may show a SmartScreen prompt on first install — choose{" "}
                        <em>More info → Run anyway</em>.
                    </p>
                </div>
            </ProCard>
        </div>
    );
};

export default DownloadPage;
