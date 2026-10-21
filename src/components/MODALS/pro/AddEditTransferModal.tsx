import React, { useState, useEffect } from "react";
import {
    Modal,
    Form,
    Button,
    Space,
    InputNumber,
    Input,
    DatePicker,
    Table,
    message,
    Divider,
    Typography,
    Tag,
    Badge,
    Row,
    Col,
    Card,
    Select,
    Segmented,
    Alert,
} from "antd";
import {
    PlusOutlined,
    DeleteOutlined,
    SwapOutlined,
    SaveOutlined,
    CloseOutlined,
    ShoppingCartOutlined,
    ArrowRightOutlined,
} from "@ant-design/icons";
import { ProFormSelect, ProFormTextArea } from "@ant-design/pro-components";
import type { ActionType } from "@ant-design/pro-components";
import { createTransfer } from "@services/inventory";
import { fetchAllInventory, addInventoryVariant } from "@services/inventory";
import { fetchAllShops, fetchShop } from "@services/shops";
import { getTableLocation } from "@services/tables";
import dayjs from "dayjs";

const { Title, Text } = Typography;

interface TransferItem {
    key: string;
    from_product_id: string;
    from_product_name?: string;
    from_product_code?: string;
    to_product_id: string;
    to_product_name?: string;
    to_product_code?: string;
    quantity: number;
    unit_id: string;
    unit_name?: string;
    available_quantity?: number;
    notes?: string;
    // Source zone/table location — for zone-to-zone transfers the quantity
    // is deducted from this specific variant instead of overall stock.
    from_variant_id?: string;
    from_variant_name?: string;
    // Destination zone/table location — when the destination shop tracks
    // zone-based inventory, the received quantity is credited to this
    // specific variant on the destination product instead of its overall stock.
    to_variant_id?: string;
    to_variant_name?: string;
    // Zone-to-zone rows pick zones (table locations) rather than variants, so
    // any zone can be chosen even when the product has no variant for it yet.
    from_location_id?: string;
    to_location_id?: string;
}

interface Zone {
    _id: string;
    name: string;
    shop_id?: string;
}

// Must match ZONE_ATTRIBUTE_TYPE in AddEditVariantModal.
const ZONE_ATTRIBUTE_TYPE = "zone";

const zoneVariants = (product: any): any[] =>
    (product?.variants || []).filter((v: any) => v.location_id);

const findZoneVariant = (product: any, locationId?: string) =>
    locationId
        ? zoneVariants(product).find((v: any) => String(v.location_id) === String(locationId))
        : undefined;

// Products with no variants at all get zone variants created on submit.
const needsZoneSetup = (product: any) => (product?.variants || []).length === 0;

// Products with colour/size-style variants can't be split into zones safely.
const hasNonZoneVariants = (product: any) =>
    (product?.variants || []).some((v: any) => !v.location_id);

interface AddEditTransferModalProps {
    actionRef: React.RefObject<ActionType>;
    data?: any;
    edit?: boolean;
}

