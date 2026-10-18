import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Col,
  Form,
  Grid,
  Input,
  InputNumber,
  Row,
  Select,
  Skeleton,
  Switch,
  Tag,
  TimePicker,
  Typography,
  message,
} from "antd";
import {
  CalendarOutlined,
  CarOutlined,
  GiftOutlined,
  MessageOutlined,
  SaveOutlined,
  ShopOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchShop,
  updateShopWhatsappMarketplace,
  ShopWhatsappMarketplace,
} from "@services/shops";
import { THEME_C } from "@utils/getPrimaryColor";

const { Text } = Typography;
const { TextArea } = Input;
const C = THEME_C;
const WA_GREEN = "#25D366";

const DEFAULT_CONFIRMATION_MESSAGE = "Reply YES to confirm your order.";
const DEFAULT_GIFT_PRESETS = [1000, 2500, 5000];

// ── Building blocks ──────────────────────────────────────────────────────────

// One setting: what it does on the left, its control on the right. On a
// phone the control drops under the text instead of squeezing it.
const SettingRow: React.FC<{
  title: string;
  description?: React.ReactNode;
  control: React.ReactNode;
  last?: boolean;
}> = ({ title, description, control, last }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 12,
      padding: "12px 0",
      borderBottom: last ? "none" : "1px solid #f1f5f9",
    }}
  >
    <div style={{ flex: "1 1 220px", minWidth: 0 }}>
      <Text strong style={{ fontSize: 13.5, color: "#0f172a", display: "block" }}>
        {title}
      </Text>
      {description && (
        <Text style={{ fontSize: 12, color: C.subText, lineHeight: 1.5 }}>{description}</Text>
      )}
    </div>
    <div style={{ flexShrink: 0 }}>{control}</div>
  </div>
);

