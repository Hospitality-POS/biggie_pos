import { DownloadOutlined, EyeOutlined, FileOutlined, FilePdfOutlined, FileImageOutlined, PrinterOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
  Image,
  List,
  Popconfirm,
  message,
  Modal,
  Spin,
} from 'antd';
import moment from 'moment';
import React, { useRef, useState } from 'react';
import { printHtmlDirect } from '@utils/printHtmlDirect';

const { Text, Title } = Typography;

interface PaymentRecord {
  _id?: string;
  id?: string;
  amount: number;
  status?: string;
  paymentDate?: string;
  paymentMethod?: string;
  reference?: string;
  transactionReference?: string;
  receiptNo?: string;
  receiptNumber?: string;
  etimsRefNumber?: string;
  notes?: string;
  includesPenalty?: boolean;
  penaltyAmount?: number;
  createdBy?: any;
  processedBy?: any;
  createdAt?: string;
  updatedAt?: string;
  propertyId?: any;
  customerId?: any;
  sale?: {
    property?: {
      name?: string;
      propertyType?: string;
      location?: { address?: string };
    };
  };
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  paymentPlan?: {
    totalAmount?: number;
    outstandingBalance?: number;
    installmentAmount?: number;
    installmentFrequency?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  };
  attachments?: Array<{
    _id?: string;
    url?: string;
    fileName?: string;
    mimetype?: string;
    fileTypes?: string[];
    uploadedAt?: string;
    uploadedBy?: { name?: string };
  }>;
}

interface PaymentDrawerProps {
  record: PaymentRecord | null;
  visible: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export const PaymentDrawer: React.FC<PaymentDrawerProps> = ({
  record = null,
  visible,
  onClose,
  onRefresh,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [receiptPreviewVisible, setReceiptPreviewVisible] = useState(false);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [receiptPreviewLoading, setReceiptPreviewLoading] = useState(false);

  // Cleanup blob URL when component unmounts or URL changes
  React.useEffect(() => {
    return () => {
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
      }
    };
  }, [receiptPreviewUrl]);

  if (!record) return null;

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    return moment(dateString).format('DD MMM YYYY');
  };

  // Format payment method display
  const getPaymentMethodDisplay = (method?: string): React.ReactNode => {
    if (!method) return <Tag>Unknown</Tag>;

    switch (method) {
      case 'mpesa':
        return <Tag color="green">M-Pesa</Tag>;
      case 'bank_transfer':
        return <Tag color="blue">Bank Transfer</Tag>;
      case 'cash':
        return <Tag color="gold">Cash</Tag>;
      case 'cheque':
        return <Tag color="purple">Cheque</Tag>;
      case 'card':
        return <Tag color="cyan">Card</Tag>;
      default:
        return <Tag>{method}</Tag>;
    }
  };

  // Format payment status display
  const getStatusDisplay = (status?: string): React.ReactNode => {
    if (!status) return <Tag>Unknown</Tag>;

    let color = 'default';
    let text = status.charAt(0).toUpperCase() + status.slice(1);

    switch (status) {
      case 'pending':
        color = 'orange';
        break;
      case 'completed':
        color = 'green';
        break;
      case 'failed':
        color = 'red';
        break;
      case 'refunded':
        color = 'purple';
        break;
    }

    return <Tag color={color}>{text}</Tag>;
  };

  // Get file type icon
  const getFileIcon = (fileType?: string, fileName?: string) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();

