import React, { useEffect } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Space,
  Switch,
  Typography,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  SaveOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchShop,
  updateShopWhatsappMarketplace,
  ShopWhatsappMarketplace,
} from "@services/shops";
import { THEME_C } from "@utils/getPrimaryColor";

const { Text, Title } = Typography;
const { TextArea } = Input;
const C = THEME_C;

const DEFAULT_CONFIRMATION_MESSAGE =
  "Reply YES to confirm your order.";

const MarketplaceSettings: React.FC = () => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const shopId = localStorage.getItem("shopId");

  const { data: shopData, isLoading } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: !!shopId,
  });

  const marketplace = shopData?.whatsapp_marketplace as
    | ShopWhatsappMarketplace
    | undefined;

  useEffect(() => {
    form.setFieldsValue({
      enabled: marketplace?.enabled ?? false,
      sell_inventory: marketplace?.sell_inventory ?? true,
      sell_services: marketplace?.sell_services ?? true,
      sell_gift_cards: marketplace?.sell_gift_cards ?? true,
      require_confirmation: marketplace?.require_confirmation ?? true,
      self_serve_enabled: marketplace?.self_serve_enabled ?? true,
      confirmation_message:
        marketplace?.confirmation_message || DEFAULT_CONFIRMATION_MESSAGE,
    });
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
      }),
    onSuccess: () => {
      message.success("WhatsApp marketplace settings saved");
      queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
    },
    onError: () => {
      message.error("Failed to save WhatsApp marketplace settings");
    },
  });

  const enabled = Form.useWatch("enabled", form);

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

  return (
    <Card loading={isLoading} bordered={false} style={{ maxWidth: 720 }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            <ShoppingCartOutlined style={{ color: C.primary, marginRight: 8 }} />
            WhatsApp Marketplace
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Let customers buy items directly inside a WhatsApp chat. When enabled,
            agents get a Sell button in the Omnichannel inbox to build an order,
            send it to the customer for confirmation, and place it — inventory is
            deducted automatically and the customer receives an order code.
          </Text>
        </div>

        {marketplace?.enabled && (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message="Marketplace is active for this shop"
            style={{ borderRadius: 8 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => saveMutation.mutate(values)}
          disabled={isLoading}
        >
          <Form.Item
            name="enabled"
            label="Enable WhatsApp Marketplace"
            valuePropName="checked"
            style={{ marginBottom: 16 }}
          >
            <Switch />
          </Form.Item>

          <Card
            size="small"
            title={
              <Space>
                <ShopOutlined style={{ color: C.primary }} />
                <Text strong style={{ fontSize: 13 }}>
                  What can customers buy?
                </Text>
              </Space>
            }
            style={{
              borderRadius: 8,
              marginBottom: 16,
              opacity: enabled ? 1 : 0.5,
            }}
          >
            <Space direction="vertical" size={8}>
              <Form.Item
                name="sell_inventory"
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <Checkbox disabled={!enabled}>
                  Inventory items (stock is deducted automatically on confirm)
                </Checkbox>
              </Form.Item>
              <Form.Item
                name="sell_services"
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <Checkbox disabled={!enabled}>Services</Checkbox>
              </Form.Item>
              <Form.Item
                name="sell_gift_cards"
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <Checkbox disabled={!enabled}>
                  Gift cards (a card code is issued and sent to the customer)
                </Checkbox>
              </Form.Item>
            </Space>
          </Card>

          <Form.Item
            name="self_serve_enabled"
            label="Let customers order by chatting"
            tooltip="Customers text MENU or ORDER to browse the catalogue, build a cart and check out — M-Pesa payment details from the System Profile are shared automatically (no payment is triggered)"
            valuePropName="checked"
            style={{ marginBottom: 16 }}
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                Trigger keywords: <Text code>MENU</Text>, <Text code>ORDER</Text>,{" "}
                <Text code>BUY</Text>, <Text code>SHOP</Text>,{" "}
                <Text code>CATALOG</Text>, <Text code>PRICE LIST</Text>
              </Text>
            }
          >
            <Switch disabled={!enabled} />
          </Form.Item>

          <Form.Item
            name="require_confirmation"
            label="Require customer confirmation before placing the order"
            tooltip="The customer must reply YES in the chat before the agent can place the order"
            valuePropName="checked"
            style={{ marginBottom: 16 }}
          >
            <Switch disabled={!enabled} />
          </Form.Item>

          <Form.Item
            name="confirmation_message"
            label="Confirmation prompt sent with the order summary"
            style={{ marginBottom: 16 }}
          >
            <TextArea
              rows={2}
              disabled={!enabled}
              placeholder={DEFAULT_CONFIRMATION_MESSAGE}
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={saveMutation.isPending}
            style={{ background: C.primary, borderColor: C.primary }}
          >
            Save WhatsApp Settings
          </Button>
        </Form>
      </Space>
    </Card>
  );
};

const WhatsAppIntegrationSettings: React.FC = () => <MarketplaceSettings />;

export default WhatsAppIntegrationSettings;
