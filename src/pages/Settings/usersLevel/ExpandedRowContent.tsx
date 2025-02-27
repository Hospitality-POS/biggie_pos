import React from "react";
import { ProDescriptions } from "@ant-design/pro-components";
import { Typography, List, Card, Tag, Space, Button, Dropdown } from "antd";
import {
  ClockCircleOutlined,
  CalendarOutlined,
  LoginOutlined,
  LogoutOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

interface ClockRecord {
  _id: string;
  clock_in: string;
  clock_out?: string;
}

interface Shop {
  _id: string;
  name: string;
  location: string;
}
interface EmployeeRecord {
  pin: string;
  username: string;
  createdAt: string;
  phone: string;
  clockInArray: ClockRecord[];
  email: string;
  shop_id: Shop;
}

interface ExpandedRowContentProps {
  record: EmployeeRecord;
}

const ExpandedRowContent: React.FC<ExpandedRowContentProps> = ({ record }) => {
  const { pin, username, createdAt, phone, clockInArray, email, shop_id } =
    record;
  const formattedCreatedAt = new Date(createdAt).toLocaleString();

  const formatTimeDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      fullDate: date,
    };
  };

  const employeeInfo = [
    {
      title: "Username",
      dataIndex: "username",
      value: username,
    },
    {
      title: "Pin",
      dataIndex: "pin",
      value: pin,
    },
    {
      title: "Phone No.",
      dataIndex: "phone",
      value: phone,
    },
    {
      title: "Date created",
      dataIndex: "createdAt",
      value: formattedCreatedAt,
    },
  ];

  // Calculate duration between clock in and clock out
  const calculateDuration = (clockInTime: Date, clockOutTime?: Date) => {
    if (!clockOutTime) return "In Progress";

    const diffMs = clockOutTime.getTime() - clockInTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  // Export to Excel with professional formatting
  const exportToExcel = () => {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);

    // Add company/app name and report title
    XLSX.utils.sheet_add_aoa(
      ws,
      [
        [`TIMESHEET REPORT`],
        [`Generated on: ${new Date().toLocaleString()}`],
        [""],
      ],
      { origin: "A1" }
    );

    // Add employee information section
    XLSX.utils.sheet_add_aoa(
      ws,
      [
        [`EMPLOYEE INFORMATION`],
        [`Name:`, username],
        [`Employee Email:`, email],
        [`Phone:`, phone],
        [`Shop:`, shop_id?.name - shop_id?.location],
        [`Account Created:`, formattedCreatedAt],
        [""],
      ],
      { origin: "A5" }
    );

    // Add clock records header
    XLSX.utils.sheet_add_aoa(
      ws,
      [
        [`ATTENDANCE RECORDS`],
        [""],
        ["Date", "Day", "Clock In", "Clock Out", "Duration", "Status"],
      ],
      { origin: "A12" }
    );

    // Add clock records data
    let rowData = [];
    clockInArray.forEach((record: ClockRecord) => {
      const clockInInfo = formatTimeDisplay(record.clock_in);
      const clockOutInfo = record.clock_out
        ? formatTimeDisplay(record.clock_out)
        : null;

      const day = clockInInfo.fullDate.toLocaleDateString("en-US", {
        weekday: "long",
      });
      const status = record.clock_out ? "Completed" : "In Progress";
      const duration = calculateDuration(
        clockInInfo.fullDate,
        clockOutInfo ? clockOutInfo.fullDate : undefined
      );

      rowData.push([
        clockInInfo.fullDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
        day,
        clockInInfo.time,
        clockOutInfo ? clockOutInfo.time : "Active",
        duration,
        status,
      ]);
    });

    XLSX.utils.sheet_add_aoa(ws, rowData, { origin: "A15" });

    // Add summary section
    const totalEntries = clockInArray.length;
    const completedEntries = clockInArray.filter((r) => r.clock_out).length;
    const activeEntries = totalEntries - completedEntries;

    const lastRow = 15 + rowData.length + 1;

    XLSX.utils.sheet_add_aoa(
      ws,
      [
        [""],
        [`SUMMARY`],
        [`Total Records:`, totalEntries],
        [`Completed Shifts:`, completedEntries],
        [`Active Shifts:`, activeEntries],
      ],
      { origin: `A${lastRow}` }
    );

    // Set column widths
    const colWidths = [
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
    ];
    ws["!cols"] = colWidths;

    // Add the worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Timesheet");

    // Save the file
    XLSX.writeFile(wb, `${username}_timesheet.xlsx`);
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();

    // Add company logo placeholder (could be replaced with actual logo)
    doc.setTextColor(24, 144, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("TIMESHEET REPORT", 30, 18);

    // Add report generation information
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text("Confidential - For internal use only", 100, 30);
    doc.text("powered by ReliaPos", 160, 30);

    // Add employee information section
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, 35, 196, 35);

    doc.setFontSize(14);
    doc.setTextColor(24, 144, 255);
    doc.setFont("helvetica", "bold");
    doc.text("EMPLOYEE INFORMATION", 14, 42);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Name:", 14, 52);
    doc.text("Shop", 14, 60);
    doc.text("Email:", 14, 68);
    doc.text("Account Created:", 14, 76);

    doc.setFont("helvetica", "normal");
    doc.text(username, 60, 52);
    doc.text(shop_id?.name, 60, 60);
    doc.text(email, 60, 68);
    doc.text(formattedCreatedAt, 60, 76);

    // Add attendance records section
    doc.line(14, 85, 196, 85);

    doc.setFontSize(14);
    doc.setTextColor(24, 144, 255);
    doc.setFont("helvetica", "bold");
    doc.text("ATTENDANCE RECORDS", 14, 92);

    // Prepare data for table
    const tableData = [];

    clockInArray.forEach((record: ClockRecord) => {
      const clockInInfo = formatTimeDisplay(record.clock_in);
      const clockOutInfo = record.clock_out
        ? formatTimeDisplay(record.clock_out)
        : null;

      const formattedDate = clockInInfo.fullDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const day = clockInInfo.fullDate.toLocaleDateString("en-US", {
        weekday: "long",
      });
      const status = record.clock_out ? "Completed" : "In Progress";
      const duration = calculateDuration(
        clockInInfo.fullDate,
        clockOutInfo ? clockOutInfo.fullDate : undefined
      );

      tableData.push([
        formattedDate,
        day,
        clockInInfo.time,
        clockOutInfo ? clockOutInfo.time : "Active",
        duration,
        status,
      ]);
    });

    // @ts-ignore - jspdf-autotable types are not recognized but the function exists
    doc.autoTable({
      startY: 100,
      head: [["Date", "Day", "Clock In", "Clock Out", "Duration", "Status"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [24, 144, 255],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      styles: {
        cellPadding: 3,
        fontSize: 10,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 30 },
      },
      alternateRowStyles: {
        fillColor: [245, 245, 250],
      },
    });

    // Add summary section
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(14);
    doc.setTextColor(24, 144, 255);
    doc.setFont("helvetica", "bold");
    doc.text("SUMMARY", 14, finalY);

    const totalEntries = clockInArray.length;
    const completedEntries = clockInArray.filter((r) => r.clock_out).length;
    const activeEntries = totalEntries - completedEntries;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Total Records:", 14, finalY + 10);
    doc.text("Completed Shifts:", 14, finalY + 18);
    doc.text("Active Shifts:", 14, finalY + 26);

    doc.setFont("helvetica", "normal");
    doc.text(totalEntries?.toString(), 60, finalY + 10);
    doc.text(completedEntries?.toString(), 60, finalY + 18);
    doc.text(activeEntries?.toString(), 60, finalY + 26);

    // Add footer
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `Page ${i} of ${pageCount}`,
        14,
        doc.internal.pageSize.height - 10
      );
      doc.text(
        `Confidential - For internal use only`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
      doc.text(
        `${username} - Timesheet Report`,
        doc.internal.pageSize.width - 14,
        doc.internal.pageSize.height - 10,
        { align: "right" }
      );
    }

    // Save the PDF
    doc.save(`${username}_timesheet.pdf`);
  };

  const exportOptions = [
    {
      key: "excel",
      label: "Export to Excel",
      icon: <FileExcelOutlined />,
      onClick: exportToExcel,
    },
    {
      key: "pdf",
      label: "Export to PDF",
      icon: <FilePdfOutlined />,
      onClick: exportToPDF,
    },
  ];

  return (
    <div style={{ padding: "16px" }}>
      <ProDescriptions
        size="small"
        tooltip="Employee Information"
        layout="horizontal"
        title="Employee Details"
        dataSource={{ pin, username, createdAt: formattedCreatedAt, phone }}
        columns={employeeInfo}
      />

      <Card
        title={
          <Typography.Title level={5} style={{ margin: 0 }}>
            Clock In/Out History
          </Typography.Title>
        }
        style={{ marginTop: "16px" }}
        extra={
          clockInArray.length > 0 && (
            <Space>
              <Dropdown menu={{ items: exportOptions }}>
                <Button type="primary" icon={<DownloadOutlined />}>Export</Button>
              </Dropdown>
            </Space>
          )
        }
      >
        <List
          size="small"
          dataSource={clockInArray}
          renderItem={(record: ClockRecord) => {
            const clockIn = formatTimeDisplay(record.clock_in);
            const clockOut = record.clock_out
              ? formatTimeDisplay(record.clock_out)
              : null;

            return (
              <List.Item
                key={record._id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  alignItems: "start",
                }}
              >
                <Space direction="vertical" size="small">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <CalendarOutlined style={{ color: "#1890ff" }} />
                    <span style={{ fontWeight: "500" }}>{clockIn.date}</span>
                  </div>
                  <Space size="large">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <LoginOutlined style={{ color: "#52c41a" }} />
                      <span>In: {clockIn.time}</span>
                    </div>
                    {clockOut ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <LogoutOutlined style={{ color: "#f5222d" }} />
                        <span>Out: {clockOut.time}</span>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <ClockCircleOutlined style={{ color: "#fa8c16" }} />
                        <Tag color="orange">Currently Working</Tag>
                      </div>
                    )}
                  </Space>
                </Space>
              </List.Item>
            );
          }}
          locale={{ emptyText: "No Clock In or Out recorded" }}
        />
      </Card>
    </div>
  );
};

export default ExpandedRowContent;
