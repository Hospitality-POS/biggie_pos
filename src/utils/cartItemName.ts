/**
 * Name of a cart/order line for display and printing, with its variant when
 * one was picked, e.g. "Adventure Lipstick (Ruby Red)".
 */
export const withVariantName = (name: string, variantName?: string | null): string =>
  variantName ? `${name} (${variantName})` : name;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cartItemName = (item: any, fallback = "Item"): string =>
  withVariantName(
    item?.product_id?.name ?? item?.product_name ?? item?.name ?? item?.description ?? fallback,
    item?.variant_name
  );
