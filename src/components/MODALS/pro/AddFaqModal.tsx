import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Button } from 'antd';
import { addNewFaq, updateFaq } from '../../../services/faq';

const { TextArea } = Input;
const { Option } = Select;

const FaqModal = ({ visible, onCancel, faq, categories, onSuccess }) => {
    const [form] = Form.useForm();
    const isEditing = !!faq;

    useEffect(() => {
        if (visible) {
            if (isEditing) {
                form.setFieldsValue({
                    question: faq.question,
                    answer: faq.answer,
                    faq_category_id: faq.faq_category_id?._id || faq.faq_category_id
                });
            } else {
                form.resetFields();
            }
        }
    }, [visible, faq, form, isEditing]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();

            if (isEditing) {
                await updateFaq({
                    _id: faq._id,
                    ...values
                });
            } else {
                await addNewFaq(values);
            }

            onSuccess();
        } catch (error) {
            console.error('Form validation failed:', error);
        }
    };

    return (
        <Modal
            title={isEditing ? 'Edit FAQ' : 'Add New FAQ'}
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
            width={600}
        >
            <Form
                form={form}
                layout="vertical"
                requiredMark={false}
            >
                <Form.Item
                    name="question"
                    label="Question"
                    rules={[{ required: true, message: 'Please enter the question' }]}
                >
                    <Input placeholder="Enter the question" />
                </Form.Item>

                <Form.Item
                    name="answer"
                    label="Answer"
                    rules={[{ required: true, message: 'Please enter the answer' }]}
                >
                    <TextArea
                        placeholder="Enter the answer"
                        autoSize={{ minRows: 4, maxRows: 10 }}
                    />
                </Form.Item>

                <Form.Item
                    name="faq_category_id"
                    label="Category"
                    rules={[{ required: true, message: 'Please select a category' }]}
                >
                    <Select placeholder="Select a category">
                        {categories.map(category => (
                            <Option key={category._id} value={category._id}>
                                {category.name}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default FaqModal;