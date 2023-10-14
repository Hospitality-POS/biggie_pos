import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createCategory, deleteCategory, fetchCategories, fetchCategoriesByID, fetchMainCategories, fetchsubcategories, updateCategory } from "./CategoryActions";


interface Category {
  _id: string;
  name: string;
}
interface MainCategory {
  _id: string;
  name: string;
}
interface SubCategory {
  _id: string;
  name: string;
}

interface category {
  _id: string;
  name: string;
}

interface CategoryState {
  categories: Category[];
  mainCategory: MainCategory[];
  subCategory: SubCategory[];
  category: category[];
  loading: boolean;
  error: string | null;
  newCategoryMessage: string;
  isSuccess: boolean;
  isError: boolean;
}

const initialState: CategoryState = {
  categories: [],
  category:[],
  mainCategory:[],
  subCategory:[],
  loading: false,
  error: null,
  newCategoryMessage: "",
  isSuccess: false,
  isError: false,
};

export const categorySlice = createSlice({
  name: "category",
  initialState,
  reducers: {
    reset: (state) => {
      state.loading = false;
      state.isSuccess = false;
      state.error = null;
    },
    resetCategoryMessage: (state) => {
      state.newCategoryMessage = "";
      state.isError = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action: PayloadAction<Category[]>) => {
        state.loading = false;
        state.isSuccess = true;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCategory.fulfilled, (state, action: PayloadAction<Category>) => {
        state.loading = false;
        state.isSuccess = true;
        state.isError = false;
        state.newCategoryMessage = "Category created successfully";
        state.categories.push(action.payload);
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isError = true;
        state.newCategoryMessage = "Failed to create a new category!";
      })
      .addCase(updateCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action: PayloadAction<Category>) => {
        state.loading = false;
        state.isSuccess = true;
        const updatedCategory = action.payload;
        const index = state.categories.findIndex((c) => c._id === updatedCategory._id);
        if (index !== -1) {
          state.categories[index] = updatedCategory;
        }
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.isSuccess = true;
        state.categories = state.categories.filter((category) => category._id !== action.payload);
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchMainCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMainCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.isSuccess = true;
        state.mainCategory = action.payload;
      })
      .addCase(fetchMainCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchsubcategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchsubcategories.fulfilled, (state, action) => {
        state.loading = false;
        state.isSuccess = true;
        state.subCategory = action.payload;
      })
      .addCase(fetchsubcategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchCategoriesByID.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoriesByID.fulfilled, (state, action) => {
        state.loading = false;
        state.isSuccess = true;
        state.category = action.payload;
      })
      .addCase(fetchCategoriesByID.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { reset, resetCategoryMessage } = categorySlice.actions;

export default categorySlice.reducer;