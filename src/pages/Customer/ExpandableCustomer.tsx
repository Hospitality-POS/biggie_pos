import React, { useMemo } from 'react';
import { Table, Button, Space, Tag, Typography, Rate, Tooltip } from 'antd';
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined, StarOutlined } from '@ant-design/icons';
import { utils as XLSXUtils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { Title, Text } = Typography;

const ExportableVisitsTable = ({ record }) => {
  const { created_by, visits } = record;

  const formatTimeDisplay = (dateString) => {
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
    };
  };

  const columns = [
    {
      title: 'Visit Date',
      dataIndex: 'date',
      key: 'date',
      width: '20%',
      sorter: (a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime(),
    },
    {
      title: 'Visit Time',
      dataIndex: 'time',
      key: 'time',
      width: '15%',
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      width: '15%',
      sorter: (a, b) => a.rating - b.rating,
      render: (rating) => (
        <Space>
          <Rate disabled defaultValue={rating} />
          <Text>({rating})</Text>
        </Space>
      ),
    },
    {
      title: 'Review',
      dataIndex: 'review',
      key: 'review',
      ellipsis: true,
      width: '35%',
      render: (review) => {
        if (!review) return <Text>No review provided</Text>;
        return (
          <Tooltip title={review} placement="topLeft">
            <Text>{review}</Text>
          </Tooltip>
        );
      },
    },
    // {
    //   title: 'Created By',
    //   dataIndex: 'createdBy',
    //   key: 'createdBy',
    //   width: '15%',
    //   render: (text) => <Tag color="blue">{text}</Tag>,
    // },
  ];

  interface TableData {
    key: string | number;
    date: string;
    time: string;
    rating: number;
    review: string;
    createdBy: string | undefined;
    rawDate: string;
  }

  const tableData: TableData[] = useMemo(() => {
    return visits.map((visit, index) => {
      const { date, time } = formatTimeDisplay(visit.createdAt);
      return {
        key: visit._id || index,
        date,
        time,
        rating: visit.rating || 0,
        review: visit.review || '',
        createdBy: created_by?.username,
        rawDate: visit.createdAt,
      };
    });
  }, [visits, created_by]);

  const exportToExcel = () => {
    const exportData = tableData.map(({ date, time, rating, review, createdBy }) => ({
      'Visit Date': date,
      'Visit Time': time,
      'Rating': rating,
      'Review': review,
      'Created By': createdBy,
    }));

    const ws = XLSXUtils.json_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 20 },
      { wch: 10 },
      { wch: 8 },
      { wch: 50 },
      { wch: 15 },
    ];

    const wb = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(wb, ws, 'Visits');
    writeFile(wb, 'customer_visits.xlsx');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Customer Visit History', 14, 15);
    doc.setFontSize(10);
    doc.text(`Created By: ${created_by.username}`, 14, 25);
    doc.text(`Export Date: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableRows = tableData.map(row => [
      row.date,
      row.time,
      `${row.rating}/5`,
      row.review,
      created_by.username,
    ]);

    autoTable(doc, {
      head: [['Visit Date', 'Visit Time', 'Rating', 'Review', 'Created By']],
      body: tableRows,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 20 },
        2: { cellWidth: 15 },
        3: { cellWidth: 80, overflow: 'linebreak' },
        4: { cellWidth: 25 },
      },
    });

    doc.save('customer_visits.pdf');
  };

  return (
    <div className="space-y-4">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Space direction="vertical" size="small">
          <Title level={5}>Visit History</Title>
        </Space>
        <Space>
          <Button icon={<FileExcelOutlined />} onClick={exportToExcel} >Export to Excel</Button>
          <Button icon={<FilePdfOutlined />} onClick={exportToPDF} >Export to PDF</Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={tableData}
        size="middle"
        pagination={{ pageSize: 5, showSizeChanger: true, showTotal: (total) => `Total ${total} visits` }}
        scroll={{ x: true }}
      />
    </div>
  );
};

export default ExportableVisitsTable;
