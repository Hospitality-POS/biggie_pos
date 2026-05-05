import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  Button,
  Form,
  Space,
  Upload,
  message,
  Divider,
  Tag,
  Steps,
  Modal,
  Select,
  Popconfirm,
  InputNumber,
  Input,
  Switch,
} from "antd";
import { ModalForm } from "@ant-design/pro-form";
import {
  EditOutlined,
  PlusOutlined,
  InfoCircleOutlined,
  DollarOutlined,
  UserOutlined,
  SettingOutlined,
  PictureOutlined,
  BarcodeOutlined,
  CameraOutlined,
  InboxOutlined,
  ToolOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import {
  fetchAllCategories,
  fetchSubCategories,
} from "@services/categories";
import { fetchAllSuppliers } from "@services/supplier";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllUnits } from "@services/products";
import ShowConfirm from "@utils/ConfirmUtil";
import { addNewInventory, editInventory } from "@services/inventory";
import { UploadFile } from "antd/lib/upload";
import { ProCard } from "@ant-design/pro-components";
import AddEditVariantModal from "./AddEditVariantModal";

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
interface AddInventoryDialogProps {
  data?: any;
  actionRef?: any;
  edit?: boolean;
  externalOpen?: boolean;
  onExternalClose?: () => void;
}

interface unitType {
  name: string;
  _id: string;
}
interface CategoryType {
  name: string;
  _id: string;
  sub_category?: string;
}
interface SubCategoryType {
  name: string;
  _id: string;
  sub_category: string | { _id: string; name: string };
  category: string | { _id: string; name: string };
  main_category: string | { _id: string; name: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — extract a plain string _id from either a raw string or a
// {value, label} LabeledValue object that antd Select can produce.
// ─────────────────────────────────────────────────────────────────────────────
const extractId = (v: any): string | undefined => {
  if (!v) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v.value) return v.value;
  if (typeof v === "object" && v._id) return v._id;
  return undefined;
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED DROPDOWN FOOTER HELPER
// ─────────────────────────────────────────────────────────────────────────────
const dropdownAddButton = (label: string, onAdd: () => void) => (
  <>
    <Divider style={{ margin: "4px 0" }} />
    <Button
      type="link"
      icon={<PlusOutlined />}
      style={{ width: "100%", textAlign: "left", padding: "4px 8px" }}
      onMouseDown={(e) => {
        e.preventDefault();
        onAdd();
      }}
    >
      {label}
    </Button>
  </>
);

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA BARCODE SCANNER MODAL
// ─────────────────────────────────────────────────────────────────────────────
interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  open,
  onClose,
  onScan,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [scanned, setScanned] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const stopScanner = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    setScanned(null);
    setError(null);
    setLoading(true);

    if (
      location.protocol !== "https:" &&
      location.hostname !== "localhost" &&
      location.hostname !== "127.0.0.1"
    ) {
      setError("Camera access requires HTTPS.");
      setLoading(false);
      return;
    }

    const initCameras = (devices: MediaDeviceInfo[]) => {
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setCameras(videoDevices);
      const back = videoDevices.find(
        (d) =>
          d.label.toLowerCase().includes("back") ||
          d.label.toLowerCase().includes("rear") ||
          d.label.toLowerCase().includes("environment")
      );
      setSelectedCamera(back?.deviceId || videoDevices[0]?.deviceId || "");
      setLoading(false);
    };

    navigator.mediaDevices
      .enumerateDevices()
      .then(initCameras)
      .catch(() => {
        navigator.mediaDevices
          .getUserMedia({ video: true })
          .then(() => navigator.mediaDevices.enumerateDevices())
          .then(initCameras)
          .catch(() => {
            setError(
              "Could not access camera. Allow camera permissions and try again."
            );
            setLoading(false);
          });
      });

    return () => {
      stopScanner();
    };
  }, [open, stopScanner]);

  useEffect(() => {
    if (!open || !selectedCamera || !videoRef.current || loading) return;
    stopScanner();
    setScanned(null);
    setError(null);

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    setScanning(true);

    reader
      .decodeFromVideoDevice(selectedCamera, videoRef.current, (result, err) => {
        if (result) {
          setScanned(result.getText());
          stopScanner();
        }
        if (err && !(err instanceof NotFoundException))
          console.warn("Scanner:", err);
      })
      .catch((e) => {
        setError("Failed to start camera: " + e.message);
        setScanning(false);
      });

    return () => {
      stopScanner();
    };
  }, [open, selectedCamera, loading, stopScanner]);

  const handleConfirm = () => {
    if (scanned) {
      onScan(scanned);
      handleClose();
    }
  };

  const handleClose = () => {
    stopScanner();
    setScanned(null);
    setError(null);
    onClose();
  };

  const handleRescan = () => {
    setScanned(null);
    setError(null);
    const cam = selectedCamera;
    setSelectedCamera("");
    setTimeout(() => setSelectedCamera(cam), 50);
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={420}
      centered
      destroyOnClose
      title={
        <Space>
          <BarcodeOutlined style={{ color: "#6366f1", fontSize: 18 }} />
          <span style={{ fontWeight: 600, fontSize: 15 }}>Scan Barcode</span>
        </Space>
      }
      styles={{ body: { padding: "14px 20px 20px" } }}
    >
      {cameras.length > 1 && (
        <div style={{ marginBottom: 10 }}>
          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            style={{
              width: "100%",
              height: 32,
              borderRadius: 6,
              border: "1px solid #d1d5db",
              padding: "0 8px",
              fontSize: 13,
            }}
          >
            {cameras.map((c, i) => (
              <option key={c.deviceId} value={c.deviceId}>
                {c.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "4/3",
          borderRadius: 10,
          overflow: "hidden",
          background: "#0f172a",
          marginBottom: 12,
        }}
      >
        <video
          ref={videoRef}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: scanned ? "none" : "block",
          }}
          muted
          playsInline
        />

        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: "3px solid #6366f1",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span style={{ color: "#94a3b8", fontSize: 13 }}>
              Starting camera…
            </span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {scanning && !scanned && !loading && (
          <div
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            {[
              {
                top: "20%",
                left: "15%",
                borderTop: "3px solid #6366f1",
                borderLeft: "3px solid #6366f1",
              },
              {
                top: "20%",
                right: "15%",
                borderTop: "3px solid #6366f1",
                borderRight: "3px solid #6366f1",
              },
              {
                bottom: "20%",
                left: "15%",
                borderBottom: "3px solid #6366f1",
                borderLeft: "3px solid #6366f1",
              },
              {
                bottom: "20%",
                right: "15%",
                borderBottom: "3px solid #6366f1",
                borderRight: "3px solid #6366f1",
              },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: 20,
                  height: 20,
                  ...(s as React.CSSProperties),
                }}
              />
            ))}
            <div
              style={{
                position: "absolute",
                left: "15%",
                right: "15%",
                top: "20%",
                height: 2,
                background:
                  "linear-gradient(90deg, transparent, #6366f1, transparent)",
                animation: "scanline 2s ease-in-out infinite",
              }}
            />
            <style>{`@keyframes scanline { 0%,100% { transform: translateY(0); } 50% { transform: translateY(120px); } }`}</style>
            <div
              style={{
                position: "absolute",
                bottom: 10,
                left: 0,
                right: 0,
                textAlign: "center",
              }}
            >
              <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>
                Point camera at barcode
              </span>
            </div>
          </div>
        )}

        {scanned && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(5,150,105,0.95)",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 44, color: "#fff" }}>✓</div>
            <span style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>
              Barcode detected!
            </span>
            <div
              style={{
                background: "rgba(255,255,255,0.15)",
                borderRadius: 8,
                padding: "6px 16px",
              }}
            >
              <code style={{ color: "#fff", fontSize: 14 }}>{scanned}</code>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 12,
            fontSize: 13,
            color: "#dc2626",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        {scanned ? (
          <>
            <Button
              onClick={handleRescan}
              style={{ flex: 1, borderRadius: 8, height: 38 }}
            >
              Scan Again
            </Button>
            <Button
              type="primary"
              onClick={handleConfirm}
              style={{
                flex: 2,
                borderRadius: 8,
                height: 38,
                background: "#059669",
                border: "none",
                fontWeight: 600,
              }}
            >
              Use This Barcode
            </Button>
          </>
        ) : (
          <Button
            onClick={handleClose}
            style={{ flex: 1, borderRadius: 8, height: 38 }}
          >
            Cancel
          </Button>
        )}
      </div>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// USB / BLUETOOTH SCANNER HOOK
// ─────────────────────────────────────────────────────────────────────────────
const useBarcodeScanner = ({
  onScan,
  minLength = 3,
  maxKeystrokeGap = 50,
  enabled = true,
}: {
  onScan: (barcode: string) => void;
  minLength?: number;
  maxKeystrokeGap?: number;
  enabled?: boolean;
}) => {
  const bufferRef = useRef<string>("");
  const lastKeyTime = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable)
        return;
      if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key))
        return;

      const now = Date.now();
      const gap = now - lastKeyTime.current;
      lastKeyTime.current = now;

      if (gap > maxKeystrokeGap && bufferRef.current.length > 0)
        bufferRef.current = "";

      if (e.key === "Enter") {
        const code = bufferRef.current.trim();
        if (code.length >= minLength) onScan(code);
        bufferRef.current = "";
        return;
      }

      if (e.key.length === 1) bufferRef.current += e.key;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const code = bufferRef.current.trim();
        if (code.length >= minLength) onScan(code);
        bufferRef.current = "";
      }, maxKeystrokeGap * 3);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, minLength, maxKeystrokeGap, onScan]);
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const AddEditProInventoryModal: React.FC<AddInventoryDialogProps> = ({
  data,
  actionRef,
  edit,
  externalOpen,
  onExternalClose,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [usageType, setUsageType] = useState<string>("internal");
  const [hasVariants, setHasVariants] = useState<boolean>(false);
  const [variants, setVariants] = useState<any[]>([]);
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<any>(null);

  // ── Inline add modal state ────────────────────────────────────────────────
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addSubCategoryOpen, setAddSubCategoryOpen] = useState(false);
  const [addUomOpen, setAddUomOpen] = useState(false);

  // Derived: is the modal actually visible (handles both controlled & uncontrolled)
  const isOpen = externalOpen !== undefined ? externalOpen : open;

  // ── Sync external open prop ───────────────────────────────────────────────
  useEffect(() => {
    if (externalOpen !== undefined) setOpen(externalOpen);
  }, [externalOpen]);

  const steps = useMemo(
    () => [
      {
        title: "Basic Info",
        icon: <InfoCircleOutlined />,
        description: "Product details",
      },
      {
        title: "Inventory",
        icon: <DollarOutlined />,
        description: "Stock & pricing",
      },
      {
        title: "Supplier",
        icon: <UserOutlined />,
        description: "Supplier details",
      },
      {
        title: "Advanced",
        icon: <SettingOutlined />,
        description: "Optional settings",
      },
      {
        title: "Image",
        icon: <PictureOutlined />,
        description: "Product image",
      },
    ],
    []
  );

  // ── Live queries ──────────────────────────────────────────────────────────
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchAllCategories({}),
    retry: 3,
    networkMode: "always",
    enabled: isOpen,
    staleTime: 0,
  });

  const { data: allSubCategories, isLoading: subCategoriesLoading } = useQuery(
    {
      queryKey: ["subCategories"],
      queryFn: () => fetchSubCategories({}),
      retry: 3,
      networkMode: "always",
      enabled: isOpen,
      staleTime: 0,
    }
  );

  const { data: units, isLoading: unitsLoading } = useQuery({
    queryKey: ["units"],
    queryFn: fetchAllUnits,
    retry: 3,
    networkMode: "always",
    enabled: isOpen,
    staleTime: 0,
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: fetchAllSuppliers,
    retry: 3,
    networkMode: "always",
    enabled: isOpen,
    staleTime: 0,
  });

  // ── Invalidation helpers ──────────────────────────────────────────────────
  const refetchSuppliers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["suppliers"] });
  }, [queryClient]);

  const refetchCategories = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    queryClient.invalidateQueries({ queryKey: ["subCategories"] });
    queryClient.invalidateQueries({ queryKey: ["mainCategories"] });
  }, [queryClient]);

  const refetchUnits = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["units"] });
  }, [queryClient]);

  useBarcodeScanner({
    enabled: isOpen && !scannerOpen,
    onScan: useCallback(
      (code: string) => {
        form.setFieldValue("barcode", code);
        message.success(`Barcode scanned: ${code}`);
      },
      [form]
    ),
  });

  const handleCategoryChange = useCallback(
    (categoryId: string) => {
      const id = extractId(categoryId) ?? categoryId;
      setSelectedCategory(id);
      form.setFieldValue("subcategory_id", undefined);
    },
    [form]
  );

  const filteredCategories = useMemo(() => {
    if (!selectedCategory || !categories || !allSubCategories) return [];
    
    // Find the selected subcategory and get categories that point to it
    return categories.filter((c: CategoryType) => {
      const subCategoryId = typeof c.sub_category === "object"
        ? c.sub_category._id
        : c.sub_category;
      return subCategoryId === selectedCategory;
    });
  }, [categories, selectedCategory, allSubCategories]);

  const totalVariantQuantity = useMemo(() => {
    if (!hasVariants || variants.length === 0) return 0;
    return variants.reduce((total, v) => total + (Number(v.quantity) || 0), 0);
  }, [hasVariants, variants]);

  useEffect(() => {
    if (hasVariants && variants.length > 0) {
      form.setFieldValue("quantity", totalVariantQuantity);
    }
  }, [hasVariants, variants, totalVariantQuantity, form]);

  // ── Reset helpers ─────────────────────────────────────────────────────────
  const resetAll = useCallback(() => {
    form.resetFields();
    setFileList([]);
    setUploadedFile(null);
    setUsageType("internal");
    setHasVariants(false);
    setVariants([]);
    setCurrentStep(0);
    setSelectedCategory(null);
    setScannerOpen(false);
    setVariantModalOpen(false);
    setEditingVariant(null);
  }, [form]);

  // ── Prefill on edit ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    if (edit && data) {
      const categoryId = extractId(data?.category_id);
      const subcategoryId = extractId(data?.subcategory_id);
      const unitId = extractId(data?.unit_id);
      const supplierId = extractId(data?.supplier_id);

      
      // Wait for categories and subcategories to be loaded before setting form values
      if (!categoriesLoading && !subCategoriesLoading && !unitsLoading) {
        // Set selectedCategory to the subcategory_id for proper filtering (since Category field now shows subcategories)
        if (subcategoryId) {
          setSelectedCategory(subcategoryId);
        }
        
        // Small delay to ensure state update is processed
        setTimeout(() => {
          form.setFieldsValue({
            name: data?.name || "",
            usage_type: data?.usage_type || "internal",
            category: subcategoryId, // Category field now shows subcategories
            subcategory_id: categoryId, // Sub Category field now shows categories
            unit_id: unitId,
            supplier_id: supplierId,
            manufacturer: data?.manufacturer || "",
            barcode: data?.barcode || "",
            location: data?.location || "",
            desc: data?.desc || "",
            vat_type: data?.vat_type || "STANDARD",
            status: data?.status || "active",
            has_variants: data?.has_variants || false,
            quantity: data?.quantity || 0,
            min_viable_quantity: data?.min_viable_quantity || 0,
            supplier_price: data?.supplier_price || 0,
            price: data?.price || 0,
            dimensions: data?.dimensions || "",
            weight: data?.weight || undefined,
            reorder_level: data?.reorder_level || undefined,
            reorder_quantity: data?.reorder_quantity || undefined,
            code: data?.code || "",
          });
        }, 0);

        setUsageType(data?.usage_type || "internal");
        setHasVariants(data?.has_variants || false);
        // Ensure variants have id field for rendering (use _id if id doesn't exist)
        const variantsWithId = (data?.variants || []).map((variant: any) => ({
          ...variant,
          id: variant.id || variant._id
        }));
        setVariants(variantsWithId);
      }
    } else {
      form.resetFields();
      form.setFieldsValue({
        usage_type: "internal",
        has_variants: false,
        vat_type: "STANDARD",
        status: "active",
      });
      setUsageType("internal");
      setHasVariants(false);
      setVariants([]);
      setCurrentStep(0);
      setSelectedCategory(null);
    }
  }, [isOpen, edit, data, form, categoriesLoading, subCategoriesLoading, unitsLoading, categories, allSubCategories, units]);

  // ── Variant modal submit ──────────────────────────────────────────────────
  const handleVariantSubmit = useCallback(
    (variantData: any) => {
      let updatedVariants: any[];

      if (editingVariant) {
        updatedVariants = variants.map((v) =>
          v.id === editingVariant.id ? { ...variantData, id: editingVariant.id } : v
        );
        message.success("Variant updated successfully");
      } else {
        const newVariant = {
          ...variantData,
          id: Date.now().toString(),
        };
        updatedVariants = [...variants, newVariant];
        message.success("Variant added successfully");
      }

      setVariants(updatedVariants);
      form.setFieldValue("variants", updatedVariants);
      form.setFieldValue("has_variants", true);
      setHasVariants(true);
      setVariantModalOpen(false);
      setEditingVariant(null);
    },
    [editingVariant, variants, form]
  );

  const handleDeleteVariant = useCallback(
    (variantId: string) => {
      const updatedVariants = variants.filter((v) => v.id !== variantId);
      setVariants(updatedVariants);
      form.setFieldValue("variants", updatedVariants);
      if (updatedVariants.length === 0) {
        form.setFieldValue("quantity", 0);
      }
      message.success("Variant deleted");
    },
    [variants, form]
  );

  // ── Form submission ───────────────────────────────────────────────────────
  const handleFormSubmit = async () => {
    try {
      // Validate all fields across all steps
      await form.validateFields();

      const confirmed = await ShowConfirm({
        title: `Are you sure you want to ${edit ? "update this" : "add new"} Inventory?`,
        position: true,
      });

      if (!confirmed) return false;

      const values = form.getFieldsValue(true);

      const payload: Record<string, any> = {
        name: values.name,
        usage_type: values.usage_type,
        category: extractId(values.category),
        subcategory_id: extractId(values.subcategory_id),
        unit_id: extractId(values.unit_id),
        supplier_id: extractId(values.supplier_id),
        manufacturer: values.manufacturer,
        barcode: values.barcode,
        location: values.location,
        desc: values.desc,
        vat_type: values.vat_type,
        status: values.status,
        quantity: Number(values.quantity) || 0,
        min_viable_quantity: values.min_viable_quantity
          ? Number(values.min_viable_quantity)
          : undefined,
        supplier_price: values.supplier_price
          ? Number(values.supplier_price)
          : undefined,
        price: values.price ? Number(values.price) : undefined,
        dimensions: values.dimensions,
        weight: values.weight ? Number(values.weight) : undefined,
        reorder_level: values.reorder_level
          ? Number(values.reorder_level)
          : undefined,
        reorder_quantity: values.reorder_quantity
          ? Number(values.reorder_quantity)
          : undefined,
        has_variants: hasVariants,
        variants: hasVariants && variants.length > 0 ? variants : undefined,
        code: values.code,
      };

      // Strip undefined/empty-string fields
      Object.keys(payload).forEach((k) => {
        if (payload[k] === undefined || payload[k] === "") delete payload[k];
      });

      if (uploadedFile) payload.imageFile = uploadedFile;

      if (edit) {
        await editInventory({ values: payload, _id: data?._id });
      } else {
        await addNewInventory(payload);
      }

      actionRef?.current?.reload?.();
      message.success(`Inventory ${edit ? "updated" : "added"} successfully`);
      handleClose();
      return true;
    } catch (e: any) {
      // AntD validate throws an object with errorFields — surface it nicely
      if (e?.errorFields?.length) {
        message.error("Please fill in all required fields");
        // Jump to first step that has an error
        const errorField = e.errorFields[0]?.name?.[0];
        const stepFieldMap: Record<string, number> = {
          name: 0,
          usage_type: 0,
          category: 0,
          subcategory_id: 0,
          unit_id: 0,
          vat_type: 0,
          quantity: 1,
          price: 1,
          status: 3,
        };
        if (errorField && stepFieldMap[errorField] !== undefined) {
          setCurrentStep(stepFieldMap[errorField]);
        }
      } else {
        console.error("Form submit error:", e);
        message.error("An unexpected error occurred");
      }
      return false;
    }
  };

  const handleClose = useCallback(() => {
    resetAll();
    setOpen(false);
    onExternalClose?.();
  }, [resetAll, onExternalClose]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        handleClose();
      } else {
        setOpen(true);
      }
    },
    [handleClose]
  );

  // ── Usage type options ────────────────────────────────────────────────────
  const UsageTypeOptions = useMemo(
    () => [
      {
        label: (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ToolOutlined />
            <span>Internal Use</span>
            <Tag color="orange">INTERNAL</Tag>
          </div>
        ),
        value: "internal",
      },
      {
        label: (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShoppingCartOutlined />
            <span>For Sale</span>
            <Tag color="green">SELLING</Tag>
          </div>
        ),
        value: "selling",
      },
      {
        label: (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SwapOutlined />
            <span>Both</span>
            <Tag color="blue">BOTH</Tag>
          </div>
        ),
        value: "both",
      },
    ],
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // STEP CONTENT
  // ─────────────────────────────────────────────────────────────────────────
  const renderStepContent = useCallback(() => {
    switch (currentStep) {
      // ── Step 0: Basic Info ──────────────────────────────────────────────
      case 0:
        return (
          <ProCard title="Basic Information" size="small">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <Form.Item
                name="name"
                label="Product Name"
                rules={[{ required: true, message: "Product name is required" }]}
              >
                <Input placeholder="Enter product name" />
              </Form.Item>

              <Form.Item
                name="code"
                label="Product Code"
              >
                <Input placeholder="Enter product code (optional)" />
              </Form.Item>

              <Form.Item
                name="usage_type"
                label="Usage Type"
                rules={[{ required: true, message: "Usage type is required" }]}
              >
                <Select
                  placeholder="Select usage type"
                  options={UsageTypeOptions}
                  onChange={(v) => {
                    setUsageType(v);
                    if (v === "internal") form.setFieldValue("price", undefined);
                  }}
                />
              </Form.Item>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <Form.Item
                name="category"
                label="Category"
                rules={[{ required: true, message: "Category is required" }]}
              >
                <Select
                  showSearch
                  placeholder="Select category"
                  optionFilterProp="label"
                  loading={subCategoriesLoading}
                  options={
                    allSubCategories?.map((s: SubCategoryType) => ({
                      label: s.name,
                      value: s._id,
                    })) || []
                  }
                  onChange={handleCategoryChange}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      {dropdownAddButton("Add New Category", () =>
                        setAddSubCategoryOpen(true)
                      )}
                    </>
                  )}
                />
              </Form.Item>

              <Form.Item
                name="subcategory_id"
                label="Sub Category"
                rules={[{ required: true, message: "Sub category is required" }]}
              >
                <Select
                  showSearch
                  placeholder={
                    selectedCategory
                      ? "Select sub category"
                      : "Select category first"
                  }
                  optionFilterProp="label"
                  disabled={!selectedCategory}
                  loading={categoriesLoading}
                  options={filteredCategories.map((c: CategoryType) => ({
                    label: c.name,
                    value: c._id,
                  }))}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      {dropdownAddButton("Add New Sub Category", () =>
                        setAddCategoryOpen(true)
                      )}
                    </>
                  )}
                />
              </Form.Item>

              <Form.Item
                name="unit_id"
                label="Unit of Measure"
                rules={[{ required: true, message: "Unit is required" }]}
              >
                <Select
                  showSearch
                  placeholder="Select unit"
                  optionFilterProp="label"
                  loading={unitsLoading}
                  options={
                    units?.map((u: unitType) => ({
                      label: u.name,
                      value: u._id,
                    })) || []
                  }
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      {dropdownAddButton("Add New Unit", () =>
                        setAddUomOpen(true)
                      )}
                    </>
                  )}
                />
              </Form.Item>

              <Form.Item
                name="vat_type"
                label="VAT Type"
                rules={[{ required: true, message: "VAT type is required" }]}
                tooltip="Standard (16%), Zero Rated (0%) or Exempt (0%)"
              >
                <Select
                  placeholder="Select VAT type"
                  options={[
                    { label: "Standard (16%)", value: "STANDARD" },
                    { label: "Zero Rated (0%)", value: "ZERO" },
                    { label: "Exempt (0%)", value: "EXEMPT" },
                  ]}
                />
              </Form.Item>
            </div>

            <Form.Item name="desc" label="Description">
              <Input.TextArea
                placeholder="Enter product description"
                rows={3}
              />
            </Form.Item>
          </ProCard>
        );

      // ── Step 1: Inventory & Pricing ─────────────────────────────────────
      case 1:
        return (
          <ProCard title="Inventory & Pricing" size="small">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <Form.Item
                name="quantity"
                label={
                  <span>
                    Current Quantity
                    {hasVariants && (
                      <Tag color="blue" style={{ marginLeft: 8 }}>
                        Auto-calculated
                      </Tag>
                    )}
                  </span>
                }
                rules={[{ required: true, message: "Quantity is required" }]}
              >
                <InputNumber
                  placeholder="Enter quantity"
                  min={0}
                  style={{ width: "100%" }}
                  disabled={hasVariants}
                  addonAfter={
                    hasVariants ? `(${totalVariantQuantity} total)` : undefined
                  }
                />
              </Form.Item>

              <Form.Item name="min_viable_quantity" label="Minimum Stock Level">
                <InputNumber
                  placeholder="Minimum stock"
                  min={0}
                  style={{ width: "100%" }}
                />
              </Form.Item>

              <Form.Item name="supplier_price" label="Supplier Price (Optional)">
                <InputNumber
                  placeholder="Supplier price"
                  min={0}
                  style={{ width: "100%" }}
                  addonBefore="Ksh."
                />
              </Form.Item>

              <Form.Item
                name="price"
                label="Selling Price"
                rules={[
                  {
                    required:
                      usageType === "selling" || usageType === "both",
                    message: "Selling price is required for sellable items",
                  },
                ]}
              >
                <InputNumber
                  placeholder="Selling price"
                  min={0}
                  style={{ width: "100%" }}
                  addonBefore="Ksh."
                  disabled={usageType === "internal"}
                />
              </Form.Item>
            </div>

            {/* Variants toggle */}
            <Form.Item
              label="Track Inventory by Variants"
              style={{ marginBottom: 16 }}
            >
              <Space direction="vertical" size={4}>
                <Switch
                  checked={hasVariants}
                  onChange={(checked) => {
                    setHasVariants(checked);
                    form.setFieldValue("has_variants", checked);
                    form.setFieldValue("quantity", 0);
                    if (checked) {
                      message.info(
                        "Set individual quantities per variant below."
                      );
                    }
                  }}
                />
                <div style={{ fontSize: 12, color: "#666" }}>
                  {hasVariants
                    ? "Inventory tracked per variant (e.g., colour, size)."
                    : "Inventory tracked at product level."}
                </div>
              </Space>
            </Form.Item>

            {/* Variants list */}
            {hasVariants && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                    Product Variants
                  </h4>
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingVariant(null);
                      setVariantModalOpen(true);
                    }}
                  >
                    Add Variant
                  </Button>
                </div>

                {variants.length === 0 ? (
                  <div
                    style={{
                      border: "1px dashed #d9d9d9",
                      borderRadius: 8,
                      padding: 24,
                      backgroundColor: "#fafafa",
                      textAlign: "center",
                      color: "#aaa",
                    }}
                  >
                    <div style={{ fontSize: 14 }}>No variants added yet</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      Click "Add Variant" above to create product variants
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      border: "1px solid #e8e8e8",
                      borderRadius: 8,
                      backgroundColor: "#fafafa",
                      overflow: "hidden",
                    }}
                  >
                    {variants.map((variant, index) => (
                      <div
                        key={variant.id || index}
                        style={{
                          padding: "12px 16px",
                          borderBottom:
                            index < variants.length - 1
                              ? "1px solid #e8e8e8"
                              : "none",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 500,
                              marginBottom: 4,
                              fontSize: 14,
                            }}
                          >
                            {variant.name || `Variant ${index + 1}`}
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            {variant.attributes &&
                              Object.entries(variant.attributes).map(
                                ([key, value]) => (
                                  <Tag key={key} style={{ fontSize: 11 }}>
                                    {key}: {String(value)}
                                  </Tag>
                                )
                              )}
                          </div>
                          <div style={{ fontSize: 12, color: "#888" }}>
                            SKU: {variant.sku || "—"} &nbsp;|&nbsp; Qty:{" "}
                            {variant.quantity ?? 0} &nbsp;|&nbsp; Price: KES{" "}
                            {Number(variant.price || 0).toFixed(2)}
                          </div>
                        </div>

                        <Space>
                          <Button
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => {
                              setEditingVariant(variant);
                              setVariantModalOpen(true);
                            }}
                          />
                          <Popconfirm
                            title="Delete variant?"
                            description="This action cannot be undone."
                            onConfirm={() => handleDeleteVariant(variant.id)}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button
                              icon={<DeleteOutlined />}
                              danger
                              size="small"
                            />
                          </Popconfirm>
                        </Space>
                      </div>
                    ))}

                    {/* Totals row */}
                    <div
                      style={{
                        padding: "10px 16px",
                        background: "#f0f5ff",
                        borderTop: "1px solid #e8e8e8",
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 24,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#1677ff",
                      }}
                    >
                      <span>Total Variants: {variants.length}</span>
                      <span>Total Qty: {totalVariantQuantity}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ProCard>
        );

      // ── Step 2: Supplier ────────────────────────────────────────────────
      case 2:
        return (
          <ProCard title="Supplier Information" size="small">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <Form.Item name="supplier_id" label="Supplier">
                <Select
                  showSearch
                  placeholder="Select supplier"
                  optionFilterProp="label"
                  options={
                    suppliers?.map((s: any) => ({
                      label: s.name,
                      value: s._id,
                    })) || []
                  }
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      {dropdownAddButton("Add New Supplier", () =>
                        setAddSupplierOpen(true)
                      )}
                    </>
                  )}
                />
              </Form.Item>

              <Form.Item name="manufacturer" label="Manufacturer">
                <Input placeholder="Enter manufacturer name" />
              </Form.Item>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <Form.Item name="barcode" label="Barcode">
                <Input
                  placeholder="Enter or scan barcode"
                  addonAfter={
                    <Button
                      type="link"
                      size="small"
                      icon={<CameraOutlined />}
                      onClick={() => setScannerOpen(true)}
                    >
                      Scan
                    </Button>
                  }
                />
              </Form.Item>

              <Form.Item name="location" label="Storage Location">
                <Input placeholder="e.g. Shelf A3, Warehouse B" />
              </Form.Item>
            </div>
          </ProCard>
        );

      // ── Step 3: Advanced ────────────────────────────────────────────────
      case 3:
        return (
          <ProCard title="Advanced Settings" size="small">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true, message: "Status is required" }]}
              >
                <Select
                  options={[
                    { label: "Active", value: "active" },
                    { label: "Inactive", value: "inactive" },
                    { label: "Discontinued", value: "discontinued" },
                  ]}
                />
              </Form.Item>

              <Form.Item name="dimensions" label="Dimensions">
                <Input placeholder="e.g. 10x5x2 cm" />
              </Form.Item>

              <Form.Item name="weight" label="Weight (kg)">
                <InputNumber
                  placeholder="0.00"
                  min={0}
                  precision={2}
                  step={0.01}
                  style={{ width: "100%" }}
                />
              </Form.Item>

              <Form.Item name="reorder_level" label="Reorder Level">
                <InputNumber
                  placeholder="Minimum qty to trigger reorder"
                  min={0}
                  style={{ width: "100%" }}
                />
              </Form.Item>

              <Form.Item name="reorder_quantity" label="Reorder Quantity">
                <InputNumber
                  placeholder="Quantity to reorder"
                  min={0}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </div>
          </ProCard>
        );

      // ── Step 4: Image ───────────────────────────────────────────────────
      case 4:
        return (
          <ProCard title="Product Image" size="small">
            <Form.Item name="image" label="Product Image">
              <Upload.Dragger
                name="image"
                listType="picture"
                fileList={fileList}
                beforeUpload={(file) => {
                  if (!file.type.startsWith("image/")) {
                    message.error("Images only!");
                    return false;
                  }
                  if (file.size / 1024 / 1024 > 5) {
                    message.error("Max 5MB!");
                    return false;
                  }
                  setUploadedFile(file);
                  return false; // Prevent auto-upload
                }}
                onChange={({ fileList: newFileList }) => {
                  setFileList(newFileList);
                  if (newFileList.length === 0) setUploadedFile(null);
                }}
                onRemove={() => setUploadedFile(null)}
                maxCount={1}
                accept="image/*"
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ fontSize: 48, color: "#40a9ff" }} />
                </p>
                <p className="ant-upload-text">Click or drag file to upload</p>
                <p className="ant-upload-hint">
                  Single image, max 5 MB (optional)
                </p>
              </Upload.Dragger>
            </Form.Item>
          </ProCard>
        );

      default:
        return null;
    }
  }, [
    currentStep,
    form,
    hasVariants,
    variants,
    totalVariantQuantity,
    usageType,
    UsageTypeOptions,
    categories,
    categoriesLoading,
    selectedCategory,
    subCategoriesLoading,
    filteredCategories,
    units,
    unitsLoading,
    suppliers,
    handleCategoryChange,
    handleDeleteVariant,
    fileList,
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // NAVIGATION FOOTER
  // ─────────────────────────────────────────────────────────────────────────
  const renderFooter = () => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: 24,
      }}
    >
      <Button
        onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
        disabled={currentStep === 0}
        style={{ borderRadius: 8 }}
      >
        Previous
      </Button>

      <Space>
        {currentStep < steps.length - 1 ? (
          <Button
            type="primary"
            onClick={() => setCurrentStep((s) => Math.min(steps.length - 1, s + 1))}
            style={{ borderRadius: 8 }}
          >
            Next
          </Button>
        ) : (
          <Button
            type="primary"
            onClick={handleFormSubmit}
            style={{ borderRadius: 8 }}
          >
            {edit ? "Update Inventory" : "Add Inventory"}
          </Button>
        )}
      </Space>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // MODAL CONTENT (shared between controlled & uncontrolled modes)
  // ─────────────────────────────────────────────────────────────────────────
  const modalContent = (
    <div style={{ maxWidth: "100%", margin: "0 auto" }}>
      <Steps
        current={currentStep}
        items={steps}
        style={{ marginBottom: 24 }}
        size="small"
      />
      {renderStepContent()}
      {renderFooter()}
    </div>
  );

  const modalTitle = (
    <Space>
      <EditOutlined style={{ color: "#6366f1", fontSize: 18 }} />
      <span style={{ fontWeight: 600, fontSize: 15 }}>
        {edit ? "Edit Inventory" : "Add New Inventory"}
      </span>
    </Space>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Trigger button (only when not externally controlled) ── */}
      {externalOpen === undefined && (
        <>
          {edit && data ? (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => setOpen(true)}
              style={{ borderRadius: 8, width: "100%" }}
            >
              Edit
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setOpen(true)}
              style={{ borderRadius: 8 }}
            >
              Add Inventory
            </Button>
          )}
        </>
      )}

      {/* ── Main ModalForm ── */}
      <ModalForm
        title={modalTitle}
        open={isOpen}
        onOpenChange={handleOpenChange}
        form={form}
        onFinish={handleFormSubmit}
        submitter={false}
        width={1000}
        modalProps={{
          destroyOnClose: true,
          centered: true,
          maskClosable: false,
          onCancel: handleClose,
          styles: { body: { padding: "24px" } },
        }}
      >
        {modalContent}
      </ModalForm>

      {/* ── Camera barcode scanner ── */}
      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => {
          form.setFieldValue("barcode", code);
          message.success(`Barcode scanned: ${code}`);
          setScannerOpen(false);
        }}
      />

      {/* ── Variant add/edit modal ── */}
      <AddEditVariantModal
        open={variantModalOpen}
        onClose={() => {
          setVariantModalOpen(false);
          setEditingVariant(null);
        }}
        onSubmit={handleVariantSubmit}
        editingVariant={editingVariant}
        productName={form.getFieldValue("name")}
      />
    </>
  );
};

export default AddEditProInventoryModal;