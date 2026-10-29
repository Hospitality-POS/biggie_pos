import React, { useState } from "react";
import {
  Drawer,
  Upload,
  Alert,
  Space,
  Table,
  Button,
  Steps,
  message,
  Typography,
  Tag,
} from "antd";
import {
  InboxOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { importProperties } from "@services/dala";

const { Dragger } = Upload;
const { Text } = Typography;

interface ParsedProperty {
  name: string;
  propertyType?: 'land' | 'apartment';
  category?: 'residential' | 'commercial' | 'industrial';
  purpose?: 'sale' | 'rent' | 'lease' | 'rental' | 'mixed';
  location?: string;
  status?: string;
  description?: string;
  currentPhase?: string;
  blocks?: Array<{
    name: string;
    description?: string;
    totalFloors?: number;
    status?: string;
    floors?: Array<{
      name: string;
      floorNumber?: number;
      status?: string;
    }>;
    units?: Array<{
      unitNumber?: string;
      unitType?: string;
      name?: string;
      description?: string;
      status?: string;
      basePrice?: number;
      price?: number;
      priceStartPoint?: number;
      pricing?: {
        basePrice?: number;
        pricePerSqm?: number;
        minPrice?: number;
        maxPrice?: number;
        currency?: string;
      };
      totalUnits?: number;
      availableUnits?: number;
      trackIndividualUnits?: boolean;
      apartments?: Array<{
        apartmentName?: string;
        status?: string;
        area?: {
          value?: number;
          unit?: string;
        };
      }>;
      plotSize?: {
        unit?: string;
      };
      specifications?: {
        bedrooms?: number;
        bathrooms?: number;
        area?: {
          value?: number;
          unit?: string;
        };
        features?: any[];
      };
    }>;
  }>;
  phases?: Array<{
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    active?: boolean;
    pricing?: {
      phasePrice?: number;
      pricePerSqm?: number;
      minPrice?: number;
      maxPrice?: number;
      currency?: string;
      priceAdjustment?: number;
    };
  }>;
  [key: string]: any;
}

interface Props {
  onSuccess: () => void;
  open: boolean;
  onClose: () => void;
}

const STEP_LABELS = ["Upload File", "Preview & Import"];

const ImportPropertiesModal: React.FC<Props> = ({ onSuccess, open, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [parsedRows, setParsedRows] = useState<ParsedProperty[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  const handleClose = () => {
    if (!submitting) {
      onClose();
      resetState();
    }
  };

  React.useEffect(() => {
    if (open) {
      resetState();
    }
  }, [open]);

  const resetState = () => {
    setCurrentStep(0);
    setParsedRows([]);
    setFileName("");
    setSubmitting(false);
  };

  const importMutation = useMutation({
    mutationFn: importProperties,
    onSuccess: () => {
      message.success("Properties imported successfully");
      onSuccess();
      setOpen(false);
      resetState();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || "Import failed";
      message.error(errorMessage);
    },
  });

  const parseExcelFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        
        const propertiesSheet = workbook.Sheets["Properties"];
        const blocksSheet = workbook.Sheets["Blocks"];
        const floorsSheet = workbook.Sheets["Floors"];
        const unitsSheet = workbook.Sheets["Units"];
        const apartmentsSheet = workbook.Sheets["Apartments"];
        const phasesSheet = workbook.Sheets["Phases"];

        if (!propertiesSheet) {
          message.error("Missing 'Properties' sheet in Excel file");
          return false;
        }

        const propertiesRows: Record<string, any>[] = XLSX.utils.sheet_to_json(propertiesSheet, { raw: false });
        const blocksRows: Record<string, any>[] = blocksSheet ? XLSX.utils.sheet_to_json(blocksSheet, { raw: false }) : [];
        const floorsRows: Record<string, any>[] = floorsSheet ? XLSX.utils.sheet_to_json(floorsSheet, { raw: false }) : [];
        const unitsRows: Record<string, any>[] = unitsSheet ? XLSX.utils.sheet_to_json(unitsSheet, { raw: false }) : [];
        const apartmentsRows: Record<string, any>[] = apartmentsSheet ? XLSX.utils.sheet_to_json(apartmentsSheet, { raw: false }) : [];
        const phasesRows: Record<string, any>[] = phasesSheet ? XLSX.utils.sheet_to_json(phasesSheet, { raw: false }) : [];

        if (propertiesRows.length === 0) {
          message.error("No properties found in the Excel file");
          return false;
        }

        const parsed: ParsedProperty[] = propertiesRows.map((propRow) => {
          const propertyName = propRow["Name"] || propRow["Property Name"] || propRow["name"] || "";
          
          const propertyBlocks = blocksRows
            .filter(b => (b["Property Name"] || b["property name"] || "") === propertyName)
            .map((blockRow) => {
              const blockName = blockRow["Block Name"] || blockRow["block name"] || blockRow["name"] || "";
              
              const blockFloors = floorsRows
                .filter(f => (f["Block Name"] || f["block name"] || "") === blockName)
                .map((floorRow) => ({
                  name: floorRow["Floor Name"] || floorRow["floor name"] || floorRow["name"] || "",
                  floorNumber: floorRow["Floor Number"] || floorRow["floor number"] || 0,
                  status: floorRow["Status"] || floorRow["status"] || "active",
                }));

              const blockUnits = unitsRows
                .filter(u => (u["Block Name"] || u["block name"] || "") === blockName)
                .map((unitRow) => {
                  const unitNumber = unitRow["Unit Number"] || unitRow["unit number"] || "";
                  
                  const unitApartments = apartmentsRows
                    .filter(a => (a["Unit Number"] || a["unit number"] || "") === unitNumber)
                    .map((aptRow) => ({
                      apartmentName: aptRow["Apartment Name"] || aptRow["apartment name"] || "",
                      status: aptRow["Status"] || aptRow["status"] || "available",
                      area: {
                        value: aptRow["Area Value"] || aptRow["area value"] || 0,
                        unit: aptRow["Area Unit"] || aptRow["area unit"] || "sqm",
                      },
                    }));

                  return {
                    unitNumber: unitNumber,
                    unitType: unitRow["Unit Type"] || unitRow["unit type"] || "",
                    name: unitRow["Unit Name"] || unitRow["unit name"] || "",
                    description: unitRow["Description"] || unitRow["description"] || "",
                    status: unitRow["Status"] || unitRow["status"] || "available",
                    basePrice: unitRow["Base Price"] || unitRow["base price"] || 0,
                    price: unitRow["Price"] || unitRow["price"] || 0,
                    priceStartPoint: unitRow["Price Start Point"] || unitRow["price start point"] || 0,
                    pricing: {
                      basePrice: unitRow["Base Price"] || unitRow["base price"] || 0,
                      pricePerSqm: unitRow["Price Per Sqm"] || unitRow["price per sqm"] || 0,
                      minPrice: unitRow["Min Price"] || unitRow["min price"] || 0,
                      maxPrice: unitRow["Max Price"] || unitRow["max price"] || 0,
                      currency: unitRow["Currency"] || unitRow["currency"] || "KES",
                    },
                    totalUnits: unitRow["Total Units"] || unitRow["total units"] || 0,
                    availableUnits: unitRow["Available Units"] || unitRow["available units"] || 0,
                    trackIndividualUnits: unitRow["Track Individual Units"] === "true" || unitRow["track individual units"] === true,
                    apartments: unitApartments,
                    plotSize: {
                      unit: "sqm",
                    },
                    specifications: {
                      bedrooms: unitRow["Bedrooms"] || unitRow["bedrooms"] || 0,
                      bathrooms: unitRow["Bathrooms"] || unitRow["bathrooms"] || 0,
                      area: {
                        value: unitRow["Area Value"] || unitRow["area value"] || 0,
                        unit: unitRow["Area Unit"] || unitRow["area unit"] || "sqm",
                      },
                      features: [],
                    },
                  };
                });

              return {
                name: blockName,
                description: blockRow["Block Description"] || blockRow["block description"] || "",
                totalFloors: blockRow["Total Floors"] || blockRow["total floors"] || 0,
                status: blockRow["Status"] || blockRow["status"] || "active",
                floors: blockFloors,
                units: blockUnits,
              };
            });

          const propertyPhases = phasesRows
            .filter(p => (p["Property Name"] || p["property name"] || "") === propertyName)
            .map((phaseRow) => ({
              name: phaseRow["Phase Name"] || phaseRow["phase name"] || "",
              description: phaseRow["Description"] || phaseRow["description"] || "",
              startDate: phaseRow["Start Date"] || phaseRow["start date"] || "",
              endDate: phaseRow["End Date"] || phaseRow["end date"] || "",
              active: phaseRow["Active"] === "true" || phaseRow["active"] === true,
              pricing: {
                phasePrice: phaseRow["Phase Price"] || phaseRow["phase price"] || 0,
                pricePerSqm: phaseRow["Price Per Sqm"] || phaseRow["price per sqm"] || 0,
                minPrice: phaseRow["Min Price"] || phaseRow["min price"] || 0,
                maxPrice: phaseRow["Max Price"] || phaseRow["max price"] || 0,
                currency: phaseRow["Currency"] || phaseRow["currency"] || "KES",
                priceAdjustment: phaseRow["Price Adjustment"] || phaseRow["price adjustment"] || 0,
              },
            }));

          return {
            name: propertyName,
            propertyType: propRow["Property Type"] || propRow["property type"] || "land",
            category: propRow["Category"] || propRow["category"] || "residential",
            purpose: propRow["Purpose"] || propRow["purpose"] || "sale",
            location: propRow["Location"] || propRow["location"] || "",
            status: propRow["Status"] || propRow["status"] || "available",
            description: propRow["Description"] || propRow["description"] || "",
            currentPhase: propRow["Current Phase"] || propRow["current phase"] || "",
            blocks: propertyBlocks,
            phases: propertyPhases,
          };
        }).filter((p) => p.name);

        if (parsed.length === 0) {
          message.error("No valid properties found. Please ensure 'Name' column is present.");
          return false;
        }

        setParsedRows(parsed);
        setCurrentStep(1);
      } catch (error) {
        message.error("Failed to parse Excel file. Please check the format.");
        console.error(error);
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const handleImport = async () => {
    try {
      setSubmitting(true);
      await importMutation.mutateAsync({ properties: parsedRows });
    } catch (error) {
      // Error handled in mutation
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    const propertiesData = [
      {
        "Name": "CHESTNUT CITY NANYUKI",
        "Property Type": "apartment",
        "Category": "residential",
        "Purpose": "sale",
        "Location": "Nanyuki, Kenya",
        "Status": "available",
        "Description": "Modern apartment complex",
        "Current Phase": "PHASE 1 (Serviced Apartments)",
      },
    ];
    const wsProperties = XLSX.utils.json_to_sheet(propertiesData);
    XLSX.utils.book_append_sheet(wb, wsProperties, "Properties");

    const blocksData = [
      {
        "Property Name": "CHESTNUT CITY NANYUKI",
        "Block Name": "BLOCK 1",
        "Block Description": "SOUTH WING",
        "Total Floors": 13,
        "Status": "active",
      },
    ];
    const wsBlocks = XLSX.utils.json_to_sheet(blocksData);
    XLSX.utils.book_append_sheet(wb, wsBlocks, "Blocks");

    const floorsData = [
      {
        "Block Name": "BLOCK 1",
        "Floor Name": "Ground Floor",
        "Floor Number": 0,
        "Status": "active",
      },
    ];
    const wsFloors = XLSX.utils.json_to_sheet(floorsData);
    XLSX.utils.book_append_sheet(wb, wsFloors, "Floors");

    const unitsData = [
      {
        "Block Name": "BLOCK 1",
        "Floor Name": "Second Floor",
        "Unit Number": "L2-02",
        "Unit Type": "one_bedroom",
        "Unit Name": "one_bedroom Unit",
        "Description": "One bedroom apartment",
        "Status": "available",
        "Base Price": 4800000,
        "Price": 4800000,
        "Price Per Sqm": 82759,
        "Currency": "KES",
        "Total Units": 8,
        "Available Units": 8,
        "Track Individual Units": "true",
        "Bedrooms": 1,
        "Bathrooms": 1,
        "Area Value": 58,
        "Area Unit": "sqm",
      },
    ];
    const wsUnits = XLSX.utils.json_to_sheet(unitsData);
    XLSX.utils.book_append_sheet(wb, wsUnits, "Units");

    const apartmentsData = [
      {
        "Unit Number": "L2-02",
        "Apartment Name": "L2-02",
        "Status": "available",
        "Area Value": 90,
        "Area Unit": "sqm",
      },
    ];
    const wsApartments = XLSX.utils.json_to_sheet(apartmentsData);
    XLSX.utils.book_append_sheet(wb, wsApartments, "Apartments");

    const phasesData = [
      {
        "Property Name": "CHESTNUT CITY NANYUKI",
        "Phase Name": "PHASE 1 (Serviced Apartments)",
        "Description": "First phase of development",
        "Start Date": "2026-04-05",
        "End Date": "2027-12-31",
        "Active": "true",
        "Phase Price": 8900000,
        "Price Per Sqm": 105952,
        "Min Price": 8900000,
        "Max Price": 8900000,
        "Currency": "KES",
        "Price Adjustment": 0,
      },
    ];
    const wsPhases = XLSX.utils.json_to_sheet(phasesData);
    XLSX.utils.book_append_sheet(wb, wsPhases, "Phases");

    XLSX.writeFile(wb, "property_import_template.xlsx");
  };

  const previewColumns = [
    { title: "Name", dataIndex: "name", width: 200 },
    { 
      title: "Type", 
      dataIndex: "propertyType", 
      width: 100,
      render: (type: string) => <Tag color={type === 'land' ? 'green' : 'blue'}>{type || 'N/A'}</Tag>
    },
    { title: "Blocks", dataIndex: "blocks", width: 80, render: (blocks: any[]) => blocks?.length || 0 },
    { title: "Units", dataIndex: "blocks", width: 80, render: (blocks: any[]) => blocks?.reduce((sum, b) => sum + (b.units?.length || 0), 0) || 0 },
    { title: "Phases", dataIndex: "phases", width: 80, render: (phases: any[]) => phases?.length || 0 },
    { title: "Location", dataIndex: "location", width: 150, ellipsis: true },
    { 
      title: "Status", 
      dataIndex: "status", 
      width: 100,
      render: (status: string) => <Tag color={status === 'available' ? 'green' : 'orange'}>{status || 'N/A'}</Tag>
    },
  ];

  return (
    <>
      <Drawer
        title={
          <Space>
            <FileExcelOutlined style={{ color: "#52c41a" }} />
            <Text strong>Import Properties from Excel</Text>
            {fileName && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                {fileName}
              </Tag>
            )}
          </Space>
        }
        open={open}
        onClose={handleClose}
        width={800}
        destroyOnClose
        footer={
          <Space style={{ justifyContent: "flex-end", width: "100%", display: "flex" }}>
            <Button onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            {currentStep > 0 && (
              <Button onClick={() => setCurrentStep(0)} disabled={submitting}>Back</Button>
            )}
            {currentStep === 1 && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleImport}
                loading={submitting}
                disabled={parsedRows.length === 0}
              >
                Import {parsedRows.length} Properties
              </Button>
            )}
          </Space>
        }
      >
        <Steps
          current={currentStep}
          items={STEP_LABELS.map((t) => ({ title: t }))}
          style={{ marginBottom: 24 }}
          size="small"
        />

        {currentStep === 0 && (
          <Space direction="vertical" style={{ width: "100%" }} size={16}>
            <Alert
              type="info"
              showIcon
              message="Import Properties from Excel"
              description={
                <div>
                  <p>Upload an Excel file with property data. The file should contain the following sheets:</p>
                  <ul>
                    <li><strong>Properties</strong> (required) - Property name, type, category, location, etc.</li>
                    <li><strong>Blocks</strong> - Block name, description, total floors (linked to properties)</li>
                    <li><strong>Floors</strong> - Floor name, floor number (linked to blocks)</li>
                    <li><strong>Units</strong> - Unit details, pricing, specifications (linked to blocks/floors)</li>
                    <li><strong>Apartments</strong> - Individual apartment details (linked to units)</li>
                    <li><strong>Phases</strong> - Phase details with pricing (linked to properties)</li>
                  </ul>
                  <p>Download the template to see the exact format and column names.</p>
                </div>
              }
            />

            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadTemplate}
              style={{ width: "100%" }}
            >
              Download Excel Template
            </Button>

            <Dragger
              accept=".xlsx,.xls,.csv"
              beforeUpload={parseExcelFile}
              showUploadList={false}
              multiple={false}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: "#52c41a", fontSize: 40 }} />
              </p>
              <p className="ant-upload-text">Click or drag an Excel file here</p>
              <p className="ant-upload-hint">
                Excel (.xlsx, .xls) or CSV format — must contain 'Properties' sheet
              </p>
            </Dragger>
          </Space>
        )}

        {currentStep === 1 && (
          <Space direction="vertical" style={{ width: "100%" }} size={16}>
            <Alert
              type="success"
              showIcon
              message={`${parsedRows.length} properties ready to import`}
              description={
                <div>
                  <p>Total: {parsedRows.reduce((sum, p) => sum + (p.blocks?.length || 0), 0)} blocks, {parsedRows.reduce((sum, p) => sum + p.blocks?.reduce((s: number, b: any) => s + (b.units?.length || 0), 0) || 0, 0)} units</p>
                  <p>Review the data below before importing</p>
                </div>
              }
            />

            <Table
              rowKey={(_, i) => String(i)}
              dataSource={parsedRows}
              columns={previewColumns}
              size="small"
              pagination={{ pageSize: 5 }}
              scroll={{ x: 800 }}
            />

            {parsedRows.length > 5 && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Showing first 5 of {parsedRows.length} properties
              </Text>
            )}
          </Space>
        )}
      </Drawer>
    </>
  );
};

export const ImportPropertiesTrigger = ({ onOpen }: { onOpen: () => void }) => (
  <Button
    icon={<UploadOutlined />}
    onClick={onOpen}
    style={{ borderRadius: 7, fontWeight: 500, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#059669" }}
  >
    Import Excel
  </Button>
);

export default ImportPropertiesModal;
