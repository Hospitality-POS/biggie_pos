import React, { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
    Box,
    Typography,
    TableContainer,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
} from "@mui/material";
import "./bill.css";
import { useReactToPrint } from "react-to-print";
import { ENTITY_NAME } from "@utils/config";
import useSystemDetails from "@hooks/useSystemDetails";
import { PrinterFilled, PrinterOutlined, RestOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { ModalForm } from "@ant-design/pro-form";

interface PrintBillProps {
    cartDetails: any;
    totalAmount: number;
    data: any;
}

const PrintBillSpaModal: React.FC<PrintBillProps> = ({
    cartDetails,
    data,
    totalAmount,
}) => {
    const componentRef = useRef<HTMLDivElement>(null);

    const { BRAND_NAME1, EMAIL_URL, PIN, PHONE_NO, QR_Code, Paybill_bs, Paybill_ac, TILL_NO } =
        useSystemDetails();

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        // Add print specific options for thermal printers
        pageStyle: `
            @page {
                size: 80mm auto;  /* Common thermal receipt width */
                margin: 0mm;     /* No margins for thermal printing */
            }
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    font-weight: bold !important;
                }
                * {
                    font-weight: bold !important;
                }
                div, p, span, h1, h2, h3, h4, h5, h6, th, td, tr {
                    font-weight: bold !important;
                }
                table, thead, tbody, tr, th, td {
                    font-weight: bold !important;
                }
                .receipt * {
                    font-weight: bold !important;
                }
            }
        `,
    });

    return (
        <ModalForm
            className="receiptM"
            modalProps={{
                centered: true,
                destroyOnClose: true,
                cancelText: "cancel",
                okText: "Confirm Print",
                okButtonProps: { icon: <PrinterFilled /> },
            }}
            trigger={
                <Button type="primary" icon={<PrinterOutlined />}>
                    Print Bill
                </Button>
            }
            onFinish={async () => {
                handlePrint();
                return true;
            }}
        >
            <div
                className="receipt"
                id="receipt"
                ref={componentRef}
                style={{
                    width: "80mm",  // Standard thermal receipt width
                    maxWidth: "80mm",
                    backgroundColor: "#ffffff",
                    padding: "3mm",
                    fontFamily: "'Courier New', monospace", // Better for thermal printers
                    fontWeight: "bold", // Everything bold
                }}
            >
                <div
                    className="logo-print"
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        marginBottom: 10,
                        textAlign: "center",
                    }}
                >
                    <Typography
                        style={{
                            fontFamily: "'Courier New', monospace",
                            fontSize: "14pt",
                            fontWeight: "bold",
                            margin: "2mm 0",
                        }}
                    >
                        {BRAND_NAME1}
                    </Typography>
                    <Typography
                        style={{
                            fontFamily: "'Courier New', monospace",
                            fontSize: "12pt",
                            fontWeight: "bold",
                            margin: "1mm 0",
                        }}
                    >
                        {ENTITY_NAME}
                    </Typography>
                    <Typography
                        style={{
                            fontSize: "11pt",
                            fontFamily: "'Courier New', monospace",
                            margin: "1mm 0",
                            fontWeight: "bold",
                        }}
                    >
                        Phone: {PHONE_NO}
                    </Typography>

                    <Typography
                        style={{
                            fontSize: "11pt",
                            fontFamily: "'Courier New', monospace",
                            margin: "1mm 0",
                            fontWeight: "bold",
                        }}
                    >
                        Business No: {Paybill_bs}
                    </Typography>
                    <Typography
                        style={{
                            fontSize: "11pt",
                            fontFamily: "'Courier New', monospace",
                            margin: "1mm 0",
                            fontWeight: "bold",
                        }}
                    >
                        Account No: {Paybill_ac}
                    </Typography>
                    {cartDetails?.clientPin && (
                        <Typography
                            style={{
                                fontSize: "11pt",
                                fontFamily: "'Courier New', monospace",
                                margin: "1mm 0",
                                fontWeight: "bold",
                            }}
                        >
                            Client Pin: {cartDetails?.clientPin}
                        </Typography>
                    )}
                </div>

                {/* Divider line */}
                <div style={{
                    borderTop: "1px dashed #000",
                    margin: "2mm 0",
                    borderWidth: "2px",
                }}></div>

                <div style={{ display: "flex", justifyContent: "space-between", margin: "2mm 0" }}>
                    <Typography
                        style={{
                            fontSize: "11pt",
                            fontFamily: "'Courier New', monospace",
                            fontWeight: "bold",
                        }}
                    >
                        {cartDetails?.order_no}
                    </Typography>
                    <Typography
                        style={{
                            fontSize: "11pt",
                            fontFamily: "'Courier New', monospace",
                            fontWeight: "bold",
                        }}
                    >
                        By: {cartDetails?.created_by?.username}
                    </Typography>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", margin: "2mm 0" }}>
                    <Typography
                        style={{
                            fontSize: "11pt",
                            fontFamily: "'Courier New', monospace",
                            fontWeight: "bold",
                        }}
                    >
                        Table: {cartDetails?.table_id?.name}
                    </Typography>
                    <Typography
                        style={{
                            fontSize: "11pt",
                            fontFamily: "'Courier New', monospace",
                            fontWeight: "bold",
                        }}
                    >
                        {new Date().toLocaleDateString()} {String(new Date().getHours()).padStart(2, '0')}:
                        {String(new Date().getMinutes()).padStart(2, '0')}
                    </Typography>
                </div>

                {/* Another divider */}
                <div style={{
                    borderTop: "1px dashed #000",
                    margin: "2mm 0",
                    borderWidth: "2px",
                }}></div>

                {/* Items table with higher contrast for thermal printing */}
                <table style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    tableLayout: "fixed",
                }}>
                    <thead>
                        <tr>
                            <th style={{
                                padding: "1mm",
                                fontWeight: "bold",
                                width: "10%",
                                textAlign: "left",
                                fontSize: "11pt",
                                fontFamily: "'Courier New', monospace",
                            }}>
                                #
                            </th>
                            <th style={{
                                padding: "1mm",
                                fontWeight: "bold",
                                textAlign: "left",
                                fontSize: "11pt",
                                fontFamily: "'Courier New', monospace",
                            }}>
                                ITEM
                            </th>
                            <th style={{
                                padding: "1mm",
                                textAlign: "right",
                                fontWeight: "bold",
                                fontSize: "11pt",
                                fontFamily: "'Courier New', monospace",
                            }}>
                                PRICE(Ksh)
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data?.map(
                            (item: {
                                _id: React.Key | null | undefined;
                                quantity: string | number | boolean | React.ReactElement<any>;
                                product_id: {
                                    name: string | number | boolean | React.ReactElement<any>;
                                };
                                price: number;
                            }) => (
                                <tr key={item._id}>
                                    <td style={{
                                        padding: "1mm",
                                        fontSize: "11pt",
                                        width: "5%",
                                        textAlign: "left",
                                        fontWeight: "bold",
                                        fontFamily: "'Courier New', monospace",
                                    }}>
                                        {item.quantity}
                                    </td>
                                    <td style={{
                                        padding: "1mm",
                                        fontSize: "11pt",
                                        fontWeight: "bold",
                                        wordWrap: "break-word",
                                        fontFamily: "'Courier New', monospace",
                                    }}>
                                        {item?.product_id?.name}
                                    </td>
                                    <td style={{
                                        padding: "1mm",
                                        textAlign: "right",
                                        fontSize: "11pt",
                                        fontWeight: "bold",
                                        fontFamily: "'Courier New', monospace",
                                    }}>
                                        {item?.price?.toFixed(2)}
                                    </td>
                                </tr>
                            )
                        )}
                    </tbody>
                </table>

                {/* Divider before total */}
                <div style={{
                    borderTop: "1px dashed #000",
                    margin: "2mm 0",
                    borderWidth: "2px",
                }}></div>

                {/* Discount section with higher visibility */}
                {cartDetails?.discount && (
                    <Typography
                        style={{
                            fontSize: "12pt",
                            fontFamily: "'Courier New', monospace",
                            textAlign: "center",
                            fontWeight: "bold",
                            margin: "2mm 0",
                        }}
                    >
                        <RestOutlined /> Discount:{" "}
                        {cartDetails?.discount_type === "amount"
                            ? `KSH. ${cartDetails?.discount?.toLocaleString()}`
                            : `${cartDetails?.discount}%`}
                    </Typography>
                )}

                {/* Total amount with emphasized styling */}
                <Typography
                    style={{
                        fontSize: "14pt",
                        fontFamily: "'Courier New', monospace",
                        textAlign: "center",
                        fontWeight: "bold",
                        margin: "3mm 0",
                    }}
                >
                    Amount Due: Ksh.{totalAmount?.toFixed(2)}
                </Typography>

                {/* Divider */}
                <div style={{
                    borderTop: "1px dashed #000",
                    margin: "2mm 0",
                    borderWidth: "2px",
                }}></div>

                {/* QR code - higher density for better thermal printing */}
                <div style={{
                    textAlign: "center",
                    margin: "3mm 0",
                }}>
                    <QRCodeCanvas
                        value={QR_Code}
                        size={100}
                        level="H" // Higher error correction for thermal printers
                        style={{
                            margin: "0 auto",
                        }}
                    />
                </div>

                {/* Footer information */}
                <Typography
                    style={{
                        fontSize: "10pt",
                        fontFamily: "'Courier New', monospace",
                        textAlign: "center",
                        marginTop: "2mm",
                        fontWeight: "bold",
                    }}
                >
                    Thank you for your support!
                </Typography>
                <Typography
                    style={{
                        fontSize: "10pt",
                        fontFamily: "'Courier New', monospace",
                        textAlign: "center",
                        fontWeight: "bold",
                    }}
                >
                    Info email: {EMAIL_URL}
                </Typography>
                <Typography
                    style={{
                        fontSize: "10pt",
                        fontFamily: "'Courier New', monospace",
                        textAlign: "center",
                        fontWeight: "bold",
                    }}
                >
                    Generated on {new Date().toLocaleDateString()}
                </Typography>
                <Typography
                    style={{
                        fontSize: "10pt",
                        fontFamily: "'Courier New', monospace",
                        textAlign: "center",
                        marginBottom: "2mm",
                        fontWeight: "bold",
                    }}
                >
                    Powered by Relia Tech Solutions
                </Typography>
            </div>
        </ModalForm>
    );
};

export default PrintBillSpaModal;