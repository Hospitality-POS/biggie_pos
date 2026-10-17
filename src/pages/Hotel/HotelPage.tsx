import React, { useState, useEffect, useMemo } from "react";
import {
  PlusOutlined,
  HomeOutlined,
  UserOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  SearchOutlined,
  ApartmentOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  PercentageOutlined,
  LoginOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import {
  Button,
  Space,
  Typography,
  Empty,
  Spin,
  Alert,
  Modal,
  Form,
  Input,
  Select,
  List,
  Avatar,
  Drawer,
  Segmented,
  Grid,
  Tooltip,
} from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchTableUsequery, addNewTableLocation, addNewTable, getTableLocation } from "@services/tables";
import { getAllProducts } from "@services/products";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { useAppSelector } from "src/store";
import CartDrawer from "@components/cart/CartDrawer";
import { getCart, createCart, addItemToCart } from "@features/Cart/CartActions";
import { useAppDispatch } from "src/store";
import { message } from "antd";

const { Text } = Typography;

const ALL_FLOORS = "all";
type StatusFilter = "all" | "available" | "occupied";

// A room is in use when it has an open bill. Older API responses don't send
// has_open_cart, so an amount on the bill counts too. (isOccupied alone is
// not trusted — it can stay true after the bill is closed.)
const isRoomOccupied = (room: any) => !!room?.has_open_cart || Number(room?.cart_amount) > 0;

const ksh = (n: number) => `Ksh ${Math.round(Number(n) || 0).toLocaleString()}`;

