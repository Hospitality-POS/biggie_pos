// import React, { useCallback, useEffect, useState } from "react";
// import {
//   AppBar,
//   Box,
//   Tab,
//   Tabs,
//   Typography,
//   Paper,
//   Grid,
//   Button,
//   TextField,
// } from "@mui/material";
// import FilterListIcon from "@mui/icons-material/FilterList";
// import { useAppDispatch } from "../../store";
// import {
//   generatePurchaseReport,
//   generateSalesReport,
// } from "../../features/Report/reportActions";
// import PurchaseReportModal from "../../components/Reports/PurchaseReport";
// import SalesReportModal from "../../components/Reports/SalesReport";

// // Dummy data for reports
// const generateReport = (type: string, startDate: string, endDate: string) => {
//   // You can replace this with actual report generation logic
//   return `Generated ${type} report from ${startDate} to ${endDate}.`;
// };

// const Reports: React.FC = () => {
//   const [openM, setOpenM] = useState(false);
//   const [activeTab, setActiveTab] = useState(0);
//   const [report, setReport] = useState<string | null>(null);
//   const [startDate, setStartDate] = useState<string>("");
//   const [endDate, setEndDate] = useState<string>("");
//   // console.log("ujube", endDate.toString(), startDate);

//   const dispatch = useAppDispatch();

//   const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
//     setActiveTab(newValue);
//     setOpenM(false);
//   };

//   const formatDate = (dateString: string) => {
//     const date = new Date(dateString);
//     const year = date.getFullYear();
//     const month = `${date.getMonth() + 1}`.padStart(2, "0");
//     const day = `${date.getDate()}`.padStart(2, "0");
//     return `${year}-${month}-${day}`;
//   };

//   const handleStartDateChange = (
//     event: React.ChangeEvent<HTMLInputElement>
//   ) => {
//     const formattedDate = formatDate(event.target.value);
//     setStartDate(formattedDate);
//   };

//   const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const formattedDate = formatDate(event.target.value);
//     setEndDate(formattedDate);
//   };

//   const generateReportHandler = () => {
//     if (!startDate && !endDate) {
//       return;
//     }
//     setOpenM(true);
//     const formattedStartDate = formatDate(startDate);
//     const formattedEndDate = formatDate(endDate);
//     const formattedPayload = {
//       startDate: formattedStartDate,
//       endDate: formattedEndDate,
//     };
//     if (activeTab === 0) {
//       dispatch(generateSalesReport(formattedPayload));
//     } else if (activeTab === 1) {
//       dispatch(generatePurchaseReport(formattedPayload));
//     } else if (activeTab === 2) {
//       // Handle the "Suppliers" case here or remove this condition if not needed
//     }
//   };

//   const isGenerateButtonDisabled = !startDate || !endDate;

//   const onCloseM = () => {
//     setOpenM(false);
//   };

//   return (
//     <>
//       <Grid container spacing={2} padding={2}>
//         <Grid item xs={8}>
//           <Typography variant="h5" gutterBottom>
//             Generate Reports
//           </Typography>
//           <AppBar position="static" color="default">
//             <Tabs
//               value={activeTab}
//               onChange={handleTabChange}
//               indicatorColor="primary"
//               textColor="primary"
//               sx={{
//                 "& .MuiTabs-indicator": {
//                   backgroundColor: "#6c1c2c",
//                 },
//               }}
//             >
//               <Tab label="Sale" />
//               <Tab label="Purchase" />
//               {/* <Tab label="Suppliers" /> */}
//             </Tabs>
//           </AppBar>

