import React, { useEffect } from "react";
import { Form, Input, TimePicker, Switch, Select, InputNumber, Card, Space, Typography, Divider, Row, Col, message } from "antd";
import { WifiOutlined, ClockCircleOutlined, HomeOutlined, CoffeeOutlined, SafetyOutlined, ToolOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchShop, updateShopHotelSettings } from "@services/shops";
import { usePrimaryColor } from "@context/PrimaryColorContext";

const { Title } = Typography;
const { TextArea } = Input;

interface HotelSettings {
  check_in_time?: string;
  check_out_time?: string;
  wifi?: {
    network_name?: string;
    password?: string;
    enabled?: boolean;
  };
  room_rules?: {
    smoking_allowed?: boolean;
    pets_allowed?: boolean;
    visitors_allowed?: boolean;
    visitors_time_limit?: string;
    min_age_for_checkin?: number;
    id_required?: boolean;
    credit_card_required?: boolean;
  };
  amenities?: {
    breakfast_included?: boolean;
    breakfast_time?: {
      start?: string;
      end?: string;
    };
    parking_available?: boolean;
    parking_fee?: number;
    pool_available?: boolean;
    gym_available?: boolean;
    room_service_available?: boolean;
    room_service_hours?: {
      start?: string;
      end?: string;
    };
    laundry_service?: boolean;
    airport_shuttle?: boolean;
  };
  housekeeping?: {
    daily_cleaning?: boolean;
    cleaning_time?: string;
    do_not_disturb_respected?: boolean;
  };
  policies?: {
    deposit_required?: boolean;
    deposit_amount?: number;
    deposit_type?: "fixed" | "percentage" | "night";
    cancellation_policy?: string;
    late_checkout_fee?: number;
    early_checkin_fee?: number;
  };
  additional_notes?: string;
}