const SettingCard: React.FC<{
  icon: React.ReactNode;
  color: string;
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
  dimmed?: boolean;
  children: React.ReactNode;
}> = ({ icon, color, title, subtitle, extra, dimmed, children }) => (
  <div
    style={{
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 14,
      height: "100%",
      opacity: dimmed ? 0.55 : 1,
      transition: "opacity 0.2s ease",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 16px",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: `${color}14`,
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 15,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text strong style={{ fontSize: 14, color: "#0f172a", display: "block" }}>
          {title}
        </Text>
        {subtitle && <Text style={{ fontSize: 12, color: C.subText }}>{subtitle}</Text>}
      </div>
      {extra}
    </div>
    <div style={{ padding: "2px 16px 6px", flex: 1 }}>{children}</div>
  </div>
);

// ── Settings ─────────────────────────────────────────────────────────────────

const MarketplaceSettings: React.FC = () => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isMobile = !Grid.useBreakpoint().md;
  const shopId = localStorage.getItem("shopId");
  const [dirty, setDirty] = useState(false);

  const { data: shopData, isLoading } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: !!shopId,
  });

  const marketplace = shopData?.whatsapp_marketplace as ShopWhatsappMarketplace | undefined;

  const toFormValues = (mp?: ShopWhatsappMarketplace) => ({
    enabled: mp?.enabled ?? false,
    sell_inventory: mp?.sell_inventory ?? true,
    sell_services: mp?.sell_services ?? true,
    sell_gift_cards: mp?.sell_gift_cards ?? true,
    require_confirmation: mp?.require_confirmation ?? true,
    self_serve_enabled: mp?.self_serve_enabled ?? true,
    confirmation_message: mp?.confirmation_message || DEFAULT_CONFIRMATION_MESSAGE,
    gift_card_presets: (mp?.gift_card_presets?.length ? mp.gift_card_presets : DEFAULT_GIFT_PRESETS).map(String),
    booking_enabled: mp?.booking_enabled ?? true,
    booking_open_time: dayjs(mp?.booking_open_time || "08:00", "HH:mm"),
    booking_close_time: dayjs(mp?.booking_close_time || "18:00", "HH:mm"),
    booking_slot_minutes: mp?.booking_slot_minutes ?? 30,
    booking_capacity: mp?.booking_capacity ?? 1,
    booking_max_days_ahead: mp?.booking_max_days_ahead ?? 60,
    booking_require_payment: mp?.booking_require_payment ?? false,
    pickup_enabled: mp?.pickup_enabled ?? true,
    delivery_enabled: mp?.delivery_enabled ?? true,
    delivery_fee: mp?.delivery_fee ?? 0,
    delivery_note: mp?.delivery_note || "",
  });

  useEffect(() => {
    form.setFieldsValue(toFormValues(marketplace));
    setDirty(false);
  }, [marketplace, form]);

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      updateShopWhatsappMarketplace(shopId!, {
        enabled: !!values.enabled,
        sell_inventory: !!values.sell_inventory,
        sell_services: !!values.sell_services,
        sell_gift_cards: !!values.sell_gift_cards,
        require_confirmation: !!values.require_confirmation,
        self_serve_enabled: !!values.self_serve_enabled,
        confirmation_message: values.confirmation_message,
        gift_card_presets: (values.gift_card_presets || [])
          .map((v: string | number) => Number(String(v).replace(/,/g, "")))
          .filter((n: number) => n > 0),
        booking_enabled: !!values.booking_enabled,
        booking_open_time: values.booking_open_time?.format?.("HH:mm") || "08:00",
        booking_close_time: values.booking_close_time?.format?.("HH:mm") || "18:00",
        booking_slot_minutes: Number(values.booking_slot_minutes) || 30,
        booking_capacity: Number(values.booking_capacity) || 1,
        booking_max_days_ahead: Number(values.booking_max_days_ahead) || 60,
        booking_require_payment: !!values.booking_require_payment,
        pickup_enabled: !!values.pickup_enabled,
        delivery_enabled: !!values.delivery_enabled,
        delivery_fee: Math.max(0, Number(values.delivery_fee) || 0),
        delivery_note: values.delivery_note || "",
      }),
    onSuccess: () => {
      message.success("WhatsApp settings saved");
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
    },
    onError: () => {
      message.error("Couldn't save the WhatsApp settings");
    },
  });

  const enabled = Form.useWatch("enabled", form);
  const sellInventory = Form.useWatch("sell_inventory", form);
  const sellServices = Form.useWatch("sell_services", form);
  const sellGiftCards = Form.useWatch("sell_gift_cards", form);
  const bookingOn = Form.useWatch("booking_enabled", form);
  const pickupOn = Form.useWatch("pickup_enabled", form);
  const deliveryOn = Form.useWatch("delivery_enabled", form);
  const requireConfirmation = Form.useWatch("require_confirmation", form);

  if (!shopId) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Shop not found"
        description="Could not determine your shop. Please log out and log back in."
      />
    );
  }

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;

  const off = !enabled;
  const toggle = (name: string, disabled?: boolean) => (
    <Form.Item name={name} valuePropName="checked" noStyle>
      <Switch disabled={off || disabled} />
    </Form.Item>
  );
  const fieldLabel = (text: string) => <span style={{ fontSize: 12, color: C.subText }}>{text}</span>;

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={(values) => saveMutation.mutate(values)}
      onValuesChange={() => setDirty(true)}
      requiredMark={false}
      style={{ width: "100%" }}
    >
      {/* Master switch */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          padding: isMobile ? 14 : "16px 18px",
          borderRadius: 14,
          border: `1px solid ${enabled ? "#bbf7d0" : "#e2e8f0"}`,
          background: enabled ? "linear-gradient(135deg,#f0fdf4 0%,#ffffff 70%)" : "#f8fafc",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: WA_GREEN,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          <WhatsAppOutlined />
        </div>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text strong style={{ fontSize: 15, color: "#0f172a" }}>WhatsApp Marketplace</Text>
            <Tag color={enabled ? "green" : "default"} style={{ margin: 0, borderRadius: 999 }}>
              {enabled ? "On" : "Off"}
            </Tag>
          </div>
          <Text style={{ fontSize: 12.5, color: C.subText }}>
            Sell products, services and gift cards and take bookings inside WhatsApp chats. Stock is
            deducted automatically and customers get an order code.
          </Text>
        </div>
        <Form.Item name="enabled" valuePropName="checked" noStyle>
          <Switch />
        </Form.Item>
      </div>

      <Row gutter={[16, 16]}>
        {/* What can be sold */}
        <Col xs={24} xl={12}>
          <SettingCard
            icon={<ShopOutlined />}
            color={C.primary}
            title="What customers can buy"
            subtitle="Choose what's offered in chat"
            dimmed={off}
          >
            <SettingRow
              title="Products"
              description="Items from your inventory. Stock is deducted when the order is placed."
              control={toggle("sell_inventory")}
            />
            <SettingRow title="Services" description="Services from your catalogue, with optional booking." control={toggle("sell_services")} />
            <SettingRow
              title="Gift cards"
              description="A gift card code is issued and sent in the chat."
              control={toggle("sell_gift_cards")}
              last
            />
          </SettingCard>
        </Col>

        {/* Ordering */}
        <Col xs={24} xl={12}>
          <SettingCard
            icon={<MessageOutlined />}
            color="#0284c7"
            title="Ordering in chat"
            subtitle="How orders get started and confirmed"
            dimmed={off}
          >
            <SettingRow
              title="Customers can order on their own"
              description={
                <>
                  They reply <Text code>MENU</Text> <Text code>ORDER</Text> <Text code>GIFT CARD</Text>{" "}
                  <Text code>BOOK</Text> and the assistant takes them step by step to a finished order.
                </>
              }
              control={toggle("self_serve_enabled")}
            />
            <SettingRow
              title="Ask the customer to confirm"
              description="The customer replies YES before an order an agent prepared is placed."
              control={toggle("require_confirmation")}
              last={!requireConfirmation}
            />
            {requireConfirmation && (
              <Form.Item
                name="confirmation_message"
                label={fieldLabel("Message sent with the order summary")}
                style={{ margin: "12px 0 10px" }}
              >
                <TextArea rows={2} disabled={off} placeholder={DEFAULT_CONFIRMATION_MESSAGE} />
              </Form.Item>
            )}
          </SettingCard>
        </Col>

        {/* Collect / delivery */}
        <Col xs={24} xl={12}>
          <SettingCard
            icon={<CarOutlined />}
            color="#ea580c"
            title="Collect and delivery"
            subtitle="Asked before payment for products"
            dimmed={off || !sellInventory}
          >
            <SettingRow
              title="Collect at the shop"
              description="Also lists this shop as a pickup point for orders from your other shops."
              control={toggle("pickup_enabled", !sellInventory || (pickupOn && !deliveryOn))}
            />
            <SettingRow
              title="Delivery"
              description="Customers share an address or location pin."
              control={toggle("delivery_enabled", !sellInventory || (deliveryOn && !pickupOn))}
              last={!deliveryOn}
            />
            {deliveryOn && (
              <Row gutter={12} style={{ marginTop: 12 }}>
                <Col xs={24} sm={10}>
                  <Form.Item name="delivery_fee" label={fieldLabel("Delivery fee (Ksh)")} style={{ marginBottom: 10 }}>
                    <InputNumber min={0} step={50} disabled={off || !sellInventory} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={14}>
                  <Form.Item name="delivery_note" label={fieldLabel("Note for customers")} style={{ marginBottom: 10 }}>
                    <Input maxLength={80} disabled={off || !sellInventory} placeholder="e.g. Within Nairobi, 1–2 hours" />
                  </Form.Item>
                </Col>
              </Row>
            )}
          </SettingCard>
        </Col>

        {/* Gift cards */}
        <Col xs={24} xl={12}>
          <SettingCard
            icon={<GiftOutlined />}
            color="#c026d3"
            title="Gift card amounts"
            subtitle="Quick picks offered in chat"
            dimmed={off || !sellGiftCards}
          >
            <Form.Item
              name="gift_card_presets"
              extra={<span style={{ fontSize: 12 }}>Customers can still type any other amount.</span>}
              style={{ margin: "14px 0 10px" }}
            >
              <Select
                mode="tags"
                tokenSeparators={[" ", ","]}
                disabled={off || !sellGiftCards}
                placeholder="e.g. 1000 2500 5000"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </SettingCard>
        </Col>

        {/* Booking */}
        <Col xs={24}>
          <SettingCard
            icon={<CalendarOutlined />}
            color="#7c3aed"
            title="Appointment booking"
            subtitle="Customers pick a service, a day and an open time"
            dimmed={off || !sellServices || !bookingOn}
            extra={toggle("booking_enabled", !sellServices)}
          >
            <Row gutter={[12, 0]} style={{ marginTop: 12 }}>
              <Col xs={12} md={6} xl={4}>
                <Form.Item name="booking_open_time" label={fieldLabel("Opens")} style={{ marginBottom: 10 }}>
                  <TimePicker format="HH:mm" minuteStep={15} disabled={off || !bookingOn} style={{ width: "100%" }} inputReadOnly={isMobile} />
                </Form.Item>
              </Col>
              <Col xs={12} md={6} xl={4}>
                <Form.Item name="booking_close_time" label={fieldLabel("Closes")} style={{ marginBottom: 10 }}>
                  <TimePicker format="HH:mm" minuteStep={15} disabled={off || !bookingOn} style={{ width: "100%" }} inputReadOnly={isMobile} />
                </Form.Item>
              </Col>
              <Col xs={12} md={4} xl={4}>
                <Form.Item name="booking_slot_minutes" label={fieldLabel("Slot every")} style={{ marginBottom: 10 }}>
                  <Select
                    disabled={off || !bookingOn}
                    options={[15, 30, 45, 60].map((m) => ({ value: m, label: `${m} min` }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={12} md={4} xl={4}>
                <Form.Item
                  name="booking_capacity"
                  label={fieldLabel("Bookings at once")}
                  tooltip="How many customers one service can take in the same slot, e.g. the number of stylists"
                  style={{ marginBottom: 10 }}
                >
                  <InputNumber min={1} max={50} disabled={off || !bookingOn} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={12} md={4} xl={4}>
                <Form.Item name="booking_max_days_ahead" label={fieldLabel("Days ahead")} style={{ marginBottom: 10 }}>
                  <InputNumber min={1} max={365} disabled={off || !bookingOn} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>
            <SettingRow
              title="Payment required to book"
              description='Hides "pay at the shop" so a slot is only held once it is paid in chat.'
              control={toggle("booking_require_payment", !bookingOn)}
              last
            />
          </SettingCard>
        </Col>
      </Row>

      {/* Save bar — stays in view at the bottom of the section */}
      <div
        style={{
          position: "sticky",
          bottom: isMobile ? -12 : -20,
          marginTop: 16,
          marginInline: isMobile ? -12 : -22,
          padding: isMobile ? "10px 12px" : "12px 22px",
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(6px)",
          borderTop: "1px solid #eef2f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          zIndex: 2,
        }}
      >
        <Text style={{ fontSize: 12.5, color: dirty ? "#d97706" : C.subText }}>
          {dirty ? "You have unsaved changes" : "All changes saved"}
        </Text>
        <div style={{ display: "flex", gap: 8 }}>
          {dirty && (
            <Button
              onClick={() => {
                form.setFieldsValue(toFormValues(marketplace));
                setDirty(false);
              }}
            >
              Discard
            </Button>
          )}
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={saveMutation.isLoading}
            disabled={!dirty}
          >
            Save changes
          </Button>
        </div>
      </div>
    </Form>
  );
};

const WhatsAppIntegrationSettings: React.FC = () => <MarketplaceSettings />;

export default WhatsAppIntegrationSettings;
