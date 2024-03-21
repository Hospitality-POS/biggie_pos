import { ParamsType } from "@ant-design/pro-components";
import axios from "axios";
import { BASE_URL } from "@utils/config";
import { Modal, notification } from "antd/lib";

const tableUrl = `${BASE_URL}/tables`;

export const getAllTables = async (data: ParamsType) => {
  try {
    const response = await axios.get(tableUrl, { params: {name: data.name, locatedAt: data.locatedAt} });
    return response.data;
  } catch (error) {
    Modal.error({
      title: "Oops!  Something went wrong.",
      content: "Please check your internet connection!",
    });
  }
};

export const getTableLocation = async (data: ParamsType) => {
  try {
    const url = `${tableUrl}/location/locations`;
    const response = await axios.get(url, { params: { name: data.name } });
    return response.data;
  } catch (error) {
    Modal.error({
      title: "Oops! Something went wrong.",
      content: "Please check your internet connection!",
    });
  }
};

export const fetchTableUsequery = async () => {
  try {
    const response = await axios.get(
      `${tableUrl}/tables/unique-locatedAt`
    );
  
    return response.data;
  } catch (error) {
    console.log(error);
    
  }
};

export const editLocation = async (data: ParamsType) => {
  try {
    const response = await axios.put(
      `${tableUrl}/locations/${data._id}`,
      { "locationName": data?.values?.name }
    );
    notification.success({
      message: `Success`,
      description: "Successfully edited Location",
      placement: "bottomLeft",
    });
    return response.data;
  } catch (error: any) {
    Modal.error({
      title: "Oops! Something went wrong.",
      content: "Please check your internet connection!",
    });
  }
};
export const addNewTableLocation = async (data: ParamsType) => {

  try {
    const response = await axios.post(`${tableUrl}/locations`, {
      "locationName": data?.name,
    });
    notification.success({
      message: `Success`,
      description: "Successfully Added new Location",
      placement: "bottomLeft",
    });
    return response.data;
  } catch (error: any) {
    Modal.error({
      title: "Oops! Something went wrong.",
      content: "Please check your internet connection!",
    });
  }
};