//           <Box mt={2}>
//             <Button
//               variant="contained"
//               onClick={generateReportHandler}
//               disabled={isGenerateButtonDisabled}
//               sx={{
//                 bgcolor: "#6c1c2c",
//                 "&:hover": {
//                   bgcolor: "#bc8c7c",
//                   color: "#ffff",
//                 },
//               }}
//             >
//               Generate Report
//             </Button>
//             {activeTab === 1 ? (
//               <PurchaseReportModal
//                 openM={openM}
//                 onCloseM={onCloseM}
//                 startDate={startDate}
//                 endDate={endDate}
//               />
//             ) : activeTab === 0 ? (
//               <SalesReportModal
//                 openM={openM}
//                 onCloseM={onCloseM}
//                 startDate={startDate}
//                 endDate={endDate}
//               />
//             ) : (
//               ""
//             )}
//           </Box>
//           <Box mt={2}>
//             {report && (
//               <Paper>
//                 {/* Display the report here */}
//                 <Typography variant="h6">Report Preview</Typography>
//                 <Typography variant="body1">{report}</Typography>
//               </Paper>
//             )}
//           </Box>
//         </Grid>
//         <Grid item xs={4} marginTop={5}>
//           {/* Filters */}
//           <Paper>
//             {/* Add your filter components here */}
//             <Typography
//               variant="h6"
//               paddingLeft={2}
//               gutterBottom
//               sx={{ display: "flex", alignItems: "center", gap: 1 }}
//             >
//               <FilterListIcon />
//               Filters
//             </Typography>
//             {/* Add filter components */}
//             <Box
//               mt={2}
//               sx={{ display: "flex", gap: 2, paddingLeft: 2, paddingBottom: 2 }}
//             >
//               <TextField
//                 label="Start Date"
//                 type="date"
//                 value={startDate}
//                 InputLabelProps={{
//                   shrink: true,
//                 }}
//                 onChange={handleStartDateChange}
//                 variant="outlined"
//               />
//               <TextField
//                 label="End Date"
//                 type="date"
//                 value={endDate}
//                 onChange={handleEndDateChange}
//                 InputLabelProps={{
//                   shrink: true,
//                 }}
//                 variant="outlined"
//               />
//             </Box>
//           </Paper>
//         </Grid>
//       </Grid>
//     </>
//   );
// };

// export default Reports;

import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  DatePicker,
  Select,
  Tabs,
  Typography,
  Row,
  Col,
  Card,
} from "antd";
import {
  FilterOutlined,
  FileTextOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import ProTable from "@ant-design/pro-table";
import { useDispatch } from "react-redux";
import {
  generatePurchaseReport,
  generateSalesReport,
} from "../../features/Report/reportActions";
import PurchaseReportModal from "../../components/Reports/PurchaseReport";
import SalesReportModal from "../../components/Reports/SalesReport";

const { TabPane } = Tabs;
const { Option } = Select;



const Reports: React.FC = () => {
  const [openM, setOpenM] = useState(false);
  const [activeTab, setActiveTab] = useState("sale");
  const [report, setReport] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");


  const dispatch = useDispatch();

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setOpenM(false);
  };

  const formatDate = (dateString: string) => {
    // Format the date using Ant Design DatePicker format
    return dateString;
  };

  const handleStartDateChange = (date: any, dateString: string) => {
    setStartDate(dateString);
  };

  const handleEndDateChange = (date: any, dateString: string) => {
    setEndDate(dateString);
  };

  const generateReportHandler = () => {
    if (!startDate || !endDate) {
      return;
    }
    setOpenM(true);
    const formattedPayload = {
      startDate,
      endDate,
    };
    if (activeTab === "sale") {
      dispatch(generateSalesReport(formattedPayload));
    } else if (activeTab === "purchase") {
      dispatch(generatePurchaseReport(formattedPayload));
    }
  };

  const isGenerateButtonDisabled = !startDate || !endDate;

  const onCloseM = () => {
    setOpenM(false);
  };



  return (
    <>
      <Row gutter={12}>
        <Col span={16} style={{padding: 20}}>
          <Typography.Title level={4}>Generate Reports</Typography.Title>
          <Tabs activeKey={activeTab} onChange={handleTabChange}>
            <TabPane tab="Sale" key="sale" />
            <TabPane tab="Purchase" key="purchase" />
          </Tabs>

          <Button
            type="primary"
            onClick={generateReportHandler}
            disabled={isGenerateButtonDisabled}
          >
            Generate Report
          </Button>

          {activeTab === "purchase" && (
            <PurchaseReportModal
              openM={openM}
              onCloseM={onCloseM}
              startDate={startDate}
              endDate={endDate}
            />
          )}

          {activeTab === "sale" && (
            <SalesReportModal
              openM={openM}
              onCloseM={onCloseM}
              startDate={startDate}
              endDate={endDate}
            />
          )}

          {report && (
            <Card>
              <Typography.Title level={5}>Report Preview</Typography.Title>
              <Typography.Paragraph>{report}</Typography.Paragraph>
            </Card>
          )}
        </Col>
        <Col span={6} style={{padding: 20}}>
          <Card>
            <Typography.Title level={5}>
              <FilterOutlined /> Filters
            </Typography.Title>

            <DatePicker
              style={{ marginBottom: 16, width: "100%" }}
              onChange={handleStartDateChange}
            />
            <DatePicker
              style={{ marginBottom: 16, width: "100%" }}
              onChange={handleEndDateChange}
            />
          </Card>
        </Col>
      </Row>

    </>
  );
};

export default Reports;