// ── Room card ────────────────────────────────────────────────────────────────
const RoomCard: React.FC<{
  room: any;
  onOpen: (roomId: string) => void;
  primaryColor: string;
  cartItemsCount?: number;
}> = ({ room, onOpen, primaryColor, cartItemsCount = 0 }) => {
  const occupied = isRoomOccupied(room);
  const amount = Number(room.cart_amount) || 0;
  const tone = occupied
    ? { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "Occupied" }
    : { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", label: "Available" };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(room._id)}
      onKeyDown={(e) => (e.key === "Enter" ? onOpen(room._id) : undefined)}
      className="hotel-room-card"
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderLeft: `4px solid ${tone.color}`,
        borderRadius: 12,
        padding: 14,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minHeight: 150,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <Text strong style={{ fontSize: 15, color: "#0f172a", lineHeight: 1.3 }} ellipsis={{ tooltip: room.name }}>
          {room.name || "Unnamed room"}
        </Text>
        <span
          style={{
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 999,
            color: tone.color,
            background: tone.bg,
            border: `1px solid ${tone.border}`,
          }}
        >
          {tone.label}
        </span>
      </div>

      <div style={{ flex: 1 }}>
        {occupied ? (
          amount > 0 ? (
            <>
              <Text style={{ fontSize: 11.5, color: "#64748b", display: "block" }}>On the bill</Text>
              <Text strong style={{ fontSize: 16, color: "#0f172a" }}>{ksh(amount)}</Text>
            </>
          ) : (
            <Text style={{ fontSize: 12.5, color: "#64748b" }}>Checked in, nothing billed yet</Text>
          )
        ) : (
          <Text style={{ fontSize: 12.5, color: "#64748b" }}>Ready for check-in</Text>
        )}
        {cartItemsCount > 0 && (
          <Text style={{ fontSize: 11.5, color: "#64748b", display: "block", marginTop: 2 }}>
            {cartItemsCount} {cartItemsCount === 1 ? "item" : "items"} on the bill
          </Text>
        )}
        {room.served_by && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
            <UserOutlined style={{ fontSize: 11, color: "#94a3b8" }} />
            <Text style={{ fontSize: 11.5, color: "#94a3b8" }} ellipsis>{room.served_by}</Text>
          </div>
        )}
      </div>

      <Button
        block
        type={occupied ? "primary" : "default"}
        icon={occupied ? <EyeOutlined /> : <LoginOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          onOpen(room._id);
        }}
        style={{ borderRadius: 8, fontWeight: 600, ...(occupied ? {} : { color: primaryColor, borderColor: "#e2e8f0" }) }}
      >
        {occupied ? "View room" : "Check in"}
      </Button>
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────
const HotelPage: React.FC = () => {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [activeFloorId, setActiveFloorId] = useState<string>(ALL_FLOORS);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roomSearch, setRoomSearch] = useState("");
  const [addFloorModalOpen, setAddFloorModalOpen] = useState(false);
  const [addRoomModalOpen, setAddRoomModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [activeServiceCategoryId, setActiveServiceCategoryId] = useState<string | null>(null);
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [floorForm] = Form.useForm();
  const [roomForm] = Form.useForm();
  const primaryColor = usePrimaryColor();
  const isMobile = !Grid.useBreakpoint().md;
  const { user } = useAppSelector((state) => state.auth);
  const { cartDetails } = useAppSelector((state) => state.cart);
  const dispatch = useAppDispatch();
  const canManage = user?.role === "admin" || user?.role === "cashier";

  const storedCode = localStorage.getItem("companyCode");

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    // Always load every floor; picking a floor only filters on the client, so
    // switching floors is instant instead of a full-page reload.
    queryKey: ["hotel-floors"],
    queryFn: () => (storedCode ? fetchTableUsequery({ id: ALL_FLOORS }) : []),
    networkMode: "always",
    enabled: !!storedCode,
    retry: 2,
    refetchInterval: 30000,
  });

  const handleOpenRoom = async (roomId: string) => {
    setSelectedRoomId(roomId);
    // First try to get existing cart
    const cartResult = await dispatch(getCart(roomId));

    // If no cart exists, create one
    if (cartResult.type.endsWith("/rejected") || !(cartResult.payload as any)?._id) {
      const userId = user?.id || user?._id;
      if (!userId) {
        message.error("User not authenticated");
        return;
      }
      const createResult = await dispatch(createCart({ table_id: roomId, created_by: userId } as any));
      if (createResult.type.endsWith("/fulfilled")) {
        // Fetch the newly created cart
        await dispatch(getCart(roomId));
      }
    }

    // Check if cart is empty and show service selection modal
    if (cartDetails?.items?.length === 0) {
      setServiceModalOpen(true);
    }
  };

  const handleAddServiceToCart = async (product: any) => {
    if (!selectedRoomId || !cartDetails?._id) return;

    const userId = user?.id || user?._id;
    if (!userId) {
      message.error("User not authenticated");
      return;
    }

    try {
      await dispatch(
        addItemToCart({
          cart_id: cartDetails._id,
          product_id: product._id,
          product_type: "Product",
          price: product.price,
          created_by: userId as string,
          quantity: 1,
          desc: product.desc || product.name,
          table_id: selectedRoomId,
        })
      );
      message.success(`${product.name} added to the bill`);
      setServiceModalOpen(false);
      refetch();
    } catch (error) {
      message.error("Failed to add service");
    }
  };

  const handleAddFloor = async (values: any) => {
    try {
      await addNewTableLocation(values);
      message.success("Floor added");
      setAddFloorModalOpen(false);
      floorForm.resetFields();
      refetch();
    } catch (error) {
      message.error("Failed to add floor");
    }
  };

  const handleAddRoom = async (values: any) => {
    try {
      await addNewTable(values);
      message.success("Room added");
      setAddRoomModalOpen(false);
      roomForm.resetFields();
      refetch();
    } catch (error) {
      message.error("Failed to add room");
    }
  };

  const { data: floorsData } = useQuery({
    queryKey: ["floors"],
    queryFn: () => getTableLocation({}),
    enabled: addRoomModalOpen,
  });

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: () => getAllProducts(),
    enabled: serviceModalOpen,
  });

  // Set first category as active when products load
  useEffect(() => {
    if (productsData && productsData.length > 0 && !activeServiceCategoryId) {
      setActiveServiceCategoryId(productsData[0]._id);
    }
  }, [productsData, activeServiceCategoryId]);

  const activeCategory = productsData?.find((c: any) => c._id === activeServiceCategoryId);
  const filteredProducts = (activeCategory?.products || []).filter((p: any) =>
    p?.name?.toLowerCase().includes(serviceSearchTerm.toLowerCase())
  );

  // Auto-refresh room status when cart items change
  useEffect(() => {
    if (selectedRoomId) refetch();
  }, [cartDetails?.items?.length]);

  const floors: any[] = Array.isArray(data) ? data : [];
  const visibleFloors = activeFloorId === ALL_FLOORS ? floors : floors.filter((f) => f._id === activeFloorId);
  const roomsInView = visibleFloors.flatMap((f) => f.tables || []);

  const stats = useMemo(() => {
    const occupied = roomsInView.filter(isRoomOccupied).length;
    return {
      total: roomsInView.length,
      occupied,
      available: roomsInView.length - occupied,
      occupancy: roomsInView.length ? Math.round((occupied / roomsInView.length) * 100) : 0,
      openBills: roomsInView.reduce((s, r) => s + (isRoomOccupied(r) ? Number(r.cart_amount) || 0 : 0), 0),
    };
  }, [roomsInView]);

  const matches = (room: any) => {
    if (statusFilter === "available" && isRoomOccupied(room)) return false;
    if (statusFilter === "occupied" && !isRoomOccupied(room)) return false;
    return !roomSearch || String(room.name || "").toLowerCase().includes(roomSearch.toLowerCase());
  };

  // table_id may come back populated ({ _id, name }) or as a plain id.
  const cartCountFor = (roomId: string) => {
    const t: any = cartDetails?.table_id;
    const cartRoomId = typeof t === "object" && t ? t._id : t;
    return String(cartRoomId) === String(roomId) && cartDetails?.items ? cartDetails.items.length : 0;
  };

  // ── Loading / error ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <Spin size="large" tip="Loading rooms..." />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert
        message="Couldn't load rooms"
        description="Something went wrong loading floors and rooms. Please try again."
        type="error"
        showIcon
        action={<Button onClick={() => refetch()}>Retry</Button>}
        style={{ margin: 20 }}
      />
    );
  }

  const roomGrid = (rooms: any[]) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 150 : 200}px, 1fr))`,
        gap: isMobile ? 10 : 14,
      }}
    >
      {rooms.map((room) => (
        <RoomCard
          key={room._id}
          room={room}
          onOpen={handleOpenRoom}
          primaryColor={primaryColor}
          cartItemsCount={cartCountFor(room._id)}
        />
      ))}
    </div>
  );

  const kpis = [
    { label: "Rooms", value: stats.total, icon: <HomeOutlined />, color: primaryColor },
    { label: "Occupied", value: stats.occupied, icon: <UserOutlined />, color: "#dc2626" },
    { label: "Available", value: stats.available, icon: <CheckCircleOutlined />, color: "#16a34a" },
    { label: "Occupancy", value: `${stats.occupancy}%`, icon: <PercentageOutlined />, color: "#7c3aed" },
    { label: "Open bills", value: ksh(stats.openBills), icon: <DollarOutlined />, color: "#0284c7" },
  ];

  const hasAnyRooms = floors.some((f) => (f.tables || []).length > 0);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: isMobile ? 12 : 24, minHeight: "100vh", background: "#f8fafc" }}>
      <style>{`.hotel-room-card{transition:box-shadow .15s,transform .15s}.hotel-room-card:hover{box-shadow:0 6px 18px rgba(15,23,42,.08);transform:translateY(-2px)}.hotel-pills::-webkit-scrollbar{display:none}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: `${primaryColor}14`,
              color: primaryColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            <HomeOutlined />
          </div>
          <div style={{ minWidth: 0 }}>
            <Text strong style={{ fontSize: isMobile ? 17 : 19, color: "#0f172a", display: "block", lineHeight: 1.2 }}>
              Rooms
            </Text>
            <Text style={{ fontSize: 12.5, color: "#64748b" }}>
              {floors.length} {floors.length === 1 ? "floor" : "floors"} · check guests in and manage their bills
            </Text>
          </div>
        </div>
        <Space size={8}>
          <Tooltip title="Refresh">
            <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()} />
          </Tooltip>
          {canManage && (
            <>
              <Button icon={<ApartmentOutlined />} onClick={() => setAddFloorModalOpen(true)}>
                {isMobile ? null : "Add floor"}
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddRoomModalOpen(true)}>
                {isMobile ? "Room" : "Add room"}
              </Button>
            </>
          )}
        </Space>
      </div>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(5, minmax(0, 1fr))",
          gap: isMobile ? 8 : 12,
          marginBottom: 16,
        }}
      >
        {kpis.map((k, i) => (
          <div
            key={k.label}
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: isMobile ? "10px 12px" : "14px 16px",
              gridColumn: isMobile && i === kpis.length - 1 ? "1 / -1" : undefined,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{k.label}</Text>
              <span style={{ color: k.color, fontSize: 13 }}>{k.icon}</span>
            </div>
            <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar: floors, status, search */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: isMobile ? 10 : "10px 14px",
          display: "flex",
          alignItems: isMobile ? "stretch" : "center",
          flexDirection: isMobile ? "column" : "row",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div className="hotel-pills" style={{ display: "flex", gap: 6, overflowX: "auto", flex: 1, minWidth: 0, scrollbarWidth: "none" }}>
          {[{ _id: ALL_FLOORS, name: "All floors" }, ...floors].map((f) => {
            const active = activeFloorId === f._id;
            return (
              <button
                key={f._id}
                type="button"
                onClick={() => setActiveFloorId(f._id)}
                style={{
                  flexShrink: 0,
                  border: `1px solid ${active ? primaryColor : "#e2e8f0"}`,
                  background: active ? `${primaryColor}12` : "#fff",
                  color: active ? primaryColor : "#475569",
                  fontWeight: active ? 600 : 500,
                  fontSize: 13,
                  padding: "6px 14px",
                  borderRadius: 999,
                  cursor: "pointer",
                }}
              >
                {f.name || "Unnamed floor"}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, flexDirection: isMobile ? "column" : "row" }}>
          <Segmented
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            options={[
              { label: "All", value: "all" },
              { label: "Available", value: "available" },
              { label: "Occupied", value: "occupied" },
            ]}
            style={{ flexShrink: 0, width: isMobile ? "100%" : undefined }}
            block={isMobile}
          />
          <Input
            placeholder="Search rooms"
            value={roomSearch}
            onChange={(e) => setRoomSearch(e.target.value)}
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            allowClear
            style={{ width: isMobile ? "100%" : 200, borderRadius: 8 }}
          />
        </div>
      </div>

      {/* Rooms */}
      {floors.length === 0 || !hasAnyRooms ? (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "40px 20px", textAlign: "center" }}>
          <Empty
            description={
              floors.length === 0
                ? "No floors yet. Add a floor, then add rooms to it."
                : "No rooms yet. Add rooms to your floors to start checking guests in."
            }
          >
            {canManage && (
              <Space>
                {floors.length === 0 && (
                  <Button icon={<ApartmentOutlined />} onClick={() => setAddFloorModalOpen(true)}>
                    Add floor
                  </Button>
                )}
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddRoomModalOpen(true)} disabled={floors.length === 0}>
                  Add room
                </Button>
              </Space>
            )}
          </Empty>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {visibleFloors.map((floor) => {
            const rooms = (floor.tables || []).filter(matches);
            const occ = (floor.tables || []).filter(isRoomOccupied).length;
            if (activeFloorId === ALL_FLOORS && rooms.length === 0) return null;
            return (
              <section key={floor._id}>
                {activeFloorId === ALL_FLOORS && (
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
                    <Text strong style={{ fontSize: 14, color: "#0f172a" }}>{floor.name || "Unnamed floor"}</Text>
                    <Text style={{ fontSize: 12, color: "#64748b" }}>
                      {occ} of {(floor.tables || []).length} occupied
                    </Text>
                  </div>
                )}
                {rooms.length ? (
                  roomGrid(rooms)
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={roomSearch || statusFilter !== "all" ? "No rooms match your filters" : "No rooms on this floor yet"}
                    style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, margin: 0 }}
                  />
                )}
              </section>
            );
          })}
          {activeFloorId === ALL_FLOORS && roomsInView.filter(matches).length === 0 && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No rooms match your filters"
              style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, margin: 0 }}
            />
          )}
        </div>
      )}

      {/* Room drawer — the bill and adding services */}
      {selectedRoomId && (
        <Drawer
          title={
            <Space>
              <ShoppingCartOutlined />
              <span>{roomsInView.find((r) => r._id === selectedRoomId)?.name || "Room"}</span>
            </Space>
          }
          placement="right"
          width={isMobile ? "100%" : 480}
          open={!!selectedRoomId}
          onClose={() => setSelectedRoomId(null)}
          styles={{
            body: { padding: 0, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" },
          }}
        >
          <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
            <CartDrawer />
          </div>

          <div style={{ flexShrink: 0, borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <div
              style={{
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => setServiceModalOpen(!serviceModalOpen)}
            >
              <Space>
                <PlusOutlined style={{ color: primaryColor }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>Add a service</span>
              </Space>
              <span style={{ fontSize: 12, color: "#64748b" }}>{serviceModalOpen ? "Hide" : "Show"}</span>
            </div>

            {serviceModalOpen && (
              <div style={{ padding: "0 16px 16px", maxHeight: 360, overflowY: "auto" }}>
                <div className="hotel-pills" style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 4 }}>
                  {productsData?.map((category: any) => {
                    const active = category._id === activeServiceCategoryId;
                    return (
                      <button
                        key={category._id}
                        type="button"
                        onClick={() => {
                          setActiveServiceCategoryId(category._id);
                          setServiceSearchTerm("");
                        }}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 999,
                          border: `1px solid ${active ? primaryColor : "#e2e8f0"}`,
                          background: active ? `${primaryColor}12` : "#fff",
                          color: active ? primaryColor : "#475569",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {category.name}
                      </button>
                    );
                  })}
                </div>

                <Input
                  placeholder="Search services"
                  value={serviceSearchTerm}
                  onChange={(e) => setServiceSearchTerm(e.target.value)}
                  prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                  style={{ marginBottom: 10, borderRadius: 8 }}
                  allowClear
                />

                {filteredProducts.length > 0 ? (
                  <List
                    size="small"
                    dataSource={filteredProducts}
                    renderItem={(product: any) => (
                      <List.Item
                        style={{ padding: "8px 4px" }}
                        actions={[
                          <Button key="add" type="primary" size="small" onClick={() => handleAddServiceToCart(product)} style={{ borderRadius: 6 }}>
                            Add
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={
                            <Avatar
                              icon={<ShoppingCartOutlined />}
                              size={32}
                              style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                            />
                          }
                          title={<span style={{ fontSize: 13, fontWeight: 600 }}>{product.name}</span>}
                          description={<span style={{ fontSize: 12, color: "#64748b" }}>{ksh(product.price)}</span>}
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="No services" imageStyle={{ height: 40 }} />
                )}
              </div>
            )}
          </div>
        </Drawer>
      )}

      {/* Add floor */}
      <Modal
        title="Add a floor"
        open={addFloorModalOpen}
        onCancel={() => {
          setAddFloorModalOpen(false);
          floorForm.resetFields();
        }}
        onOk={() => floorForm.submit()}
        okText="Add floor"
        centered
      >
        <Form form={floorForm} layout="vertical" onFinish={handleAddFloor}>
          <Form.Item name="name" label="Floor name" rules={[{ required: true, message: "Enter a floor name" }]}>
            <Input placeholder="e.g. Ground floor, 1st floor" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add room */}
      <Modal
        title="Add a room"
        open={addRoomModalOpen}
        onCancel={() => {
          setAddRoomModalOpen(false);
          roomForm.resetFields();
        }}
        onOk={() => roomForm.submit()}
        okText="Add room"
        centered
      >
        <Form form={roomForm} layout="vertical" onFinish={handleAddRoom}>
          <Form.Item name="name" label="Room name" rules={[{ required: true, message: "Enter a room name" }]}>
            <Input placeholder="e.g. Room 101, Suite A" />
          </Form.Item>
          <Form.Item name="locatedAt" label="Floor" rules={[{ required: true, message: "Choose a floor" }]}>
            <Select placeholder="Choose a floor" showSearch optionFilterProp="children" loading={!floorsData}>
              {floorsData?.map((floor: any) => (
                <Select.Option key={floor._id} value={floor._id}>
                  {floor.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HotelPage;
