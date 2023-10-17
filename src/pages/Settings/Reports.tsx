import React, { useState } from "react";
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
import { useQueries, useQuery } from "@tanstack/react-query";
import axios from "axios";

// Dummy data for reports
const generateReport = (type: string, startDate: string, endDate: string) => {
  // You can replace this with actual report generation logic
  return `Generated ${type} report from ${startDate} to ${endDate}.`;
};

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [report, setReport] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleStartDateChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setStartDate(event.target.value);
  };

  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(event.target.value);
  };

  const generateReportHandler = () => {
    if (!startDate || !endDate) {
      return;
    }
    if (activeTab === 0) {
      setReport(generateReport("Sale", startDate, endDate));
    } else if (activeTab === 1) {
      setReport(generateReport("Purchase", startDate, endDate));
    } else if (activeTab === 2) {
      setReport(generateReport("Suppliers", startDate, endDate));
    }
    // Add more conditions for other report types as needed
  };

  const isGenerateButtonDisabled = !startDate || !endDate;
  const fetchSalesReportDate = { startDate, endDate };

  const fetchSalesReport = async () => {
    const res = await axios.get(
      `http://localhost:3000/orders/date-range-sales/items/`,
      {
        fetchSalesReportDate,
      }
    );
    return res.data;
  };

  const { isLoading, isError, error, data } = useQuery({
    queryKey: ["sales-report"],
    queryFn: () => fetchSalesReport(),
  });

  console.log("sales cliked", data);

  return (
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
  );
};

export default Reports;
