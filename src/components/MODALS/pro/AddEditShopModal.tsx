import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button, Form, Input, Modal, Space, Tag, Typography } from "antd";
import {
  CheckCircleFilled, EditOutlined,
  EnvironmentOutlined, LoadingOutlined, MedicineBoxOutlined,
  SearchOutlined, ShopOutlined, SolutionOutlined,
} from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { createShop, updateShop } from "@services/shops";
import { usePrimaryColor } from "@context/PrimaryColorContext";

interface ShopModalProps { actionRef: any; edit?: boolean; data?: any; }

type PosMode = "restaurant" | "retail" | "hospital";

// ── Load Google Maps SDK on demand ───────────────────────────────────────────
const loadGoogleMaps = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.maps?.places) { resolve(); return; }
    if (document.getElementById("gmap-script")) {
      const check = setInterval(() => {
        if ((window as any).google?.maps?.places) { clearInterval(check); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(check); reject("timeout"); }, 10000);
      return;
    }
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
    if (!key) { reject("no key"); return; }
    const script = document.createElement("script");
    script.id = "gmap-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const check = setInterval(() => {
        if ((window as any).google?.maps?.places) { clearInterval(check); resolve(); }
      }, 100);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// ── Google Places hook ───────────────────────────────────────────────────────
const useGooglePlaces = () => {
  const [options, setOptions] = useState<any[]>([]);
  const [sdkReady, setSdkReady] = useState(!!(window as any).google?.maps?.places);
  const acRef = useRef<any>(null);
  const plcRef = useRef<any>(null);
  const timer = useRef<any>(null);

  useEffect(() => {
    if (sdkReady) return;
    loadGoogleMaps().then(() => setSdkReady(true)).catch(() => { });
  }, []);

  const ensureServices = useCallback(() => {
    const g = (window as any).google?.maps?.places;
    if (!g) return false;
    if (!acRef.current) acRef.current = new g.AutocompleteService();
    if (!plcRef.current) plcRef.current = new g.PlacesService(document.createElement("div"));
    return true;
  }, []);

  const search = useCallback((input: string) => {
    if (!input || input.length < 2) { setOptions([]); return; }
    if (!ensureServices()) { setOptions([]); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      acRef.current.getPlacePredictions(
        { input, types: ["establishment", "geocode"] },
        (preds: any[] | null, status: string) => {
          if (status === "OK" && preds?.length) {
            setOptions(preds.map(p => ({
              value: p.description,
              placeId: p.place_id,
              mainText: p.structured_formatting?.main_text ?? p.description,
              secondaryText: p.structured_formatting?.secondary_text ?? "",
            })));
          } else setOptions([]);
        }
      );
    }, 250);
  }, [ensureServices]);

  const getDetails = useCallback((placeId: string): Promise<any> =>
    new Promise((resolve, reject) => {
      if (!ensureServices()) { resolve(null); return; }
      plcRef.current.getDetails(
        { placeId, fields: ["name", "formatted_address", "geometry", "place_id", "url", "address_components"] },
        (place: any, status: string) => status === "OK" ? resolve(place) : reject(status)
      );
    }), [ensureServices]);

  return { options, search, getDetails, sdkReady };
};

