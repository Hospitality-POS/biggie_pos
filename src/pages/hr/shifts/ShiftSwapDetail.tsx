import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Typography, Card, Row, Col, Descriptions, Button, Space, Tag, Divider } from "antd";
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchShiftSwapById, approveShiftSwap, rejectShiftSwap, cancelShiftSwap } from "@services/hr";
import dayjs from "dayjs";

const { Title } = Typography;

const ShiftSwapDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: swap, isLoading } = useQuery({
    queryKey: ["hr-shift-swap", id],
    queryFn: () => fetchShiftSwapById(id!),
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: approveShiftSwap,
    onSuccess: () => {
      message.success("Shift swap approved successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-shift-swap", id] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to approve shift swap");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectShiftSwap,
    onSuccess: () => {
      message.success("Shift swap rejected successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-shift-swap", id] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to reject shift swap");
    },
  });

  if (isLoading) {
    return <div style={{ padding: 24 }}>Loading shift swap details...</div>;
  }

  if (!swap) {
    return <div style={{ padding: 24 }}>Shift swap not found</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/hr/shifts/swaps")}>
              Back
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              Shift Swap Details
            </Title>
          </Space>
          {swap.status === "Pending" && (
            <Space>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => approveMutation.mutate(id!)}
                loading={approveMutation.isPending}
              >
                Approve
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => rejectMutation.mutate(id!)}
                loading={rejectMutation.isPending}
              >
                Reject
              </Button>
            </Space>
          )}
        </div>

        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Card title="Request Information" size="small">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Requested By">{swap.requested_by_name}</Descriptions.Item>
                <Descriptions.Item label="Requested With">{swap.requested_with_name}</Descriptions.Item>
                <Descriptions.Item label="Original Shift Date">
                  {dayjs(swap.original_shift_date).format("DD MMM YYYY")}
                </Descriptions.Item>
                <Descriptions.Item label="Swap Date">
                  {dayjs(swap.swap_date).format("DD MMM YYYY")}
                </Descriptions.Item>
                <Descriptions.Item label="Reason">{swap.reason}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag
                    color={
                      swap.status === "Approved"
                        ? "green"
                        : swap.status === "Rejected"
                        ? "red"
                        : swap.status === "Completed"
                        ? "blue"
                        : "orange"
                    }
                  >
                    {swap.status}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="Shift Details" size="small">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Original Shift">{swap.original_shift_name || "-"}</Descriptions.Item>
                <Descriptions.Item label="Original Shift Time">{swap.original_shift_time || "-"}</Descriptions.Item>
                <Descriptions.Item label="Swap Shift">{swap.swap_shift_name || "-"}</Descriptions.Item>
                <Descriptions.Item label="Swap Shift Time">{swap.swap_shift_time || "-"}</Descriptions.Item>
                <Descriptions.Item label="Requested On">
                  {swap.created_at ? dayjs(swap.created_at).format("DD MMM YYYY HH:mm") : "-"}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>

        {swap.response && (
          <>
            <Divider />
            <Card title="Response Information" size="small">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Responded By">{swap.responded_by_name || "-"}</Descriptions.Item>
                <Descriptions.Item label="Response">{swap.response}</Descriptions.Item>
                <Descriptions.Item label="Response Date">
                  {swap.responded_at ? dayjs(swap.responded_at).format("DD MMM YYYY HH:mm") : "-"}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </>
        )}
      </Card>
    </div>
  );
};

export default ShiftSwapDetail;
