import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { App, Button, Space } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { enablePush, listenForPushes, pushPermission, pushTargetUrl } from "src/services/pushNotifications";

const DISMISSED_KEY = "push_prompt_dismissed_at";
const ASK_AGAIN_MS = 14 * 24 * 60 * 60 * 1000; // ask again after two weeks

const recentlyDismissed = () => {
    const at = Number(localStorage.getItem(DISMISSED_KEY) || 0);
    return at > 0 && Date.now() - at < ASK_AGAIN_MS;
};

/**
 * Browser push for the signed-in user: registers this browser when
 * notifications are already allowed, otherwise offers to turn them on (the
 * permission prompt needs a click), and shows pushes that arrive while the
 * app is focused. Renders nothing itself.
 */
const PushNotifications: React.FC<{ userId?: string }> = ({ userId }) => {
    const { notification } = App.useApp();
    const navigate = useNavigate();

    useEffect(() => {
        if (!userId) return;
        const permission = pushPermission();
        if (permission === "granted") {
            void enablePush();
            return;
        }
        if (permission !== "default" || recentlyDismissed()) return;

        const key = "push-prompt";
        const timer = window.setTimeout(() => {
            notification.open({
                key,
                icon: <BellOutlined />,
                message: "Turn on notifications",
                description: "Get chat messages, approvals and other alerts on this device, even when this tab is closed.",
                duration: 0,
                placement: "bottomRight",
                onClose: () => localStorage.setItem(DISMISSED_KEY, String(Date.now())),
                btn: (
                    <Space>
                        <Button
                            size="small"
                            onClick={() => {
                                localStorage.setItem(DISMISSED_KEY, String(Date.now()));
                                notification.destroy(key);
                            }}
                        >
                            Not now
                        </Button>
                        <Button
                            size="small"
                            type="primary"
                            onClick={async () => {
                                notification.destroy(key);
                                const ok = await enablePush({ askPermission: true });
                                if (!ok && pushPermission() === "denied") {
                                    notification.info({
                                        message: "Notifications are blocked",
                                        description: "Allow notifications for this site in your browser settings to turn them on.",
                                        placement: "bottomRight",
                                    });
                                }
                            }}
                        >
                            Turn on
                        </Button>
                    </Space>
                ),
            });
        }, 3000);
        return () => {
            window.clearTimeout(timer);
            notification.destroy(key);
        };
    }, [userId, notification]);

    useEffect(
        () =>
            listenForPushes({
                onPush: (push) => {
                    const path = pushTargetUrl(push.data);
                    notification.open({
                        icon: <BellOutlined />,
                        message: push.title,
                        description: push.body,
                        placement: "topRight",
                        onClick: () => navigate(path),
                        style: { cursor: "pointer" },
                    });
                },
                onOpen: (path) => navigate(path),
            }),
        [navigate, notification]
    );

    return null;
};

export default PushNotifications;
