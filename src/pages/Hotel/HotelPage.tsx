import React, { useState, useEffect } from "react";
import {
  AppstoreOutlined,
  PlusOutlined,
  HomeOutlined,
  UserOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { Row, Col, Statistic, Button, Space, Typography, Empty, Spin, Alert, Tabs, Modal, Form, Input, Select, List, Avatar, Drawer } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchTableUsequery, addNewTableLocation, addNewTable, getTableLocation } from "@services/tables";
import { getAllProducts } from "@services/products";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { useAppSelector } from "src/store";
import CartDrawer from "@components/cart/CartDrawer";
import { getCart, createCart, addItemToCart } from "@features/Cart/CartActions";
import { useAppDispatch } from "src/store";
import { message } from "antd";

const { Text, Title } = Typography;

// ── Room Card Component ────────────────────────────────────────────────────────
interface RoomCardProps {
  room: any;
  onOpen: (roomId: string) => void;
  primaryColor: string;
  cartItemsCount?: number;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, onOpen, primaryColor, cartItemsCount = 0 }) => {
  const isOccupied = room.cart_amount != null && room.cart_amount > 0;
  const statusColor = isOccupied ? "#ef4444" : "#10b981";

  const handleClick = async () => {
    await onOpen(room._id);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        borderRadius: 14,
        border: `1.5px solid ${isOccupied ? "#fecaca" : "#d1fae5"}`,
        cursor: "pointer",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        position: "relative",
        overflow: "hidden",
        transition: "box-shadow 0.2s, transform 0.2s",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
      }}
    >
      {/* Colored top accent */}
      <div style={{ height: 5, background: isOccupied ? "linear-gradient(90deg, #ef4444, #f87171)" : "linear-gradient(90deg, #10b981, #34d399)", borderRadius: "14px 14px 0 0" }} />

      <div style={{ padding: "16px 16px 14px" }}>
        {/* Room icon + status dot */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            background: isOccupied ? "#fef2f2" : "#f0fdf4",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            color: isOccupied ? "#ef4444" : "#10b981",
          }}>
            <HomeOutlined />
          </div>
          <span style={{
            background: isOccupied ? "#fef2f2" : "#f0fdf4",
            color: statusColor,
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: 20,
            border: `1px solid ${isOccupied ? "#fecaca" : "#a7f3d0"}`,
            letterSpacing: 0.3,
          }}>
            {isOccupied ? "Occupied" : "Available"}
          </span>
        </div>

        {/* Room name */}
        <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
          {room.name || "Unnamed Room"}
        </div>

        {/* Cart info */}
        {cartItemsCount > 0 && (
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
            🛒 {cartItemsCount} {cartItemsCount === 1 ? "item" : "items"} in cart
          </div>
        )}

        {room.cart_amount ? (
          <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600, marginBottom: 4 }}>
            Ksh {room.cart_amount.toLocaleString()}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600, marginBottom: 4 }}>Not Occupied</div>
        )}

        {room.served_by && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
            <UserOutlined style={{ fontSize: 11, color: "#94a3b8" }} />
            <span style={{ fontSize: 11, color: "#94a3b8" }}>{room.served_by}</span>
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={(e) => { e.stopPropagation(); handleClick(); }}
          style={{
            width: "100%",
            marginTop: 12,
            padding: "9px 0",
            background: isOccupied ? primaryColor : "#f1f5f9",
            color: isOccupied ? "#fff" : primaryColor,
            border: `1.5px solid ${isOccupied ? primaryColor : "#e2e8f0"}`,
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {isOccupied ? "View Room" : "Check In"}
        </button>
      </div>
    </div>
  );
};

// ── Floor Tab Content ───────────────────────────────────────────────────────────
interface FloorContentProps {
  floor: any;
  onOpenRoom: (roomId: string) => void;
  primaryColor: string;
  cartDetails?: any;
}

const FloorContent: React.FC<FloorContentProps> = ({ floor, onOpenRoom, primaryColor, cartDetails }) => {
  const [roomSearch, setRoomSearch] = useState("");
  const allRooms: any[] = floor.tables || [];
  const rooms = allRooms.filter((r: any) =>
    r.name?.toLowerCase().includes(roomSearch.toLowerCase())
  );
  const occupiedCount = allRooms.filter((r: any) => r.cart_amount != null && r.cart_amount > 0).length;
  const availableCount = allRooms.length - occupiedCount;

  // Get cart items count for each room
  const getRoomCartItemsCount = (roomId: string) => {
    if (cartDetails?.table_id === roomId && cartDetails?.items) {
      return cartDetails.items.length;
    }
    return 0;
  };

  if (allRooms.length === 0) {
    return (
      <Empty
        description="No rooms configured on this location"
        style={{ padding: "40px 0" }}
      />
    );
  }

  return (
    <div>
      {/* Stats + Search */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { label: "Total", value: allRooms.length, color: primaryColor, bg: `${primaryColor}10` },
            { label: "Occupied", value: occupiedCount, color: "#ef4444", bg: "#fef2f2" },
            { label: "Available", value: availableCount, color: "#10b981", bg: "#f0fdf4" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{
              background: bg,
              border: `1px solid ${color}30`,
              borderRadius: 10,
              padding: "8px 18px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: 80,
            }}>
              <span style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.2 }}>{value}</span>
              <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500, marginTop: 2 }}>{label}</span>
            </div>
          ))}
        </div>
        <Input
          placeholder="Search rooms..."
          value={roomSearch}
          onChange={(e) => setRoomSearch(e.target.value)}
          prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
          allowClear
          size="small"
          style={{ width: 220, borderRadius: 8 }}
        />
      </div>

      {rooms.length === 0 && roomSearch && (
        <Empty description={`No rooms matching "${roomSearch}"`} style={{ padding: "24px 0" }} />
      )}

      <Row gutter={[16, 16]}>
        {rooms.map((room: any) => (
          <Col key={room._id} xs={12} sm={8} md={6} lg={4} xl={4}>
            <RoomCard 
              room={room} 
              onOpen={onOpenRoom} 
              primaryColor={primaryColor} 
              cartItemsCount={getRoomCartItemsCount(room._id)} 
            />
          </Col>
        ))}
      </Row>
    </div>
  );
};

