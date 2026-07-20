import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  message,
  Tooltip,
  DatePicker,
  Drawer,
  Descriptions,
  Tabs,
  Empty,
  Dropdown,
  Form,
  Upload,
  Modal,
  Spin,
  Checkbox,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  DollarOutlined,
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  FileTextOutlined,
  ReloadOutlined,
  AccountBookOutlined,
  FilePdfOutlined,
  FileOutlined,
  UploadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPropertySales, fetchProperties, createPropertySale, updatePropertySale, deletePropertySale } from '@services/dala';
import {
  fetchPropertyDocuments,
  uploadPropertyDocument,
  deletePropertyDocument,
  PROPERTY_DOCUMENT_TYPES,
} from '@services/dala/propertyDocuments';
import { fetchSystemSetupDetailsById } from '@services/systemsetup';
import { useDalaSales, useDalaProperties } from '../../../stores/dalaStore';
import { generateOfferLetterPDF } from '@utils/offerLetterPDF';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AddEditSaleModal from './AddEditSaleModal';
import SalesPaymentsTab from '../payments/SalesPaymentsTab';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  red: "#ef4444",
  blue: "#3b82f6",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

const SalesManagement: React.FC = () => {
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('sales');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editSale, setEditSale] = useState<any>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  
  // Document management state
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [documentForm] = Form.useForm();
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [hidePaymentPlans, setHidePaymentPlans] = useState(false);

  const shop_id = localStorage.getItem("shopId");

  // Fetch documents when drawer opens and documents tab is active
  useEffect(() => {
    const property_id = selectedSale?.property_id || selectedSale?.property?._id;
    if (drawerVisible && property_id && shop_id) {
      fetchPropertyDocuments(property_id, shop_id)
        .then(response => {
          setDocuments(Array.isArray(response.data) ? response.data : []);
        })
        .catch(() => setDocuments([]));
    }
  }, [drawerVisible, selectedSale?.property_id, selectedSale?.property?._id, shop_id]);

  const handleDocumentUpload = async (values: any) => {
    console.log('handleDocumentUpload called with values:', values);
    console.log('fileList:', fileList);
    console.log('selectedSale:', selectedSale);
    console.log('shop_id:', shop_id);
    
    const property_id = selectedSale?.property_id || selectedSale?.property?._id;
    console.log('resolved property_id:', property_id);
    
    if (!property_id || !shop_id) {
      message.error(`Missing property_id (${property_id}) or shop_id (${shop_id})`);
      return;
    }
    
    if (fileList.length === 0) {
      message.error("Please upload at least one file");
      return;
    }
    
    setUploadLoading(true);
    try {
      await uploadPropertyDocument(property_id, {
        shop_id,
        document_type: values.document_type,
        name: values.name,
        description: values.description,
        files: fileList.map(f => f.originFileObj).filter(Boolean),
      });
      documentForm.resetFields();
      setFileList([]);
      // Refresh documents
      const response = await fetchPropertyDocuments(property_id, shop_id);
      setDocuments(Array.isArray(response.data) ? response.data : []);
      message.success("Document uploaded successfully");
    } catch (error) {
      console.error('Upload error:', error);
      message.error("Failed to upload document");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!selectedSale?.property_id || !shop_id) return;
    try {
      await deletePropertyDocument(selectedSale.property_id, documentId, shop_id);
      // Refresh documents
      const response = await fetchPropertyDocuments(selectedSale.property_id, shop_id);
      setDocuments(Array.isArray(response.data) ? response.data : []);
      message.success("Document deleted");
    } catch (error) {
      message.error("Failed to delete document");
    }
  };

  const SectionTitle = ({ label }: { label: string }) => (
    <Text strong style={{
      fontSize: 11, color: C.primary, textTransform: "uppercase",
      letterSpacing: "0.5px", display: "block",
    }}>
      {label}
    </Text>
  );
  
  const storeSales = useDalaSales();
  const properties = useDalaProperties();

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['dala-sales'],
    queryFn: () => fetchPropertySales(),
  });

  const sales = (Array.isArray(data?.data) ? data.data : storeSales).map((sale: any) => {
    const salePrice = sale.sale_price || sale.salePrice || 0;
    const commissionRate = sale.commission_rate || sale.commissionPercentage || 0;
    const commissionAmount = sale.commission_amount || sale.commission?.amount || (salePrice * (commissionRate / 100));
    
    return {
      ...sale,
      property_id: sale.property_id || sale.property?._id,
      unit_id: sale.unit_id || sale.unitTypeID?._id,
      sale_date: sale.sale_date || sale.saleDate,
      sale_price: salePrice,
      payment_plan: sale.payment_plan || sale.paymentPlanType,
      deposit_paid: sale.deposit_paid || sale.initialPayment || sale.paymentTotals?.depositPaid || sale.deposit?.amount || 0,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      client: sale.client || sale.customer,
      unit: sale.unit || sale.unitTypeID,
      installments: sale.installments || sale.paymentSchedule || sale.paymentInstallments || [],
    payments: sale.payments || [],
    paymentPlans: sale.paymentPlans || [],
    paymentTotals: sale.paymentTotals,
    deposit: sale.deposit,
    documents: sale.documents || sale.attachments || sale.saleDocuments || [],
    };
  });

  const propertiesQuery = useQuery({
    queryKey: ['dala-properties'],
    queryFn: fetchProperties,
  });

  const createMutation = useMutation({
    mutationFn: createPropertySale,
    onSuccess: () => {
      message.success('Sale created successfully');
      setModalVisible(false);
      setEditSale(null);
      queryClient.invalidateQueries(['dala-sales']);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.error || 'Failed to create sale');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updatePropertySale(id, data),
    onSuccess: () => {
      message.success('Sale updated successfully');
      setModalVisible(false);
      setEditSale(null);
      queryClient.invalidateQueries(['dala-sales']);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.error || 'Failed to update sale');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePropertySale,
    onSuccess: () => {
      message.success('Sale deleted successfully');
      queryClient.invalidateQueries(['dala-sales']);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.error || 'Failed to delete sale');
    },
  });

  console.log('Properties query state:', {
    isLoading: propertiesQuery.isLoading,
    error: propertiesQuery.error,
    data: propertiesQuery.data,
  });

  const filteredSales = sales.filter((sale) => {
    const matchesSearch = !searchTerm || 
      sale.property?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.unit?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.client?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || sale.status === statusFilter;
    const matchesProperty = !propertyFilter || sale.property_id === propertyFilter;
    
    let matchesDateRange = true;
    if (dateRange) {
      const saleDate = dayjs(sale.sale_date);
      matchesDateRange = saleDate.isAfter(dateRange[0]) && saleDate.isBefore(dateRange[1]);
    }
    
    return matchesSearch && matchesStatus && matchesProperty && matchesDateRange;
  });

  const columns = [
    {
      title: 'Sale Code',
      dataIndex: 'saleCode',
      key: 'saleCode',
      render: (code: string) => <Text strong>{code || '-'}</Text>,
    },
    {
      title: 'Sale Date',
      dataIndex: 'sale_date',
      key: 'sale_date',
      render: (date: string) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'Property',
      dataIndex: ['property', 'name'],
      key: 'property',
      render: (name: string, record: any) => (
        <Text strong>{name || record.property?.propertyType || record.property_id || '-'}</Text>
      ),
    },
    {
      title: 'Unit',
      dataIndex: ['unit', 'name'],
      key: 'unit',
      render: (name: string, record: any) => (
        <Text>{name || record.apartmentName || record.unit?.totalUnits || record.unit_id || '-'}</Text>
      ),
    },
    {
      title: 'Client',
      dataIndex: ['client', 'name'],
      key: 'client',
      render: (name: string, record: any) => (
        <div>
          {record.isJointPurchase ? (
            <div>
              <Tag color="purple" size="small">Joint ({record.customers?.length || 0})</Tag>
              <Text style={{ marginLeft: 8 }}>
                {record.customers?.[0]?.name || record.customers?.[0]?.customer_name || record.customer?.name || record.client?.name || '-'}
              </Text>
            </div>
          ) : (
            <Text>{name || record.customer?.name || record.client?.name || record.customer?.email || record.client?.email || '-'}</Text>
          )}
        </div>
      ),
    },
    {
      title: 'List Price',
      dataIndex: 'list_price',
      key: 'list_price',
      render: (price: number, record: any) => `KES ${(price || record.listPrice || 0).toLocaleString()}`,
    },
    {
      title: 'Discount',
      dataIndex: 'discount',
      key: 'discount',
      render: (discount: number, record: any) => {
        const discountAmount = discount || record.discount || 0;
        return discountAmount > 0 ? (
          <Text type="danger">-KES {discountAmount.toLocaleString()}</Text>
        ) : (
          <Text type="secondary">KES 0</Text>
        );
      },
    },
    {
      title: 'Sale Price',
      dataIndex: 'sale_price',
      key: 'sale_price',
      render: (price: number, record: any) => `KES ${(price || record.salePrice || 0).toLocaleString()}`,
    },
    {
      title: 'Payment Plan',
      dataIndex: 'payment_plan',
      key: 'payment_plan',
      render: (plan: string) => <Tag color="blue">{plan?.toUpperCase() || '-'}</Tag>,
    },
    {
      title: 'Deposit',
      dataIndex: 'deposit_paid',
      key: 'deposit',
      render: (deposit: number, record: any) => 
        `KES ${(deposit || 0).toLocaleString()} (${record.sale_price ? (((deposit || 0) / record.sale_price) * 100).toFixed(1) : '0.0'}%)`,
    },
    {
      title: 'Paid',
      dataIndex: 'paymentTotals',
      key: 'payment_percentage',
      render: (paymentTotals: any, record: any) => {
        const percentage = paymentTotals?.paymentPercentage ?? 0;
        const totalPaid = paymentTotals?.totalPaid ?? 0;
        return (
          <div>
            <div>{percentage.toFixed(1)}%</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              KES {(totalPaid || 0).toLocaleString()}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Commission',
      dataIndex: 'commission_amount',
      key: 'commission',
      render: (commission: number, record: any) => 
        `KES ${(commission || 0).toLocaleString()} (${record.commission_rate || 0}%)`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          pending: 'orange',
          deposit_paid: 'blue',
          active: 'green',
          completed: 'success',
          cancelled: 'red',
        };
        return <Tag color={colors[status] || 'default'}>{status?.replace('_', ' ').toUpperCase() || '-'}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewSale(record)}
            />
          </Tooltip>
          <Tooltip title="Edit Sale">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEditSale(record)}
            />
          </Tooltip>
          <Tooltip title="Delete Sale">
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                const confirmed = window.confirm(
                  `Are you sure you want to delete this sale for ${record.client?.name || record.customer?.name || 'this client'}? This action cannot be undone.`
                );
                if (confirmed) {
                  deleteMutation.mutate(record._id);
                }
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const stats = {
    total: sales.length,
    totalValue: sales.reduce((sum, sale) => sum + (sale.sale_price || sale.salePrice || 0), 0),
    totalDiscount: sales.reduce((sum, sale) => sum + (sale.discount || 0), 0),
    pending: sales.filter(s => s.status === 'pending').length,
    completed: sales.filter(s => s.status === 'completed').length,
  };

  const handleAddSale = () => {
    setEditSale(null);
    setModalVisible(true);
  };

  const handleEditSale = (sale: any) => {
    setEditSale(sale);
    setModalVisible(true);
  };

  const handleViewSale = (sale: any) => {
    setSelectedSale(sale);
    setDrawerVisible(true);
  };

  const handleDrawerClose = () => {
    setDrawerVisible(false);
    setSelectedSale(null);
  };

  const handleDownloadPDF = async () => {
    if (!selectedSale) return;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Get brand primary color
      const primaryColor = localStorage.getItem('primaryColor') || '#1890ff';
      
      // Convert hex to RGB for jsPDF
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 24, g: 144, b: 255 };
      };
      
      const rgb = hexToRgb(primaryColor);
      
      // Title at the top
      doc.setFontSize(22);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text('Client Statement', pageWidth / 2, 15, { align: 'center' });
      
      // Divider line after title
      doc.setDrawColor(200, 200, 200);
      doc.line(15, 20, pageWidth - 15, 20);
      
      // Add logo (use tenant logo from tenant object, fallback to relia.png)
      const defaultLogoUrl = '/relia.png';
      let tenantLogo = defaultLogoUrl;
      
      try {
        const tenantStr = localStorage.getItem('tenant');
        if (tenantStr) {
          const tenant = JSON.parse(tenantStr);
          tenantLogo = tenant?.tenant_logo?.url || defaultLogoUrl;
        }
      } catch (error) {
        console.error('Error parsing tenant for logo:', error);
      }
      
      try {
        doc.addImage(tenantLogo, 'PNG', 15, 25, 25, 25);
      } catch (error) {
        // If logo fails to load, draw a placeholder with brand color
        doc.setFillColor(rgb.r, rgb.g, rgb.b);
        doc.circle(27.5, 37.5, 12.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text('LOGO', 27.5, 37.5, { align: 'center', baseline: 'middle' });
      }
      
      // Get system settings for company information
      let systemName = 'Relia POS';
      let systemPhone = '';
      let systemEmail = '';
      let systemAddress = '';
      
      try {
        const systemSettings = await fetchSystemSetupDetailsById();
        systemName = String(systemSettings?.name || systemSettings?.business_name || 'Relia POS');
        systemPhone = String(systemSettings?.phone || '');
        systemEmail = String(systemSettings?.email || '');
        systemAddress = String(systemSettings?.location || systemSettings?.address || '');
      } catch (error) {
        console.error('Error fetching system settings:', error);
      }
      
      // Company details on the far right - aligned professionally
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(systemName, pageWidth - 15, 30, { align: 'right' });
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      let yPos = 38;
      if (systemAddress && systemAddress !== '[object Object]' && systemAddress !== '') {
        doc.text(systemAddress, pageWidth - 15, yPos, { align: 'right' });
        yPos += 6;
      }
      if (systemPhone) {
        doc.text(`Tel: ${systemPhone}`, pageWidth - 15, yPos, { align: 'right' });
        yPos += 6;
      }
      if (systemEmail) {
        doc.text(`Email: ${systemEmail}`, pageWidth - 15, yPos, { align: 'right' });
      }
      
      // Divider line after company details
      doc.setDrawColor(200, 200, 200);
      doc.line(15, 55, pageWidth - 15, 55);
      
      // Sale Information section
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Sale Information', 15, 63);
      
      // Sale details table
      const saleData = [
        ['Sale Code', selectedSale.saleCode || selectedSale._id || '-'],
        ['Client', selectedSale.client?.name || selectedSale.client?.customer_name || selectedSale.client?.email || '-'],
        ['Property', selectedSale.property?.name || selectedSale.property?.propertyType || '-'],
        ['Unit/Apartment', selectedSale.apartmentName || selectedSale.unit?.name || '-'],
        ['List Price', `KES ${(selectedSale.list_price || selectedSale.listPrice || 0).toLocaleString()}`],
        ['Discount', `KES ${(selectedSale.discount || 0).toLocaleString()}`],
        ['Sale Price', `KES ${(selectedSale.sale_price || selectedSale.salePrice || 0).toLocaleString()}`],
        ['Deposit Paid', `KES ${(selectedSale.paymentTotals?.depositPaid || selectedSale.deposit?.amount || 0).toLocaleString()}`],
        ['Paid Amount', `KES ${(selectedSale.paymentTotals?.totalPaid || 0).toLocaleString()}`],
        ['Balance', `KES ${(selectedSale.paymentTotals?.outstandingBalance ?? (selectedSale.sale_price - selectedSale.paymentTotals?.totalPaid)).toLocaleString()}`],
        ['Payment Stage', selectedSale.status?.replace('_', ' ').toUpperCase() || '-'],
        ['Sale Date', selectedSale.sale_date ? dayjs(selectedSale.sale_date).format('DD MMM YYYY') : '-'],
      ];
      
      autoTable(doc, {
        startY: 68,
        head: [['Field', 'Value']],
        body: saleData,
        theme: 'grid',
        headStyles: {
          fillColor: [rgb.r, rgb.g, rgb.b],
          textColor: 255,
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 50 },
          1: { cellWidth: 'auto' },
        },
        didDrawPage: (data) => {
          // Store the final Y position after drawing the table
          if (data.cursor) {
            (doc as any).lastY = data.cursor.y;
          }
        },
      });
      
      let currentY = (doc as any).lastY || 130;
      currentY += 15; // Add spacing after Sale Information table
      
      // Payment Plans Section
      const paymentPlans = selectedSale.paymentPlans || [];
      if (paymentPlans.length > 0) {
        if (currentY > pageHeight - 100) {
          doc.addPage();
          currentY = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Payment Plans', 15, currentY);
        
        currentY += 10;
        
        const planHeaders = ['Start Date', 'End Date', 'Total Amount', 'Installment', 'Frequency', 'Installments', 'Status'];
        const planRows = paymentPlans.map((plan: any) => [
          plan.startDate ? dayjs(plan.startDate).format('DD MMM YYYY') : '-',
          plan.endDate ? dayjs(plan.endDate).format('DD MMM YYYY') : '-',
          `KES ${(plan.totalAmount || 0).toLocaleString()}`,
          `KES ${(plan.installmentAmount || 0).toLocaleString()}`,
          plan.installmentFrequency || '-',
          plan.numberOfInstallments || 0,
          plan.status?.toUpperCase() || '-',
        ]);
        
        autoTable(doc, {
          startY: currentY,
          head: [planHeaders],
          body: planRows,
          theme: 'grid',
          headStyles: {
            fillColor: [rgb.r, rgb.g, rgb.b],
            textColor: 255,
            fontStyle: 'bold',
          },
          styles: {
            fontSize: 9,
            cellPadding: 2,
          },
          didDrawPage: (data) => {
            if (data.cursor) {
              (doc as any).lastY = data.cursor.y;
            }
          },
        });
        
        currentY = (doc as any).lastY || currentY + 50;
        currentY += 15; // Add spacing after Payment Plans table
      }
      
      // Payments Section
      const payments = selectedSale.payments || [];
      if (payments.length > 0) {
        if (currentY > pageHeight - 80) {
          doc.addPage();
          currentY = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Payment History', 15, currentY);
        
        currentY += 10;
        
        const paymentHeaders = ['Date', 'Amount', 'Method', 'Type', 'Status', 'Notes'];
        const paymentRows = payments.map((payment: any) => [
          payment.payment_date ? dayjs(payment.payment_date).format('DD MMM YYYY') : '-',
          `KES ${(payment.amount || 0).toLocaleString()}`,
          payment.method_id?.name?.replace('_', ' ').toUpperCase() || '-',
          payment.payment_type?.replace('_', ' ').toUpperCase() || '-',
          payment.payment_status?.toUpperCase() || '-',
          payment.notes || '-',
        ]);
        
        autoTable(doc, {
          startY: currentY,
          head: [paymentHeaders],
          body: paymentRows,
          theme: 'grid',
          headStyles: {
            fillColor: [rgb.r, rgb.g, rgb.b],
            textColor: 255,
            fontStyle: 'bold',
          },
          styles: {
            fontSize: 9,
            cellPadding: 2,
          },
        });
      }
      
      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Generated: ${dayjs().format('DD MMM YYYY HH:mm')} | Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
      
      // Save the PDF with client name
      const clientName = selectedSale.client?.name || selectedSale.client?.customer_name || selectedSale.client?.email || 'client';
      const sanitizedClientName = clientName.replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`client-statement-${sanitizedClientName}-${selectedSale.saleCode || selectedSale._id || 'sale'}.pdf`);
      message.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      message.error('Failed to generate PDF');
    }
  };

  const handleDownloadClientStatement = () => {
    if (!selectedSale) return;

    const paymentPlans = selectedSale.paymentPlans || [];
    const payments = selectedSale.payments || [];
    const paidAmount = selectedSale.paymentTotals?.totalPaid || payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
    const balance = selectedSale.paymentTotals?.outstandingBalance ?? ((selectedSale.sale_price || 0) - paidAmount);
    const rows: Array<Array<string | number>> = [
      ['Client Statement'],
      ['Sale Code', selectedSale.saleCode || selectedSale._id || '-'],
      ['Client', selectedSale.client?.name || selectedSale.client?.customer_name || selectedSale.client?.email || '-'],
      ['Property', selectedSale.property?.name || selectedSale.property?.propertyType || '-'],
      ['Unit/Apartment', selectedSale.apartmentName || selectedSale.unit?.name || selectedSale.unit_id || '-'],
      ['Sale Price', selectedSale.sale_price || 0],
      ['Deposit Paid', selectedSale.paymentTotals?.depositPaid || selectedSale.deposit?.amount || 0],
      ['Paid Amount', paidAmount],
      ['Balance', balance],
      ['Payment Stage', selectedSale.status || '-'],
      [''],
      ['Payment Plans'],
      ['Start Date', 'End Date', 'Total Amount', 'Installment Amount', 'Frequency', 'Installments', 'Status'],
      ...paymentPlans.map((plan: any) => [
        plan.startDate || '-',
        plan.endDate || '-',
        plan.totalAmount || 0,
        plan.installmentAmount || 0,
        plan.installmentFrequency || '-',
        plan.numberOfInstallments || 0,
        plan.status || '-',
      ]),
      [''],
      ['Payments'],
      ['Payment Date', 'Amount', 'Method', 'Type', 'Status', 'Notes'],
      ...payments.map((payment: any) => [
        payment.payment_date || '-',
        payment.amount || 0,
        payment.method_id?.name || '-',
        payment.payment_type || '-',
        payment.payment_status || '-',
        payment.notes || '-',
      ]),
    ];
    const csv = rows.map((row) => row.map((value: string | number) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `client-statement-${selectedSale.saleCode || selectedSale._id || 'sale'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadOfferLetter = () => {
    if (!selectedSale) return;
    
    // Try to get property name from properties query data
    const propertiesList = propertiesQuery.data?.data || [];
    const property = propertiesList.find((p: any) => p._id === selectedSale.property?._id);
    const propertyName = property?.name || selectedSale.property?.name || selectedSale.property?.propertyType || 'N/A';
    
    // Handle joint purchase customers
    let clientName = 'N/A';
    let clientEmail = '';
    let clientPhone = '';
    let clientIdNumber = '';
    let clientAddress = '';
    let clientAddressObject = null;
    let clientKraPin = '';
    let customers = [];
    
    if (selectedSale.isJointPurchase && selectedSale.customers?.length > 0) {
      customers = selectedSale.customers;
      clientName = customers.map((c: any) => c.name || c.customer_name || c.email).join(', ');
      clientEmail = customers.map((c: any) => c.email).filter(Boolean).join(', ');
      clientPhone = customers.map((c: any) => c.phone).filter(Boolean).join(', ');
      clientIdNumber = customers.map((c: any) => c.idNumber || c.id_number).filter(Boolean).join(', ');
      clientAddress = customers.map((c: any) => c.address).filter(Boolean).join(', ');
      clientAddressObject = customers[0]?.address || null;
      clientKraPin = customers[0]?.kra_pin || '';
    } else {
      const customer = selectedSale.customer || selectedSale.client;
      clientName = String(customer?.name || customer?.customer_name || customer?.email || 'N/A');
      clientEmail = String(customer?.email || '');
      clientPhone = String(customer?.phone || '');
      clientIdNumber = String(customer?.idNumber || customer?.id_number || '');
      clientAddress = String(customer?.address || '');
      clientAddressObject = customer?.address || null;
      clientKraPin = String(customer?.kra_pin || '');
    }
    
    // Get unit details
    const unit = selectedSale.unit || selectedSale.unitTypeID;
    const unitNumber = unit?.unitNumber || unit?.name || selectedSale.apartmentName || '';
    const unitType = unit?.unitType || unit?.type || '';
    const floor = unit?.floorId || selectedSale.floor || '';
    const block = unit?.blockId || selectedSale.block || '';
    
    const offerLetterData = {
      saleCode: String(selectedSale.saleCode || 'N/A'),
      clientName: String(clientName),
      clientEmail: String(clientEmail),
      clientPhone: String(clientPhone),
      clientIdNumber: String(clientIdNumber),
      clientAddress: String(clientAddress),
      clientAddressObject: clientAddressObject,
      clientKraPin: String(clientKraPin),
      propertyName: String(propertyName),
      propertyType: String(selectedSale.property?.propertyType || 'N/A'),
      unitName: String(unit?.name || 'N/A'),
      unitNumber: String(unitNumber),
      unitType: String(unitType),
      apartmentName: String(selectedSale.apartmentName || ''),
      floor: String(floor),
      block: String(block),
      salePrice: Number(selectedSale.salePrice || 0),
      initialPayment: Number(selectedSale.deposit?.amount || selectedSale.paymentPlans?.[0]?.initialDeposit || 0),
      paymentPlan: String(selectedSale.paymentPlanType || 'N/A'),
      saleDate: String(selectedSale.saleDate || ''),
      salesAgent: String(selectedSale.salesAgent?.fullname || selectedSale.salesAgent?.name || selectedSale.salesAgent?.email || 'N/A'),
      propertyManager: String(selectedSale.propertyManager?.fullname || selectedSale.propertyManager?.name || selectedSale.propertyManager?.email || 'N/A'),
      hidePaymentPlans: hidePaymentPlans,
      paymentPlans: selectedSale.paymentPlans || [],
      payments: selectedSale.payments || [],
      paymentTotals: selectedSale.paymentTotals || null,
      isJointPurchase: selectedSale.isJointPurchase || false,
      customers: customers,
      // Chestnut City specific fields
      propertyTitleNumber: String(selectedSale.property?.titleNumber || 'LR 111199 (Originally 4761/)'),
      location: String(selectedSale.property?.location || 'NANYUKI'),
      leaseTerm: String(selectedSale.property?.leaseTerm || 'Ninety-Nine (99) years less the last seven (7) days thereof'),
      managementCompany: String(selectedSale.property?.managementCompany || 'Chestnut City Management Company'),
      completionDate: String(selectedSale.property?.completionDate || ''),
      companyDetails: {
        name: String(selectedSale.property?.developer || 'CHESTNUT CITY LIMITED'),
        companyRegNo: String(selectedSale.property?.companyRegNo || 'PVT-RXU2E3RV'),
        poBox: String(selectedSale.property?.poBox || '45721-00100 Nairobi'),
        phone: String(selectedSale.property?.phone || ''),
        email: String(selectedSale.property?.email || ''),
        address: String(selectedSale.property?.address || ''),
      },
      bankDetails: {
        beneficiary: String('CHESTNUT CITY LIMITED'),
        accountName: String(selectedSale.property?.bankAccountName || ''),
        bankName: String(selectedSale.property?.bankName || ''),
        accountNumber: String(selectedSale.property?.accountNumber || ''),
        branchName: String(selectedSale.property?.branchName || ''),
      },
      lawyerDetails: {
        name: String(selectedSale.property?.lawyerName || 'Messrs. JASON & COMPANY ADVOCATES'),
        address: String(selectedSale.property?.lawyerAddress || '62 Lower Plains Road, P.O. Box 61850-00200 Nairobi'),
        accountName: String(selectedSale.property?.lawyerAccountName || 'JASON & COMPANY ADVOCATES'),
        bankName: String(selectedSale.property?.lawyerBankName || 'EQUITY BANK (KENYA) LIMITED'),
        accountNumber: String(selectedSale.property?.lawyerAccountNumber || '1470287315683'),
        branchName: String(selectedSale.property?.lawyerBranchName || 'KILIMANI SUPREME CENTRE'),
      },
      serviceCharge: Number(selectedSale.property?.serviceCharge || 0),
      serviceChargeDeposit: Number(selectedSale.property?.serviceChargeDeposit || 0),
    };

    generateOfferLetterPDF(offerLetterData);
  };

  const handlePreviewOfferLetter = async () => {
    if (!selectedSale) return;
    
    setPreviewLoading(true);
    setPreviewModalVisible(true);
    
    try {
      // Try to get property name from properties query data
      const propertiesList = propertiesQuery.data?.data || [];
      const property = propertiesList.find((p: any) => p._id === selectedSale.property?._id);
      const propertyName = property?.name || selectedSale.property?.name || selectedSale.property?.propertyType || 'N/A';
      
      // Handle joint purchase customers
      let clientName = 'N/A';
      let clientEmail = '';
      let clientPhone = '';
      let clientIdNumber = '';
      let clientAddress = '';
      let clientAddressObject = null;
      let clientKraPin = '';
      let customers = [];
      
      if (selectedSale.isJointPurchase && selectedSale.customers?.length > 0) {
        customers = selectedSale.customers;
        clientName = customers.map((c: any) => c.name || c.customer_name || c.email).join(', ');
        clientEmail = customers.map((c: any) => c.email).filter(Boolean).join(', ');
        clientPhone = customers.map((c: any) => c.phone).filter(Boolean).join(', ');
        clientIdNumber = customers.map((c: any) => c.idNumber || c.id_number).filter(Boolean).join(', ');
        clientAddress = customers.map((c: any) => c.address).filter(Boolean).join(', ');
        clientAddressObject = customers[0]?.address || null;
        clientKraPin = customers[0]?.kra_pin || '';
      } else {
        const customer = selectedSale.customer || selectedSale.client;
        clientName = String(customer?.name || customer?.customer_name || customer?.email || 'N/A');
        clientEmail = String(customer?.email || '');
        clientPhone = String(customer?.phone || '');
        clientIdNumber = String(customer?.idNumber || customer?.id_number || '');
        clientAddress = String(customer?.address || '');
        clientAddressObject = customer?.address || null;
        clientKraPin = String(customer?.kra_pin || '');
      }
      
      // Get unit details
      const unit = selectedSale.unit || selectedSale.unitTypeID;
      const unitNumber = unit?.unitNumber || unit?.name || selectedSale.apartmentName || '';
      const unitType = unit?.unitType || unit?.type || '';
      const floor = unit?.floorId?.name || unit?.floorId?.floorNumber || selectedSale.floor || '';
      const block = unit?.blockId?.name || selectedSale.block || '';
      
      const offerLetterData = {
        saleCode: String(selectedSale.saleCode || 'N/A'),
        clientName: String(clientName),
        clientEmail: String(clientEmail),
        clientPhone: String(clientPhone),
        clientIdNumber: String(clientIdNumber),
        clientAddress: String(clientAddress),
        clientAddressObject: clientAddressObject,
        clientKraPin: String(clientKraPin),
        propertyName: String(propertyName),
        propertyType: String(selectedSale.property?.propertyType || 'N/A'),
        unitName: String(unit?.name || 'N/A'),
        unitNumber: String(unitNumber),
        unitType: String(unitType),
        apartmentName: String(selectedSale.apartmentName || ''),
        floor: String(floor),
        block: String(block),
        listPrice: Number(selectedSale.list_price || selectedSale.listPrice || 0),
        discount: Number(selectedSale.discount || 0),
        salePrice: Number(selectedSale.salePrice || 0),
        initialPayment: Number(selectedSale.deposit?.amount || selectedSale.paymentPlans?.[0]?.initialDeposit || 0),
        paymentPlan: String(selectedSale.paymentPlanType || 'N/A'),
        saleDate: String(selectedSale.saleDate || ''),
        salesAgent: String(selectedSale.salesAgent?.fullname || selectedSale.salesAgent?.name || selectedSale.salesAgent?.email || 'N/A'),
        propertyManager: String(selectedSale.propertyManager?.fullname || selectedSale.propertyManager?.name || selectedSale.propertyManager?.email || 'N/A'),
        hidePaymentPlans: hidePaymentPlans,
        paymentPlans: selectedSale.paymentPlans || [],
        payments: selectedSale.payments || [],
        paymentTotals: selectedSale.paymentTotals || null,
        isJointPurchase: selectedSale.isJointPurchase || false,
        customers: customers,
        // Chestnut City specific fields
        propertyTitleNumber: String(selectedSale.property?.titleNumber || 'LR 111199 (Originally 4761/)'),
        location: String(selectedSale.property?.location || 'NANYUKI'),
        leaseTerm: String(selectedSale.property?.leaseTerm || 'Ninety-Nine (99) years less the last seven (7) days thereof'),
        managementCompany: String(selectedSale.property?.managementCompany || 'Chestnut City Management Company'),
        completionDate: String(selectedSale.property?.completionDate || ''),
        companyDetails: {
          name: String(selectedSale.property?.developer || 'CHESTNUT CITY LIMITED'),
          companyRegNo: String(selectedSale.property?.companyRegNo || 'PVT-RXU2E3RV'),
          poBox: String(selectedSale.property?.poBox || '45721-00100 Nairobi'),
          phone: String(selectedSale.property?.phone || ''),
          email: String(selectedSale.property?.email || ''),
          address: String(selectedSale.property?.address || ''),
        },
        bankDetails: {
          beneficiary: String('CHESTNUT CITY LIMITED'),
          accountName: String(selectedSale.property?.bankAccountName || ''),
          bankName: String(selectedSale.property?.bankName || ''),
          accountNumber: String(selectedSale.property?.accountNumber || ''),
          branchName: String(selectedSale.property?.branchName || ''),
        },
        lawyerDetails: {
          name: String(selectedSale.property?.lawyerName || 'Messrs. JASON & COMPANY ADVOCATES'),
          address: String(selectedSale.property?.lawyerAddress || '62 Lower Plains Road, P.O. Box 61850-00200 Nairobi'),
          accountName: String(selectedSale.property?.lawyerAccountName || 'JASON & COMPANY ADVOCATES'),
          bankName: String(selectedSale.property?.lawyerBankName || 'EQUITY BANK (KENYA) LIMITED'),
          accountNumber: String(selectedSale.property?.lawyerAccountNumber || '1470287315683'),
          branchName: String(selectedSale.property?.lawyerBranchName || 'KILIMANI SUPREME CENTRE'),
        },
        serviceCharge: Number(selectedSale.property?.serviceCharge || 0),
        serviceChargeDeposit: Number(selectedSale.property?.serviceChargeDeposit || 0),
      };

      const pdfUrl = await generateOfferLetterPDF(offerLetterData, true);
      setPreviewPdfUrl(pdfUrl || null);
    } catch (error) {
      console.error('Error generating preview:', error);
      message.error('Failed to generate preview');
      setPreviewModalVisible(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePreviewClientStatement = async () => {
    if (!selectedSale) return;
    
    setPreviewLoading(true);
    setPreviewModalVisible(true);
    
    try {
      // Handle joint purchase customers
      let clientName = 'N/A';
      let clientEmail = '';
      let clientPhone = '';
      let clientAddress = '';
      let clientAddressObject = null;
      
      if (selectedSale.isJointPurchase && selectedSale.customers?.length > 0) {
        const customers = selectedSale.customers;
        clientName = customers.map((c: any) => c.name || c.customer_name || c.email).join(', ');
        clientEmail = customers.map((c: any) => c.email).filter(Boolean).join(', ');
        clientPhone = customers.map((c: any) => c.phone).filter(Boolean).join(', ');
        clientAddress = customers.map((c: any) => c.address).filter(Boolean).join(', ');
        clientAddressObject = customers[0]?.address || null;
      } else {
        const customer = selectedSale.customer || selectedSale.client;
        clientName = String(customer?.name || customer?.customer_name || customer?.email || 'N/A');
        clientEmail = String(customer?.email || '');
        clientPhone = String(customer?.phone || '');
        clientAddress = String(customer?.address || '');
        clientAddressObject = customer?.address || null;
      }
      
      // Get unit details
      const unit = selectedSale.unit || selectedSale.unitTypeID;
      const unitNumber = unit?.unitNumber || unit?.name || selectedSale.apartmentName || '';
      const floor = unit?.floorId?.name || unit?.floorId?.floorNumber || selectedSale.floor || '';
      const block = unit?.blockId?.name || selectedSale.block || '';
      
      const clientStatementData = {
        saleCode: String(selectedSale.saleCode || 'N/A'),
        client: {
          name: String(clientName),
          email: String(clientEmail),
          phone: String(clientPhone),
          address: String(clientAddress),
          addressObject: clientAddressObject,
        },
        property: {
          name: String(selectedSale.property?.name || selectedSale.property?.propertyType || 'N/A'),
          propertyType: String(selectedSale.property?.propertyType || 'N/A'),
        },
        unit: {
          name: String(unit?.name || 'N/A'),
          unitNumber: String(unitNumber),
          apartmentName: String(selectedSale.apartmentName || ''),
          floor: String(floor),
          block: String(block),
        },
        list_price: Number(selectedSale.list_price || selectedSale.listPrice || 0),
        discount: Number(selectedSale.discount || 0),
        sale_price: Number(selectedSale.salePrice || 0),
        paymentTotals: selectedSale.paymentTotals || {
          totalPaid: 0,
          depositPaid: 0,
          outstandingBalance: 0,
          paymentPercentage: 0,
        },
        paymentPlans: selectedSale.paymentPlans || [],
        payments: selectedSale.payments || [],
        sale_date: String(selectedSale.saleDate || ''),
        status: String(selectedSale.status || 'reservation'),
      };

      const { generateClientStatementPDF } = await import('@utils/clientStatementPDF');
      const pdfUrl = await generateClientStatementPDF(clientStatementData, true);
      setPreviewPdfUrl(pdfUrl || null);
    } catch (error) {
      console.error('Error generating preview:', error);
      message.error('Failed to generate preview');
      setPreviewModalVisible(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditSale(null);
  };

  const handleModalSubmit = (values: any) => {
    if (editSale) {
      // Update existing sale
      updateMutation.mutate({ id: editSale._id, data: values });
    } else {
      // Create new sale
      createMutation.mutate(values);
    }
  };

  const downloadMenuItems = [
    {
      key: 'csv',
      label: (
        <span>
          <FileTextOutlined /> Download CSV
        </span>
      ),
      onClick: handleDownloadClientStatement,
    },
    {
      key: 'pdf',
      label: (
        <span>
          <FilePdfOutlined /> Download PDF
        </span>
      ),
      onClick: handleDownloadPDF,
    },
  ];

  downloadMenuItems.push({
    key: 'preview-offer-letter',
    label: (
      <span>
        <EyeOutlined /> Preview Offer Letter
      </span>
    ),
    onClick: handlePreviewOfferLetter,
  });
  downloadMenuItems.push({
    key: 'preview-client-statement',
    label: (
      <span>
        <EyeOutlined /> Preview Client Statement
      </span>
    ),
    onClick: handlePreviewClientStatement,
  });
  downloadMenuItems.push({
    key: 'offer-letter',
    label: (
      <span>
        <FileOutlined /> Download Offer Letter
      </span>
    ),
    onClick: handleDownloadOfferLetter,
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>Sales Management</Title>
            <Text type="secondary">Track property sales and commissions</Text>
          </Col>
          <Col>
            {activeTab === 'sales' && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddSale}
              >
                New Sale
              </Button>
            )}
          </Col>
        </Row>
      </div>

      {/* Main Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'sales',
            label: (
              <span>
                <DollarOutlined />
                Sales
              </span>
            ),
            children: (
              <>
                {/* Statistics Cards */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col xs={24} sm={6}>
                    <Card>
                      <Statistic
                        title="Total Sales"
                        value={stats.total}
                        prefix={<DollarOutlined />}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={6}>
                    <Card>
                      <Statistic
                        title="Total Value"
                        value={stats.totalValue}
                        prefix="KES"
                        precision={0}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={6}>
                    <Card>
                      <Statistic
                        title="Total Discount"
                        value={stats.totalDiscount}
                        prefix="-KES"
                        precision={0}
                        valueStyle={{ color: '#ff4d4f' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={6}>
                    <Card>
                      <Statistic
                        title="Pending"
                        value={stats.pending}
                        valueStyle={{ color: '#fa8c16' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={6}>
                    <Card>
                      <Statistic
                        title="Completed"
                        value={stats.completed}
                        valueStyle={{ color: '#722ed1' }}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Filters */}
                <Card style={{ marginBottom: 24 }}>
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={6}>
                      <Search
                        placeholder="Search sales..."
                        prefix={<SearchOutlined />}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        allowClear
                      />
                    </Col>
                    <Col xs={24} sm={4}>
                      <Select
                        placeholder="Filter by Status"
                        value={statusFilter}
                        onChange={setStatusFilter}
                        style={{ width: '100%' }}
                        allowClear
                      >
                        <Option value="pending">Pending</Option>
                        <Option value="deposit_paid">Deposit Paid</Option>
                        <Option value="active">Active</Option>
                        <Option value="completed">Completed</Option>
                        <Option value="cancelled">Cancelled</Option>
                      </Select>
                    </Col>
                    <Col xs={24} sm={4}>
                      <Select
                        placeholder="Filter by Property"
                        value={propertyFilter}
                        onChange={setPropertyFilter}
                        style={{ width: '100%' }}
                        allowClear
                      >
                        {properties && properties.length > 0 && properties.map((property) => (
                          <Option key={property._id} value={property._id}>
                            {property.name}
                          </Option>
                        ))}
                      </Select>
                    </Col>
                    <Col xs={24} sm={6}>
                      <RangePicker
                        placeholder={['Start Date', 'End Date']}
                        value={dateRange}
                        onChange={setDateRange}
                        style={{ width: '100%' }}
                      />
                    </Col>
                    <Col xs={24} sm={4}>
                      <Button
                        icon={<FilterOutlined />}
                        onClick={() => {
                          setSearchTerm('');
                          setStatusFilter('');
                          setPropertyFilter('');
                          setDateRange(null);
                        }}
                      >
                        Clear
                      </Button>
                    </Col>
                  </Row>
                </Card>

                {/* Sales Table */}
                <Card
                  extra={
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => refetch()}
                      loading={isFetching}
                    >
                      Refresh
                    </Button>
                  }
                >
                  <Table
                    columns={columns}
                    dataSource={filteredSales}
                    rowKey="_id"
                    loading={isLoading || isFetching}
                    pagination={{
                      total: filteredSales.length,
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) =>
                        `${range[0]}-${range[1]} of ${total} sales`,
                    }}
                  />
                </Card>
              </>
            ),
          },
          {
            key: 'payments',
            label: (
              <span>
                <AccountBookOutlined />
                Sales Payments
              </span>
            ),
            children: <SalesPaymentsTab salesData={sales} propertiesData={propertiesQuery.data?.data || properties || []} />,
          },
        ]}
      />

      {/* Add/Edit Sale Modal */}
      <AddEditSaleModal
        visible={modalVisible}
        onCancel={handleModalCancel}
        onSubmit={handleModalSubmit}
        edit={!!editSale}
        initialData={editSale}
        properties={propertiesQuery.data?.data || []}
        propertiesLoading={propertiesQuery.isLoading || propertiesQuery.isFetching}
      />

      {/* PDF Preview Modal */}
      <Modal
        title="Offer Letter Preview"
        open={previewModalVisible}
        onCancel={() => {
          setPreviewModalVisible(false);
          setPreviewPdfUrl(null);
        }}
        width="80%"
        style={{ top: 20 }}
        footer={[
          <div key="footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Checkbox
              checked={hidePaymentPlans}
              onChange={(e) => setHidePaymentPlans(e.target.checked)}
            >
              Hide Payment Plans
            </Checkbox>
            <div>
              <Button key="close" onClick={() => {
                setPreviewModalVisible(false);
                setPreviewPdfUrl(null);
              }} style={{ marginRight: 8 }}>
                Close
              </Button>
              <Button
                key="download"
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownloadOfferLetter}
              >
                Download PDF
              </Button>
            </div>
          </div>,
        ]}
      >
        {previewLoading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Generating preview...</div>
          </div>
        ) : previewPdfUrl ? (
          <iframe
            src={previewPdfUrl}
            style={{ width: '100%', height: '70vh', border: 'none' }}
            title="Offer Letter Preview"
          />
        ) : (
          <Empty description="Failed to load preview" />
        )}
      </Modal>

      <Drawer
        title={`Sale Details${selectedSale?.saleCode ? ` - ${selectedSale.saleCode}` : ''}`}
        open={drawerVisible}
        onClose={handleDrawerClose}
        width={760}
        extra={
          <Dropdown
            menu={{
              items: downloadMenuItems,
            }}
            disabled={!selectedSale}
          >
            <Button type="primary" icon={<DownloadOutlined />} disabled={!selectedSale}>
              Download
            </Button>
          </Dropdown>
        }
      >
        {selectedSale && (
          <Tabs
            defaultActiveKey="overview"
            items={[
              {
                key: 'overview',
                label: 'Sale Details',
                children: (
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title="List Price"
                            value={selectedSale.list_price || selectedSale.listPrice || 0}
                            prefix="KES"
                            precision={0}
                          />
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title="Discount"
                            value={selectedSale.discount || 0}
                            prefix="-KES"
                            precision={0}
                            valueStyle={{ color: '#ff4d4f' }}
                          />
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title="Sale Price"
                            value={selectedSale.sale_price || selectedSale.salePrice || 0}
                            prefix="KES"
                            precision={0}
                            valueStyle={{ color: '#52c41a' }}
                          />
                        </Card>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Card>
                          <Statistic
                            title="Status"
                            value={selectedSale.status?.replace('_', ' ').toUpperCase() || '-'}
                            valueStyle={{ color: '#1890ff' }}
                          />
                        </Card>
                      </Col>
                      <Col span={12}>
                        <Card>
                          <Statistic
                            title="Payment Progress"
                            value={selectedSale.paymentTotals?.paymentPercentage ?? 0}
                            suffix="%"
                            precision={1}
                            valueStyle={{ color: '#1890ff' }}
                          />
                        </Card>
                      </Col>
                    </Row>

                    <Descriptions bordered column={1}>
                      <Descriptions.Item label="Sale Code">{selectedSale.saleCode || selectedSale._id || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Sale Date">
                        {selectedSale.sale_date ? dayjs(selectedSale.sale_date).format('DD MMM YYYY HH:mm') : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Payment Plan">
                        <Tag color="blue">{selectedSale.payment_plan?.toUpperCase() || '-'}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Payment Stage">
                        <Tag color={selectedSale.status === 'completed' ? 'green' : selectedSale.status === 'processing' ? 'blue' : 'orange'}>
                          {selectedSale.status?.replace('_', ' ').toUpperCase() || '-'}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Payment Progress">
                        KES {(selectedSale.paymentTotals?.totalPaid || 0).toLocaleString()} paid of KES {(selectedSale.sale_price || 0).toLocaleString()}
                        {' '}({selectedSale.paymentTotals?.paymentPercentage ?? 0}%)
                      </Descriptions.Item>
                      <Descriptions.Item label="Outstanding Balance">
                        KES {(selectedSale.paymentTotals?.outstandingBalance ?? selectedSale.sale_price ?? 0).toLocaleString()}
                      </Descriptions.Item>
                      <Descriptions.Item label="Deposit Paid">
                        KES {(selectedSale.paymentTotals?.depositPaid || selectedSale.deposit?.amount || 0).toLocaleString()}
                      </Descriptions.Item>
                      <Descriptions.Item label="Initial Payment Type">
                        {selectedSale.initialPaymentType?.replace('_', ' ').toUpperCase() || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Commission">
                        KES {(selectedSale.commission_amount || 0).toLocaleString()} ({selectedSale.commission_rate || 0}%)
                      </Descriptions.Item>
                      <Descriptions.Item label="Purchase Type">
                        {selectedSale.isJointPurchase ? (
                          <Tag color="purple">Joint Purchase ({selectedSale.customers?.length || 0} customers)</Tag>
                        ) : (
                          <Tag color="blue">Single Customer</Tag>
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="Client(s)">
                        {selectedSale.isJointPurchase && selectedSale.customers?.length > 0 ? (
                          <div>
                            {selectedSale.customers.map((customer: any, index: number) => (
                              <div key={customer._id || index} style={{ marginBottom: 4 }}>
                                <Text strong>{index + 1}.</Text> {customer.name || customer.customer_name || customer.email || '-'}
                                {customer.entity_type && (
                                  <Tag size="small" style={{ marginLeft: 8 }}>
                                    {customer.entity_type === 'company' ? 'Company' : 'Individual'}
                                  </Tag>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Text>
                            {selectedSale.customer?.name || selectedSale.client?.name || selectedSale.customer?.customer_name || selectedSale.client?.customer_name || selectedSale.customer?.email || selectedSale.client?.email || '-'}
                          </Text>
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="Sales Agent">
                        {selectedSale.salesAgent?.name || selectedSale.salesAgent?.fullname || selectedSale.salesAgent?.email || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Property Manager">
                        {selectedSale.propertyManager?.name || selectedSale.propertyManager?.fullname || selectedSale.propertyManager?.email || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Property">
                        {selectedSale.property?.name || selectedSale.property?.propertyType || selectedSale.property_id || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Unit / Apartment">
                        {selectedSale.apartmentName || selectedSale.unit?.name || selectedSale.unit_id || '-'}
                      </Descriptions.Item>
                    </Descriptions>
                  </Space>
                ),
              },
              {
                key: 'installments',
                label: 'Payment Plans & Stage',
                children: (
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Card>
                          <Statistic title="Total Paid" value={selectedSale.paymentTotals?.totalPaid || 0} prefix="KES" precision={0} />
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card>
                          <Statistic title="Deposit Paid" value={selectedSale.paymentTotals?.depositPaid || selectedSale.deposit?.amount || 0} prefix="KES" precision={0} />
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card>
                          <Statistic title="Outstanding" value={selectedSale.paymentTotals?.outstandingBalance ?? selectedSale.sale_price ?? 0} prefix="KES" precision={0} />
                        </Card>
                      </Col>
                    </Row>

                    {selectedSale.paymentPlans?.length ? (
                      selectedSale.paymentPlans.map((plan: any, index: number) => (
                        (() => {
                          const planPayments = plan.payments || selectedSale.payments?.filter((payment: any) => payment.paymentPlan === plan._id) || [];
                          const planPaid = planPayments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
                          const planBalance = Math.max((plan.totalAmount || 0) - planPaid, 0);
                          const paymentStatus = planBalance <= 0 ? 'PAID' : planPaid > 0 ? 'PARTIAL' : 'PENDING';
                          return (
                            <Card
                              key={plan._id || index}
                              title={`Payment Plan ${index + 1}`}
                              extra={
                                <Space>
                                  <Tag color={plan.status === 'active' ? 'green' : 'default'}>{plan.status?.toUpperCase() || '-'}</Tag>
                                  <Tag color={paymentStatus === 'PAID' ? 'green' : paymentStatus === 'PARTIAL' ? 'blue' : 'orange'}>
                                    {paymentStatus}
                                  </Tag>
                                </Space>
                              }
                            >
                              <Row gutter={16} style={{ marginBottom: 16 }}>
                                <Col span={8}>
                                  <Statistic title="Plan Paid" value={planPaid} prefix="KES" precision={0} />
                                </Col>
                                <Col span={8}>
                                  <Statistic title="Plan Balance" value={planBalance} prefix="KES" precision={0} />
                                </Col>
                                <Col span={8}>
                                  <Statistic title="Payments" value={planPayments.length} />
                                </Col>
                              </Row>
                              <Descriptions bordered column={1} size="small">
                                <Descriptions.Item label="Payment Status">
                                  <Tag color={paymentStatus === 'PAID' ? 'green' : paymentStatus === 'PARTIAL' ? 'blue' : 'orange'}>
                                    {paymentStatus}
                                  </Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Plan Status">
                                  <Tag color={plan.status === 'active' ? 'green' : 'default'}>{plan.status?.toUpperCase() || '-'}</Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Total Amount">KES {(plan.totalAmount || 0).toLocaleString()}</Descriptions.Item>
                                <Descriptions.Item label="Initial Deposit">KES {(plan.initialDeposit || 0).toLocaleString()}</Descriptions.Item>
                                <Descriptions.Item label="Outstanding Balance">KES {(plan.outstandingBalance || 0).toLocaleString()}</Descriptions.Item>
                                <Descriptions.Item label="Installment Amount">KES {(plan.installmentAmount || 0).toLocaleString()}</Descriptions.Item>
                                <Descriptions.Item label="Installment Frequency">{plan.installmentFrequency || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Number of Installments">{plan.numberOfInstallments || 0}</Descriptions.Item>
                                <Descriptions.Item label="Payment Method">{plan.paymentMethod?.replace('_', ' ').toUpperCase() || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Start Date">{plan.startDate ? dayjs(plan.startDate).format('DD MMM YYYY') : '-'}</Descriptions.Item>
                                <Descriptions.Item label="End Date">{plan.endDate ? dayjs(plan.endDate).format('DD MMM YYYY') : '-'}</Descriptions.Item>
                              </Descriptions>
                              {planPayments.length > 0 && (
                                <Table
                                  style={{ marginTop: 16 }}
                                  rowKey={(record: any, paymentIndex) => record._id || paymentIndex}
                                  pagination={false}
                                  dataSource={planPayments}
                                  columns={[
                                    {
                                      title: 'Payment Date',
                                      key: 'payment_date',
                                      render: (record: any) => record.payment_date ? dayjs(record.payment_date).format('DD MMM YYYY') : '-',
                                    },
                                    {
                                      title: 'Amount',
                                      dataIndex: 'amount',
                                      key: 'amount',
                                      render: (amount: number) => `KES ${(amount || 0).toLocaleString()}`,
                                    },
                                    {
                                      title: 'Method',
                                      key: 'method',
                                      render: (record: any) => record.method_id?.name?.replace('_', ' ').toUpperCase() || '-',
                                    },
                                    {
                                      title: 'Status',
                                      dataIndex: 'payment_status',
                                      key: 'payment_status',
                                      render: (status: string) => (
                                        <Tag color={status === 'COMPLETED' ? 'green' : 'orange'}>{status || '-'}</Tag>
                                      ),
                                    },
                                  ]}
                                />
                              )}
                            </Card>
                          );
                        })()
                      ))
                    ) : (
                      <Empty description="No payment plans found" />
                    )}

                    <Card title="Payments">
                      {selectedSale.payments?.length ? (
                        <Table
                          rowKey={(record: any, index) => record._id || index}
                          pagination={false}
                          dataSource={selectedSale.payments}
                          columns={[
                            {
                              title: 'Date',
                              key: 'payment_date',
                              render: (record: any) => record.payment_date ? dayjs(record.payment_date).format('DD MMM YYYY') : '-',
                            },
                            {
                              title: 'Amount',
                              dataIndex: 'amount',
                              key: 'amount',
                              render: (amount: number) => `KES ${(amount || 0).toLocaleString()}`,
                            },
                            {
                              title: 'Method',
                              key: 'method',
                              render: (record: any) => record.method_id?.name?.replace('_', ' ').toUpperCase() || '-',
                            },
                            {
                              title: 'Type',
                              dataIndex: 'payment_type',
                              key: 'payment_type',
                              render: (type: string) => type?.replace('_', ' ') || '-',
                            },
                            {
                              title: 'Status',
                              dataIndex: 'payment_status',
                              key: 'payment_status',
                              render: (status: string) => (
                                <Tag color={status === 'COMPLETED' ? 'green' : 'orange'}>{status || '-'}</Tag>
                              ),
                            },
                          ]}
                        />
                      ) : (
                        <Empty description="No payments found" />
                      )}
                    </Card>
                  </Space>
                ),
              },
              {
                key: 'documents',
                label: 'Property Documents',
                children: (
                  <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                    <SectionTitle label="Upload Document" />
                    <Form
                      form={documentForm}
                      layout="vertical"
                      onFinish={handleDocumentUpload}
                      style={{ marginBottom: 20 }}
                      onFinishFailed={(errorInfo) => console.log('Form validation failed:', errorInfo)}
                    >
                      <Form.Item
                        name="document_type"
                        label="Document Type"
                        rules={[{ required: true, message: "Please select document type" }]}
                      >
                        <Select placeholder="Select document type">
                          {PROPERTY_DOCUMENT_TYPES.map(type => (
                            <Option key={type.value} value={type.value}>{type.label}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                      <Form.Item
                        name="name"
                        label="Document Name"
                        rules={[{ required: true, message: "Please enter document name" }]}
                      >
                        <Input placeholder="Enter document name" />
                      </Form.Item>
                      <Form.Item name="description" label="Description">
                        <TextArea rows={3} placeholder="Enter description (optional)" />
                      </Form.Item>
                      <Form.Item label="Files">
                        <Upload
                          fileList={fileList}
                          onChange={({ fileList }) => setFileList(fileList)}
                          beforeUpload={() => false}
                          multiple
                        >
                          <Button icon={<UploadOutlined />}>Select Files</Button>
                        </Upload>
                      </Form.Item>
                      <Form.Item>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={uploadLoading}
                          icon={<UploadOutlined />}
                          style={{ background: C.primary, borderColor: C.primary }}
                        >
                          Upload Document
                        </Button>
                      </Form.Item>
                    </Form>

                    <SectionTitle label="Documents" />
                    {documentsLoading ? (
                      <div style={{ textAlign: "center", padding: 20 }}>Loading...</div>
                    ) : documents.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 20, color: C.subText }}>No documents uploaded</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {documents.map(doc => (
                          <div key={doc._id} style={{
                            display: "flex", flexDirection: "column", gap: 8,
                            padding: "12px", border: `1px solid ${C.border}`,
                            borderRadius: 8, background: C.bg
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <FileOutlined style={{ color: C.primary, fontSize: 18 }} />
                              <div style={{ flex: 1 }}>
                                <Text strong style={{ fontSize: 12, display: "block" }}>
                                  {doc.name}
                                </Text>
                                {doc.description && (
                                  <Text style={{ fontSize: 11, color: C.subText }}>{doc.description}</Text>
                                )}
                                <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>
                                  {doc.attachments?.length || 0} file(s) · {new Date(doc.created_at).toLocaleDateString("en-GB")}
                                </Text>
                              </div>
                              <Button
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={() => handleDeleteDocument(doc._id)}
                              >
                                Delete
                              </Button>
                            </div>
                            {doc.attachments && doc.attachments.length > 0 && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 28 }}>
                                {doc.attachments.map((attachment: any) => (
                                  <div key={attachment._id} style={{
                                    display: "flex", alignItems: "center", gap: 8,
                                    padding: "6px 10px", background: "#fff",
                                    borderRadius: 6, border: `1px solid ${C.border}`
                                  }}>
                                    <FileOutlined style={{ color: C.subText, fontSize: 14 }} />
                                    <Text style={{ fontSize: 11, flex: 1, color: C.darkText }}>
                                      {attachment.file_name}
                                    </Text>
                                    <Button
                                      size="small"
                                      type="link"
                                      icon={<EyeOutlined />}
                                      onClick={() => window.open(attachment.file_url, '_blank')}
                                      style={{ padding: "0 4px", fontSize: 11 }}
                                    >
                                      View
                                    </Button>
                                    <Button
                                      size="small"
                                      type="link"
                                      icon={<DownloadOutlined />}
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = attachment.file_url;
                                        link.download = attachment.file_name;
                                        link.click();
                                      }}
                                      style={{ padding: "0 4px", fontSize: 11 }}
                                    >
                                      Download
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Drawer>
    </div>
  );
};

export default SalesManagement;
