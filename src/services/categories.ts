import axios from "axios";
// get all categories
const BASE_URL = import.meta.env.VITE_API_URL;

export const fetchAllCategories = async () => {
  const response = await axios.get(`${BASE_URL}/categories`);
  return response.data;
};


// FILTER ON BACKEND TO PREVENT 