// ── Main Hotel Page Component ───────────────────────────────────────────────────
const HotelPage: React.FC = () => {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [activeFloorId, setActiveFloorId] = useState<string>("overview");
  const [addFloorModalOpen, setAddFloorModalOpen] = useState(false);
  const [addRoomModalOpen, setAddRoomModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [activeServiceCategoryId, setActiveServiceCategoryId] = useState<string | null>(null);
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [floorForm] = Form.useForm();
  const [roomForm] = Form.useForm();
  const primaryColor = usePrimaryColor();
  const { user } = useAppSelector((state) => state.auth);
  const { cartDetails } = useAppSelector((state) => state.cart);
  const dispatch = useAppDispatch();

  const storedCode = localStorage.getItem("companyCode");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["hotel-floors", activeFloorId],
    queryFn: () => {
      if (storedCode) {
        if (activeFloorId === "overview") {
          return fetchTableUsequery({ id: "overview" });
        } else {
          return fetchTableUsequery({ id: activeFloorId });
        }
      }
      return [];
    },
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
    if (cartResult.type.endsWith('/rejected') || !cartResult.payload?._id) {
      const userId = user?.id || user?._id;
      if (!userId) {
        message.error("User not authenticated");
        return;
      }
      const createResult = await dispatch(createCart({
        table_id: roomId,
        created_by: userId,
      } as any));
      if (createResult.type.endsWith('/fulfilled')) {
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
      await dispatch(addItemToCart({
        cart_id: cartDetails._id,
        product_id: product._id,
        product_type: 'Product',
        price: product.price,
        created_by: userId as string,
        quantity: 1,
        desc: product.desc || product.name,
        table_id: selectedRoomId,
      }));
      message.success(`${product.name} added to cart`);
      setServiceModalOpen(false);
      refetch();
    } catch (error) {
      message.error("Failed to add service to cart");
    }
  };

  const handleAddFloor = async (values: any) => {
    try {
      await addNewTableLocation(values);
      message.success("Floor added successfully");
      setAddFloorModalOpen(false);
      floorForm.resetFields();
    } catch (error) {
      message.error("Failed to add floor");
    }
  };

  const handleAddRoom = async (values: any) => {
    try {
      await addNewTable(values);
      message.success("Room added successfully");
      setAddRoomModalOpen(false);
      roomForm.resetFields();
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
    if (selectedRoomId) {
      refetch();
    }
  }, [cartDetails?.items?.length]);

  const handleTabChange = (key: string) => {
    setActiveFloorId(key);
  };

  // ── Overview Tab Content ─────────────────────────────────────────────────────
  const overviewContent = (
    <div
      style={{
        minHeight: 400,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        borderRadius: 12,
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          background: `${primaryColor}15`,
          borderRadius: "50%",
          width: 80,
          height: 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <HomeOutlined style={{ fontSize: 36, color: primaryColor }} />
      </div>
      <Title level={3} style={{ color: "#0f172a", marginBottom: 8 }}>
        Room Management
      </Title>
      <Text style={{ fontSize: 14, color: "#64748b", marginBottom: 24, textAlign: "center" }}>
        Select a location from the tabs above to view and manage rooms
      </Text>
      <Space size={12}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddFloorModalOpen(true)}
          disabled={user?.role !== "admin" && user?.role !== "cashier"}
          style={{
            backgroundColor: primaryColor,
            borderColor: primaryColor,
            borderRadius: 8,
            fontWeight: 500,
          }}
        >
          Add Location
        </Button>
        <Button
          type="default"
          icon={<PlusOutlined />}
          onClick={() => setAddRoomModalOpen(true)}
          disabled={user?.role !== "admin" && user?.role !== "cashier"}
          style={{
            borderRadius: 8,
            fontWeight: 500,
          }}
        >
          Add Room
        </Button>
      </Space>
    </div>
  );

  // ── Generate Tab Items ───────────────────────────────────────────────────────
  const tabItems = [
    {
      key: "overview",
      label: (
        <Space size={6}>
          <AppstoreOutlined />
          <span>Setup</span>
        </Space>
      ),
      children: overviewContent,
    },
    ...(data?.map((floor: any) => ({
      key: floor._id,
      label: (
        <Space size={6}>
          <HomeOutlined />
          <span>{floor.name || "Unnamed Floor"}</span>
        </Space>
      ),
      children: (
        <FloorContent floor={floor} onOpenRoom={handleOpenRoom} primaryColor={primaryColor} cartDetails={cartDetails} />
      ),
    })) || []),
  ];

  // ── Loading State ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <Spin size="large" tip="Loading hotel data..." />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert
        message="Error Loading Hotel Data"
        description="Failed to load floors and rooms. Please try again."
        type="error"
        showIcon
        style={{ margin: 20 }}
      />
    );
  }

  // ── Header Stats ─────────────────────────────────────────────────────────────
  const allRooms = data?.flatMap((f: any) => f.tables) || [];
  const totalOccupied = allRooms.filter((r: any) => r.isOccupied || r.isLocked).length;
  const totalRevenue = allRooms.reduce((sum: number, r: any) => sum + (r.cart_amount || 0), 0);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "24px", minHeight: "100vh" }}>
      <ProCard
        bordered={false}
        title={
          <Space size={8} align="center">
            <div
              style={{
                background: `${primaryColor}15`,
                borderRadius: 8,
                padding: "6px 7px",
                color: primaryColor,
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              <HomeOutlined />
            </div>
            <Text strong style={{ fontSize: 15, color: "#0f172a" }}>Hotel Rooms</Text>
          </Space>
        }
        extra={
          <Space size={16}>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              loading={isLoading}
              size="small"
            >
              Refresh
            </Button>
            <Statistic
              title="Occupancy"
              value={allRooms.length > 0 ? Math.round((totalOccupied / allRooms.length) * 100) : 0}
              suffix="%"
              valueStyle={{ fontSize: 18, color: primaryColor }}
            />
            <Statistic
              title="Revenue"
              value={totalRevenue}
              prefix="Ksh"
              valueStyle={{ fontSize: 18, color: "#10b981" }}
            />
          </Space>
        }
        style={{ borderRadius: 12, boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02)" }}
      >
        <Tabs
          activeKey={activeFloorId}
          onChange={handleTabChange}
          items={tabItems}
          type="card"
          size="large"
          style={{ marginTop: 16 }}
        />
      </ProCard>

      {selectedRoomId && (
        <Drawer
          title={
            <Space>
              <ShoppingCartOutlined />
              <span>Room</span>
            </Space>
          }
          placement="right"
          width={480}
          open={!!selectedRoomId}
          onClose={() => setSelectedRoomId(null)}
          styles={{
            body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
          }}
        >
          {/* Cart Section */}
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            <CartDrawer />
          </div>

          {/* Add Service Section */}
          <div style={{ flexShrink: 0, borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
            <div
              style={{
                padding: '10px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => setServiceModalOpen(!serviceModalOpen)}
            >
              <Space>
                <PlusOutlined style={{ color: primaryColor }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>Add Service</span>
              </Space>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{serviceModalOpen ? '▲ Hide' : '▼ Show'}</span>
            </div>

            {serviceModalOpen && (
              <div style={{ padding: '0 16px 16px', maxHeight: 360, overflowY: 'auto' }}>
                {/* Category Tabs */}
                <div style={{
                  display: 'flex',
                  gap: 6,
                  marginBottom: 10,
                  overflowX: 'auto',
                  paddingBottom: 4,
                  borderBottom: '1px solid #e2e8f0',
                }}>
                  {productsData?.map((category: any) => (
                    <button
                      key={category._id}
                      onClick={() => {
                        setActiveServiceCategoryId(category._id);
                        setServiceSearchTerm('');
                      }}
                      style={{
                        padding: '5px 11px',
                        borderRadius: 6,
                        border: 'none',
                        background: category._id === activeServiceCategoryId ? primaryColor : '#e2e8f0',
                        color: category._id === activeServiceCategoryId ? '#fff' : '#64748b',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <Input
                  placeholder="Search services..."
                  value={serviceSearchTerm}
                  onChange={(e) => setServiceSearchTerm(e.target.value)}
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  style={{ marginBottom: 10, borderRadius: 6, fontSize: 12 }}
                  allowClear
                  size="small"
                />

                {/* Products List */}
                {filteredProducts.length > 0 ? (
                  <List
                    size="small"
                    dataSource={filteredProducts}
                    renderItem={(product: any) => (
                      <List.Item
                        style={{ padding: '8px 4px' }}
                        actions={[
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => handleAddServiceToCart(product)}
                            style={{ background: primaryColor, borderColor: primaryColor, borderRadius: 6 }}
                          >
                            Add
                          </Button>
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
                          title={<span style={{ fontSize: 12, fontWeight: 600 }}>{product.name}</span>}
                          description={<span style={{ fontSize: 11, color: '#64748b' }}>Ksh {product.price != null ? product.price.toLocaleString() : '0'}</span>}
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

      {/* Add Floor Modal */}
      <Modal
        title="Add New Location"
        open={addFloorModalOpen}
        onCancel={() => {
          setAddFloorModalOpen(false);
          floorForm.resetFields();
        }}
        onOk={() => floorForm.submit()}
        okText="Add Location"
        cancelText="Cancel"
        centered
      >
        <Form form={floorForm} layout="vertical" onFinish={handleAddFloor}>
          <Form.Item
            name="name"
            label="Location Name"
            rules={[{ required: true, message: "Location name is required" }]}
          >
            <Input placeholder="Enter floor name (e.g., Ground Floor, First Floor)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Room Modal */}
      <Modal
        title="Add New Room"
        open={addRoomModalOpen}
        onCancel={() => {
          setAddRoomModalOpen(false);
          roomForm.resetFields();
        }}
        onOk={() => roomForm.submit()}
        okText="Add Room"
        cancelText="Cancel"
        centered
      >
        <Form form={roomForm} layout="vertical" onFinish={handleAddRoom}>
          <Form.Item
            name="name"
            label="Room Name"
            rules={[{ required: true, message: "Room name is required" }]}
          >
            <Input placeholder="Enter room name (e.g., Room 101, Suite A)" />
          </Form.Item>
          <Form.Item
            name="locatedAt"
            label="Location"
            rules={[{ required: true, message: "Location is required" }]}
          >
            <Select
              placeholder="Select a location"
              showSearch
              optionFilterProp="children"
              loading={!floorsData}
            >
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
