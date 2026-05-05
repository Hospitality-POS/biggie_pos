import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Select, Switch, Button, Space, Divider, Typography, Alert, App, Skeleton, Card, List, Tag } from 'antd';
import { ProCard } from '@ant-design/pro-components';
import { PrinterOutlined, ApiOutlined, CheckCircleOutlined, CloseCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { 
  getPrinterConfig, 
  savePrinterConfig, 
  getLocalSubnet, 
  discoverPrinters, 
  testPrinterConnection, 
  printTestPage,
  type PrinterConfig,
  type DiscoveredPrinter
} from '../../../services/printer';

const { Option } = Select;
const { Text } = Typography;

const DEFAULT_CONFIG: Partial<PrinterConfig> = {
  printer_name: '',
  printer_type: 'thermal',
  connection_type: 'ip',
  port: 9100,
  paper_width: 80,
  characters_per_line: 32, // Much reduced for much larger text
  line_spacing: 48, // Much increased for larger text spacing
  is_default: true,
  is_active: true,
  timeout_ms: 5000,
  retry_attempts: 3
};

const PrinterSettings: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<PrinterConfig>();
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'failed'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoveredPrinters, setDiscoveredPrinters] = useState<DiscoveredPrinter[]>([]);
  const [localSubnet, setLocalSubnet] = useState<string>('');
  const [selectingPrinter, setSelectingPrinter] = useState<string | null>(null);

  const getShopId = () => localStorage.getItem("shopId") || "";
  const getTenantCode = () => {
    try {
      const storedTenant = localStorage.getItem("tenant");
      const tenant = storedTenant ? JSON.parse(storedTenant) : null;
      return tenant?.tenant_code || "";
    } catch {
      return "";
    }
  };

  const fetchPrinterConfig = useCallback(async () => {
    const shopId = getShopId();
    const tenantCode = getTenantCode();
    if (!shopId) return;
    
    setLoading(true);
    try {
      const data = await getPrinterConfig(shopId, tenantCode);
      
      if (data.success && data.printer_config) {
        setPrinterConfig(data.printer_config);
        form.setFieldsValue(data.printer_config);
      } else {
        // Set default values if no config exists
        form.setFieldsValue(DEFAULT_CONFIG);
      }
    } catch (error) {
      console.error('Failed to fetch printer configuration:', error);
      // Don't show error message for missing service - just use defaults
      form.setFieldsValue(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, [form]);

  const fetchLocalSubnet = useCallback(async () => {
    try {
      const data = await getLocalSubnet(getTenantCode());
      
      if (data.success) {
        setLocalSubnet(data.subnet);
      }
    } catch (error) {
      console.error('Failed to fetch local subnet:', error);
    }
  }, []);

  useEffect(() => {
    fetchPrinterConfig();
    fetchLocalSubnet();
  }, [fetchPrinterConfig, fetchLocalSubnet]);

  const handleDiscoverPrinters = async () => {
    setDiscovering(true);
    setDiscoveredPrinters([]);
    
    try {
      const data = await discoverPrinters(getTenantCode(), localSubnet, 3000, 15);
      
      if (data.success) {
        setDiscoveredPrinters(data.printers);
        message.success(`Found ${data.printers.length} potential printers`);
      } else {
        message.error('Printer discovery failed');
      }
    } catch (error) {
      message.error('Discovery request failed');
    } finally {
      setDiscovering(false);
    }
  };

  const selectPrinter = async (printer: DiscoveredPrinter) => {
    console.log('Selecting printer:', printer);
    setSelectingPrinter(printer.ip_address);
    
    try {
      // Update form fields first
      const formValues = {
        ip_address: printer.ip_address,
        port: printer.ports.includes(9100) ? 9100 : printer.ports[0],
        printer_name: `Thermal Printer (${printer.ip_address})`,
        connection_type: 'ip',
        is_active: true
      };
      
      console.log('Setting form values:', formValues);
      form.setFieldsValue(formValues);
      
      // Test connection before saving
      const port = printer.ports.includes(9100) ? 9100 : printer.ports[0];
      console.log(`Testing connection to ${printer.ip_address}:${port}...`);
      
      const connectionData = await testPrinterConnection(getTenantCode(), printer.ip_address, port, 5000);
      
      if (!connectionData.success || !connectionData.connected) {
        message.error(`Cannot connect to printer at ${printer.ip_address}:${port}. ${connectionData.message || 'Connection test failed.'}`);
        return;
      }
      
      console.log('Connection test successful, proceeding with save...');
      
      // Create printer configuration
      const printerConfig: PrinterConfig = {
        printer_name: `Thermal Printer (${printer.ip_address})`,
        printer_type: 'thermal',
        connection_type: 'ip',
        ip_address: printer.ip_address,
        port: port,
        paper_width: 80,
        characters_per_line: 32, // Much reduced for much larger text
        line_spacing: 48, // Much increased for larger text spacing
        is_default: true,
        is_active: true,
        timeout_ms: 5000,
        retry_attempts: 3
      };

      const shopId = getShopId();
      const tenantCode = getTenantCode();
      
      if (!shopId) {
        message.error('Shop ID not found');
        return;
      }

      console.log('Saving verified printer config:', printerConfig);
      
      const data = await savePrinterConfig(shopId, tenantCode, printerConfig);
      console.log('Save config response data:', data);
      
      if (data.success) {
        setPrinterConfig(printerConfig);
        setConnectionStatus('connected');
        setTestMessage('Successfully connected to printer');
        message.success(`Printer ${printer.ip_address} verified and saved successfully!`);
      } else {
        message.error(data.error || 'Failed to save printer configuration');
      }
    } catch (error) {
      console.error('Select printer error:', error);
      message.error('Configuration save failed');
    } finally {
      setSelectingPrinter(null);
    }
  };

  const testConnection = async () => {
    const values = form.getFieldsValue(['ip_address', 'port']);
    
    if (!values.ip_address) {
      message.error('Please enter printer IP address');
      return;
    }

    setTesting(true);
    setConnectionStatus('testing');
    setTestMessage('');
    
    try {
      const data = await testPrinterConnection(getTenantCode(), values.ip_address, values.port || 9100, 5000);
      
      if (data.success && data.connected) {
        setConnectionStatus('connected');
        setTestMessage('Successfully connected to printer');
        message.success('Printer connection successful!');
      } else {
        setConnectionStatus('failed');
        setTestMessage(data.message || 'Failed to connect to printer');
        message.error('Failed to connect to printer');
      }
    } catch (error) {
      setConnectionStatus('failed');
      setTestMessage('Printer service not available or connection failed');
      message.error('Printer service not available - backend service may not be running');
    } finally {
      setTesting(false);
    }
  };

  const saveConfig = async (values: PrinterConfig) => {
    console.log('Saving printer config:', values);
    const shopId = getShopId();
    const tenantCode = getTenantCode();
    
    if (!shopId) {
      message.error('Shop ID not found');
      return;
    }

    setSaving(true);
    try {
      const data = await savePrinterConfig(shopId, tenantCode, values);
      console.log('Save config response data:', data);
      
      if (data.success) {
        message.success('Printer configuration saved successfully');
        setPrinterConfig(values);
      } else {
        message.error(data.error || 'Failed to save printer configuration');
      }
    } catch (error) {
      console.error('Save config error:', error);
      message.error('Printer service not available - configuration not saved');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintTestPage = async () => {
    const shopId = getShopId();
    const tenantCode = getTenantCode();
    if (!shopId) {
      message.error('Shop ID not found');
      return;
    }

    if (!printerConfig?.is_active) {
      message.error('Printer is not active');
      return;
    }

    try {
      const data = await printTestPage(shopId, tenantCode);
      
      if (data.success) {
        message.success('Test page printed successfully');
      } else {
        message.error(data.error || 'Failed to print test page');
      }
    } catch (error) {
      message.error('Printer service not available - cannot print test page');
    }
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <ProCard
        bordered
        title={
          <Space>
            <PrinterOutlined style={{ color: '#6c1c2c' }} />
            <Text strong>Printer Configuration</Text>
          </Space>
        }
        extra={
          connectionStatus !== 'idle' && (
            <Space>
              {connectionStatus === 'testing' && (
                <Text type="secondary">Testing connection...</Text>
              )}
              {connectionStatus === 'connected' && (
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <Text style={{ color: '#52c41a' }}>Connected</Text>
                </Space>
              )}
              {connectionStatus === 'failed' && (
                <Space>
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                  <Text style={{ color: '#ff4d4f' }}>Connection Failed</Text>
                </Space>
              )}
            </Space>
          )
        }
        style={{ marginBottom: 16 }}
      >
        {loading ? (
          <Skeleton active paragraph={{ rows: 12 }} />
        ) : (
          <>
            {testMessage && (
              <Alert
                message={testMessage}
                type={connectionStatus === 'connected' ? 'success' : 'error'}
                style={{ marginBottom: 16 }}
                closable
                onClose={() => setTestMessage('')}
              />
            )}

            <Form
              form={form}
              layout="vertical"
              onFinish={saveConfig}
              initialValues={DEFAULT_CONFIG}
            >
          <Form.Item
            label="Printer Name"
            name="printer_name"
            rules={[{ required: true, message: 'Please enter printer name' }]}
          >
            <Input placeholder="e.g., Thermal Printer 1" />
          </Form.Item>

          <Form.Item
            label="Printer Type"
            name="printer_type"
          >
            <Select>
              <Option value="thermal">Thermal</Option>
              <Option value="laser">Laser</Option>
              <Option value="inkjet">Inkjet</Option>
              <Option value="pos">POS</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Connection Type"
            name="connection_type"
          >
            <Select>
              <Option value="ip">IP Network</Option>
              <Option value="usb">USB</Option>
              <Option value="bluetooth">Bluetooth</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="IP Address"
            name="ip_address"
            rules={[
              { required: true, message: 'Please enter printer IP address' },
              { pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, message: 'Invalid IP address format' }
            ]}
          >
            <Input placeholder="e.g., 192.168.1.100" />
          </Form.Item>

          <Form.Item
            label="Port"
            name="port"
            rules={[{ type: 'number', min: 1, max: 65535, message: 'Port must be between 1 and 65535' }]}
          >
            <Input type="number" placeholder="9100" />
          </Form.Item>

          <Form.Item
            label="Paper Width (mm)"
            name="paper_width"
          >
            <Select>
              <Option value={58}>58mm</Option>
              <Option value={80}>80mm</Option>
              <Option value={112}>112mm</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Characters per Line"
            name="characters_per_line"
          >
            <Input type="number" min={20} max={48} />
          </Form.Item>

          <Form.Item
            label="Line Spacing"
            name="line_spacing"
          >
            <Input type="number" min={24} max={48} />
          </Form.Item>

          <Form.Item
            label="Timeout (ms)"
            name="timeout_ms"
          >
            <Input type="number" min={1000} max={30000} />
          </Form.Item>

          <Form.Item
            label="Retry Attempts"
            name="retry_attempts"
          >
            <Input type="number" min={1} max={10} />
          </Form.Item>

          <Form.Item
            label="Active"
            name="is_active"
            valuePropName="checked"
          >
            <Switch checkedChildren="Yes" unCheckedChildren="No" />
          </Form.Item>

          <Divider />

          {/* Printer Discovery Section */}
          <Card 
            title={
              <Space>
                <SearchOutlined />
                <span>Auto-Discover Printers</span>
              </Space>
            } 
            size="small" 
            style={{ marginBottom: 16 }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">Network: {localSubnet}.x</Text>
              </div>
              
              <Button 
                type="primary" 
                icon={<SearchOutlined />}
                onClick={handleDiscoverPrinters}
                loading={discovering}
                block
              >
                {discovering ? 'Scanning Network...' : 'Discover Printers'}
              </Button>

              {discoveredPrinters.length > 0 && (
                <div>
                  <Text strong>Found {discoveredPrinters.length} potential printers:</Text>
                  <List
                    size="small"
                    dataSource={discoveredPrinters}
                    renderItem={(printer) => (
                      <List.Item
                        actions={[
                          <Button 
                            type="primary" 
                            size="small"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Button clicked for printer:', printer);
                              selectPrinter(printer);
                            }}
                            icon={<CheckCircleOutlined />}
                            loading={selectingPrinter === printer.ip_address}
                            disabled={selectingPrinter !== null}
                          >
                            {selectingPrinter === printer.ip_address ? 'Saving...' : 'Select & Save'}
                          </Button>
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<PrinterOutlined />}
                          title={
                            <Space>
                              {printer.ip_address}
                              <Tag color={printer.confidence > 70 ? 'green' : 'orange'}>
                                {printer.confidence}% confidence
                              </Tag>
                              {printerConfig?.ip_address === printer.ip_address && (
                                <Tag color="green" icon={<CheckCircleOutlined />}>
                                  Active
                                </Tag>
                              )}
                            </Space>
                          }
                          description={
                            <Space direction="vertical" size="small">
                              <Text type="secondary">Ports: {printer.ports.join(', ')}</Text>
                              {printer.services.map((service, idx) => (
                                <Tag key={idx} color="blue">
                                  {service.type}: {service.description}
                                </Tag>
                              ))}
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </div>
              )}

              {discoveredPrinters.length === 0 && !discovering && localSubnet && (
                <Text type="secondary">
                  No printers found. Make sure your thermal printer is connected to the network.
                </Text>
              )}
            </Space>
          </Card>

          <Space>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={saving}
              style={{ background: '#6c1c2c', borderColor: '#6c1c2c' }}
              onClick={(e) => {
                e.preventDefault();
                console.log('Save button clicked directly');
                form.submit();
              }}
            >
              Save Configuration
            </Button>
            <Button 
              onClick={testConnection} 
              loading={testing}
              icon={<ApiOutlined />}
            >
              Test Connection
            </Button>
            <Button 
              onClick={handlePrintTestPage} 
              disabled={!printerConfig?.is_active}
              icon={<PrinterOutlined />}
            >
              Print Test Page
            </Button>
          </Space>
        </Form>
          </>
        )}
      </ProCard>
    </div>
  );
};

export default PrinterSettings;
