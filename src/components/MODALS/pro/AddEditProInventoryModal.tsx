import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Button, Form, Space, Upload, message, Card, Divider, Tag, Alert, Steps, Tooltip, Modal } from "antd";
import {
  ModalForm,
  ProFormText,
  ProForm,
  ProFormTextArea,
  ProFormDigit,
  ProFormSelect,
  ProFormMoney,
} from "@ant-design/pro-form";
import {
  EditOutlined,
  ReconciliationOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  ToolOutlined,
  SwapOutlined,
  InfoCircleOutlined,
  DollarOutlined,
  UserOutlined,
  SettingOutlined,
  PictureOutlined,
  LeftOutlined,
  RightOutlined,
  BarcodeOutlined,
  CameraOutlined,
} from "@ant-design/icons";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { fetchSubCategories as fetchAllCategories, fetchAllCategories as fetchSubCategories } from "@services/categories";
import { fetchAllSuppliers } from "@services/supplier";
import { useQuery } from "@tanstack/react-query";
import { fetchAllUnits } from "@services/products";
import ShowConfirm from "@utils/ConfirmUtil";
import { addNewInventory, editInventory } from "@services/inventory";
import { RcFile } from "antd/lib/upload";
import { UploadFile, UploadProps } from "antd/lib";
import { ProCard } from "@ant-design/pro-components";

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA BARCODE SCANNER MODAL
// ─────────────────────────────────────────────────────────────────────────────
interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ open, onClose, onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [scanned, setScanned] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const stopScanner = useCallback(() => {
    if (readerRef.current) { readerRef.current.reset(); readerRef.current = null; }
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    setScanned(null); setError(null); setLoading(true);

    if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      setError("Camera access requires HTTPS. Open the app via https:// on your network.");
      console.error("[BarcodeScanner] Camera blocked: must be served over HTTPS. Run: npm install -D vite-plugin-mkcert and add mkcert() to vite.config.ts.");
      setLoading(false);
      return;
    }

    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const videoDevices = devices.filter(d => d.kind === "videoinput");
        setCameras(videoDevices);
        const back = videoDevices.find(d =>
          d.label.toLowerCase().includes("back") ||
          d.label.toLowerCase().includes("rear") ||
          d.label.toLowerCase().includes("environment")
        );
        setSelectedCamera(back?.deviceId || videoDevices[0]?.deviceId || "");
        setLoading(false);
      })
      .catch(() => {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(() => navigator.mediaDevices.enumerateDevices())
          .then(devices => {
            const videoDevices = devices.filter(d => d.kind === "videoinput");
            setCameras(videoDevices);
            const back = videoDevices.find(d =>
              d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("rear") ||
              d.label.toLowerCase().includes("environment")
            );
            setSelectedCamera(back?.deviceId || videoDevices[0]?.deviceId || "");
            setLoading(false);
          })
          .catch(() => {
            setError("Could not access camera. Allow camera permissions and try again.");
            setLoading(false);
          });
      });

    return () => { stopScanner(); };
  }, [open, stopScanner]);

  useEffect(() => {
    if (!open || !selectedCamera || !videoRef.current || loading) return;
    stopScanner();
    setScanned(null); setError(null);
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    setScanning(true);
    reader.decodeFromVideoDevice(selectedCamera, videoRef.current, (result, err) => {
      if (result) { setScanned(result.getText()); stopScanner(); }
      if (err && !(err instanceof NotFoundException)) console.warn("Scanner:", err);
    }).catch(e => { setError("Failed to start camera: " + e.message); setScanning(false); });
    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedCamera, loading]);

  const handleConfirm = () => { if (scanned) { onScan(scanned); handleClose(); } };
  const handleClose = () => { stopScanner(); setScanned(null); setError(null); onClose(); };
  const handleRescan = () => {
    setScanned(null); setError(null);
    const cam = selectedCamera;
    setSelectedCamera("");
    setTimeout(() => setSelectedCamera(cam), 50);
  };

  return (
    <Modal
      open={open} onCancel={handleClose} footer={null} width={420} centered destroyOnClose
      title={<Space><BarcodeOutlined style={{ color: "#6366f1", fontSize: 18 }} /><span style={{ fontWeight: 600, fontSize: 15 }}>Scan Barcode</span></Space>}
      styles={{ body: { padding: "14px 20px 20px" } }}
    >
      {cameras.length > 1 && (
        <div style={{ marginBottom: 10 }}>
          <select value={selectedCamera} onChange={e => setSelectedCamera(e.target.value)}
            style={{ width: "100%", height: 32, borderRadius: 6, border: "1px solid #d1d5db", padding: "0 8px", fontSize: 13 }}>
            {cameras.map((c, i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${i + 1}`}</option>)}
          </select>
        </div>
      )}

      <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", borderRadius: 10, overflow: "hidden", background: "#0f172a", marginBottom: 12 }}>
        <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover", display: scanned ? "none" : "block" }} muted playsInline />
        {loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
            <div style={{ width: 32, height: 32, border: "3px solid #6366f1", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <span style={{ color: "#94a3b8", fontSize: 13 }}>Starting camera…</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        {scanning && !scanned && !loading && (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {[
              { top: "20%", left: "15%", borderTop: "3px solid #6366f1", borderLeft: "3px solid #6366f1" },
              { top: "20%", right: "15%", borderTop: "3px solid #6366f1", borderRight: "3px solid #6366f1" },
              { bottom: "20%", left: "15%", borderBottom: "3px solid #6366f1", borderLeft: "3px solid #6366f1" },
              { bottom: "20%", right: "15%", borderBottom: "3px solid #6366f1", borderRight: "3px solid #6366f1" },
            ].map((s, i) => <div key={i} style={{ position: "absolute", width: 20, height: 20, ...s as React.CSSProperties }} />)}
            <div style={{ position: "absolute", left: "15%", right: "15%", top: "20%", height: 2, background: "linear-gradient(90deg, transparent, #6366f1, transparent)", animation: "scanline 2s ease-in-out infinite" }} />
            <style>{`@keyframes scanline { 0%,100% { transform: translateY(0); } 50% { transform: translateY(120px); } }`}</style>
            <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, textAlign: "center" }}>
              <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>Point camera at barcode</span>
            </div>
          </div>
        )}
        {scanned && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,150,105,0.95)", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 44, color: "#fff" }}>✓</div>
            <span style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>Barcode detected!</span>
            <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "6px 16px" }}>
              <code style={{ color: "#fff", fontSize: 14 }}>{scanned}</code>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#dc2626" }}>{error}</div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        {scanned ? (
          <>
            <Button onClick={handleRescan} style={{ flex: 1, borderRadius: 8, height: 38 }}>Scan Again</Button>
            <Button type="primary" onClick={handleConfirm} style={{ flex: 2, borderRadius: 8, height: 38, background: "#059669", border: "none", fontWeight: 600 }}>Use This Barcode</Button>
          </>
        ) : (
          <Button onClick={handleClose} style={{ flex: 1, borderRadius: 8, height: 38 }}>Cancel</Button>
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
      if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)) return;
      const now = Date.now();
      const gap = now - lastKeyTime.current;
      lastKeyTime.current = now;
      if (gap > maxKeystrokeGap && bufferRef.current.length > 0) bufferRef.current = "";
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
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
interface inventory {
  name: string;
  quantity: number;
  supplier_price: number;
  price: number;
  min_viable_quantity: number;
  category: string;
  subcategory_id: string;
  supplier_id: string;
  unit_id: string;
  desc: string;
  usage_type: 'selling' | 'internal' | 'both';
  barcode?: string;
  location?: string;
  manufacturer?: string;
  status: 'active' | 'inactive' | 'discontinued';
  dimensions?: { length: number; width: number; height: number; unit: string; };
  weight?: { value: number; unit: string; };
  vat_type: 'STANDARD' | 'ZERO' | 'EXEMPT';
}

interface AddInventoryDialogProps {
  data?: any;
  actionRef?: any;
  edit?: boolean;
}

interface unitType { name: string; _id: string; }
interface CategoryType { name: string; _id: string; sub_category?: string; }
interface SubCategoryType {
  name: string; _id: string;
  sub_category: string | { _id: string; name: string };
  category: string | { _id: string; name: string };
  main_category: string | { _id: string; name: string };
}

const { Step } = Steps;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const AddEditProInventoryModal: React.FC<AddInventoryDialogProps> = ({ data, actionRef, edit }) => {
  const [form] = Form.useForm();

  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [usageType, setUsageType] = useState<string>('internal');
  const [stepData, setStepData] = useState<{ [key: number]: any }>({ 0: {}, 1: {}, 2: {}, 3: {}, 4: {} });

  const steps = useMemo(() => [
    { title: 'Basic Info', icon: <InfoCircleOutlined />, description: 'Product details' },
    { title: 'Inventory', icon: <DollarOutlined />, description: 'Stock & pricing' },
    { title: 'Supplier', icon: <UserOutlined />, description: 'Supplier details' },
    { title: 'Advanced', icon: <SettingOutlined />, description: 'Optional settings' },
    { title: 'Image', icon: <PictureOutlined />, description: 'Product image' },
  ], []);

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: () => fetchAllCategories({}), retry: 3, refetchInterval: 5000, networkMode: "always" });
  const { data: allSubCategories } = useQuery({ queryKey: ["subCategories"], queryFn: () => fetchSubCategories({}), retry: 3, refetchInterval: 5000, networkMode: "always" });
  const { data: units } = useQuery({ queryKey: ["units"], queryFn: fetchAllUnits, retry: 3, refetchInterval: 5000, networkMode: "always" });
  const { data: suppliers } = useQuery({ queryKey: ["suppliers"], queryFn: fetchAllSuppliers, retry: 3, refetchInterval: 5000, networkMode: "always" });

  // USB/Bluetooth scanner — active when modal is open, populates the form field directly
  useBarcodeScanner({
    enabled: open && !scannerOpen,
    onScan: useCallback((code: string) => {
      form.setFieldValue("barcode", code);
      if (currentStep !== 2) {
        message.info(`Barcode scanned: ${code} — navigate to Supplier step to confirm`);
      } else {
        message.success(`Barcode scanned: ${code}`);
      }
    }, [form, currentStep]),
  });

  const handleCategoryChange = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    form.setFieldValue('subcategory_id', undefined);
  }, [form]);

  const CategoriesRequest = useCallback(async () =>
    categories?.map((c: CategoryType) => ({ label: c.name, value: c._id })) || [], [categories]);

  const SubCategoriesRequest = useCallback(async () => {
    if (!selectedCategory || !allSubCategories) return [];
    return allSubCategories
      .filter((s: SubCategoryType) => {
        if (typeof s.sub_category === 'string') return s.sub_category === selectedCategory;
        if (typeof s.sub_category === 'object' && s.sub_category?._id) return s.sub_category._id === selectedCategory;
        return false;
      })
      .map((s: SubCategoryType) => ({ label: s.name, value: s._id }));
  }, [selectedCategory, allSubCategories]);

  const UnitsRequest = useCallback(async () =>
    units?.map((u: unitType) => ({ label: u.name, value: u._id })) || [], [units]);

  const SuppliersRequest = useCallback(async () =>
    suppliers?.map((s: { name: string; _id: string }) => ({ label: s.name, value: s._id })) || [], [suppliers]);

  const saveCurrentStepData = useCallback(() => {
    try {
      const v = form.getFieldsValue();
      setStepData(prev => {
        const next = { ...prev };
        switch (currentStep) {
          case 0: next[0] = { name: v.name, usage_type: v.usage_type, category: v.category, subcategory_id: v.subcategory_id, unit_id: v.unit_id, desc: v.desc, vat_type: v.vat_type }; break;
          case 1: next[1] = { quantity: v.quantity, min_viable_quantity: v.min_viable_quantity, supplier_price: v.supplier_price, price: v.price }; break;
          // ── barcode is now a proper ProFormText field — form.getFieldsValue() includes it ──
          case 2: next[2] = { supplier_id: v.supplier_id, manufacturer: v.manufacturer, barcode: v.barcode, location: v.location }; break;
          case 3: next[3] = { status: v.status, dimensions: v.dimensions, weight: v.weight }; break;
          case 4: next[4] = { image: uploadedFile }; break;
        }
        return next;
      });
    } catch (e) { console.error('saveCurrentStepData:', e); }
  }, [form, currentStep, uploadedFile]);

  const getAllFormData = useCallback(() => {
    const all = { ...stepData[0], ...stepData[1], ...stepData[2], ...stepData[3], ...stepData[4] };
    Object.keys(all).forEach(k => { if (all[k] === undefined) delete all[k]; });
    return all;
  }, [stepData]);

  const handleFieldChange = useCallback(() => {
    const id = setTimeout(() => saveCurrentStepData(), 300);
    return () => clearTimeout(id);
  }, [saveCurrentStepData]);

  const calculateProfitMargin = useCallback(() => {
    const v = form.getFieldsValue();
    if (v.supplier_price > 0 && v.price > 0) {
      return `${(((v.price - v.supplier_price) / v.price) * 100).toFixed(1)}%`;
    }
    return 'N/A';
  }, [form]);

  const handleFormSubmit = async (values: any) => {
    try {
      saveCurrentStepData();
      // Merge stepData + final form values so barcode from step 2 is always included
      const finalValues = { ...getAllFormData(), ...form.getFieldsValue(true), ...values };
      await form.validateFields();

      const confirmed = await ShowConfirm({
        title: `Are you sure you want to ${edit ? "update this" : "add new"} Inventory?`,
        position: true,
      });

      if (confirmed) {
        const tv = {
          ...finalValues,
          category: finalValues.category?.value || finalValues.category,
          subcategory_id: finalValues.subcategory_id?.value || finalValues.subcategory_id,
          unit_id: finalValues.unit_id?.value || finalValues.unit_id,
          supplier_id: finalValues.supplier_id?.value || finalValues.supplier_id,
          quantity: Number(finalValues.quantity) || 0,
          supplier_price: finalValues.supplier_price ? Number(finalValues.supplier_price) : undefined,
          price: finalValues.price ? Number(finalValues.price) : undefined,
          min_viable_quantity: finalValues.min_viable_quantity ? Number(finalValues.min_viable_quantity) : undefined,
        };
        Object.keys(tv).forEach(k => { if (tv[k] === undefined || tv[k] === '') delete tv[k]; });
        if (uploadedFile) tv.imageFile = uploadedFile;

        edit
          ? await editInventory({ values: tv, _id: data?._id })
          : await addNewInventory(tv);

        actionRef?.current?.reload();
        setOpen(false);
        message.success(`Inventory ${edit ? 'updated' : 'added'} successfully`);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Form submit error:', e);
      message.error("Please fill in all required fields");
      return false;
    }
  };

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.resetFields(); setFileList([]); setPreviewImage(null); setUploadedFile(null);
      setUsageType('internal'); setCurrentStep(0); setSelectedCategory(null);
      setScannerOpen(false);
      setStepData({ 0: {}, 1: {}, 2: {}, 3: {}, 4: {} });
    }
  }, [form]);

  const getFieldsForStep = useCallback((stepIndex: number) => {
    switch (stepIndex) {
      case 0: return ['name', 'category', 'subcategory_id', 'unit_id', 'usage_type'];
      case 1: { const f = ['quantity']; if (usageType === 'selling' || usageType === 'both') f.push('price'); return f; }
      default: return [];
    }
  }, [usageType]);

  const nextStep = useCallback(async () => {
    try {
      saveCurrentStepData();
      const fields = getFieldsForStep(currentStep);
      if (fields.length > 0) await form.validateFields(fields);
      if (currentStep < steps.length - 1) setCurrentStep(p => p + 1);
    } catch { message.error('Please fill in all required fields for this step'); }
  }, [saveCurrentStepData, currentStep, form, steps.length, getFieldsForStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) { saveCurrentStepData(); setCurrentStep(p => p - 1); }
  }, [currentStep, saveCurrentStepData]);

  const isStepValid = useCallback((idx: number) => {
    try {
      const d = getAllFormData();
      const get = (v: any) => (v && typeof v === 'object' && v.value) ? v.value : v;
      const ut = d.usage_type || usageType;
      switch (idx) {
        case 0: return !!(d.name?.trim() && get(d.category) && get(d.subcategory_id) && get(d.unit_id) && ut);
        case 1: return !!(d.quantity >= 0 && (!(ut === 'selling' || ut === 'both') || d.price > 0));
        default: return true;
      }
    } catch { return false; }
  }, [getAllFormData, usageType]);

  const canSubmit = useCallback(() => {
    try {
      const d = getAllFormData();
      const get = (v: any) => (v && typeof v === 'object' && v.value) ? v.value : v;
      const ut = d.usage_type || usageType;
      return !!(d.name?.trim() && get(d.category) && get(d.subcategory_id) && get(d.unit_id) && ut && d.quantity >= 0 && (!(ut === 'selling' || ut === 'both') || d.price > 0));
    } catch { return false; }
  }, [getAllFormData, usageType]);

  useEffect(() => {
    if (open && edit && data) {
      const fv = {
        ...data,
        category: data?.subcategory_id?._id ? { value: data.subcategory_id._id, label: data.subcategory_id.name } : data?.subcategory_id,
        subcategory_id: data?.category_id?._id ? { value: data.category_id._id, label: data.category_id.name } : data?.category,
        unit_id: data?.unit_id?._id ? { value: data.unit_id._id, label: data.unit_id.name } : data?.unit_id,
        supplier_id: data?.supplier_id?._id ? { value: data.supplier_id._id, label: data.supplier_id.name } : data?.supplier_id,
        usage_type: data?.usage_type || 'internal',
        status: data?.status || 'active',
        barcode: data?.barcode || '',
      };
      form.setFieldsValue(fv);
      setUsageType(data?.usage_type || 'internal');
      if (data?.category_id?._id) setSelectedCategory(data.category_id._id);
      setStepData({
        0: { name: fv.name, usage_type: fv.usage_type, category: fv.category, subcategory_id: fv.subcategory_id, unit_id: fv.unit_id, desc: fv.desc, vat_type: fv.vat_type },
        1: { quantity: fv.quantity, min_viable_quantity: fv.min_viable_quantity, supplier_price: fv.supplier_price, price: fv.price },
        2: { supplier_id: fv.supplier_id, manufacturer: fv.manufacturer, barcode: fv.barcode, location: fv.location },
        3: { status: fv.status, dimensions: fv.dimensions, weight: fv.weight },
        4: {},
      });
      if (data?.thumbnail) {
        setPreviewImage(data.thumbnail);
        setFileList([{ uid: '-1', name: 'image.png', status: 'done', url: data.thumbnail }]);
      }
    } else if (open && !edit) {
      form.setFieldsValue({ usage_type: 'internal' });
      setUsageType('internal');
      setStepData({ 0: { usage_type: 'internal' }, 1: {}, 2: {}, 3: {}, 4: {} });
    }
  }, [open, data, form, edit]);

  const UsageTypeOptions = useMemo(() => [
    { label: <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ToolOutlined /><span>Internal Use</span><Tag color="orange">INTERNAL</Tag></div>, value: 'internal' },
    { label: <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ShoppingCartOutlined /><span>For Sale</span><Tag color="green">SELLING</Tag></div>, value: 'selling' },
    { label: <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><SwapOutlined /><span>Both</span><Tag color="blue">BOTH</Tag></div>, value: 'both' },
  ], []);

  const beforeUpload = useCallback((file: RcFile) => {
    if (!file.type.startsWith('image/')) { message.error('Images only!'); return false; }
    if (file.size / 1024 / 1024 > 5) { message.error('Max 5MB!'); return false; }
    setUploadedFile(file);
    return false;
  }, []);

  const handleChange: UploadProps['onChange'] = useCallback(({ fileList: nl }) => {
    if (nl.length > 0 && nl[0].originFileObj) {
      setUploadedFile(nl[0].originFileObj); setPreviewImage(URL.createObjectURL(nl[0].originFileObj));
    } else if (nl.length > 0 && nl[0].url) { setPreviewImage(nl[0].url); }
    else { setPreviewImage(null); setUploadedFile(null); }
    setFileList(nl);
  }, []);

  const customRequest = useCallback(({ onSuccess }: any) => { setTimeout(() => onSuccess?.("ok"), 0); }, []);

  const renderStepContent = useCallback(() => {
    const values = form.getFieldsValue();

    switch (currentStep) {
      case 0:
        return (
          <ProCard title="Basic Information" size="small">
            <ProForm.Group>
              <ProFormText width="lg" name="name" label="Product Name" rules={[{ required: true, message: "Product name is required" }]} placeholder="Enter product name" fieldProps={{ onChange: handleFieldChange }} />
              <ProFormSelect width="lg" name="usage_type" label="Usage Type" rules={[{ required: true, message: "Usage type is required" }]} options={UsageTypeOptions}
                fieldProps={{ onChange: (v) => { setUsageType(v); if (v === 'internal') form.setFieldValue('price', undefined); handleFieldChange(); } }} />
              <ProFormSelect width="lg" name="category" label="Category" rules={[{ required: true, message: "Category is required" }]} showSearch placeholder="Select category" request={CategoriesRequest}
                fieldProps={{ onChange: (v) => { handleCategoryChange(v); handleFieldChange(); } }} />
              <ProFormSelect width="lg" name="subcategory_id" label="Sub Category" key={selectedCategory} rules={[{ required: true, message: "Sub category is required" }]} showSearch
                placeholder={selectedCategory ? "Select sub category" : "Select category first"} request={SubCategoriesRequest} disabled={!selectedCategory}
                fieldProps={{ onChange: handleFieldChange }} />
              <ProFormSelect name="unit_id" showSearch label="Unit of Measure" placeholder="Select unit" rules={[{ required: true, message: "Unit is required" }]} request={UnitsRequest} width="lg" fieldProps={{ onChange: handleFieldChange }} />
              <ProFormSelect name="vat_type" showSearch width="lg" tooltip="VAT Type: Standard(16%), Zero Rated(0%) or Exempt(0%)" label="VAT Type" rules={[{ required: true, message: "VAT type is required" }]} placeholder="Select VAT type"
                options={[{ label: "Standard", value: "STANDARD" }, { label: "Zero Rated", value: "ZERO" }, { label: "Exempt", value: "EXEMPT" }]} />
              <ProFormTextArea width="lg" name="desc" label="Description" placeholder="Enter product description" fieldProps={{ rows: 3 }} />
            </ProForm.Group>
          </ProCard>
        );

      case 1:
        return (
          <ProCard title="Inventory & Pricing" size="small">
            <ProForm.Group>
              <ProFormDigit width="md" name="quantity" label="Current Quantity" rules={[{ required: true, message: "Quantity is required" }]} placeholder="Enter current quantity" fieldProps={{ min: 0, onChange: handleFieldChange }} />
              <ProFormDigit width="md" name="min_viable_quantity" label="Minimum Stock Level" placeholder="Enter minimum stock level" fieldProps={{ min: 0 }} />
              <ProFormMoney width="md" name="supplier_price" label="Supplier Price (Optional)" customSymbol="Ksh." placeholder="Enter supplier price (optional)" />
              <ProFormMoney width="md" name="price" label="Selling Price" customSymbol="Ksh."
                rules={[{ required: usageType === 'selling' || usageType === 'both', message: "Selling price is required for sellable items" }]}
                placeholder="Enter selling price" disabled={usageType === 'internal'} fieldProps={{ onChange: handleFieldChange }}
                extra={usageType !== 'internal' && values.supplier_price > 0 && values.price > 0 ? `Profit Margin: ${calculateProfitMargin()}` : undefined} />
            </ProForm.Group>
            {usageType !== 'internal' && values.supplier_price > 0 && values.price > 0 && (
              <Alert message={`Profit Margin: ${calculateProfitMargin()}`} type={parseFloat(calculateProfitMargin()) > 20 ? "success" : "warning"} showIcon style={{ marginTop: 16 }} />
            )}
          </ProCard>
        );

      case 2:
        return (
          <ProCard title="Supplier Information" size="small">
            <ProForm.Group>
              <ProFormSelect width="xl" name="supplier_id" label="Supplier (Optional)" showSearch placeholder="Select supplier (optional)" request={SuppliersRequest} />
              <ProFormText width="md" name="manufacturer" label="Manufacturer" placeholder="Enter manufacturer (optional)" />

              {/* ── BARCODE FIELD — ProFormText keeps value in form store ── */}
              <Form.Item
                label={
                  <Space size={6}>
                    <BarcodeOutlined style={{ color: "#6366f1" }} />
                    <span>Barcode</span>
                  </Space>
                }
                style={{ width: "100%", maxWidth: 420 }}
              >
                <Space.Compact style={{ width: "100%" }}>
                  <Form.Item name="barcode" noStyle>
                    <ProFormText
                      name="barcode"
                      noStyle
                      placeholder="Scan or type barcode"
                      fieldProps={{
                        style: { borderRadius: "6px 0 0 6px" },
                        autoComplete: "off",
                      }}
                    />
                  </Form.Item>
                  <Tooltip title="Scan with camera">
                    <Button
                      icon={<CameraOutlined />}
                      onClick={() => setScannerOpen(true)}
                      style={{ height: 32, borderRadius: "0 6px 6px 0", background: "#eef2ff", border: "1px solid #d9d9d9", color: "#6366f1", fontWeight: 500, padding: "0 12px" }}
                    >
                      Scan
                    </Button>
                  </Tooltip>
                </Space.Compact>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                  Or plug in a USB/Bluetooth barcode scanner and scan directly
                </div>
              </Form.Item>

              <ProFormText width="xl" name="location" label="Storage Location" placeholder="e.g., Warehouse A, Shelf 3" />
            </ProForm.Group>
          </ProCard>
        );

      case 3:
        return (
          <ProCard title="Advanced Settings" size="small">
            <ProForm.Group>
              <ProFormSelect width="md" name="status" label="Status" options={[{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }, { label: 'Discontinued', value: 'discontinued' }]} />
            </ProForm.Group>
            <Divider orientation="left">Dimensions (Optional)</Divider>
            <ProForm.Group>
              <ProFormDigit width="sm" name={['dimensions', 'length']} label="Length" fieldProps={{ min: 0 }} />
              <ProFormDigit width="sm" name={['dimensions', 'width']} label="Width" fieldProps={{ min: 0 }} />
              <ProFormDigit width="sm" name={['dimensions', 'height']} label="Height" fieldProps={{ min: 0 }} />
              <ProFormSelect width="sm" name={['dimensions', 'unit']} label="Unit" options={[{ label: 'cm', value: 'cm' }, { label: 'm', value: 'm' }, { label: 'inches', value: 'in' }, { label: 'feet', value: 'ft' }]} />
            </ProForm.Group>
            <Divider orientation="left">Weight (Optional)</Divider>
            <ProForm.Group>
              <ProFormDigit width="md" name={['weight', 'value']} label="Weight" fieldProps={{ min: 0 }} />
              <ProFormSelect width="sm" name={['weight', 'unit']} label="Unit" options={[{ label: 'kg', value: 'kg' }, { label: 'g', value: 'g' }, { label: 'lb', value: 'lb' }, { label: 'oz', value: 'oz' }]} />
            </ProForm.Group>
          </ProCard>
        );

      case 4:
        return (
          <ProCard title="Product Image" size="small">
            <Upload.Dragger fileList={fileList} beforeUpload={beforeUpload} onChange={handleChange} maxCount={1} showUploadList={{ showRemoveIcon: true }} accept="image/*" style={{ width: '100%', minHeight: 200 }} customRequest={customRequest}>
              <p className="ant-upload-drag-icon"><InboxOutlined style={{ fontSize: 48, color: '#40a9ff' }} /></p>
              <p className="ant-upload-text">Click or drag file to upload</p>
              <p className="ant-upload-hint">Single image file, max 5MB. (Optional)</p>
            </Upload.Dragger>
            {previewImage && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <img src={previewImage} alt="Preview" style={{ maxHeight: 300, maxWidth: '100%', objectFit: 'contain' }} />
              </div>
            )}
          </ProCard>
        );

      default: return null;
    }
  }, [currentStep, form, handleFieldChange, UsageTypeOptions, CategoriesRequest, SubCategoriesRequest, UnitsRequest, usageType, calculateProfitMargin, SuppliersRequest, fileList, beforeUpload, handleChange, customRequest, previewImage, selectedCategory, handleCategoryChange]);

  return (
    <Space align="center" direction="vertical" size="small">
      <ModalForm
        width={1000}
        open={open}
        onOpenChange={handleOpenChange}
        title={<Space><ReconciliationOutlined />{edit ? "Edit Inventory Item" : "Add New Inventory Item"}</Space>}
        trigger={
          edit ? (
            <Button key="button" size="small" icon={<EditOutlined style={{ color: "#6c1c2c" }} />}>Edit</Button>
          ) : (
            <Button type="primary" key="button" icon={<ReconciliationOutlined />}>Add New</Button>
          )
        }
        onFinish={handleFormSubmit}
        form={form}
        autoFocusFirstInput={false}
        modalProps={{ destroyOnClose: true, centered: true }}
        submitter={{
          render: () => [
            <div key="footer" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {currentStep > 0 && <Button icon={<LeftOutlined />} onClick={prevStep}>Previous</Button>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={() => handleOpenChange(false)}>Cancel</Button>
                {currentStep < steps.length - 1 ? (
                  <Button type="primary" icon={<RightOutlined />} onClick={nextStep} disabled={!isStepValid(currentStep)}>Next</Button>
                ) : (
                  <Button type="primary" onClick={() => form.submit()} disabled={!canSubmit()}>
                    {edit ? "Update Inventory" : "Add Inventory"}
                  </Button>
                )}
              </div>
            </div>
          ],
        }}
      >
        <div style={{ marginBottom: 24, padding: 18 }}>
          <Steps current={currentStep} size="small">
            {steps.map((step, index) => (
              <Step key={index} title={step.title} description={step.description} icon={step.icon}
                status={index === currentStep ? 'process' : isStepValid(index) ? 'finish' : 'wait'} />
            ))}
          </Steps>
        </div>

        <div style={{ minHeight: 400 }}>{renderStepContent()}</div>

        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#666' }}>Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}</span>
            <span style={{ color: isStepValid(currentStep) ? '#52c41a' : '#ff4d4f' }}>
              {isStepValid(currentStep) ? '✓ Complete' : '○ Incomplete'}
            </span>
          </div>
        </div>

        <BarcodeScannerModal
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={(code) => {
            form.setFieldValue("barcode", code);
            message.success(`Barcode scanned: ${code}`);
            setScannerOpen(false);
          }}
        />
      </ModalForm>
    </Space>
  );
};

export default AddEditProInventoryModal;