import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import Drawer from "@mui/material/Drawer";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import TableBarIcon from "@mui/icons-material/TableBar";
import StoreIcon from "@mui/icons-material/Store";
import FilterFramesIcon from "@mui/icons-material/FilterFrames";
import RestaurantOutlinedIcon from "@mui/icons-material/RestaurantOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store";
import { reset } from "../../features/Auth/AuthSlice";
import { logoutUser } from "../../features/Auth/AuthActions";
import { fetchOrders } from "../../features/Order/OrderActions";
import { fetchProducts } from "../../features/Product/ProductAction";
import SettingsModal from "../Settings/SettingsModal";
import {
  AppstoreOutlined,
  LogoutOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Badge, Space, Typography as AntTypography } from "antd";

const { Text } = AntTypography;

// ── Nav items ─────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  action?: () => void;
}

const getNavItems = (dispatch: any): NavItem[] => [
  {
    label: "Tables",
    path: "/tables",
    icon: <TableBarIcon style={{ fontSize: 18 }} />,
  },
  {
    label: "Services",
    path: "/store",
    icon: <StoreIcon style={{ fontSize: 18 }} />,
    adminOnly: true,
    action: () => dispatch(fetchProducts()),
  },
  {
    label: "Orders",
    path: "/Orders",
    icon: <FilterFramesIcon style={{ fontSize: 18 }} />,
    adminOnly: true,
    action: () => dispatch(fetchOrders()),
  },
  {
    label: "Restaurant",
    path: "/restaurant",
    icon: <RestaurantOutlinedIcon style={{ fontSize: 18 }} />,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIMARY_BG = "#6c1c2c";
const PRIMARY_LIGHT = "rgba(255,255,255,0.12)";
const PRIMARY_BORDER = "rgba(255,255,255,0.2)";

// ── Navbar ─────────────────────────────────────────────────────────────────────

function Navbar() {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [activePath, setActivePath] = React.useState(window.location.pathname);

  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const navItems = getNavItems(dispatch);

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || user?.role === "admin"
  );

  const handleNav = (item: NavItem) => {
    setActivePath(item.path);
    item.action?.();
    navigate(item.path);
    setDrawerOpen(false);
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    dispatch(reset());
    navigate("/tables");
    setDrawerOpen(false);
  };

  // ── Mobile drawer ───────────────────────────────────────────────────────────
  const MobileDrawer = (
    <Drawer
      anchor="left"
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      PaperProps={{
        sx: {
          width: 280,
          background: "#fff",
          borderRight: "none",
          boxShadow: "4px 0 32px rgba(0,0,0,0.12)",
        },
      }}
    >
      {/* Drawer header */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${PRIMARY_BG} 0%, #8b2035 100%)`,
          padding: "20px 16px 16px",
          position: "relative",
        }}
      >
        <IconButton
          onClick={() => setDrawerOpen(false)}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            background: PRIMARY_LIGHT,
            border: `1px solid ${PRIMARY_BORDER}`,
            color: "white",
            width: 30,
            height: 30,
            "&:hover": { background: "rgba(255,255,255,0.25)" },
          }}
          size="small"
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>

        {/* Logo */}
        <img
          src="/android-chrome-192x192.png"
          alt="logo"
          style={{
            height: 44,
            width: "auto",
            objectFit: "contain",
            marginBottom: 16,
            filter: "brightness(0) invert(1)",
          }}
        />

        {/* User strip */}
        {user && (
          <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Badge dot color="green" offset={[-3, 26]}>
              <Avatar
                icon={<UserOutlined />}
                size={42}
                style={{ border: "2px solid rgba(255,255,255,0.4)", background: PRIMARY_LIGHT }}
              />
            </Badge>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  color: "white",
                  fontWeight: 600,
                  fontSize: "14px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user?.name || "User"}
              </Typography>
              <Box
                sx={{
                  display: "inline-block",
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: "4px",
                  padding: "1px 8px",
                  fontSize: "10px",
                  color: "rgba(255,255,255,0.9)",
                  mt: "2px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {user?.role || "Staff"}
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* Nav items */}
      <List sx={{ pt: 1, pb: 0, flex: 1 }}>
        {visibleItems.map((item) => {
          const isActive = activePath === item.path;
          return (
            <ListItem key={item.label} disablePadding sx={{ px: 1, mb: "2px" }}>
              <ListItemButton
                onClick={() => handleNav(item)}
                sx={{
                  borderRadius: "10px",
                  py: "10px",
                  background: isActive ? `${PRIMARY_BG}12` : "transparent",
                  borderLeft: isActive ? `3px solid ${PRIMARY_BG}` : "3px solid transparent",
                  "&:hover": { background: `${PRIMARY_BG}08` },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 34,
                    color: isActive ? PRIMARY_BG : "#64748b",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: "14px",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? PRIMARY_BG : "#1e293b",
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: "#f1f5f9", mx: 1 }} />

      {/* Bottom actions */}
      <List sx={{ py: 1 }}>
        {user?.role === "admin" && (
          <ListItem disablePadding sx={{ px: 1, mb: "2px" }}>
            <ListItemButton
              onClick={() => { setSettingsOpen(true); setDrawerOpen(false); }}
              sx={{ borderRadius: "10px", py: "10px", "&:hover": { background: "#f1f5f9" } }}
            >
              <ListItemIcon sx={{ minWidth: 34, color: "#6366f1" }}>
                <SettingsIcon sx={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText
                primary="Settings"
                primaryTypographyProps={{ fontSize: "14px", color: "#374151" }}
              />
            </ListItemButton>
          </ListItem>
        )}
        {user && (
          <ListItem disablePadding sx={{ px: 1 }}>
            <ListItemButton
              onClick={handleLogout}
              sx={{ borderRadius: "10px", py: "10px", "&:hover": { background: "#fef2f2" } }}
            >
              <ListItemIcon sx={{ minWidth: 34, color: "#ef4444" }}>
                <LogoutIcon sx={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText
                primary="Logout"
                primaryTypographyProps={{ fontSize: "14px", color: "#ef4444", fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>
        )}
      </List>
    </Drawer>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <AppBar
        position="static"
        sx={{
          background: `linear-gradient(135deg, ${PRIMARY_BG} 0%, #8b2035 100%)`,
          boxShadow: "0 2px 12px rgba(108,28,44,0.3)",
        }}
      >
        <Toolbar
          disableGutters
          sx={{
            px: { xs: "12px", md: "24px" },
            minHeight: { xs: "52px !important", md: "64px !important" },
            gap: 1,
          }}
        >
          {/* ── Hamburger (mobile) ── */}
          <IconButton
            onClick={() => setDrawerOpen(true)}
            sx={{
              display: { xs: "flex", md: "none" },
              background: PRIMARY_LIGHT,
              border: `1px solid ${PRIMARY_BORDER}`,
              color: "white",        // ← white hamburger
              width: 36,
              height: 36,
              borderRadius: "8px",
              mr: 1,
              "&:hover": { background: "rgba(255,255,255,0.22)" },
            }}
            size="small"
          >
            <MenuIcon sx={{ fontSize: 18, color: "white" }} />
          </IconButton>

          {/* ── Logo ── */}
          <Box
            component="img"
            src="/android-chrome-192x192.png"
            alt="logo"
            sx={{
              height: { xs: 36, md: 48 },
              width: "auto",
              objectFit: "contain",
              mr: { xs: 0, md: 2 },
              filter: "brightness(0) invert(1)",
            }}
          />

          {/* ── Desktop nav tabs ── */}
          <Box
            sx={{
              flexGrow: 1,
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              gap: "4px",
              ml: 1,
            }}
          >
            {visibleItems.map((item) => {
              const isActive = activePath === item.path;
              return (
                <Box
                  key={item.label}
                  onClick={() => handleNav(item)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    background: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                    border: isActive ? `1px solid ${PRIMARY_BORDER}` : "1px solid transparent",
                    transition: "all 0.15s ease",
                    "&:hover": { background: "rgba(255,255,255,0.12)" },
                  }}
                >
                  <Box sx={{ color: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", fontSize: 15 }}>
                    {item.icon}
                  </Box>
                  <Typography
                    sx={{
                      color: isActive ? "white" : "rgba(255,255,255,0.8)",
                      fontSize: "13px",
                      fontWeight: isActive ? 600 : 400,
                      lineHeight: 1,
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {/* ── Spacer (mobile) ── */}
          <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none" } }} />

          {/* ── Right actions ── */}
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Settings (admin only) */}
            {user?.role === "admin" && (
              <Tooltip title="Settings">
                <IconButton
                  onClick={() => setSettingsOpen(true)}
                  sx={{
                    background: PRIMARY_LIGHT,
                    border: `1px solid ${PRIMARY_BORDER}`,
                    color: "white",
                    width: 36,
                    height: 36,
                    borderRadius: "8px",
                    "&:hover": { background: "rgba(255,255,255,0.22)" },
                  }}
                  size="small"
                >
                  <AppstoreOutlined style={{ fontSize: 16, color: "white" }} />
                </IconButton>
              </Tooltip>
            )}

            {/* Avatar */}
            {user && (
              <Tooltip title={user?.name || "User"}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: PRIMARY_LIGHT,
                    border: `1px solid ${PRIMARY_BORDER}`,
                    borderRadius: "50px",
                    padding: "4px 10px 4px 4px",
                    cursor: "pointer",
                    "&:hover": { background: "rgba(255,255,255,0.18)" },
                  }}
                >
                  <Badge dot color="green" offset={[-2, 22]}>
                    <Avatar
                      icon={<UserOutlined />}
                      size={26}
                      style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)" }}
                    />
                  </Badge>
                  <Box sx={{ display: { xs: "none", md: "block" } }}>
                    <Typography
                      sx={{
                        color: "white",
                        fontSize: "12px",
                        fontWeight: 600,
                        lineHeight: 1.2,
                        maxWidth: 90,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {user?.name || "User"}
                    </Typography>
                    <Typography
                      sx={{
                        color: "rgba(255,255,255,0.7)",
                        fontSize: "10px",
                        lineHeight: 1,
                        textTransform: "capitalize",
                      }}
                    >
                      {user?.role}
                    </Typography>
                  </Box>
                </Box>
              </Tooltip>
            )}

            {/* Logout */}
            {user && (
              <Tooltip title="Logout">
                <IconButton
                  onClick={handleLogout}
                  sx={{
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#fca5a5",
                    width: 36,
                    height: 36,
                    borderRadius: "8px",
                    "&:hover": { background: "rgba(239,68,68,0.25)" },
                  }}
                  size="small"
                >
                  <LogoutIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {MobileDrawer}

      <SettingsModal
        sidebarOpen={settingsOpen}
        handleSidebarClose={() => setSettingsOpen(false)}
      />
    </>
  );
}

export default Navbar;