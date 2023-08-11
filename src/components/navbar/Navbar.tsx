import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Menu from "@mui/material/Menu";
import MenuIcon from "@mui/icons-material/Menu";
import Container from "@mui/material/Container";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import FilterFramesIcon from "@mui/icons-material/FilterFrames";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import MenuItem from "@mui/material/MenuItem";
import SearchIcon from "@mui/icons-material/Search";
import InputBase from "@mui/material/InputBase";
import { styled, alpha } from "@mui/material/styles";
import RestaurantOutlinedIcon from "@mui/icons-material/RestaurantOutlined";
import SportsBarIcon from "@mui/icons-material/SportsBar";
import PeopleIcon from "@mui/icons-material/People";
import SoupKitchenIcon from "@mui/icons-material/SoupKitchen";
import { useNavigate } from "react-router-dom";
import TableBarIcon from "@mui/icons-material/TableBar";
import Avvvatars from "avvvatars-react";
import { useDispatch, useSelector } from "react-redux";
import { reset } from "../../features/Auth/AuthSlice";
import StoreIcon from "@mui/icons-material/Store";
import { logoutUser } from "../../features/Auth/AuthActions";
import SettingsIcon from "@mui/icons-material/Settings";
import { fetchOrders } from "../../features/Order/OrderActions";
// import { IconButton } from '@mui/material';
const pages = [
  "Staff",
  "Tables",
  "Restaurant",
  "Store",
  "Orders",
  "Kitchen",
  "Bar",
];
const settings = ["Dashboard", "Profile", "Logout"];