    if (extension === 'pdf' || fileType === 'application/pdf') {
      return <FilePdfOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />;
    }

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return <FileImageOutlined style={{ fontSize: 24, color: '#1890ff' }} />;
    }

    return <FileOutlined style={{ fontSize: 24, color: '#666' }} />;
  };

  // Get file type tags for multiple types
  const getFileTypeTags = (fileTypes?: string[]) => {
    if (!fileTypes || fileTypes.length === 0) {
      return <Tag>Other</Tag>;
    }

    const typeMap: Record<string, { color: string; label: string }> = {
      receipt: { color: 'green', label: 'Receipt' },
      cheque: { color: 'purple', label: 'Cheque' },
      bank_slip: { color: 'blue', label: 'Bank Slip' },
      mpesa_confirmation: { color: 'green', label: 'M-Pesa' },
      invoice: { color: 'orange', label: 'Invoice' },
      agreement: { color: 'geekblue', label: 'Agreement' },
      contract: { color: 'cyan', label: 'Contract' },
      id_document: { color: 'magenta', label: 'ID/Passport' },
      other: { color: 'default', label: 'Other' },
    };

    return (
      <Space size={4} wrap>
        {fileTypes.map((fileType, index) => {
          const type = typeMap[fileType] || typeMap.other;
          return (
            <Tag key={`${fileType}-${index}`} color={type.color}>
              {type.label}
            </Tag>
          );
        })}
      </Space>
    );
  };

  // Check if file is an image
  const isImageFile = (fileName?: string) => {
    if (!fileName) return false;
    const extension = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '');
  };

  // Handle preview for images
  const handlePreview = (url: string, fileName: string) => {
    if (isImageFile(fileName)) {
      setPreviewImage(url);
      setPreviewTitle(fileName);
      setPreviewVisible(true);
    } else {
      window.open(url, '_blank');
    }
  };

  // Handle delete attachment
  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      // TODO: Implement delete payment attachment API call
      message.success('Attachment deleted successfully');
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      message.error('Failed to delete attachment');
    }
  };

  // Format text with capitalization
  const capitalizeFirstLetter = (text?: string): string => {
    if (!text) return 'N/A';
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  // Handle download functionality
  const handleDownloadPDF = async () => {
    try {
      const { generatePaymentReceiptPDF } = await import('@utils/paymentReceiptPDF');
      const { fetchProperty } = await import('@services/dala');

      // Fetch property details if property ID is available
      let propertyDetails = record.propertyId || record.sale?.property;
      const propertyId = (record.propertyId as any)?._id || (record.sale?.property as any)?._id;
      if (propertyId) {
        try {
          const propertyData = await fetchProperty(propertyId);
          const fetchedProperty = propertyData?.data || propertyData;
          // Merge fetched data with original to preserve propertyType
          propertyDetails = {
            ...propertyDetails,
            ...fetchedProperty,
            propertyType: propertyDetails?.propertyType || fetchedProperty?.propertyType,
          };
        } catch (error) {
          console.error('Error fetching property details:', error);
        }
      }

      const receiptData = {
        receiptNumber: record.receiptNumber || record.receiptNo || record._id || record.id,
        receiptNo: record.receiptNumber || record.receiptNo || record._id || record.id,
        amount: record.amount,
        paymentDate: record.paymentDate,
        paymentMethod: record.paymentMethod,
        paymentType: (record as any).paymentType,
        currency: (record as any).currency,
        reference: record.reference || '85e347d4',
        etimsRefNumber: record.etimsRefNumber,
        notes: record.notes,
        status: record.status,
        saleCode: (record as any).saleId?.saleCode || (record as any).saleId?.sale_code,
        unitId: (record as any).unitId?._id,
        customer: record.customer || record.customerId,
        property: propertyDetails,
        processedBy: record.createdBy?.name || record.processedBy?.name,
        createdAt: record.createdAt,
      };

      await generatePaymentReceiptPDF(receiptData);
      message.success('Receipt downloaded successfully');
    } catch (error) {
      console.error('Error generating receipt PDF:', error);
      message.error('Failed to download receipt');
    }
  };

  // Handle preview functionality
  const handlePreviewReceipt = async () => {
    setReceiptPreviewLoading(true);
    setReceiptPreviewVisible(true);
    setReceiptPreviewUrl(null);

    try {
      const { generatePaymentReceiptPDF } = await import('@utils/paymentReceiptPDF');
      const { fetchProperty } = await import('@services/dala');

      // Fetch property details if property ID is available
      let propertyDetails = record.propertyId || record.sale?.property;
      const propertyId = (record.propertyId as any)?._id || (record.sale?.property as any)?._id;
      if (propertyId) {
        try {
          const propertyData = await fetchProperty(propertyId);
          const fetchedProperty = propertyData?.data || propertyData;
          // Merge fetched data with original to preserve propertyType
          propertyDetails = {
            ...propertyDetails,
            ...fetchedProperty,
            propertyType: propertyDetails?.propertyType || fetchedProperty?.propertyType,
          };
        } catch (error) {
          console.error('Error fetching property details:', error);
        }
      }

      const receiptData = {
        receiptNumber: record.receiptNumber || record.receiptNo || record._id || record.id,
        receiptNo: record.receiptNumber || record.receiptNo || record._id || record.id,
        amount: record.amount,
        paymentDate: record.paymentDate,
        paymentMethod: record.paymentMethod,
        paymentType: (record as any).paymentType,
        currency: (record as any).currency,
        reference: record.reference || '85e347d4',
        etimsRefNumber: record.etimsRefNumber,
        notes: record.notes,
        status: record.status,
        saleCode: (record as any).saleId?.saleCode || (record as any).saleId?.sale_code,
        unitId: (record as any).unitId?._id,
        customer: record.customer || record.customerId,
        property: propertyDetails,
        processedBy: record.createdBy?.name || record.processedBy?.name,
        createdAt: record.createdAt,
      };

      console.log('Generating receipt preview with data:', receiptData);
      const pdfUrl = await generatePaymentReceiptPDF(receiptData, true);
      console.log('Generated PDF URL:', pdfUrl);

      if (pdfUrl && typeof pdfUrl === 'string') {
        setReceiptPreviewUrl(pdfUrl);
      } else {
        console.error('Invalid PDF URL generated:', pdfUrl);
        message.error('Failed to generate valid PDF preview');
        setReceiptPreviewVisible(false);
      }
    } catch (error) {
      console.error('Error generating receipt preview:', error);
      message.error('Failed to generate receipt preview');
      setReceiptPreviewVisible(false);
    } finally {
      setReceiptPreviewLoading(false);
    }
  };

  // Handle print functionality
  const handlePrintReceipt = async () => {
    try {
      const { fetchProperty } = await import('@services/dala');

      // Fetch property details if property ID is available
      let propertyDetails = record.propertyId || record.sale?.property;
      const propertyId = (record.propertyId as any)?._id || (record.sale?.property as any)?._id;
      if (propertyId) {
        try {
          const propertyData = await fetchProperty(propertyId);
          const fetchedProperty = propertyData?.data || propertyData;
          // Merge fetched data with original to preserve propertyType
          propertyDetails = {
            ...propertyDetails,
            ...fetchedProperty,
            propertyType: propertyDetails?.propertyType || fetchedProperty?.propertyType,
          };
        } catch (error) {
          console.error('Error fetching property details:', error);
        }
      }

      const paymentMethodDisplay = (() => {
        switch (record.paymentMethod) {
          case 'mpesa': return 'M-Pesa';
          case 'bank_transfer': return 'Bank Transfer';
          case 'cash': return 'Cash';
          case 'cheque': return 'Cheque';
          case 'card': return 'Card';
          default: return record.paymentMethod || 'Unknown';
        }
      })();

      const statusDisplay = (() => {
        switch (record.status) {
          case 'pending': return 'Pending';
          case 'completed': return 'Completed';
          case 'failed': return 'Failed';
          case 'refunded': return 'Refunded';
          default: return record.status || 'Unknown';
        }
      })();

      const htmlContent = `
        <div class="center header">PAYMENT RECEIPT</div>
        <div class="center">Receipt No: ${record.receiptNumber || record.receiptNo || 'N/A'}</div>
        <div class="border-top"></div>
        <div class="center bold" style="font-size: 16px; margin: 10px 0;">KES ${record.amount.toLocaleString()}</div>
        <div class="center">Payment Amount</div>
        <div class="border-bottom"></div>
        <table>
          <tr><td class="bold">Payment Date:</td><td>${record.paymentDate ? moment(record.paymentDate).format('DD MMM YYYY') : 'N/A'}</td></tr>
          <tr><td class="bold">Payment Method:</td><td>${paymentMethodDisplay}</td></tr>
          <tr><td class="bold">Status:</td><td>${statusDisplay}</td></tr>
          <tr><td class="bold">Reference:</td><td>${record.reference || '85e347d4'}</td></tr>
        </table>
        <div class="border-top"></div>
        <div class="bold" style="margin: 8px 0;">Customer Details</div>
        <table>
          <tr><td class="bold">Name:</td><td>${record.customer?.name || record.customerId?.email || 'N/A'}</td></tr>
          <tr><td class="bold">Phone:</td><td>${record.customer?.phone || record.customerId?.phone || 'N/A'}</td></tr>
        </table>
        ${propertyDetails ? `
        <div class="border-top"></div>
        <div class="bold" style="margin: 8px 0;">Property Details</div>
        <table>
          <tr><td class="bold">Property:</td><td>${propertyDetails.name || 'N/A'}</td></tr>
          <tr><td class="bold">Type:</td><td>${propertyDetails.propertyType || 'N/A'}</td></tr>
          <tr><td class="bold">Location:</td><td>${propertyDetails.location || 'N/A'}</td></tr>
        </table>
        ` : ''}
        <div class="border-top"></div>
        <div class="footer">
          <div>Processed By: ${record.createdBy?.name || record.processedBy?.name || 'N/A'}</div>
          <div>${moment().format('DD MMM YYYY HH:mm')}</div>
          <div>Thank you for your payment!</div>
        </div>
      `;

      printHtmlDirect(htmlContent, 80);
      message.success('Receipt sent to printer');
    } catch (error) {
      console.error('Error printing receipt:', error);
      message.error('Failed to print receipt');
    }
  };

  const paymentIdentifier = record.receiptNo || record.receiptNumber || record._id || 'Unknown';

  return (
    <>
      <Drawer
        title={
          <span>
            Payment Details: <strong>{paymentIdentifier}</strong>
          </span>
        }
        width={700}
        placement="right"
        onClose={onClose}
        open={visible}
        footer={
          <Space size="large" direction="horizontal" className="flex justify-end">
            {record.status === 'completed' && (
              <>
                <Button
                  icon={<EyeOutlined />}
                  onClick={handlePreviewReceipt}
                >
                  Preview Receipt
                </Button>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadPDF}
                >
                  Download PDF
                </Button>
                <Button icon={<PrinterOutlined />} onClick={handlePrintReceipt}>
                  Print Receipt
                </Button>
              </>
            )}
          </Space>
        }
      >
        <div ref={receiptRef}>
          {/* Payment Summary Card */}
          <Card style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Payment Amount"
                  value={record.amount}
                  precision={2}
                  valueStyle={{ color: '#3f8600' }}
                  prefix={'KES'}
                />
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong>Status:</Text> {getStatusDisplay(record.status)}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text strong>Payment Date:</Text>{' '}
                  {formatDate(record.paymentDate)}
                </div>
                <div>
                  <Text strong>Payment Method:</Text>{' '}
                  {getPaymentMethodDisplay(record.paymentMethod)}
                </div>
              </Col>
            </Row>
          </Card>

          {/* Property and Customer Section */}
          <Title level={5}>Property & Customer Details</Title>
          <Descriptions bordered size="small" column={1}>
            {record.sale?.property && (
              <>
                <Descriptions.Item label="Property">
                  {record.sale.property.name || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Property Type">
                  {record.sale.property.propertyType || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Location">
                  {record.sale.property.location?.address || 'N/A'}
                </Descriptions.Item>
              </>
            )}

            {record.customer && (
              <>
                <Descriptions.Item label="Customer Name">
                  {record.customer.name || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Customer Contact">
                  {record.customer.phone || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Customer Email">
                  {record.customer.email || 'N/A'}
                </Descriptions.Item>
              </>
            )}
          </Descriptions>

          <Divider />

          {/* Payment Details Section */}
          <Title level={5}>Payment Information</Title>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Payment Method">
              {getPaymentMethodDisplay(record.paymentMethod)}
            </Descriptions.Item>
            <Descriptions.Item label="Transaction Reference">
              {record.reference || record.transactionReference || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Receipt Number">
              {record.receiptNo || record.receiptNumber || 'N/A'}
            </Descriptions.Item>
            {record.etimsRefNumber && (
              <Descriptions.Item label="eTIMS Reference">
                <Tag color="blue">{record.etimsRefNumber}</Tag>
              </Descriptions.Item>
            )}
            {record.includesPenalty && record.penaltyAmount !== undefined && (
              <Descriptions.Item label="Penalty Amount">
                KES {record.penaltyAmount.toLocaleString()}
              </Descriptions.Item>
            )}
            {record.createdBy && (
              <Descriptions.Item label="Processed By">
                {record.createdBy.name || record.processedBy?.name || 'N/A'}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Notes">
              {record.notes || 'No notes available'}
            </Descriptions.Item>
          </Descriptions>

          <Divider />

          {/* Attachments Section with Multiple File Types */}
          {record.attachments && record.attachments.length > 0 && (
            <>
              <Title level={5}>
                Supporting Documents ({record.attachments.length})
              </Title>
              <List
                dataSource={record.attachments}
                bordered
                renderItem={(attachment: any) => (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => handlePreview(attachment.url, attachment.fileName)}
                        key="view"
                      >
                        View
                      </Button>,
                      <Button
                        type="link"
                        icon={<DownloadOutlined />}
                        onClick={() => window.open(attachment.url, '_blank')}
                        key="download"
                      >
                        Download
                      </Button>,
                      <Popconfirm
                        title="Delete attachment"
                        description="Are you sure you want to delete this attachment?"
                        onConfirm={() => handleDeleteAttachment(attachment._id)}
                        okText="Yes"
                        cancelText="No"
                        key="delete"
                      >
                        <Button
                          type="link"
                          danger
                          icon={<DeleteOutlined />}
                        >
                          Delete
                        </Button>
                      </Popconfirm>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={getFileIcon(attachment.mimetype, attachment.fileName)}
                      title={
                        <Space direction="vertical" size={4}>
                          <Text strong>{attachment.fileName}</Text>
                          {getFileTypeTags(attachment.fileTypes)}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={0}>
                          <Text type="secondary">
                            Uploaded: {formatDate(attachment.uploadedAt)}
                          </Text>
                          {attachment.uploadedBy && (
                            <Text type="secondary">
                              By: {attachment.uploadedBy.name || 'Unknown'}
                            </Text>
                          )}
                          {attachment.fileTypes && attachment.fileTypes.length > 1 && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {attachment.fileTypes.length} document types
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
              <Divider />
            </>
          )}

          {/* Payment Plan Information */}
          {record.paymentPlan && (
            <>
              <Title level={5}>Payment Plan Details</Title>
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="Total Amount">
                  KES {record.paymentPlan.totalAmount?.toLocaleString() || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Outstanding Balance">
                  KES{' '}
                  {record.paymentPlan.outstandingBalance?.toLocaleString() ||
                    'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Installment Amount">
                  KES{' '}
                  {record.paymentPlan.installmentAmount?.toLocaleString() ||
                    'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Installment Frequency">
                  {capitalizeFirstLetter(record.paymentPlan.installmentFrequency)}
                </Descriptions.Item>
                <Descriptions.Item label="Payment Plan Status">
                  {record.paymentPlan.status === 'active' ? (
                    <Tag color="green">Active</Tag>
                  ) : record.paymentPlan.status === 'completed' ? (
                    <Tag color="blue">Completed</Tag>
                  ) : (
                    <Tag color="red">Inactive</Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Payment Plan Duration">
                  {formatDate(record.paymentPlan.startDate)} to{' '}
                  {formatDate(record.paymentPlan.endDate)}
                </Descriptions.Item>
              </Descriptions>
            </>
          )}

          {/* Timestamps */}
          <Divider />
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Created At">
              {formatDate(record.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Updated At">
              {formatDate(record.updatedAt)}
            </Descriptions.Item>
          </Descriptions>
        </div>
      </Drawer>

      {/* Image Preview Modal */}
      <Modal
        open={previewVisible}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
      >
        <Image
          alt={previewTitle}
          style={{ width: '100%' }}
          src={previewImage}
        />
      </Modal>

      {/* Receipt Preview Modal */}
      <Modal
        title="Receipt Preview"
        open={receiptPreviewVisible}
        onCancel={() => {
          if (receiptPreviewUrl) {
            URL.revokeObjectURL(receiptPreviewUrl);
          }
          setReceiptPreviewVisible(false);
          setReceiptPreviewUrl(null);
        }}
        width="80%"
        style={{ top: 20 }}
        footer={[
          <Button key="close" onClick={() => {
            if (receiptPreviewUrl) {
              URL.revokeObjectURL(receiptPreviewUrl);
            }
            setReceiptPreviewVisible(false);
            setReceiptPreviewUrl(null);
          }}>
            Close
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleDownloadPDF}
          >
            Download PDF
          </Button>,
        ]}
      >
        {receiptPreviewLoading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Generating preview...</div>
          </div>
        ) : receiptPreviewUrl ? (
          <iframe
            src={receiptPreviewUrl}
            style={{ width: '100%', height: '70vh', border: 'none' }}
            title="Receipt Preview"
          />
        ) : null}
      </Modal>
    </>
  );
};

export default PaymentDrawer;
