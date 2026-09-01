import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Switch, Space, Typography, Card, Spin, message } from "antd";
import { BookOutlined } from "@ant-design/icons";
import {
    fetchSystemSetupDetailsById,
    updateSystemSetup,
    createSystemSetup,
} from "@services/systemsetup";

const { Text } = Typography;

const ChartOfAccountsSettings: React.FC = () => {
    const queryClient = useQueryClient();
    const [requireCode, setRequireCode] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [systemSettingsId, setSystemSettingsId] = useState<string | null>(null);
    const [shopId, setShopId] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const currentShopId = localStorage.getItem("shopId");
                setShopId(currentShopId);
                const data = await fetchSystemSetupDetailsById();
                setRequireCode(data?.require_account_code ?? true);
                setSystemSettingsId(data?._id || null);
            } catch (error) {
                message.error("Failed to load chart of accounts settings");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleToggle = async (checked: boolean) => {
        if (!systemSettingsId && !shopId) {
            message.error("Shop not found");
            return;
        }

        setSaving(true);
        try {
            const payload = { require_account_code: checked };
            if (systemSettingsId) {
                await updateSystemSetup({ _id: systemSettingsId, data: payload });
            } else {
                const created = await createSystemSetup({ ...payload, shop_id: shopId });
                if (created?._id) setSystemSettingsId(created._id);
            }
            setRequireCode(checked);
            queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
            message.success(
                checked
                    ? "Account code now required for new accounts"
                    : "Account code no longer required for new accounts"
            );
        } catch (error) {
            message.error("Failed to update chart of accounts setting");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <Spin />
            </Card>
        );
    }

    return (
        <Card bordered={false}>
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                <Space>
                    <BookOutlined style={{ fontSize: 18, color: "#1890ff" }} />
                    <Text strong>Chart of Accounts</Text>
                </Space>

                <Card
                    size="small"
                    style={{
                        background: "#f6ffed",
                        border: "1px solid #b7eb8f",
                        borderRadius: 8,
                    }}
                >
                    <Space
                        direction="vertical"
                        size="small"
                        style={{ width: "100%" }}
                    >
                        <Space>
                            <Switch
                                checked={requireCode}
                                onChange={handleToggle}
                                loading={saving}
                            />
                            <Text>
                                {requireCode
                                    ? "Require account code when creating new accounts"
                                    : "Do not require account code when creating new accounts"}
                            </Text>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            When enabled, the Account Code field is shown on the
                            Create Account form. When disabled, account codes are
                            hidden and the system creates accounts without one.
                        </Text>
                    </Space>
                </Card>
            </Space>
        </Card>
    );
};

export default ChartOfAccountsSettings;
