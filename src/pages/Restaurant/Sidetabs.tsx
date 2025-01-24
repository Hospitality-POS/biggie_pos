import React, { useCallback, useEffect, useState } from "react";
import {
  Tab,
  Tabs,
  Box,
  Typography,
  Tooltip,
  useTheme,
  useMediaQuery,
  styled,
  IconButton,
  Paper,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../store";
import { fetchCategoriesByID } from "../../features/Category/CategoryActions";
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MenuIcon from '@mui/icons-material/Menu';

interface VerticalTabProps {
  handleSub: () => void;
}

interface SubCategory {
  _id: string;
  name: string;
}

const StyledTab = styled(Tab)(({ theme }) => ({
  minHeight: 48,
  minWidth: 200,
  padding: '12px 16px',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  textAlign: 'left',
  textTransform: 'none',
  borderBottom: `1px solid rgba(255, 255, 255, 0.12)`,
  '&.Mui-selected': {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  '& .MuiTab-wrapper': {
    alignItems: 'flex-start',
  }
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: '8px',
  backgroundColor: '#5a1724',
  // Optional: Add subtle border
  borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
}));

const TabLabel = ({ name, isCollapsed }: { name: string; isCollapsed: boolean }) => (
  <Typography
    noWrap
    component="div"
    sx={{
      fontSize: '0.875rem',
      fontWeight: 'medium',
      width: '100%',
      textAlign: 'left',
      opacity: isCollapsed ? 0 : 1,
      transition: 'opacity 0.2s',
    }}
  >
    {name}
  </Typography>
);

const VerticalTabs: React.FC<VerticalTabProps> = ({ handleSub }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useAppDispatch();
  const { subCategory: Subcategories } = useAppSelector((state) => state.Categories);

  const [value, setValue] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(!isMobile);


  const handleChangeSubCategory = (subcategoryID: string) => {
    dispatch(fetchCategoriesByID(subcategoryID));
    handleSub();
    if (isMobile) {
      setIsDrawerOpen(false);
    }
  };



  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
    if (isCollapsed && !isDrawerOpen) {
      setIsCollapsed(false);
    }
  };

  const subId = "6525f8292d06da587b70d5db";

  const fetchProductsBySub = useCallback(async () => {
    return dispatch(fetchCategoriesByID(subId));
  }, [dispatch]);

  useEffect(() => {
    fetchProductsBySub();
  }, [fetchProductsBySub]);

  useEffect(() => {
    if (isMobile) {
      setIsDrawerOpen(false);
      setIsCollapsed(false);
    }
  }, [isMobile]);

  if (!Subcategories?.length) {
    return null;
  }

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <IconButton
          onClick={toggleDrawer}
          sx={{
            position: 'fixed',
            left: 16,
            top: 16,
            zIndex: 1200,
            bgcolor: '#6c1c2c',
            color: 'white',
            '&:hover': {
              bgcolor: '#5a1724',
            },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Main Sidebar */}
      <Box
        sx={{
          position: isMobile ? 'fixed' : 'relative',
          left: 0,
          top: isMobile ? 0 : 'auto',
          height: '100%',
          zIndex: 1,
          transform: isDrawerOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease-in-out, width 0.3s ease-in-out',
          width: isCollapsed ? '60px' : (isMobile ? '100%' : '250px'),
        }}
      >
        <Paper
          elevation={3}
          sx={{
            height: '100%',
            bgcolor: '#6c1c2c',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <DrawerHeader>
            {!isMobile && (
              <IconButton
                onClick={toggleCollapse}
                sx={{ color: 'white' }}
              >
                {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
              </IconButton>
            )}
          </DrawerHeader>

          <Tabs
            orientation={isMobile ? "horizontal" : "vertical"}
            value={value}
            onChange={handleChange}
            indicatorColor="secondary"
            textColor="inherit"
            variant="scrollable"
            scrollButtons={isMobile ? "auto" : false}
            sx={{
              borderRight: isMobile ? 0 : 1,
              borderColor: 'divider',
              minHeight: isMobile ? 'auto' : 'calc(100vh - 64px)',
              '& .MuiTabs-indicator': {
                left: isMobile ? 'auto' : 0,
                width: isMobile ? 'auto' : '3px',
              },
            }}
          >
            {Subcategories.map((subcateg: SubCategory, index: number) => (
              <Tooltip
                key={subcateg._id}
                title={isCollapsed ? subcateg.name : ''}
                placement={isMobile ? "bottom" : "right"}
                enterDelay={500}
              >
                <StyledTab
                  onClick={() => handleChangeSubCategory(subcateg._id)}
                  label={<TabLabel name={subcateg.name} isCollapsed={isCollapsed} />}
                  id={`vertical-tab-${index}`}
                  aria-controls={`vertical-tabpanel-${index}`}
                  sx={{
                    minWidth: isCollapsed ? 60 : 200,
                    color: 'white',
                    padding: isCollapsed ? '12px 0' : '12px 16px',
                  }}
                />
              </Tooltip>
            ))}
          </Tabs>
        </Paper>
      </Box>

      {/* Overlay for mobile */}
      {isMobile && isDrawerOpen && (
        <Box
          onClick={toggleDrawer}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1,
          }}
        />
      )}
    </>
  );
};

export default VerticalTabs;