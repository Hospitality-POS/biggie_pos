import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Menu from "@mui/material/Menu";
import MenuIcon from "@mui/icons-material/Menu";
import Container from "@mui/material/Container";
import Avatar from "@mui/material/Avatar";
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
import { useSelector } from "react-redux";

const pages = ["Staff", "Restaurant", "Bar", "Kitchen", "Tables"];
const settings = ["Dashboard", "Logout"];

function Navbar() {
  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(
    null
  );
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(
    null
  );
  const { user } = useSelector((state) => state.auth);
  

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
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* <AdbIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} /> */}
          <img src="/bigsmoke icon.png" alt="logo" height={60} />

          <Typography
            variant="h6"
            noWrap
            component="a"
            sx={{
              mr: 2,
              display: { xs: "none", md: "flex" },
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: ".2rem",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            BigSmoke
          </Typography>

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
                  ) : page === "Bar" ? (
                    <Typography
                      textAlign="center"
                      fontSize="inherit"
                      onClick={() => navigate("/bar")}
                    >
                      Bar
                    </Typography>
                  ) : page === "Staff" ? (
                    <Typography
                      textAlign="center"
                      fontSize="inherit"
                      onClick={() => navigate("/staff")}
                    >
                      Staff
                    </Typography>
                  ) : page === "Kitchen" ? (
                    <Typography
                      textAlign="center"
                      fontSize="inherit"
                      onClick={() => navigate("/kitchen")}
                    >
                      Kitchen
                    </Typography>
                  ) : page === "Tables" ? (
                    <Typography
                      textAlign="center"
                      fontSize="inherit"
                      onClick={() => navigate("/tables")}
                    >
                      Tables
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
            {pages.map((page) => (
              <Button
                key={page}
                style={{ display: "flex", flexDirection: "column" }}
                onClick={handleCloseNavMenu}
                sx={{ my: 2, color: "white", display: "block" }}
              >
                {page === "Restaurant" && user ? (
                  <>
                    <RestaurantOutlinedIcon
                      style={{ fontSize: "16px" }}
                      onClick={() => navigate("/restaurant")}
                    />
                    <Typography
                      fontSize="inherit"
                      onClick={() => navigate("/restaurant")}
                    >
                      Restaurant
                    </Typography>
                  </>
                ) : page === "Bar" && user ? (
                  <>
                    <SportsBarIcon
                      onClick={() => navigate("/bar")}
                      style={{ fontSize: "16px" }}
                    />
                    <Typography
                      fontSize="inherit"
                      onClick={() => navigate("/bar")}
                    >
                      Bar
                    </Typography>
                  </>
                ) : page === "Staff" ? (
                  <>
                    <PeopleIcon
                      style={{ fontSize: "16px" }}
                      onClick={() => navigate("/staff")}
                    />
                    <Typography
                      fontSize="inherit"
                      onClick={() => navigate("/staff")}
                    >
                      Staff
                    </Typography>
                  </>
                ) : page === "Kitchen" && user ? (
                  <>
                    <SoupKitchenIcon
                      onClick={() => navigate("/kitchen")}
                      style={{ fontSize: "16px" }}
                    />
                    <Typography
                      fontSize="inherit"
                      onClick={() => navigate("/kitchen")}
                    >
                      Kitchen
                    </Typography>
                  </>
                ) : page === "Tables" && user ? (
                  <>
                    <TableBarIcon
                      style={{ fontSize: "16px" }}
                      onClick={() => navigate("/tables")}
                    />
                    <Typography
                      fontSize="inherit"
                      onClick={() => navigate("/tables")}
                    >
                      Tables
                    </Typography>
                  </>
                ) : (
                  ""
                )}
              </Button>
            ))}
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
                  <Typography textAlign="center">{setting}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
export default Navbar;
