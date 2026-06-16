import { PrinterOutlined, EditOutlined } from "@ant-design/icons";
import ProForm, { ModalForm, ProFormSelect, ProFormSwitch, ProFormText } from "@ant-design/pro-form";
import { fetchMainCategories } from "@services/categories";
import { createPrinter, updatePrinter } from "@services/printer";
import { useQuery } from "@tanstack/react-query";
import ShowConfirm from "@utils/ConfirmUtil";
import { Space, Button, Form } from "antd";
import { useEffect, useRef, useState } from "react";

import { usePrimaryColor } from "@context/PrimaryColorContext";

interface AddEditPrinterModalProps {
  actionRef: any;
  edit?: boolean;
  data?: any;
}

interface PrinterType {
  name: string;
  ipAddr: string;
  main_category: { value: string; lable: string };
  connectionType: "NETWORK" | "USB";
  defaultPrinter: boolean;
}

const AddEditPrinterModal: React.FC<AddEditPrinterModalProps> = ({ actionRef, edit, data }) => {
  const [connectionType, setConnectionType] = useState<"NETWORK" | "USB">(
    data?.connectionType || "NETWORK"
  );

  const [form] = Form.useForm();
  const formRef = useRef();

  const [open, setOpen] = useState(false);

  const primaryColor = usePrimaryColor();

  useEffect(() => {
    if (open && data) {
      form.setFieldsValue({
        ...data,
        main_category: {
          value: data?.main_category?._id,
          lable: data?.main_category?.name,
        },
        connectionType: data?.connectionType || "NETWORK",
      });
      setConnectionType(data?.connectionType || "NETWORK");
    }
  }, [open, data, form]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.resetFields();
    }
  };
  const { data: mainCategoryData } = useQuery({
    queryKey: ["printer-main-category"],
    queryFn: () => fetchMainCategories(),
    refetchInterval: 5000,
    networkMode: "always",
  });

  const mainCategoryRequest = async () => {
    const values = mainCategoryData?.map((e: { name: any; _id: any }) => {
      return { label: e.name, value: e._id };
    });
    return values;
  };

  const editPrinterPayload = {
    ...data,
    main_category: {
      value: data?.main_category?._id,
      lable: data?.main_category?.name,
    },
  };

  const HandleOnPrinterFinish = async (values: Partial<PrinterType>) => {
    const payload = {
      name: values?.name,
      defaultPrinter: values?.defaultPrinter,
      ipAddr:
        values?.connectionType === "NETWORK" ? values?.ipAddr : undefined,
      main_category: values?.main_category,
      connectionType: values?.connectionType,
    };

    const confirmed = await ShowConfirm({
      title: `Are you sure you want to ${edit ? "update this" : "add new"
        } printer?`,
      position: true,
    });
    if (confirmed) {
      edit
        ? await updatePrinter({ values, _id: data?._id, name: data?.name, main_category: data?.main_category?.value, connectionType: data?.connectionType })
        : await createPrinter(payload);
      actionRef.current.reset();
      return true;
    }
  };

  return (
    <ModalForm
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <Space>
          <PrinterOutlined />
          {edit ? "Edit Printer" : "Add New Printer"}
        </Space>
      }
      initialValues={edit ? editPrinterPayload : {}}
      trigger={
        edit ? (
          <Button
            key="button"
            size="small"
            icon={
              <EditOutlined
                style={{ color: primaryColor }}
                onClick={() => form.setFieldsValue(editPrinterPayload)}
              />
            }
          >
            Edit
          </Button>
        ) : (
          <Button key="button" icon={<PrinterOutlined />} type="primary">
            Add New Printer
          </Button>
        )
      }
      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        centered: true,
      }}
      onFinish={HandleOnPrinterFinish}
      form={form}
      formRef={formRef}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: edit ? "Edit Printer" : "Add Printer",
        },
      }}
    >
      <ProForm.Group>
        <ProFormText
          width="md"
          name="name"
          label="Create New Printer"
          rules={[{ required: true, message: "Printer Name is required" }]}
          placeholder="Enter Printer Name"
        />
        <ProFormSelect
          width="md"
          name="connectionType"
          label="Connection Type"
          initialValue={connectionType}
          options={[
            { label: "Network", value: "NETWORK" },
            { label: "USB", value: "USB" },
          ]}
          rules={[{ required: true, message: "Connection Type is required" }]}
          fieldProps={{
            onChange: (value: "NETWORK" | "USB") => setConnectionType(value),
          }}
        />
        {connectionType === "NETWORK" && (
          <ProFormText
            width="md"
            name="ipAddr"
            label="IP Address"
            rules={[
              { required: true, message: "Please enter IP address" },
              {
                pattern: /^(\d{1,3}\.){3}\d{1,3}$/,
                message: "Please enter a valid IP address",
              },
            ]}
            placeholder="Enter IP Address"
          />
        )}

        <ProFormSwitch
          width="md"
          id="defaultPrinter"
          name="defaultPrinter"
          label="Set as Default Printer?"
          rules={[{ required: true, message: "Please select default Printer " }]}
        />
      </ProForm.Group>

      <ProForm.Group>
        <ProFormSelect
          hasFeedback
          width="md"
          name="main_category"
          label="Main Category"
          rules={[{ required: true, message: "Main Category is required" }]}
          showSearch
          placeholder="Select Main Category"
          request={mainCategoryRequest}
        />
      </ProForm.Group>

    </ModalForm>
  );
};

export default AddEditPrinterModal;