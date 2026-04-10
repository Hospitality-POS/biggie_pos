import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  createCart,
  getCart,
  fetchCartItems,
  addItemToCart,
  updateCartItems,
  deleteCartItem,
  deleteAllCartItems,
  cartVoid,
  cartSent,
  transferCartitemsAction,
  updateCart,
  addQtyCart,
  removeQtyCart,
  updateCartItemQty,
} from "./CartActions";

interface CartDetails {
  _id: string;
  table_id: { _id: string; name: string };
  created_by: { _id: string; username: string };
  served_by?: { _id: string; username: string };
  items: string[];
  order_no: string;
  status: string;
  discount: number;
  discount_type: string;
  tip_amount: number;
  tip_type: string;
  clientPin: string;
  clientName: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface CartItem {
  _id: string;
  name: string;
  cartId: string | undefined;
  productId: string;
  product_id: string;
  quantity: number;
  price: number;
  vat_type: "STANDARD" | "ZERO" | "EXEMPT";
}

interface CartState {
  cartDetails: CartDetails;
  cartItems: CartItem[];
  subtotal: number;
  totalVatAmount: number;
  grandTotal: number;
  loading: boolean;
  error: string | null;
  transferState: boolean;
}

const initialState: CartState = {
  cartDetails: {
    _id: "",
    table_id: { _id: "", name: "" },
    created_by: { _id: "", username: "" },
    served_by: undefined,
    items: [],
    order_no: "",
    status: "",
    createdAt: "",
    discount: 0,
    discount_type: "",
    tip_amount: 0,
    tip_type: "",
    clientPin: "N/A",
    clientName: "N/A",
    updatedAt: "",
    __v: 0,
  },
  cartItems: [],
  subtotal: 0,
  totalVatAmount: 0,
  grandTotal: 0,
  loading: false,
  error: null,
  transferState: false,
};

const calculateTotals = (state: CartState) => {
  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;

  const VAT_ENABLED = tenant?.is_vat_enabled ?? true;
  const VAT_MODE = tenant?.vat_pricing_mode || "EXCLUSIVE";
  const VAT_RATE = VAT_ENABLED ? (tenant?.vat_standard_rate || 0.16) : 0;

  let subtotal = 0;
  let totalVatAmount = 0;
  let grossTotal = 0;

  state.cartItems.forEach((item) => {
    const unitPrice = typeof item.price === "string" ? parseFloat(item.price) : item.price;
    const quantity = typeof item.quantity === "string" ? parseFloat(item.quantity) : (item.quantity || 1);

    // line value = unit price × quantity
    const linePrice = unitPrice * quantity;

    const isVatApplicable = VAT_ENABLED && item.vat_type === "STANDARD";

    let lineNet = linePrice;
    let lineVat = 0;
    let lineGross = linePrice;

    if (isVatApplicable) {
      if (VAT_MODE === "INCLUSIVE") {
        // price already contains VAT — extract net and VAT
        lineNet = linePrice / (1 + VAT_RATE);
        lineVat = linePrice - lineNet;
        lineGross = linePrice;
      } else {
        // EXCLUSIVE — price is net, VAT added on top
        lineNet = linePrice;
        lineVat = lineNet * VAT_RATE;
        lineGross = lineNet + lineVat;
      }
    }

    subtotal += lineNet;
    totalVatAmount += lineVat;
    grossTotal += lineGross;
  });

  // ── Discount ──────────────────────────────────────────────────────────────
  // INCLUSIVE: discount base is grossTotal (prices already contain VAT)
  // EXCLUSIVE: discount base is subtotal (net), VAT recalculated after
  let discountAmount = 0;
  if (state.cartDetails.discount && state.cartDetails.discount > 0) {
    const discountBase = VAT_MODE === "INCLUSIVE" ? grossTotal : subtotal;
    discountAmount =
      state.cartDetails.discount_type === "percentage"
        ? discountBase * (state.cartDetails.discount / 100)
        : state.cartDetails.discount;
    discountAmount = Math.min(discountAmount, discountBase);
  }

  let grandTotal = 0;
  let displayVat = 0;

  if (VAT_MODE === "INCLUSIVE") {
    // grandTotal = grossTotal - discount (VAT already inside prices)
    grandTotal = grossTotal - discountAmount;
    // VAT extracted from ORIGINAL grossTotal before discount — informational only
    // Never subtracted from grandTotal
    displayVat = grossTotal * (VAT_RATE / (1 + VAT_RATE));
  } else {
    // grandTotal = (subtotal - discount) + recalculated VAT on discounted base
    const discountedNet = subtotal - discountAmount;
    const vatRatio = subtotal > 0 ? discountedNet / subtotal : 1;
    displayVat = totalVatAmount * vatRatio;
    grandTotal = discountedNet + displayVat;
  }

  // ── Tip applied on grandTotal after discount ──────────────────────────────
  if (state.cartDetails.tip_amount && state.cartDetails.tip_amount > 0) {
    const tipAmount =
      state.cartDetails.tip_type === "percentage"
        ? grandTotal * (state.cartDetails.tip_amount / 100)
        : state.cartDetails.tip_amount;
    grandTotal += tipAmount;
  }

  // subtotal shown to user:
  //   INCLUSIVE → grossTotal (full price tag total before discount)
  //   EXCLUSIVE → net subtotal (pre-VAT sum)
  state.subtotal = parseFloat(
    (VAT_MODE === "INCLUSIVE" ? grossTotal : subtotal).toFixed(2)
  );
  state.totalVatAmount = parseFloat(displayVat.toFixed(2));
  state.grandTotal = parseFloat(grandTotal.toFixed(2));
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      const existingItem = state.cartItems.find(
        (item) => item.productId === action.payload.productId
      );
      if (existingItem) {
        existingItem.quantity += action.payload.quantity;
      } else {
        state.cartItems.push(action.payload);
      }
      calculateTotals(state);
    },
    subtractItem(state, action: PayloadAction<CartItem>) {
      const existingItem = state.cartItems.find(
        (item) => item.productId === action.payload.productId
      );
      if (existingItem) {
        if (existingItem.quantity > 1) {
          existingItem.quantity -= action.payload.quantity;
        } else {
          state.cartItems = state.cartItems.filter(
            (item) => item.productId !== action.payload.productId
          );
        }
        calculateTotals(state);
      }
    },
    removeCartItem(state, action: PayloadAction<string>) {
      state.cartItems = state.cartItems.filter(
        (item) => item.productId !== action.payload
      );
      calculateTotals(state);
    },
    clearcart(state) {
      state.cartDetails = initialState.cartDetails;
      state.cartItems = initialState.cartItems;
      state.subtotal = 0;
      state.totalVatAmount = 0;
      state.grandTotal = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createCart.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createCart.fulfilled, (state) => { state.loading = false; })
      .addCase(createCart.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

      .addCase(getCart.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(getCart.fulfilled, (state, action) => {
        state.loading = false;
        state.cartDetails = action.payload;
        state.cartDetails.clientPin = action.payload.client_pin;
        state.cartDetails.clientName = action.payload.client_name;
        state.cartDetails.served_by = action.payload.served_by ?? undefined;
        state.cartItems = action.payload.items.map((item: any) => ({
          ...item,
          vat_type: item.product_id?.vat_type || "STANDARD",
        }));
        calculateTotals(state);
      })
      .addCase(getCart.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

      .addCase(fetchCartItems.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchCartItems.fulfilled, (state, action) => {
        state.loading = false;
        state.cartItems = action.payload as any;
        calculateTotals(state);
      })
      .addCase(fetchCartItems.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

      .addCase(addItemToCart.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(addItemToCart.fulfilled, (state) => { state.loading = false; })
      .addCase(addItemToCart.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

      .addCase(updateCartItems.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateCartItems.fulfilled, (state, action) => {
        state.loading = false;
        const updatedData = action.payload;
        const index = state.cartItems.findIndex((i: any) => i._id === updatedData._id);
        if (index !== -1) state.cartItems[index] = updatedData;
        calculateTotals(state);
      })
      .addCase(updateCartItems.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

      .addCase(updateCart.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateCart.fulfilled, (state, action) => {
        state.loading = false;
        state.cartDetails = {
          ...state.cartDetails,
          ...action.payload,
          served_by: action.payload.served_by ?? state.cartDetails.served_by,
        };
        calculateTotals(state);
      })
      .addCase(updateCart.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

      .addCase(deleteCartItem.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.cartItems.findIndex((item) => item._id === action.payload._id);
        if (idx !== -1) state.cartItems.splice(idx, 1);
        calculateTotals(state);
      })
      .addCase(deleteCartItem.rejected, (state, action) => { state.error = action.error as string; })

      .addCase(deleteAllCartItems.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteAllCartItems.fulfilled, (state) => { state.loading = false; state.cartItems = []; calculateTotals(state); })
      .addCase(deleteAllCartItems.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

      .addCase(cartSent.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(cartSent.fulfilled, (state) => { state.loading = false; })
      .addCase(cartSent.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

      .addCase(cartVoid.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(cartVoid.fulfilled, (state) => { state.loading = false; })
      .addCase(cartVoid.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

      .addCase(transferCartitemsAction.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(transferCartitemsAction.fulfilled, (state, action) => {
        state.loading = false;
        const allExist = action.payload.products?.every((itemId) =>
          state.cartItems?.some((cartItem) => cartItem?._id === itemId)
        );
        if (allExist) { state.cartItems = []; state.transferState = true; }
        calculateTotals(state);
      })
      .addCase(transferCartitemsAction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.transferState = false;
      })

      .addCase(addQtyCart.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(addQtyCart.fulfilled, (state) => { state.loading = false; })
      .addCase(addQtyCart.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

      .addCase(removeQtyCart.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(removeQtyCart.fulfilled, (state) => { state.loading = false; })
      .addCase(removeQtyCart.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

      .addCase(updateCartItemQty.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateCartItemQty.fulfilled, (state) => { state.loading = false; })
      .addCase(updateCartItemQty.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });
  },
});

export const { removeCartItem, addItem, subtractItem, clearcart } = cartSlice.actions;

export default cartSlice.reducer;