import React, { useState } from "react";
import { Modal, Button, Form, Input, Select, Alert } from "antd";
import CategoryIcon from "@mui/icons-material/Category";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { resetCategoryMessage } from "../../../features/Category/CategorySlice";
import { createCategory } from "../../../features/Category/CategoryActions";
import { useAppSelector } from "../../../store";

interface Category {
  _id?: string;
  sub_category?: string;
  name: string;
  subcategory_id: string;
}

interface AddCategoryDialogProps {
  open: boolean;
  onClose: () => void;
  onAddCategory: (category: Category) => void;
}

const AddProCategoryDialog: React.FC<AddCategoryDialogProps> = ({
  open,
  onClose,
  onAddCategory,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCategoryMessage, setNewCategoryMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [okState, setOkState] = useState(true)

  const [form] = Form.useForm();
  const dispatch = useDispatch();

  const handleConfirmAddCategory = (data: Category) => {
    dispatch(resetCategoryMessage());
    const newCategory: Category = {
      name: data.name,
      sub_category: data.subcategory_id,
    };
    dispatch(createCategory(newCategory));
    onAddCategory(data);
    handleClose();
  };

  const handleClose = () => {
    form.resetFields();
    setIsModalVisible(false);
  };

  const fetchSubCategories = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3000/categories/sub-categories"
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching subcategories", error);
      return [];
    }
  };

  const { data: subcategories } = useQuery(
    ["subcategories"],
    fetchSubCategories
  );

  const handleSubCategoryChange = (subCategoryId: string) => {
    form.setFieldsValue({ subcategory_id: subCategoryId });
  };

  const handleFormValuesChange = (changedValues: any, allValues: any) => {
    // Handle additional logic if needed
    console.log("Form values changed:", allValues);
    allValues.name && allValues.subcategory_id ? setOkState(false) : setOkState(true)
  };

  return (
    <>
      <Button onClick={() => setIsModalVisible(true)}>
        Add new subcategory
      </Button>
      <Modal
        open={isModalVisible}
        title={
          <div style={{ display: "flex", alignItems: "center", columnGap: 10 }}>
            <CategoryIcon />
            Add New Category
          </div>
        }
        onCancel={handleClose}
        footer={[
          <Button key="cancel" onClick={handleClose}>
            Cancel
          </Button>,
          <Button
            key="ok"
            type="primary"
            onClick={(e) => {
              e.preventDefault();
              handleConfirmAddCategory(form.getFieldsValue());
            }}
            loading={isSubmitting}
            disabled={okState}
          >
            OK
          </Button>,
        ]}
      >
        {isError && (
          <Alert
            type="error"
            message="Error"
            description={<strong>{newCategoryMessage}</strong>}
            showIcon
            closable
            onClose={() => setIsError(false)}
          />
        )}

        <Form
          form={form}
          onFinish={handleConfirmAddCategory}
          onValuesChange={handleFormValuesChange}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input placeholder="Enter category name" />
          </Form.Item>

          <Form.Item
            name="subcategory_id"
            label="Subcategory"
            rules={[{ required: true, message: "Subcategory is required" }]}
          >
            <Select>
              {subcategories?.map((subcategory: {_id: string, name: string}) => (
                <Select.Option key={subcategory._id} value={subcategory._id}>
                  {subcategory.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AddProCategoryDialog;