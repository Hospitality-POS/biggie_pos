import { ParamsType } from "@ant-design/pro-components";
import axios from "axios";
import { BASE_URL } from "@utils/config";
import { Modal, notification } from "antd/lib";
import { message } from "antd";

export const fetchSystemSetupDetails = async () => {
  try {
    const url = `${BASE_URL}/users/fetch-system-setting/all`;
    const response = await axios.get(url);
    // console.log("system..", response.data);

    return response.data;
  } catch (error) {
    throw new Error(error?.message);
  }
};
export const fetchSystemSetupDetailsById = async () => {
  try {
    const url = `${BASE_URL}/users/fetch-system-setting/6637797763064f893911fd92`;
    // const url = `${BASE_URL}/users/fetch-system-setting/${localStorage.getItem("businessId")}`;
    const response = await axios.get(url);
    // console.log("system..", response.data);

    return response.data;
  } catch (error) {
    throw new Error(error?.message);
  }
};

export const createSystemSetup = async (data: ParamsType) => {
  try {
    const url = `${BASE_URL}/users/new-system-setting`;
    const response = await axios.post(url, data);
    localStorage.setItem("businessId", response?.data?._id);
    // console.log("create..", response.data);
    message.success("System Setup created successfully");
    return response.data;
  } catch (error) {
    message.error("Failed to create a new System Setup");
  }
};

export const updateSystemSetup = async (data: ParamsType) => {
  try {
    // console.log("update..", data);
    const url = `${BASE_URL}/users/update-system-setting`;
    const response = await axios.put(`${url}/${data._id}`, data.data);
    message.success("System Setup updated successfully");
    return response.data;
  } catch (error) {
    message.error("Failed to update System Setup");
  }
};

export const fetchSystemPaymentDetails = async () => {
  const url = `${BASE_URL}/payment-methods/fetch-payment-detail/all`;
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.log(error);
  }
};