import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Button, Form, Space, Upload, message, Card, Divider, Tag, Alert, Steps } from "antd";
import {
  ModalForm,
  ProFormText,
  ProForm,
  ProFormTextArea,
  ProFormDigit,
  ProFormSelect,
  ProFormMoney,
  ProFormGroup,
} from "@ant-design/pro-form";
import {
  EditOutlined,
  ReconciliationOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  ToolOutlined,
  SwapOutlined,
  InfoCircleOutlined,
  DollarOutlined,
  UserOutlined,
  SettingOutlined,
  PictureOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
// Keeping the swapped imports as per your correct flow
import { fetchSubCategories as fetchAllCategories, fetchAllCategories as fetchSubCategories } from "@services/categories";
import { fetchAllSuppliers } from "@services/supplier";
import { useQuery } from "@tanstack/react-query";
import { fetchAllUnits } from "@services/products";
import ShowConfirm from "@utils/ConfirmUtil";
import { addNewInventory, editInventory } from "@services/inventory";
import { RcFile } from "antd/lib/upload";
import { UploadFile, UploadProps } from "antd/lib";
import { ProCard } from "@ant-design/pro-components";

interface inventory {
  name: string;
  quantity: number;
  supplier_price: number;
  price: number;
  min_viable_quantity: number;
  category: string;
  subcategory_id: string;
  supplier_id: string;
  unit_id: string;
  desc: string;
  usage_type: 'selling' | 'internal' | 'both';
  barcode?: string;
  location?: string;
  manufacturer?: string;
  status: 'active' | 'inactive' | 'discontinued';
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  weight?: {
    value: number;
    unit: string;
  };
}

interface AddInventoryDialogProps {
  data?: any;
  actionRef?: any;
  edit?: boolean;
}

interface unitType {
  name: string;
  _id: string;
}

interface CategoryType {
  name: string;
  _id: string;
  sub_category?: string;
}

interface SubCategoryType {
  name: string;
  _id: string;
  sub_category: string | { _id: string; name: string };
  category: string | { _id: string; name: string };
  main_category: string | { _id: string; name: string };
}

const { Step } = Steps;

const AddEditProInventoryModal: React.FC<AddInventoryDialogProps> = ({
  data,
  actionRef,
  edit,
}) => {
  const [form] = Form.useForm();

  // UI State
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Category and Subcategory State - REMOVED filteredSubCategories
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // File Upload State
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Form Data State
  const [usageType, setUsageType] = useState<string>('internal');
  const [stepData, setStepData] = useState<{ [key: number]: any }>({
    0: {},
    1: {},
    2: {},
    3: {},
    4: {}
  });

  // Step Configuration
  const steps = useMemo(() => [
    {
      title: 'Basic Info',
      icon: <InfoCircleOutlined />,
      description: 'Product details'
    },
    {
      title: 'Inventory',
      icon: <DollarOutlined />,
      description: 'Stock & pricing'
    },
    {
      title: 'Supplier',
      icon: <UserOutlined />,
      description: 'Supplier details'
    },
    {
      title: 'Advanced',
      icon: <SettingOutlined />,
      description: 'Optional settings'
    },
    {
      title: 'Image',
      icon: <PictureOutlined />,
      description: 'Product image'
    }
  ], []);

  // Data Fetching Hooks
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchAllCategories({}),
    retry: 3,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const { data: allSubCategories } = useQuery({
    queryKey: ["subCategories"],
    queryFn: () => fetchSubCategories({}),
    retry: 3,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const { data: units } = useQuery({
    queryKey: ["units"],
    queryFn: fetchAllUnits,
    retry: 3,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: fetchAllSuppliers,
    retry: 3,
    refetchInterval: 5000,
    networkMode: "always",
  });

  // SIMPLIFIED: Category Selection Handler
  const handleCategoryChange = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);

    // Clear subcategory selection when category changes
    form.setFieldValue('subcategory_id', undefined);

    // Optional: Keep this for debugging
    if (allSubCategories && categoryId) {
      const filtered = allSubCategories.filter((subCat: SubCategoryType) => {
        if (typeof subCat.sub_category === 'string') {
          return subCat.sub_category === categoryId;
        } else if (typeof subCat.sub_category === 'object' && subCat.sub_category?._id) {
          return subCat.sub_category._id === categoryId;
        }
        return false;
      });

      console.log('Selected Category ID:', categoryId);
      console.log('Filtered SubCategories:', filtered);
    }
  }, [allSubCategories, form]);

  // Request Functions for Selects
  const CategoriesRequest = useCallback(async () => {
    return categories?.map((category: CategoryType) => ({
      label: category.name,
      value: category._id,
    })) || [];
  }, [categories]);

  // FIXED: SubCategoriesRequest - filters directly without relying on state
  const SubCategoriesRequest = useCallback(async () => {
    console.log('Selected Category:', selectedCategory);

    if (selectedCategory && allSubCategories) {
      // Filter subcategories directly here instead of relying on state
      const filtered = allSubCategories.filter((subCat: SubCategoryType) => {
        // Handle different possible data structures for the sub_category field
        if (typeof subCat.sub_category === 'string') {
          return subCat.sub_category === selectedCategory;
        } else if (typeof subCat.sub_category === 'object' && subCat.sub_category?._id) {
          return subCat.sub_category._id === selectedCategory;
        }
        return false;
      });

      console.log('Filtered SubCategories in Request:', filtered);

      return filtered.map((subCat: SubCategoryType) => ({
        label: subCat.name,
        value: subCat._id,
      }));
    }
    return [];
  }, [selectedCategory, allSubCategories]);

  const UnitsRequest = useCallback(async () => {
    return units?.map((unit: unitType) => ({
      label: unit.name,
      value: unit._id,
    })) || [];
  }, [units]);

  const SuppliersRequest = useCallback(async () => {
    return suppliers?.map((supplier: { name: string; _id: string }) => ({
      label: supplier.name,
      value: supplier._id,
    })) || [];
  }, [suppliers]);

  // Data Management Functions
  const saveCurrentStepData = useCallback(() => {
    try {
      const currentValues = form.getFieldsValue();
      setStepData(prev => {
        const updatedStepData = { ...prev };

        switch (currentStep) {
          case 0:
            updatedStepData[0] = {
              name: currentValues.name,
              usage_type: currentValues.usage_type,
              category: currentValues.category,
              subcategory_id: currentValues.subcategory_id,
              unit_id: currentValues.unit_id,
              desc: currentValues.desc,
            };
            break;
          case 1:
            updatedStepData[1] = {
              quantity: currentValues.quantity,
              min_viable_quantity: currentValues.min_viable_quantity,
              supplier_price: currentValues.supplier_price,
              price: currentValues.price,
            };
            break;
          case 2:
            updatedStepData[2] = {
              supplier_id: currentValues.supplier_id,
              manufacturer: currentValues.manufacturer,
              barcode: currentValues.barcode,
              location: currentValues.location,
            };
            break;
          case 3:
            updatedStepData[3] = {
              status: currentValues.status,
              dimensions: currentValues.dimensions,
              weight: currentValues.weight,
            };
            break;
          case 4:
            updatedStepData[4] = {
              image: uploadedFile,
            };
            break;
        }

        return updatedStepData;
      });
    } catch (error) {
      console.error('Error saving step data:', error);
    }
  }, [form, currentStep, uploadedFile]);

  const getAllFormData = useCallback(() => {
    const allData = {
      ...stepData[0],
      ...stepData[1],
      ...stepData[2],
      ...stepData[3],
      ...stepData[4],
    };

    // Remove undefined values
    Object.keys(allData).forEach(key => {
      if (allData[key] === undefined) {
        delete allData[key];
      }
    });

    return allData;
  }, [stepData]);

  // Form Submission
  const handleFormSubmit = async (values: any) => {
    try {
      saveCurrentStepData();
      const allStepData = getAllFormData();
      const finalValues = { ...allStepData, ...values };

      await form.validateFields();

      const confirmed = await ShowConfirm({
        title: `Are you sure you want to ${edit ? "update this" : "add new"} Inventory?`,
        position: true,
      });

      if (confirmed) {
        const transformedValues = {
          ...finalValues,
          category: finalValues.category?.value || finalValues.category,
          subcategory_id: finalValues.subcategory_id?.value || finalValues.subcategory_id,
          unit_id: finalValues.unit_id?.value || finalValues.unit_id,
          supplier_id: finalValues.supplier_id?.value || finalValues.supplier_id,
          quantity: Number(finalValues.quantity) || 0,
          supplier_price: finalValues.supplier_price ? Number(finalValues.supplier_price) : undefined,
          price: finalValues.price ? Number(finalValues.price) : undefined,
          min_viable_quantity: finalValues.min_viable_quantity ? Number(finalValues.min_viable_quantity) : undefined,
        };

        // Clean up undefined values
        Object.keys(transformedValues).forEach(key => {
          if (transformedValues[key] === undefined || transformedValues[key] === '') {
            delete transformedValues[key];
          }
        });

        if (uploadedFile) {
          transformedValues.imageFile = uploadedFile;
        }

        edit
          ? await editInventory({ values: transformedValues, _id: data?._id })
          : await addNewInventory(transformedValues);

        actionRef?.current?.reload();
        setOpen(false);
        message.success(`Inventory ${edit ? 'updated' : 'added'} successfully`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Form validation error:', error);
      message.error("Please fill in all required fields");
      return false;
    }
  };

  // Modal and Step Management
  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset all state
      form.resetFields();
      setFileList([]);
      setPreviewImage(null);
      setUploadedFile(null);
      setUsageType('internal');
      setCurrentStep(0);
      setSelectedCategory(null);
      setStepData({
        0: {},
        1: {},
        2: {},
        3: {},
        4: {}
      });
    }
  }, [form]);

  const nextStep = useCallback(async () => {
    try {
      saveCurrentStepData();

      const fieldsToValidate = getFieldsForStep(currentStep);
      if (fieldsToValidate.length > 0) {
        await form.validateFields(fieldsToValidate);
      }

      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
    } catch (error) {
      console.error('Step validation failed:', error);
      message.error('Please fill in all required fields for this step');
    }
  }, [saveCurrentStepData, currentStep, form, steps.length]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      saveCurrentStepData();
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep, saveCurrentStepData]);

  // Validation Functions
  const getFieldsForStep = useCallback((stepIndex: number) => {
    switch (stepIndex) {
      case 0:
        return ['name', 'category', 'subcategory_id', 'unit_id', 'usage_type'];
      case 1:
        const fields = ['quantity'];
        if (usageType === 'selling' || usageType === 'both') {
          fields.push('price');
        }
        return fields;
      case 2:
      case 3:
      case 4:
      default:
        return [];
    }
  }, [usageType]);

  const isStepValid = useCallback((stepIndex: number) => {
    try {
      const allData = getAllFormData();

      const getSelectValue = (fieldValue: any) => {
        if (fieldValue && typeof fieldValue === 'object' && fieldValue.value) {
          return fieldValue.value;
        }
        return fieldValue;
      };

      const actualCategoryId = getSelectValue(allData.category);
      const actualSubcategoryId = getSelectValue(allData.subcategory_id);
      const actualUnitId = getSelectValue(allData.unit_id);
      const actualProductName = allData.name;
      const actualQuantity = allData.quantity;
      const actualSellingPrice = allData.price;
      const currentUsageType = allData.usage_type || usageType;
      const priceRequired = currentUsageType === 'selling' || currentUsageType === 'both';

      switch (stepIndex) {
        case 0:
          return !!(
            actualProductName &&
            actualProductName.trim() !== '' &&
            actualCategoryId &&
            actualSubcategoryId &&
            actualUnitId &&
            currentUsageType
          );

        case 1:
          return !!(
            actualQuantity !== undefined &&
            actualQuantity !== null &&
            actualQuantity >= 0 &&
            (!priceRequired || (actualSellingPrice !== undefined && actualSellingPrice !== null && actualSellingPrice > 0))
          );

        case 2:
        case 3:
        case 4:
          return true;

        default:
          return false;
      }
    } catch (error) {
      console.error('Step validation error:', error);
      return false;
    }
  }, [getAllFormData, usageType]);

  const canProceedToNext = useCallback(() => {
    return isStepValid(currentStep);
  }, [isStepValid, currentStep]);

  const canSubmit = useCallback(() => {
    try {
      const allData = getAllFormData();

      const hasName = allData.name && allData.name.trim() !== '';
      const hasCategory = allData.category && (allData.category.value || allData.category);
      const hasSubcategory = allData.subcategory_id && (allData.subcategory_id.value || allData.subcategory_id);
      const hasUnit = allData.unit_id && (allData.unit_id.value || allData.unit_id);
      const hasUsageType = allData.usage_type;
      const hasQuantity = allData.quantity !== undefined && allData.quantity !== null && allData.quantity >= 0;

      const currentUsageType = allData.usage_type || usageType;
      const priceRequired = currentUsageType === 'selling' || currentUsageType === 'both';
      const hasValidPrice = !priceRequired || (allData.price !== undefined && allData.price !== null && allData.price > 0);

      return hasName && hasCategory && hasSubcategory && hasUnit && hasUsageType && hasQuantity && hasValidPrice;
    } catch (error) {
      console.error('canSubmit error:', error);
      return false;
    }
  }, [getAllFormData, usageType]);

  // Form Field Change Handler
  const handleFieldChange = useCallback(() => {
    // Use a simple timeout to avoid infinite loops
    const timeoutId = setTimeout(() => {
      saveCurrentStepData();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [saveCurrentStepData]);

  // Calculate Profit Margin
  const calculateProfitMargin = useCallback(() => {
    const values = form.getFieldsValue();
    const supplierPrice = values.supplier_price;
    const sellingPrice = values.price;

    if (supplierPrice > 0 && sellingPrice > 0) {
      const margin = ((sellingPrice - supplierPrice) / sellingPrice * 100).toFixed(1);
      return `${margin}%`;
    }
    return 'N/A';
  }, [form]);

  // Initialize Form Data for Edit Mode
  useEffect(() => {
    console.log('Initializing form data for edit mode:', open, edit, data);
    if (open && edit && data) {
      const formValues = {
        ...data,
        category: data?.subcategory_id?._id ? {
          value: data.subcategory_id._id,
          label: data.subcategory_id.name,
        } : data?.subcategory_id,
        subcategory_id: data?.category?._id ? {
          value: data.category_id._id,
          label: data.category_id.name,
        } : data?.category,
        unit_id: data?.unit_id?._id ? {
          value: data.unit_id._id,
          label: data.unit_id.name,
        } : data?.unit_id,
        supplier_id: data?.supplier_id?._id ? {
          value: data.supplier_id._id,
          label: data.supplier_id.name,
        } : data?.supplier_id,
        usage_type: data?.usage_type || 'internal',
        status: data?.status || 'active',
      };

      form.setFieldsValue(formValues);
      setUsageType(data?.usage_type || 'internal');

      // Set category for filtering subcategories in edit mode
      if (data?.category?._id) {
        setSelectedCategory(data.category_id._id);
      }

      // Initialize step data with edit values
      setStepData({
        0: {
          name: formValues.name,
          usage_type: formValues.usage_type,
          category: formValues.category,
          subcategory_id: formValues.subcategory_id,
          unit_id: formValues.unit_id,
          desc: formValues.desc,
        },
        1: {
          quantity: formValues.quantity,
          min_viable_quantity: formValues.min_viable_quantity,
          supplier_price: formValues.supplier_price,
          price: formValues.price,
        },
        2: {
          supplier_id: formValues.supplier_id,
          manufacturer: formValues.manufacturer,
          barcode: formValues.barcode,
          location: formValues.location,
        },
        3: {
          status: formValues.status,
          dimensions: formValues.dimensions,
          weight: formValues.weight,
        },
        4: {}
      });

      if (data?.thumbnail) {
        setPreviewImage(data.thumbnail);
        setFileList([
          {
            uid: '-1',
            name: 'image.png',
            status: 'done',
            url: data.thumbnail,
          },
        ]);
      }
    } else if (open && !edit) {
      const defaultValues = {
        usage_type: 'internal',
      };
      form.setFieldsValue(defaultValues);
      setUsageType('internal');
      setStepData({
        0: { usage_type: 'internal' },
        1: {},
        2: {},
        3: {},
        4: {}
      });
    }
  }, [open, data, form, edit]);

  // Usage Type Options
  const UsageTypeOptions = useMemo(() => [
    {
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ToolOutlined />
          <span>Internal Use</span>
          <Tag color="orange">INTERNAL</Tag>
        </div>
      ),
      value: 'internal',
    },
    {
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShoppingCartOutlined />
          <span>For Sale</span>
          <Tag color="green">SELLING</Tag>
        </div>
      ),
      value: 'selling',
    },
    {
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SwapOutlined />
          <span>Both</span>
          <Tag color="blue">BOTH</Tag>
        </div>
      ),
      value: 'both',
    },
  ], []);

  // File Upload Functions
  const beforeUpload = useCallback((file: RcFile) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('You can only upload image files!');
      return false;
    }

    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Image must be smaller than 5MB!');
      return false;
    }

    setUploadedFile(file);
    return false;
  }, []);

  const handleChange: UploadProps['onChange'] = useCallback(({ fileList: newFileList }) => {
    if (newFileList.length > 0 && newFileList[0].originFileObj) {
      const file = newFileList[0].originFileObj;
      setUploadedFile(file);
      setPreviewImage(URL.createObjectURL(file));
    } else if (newFileList.length > 0 && newFileList[0].url) {
      setPreviewImage(newFileList[0].url);
    } else {
      setPreviewImage(null);
      setUploadedFile(null);
    }

    setFileList(newFileList);
  }, []);

  const customRequest = useCallback(({ onSuccess }: any) => {
    setTimeout(() => {
      onSuccess && onSuccess("ok");
    }, 0);
  }, []);

  // Render Step Content
  const renderStepContent = useCallback(() => {
    const values = form.getFieldsValue();
    const supplierPrice = values.supplier_price;
    const sellingPrice = values.price;

    switch (currentStep) {
      case 0:
        return (
          <ProCard title="Basic Information" size="small">
            <ProForm.Group>
              <ProFormText
                width="xl"
                name="name"
                label="Product Name"
                rules={[{ required: true, message: "Product name is required" }]}
                placeholder="Enter product name"
                fieldProps={{
                  onChange: handleFieldChange,
                }}
              />

              <ProFormSelect
                width="md"
                name="usage_type"
                label="Usage Type"
                rules={[{ required: true, message: "Usage type is required" }]}
                options={UsageTypeOptions}
                fieldProps={{
                  onChange: (value) => {
                    setUsageType(value);
                    if (value === 'internal') {
                      form.setFieldValue('price', undefined);
                    }
                    handleFieldChange();
                  },
                }}
              />

              <ProFormSelect
                width="md"
                name="category"
                label="Category"
                rules={[{ required: true, message: "Category is required" }]}
                showSearch
                placeholder="Select category"
                request={CategoriesRequest}
                fieldProps={{
                  onChange: (value, option) => {
                    handleCategoryChange(value);
                    handleFieldChange();
                  },
                }}
              />

              <ProFormSelect
                width="md"
                name="subcategory_id"
                label="Sub Category"
                key={selectedCategory} // ADDED: Force re-render when category changes
                rules={[{ required: true, message: "Sub category is required" }]}
                showSearch
                placeholder={selectedCategory ? "Select sub category" : "Select category first"}
                request={SubCategoriesRequest}
                disabled={!selectedCategory}
                fieldProps={{
                  onChange: handleFieldChange,
                }}
              />

              <ProFormSelect
                name="unit_id"
                showSearch
                label="Unit of Measure"
                placeholder="Select unit"
                rules={[{ required: true, message: "Unit is required" }]}
                request={UnitsRequest}
                width="md"
                fieldProps={{
                  onChange: handleFieldChange,
                }}
              />

              <ProFormTextArea
                width="xl"
                name="desc"
                label="Description"
                placeholder="Enter product description"
                fieldProps={{ rows: 3 }}
              />
            </ProForm.Group>
          </ProCard>
        );

      case 1:
        return (
          <ProCard title="Inventory & Pricing" size="small">
            <ProForm.Group>
              <ProFormDigit
                width="md"
                name="quantity"
                label="Current Quantity"
                rules={[{ required: true, message: "Quantity is required" }]}
                placeholder="Enter current quantity"
                fieldProps={{
                  min: 0,
                  onChange: handleFieldChange,
                }}
              />

              <ProFormDigit
                width="md"
                name="min_viable_quantity"
                label="Minimum Stock Level"
                placeholder="Enter minimum stock level"
                fieldProps={{ min: 0 }}
              />

              <ProFormMoney
                width="md"
                name="supplier_price"
                label="Supplier Price (Optional)"
                customSymbol="Ksh."
                placeholder="Enter supplier price (optional)"
              />

              <ProFormMoney
                width="md"
                name="price"
                label="Selling Price"
                customSymbol="Ksh."
                rules={[
                  {
                    required: usageType === 'selling' || usageType === 'both',
                    message: "Selling price is required for sellable items",
                  },
                ]}
                placeholder="Enter selling price"
                disabled={usageType === 'internal'}
                fieldProps={{
                  onChange: handleFieldChange,
                }}
                extra={
                  usageType !== 'internal' && supplierPrice > 0 && sellingPrice > 0
                    ? `Profit Margin: ${calculateProfitMargin()}`
                    : undefined
                }
              />
            </ProForm.Group>

            {usageType !== 'internal' && supplierPrice > 0 && sellingPrice > 0 && (
              <Alert
                message={`Profit Margin: ${calculateProfitMargin()}`}
                type={parseFloat(calculateProfitMargin()) > 20 ? "success" : "warning"}
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </ProCard>
        );

      case 2:
        return (
          <ProCard title="Supplier Information" size="small">
            <ProForm.Group>
              <ProFormSelect
                width="xl"
                name="supplier_id"
                label="Supplier (Optional)"
                showSearch
                placeholder="Select supplier (optional)"
                request={SuppliersRequest}
              />

              <ProFormText
                width="md"
                name="manufacturer"
                label="Manufacturer"
                placeholder="Enter manufacturer (optional)"
              />

              <ProFormText
                width="md"
                name="barcode"
                label="Barcode"
                placeholder="Enter barcode (optional)"
              />

              <ProFormText
                width="xl"
                name="location"
                label="Storage Location"
                placeholder="e.g., Warehouse A, Shelf 3"
              />
            </ProForm.Group>
          </ProCard>
        );

      case 3:
        return (
          <ProCard title="Advanced Settings" size="small">
            <ProForm.Group>
              <ProFormSelect
                width="md"
                name="status"
                label="Status"
                options={[
                  { label: 'Active', value: 'active' },
                  { label: 'Inactive', value: 'inactive' },
                  { label: 'Discontinued', value: 'discontinued' },
                ]}
              />
            </ProForm.Group>

            <Divider orientation="left">Dimensions (Optional)</Divider>
            <ProForm.Group>
              <ProFormDigit
                width="sm"
                name={['dimensions', 'length']}
                label="Length"
                fieldProps={{ min: 0 }}
              />
              <ProFormDigit
                width="sm"
                name={['dimensions', 'width']}
                label="Width"
                fieldProps={{ min: 0 }}
              />
              <ProFormDigit
                width="sm"
                name={['dimensions', 'height']}
                label="Height"
                fieldProps={{ min: 0 }}
              />
              <ProFormSelect
                width="sm"
                name={['dimensions', 'unit']}
                label="Unit"
                options={[
                  { label: 'cm', value: 'cm' },
                  { label: 'm', value: 'm' },
                  { label: 'inches', value: 'in' },
                  { label: 'feet', value: 'ft' },
                ]}
              />
            </ProForm.Group>

            <Divider orientation="left">Weight (Optional)</Divider>
            <ProForm.Group>
              <ProFormDigit
                width="md"
                name={['weight', 'value']}
                label="Weight"
                fieldProps={{ min: 0 }}
              />
              <ProFormSelect
                width="sm"
                name={['weight', 'unit']}
                label="Unit"
                options={[
                  { label: 'kg', value: 'kg' },
                  { label: 'g', value: 'g' },
                  { label: 'lb', value: 'lb' },
                  { label: 'oz', value: 'oz' },
                ]}
              />
            </ProForm.Group>
          </ProCard>
        );

      case 4:
        return (
          <ProCard title="Product Image" size="small">
            <Upload.Dragger
              fileList={fileList}
              beforeUpload={beforeUpload}
              onChange={handleChange}
              maxCount={1}
              showUploadList={{ showRemoveIcon: true }}
              accept="image/*"
              style={{ width: '100%', minHeight: 200 }}
              customRequest={customRequest}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ fontSize: 48, color: '#40a9ff' }} />
              </p>
              <p className="ant-upload-text">Click or drag file to upload</p>
              <p className="ant-upload-hint">
                Support for a single image file. Maximum size: 5MB. (Optional)
              </p>
            </Upload.Dragger>

            {previewImage && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <img
                  src={previewImage}
                  alt="Inventory preview"
                  style={{ maxHeight: 300, maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>
            )}
          </ProCard>
        );

      default:
        return null;
    }
  }, [currentStep, form, handleFieldChange, UsageTypeOptions, CategoriesRequest, SubCategoriesRequest, UnitsRequest, usageType, calculateProfitMargin, SuppliersRequest, fileList, beforeUpload, handleChange, customRequest, previewImage, selectedCategory, handleCategoryChange]);

  return (
    <Space align="center" direction="vertical" size="small">
      <ModalForm
        width={1000}
        open={open}
        onOpenChange={handleOpenChange}
        title={
          <Space>
            <ReconciliationOutlined />
            {edit ? "Edit Inventory Item" : "Add New Inventory Item"}
          </Space>
        }
        trigger={
          edit ? (
            <Button
              key="button"
              size="small"
              icon={<EditOutlined style={{ color: "#6c1c2c" }} />}
            >
              Edit
            </Button>
          ) : (
            <Button
              type="primary"
              key="button"
              icon={<ReconciliationOutlined />}
            >
              New Inventory
            </Button>
          )
        }
        onFinish={handleFormSubmit}
        form={form}
        autoFocusFirstInput={false}
        modalProps={{
          destroyOnClose: true,
          centered: true,
        }}
        submitter={{
          render: () => [
            <div key="footer" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {currentStep > 0 && (
                  <Button
                    icon={<LeftOutlined />}
                    onClick={prevStep}
                  >
                    Previous
                  </Button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                {currentStep < steps.length - 1 ? (
                  <Button
                    type="primary"
                    icon={<RightOutlined />}
                    onClick={nextStep}
                    disabled={!canProceedToNext()}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    onClick={() => form.submit()}
                    disabled={!canSubmit()}
                  >
                    {edit ? "Update Inventory" : "Add Inventory"}
                  </Button>
                )}
              </div>
            </div>
          ],
        }}
      >
        <div style={{ marginBottom: 24, padding: 18 }}>
          <Steps current={currentStep} size="small">
            {steps.map((step, index) => (
              <Step
                key={index}
                title={step.title}
                description={step.description}
                icon={step.icon}
                status={
                  index === currentStep
                    ? 'process'
                    : isStepValid(index)
                      ? 'finish'
                      : 'wait'
                }
              />
            ))}
          </Steps>
        </div>

        <div style={{ minHeight: 400 }}>
          {renderStepContent()}
        </div>

        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#666' }}>
              Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
            </span>
            <span style={{ color: isStepValid(currentStep) ? '#52c41a' : '#ff4d4f' }}>
              {isStepValid(currentStep) ? '✓ Complete' : '○ Incomplete'}
            </span>
          </div>
        </div>
      </ModalForm>
    </Space>
  );
};

export default AddEditProInventoryModal;