import React, { useCallback, useEffect, useState } from "react";
import {
  AppBar,
  Box,
  Tab,
  Tabs,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useAppDispatch } from "../../store";
import {
  generatePurchaseReport,
  generateSalesReport,
} from "../../features/Report/reportActions";
import PurchaseReportModal from "../../components/Reports/PurchaseReport";
import SalesReportModal from "../../components/Reports/SalesReport";

// Dummy data for reports
const generateReport = (type: string, startDate: string, endDate: string) => {
  // You can replace this with actual report generation logic
  return `Generated ${type} report from ${startDate} to ${endDate}.`;
};

const Reports: React.FC = () => {
  const [openM, setOpenM] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [report, setReport] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  // console.log("ujube", endDate.toString(), startDate);

  const dispatch = useAppDispatch();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setOpenM(false)
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleStartDateChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const formattedDate = formatDate(event.target.value);
    setStartDate(formattedDate);
  };

  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const formattedDate = formatDate(event.target.value);
    setEndDate(formattedDate);
  };

  const generateReportHandler = () => {
    if (!startDate && !endDate) {
      return;
    }
    setOpenM(true);
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    const formattedPayload = {
      startDate: formattedStartDate,
      endDate: formattedEndDate,
    };
    if (activeTab === 0) {
      dispatch(generateSalesReport(formattedPayload));
    } else if (activeTab === 1) {
      dispatch(generatePurchaseReport(formattedPayload));
    } else if (activeTab === 2) {
      // Handle the "Suppliers" case here or remove this condition if not needed
    }
  };

  const isGenerateButtonDisabled = !startDate || !endDate;

  const onCloseM = () => {
    setOpenM(false);
  };

  return (
    <>
      <Grid container spacing={2} padding={2}>
        <Grid item xs={8}>
          <Typography variant="h5" gutterBottom>
            Generate Reports
          </Typography>
          <AppBar position="static" color="default">
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="Sale" />
              <Tab label="Purchase" />
              <Tab label="Suppliers" />
            </Tabs>
          </AppBar>

          <Box mt={2}>
            <Button
              variant="outlined"
              onClick={generateReportHandler}
              disabled={isGenerateButtonDisabled}
            >
              Generate Report
            </Button>
            {activeTab === 1 ? <PurchaseReportModal openM={openM} onCloseM={onCloseM} startDate={startDate} endDate={endDate} /> : activeTab === 0 ? <SalesReportModal openM={openM} onCloseM={onCloseM} startDate={startDate} endDate={endDate}/>:""}
          </Box>
          <Box mt={2}>
            {report && (
              <Paper>
                {/* Display the report here */}
                <Typography variant="h6">Report Preview</Typography>
                <Typography variant="body1">{report}</Typography>
              </Paper>
            )}
          </Box>
        </Grid>
        <Grid item xs={4} marginTop={5}>
          {/* Filters */}
          <Paper>
            {/* Add your filter components here */}
            <Typography
              variant="h6"
              paddingLeft={2}
              gutterBottom
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <FilterListIcon />
              Filters
            </Typography>
            {/* Add filter components */}
            <Box
              mt={2}
              sx={{ display: "flex", gap: 2, paddingLeft: 2, paddingBottom: 2 }}
            >
              <TextField
                label="Start Date"
                type="date"
                value={startDate}
                InputLabelProps={{
                  shrink: true,
                }}
                onChange={handleStartDateChange}
                variant="outlined"
              />
              <TextField
                label="End Date"
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                InputLabelProps={{
                  shrink: true,
                }}
                variant="outlined"
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </>
  );
};

export default Reports;
