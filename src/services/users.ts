import { ParamsType } from "@ant-design/pro-components";
import axios from "axios";
import { BASE_URL } from "@utils/config";
import { Modal, notification } from "antd/lib";

  const userUrl = `${BASE_URL}/users`;
 
export const fetchAllUsersList = async (data: ParamsType) => {
  try {
    const url = `${BASE_URL}/users/all`;
  
    const response = await axios.get(url, {
      params: { fullname: data.fullname, email: data.email },
    });
    return response.data;
  } catch (error) {
   Modal.error({ title: `${error?.message}`, content: "Please check your internet connection!" }); 
  }
};


export const updateUsers = async (data: ParamsType) => {
    const url = `${BASE_URL}/users`;   
  try {
    const response = await axios.put(`${url}/${data?._id}`, data?.value);
    notification.success({
      message: `Success`,
      description: "Successfully edited User",
      placement: "bottomLeft",
    });
    return response.data;
  } catch (error: any) {
   Modal.error({
     title: `${error?.message}`,
     content: "Please check your internet connection!",
   }); 
 
  }
};


export const fetchUserRoles =async () => {
   const url = `${BASE_URL}/users`;
  try {
    const response = await axios.get(`${url}/fetch-role-type/all`);
    return response.data;
  } catch (error) {
    console.log(error);
  }
}

export const fetchUserById = async (id: string) => {
 
   try {
     const response = await axios.get(`${userUrl}/${id}`);
     return response.data;
   } catch (error) {
     console.log(error);
     throw new Error("Error fetching user");
   }
   
 };

 export const deleteUserById = async (id: string) => {
   try {
     const response = await axios.delete(`${userUrl}/${id}`);
     return response.data;
   } catch (error) {
     console.log(error);
     throw new Error("Error deleting user");
   }
   
 };