function Navbar() {
  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(
    null
  );
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(
    null
  );
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { user } = useSelector((state: any) => state.auth);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    dispatch(reset());
  };

  const handleTabClick = (page: string) => {
    if (page === "Restaurant") navigate("/tables");
    // else if (page === "Bar") navigate("/bar");
    else if (page === "Staff") navigate("/staffs");
    // else if (page === "Kitchen") navigate("/kitchen");
    else if (page === "Tables") navigate("/tables");
    else if (page === "Store") navigate("/store");
    else if (page === "Orders") {
      navigate("/Orders");
      dispatch(fetchOrders());
    }
  };

  const Search = styled("div")(({ theme }) => ({
    position: "relative",
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.common.white, 0.15),
    "&:hover": {
      backgroundColor: alpha(theme.palette.common.white, 0.25),
    },
    marginRight: theme.spacing(2),
    marginLeft: 0,
    width: "100%",
    [theme.breakpoints.up("sm")]: {
      marginLeft: theme.spacing(3),
      width: "auto",
    },
  }));

  const SearchIconWrapper = styled("div")(({ theme }) => ({
    padding: theme.spacing(0, 2),
    height: "100%",
    position: "absolute",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }));

  const StyledInputBase = styled(InputBase)(({ theme }) => ({
    color: "inherit",
    "& .MuiInputBase-input": {
      padding: theme.spacing(1, 1, 1, 0),
      // vertical padding + font size from searchIcon
      paddingLeft: `calc(1em + ${theme.spacing(4)})`,
      transition: theme.transitions.create("width"),
      width: "100%",
      [theme.breakpoints.up("md")]: {
        width: "20ch",
      },
    },
  }));
  return (
    <AppBar position="static">
      <Container maxWidth="xl" sx={{ bgcolor: "#6c1c2c" }}>
        <Toolbar disableGutters>
          
          <img
            src="/android-chrome-192x192.png"
            alt="logo"
            height={70}
            width={120}
          />

        

          <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none" } }}>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "left",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "left",
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{
                display: { xs: "block", md: "none" },
              }}
            >
              {pages.map((page) => (
                <MenuItem key={page} onClick={handleCloseNavMenu}>
                  {page === "Restaurant" ? (
                    <Typography
                      textAlign="center"
                      fontSize="inherit"
                      onClick={() => navigate("/restaurant")}
                    >
                      Restaurant
                    </Typography>
                  ) : //  page === "Bar" ? (
                  //   <Typography
                  //     textAlign="center"
                  //     fontSize="inherit"
                  //     onClick={() => navigate("/bar")}
                  //   >
                  //     Bar
                  //   </Typography>
                  // )
                  //  :
                  page === "Staff" ? (
                    <Typography
                      textAlign="center"
                      fontSize="inherit"
                      onClick={() => navigate("/staff")}
                    >
                      Staff
                    </Typography>
                  ) : 
                  //  page === "Kitchen" ? (
                  //   <Typography
                  //     textAlign="center"
                  //     fontSize="inherit"
                  //     onClick={() => navigate("/kitchen")}
                  //   >
                  //     Kitchen
                  //   </Typography>
                  // ) :
                  page === "Tables" ? (
                    <Typography
                      textAlign="center"
                      fontSize="inherit"
                      onClick={() => navigate("/tables")}
                    >
                      Tables
                    </Typography>
                  ) : page === "Store" ? (
                    <Typography
                      textAlign="center"
                      fontSize="inherit"
                      onClick={() => navigate("/store")}
                    >
                      Store
                    </Typography>
                  ) : page === "Orders" ? (
                    <Typography
                      textAlign="center"
                      fontSize="inherit"
                      onClick={() => navigate("/Orders")}
                    >
                      Orders
                    </Typography>
                  ) : (
                    ""
                  )}
                </MenuItem>
              ))}
            </Menu>
          </Box>
          <Search>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase
              placeholder="Search…"
              inputProps={{ "aria-label": "search" }}
            />
          </Search>
          <Box
            sx={{
              flexGrow: 1,
              display: { xs: "none", md: "flex", alignItems: "flex-end" },
            }}
          >
            <Tabs
              value={false}
              variant="scrollable"
              textColor="inherit"
              scrollButtons="auto"
            >
              {pages.map((page) => (
                <Tab
                  key={page}
                  label={
                    <>
                      {page === "Restaurant" && user ? (
                        <>
                          <RestaurantOutlinedIcon
                            style={{ fontSize: "16px" }}
                          />
                          <Typography fontSize="inherit">Restaurant</Typography>
                        </>
                      ) : // page === "Bar" && user ? (
                      //   <>
                      //     <SportsBarIcon style={{ fontSize: "16px" }} />
                      //     <Typography fontSize="inherit">Bar</Typography>
                      //   </>
                      // ) :
                      page === "Staff" && !user ? (
                        <>
                          <PeopleIcon style={{ fontSize: "16px" }} />
                          <Typography fontSize="inherit">Staff</Typography>
                        </>
                      ) : // page === "Kitchen" && user ? (
                      //   <>
                      //     <SoupKitchenIcon style={{ fontSize: "16px" }} />
                      //     <Typography fontSize="inherit">Kitchen</Typography>
                      //   </>
                      // ) :
                      page === "Tables" && user ? (
                        <>
                          <TableBarIcon style={{ fontSize: "16px" }} />
                          <Typography fontSize="inherit">Tables</Typography>
                        </>
                      ) : page === "Store" && user?.isAdmin ? (
                        <>
                          <StoreIcon style={{ fontSize: "16px" }} />
                          <Typography fontSize="inherit">Store</Typography>
                        </>
                      ) : page === "Orders" && user?.isAdmin ? (
                        <>
                          <FilterFramesIcon style={{ fontSize: "16px" }} />
                          <Typography fontSize="inherit">Orders</Typography>
                        </>
                      ) : null}
                    </>
                  }
                  onClick={() => handleTabClick(page)}
                />
              ))}
            </Tabs>
          </Box>

          <Box sx={{ flexGrow: 0 }}>
            {user && (
              <Tooltip title="Open settings">
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                  {/* <Avatar alt="Remy Sharp" src="/static/images/avatar/2.jpg" /> */}
                  <Avvvatars
                    value={user?.email}
                    shadow={true}
                    style="character"
                    borderSize={0.5}
                    border={true}
                  />
                </IconButton>
              </Tooltip>
            )}
            <Menu
              sx={{ mt: "45px" }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              {settings.map((setting) => (
                <MenuItem key={setting} onClick={handleCloseUserMenu}>
                  {setting === "Logout" ? (
                    <Typography textAlign="center" onClick={handleLogout}>
                      Logout
                    </Typography>
                  ) : setting === "Dashboard" && user?.isAdmin ? (
                    <Typography textAlign="center">Dashboard</Typography>
                  ) : setting === "Profile" ? (
                    <Typography textAlign="center">Profile</Typography>
                  ) : (
                    ""
                  )}
                </MenuItem>
              ))}
            </Menu>
            {user?.isAdmin && (
              <IconButton style={{ color: "white" }}>
                <MenuIcon />
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
export default Navbar;