// ── Location input ───────────────────────────────────────────────────────────
const LocationInput: React.FC<{ value?: any; onChange?: (v: any) => void }> = ({ value, onChange }) => {
  const { options, search, getDetails, sdkReady } = useGooglePlaces();
  const [text, setText] = useState("");
  const [place, setPlace] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!value) return;
    const display = typeof value === "string"
      ? value
      : (value.formatted_address || value.address || "");
    setText(display);
    if (typeof value === "object" && value.place_id) setPlace(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (options.length > 0 && text.length >= 2) setOpen(true);
    else if (options.length === 0) setOpen(false);
  }, [options]);

  const handleType = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);
    setPlace(null);
    if (!sdkReady) { onChange?.(val); return; }
    search(val);
  };

  const handlePick = async (opt: any) => {
    setText(opt.value);
    setOpen(false);
    setFetching(true);
    try {
      const p = await getDetails(opt.placeId);
      if (p) {
        const gc = (type: string) =>
          p.address_components?.find((c: any) => c.types.includes(type))?.long_name ?? null;
        const loc = {
          address: p.name || p.formatted_address,
          place_id: p.place_id,
          lat: p.geometry?.location?.lat(),
          lng: p.geometry?.location?.lng(),
          city: gc("locality") || gc("administrative_area_level_2"),
          country: gc("country"),
          formatted_address: p.formatted_address,
          maps_url: p.url,
        };
        setPlace(loc);
        setText(loc.formatted_address || loc.address);
        onChange?.(loc);
      } else onChange?.(opt.value);
    } catch { onChange?.(opt.value); }
    finally { setFetching(false); }
  };

  const inputBorder = place ? "#10b981" : "#d9d9d9";
  const pinColor = place ? "#10b981" : "#94a3b8";

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <EnvironmentOutlined style={{
          position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
          zIndex: 1, pointerEvents: "none", color: pinColor, fontSize: 14,
        }} />
        <input
          ref={inputRef}
          value={text}
          onChange={handleType}
          onFocus={() => { if (options.length > 0 && text.length >= 2) setOpen(true); }}
          onBlur={() => { setTimeout(() => setOpen(false), 150); if (!place && text) onChange?.(text); }}
          placeholder={sdkReady ? "Type to search location…" : "Enter location"}
          autoComplete="off"
          style={{
            width: "100%", height: 36, borderRadius: 8,
            border: `1px solid ${inputBorder}`,
            paddingLeft: 32, paddingRight: 36,
            fontSize: 14, outline: "none", color: "#0f172a",
            background: "#fff", boxSizing: "border-box" as const,
            transition: "border-color 0.2s",
          }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = "#1677ff")}
          onBlurCapture={e => (e.currentTarget.style.borderColor = inputBorder)}
        />
        <span style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          color: place ? "#10b981" : "#cbd5e1", fontSize: 14, pointerEvents: "none",
        }}>
          {fetching
            ? <LoadingOutlined style={{ fontSize: 13, color: "#94a3b8" }} />
            : place ? <CheckCircleFilled /> : <SearchOutlined />}
        </span>
      </div>

      {open && options.length > 0 && (() => {
        const rect = wrapRef.current?.getBoundingClientRect();
        if (!rect) return null;
        return (
          <div style={{
            position: "fixed",
            top: rect.bottom + 4, left: rect.left, width: rect.width,
            background: "#fff", borderRadius: 10, zIndex: 999999,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)", border: "1px solid #e2e8f0",
            overflow: "hidden", maxHeight: 240, overflowY: "auto" as const,
          }}>
            {options.map((opt, i) => (
              <div
                key={opt.placeId || i}
                onMouseDown={e => { e.preventDefault(); handlePick(opt); }}
                style={{
                  padding: "10px 14px", cursor: "pointer",
                  borderBottom: i < options.length - 1 ? "1px solid #f1f5f9" : "none",
                  background: "transparent", transition: "background 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f0f7ff")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <EnvironmentOutlined style={{ color: "#94a3b8", fontSize: 13, marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", lineHeight: 1.3 }}>
                      {opt.mainText}
                    </div>
                    {opt.secondaryText && (
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
                        {opt.secondaryText}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {place && !fetching && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
          <CheckCircleFilled style={{ color: "#10b981", fontSize: 12 }} />
          <span style={{ fontSize: 12, color: "#10b981", fontWeight: 500 }}>Location confirmed</span>
          {place.city && (
            <Tag style={{ fontSize: 11, background: "#f0fdf4", color: "#059669", border: "none", borderRadius: 5, padding: "0 7px" }}>
              {[place.city, place.country].filter(Boolean).join(", ")}
            </Tag>
          )}
        </div>
      )}

      {place?.lat && place?.lng && (
        <div style={{ marginTop: 10, borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0", position: "relative" }}>
          <iframe
            title="location-map" width="100%" height="140"
            style={{ border: 0, display: "block" }} loading="lazy"
            src={`https://maps.google.com/maps?q=${place.lat},${place.lng}&z=15&output=embed`}
          />
          <a
            href={place.maps_url || `https://maps.google.com/?q=${place.lat},${place.lng}`}
            target="_blank" rel="noreferrer"
            style={{
              position: "absolute", bottom: 8, right: 8,
              background: "#fff", borderRadius: 6, padding: "3px 10px",
              fontSize: 11, fontWeight: 600, color: "#3b82f6",
              boxShadow: "0 1px 4px rgba(0,0,0,0.15)", textDecoration: "none",
            }}
          >
            Open in Maps ↗
          </a>
        </div>
      )}
    </div>
  );
};

// ── POS mode card ─────────────────────────────────────────────────────────────
const ModeCard: React.FC<{
  active: boolean; onClick: () => void; primaryColor: string;
  icon: React.ReactNode; title: string; desc: string;
}> = ({ active, onClick, primaryColor, icon, title, desc }) => (
  <div
    onClick={onClick}
    style={{
      flex: 1, border: `2px solid ${active ? primaryColor : "#e2e8f0"}`,
      borderRadius: 10, padding: "14px 16px", cursor: "pointer",
      background: active ? `${primaryColor}0d` : "#fafafa",
      transition: "all 0.18s", display: "flex", flexDirection: "column",
      alignItems: "center", gap: 6, position: "relative",
    }}
  >
    {active && <CheckCircleFilled style={{ position: "absolute", top: 8, right: 8, color: primaryColor, fontSize: 14 }} />}
    <div style={{ fontSize: 28, color: active ? primaryColor : "#cbd5e1" }}>{icon}</div>
    <Typography.Text strong style={{ color: active ? primaryColor : "#64748b", fontSize: 13 }}>{title}</Typography.Text>
    <Typography.Text type="secondary" style={{ fontSize: 11, textAlign: "center", lineHeight: 1.4 }}>{desc}</Typography.Text>
  </div>
);

// ── Normalise legacy "restaurant" → "service" on read ─────────────────────────
const normalisePosMode = (mode: string | undefined): PosMode => {
  if (mode === "restaurant") return "restaurant";
  if (mode === "retail") return "retail";
  if (mode === "hospital") return "hospital";
  return "restaurant";
};

// ── Main modal ────────────────────────────────────────────────────────────────
const AddEditShopModal: React.FC<ShopModalProps> = ({ actionRef, edit, data }) => {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [posMode, setPosMode] = useState<PosMode>(normalisePosMode(data?.pos_mode));
  const primaryColor = usePrimaryColor();

  // ── Tenant flags ─────────────────────────────────────────────────────────
  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;
  const hasPOS = !!(tenant?.pos_integration?.enabled ?? true);
  const hasAccounting = !!(tenant?.accounting_database?.enabled || tenant?.modules?.accounting);
  const hasMteja = tenant?.modules?.crm === true;

  /**
   * Hide POS Mode selector when:
   *  - Accounting-only tenant  (no POS)
   *  - Mteja-only tenant       (no POS, no Accounting)
   * Show it only when POS module is active.
   */
  const showPosModeSelector = hasPOS && !(hasMteja && !hasPOS && !hasAccounting);

  const handleOpen = () => {
    if (edit && data) {
      form.setFieldsValue({ name: data.name, location: data.location });
      setPosMode(normalisePosMode(data?.pos_mode));
    }
    setOpen(true);
  };

  const handleCancel = () => {
    setOpen(false);
    form.resetFields();
    setPosMode("restaurant");
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const confirmed = await ShowConfirm({
        title: `Are you sure you want to ${edit ? "update this" : "add new"} shop?`,
        position: true,
      });
      if (!confirmed) return;
      setLoading(true);
      edit
        ? await updateShop({ ...values, _id: data?._id, pos_mode: posMode })
        : await createShop({ ...values, pos_mode: posMode });
      actionRef?.current?.reload?.() || actionRef?.current?.reset?.();
      setOpen(false);
      form.resetFields();
    } catch { /* validation shown inline */ }
    finally { setLoading(false); }
  };

  return (
    <>
      {edit ? (
        <Button size="small" icon={<EditOutlined style={{ color: primaryColor }} />} onClick={handleOpen}>Edit</Button>
      ) : (
        <Button type="primary" icon={<ShopOutlined />} onClick={handleOpen}>New Branch</Button>
      )}

      <Modal
        open={open}
        onCancel={handleCancel}
        onOk={handleOk}
        confirmLoading={loading}
        okText={edit ? "Save Changes" : "Add Shop"}
        cancelText="Cancel"
        title={<Space><ShopOutlined />{edit ? "Edit Shop" : "Add New Branch"}</Space>}
        width={520}
        style={{ top: 40 }}
        destroyOnClose
        maskClosable={false}
        getContainer={() => document.body}
        styles={{
          body: { paddingTop: 12, paddingBottom: 4, maxHeight: "calc(100vh - 220px)", overflowY: "auto", overflowX: "hidden" },
          mask: { backdropFilter: "blur(2px)" },
        }}
      >
        <Form form={form} layout="vertical" size="middle">
          <Form.Item name="name" label="Branch Name" rules={[{ required: true, message: "Branch name is required" }]}>
            <Input placeholder="Enter branch name" style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item
            name="location"
            label={<Space size={4}><EnvironmentOutlined style={{ color: primaryColor }} /><span>Location</span></Space>}
            rules={[{ required: true, message: "Location is required" }]}
          >
            <LocationInput />
          </Form.Item>

          {/* POS Mode selector — only shown when POS module is active */}
          {showPosModeSelector && (
            <Form.Item label="POS Mode" style={{ marginBottom: 0 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <ModeCard
                  active={posMode === "restaurant"}
                  onClick={() => setPosMode("restaurant")}
                  primaryColor={primaryColor}
                  icon={<SolutionOutlined />}
                  title="Duka Services"
                  desc="For restaurants, spas, salons & anywhere offering in-person services."
                />
                <ModeCard
                  active={posMode === "retail"}
                  onClick={() => setPosMode("retail")}
                  primaryColor={primaryColor}
                  icon={<ShopOutlined />}
                  title="Retail"
                  desc="Products-first. Queue-based orders per slot."
                />
                <ModeCard
                  active={posMode === "hospital"}
                  onClick={() => setPosMode("hospital")}
                  primaryColor={primaryColor}
                  icon={<MedicineBoxOutlined />}
                  title="Hospital"
                  desc="Patient-first. Appointments, wards, and billing."
                />
              </div>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};

export default AddEditShopModal;