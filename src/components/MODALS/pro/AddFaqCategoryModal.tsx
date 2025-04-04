import React, { useEffect } from 'react';
import { Modal, Form, Input, Button } from 'antd';
import { addNewFaqCategory, updateFaqCategory } from '../../../services/faq';

const FaqCategoryModal = ({ visible, onCancel, category, onSuccess }) => {
    const [form] = Form.useForm();
    const isEditing = !!category;

    useEffect(() => {
        if (visible) {
            if (isEditing) {
                form.setFieldsValue({
                    name: category.name
                });
            } else {
                form.resetFields();
            }
        }
    }, [visible, category, form, isEditing]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();

            if (isEditing) {
                await updateFaqCategory({
                    _id: category._id,
                    name: values.name
                });
            } else {
                await addNewFaqCategory(values);
            }

            onSuccess();
        } catch (error) {
            console.error('Form validation failed:', error);
        }
    };

    return (
        <Modal
            title={isEditing ? 'Edit FAQ Category' : 'Add New FAQ Category'}
            open={visible}
            onCancel={onCancel}
            footer={[
                <Button key="cancel" onClick={onCancel}>
                    Cancel
                </Button>,
                <Button key="submit" type="primary" onClick={handleSubmit}>
                    {isEditing ? 'Update' : 'Create'}
                </Button>
            ]}
        >
            <Form
                form={form}
                layout="vertical"
                requiredMark={false}
            >
                <Form.Item
                    name="name"
                    label="Category Name"
                    rules={[{ required: true, message: 'Please enter the category name' }]}
                >
                    <Input placeholder="Enter category name" />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default FaqCategoryModal;