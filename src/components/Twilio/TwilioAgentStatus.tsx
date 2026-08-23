import React, { useEffect, useState } from "react";
import { Card, Select, Space, Typography, Badge, Statistic, Row, Col } from "antd";
import { PhoneOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { getAgentStatus, updateAgentStatus } from "@services/twilio";
import { getPermissionChecker } from "@utils/getPermissionChecker";

const { Text } = Typography;
const { Option } = Select;

const AgentStatus: React.FC = () => {
  const can = getPermissionChecker();
  const canManageAgentStatus = can("TWILIO_MANAGE_AGENT_STATUS");
  const shopId = localStorage.getItem("shopId");
  const userId = localStorage.getItem("userId");

  const { data: agentStatus, isLoading } = useQuery({
    queryKey: ["twilioAgentStatus", shopId, userId],
    queryFn: () => getAgentStatus(shopId || "", userId || ""),
    enabled: !!shopId && !!userId && canManageAgentStatus,
    refetchInterval: 30000,
  });

  const [localStatus, setLocalStatus] = useState<string>("offline");

  useEffect(() => {
    if (agentStatus?.agent_statuses?.[0]) {
      setLocalStatus(agentStatus.agent_statuses[0].status);
    }
  }, [agentStatus]);

  const handleStatusChange = async (status: string) => {
    setLocalStatus(status);
    try {
      await updateAgentStatus({
        shop_id: shopId || "",
        agent_id: userId || "",
        status,
        device_type: "browser",
      });
    } catch (error) {
      console.error("Failed to update agent status:", error);
    }
  };

  if (!canManageAgentStatus) {
    return null;
  }

  const agent = agentStatus?.agent_statuses?.[0];

  return (
    <Card
      title={
        <Space>
          <PhoneOutlined />
          <Text strong>Agent Status</Text>
        </Space>
      }
      size="small"
      loading={isLoading}
    >
      {agent ? (
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="Status"
              value={localStatus}
              prefix={
                localStatus === "available" ? (
                  <CheckCircleOutlined style={{ color: "#52c41a" }} />
                ) : (
                  <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
                )
              }
              valueStyle={{ fontSize: 14 }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Today's Calls"
              value={agent.total_calls_today}
              valueStyle={{ fontSize: 14 }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Duration Today"
              value={agent.total_call_duration_today}
              suffix="s"
              valueStyle={{ fontSize: 14 }}
            />
          </Col>
        </Row>
      ) : (
        <Text type="secondary">No agent status available</Text>
      )}
      
      <div style={{ marginTop: 16 }}>
        <Text strong style={{ fontSize: 12 }}>Change Status:</Text>
        <Select
          value={localStatus}
          onChange={handleStatusChange}
          style={{ width: "100%", marginTop: 8 }}
          size="small"
        >
          <Option value="offline">Offline</Option>
          <Option value="available">Available</Option>
          <Option value="busy">Busy</Option>
          <Option value="away">Away</Option>
          <Option value="do-not-disturb">Do Not Disturb</Option>
        </Select>
      </div>
    </Card>
  );
};

export default AgentStatus;