const AddEditTransferModal: React.FC<AddEditTransferModalProps> = ({
    actionRef,
    data,
    edit = false,
}) => {
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
    const [fromShopId, setFromShopId] = useState<string>("");
    const [toShopId, setToShopId] = useState<string>("");
    const [availableFromProducts, setAvailableFromProducts] = useState<any[]>([]);
    const [availableToProducts, setAvailableToProducts] = useState<any[]>([]);
    const [fromShopZoneEnabled, setFromShopZoneEnabled] = useState(false);
    const [toShopZoneEnabled, setToShopZoneEnabled] = useState(false);
    const [transferMode, setTransferMode] = useState<"shop" | "zone">("shop");
    const [zones, setZones] = useState<Zone[]>([]);

    useEffect(() => {
        if (!visible || transferMode !== "zone" || !fromShopId) {
            setZones([]);
            return;
        }
        getTableLocation({})
            .then((locations: Zone[]) =>
                setZones(
                    (locations || []).filter(
                        (loc) => !loc.shop_id || String(loc.shop_id) === String(fromShopId)
                    )
                )
            )
            .catch(() => {
                setZones([]);
                message.error("Failed to load zones");
            });
    }, [visible, transferMode, fromShopId]);

    useEffect(() => {
        if (visible && edit && data) {
            form.setFieldsValue({
                from_shop_id: data.from_shop_id?._id,
                to_shop_id: data.to_shop_id?._id,
                expected_delivery_date: data.expected_delivery_date
                    ? dayjs(data.expected_delivery_date)
                    : null,
                notes: data.notes,
            });

            setFromShopId(data.from_shop_id?._id || "");
            setToShopId(data.to_shop_id?._id || "");
            setTransferMode(
                data.transfer_type === "zone_to_zone" ||
                (data.from_shop_id?._id && data.from_shop_id._id === data.to_shop_id?._id)
                    ? "zone"
                    : "shop"
            );

            const items = data.items?.map((item: any, index: number) => ({
                key: `item-${index}`,
                from_product_id: item.from_product_id?._id,
                from_product_name: item.from_product_id?.name,
                from_product_code: item.from_product_id?.code,
                to_product_id: item.to_product_id?._id,
                to_product_name: item.to_product_id?.name,
                to_product_code: item.to_product_id?.code,
                quantity: item.quantity,
                unit_id: item.unit_id?._id,
                unit_name: item.unit_id?.name,
                notes: item.notes,
                from_variant_id: item.from_variant_id?._id || item.from_variant_id,
                from_variant_name: item.from_variant_id?.name || item.from_variant_name,
                to_variant_id: item.to_variant_id?._id || item.to_variant_id,
                to_variant_name: item.to_variant_id?.name || item.to_variant_name,
            })) || [];

            setTransferItems(items);
        }
    }, [visible, edit, data, form]);

    useEffect(() => {
        if (fromShopId) {
            loadAvailableProducts(fromShopId, "from");
            fetchShop(fromShopId)
                .then((shop) => setFromShopZoneEnabled(!!shop?.zone_inventory_enabled))
                .catch(() => setFromShopZoneEnabled(false));
        } else {
            setFromShopZoneEnabled(false);
        }
    }, [fromShopId]);

    useEffect(() => {
        if (toShopId) {
            loadAvailableProducts(toShopId, "to");
            fetchShop(toShopId)
                .then((shop) => setToShopZoneEnabled(!!shop?.zone_inventory_enabled))
                .catch(() => setToShopZoneEnabled(false));
        } else {
            setToShopZoneEnabled(false);
        }
    }, [toShopId]);

    const loadAvailableProducts = async (shopId: string, type: "from" | "to") => {
        try {
            console.log(`Loading ${type} products for shop ID:`, shopId);
            const products = await fetchAllInventory({ origin_shop: shopId });

            if (type === "from") {
                setAvailableFromProducts(products || []);
            } else {
                setAvailableToProducts(products || []);
            }
        } catch (error) {
            console.error(`Error loading ${type} products:`, error);
            message.error(`Failed to load ${type} shop products`);
        }
    };

    const showModal = () => {
        setVisible(true);
        if (!edit) {
            form.resetFields();
            setTransferItems([]);
            setFromShopId("");
            setToShopId("");
            setTransferMode("shop");
        }
    };

    const handleCancel = () => {
        setVisible(false);
        form.resetFields();
        setTransferItems([]);
        setFromShopId("");
        setToShopId("");
        setAvailableFromProducts([]);
        setAvailableToProducts([]);
        setFromShopZoneEnabled(false);
        setToShopZoneEnabled(false);
        setTransferMode("shop");
    };

    const handleFromShopChange = (value: string) => {
        setFromShopId(value);
        setTransferItems([]);
        // Zone transfers stay inside one branch — keep the destination in sync
        if (transferMode === "zone") {
            setToShopId(value);
            form.setFieldsValue({ to_shop_id: value });
        }
    };

    const handleModeChange = (mode: "shop" | "zone") => {
        setTransferMode(mode);
        setTransferItems([]);
        if (mode === "zone") {
            // Same branch on both ends — stock moves between its zones.
            // Default to the branch the user is signed into, whose zones load.
            const currentShopId = localStorage.getItem("shopId") || "";
            const branchId = fromShopId || (currentShopId !== "undefined" ? currentShopId : "");
            setFromShopId(branchId);
            setToShopId(branchId);
            form.setFieldsValue({ from_shop_id: branchId || undefined, to_shop_id: branchId || undefined });
        } else {
            setToShopId("");
            form.setFieldsValue({ to_shop_id: undefined });
        }
    };

    const handleToShopChange = (value: string) => {
        setToShopId(value);
        // Clear to_product selections when destination shop changes
        setTransferItems(items => items.map(item => ({
            ...item,
            to_product_id: "",
            to_product_name: "",
            to_product_code: "",
            to_variant_id: undefined,
            to_variant_name: undefined,
        })));
    };

    const addTransferItem = () => {
        const newItem: TransferItem = {
            key: `item-${Date.now()}`,
            from_product_id: "",
            to_product_id: "",
            quantity: 1,
            unit_id: "",
            notes: "",
        };
        setTransferItems([...transferItems, newItem]);
    };

    const removeTransferItem = (key: string) => {
        setTransferItems(transferItems.filter((item) => item.key !== key));
    };

    // Zone-to-zone transfer: same shop on both ends, stock moves between
    // table-location variants rather than between shops.
    const isZoneMode = transferMode === "zone";

    // Zone variants that actually hold stock — only these can send quantity.
    const zoneVariantsWithStock = (product: any) =>
        zoneVariants(product).filter((v: any) => Number(v.quantity) > 0);

    // A product can move between zones if it already holds zone stock, or if
    // it has no variants yet (its zones are set up when the transfer is saved).
    const canTransferBetweenZones = (product: any) =>
        !hasNonZoneVariants(product) &&
        (zoneVariantsWithStock(product).length > 0 ||
            (needsZoneSetup(product) && Number(product?.quantity) > 0));

    // Zone of a row, from the picked zone or (when editing) its saved variant.
    const rowFromLocation = (record: TransferItem) =>
        record.from_location_id ||
        zoneVariants(availableFromProducts.find((p) => p._id === record.from_product_id))
            .find((v: any) => (v._id || v.id) === record.from_variant_id)?.location_id;
    const rowToLocation = (record: TransferItem) =>
        record.to_location_id ||
        zoneVariants(availableToProducts.find((p) => p._id === record.to_product_id))
            .find((v: any) => (v._id || v.id) === record.to_variant_id)?.location_id;

    const zoneName = (locationId?: string) =>
        zones.find((z) => String(z._id) === String(locationId))?.name;

    const updateTransferItem = (key: string, field: string, value: any) => {
        setTransferItems(
            transferItems.map((item) => {
                if (item.key === key) {
                    if (field === "from_product_id") {
                        const product = availableFromProducts.find((p) => p._id === value);
                        const toProduct = isZoneMode
                            ? availableToProducts.find((p) => p._id === value)
                            : undefined;
                        return {
                            ...item,
                            from_product_id: value,
                            from_product_name: product?.name,
                            from_product_code: product?.code,
                            unit_id: product?.unit_id?._id || "",
                            unit_name: product?.unit_id?.name || "",
                            available_quantity: product?.quantity || 0,
                            // Product changed — previously picked zones no longer apply
                            from_variant_id: undefined,
                            from_variant_name: undefined,
                            from_location_id: undefined,
                            // Zone transfers move the same product between zones.
                            ...(isZoneMode
                                ? {
                                      to_product_id: value,
                                      to_product_name: toProduct?.name,
                                      to_product_code: toProduct?.code,
                                      to_variant_id: undefined,
                                      to_variant_name: undefined,
                                      to_location_id: undefined,
                                  }
                                : {}),
                        };
                    } else if (field === "from_location_id") {
                        const product = availableFromProducts.find((p) => p._id === item.from_product_id);
                        const variant = findZoneVariant(product, value);
                        return {
                            ...item,
                            from_location_id: value,
                            from_variant_id: variant ? variant._id || variant.id : undefined,
                            from_variant_name: variant?.name || zoneName(value),
                            // An unset product's whole stock moves into this zone on save
                            available_quantity: variant
                                ? Number(variant.quantity ?? 0)
                                : needsZoneSetup(product)
                                    ? Number(product?.quantity ?? 0)
                                    : 0,
                            // Source and destination can't be the same zone
                            ...(rowToLocation(item) === value
                                ? { to_location_id: undefined, to_variant_id: undefined, to_variant_name: undefined }
                                : {}),
                        };
                    } else if (field === "to_location_id") {
                        const product = availableToProducts.find((p) => p._id === item.to_product_id);
                        const variant = findZoneVariant(product, value);
                        return {
                            ...item,
                            to_location_id: value,
                            to_variant_id: variant ? variant._id || variant.id : undefined,
                            to_variant_name: variant?.name || zoneName(value),
                        };
                    } else if (field === "from_variant_id") {
                        const product = availableFromProducts.find((p) => p._id === item.from_product_id);
                        const variant = product?.variants?.find((v: any) => (v._id || v.id) === value);
                        return {
                            ...item,
                            from_variant_id: value || undefined,
                            from_variant_name: variant?.name,
                            // Stock is capped at the zone's quantity when one is picked
                            available_quantity: value
                                ? Number(variant?.quantity ?? 0)
                                : product?.quantity || 0,
                        };
                    } else if (field === "to_product_id") {
                        const product = availableToProducts.find((p) => p._id === value);
                        return {
                            ...item,
                            to_product_id: value,
                            to_product_name: product?.name,
                            to_product_code: product?.code,
                            // Destination product changed — the previously selected zone no longer applies
                            to_variant_id: undefined,
                            to_variant_name: undefined,
                        };
                    } else if (field === "to_variant_id") {
                        const product = availableToProducts.find((p) => p._id === item.to_product_id);
                        const variant = product?.variants?.find((v: any) => (v._id || v.id) === value);
                        return {
                            ...item,
                            to_variant_id: value || undefined,
                            to_variant_name: variant?.name,
                        };
                    }
                    return { ...item, [field]: value };
                }
                return item;
            })
        );
    };

    // Gives each zone-to-zone row real variant ids, creating any zone variant
    // the product doesn't have yet. A product with no variants gets its whole
    // current stock in its From Zone; other new zones start at 0, so the
    // product's total stock is unchanged.
    const setUpZoneVariants = async (): Promise<TransferItem[]> => {
        const products = new Map<string, any>(availableFromProducts.map((p) => [p._id, p]));
        const created: string[] = [];

        const ensureZone = async (productId: string, locationId: string, quantity: number) => {
            const product = products.get(productId);
            const existing = findZoneVariant(product, locationId);
            if (existing) return existing;
            const name = zoneName(locationId) || "Zone";
            const updated = await addInventoryVariant(productId, {
                name,
                attributes: { [ZONE_ATTRIBUTE_TYPE]: name },
                quantity,
                price: product?.price || undefined,
                location_id: locationId,
            });
            const variant = findZoneVariant(updated, locationId);
            if (!variant) throw new Error(`Could not set up zone "${name}" for ${product?.name}`);
            products.set(productId, updated);
            created.push(`${product?.name} → ${name}`);
            return variant;
        };

        try {
            // Source zones first, so an unset product's stock lands in its From Zone.
            for (const item of transferItems) {
                const product = products.get(item.from_product_id);
                if (needsZoneSetup(product)) {
                    await ensureZone(item.from_product_id, rowFromLocation(item)!, Number(product?.quantity) || 0);
                }
            }

            const resolved: TransferItem[] = [];
            for (const item of transferItems) {
                const from = await ensureZone(item.from_product_id, rowFromLocation(item)!, 0);
                const to = await ensureZone(item.to_product_id, rowToLocation(item)!, 0);
                resolved.push({
                    ...item,
                    from_variant_id: from._id || from.id,
                    from_variant_name: from.name,
                    to_variant_id: to._id || to.id,
                    to_variant_name: to.name,
                });
            }
            return resolved;
        } finally {
            if (created.length > 0) {
                // Keep the lists current so a retry reuses the new zones.
                const refreshed = availableFromProducts.map((p) => products.get(p._id) || p);
                setAvailableFromProducts(refreshed);
                setAvailableToProducts(refreshed);
                message.info(`Zones set up: ${created.join(", ")}`);
            }
        }
    };

    const handleSubmit = async () => {
        try {
            await form.validateFields();

            if (transferItems.length === 0) {
                message.error("Please add at least one item to transfer");
                return;
            }

            const invalidItems = transferItems.filter(
                (item) =>
                    !item.from_product_id ||
                    !item.to_product_id ||
                    !item.quantity ||
                    item.quantity <= 0
            );

            if (invalidItems.length > 0) {
                message.error("Please fill in all required fields (from product, to product, and quantity) for each item");
                return;
            }

            if (isZoneMode) {
                const missingZone = transferItems.filter(
                    (item) => !rowFromLocation(item) || !rowToLocation(item)
                );
                if (missingZone.length > 0) {
                    message.error("Zone-to-zone transfers require a From Zone and a Destination Zone for every item");
                    return;
                }
                const sameZone = transferItems.filter(
                    (item) => String(rowFromLocation(item)) === String(rowToLocation(item))
                );
                if (sameZone.length > 0) {
                    message.error("Source and destination zones must be different for the same product");
                    return;
                }
                // An item without zones has all its stock in one place, so its
                // rows must all start from the same zone.
                const setupSources = new Map<string, string>();
                for (const item of transferItems) {
                    const product = availableFromProducts.find((p) => p._id === item.from_product_id);
                    if (!needsZoneSetup(product)) continue;
                    const loc = String(rowFromLocation(item));
                    const seen = setupSources.get(item.from_product_id);
                    if (seen && seen !== loc) {
                        message.error(
                            `${product?.name} has no zones yet — use one From Zone for all of its rows`
                        );
                        return;
                    }
                    setupSources.set(item.from_product_id, loc);
                }
            }

            const insufficientItems = transferItems.filter(
                (item) => item.quantity > (item.available_quantity || 0)
            );

            if (insufficientItems.length > 0) {
                const itemNames = insufficientItems.map((i) => i.from_product_name).join(", ");
                message.error(
                    `Insufficient stock for: ${itemNames}. Please adjust quantities.`
                );
                return;
            }

            setLoading(true);

            const itemsToSend = isZoneMode ? await setUpZoneVariants() : transferItems;

            const formValues = form.getFieldsValue();
            const transferData = {
                from_shop_id: formValues.from_shop_id,
                // The To Shop field is unmounted in zone mode, so its value is
                // dropped from getFieldsValue() — take it from state instead.
                to_shop_id: transferMode === "zone" ? fromShopId : formValues.to_shop_id,
                expected_delivery_date: formValues.expected_delivery_date
                    ? formValues.expected_delivery_date.toISOString()
                    : null,
                notes: formValues.notes,
                items: itemsToSend.map((item) => ({
                    from_product_id: item.from_product_id,
                    to_product_id: item.to_product_id,
                    quantity: item.quantity,
                    unit_id: item.unit_id,
                    notes: item.notes,
                    from_variant_id: item.from_variant_id || undefined,
                    from_variant_name: item.from_variant_name || undefined,
                    to_variant_id: item.to_variant_id || undefined,
                    to_variant_name: item.to_variant_name || undefined,
                })),
            };

            await createTransfer(transferData);

            message.success(
                edit ? "Transfer updated successfully" : "Transfer created successfully"
            );

            if (actionRef.current) {
                actionRef.current.reload();
            }

            handleCancel();
        } catch (error: any) {
            console.error("Error submitting transfer:", error);
            message.error(
                error?.response?.data?.message ||
                error?.message ||
                "Failed to create transfer"
            );
        } finally {
            setLoading(false);
        }
    };

    const calculateTransferSummary = () => {
        const totalItems = transferItems.length;
        const totalQuantity = transferItems.reduce(
            (sum, item) => sum + (item.quantity || 0),
            0
        );
        const totalValue = transferItems.reduce((sum, item) => {
            const product = availableFromProducts.find((p) => p._id === item.from_product_id);
            const productPrice = product?.price || 0;
            return sum + productPrice * (item.quantity || 0);
        }, 0);

        return { totalItems, totalQuantity, totalValue };
    };

    // Zone → Zone: one product per row, moved between any two of the branch's
    // zones. Zones the product has no variant for yet are created on save.
    const zoneColumns = [
        {
            title: "Product",
            dataIndex: "from_product_id",
            key: "from_product_id",
            width: 260,
            render: (_: any, record: TransferItem) => (
                <Select
                    showSearch
                    placeholder="Select product"
                    style={{ width: "100%" }}
                    value={record.from_product_id || undefined}
                    onChange={(value) => updateTransferItem(record.key, "from_product_id", value)}
                    filterOption={(input, option) =>
                        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    options={availableFromProducts.filter(canTransferBetweenZones).map((product) => ({
                        label: `${product.name} ${product.code ? `(${product.code})` : ""} - Stock: ${product.quantity || 0}${needsZoneSetup(product) ? " · no zones yet" : ""}`,
                        value: product._id,
                    }))}
                />
            ),
        },
        {
            title: "From Zone",
            dataIndex: "from_location_id",
            key: "from_location_id",
            width: 200,
            render: (_: any, record: TransferItem) => {
                const product = availableFromProducts.find((p) => p._id === record.from_product_id);
                // Unset products can start from any zone; otherwise only zones holding stock.
                const options = needsZoneSetup(product)
                    ? zones.map((z) => ({ label: z.name, value: z._id }))
                    : zoneVariantsWithStock(product).map((v: any) => ({
                          label: `${zoneName(v.location_id) || v.name} (Stock: ${v.quantity ?? 0})`,
                          value: String(v.location_id),
                      }));
                return (
                    <Select
                        placeholder="Select zone"
                        style={{ width: "100%" }}
                        value={rowFromLocation(record) ? String(rowFromLocation(record)) : undefined}
                        disabled={!record.from_product_id}
                        onChange={(value) => updateTransferItem(record.key, "from_location_id", value)}
                        options={options}
                    />
                );
            },
        },
        {
            title: "",
            key: "arrow",
            width: 40,
            align: "center",
            render: () => <ArrowRightOutlined style={{ color: "#1890ff" }} />,
        },
        {
            title: "To Zone",
            dataIndex: "to_location_id",
            key: "to_location_id",
            width: 200,
            render: (_: any, record: TransferItem) => {
                const product = availableToProducts.find((p) => p._id === record.to_product_id);
                const fromLocation = String(rowFromLocation(record) || "");
                return (
                    <Select
                        placeholder="Select zone"
                        style={{ width: "100%" }}
                        value={rowToLocation(record) ? String(rowToLocation(record)) : undefined}
                        disabled={!record.to_product_id}
                        onChange={(value) => updateTransferItem(record.key, "to_location_id", value)}
                        options={zones
                            .filter((z) => String(z._id) !== fromLocation)
                            .map((z) => ({
                                label: findZoneVariant(product, z._id) ? z.name : `${z.name} (new)`,
                                value: z._id,
                            }))}
                    />
                );
            },
        },
    ];

    const shopColumns = [
        {
            title: "From Product (Source)",
            dataIndex: "from_product_id",
            key: "from_product_id",
            width: 250,
            render: (_: any, record: TransferItem) => (
                <Select
                    showSearch
                    placeholder="Select source product"
                    style={{ width: "100%" }}
                    value={record.from_product_id || undefined}
                    onChange={(value) => updateTransferItem(record.key, "from_product_id", value)}
                    filterOption={(input, option) =>
                        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    options={availableFromProducts.map((product) => ({
                        label: `${product.name} ${product.code ? `(${product.code})` : ""} - Stock: ${product.quantity || 0}`,
                        value: product._id,
                    }))}
                />
            ),
        },
        ...(fromShopZoneEnabled
            ? [
                  {
                      title: "From Zone",
                      dataIndex: "from_variant_id",
                      key: "from_variant_id",
                      width: 180,
                      render: (_: any, record: TransferItem) => {
                          const product = availableFromProducts.find((p) => p._id === record.from_product_id);
                          const zoneVariants = zoneVariantsWithStock(product);
                          return (
                              <Select
                                  allowClear
                                  placeholder={zoneVariants.length ? "Select zone" : "No zone stock"}
                                  style={{ width: "100%" }}
                                  value={record.from_variant_id || undefined}
                                  disabled={!record.from_product_id || zoneVariants.length === 0}
                                  onChange={(value) => updateTransferItem(record.key, "from_variant_id", value)}
                                  options={zoneVariants.map((v: any) => ({
                                      label: `${v.name} (Stock: ${v.quantity ?? 0})`,
                                      value: v._id || v.id,
                                  }))}
                              />
                          );
                      },
                  },
              ]
            : []),
        {
            title: "",
            key: "arrow",
            width: 40,
            align: "center",
            render: () => <ArrowRightOutlined style={{ color: "#1890ff" }} />,
        },
        {
            title: "To Product (Destination)",
            dataIndex: "to_product_id",
            key: "to_product_id",
            width: 250,
            render: (_: any, record: TransferItem) => (
                <Select
                    showSearch
                    placeholder="Select destination product"
                    style={{ width: "100%" }}
                    value={record.to_product_id || undefined}
                    onChange={(value) => updateTransferItem(record.key, "to_product_id", value)}
                    filterOption={(input, option) =>
                        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    disabled={!toShopId}
                    options={availableToProducts.map((product) => ({
                        label: `${product.name} ${product.code ? `(${product.code})` : ""}`,
                        value: product._id,
                    }))}
                />
            ),
        },
        ...(toShopZoneEnabled
            ? [
                  {
                      title: "Destination Zone",
                      dataIndex: "to_variant_id",
                      key: "to_variant_id",
                      width: 180,
                      render: (_: any, record: TransferItem) => {
                          const product = availableToProducts.find((p) => p._id === record.to_product_id);
                          const zoneVariants = (product?.variants || []).filter((v: any) => v.location_id);
                          return (
                              <Select
                                  allowClear
                                  placeholder={zoneVariants.length ? "Select zone" : "No zones on this item"}
                                  style={{ width: "100%" }}
                                  value={record.to_variant_id || undefined}
                                  disabled={!record.to_product_id || zoneVariants.length === 0}
                                  onChange={(value) => updateTransferItem(record.key, "to_variant_id", value)}
                                  options={zoneVariants.map((v: any) => ({
                                      label: v.name,
                                      value: v._id || v.id,
                                  }))}
                              />
                          );
                      },
                  },
              ]
            : []),
    ];

    const itemColumns = [
        ...(isZoneMode ? zoneColumns : shopColumns),
        {
            title: "Available",
            dataIndex: "available_quantity",
            key: "available_quantity",
            width: 100,
            render: (_: any, record: TransferItem) => (
                <Tag color={record.available_quantity && record.available_quantity > 0 ? "green" : "red"}>
                    {record.available_quantity || 0}
                </Tag>
            ),
        },
        {
            title: "Quantity",
            dataIndex: "quantity",
            key: "quantity",
            width: 120,
            render: (_: any, record: TransferItem) => (
                <InputNumber
                    min={1}
                    max={record.available_quantity || 0}
                    value={record.quantity}
                    onChange={(value) =>
                        updateTransferItem(record.key, "quantity", value || 1)
                    }
                    style={{ width: "100%" }}
                    status={
                        record.quantity > (record.available_quantity || 0)
                            ? "error"
                            : undefined
                    }
                />
            ),
        },
        {
            title: "Unit",
            dataIndex: "unit_name",
            key: "unit_name",
            width: 80,
            render: (_: any, record: TransferItem) => (
                <Text type="secondary">{record.unit_name || "-"}</Text>
            ),
        },
        {
            title: "Notes",
            dataIndex: "notes",
            key: "notes",
            width: 180,
            render: (_: any, record: TransferItem) => (
                <Input
                    placeholder="Optional notes"
                    value={record.notes}
                    onChange={(e) =>
                        updateTransferItem(record.key, "notes", e.target.value)
                    }
                />
            ),
        },
        {
            title: "Action",
            key: "action",
            width: 80,
            fixed: "right",
            render: (_: any, record: TransferItem) => (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeTransferItem(record.key)}
                />
            ),
        },
    ];

    const summary = calculateTransferSummary();

    const triggerButton = edit ? (
        <span onClick={showModal} style={{ cursor: "pointer" }}>
            Edit
        </span>
    ) : (
        <Button type="primary" icon={<PlusOutlined />} onClick={showModal}>
            New
        </Button>
    );

    return (
        <>
            {triggerButton}

            <Modal
                title={
                    <Space>
                        <SwapOutlined />
                        <span>{edit ? "Edit Transfer" : "Create New Transfer"}</span>
                    </Space>
                }
                open={visible}
                onCancel={handleCancel}
                width={1400}
                footer={[
                    <Button key="cancel" icon={<CloseOutlined />} onClick={handleCancel}>
                        Cancel
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={loading}
                        onClick={handleSubmit}
                        disabled={!fromShopId || !toShopId || transferItems.length === 0}
                    >
                        {edit ? "Update Transfer" : "Create Transfer"}
                    </Button>,
                ]}
            >
                <Form form={form} layout="vertical">
                    <Card size="small" style={{ marginBottom: 16, background: "#f0f5ff" }}>
                        <Form.Item label="Transfer Type" style={{ marginBottom: 16 }}>
                            <Segmented
                                value={transferMode}
                                onChange={(v) => handleModeChange(v as "shop" | "zone")}
                                disabled={edit}
                                options={[
                                    { label: "Shop → Shop", value: "shop" },
                                    { label: "Zone → Zone (same branch)", value: "zone" },
                                ]}
                            />
                        </Form.Item>
                        <Row gutter={16}>
                            <Col span={transferMode === "zone" ? 24 : 12}>
                                <ProFormSelect
                                    name="from_shop_id"
                                    label={transferMode === "zone" ? "Branch" : "From Shop (Source)"}
                                    placeholder={transferMode === "zone" ? "Select branch" : "Select source shop"}
                                    showSearch
                                    rules={[{ required: true, message: "Please select source shop" }]}
                                    request={async () => {
                                        try {
                                            const shops = await fetchAllShops();
                                            return shops.map(shop => ({
                                                label: shop.name,
                                                value: shop._id
                                            }));
                                        } catch (error) {
                                            console.error("Error fetching shops:", error);
                                            message.error("Failed to load shops");
                                            return [];
                                        }
                                    }}
                                    fieldProps={{
                                        onChange: handleFromShopChange,
                                        disabled: edit,
                                    }}
                                />
                            </Col>
                            {transferMode === "shop" && (
                            <Col span={12}>
                                <ProFormSelect
                                    name="to_shop_id"
                                    label="To Shop (Destination)"
                                    placeholder="Select destination shop"
                                    showSearch
                                    rules={[
                                        { required: true, message: "Please select destination shop" },
                                        ({ getFieldValue }) => ({
                                            validator(_, value) {
                                                if (value && value === getFieldValue("from_shop_id") && transferMode === "shop") {
                                                    return Promise.reject(
                                                        new Error("Source and destination shops must be different")
                                                    );
                                                }
                                                return Promise.resolve();
                                            },
                                        }),
                                    ]}
                                    request={async () => {
                                        try {
                                            const shops = await fetchAllShops();
                                            return shops.map(shop => ({
                                                label: shop.name,
                                                value: shop._id
                                            }));
                                        } catch (error) {
                                            console.error("Error fetching shops:", error);
                                            message.error("Failed to load shops");
                                            return [];
                                        }
                                    }}
                                    fieldProps={{
                                        onChange: handleToShopChange,
                                        disabled: edit,
                                    }}
                                />
                            </Col>
                            )}
                        </Row>

                        {transferMode === "zone" && fromShopId && !fromShopZoneEnabled && (
                            <Alert
                                type="warning"
                                showIcon
                                style={{ marginBottom: 16 }}
                                message="Zone inventory is not enabled for this branch"
                                description="You can still move stock between zones, but sales won't deduct from zones until it's enabled under Settings → System Setup → Privacy (Zone Inventory)."
                            />
                        )}

                        {transferMode === "zone" && fromShopId && zones.length === 0 && (
                            <Alert
                                type="info"
                                showIcon
                                style={{ marginBottom: 16 }}
                                message="No zones found for this branch"
                                description="Add table locations (zones) for the branch you're signed into, then try again."
                            />
                        )}

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="expected_delivery_date"
                                    label="Expected Delivery Date"
                                >
                                    <DatePicker
                                        style={{ width: "100%" }}
                                        format="YYYY-MM-DD"
                                        disabledDate={(current) => {
                                            return current && current < dayjs().startOf("day");
                                        }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <ProFormTextArea
                                    name="notes"
                                    label="Transfer Notes"
                                    placeholder="Enter any notes for this transfer"
                                    fieldProps={{
                                        rows: 2,
                                    }}
                                />
                            </Col>
                        </Row>
                    </Card>

                    <Divider orientation="left">
                        <Space>
                            <ShoppingCartOutlined />
                            <span>Transfer Items Mapping</span>
                            <Badge count={transferItems.length} showZero color="blue" />
                        </Space>
                    </Divider>

                    {isZoneMode && (
                        <Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 12 }}>
                            Zone-to-zone transfer — pick a From Zone and a To Zone for each item. Every zone
                            is listed; zones marked "(new)" are added to the item when you save. Items with
                            no zones yet start with all their stock in the From Zone.
                        </Text>
                    )}

                    {!fromShopId || !toShopId ? (
                        <Card>
                            <Text type="secondary">
                                Please select both source and destination shops to add items
                            </Text>
                        </Card>
                    ) : (
                        <>
                            <Table
                                dataSource={transferItems}
                                columns={itemColumns as any}
                                pagination={false}
                                size="small"
                                scroll={{ x: 1200 }}
                                locale={{
                                    emptyText: (
                                        <Space direction="vertical" style={{ padding: "20px 0" }}>
                                            <Text type="secondary">No items added yet</Text>
                                            <Text type="secondary" style={{ fontSize: "12px" }}>
                                                Map products from source shop to destination shop
                                            </Text>
                                            <Button
                                                type="dashed"
                                                icon={<PlusOutlined />}
                                                onClick={addTransferItem}
                                            >
                                                Add Item Mapping
                                            </Button>
                                        </Space>
                                    ),
                                }}
                            />

                            {transferItems.length > 0 && (
                                <Button
                                    type="dashed"
                                    icon={<PlusOutlined />}
                                    onClick={addTransferItem}
                                    style={{ width: "100%", marginTop: 16 }}
                                >
                                    Add Another Item Mapping
                                </Button>
                            )}
                        </>
                    )}

                    {transferItems.length > 0 && (
                        <Card size="small" style={{ marginTop: 16, background: "#f6ffed" }}>
                            <Space direction="vertical" style={{ width: "100%" }}>
                                <Text strong style={{ fontSize: "16px" }}>Transfer Summary</Text>
                                <Space>
                                    <Text strong>Total Items:</Text>
                                    <Badge count={summary.totalItems} showZero color="blue" />
                                </Space>
                                <Space>
                                    <Text strong>Total Quantity:</Text>
                                    <Text>{summary.totalQuantity}</Text>
                                </Space>
                                <Space>
                                    <Text strong>Estimated Value:</Text>
                                    <Text type="success">
                                        {summary.totalValue.toLocaleString("en-KE", {
                                            style: "currency",
                                            currency: "KES",
                                        })}
                                    </Text>
                                </Space>
                            </Space>
                        </Card>
                    )}
                </Form>
            </Modal>
        </>
    );
};

export default AddEditTransferModal;