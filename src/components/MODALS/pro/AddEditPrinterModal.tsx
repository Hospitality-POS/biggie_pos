import { PrinterOutlined, EditOutlined } from "@ant-design/icons";
import ProForm, { ModalForm, ProFormSelect, ProFormText } from "@ant-design/pro-form";
import { fetchMainCategories } from "@services/categories";
import { createPrinter, updatePrinter } from "@services/printer";
import ShowConfirm from "@utils/ConfirmUtil";
import { Space, Button, Form } from "antd";
import { useEffect, useRef, useState } from "react";

interface AddEditPrinterModalProps {
    actionRef: any;
    edit?: boolean;
    data?: any;
}

interface PrinterType {
    name: string;
    ipAddr: string;
    main_category: { value: string; lable: string };
}

const AddEditPrinterModal: React.FC<AddEditPrinterModalProps> = ({ actionRef, edit, data }) => {
    const [form] = Form.useForm();
    const formRef = useRef();

    const [open, setOpen] = useState(false);

    useEffect(() => {
      if (open && data) {
        form.setFieldsValue({
          ...data,
          main_category: {
            value: data?.main_category?._id,
            lable: data?.main_category?.name,
          },
        });
      }
    }, [open, data, form]);

    const handleOpenChange = (newOpen: boolean) => {
      setOpen(newOpen);
      if (!newOpen) {
        form.resetFields();
      }
    };


    const editPrinterPayload = {
        ...data,
        main_category: {
            value: data?.main_category?._id,
            lable: data?.main_category?.name,
        },
    };

    const HandleOnPrinterFinish = async (values: Partial<PrinterType>) => {
        const payload = { name: values?.name, ipAddr: values?.ipAddr, main_category: values?.main_category };
        
        const confirmed = await ShowConfirm({
            title: `Are you sure you want to ${
                edit ? "update this" : "add new"
            } printer?`,
            position: true,
        });
        if (confirmed) {
            edit
                ? await updatePrinter({ values, _id: data?._id, name: data?.name, main_category: data?.main_category?.value })
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
              icon={
                <EditOutlined
                  style={{ color: "#6c1c2c" }}
                  onClick={() => form.setFieldsValue(editPrinterPayload)}
                />
              }
            >Edit</Button>
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
          request={async () => {
            const data = await fetchMainCategories();
            const values = data.map((e: { name: any; _id: any }) => {
              return { label: e.name, value: e._id };
            });
            return values;
          }}
        />
        </ProForm.Group>
      </ModalForm>
    );
};

export default AddEditPrinterModal;