const HotelSettings: React.FC = () => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const shopId = localStorage.getItem("shopId");
  const primaryColor = usePrimaryColor();

  const { data: shopData, isLoading } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: !!shopId,
  });

  const hotelSettings = shopData?.hotel_settings as HotelSettings | undefined;

  useEffect(() => {
    if (hotelSettings) {
      form.setFieldsValue({
        check_in_time: hotelSettings.check_in_time ? dayjs(hotelSettings.check_in_time, "HH:mm") : dayjs("14:00", "HH:mm"),
        check_out_time: hotelSettings.check_out_time ? dayjs(hotelSettings.check_out_time, "HH:mm") : dayjs("11:00", "HH:mm"),
        wifi_network_name: hotelSettings.wifi?.network_name,
        wifi_password: hotelSettings.wifi?.password,
        wifi_enabled: hotelSettings.wifi?.enabled ?? true,
        smoking_allowed: hotelSettings.room_rules?.smoking_allowed ?? false,
        pets_allowed: hotelSettings.room_rules?.pets_allowed ?? false,
        visitors_allowed: hotelSettings.room_rules?.visitors_allowed ?? true,
        visitors_time_limit: hotelSettings.room_rules?.visitors_time_limit ? dayjs(hotelSettings.room_rules.visitors_time_limit, "HH:mm") : dayjs("22:00", "HH:mm"),
        min_age_for_checkin: hotelSettings.room_rules?.min_age_for_checkin ?? 18,
        id_required: hotelSettings.room_rules?.id_required ?? true,
        credit_card_required: hotelSettings.room_rules?.credit_card_required ?? false,
        breakfast_included: hotelSettings.amenities?.breakfast_included ?? false,
        breakfast_start: hotelSettings.amenities?.breakfast_time?.start ? dayjs(hotelSettings.amenities.breakfast_time.start, "HH:mm") : dayjs("07:00", "HH:mm"),
        breakfast_end: hotelSettings.amenities?.breakfast_time?.end ? dayjs(hotelSettings.amenities.breakfast_time.end, "HH:mm") : dayjs("10:00", "HH:mm"),
        parking_available: hotelSettings.amenities?.parking_available ?? true,
        parking_fee: hotelSettings.amenities?.parking_fee ?? 0,
        pool_available: hotelSettings.amenities?.pool_available ?? false,
        gym_available: hotelSettings.amenities?.gym_available ?? false,
        room_service_available: hotelSettings.amenities?.room_service_available ?? false,
        room_service_start: hotelSettings.amenities?.room_service_hours?.start ? dayjs(hotelSettings.amenities.room_service_hours.start, "HH:mm") : dayjs("06:00", "HH:mm"),
        room_service_end: hotelSettings.amenities?.room_service_hours?.end ? dayjs(hotelSettings.amenities.room_service_hours.end, "HH:mm") : dayjs("23:00", "HH:mm"),
        laundry_service: hotelSettings.amenities?.laundry_service ?? false,
        airport_shuttle: hotelSettings.amenities?.airport_shuttle ?? false,
        daily_cleaning: hotelSettings.housekeeping?.daily_cleaning ?? true,
        cleaning_time: hotelSettings.housekeeping?.cleaning_time ? dayjs(hotelSettings.housekeeping.cleaning_time, "HH:mm") : dayjs("10:00", "HH:mm"),
        do_not_disturb_respected: hotelSettings.housekeeping?.do_not_disturb_respected ?? true,
        deposit_required: hotelSettings.policies?.deposit_required ?? false,
        deposit_amount: hotelSettings.policies?.deposit_amount ?? 0,
        deposit_type: hotelSettings.policies?.deposit_type ?? "fixed",
        cancellation_policy: hotelSettings.policies?.cancellation_policy ?? "24 hours",
        late_checkout_fee: hotelSettings.policies?.late_checkout_fee ?? 0,
        early_checkin_fee: hotelSettings.policies?.early_checkin_fee ?? 0,
        additional_notes: hotelSettings.additional_notes,
      });
    } else {
      form.setFieldsValue({
        check_in_time: dayjs("14:00", "HH:mm"),
        check_out_time: dayjs("11:00", "HH:mm"),
        wifi_enabled: true,
        visitors_allowed: true,
        visitors_time_limit: dayjs("22:00", "HH:mm"),
        min_age_for_checkin: 18,
        id_required: true,
        breakfast_start: dayjs("07:00", "HH:mm"),
        breakfast_end: dayjs("10:00", "HH:mm"),
        parking_available: true,
        parking_fee: 0,
        room_service_start: dayjs("06:00", "HH:mm"),
        room_service_end: dayjs("23:00", "HH:mm"),
        daily_cleaning: true,
        cleaning_time: dayjs("10:00", "HH:mm"),
        do_not_disturb_respected: true,
        deposit_type: "fixed",
        cancellation_policy: "24 hours",
      });
    }
  }, [hotelSettings, form]);

  const updateMutation = useMutation({
    mutationFn: async (values: any) => {
      const hotelSettingsPayload: HotelSettings = {
        check_in_time: values.check_in_time?.format("HH:mm"),
        check_out_time: values.check_out_time?.format("HH:mm"),
        wifi: {
          network_name: values.wifi_network_name,
          password: values.wifi_password,
          enabled: values.wifi_enabled,
        },
        room_rules: {
          smoking_allowed: values.smoking_allowed,
          pets_allowed: values.pets_allowed,
          visitors_allowed: values.visitors_allowed,
          visitors_time_limit: values.visitors_time_limit?.format("HH:mm"),
          min_age_for_checkin: values.min_age_for_checkin,
          id_required: values.id_required,
          credit_card_required: values.credit_card_required,
        },
        amenities: {
          breakfast_included: values.breakfast_included,
          breakfast_time: {
            start: values.breakfast_start?.format("HH:mm"),
            end: values.breakfast_end?.format("HH:mm"),
          },
          parking_available: values.parking_available,
          parking_fee: values.parking_fee,
          pool_available: values.pool_available,
          gym_available: values.gym_available,
          room_service_available: values.room_service_available,
          room_service_hours: {
            start: values.room_service_start?.format("HH:mm"),
            end: values.room_service_end?.format("HH:mm"),
          },
          laundry_service: values.laundry_service,
          airport_shuttle: values.airport_shuttle,
        },
        housekeeping: {
          daily_cleaning: values.daily_cleaning,
          cleaning_time: values.cleaning_time?.format("HH:mm"),
          do_not_disturb_respected: values.do_not_disturb_respected,
        },
        policies: {
          deposit_required: values.deposit_required,
          deposit_amount: values.deposit_amount,
          deposit_type: values.deposit_type,
          cancellation_policy: values.cancellation_policy,
          late_checkout_fee: values.late_checkout_fee,
          early_checkin_fee: values.early_checkin_fee,
        },
        additional_notes: values.additional_notes,
      };

      await updateShopHotelSettings(shopId!, hotelSettingsPayload);
    },
    onSuccess: async () => {
      message.success("Hotel settings updated successfully");
      // Invalidate shop query to update cached shop details
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
      }
    },
    onError: () => {
      message.error("Failed to update hotel settings");
    },
  });

  const handleSubmit = async (values: any) => {
    await updateMutation.mutateAsync(values);
  };

  if (isLoading) {
    return <Card loading />;
  }

  return (
    <div style={{ padding: "0" }}>
      <Title level={4} style={{ marginBottom: 24 }}>Hotel Settings</Title>
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        {/* Check-in/Check-out Times */}
        <Card title={<Space><ClockCircleOutlined /> Check-in & Check-out Times</Space>} style={{ marginBottom: 16, borderRadius: 8 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Check-in Time"
                name="check_in_time"
                rules={[{ required: true, message: "Check-in time is required" }]}
              >
                <TimePicker format="HH:mm" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Check-out Time"
                name="check_out_time"
                rules={[{ required: true, message: "Check-out time is required" }]}
              >
                <TimePicker format="HH:mm" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* WiFi Settings */}
        <Card title={<Space><WifiOutlined /> WiFi Settings</Space>} style={{ marginBottom: 16, borderRadius: 8 }}>
          <Form.Item label="WiFi Enabled" name="wifi_enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item
            label="Network Name"
            name="wifi_network_name"
          >
            <Input placeholder="HotelGuest" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="wifi_password"
          >
            <Input.Password placeholder="Enter WiFi password" />
          </Form.Item>
        </Card>

        {/* Room Rules */}
        <Card title={<Space><HomeOutlined /> Room Rules</Space>} style={{ marginBottom: 16, borderRadius: 8 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Smoking Allowed" name="smoking_allowed" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Pets Allowed" name="pets_allowed" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Visitors Allowed" name="visitors_allowed" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Visitors Time Limit" name="visitors_time_limit">
                <TimePicker format="HH:mm" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Min Age for Check-in"
                name="min_age_for_checkin"
                rules={[{ required: true, message: "Minimum age is required" }]}
              >
                <InputNumber min={0} max={100} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="ID Required" name="id_required" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Credit Card Required" name="credit_card_required" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Amenities */}
        <Card title={<Space><CoffeeOutlined /> Amenities</Space>} style={{ marginBottom: 16, borderRadius: 8 }}>
          <Divider orientation="left">Food & Dining</Divider>
          <Form.Item label="Breakfast Included" name="breakfast_included" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Breakfast Start" name="breakfast_start">
                <TimePicker format="HH:mm" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Breakfast End" name="breakfast_end">
                <TimePicker format="HH:mm" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Room Service Available" name="room_service_available" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Room Service Start" name="room_service_start">
                <TimePicker format="HH:mm" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Room Service End" name="room_service_end">
                <TimePicker format="HH:mm" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Facilities</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Parking Available" name="parking_available" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Parking Fee" name="parking_fee">
                <InputNumber min={0} style={{ width: "100%" }} prefix="KES" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Pool Available" name="pool_available" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Gym Available" name="gym_available" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Laundry Service" name="laundry_service" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Airport Shuttle" name="airport_shuttle" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Card>

        {/* Housekeeping */}
        <Card title={<Space><ToolOutlined /> Housekeeping</Space>} style={{ marginBottom: 16, borderRadius: 8 }}>
          <Form.Item label="Daily Cleaning" name="daily_cleaning" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Cleaning Time" name="cleaning_time">
            <TimePicker format="HH:mm" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Do Not Disturb Respected" name="do_not_disturb_respected" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Card>

        {/* Policies */}
        <Card title={<Space><SafetyOutlined /> Policies</Space>} style={{ marginBottom: 16, borderRadius: 8 }}>
          <Form.Item label="Deposit Required" name="deposit_required" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Deposit Amount" name="deposit_amount">
                <InputNumber min={0} style={{ width: "100%" }} prefix="KES" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Deposit Type"
                name="deposit_type"
                rules={[{ required: true, message: "Deposit type is required" }]}
              >
                <Select>
                  <Select.Option value="fixed">Fixed Amount</Select.Option>
                  <Select.Option value="percentage">Percentage of Total</Select.Option>
                  <Select.Option value="night">Per Night</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            label="Cancellation Policy"
            name="cancellation_policy"
          >
            <Input placeholder="e.g., 24 hours" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Late Checkout Fee" name="late_checkout_fee">
                <InputNumber min={0} style={{ width: "100%" }} prefix="KES" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Early Check-in Fee" name="early_checkin_fee">
                <InputNumber min={0} style={{ width: "100%" }} prefix="KES" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Additional Notes */}
        <Card title={<Space><ToolOutlined /> Additional Notes</Space>} style={{ marginBottom: 16, borderRadius: 8 }}>
          <Form.Item
            label="Notes"
            name="additional_notes"
          >
            <TextArea rows={4} placeholder="Special requests can be made at reception" />
          </Form.Item>
        </Card>

        <Form.Item>
          <Space>
            <button
              type="submit"
              style={{
                backgroundColor: primaryColor,
                color: "white",
                border: "none",
                padding: "10px 24px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 500,
              }}
              disabled={updateMutation.isLoading}
            >
              {updateMutation.isLoading ? "Saving..." : "Save Hotel Settings"}
            </button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default HotelSettings;
