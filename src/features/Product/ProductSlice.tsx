import { createSlice } from "@reduxjs/toolkit";
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  fetchProductsByCategory,
  updateProduct,
} from "./ProductAction";

interface Product {
  quantity: number;
  price: number;
  image: string;
  _id: string;
  name: string;
  type: 'product' | 'service';
  duration?: number;
  usage_type?: string;
  supplier_price?: number;
  unit_id?: string;
  subcategory_id?: string;
  thumbnail?: string;
  desc?: string;
  activateInventory?: boolean;
  addons?: any[];
  category?: any;
  min_viable_quantity?: number;
  createdAt?: string;
  updatedAt?: string;
  code?: string;
  __v?: number;
}

interface ProductState {
  products: Product[];
  services: Product[];
  loading: boolean;
  error: string | null;
}

const initialState: ProductState = {
  products: [],
  services: [],
  loading: false,
  error: null,
};

const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(createProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.type === 'service') {
          state.services.push(action.payload);
        } else {
          state.products.push(action.payload);
        }
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        console.log(action.payload);
      })
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.services && action.payload?.products) {
          state.services = action.payload.services.flatMap(category =>
            category.items?.map(item => ({ ...item, type: 'service' })) || []
          );
          state.products = action.payload.products.flatMap(category =>
            category.items?.map(item => ({ ...item, type: 'product' })) || []
          );
        } else if (Array.isArray(action.payload)) {
          const services = action.payload.filter(item => item.type === 'service');
          const products = action.payload.filter(item => item.type === 'product' || !item.type);
          state.services = services;
          state.products = products;
        } else {
          state.products = action.payload || [];
          state.services = [];
        }
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;
        const updatedItem = action.payload.product;

        if (updatedItem.type === 'service') {
          const updatedServiceIndex = state.services.findIndex(
            (service) => service._id === updatedItem._id
          );
          if (updatedServiceIndex !== -1) {
            state.services[updatedServiceIndex] = updatedItem;
          }
        } else {
          const updatedProductIndex = state.products.findIndex(
            (product) => product._id === updatedItem._id
          );
          if (updatedProductIndex !== -1) {
            state.products[updatedProductIndex] = updatedItem;
          }
        }
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.products = state.products.filter(
          (product) => product._id !== action.payload
        );
        state.services = state.services.filter(
          (service) => service._id !== action.payload
        );
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchProductsByCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductsByCategory.fulfilled, (state, action) => {
        state.loading = false;

        console.log('🔍 fetchProductsByCategory.fulfilled - Raw payload:', action.payload);

        // Handle the new flat response format from your updated backend
        if (action.payload) {

          // Check if it's the new format with separate services and inventory_products
          if (action.payload.services && action.payload.inventory_products) {
            console.log('📦 New format detected - services and inventory_products');
            state.services = action.payload.services.map(item => ({ ...item, type: 'service' }));
            state.products = action.payload.inventory_products.map(item => ({ ...item, type: 'product' }));
          }
          // Check if it's the format with services and products arrays directly
          else if (action.payload.services && action.payload.products && Array.isArray(action.payload.services)) {
            console.log('📦 Direct arrays format detected');
            state.services = action.payload.services.map(item => ({ ...item, type: 'service' }));
            state.products = action.payload.products.map(item => ({ ...item, type: 'product' }));
          }
          // Handle the old grouped format (categories with items)
          else if (action.payload.services && action.payload.products && action.payload.services.length > 0 && action.payload.services[0].items) {
            console.log('📦 Old grouped format detected');
            state.services = action.payload.services.flatMap(category =>
              category.items?.map(item => ({ ...item, type: 'service' })) || []
            );
            state.products = action.payload.products.flatMap(category =>
              category.items?.map(item => ({ ...item, type: 'product' })) || []
            );
          }
          // Handle flat array response (all items in products field)
          else if (Array.isArray(action.payload.products)) {
            console.log('📦 Flat array in products field detected');
            const services = action.payload.products.filter(item => item.type === 'service');
            const products = action.payload.products.filter(item => item.type === 'product' || !item.type);
            state.services = services;
            state.products = products;
          }
          // Handle direct array response
          else if (Array.isArray(action.payload)) {
            console.log('📦 Direct array response detected');
            const services = action.payload.filter(item => item.type === 'service');
            const products = action.payload.filter(item => item.type === 'product' || !item.type);
            state.services = services;
            state.products = products;
          }
          // Fallback
          else {
            console.log('📦 Fallback - setting products only');
            state.products = action.payload.products || [];
            state.services = action.payload.services || [];
          }
        } else {
          // Empty response
          state.products = [];
          state.services = [];
        }

        console.log('✅ Final state after update:', {
          servicesCount: state.services.length,
          productsCount: state.products.length,
          services: state.services,
          products: state.products
        });
      })
      .addCase(fetchProductsByCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default productSlice.reducer;