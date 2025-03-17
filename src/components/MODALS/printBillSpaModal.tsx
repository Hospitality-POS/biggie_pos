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
        pageStyle: `
            @page {
                size: 80mm auto;
                margin: 0mm;
            }
            @media print {
                body {
                    width: 80mm !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                .receipt {
                    width: 76mm !important;
                    font-size: 10px !important;
                }
                table {
                    width: 100% !important;
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
                    width: "80mm",
                    maxWidth: "80mm",
                    margin: "0 auto"
                }}
            >
                <div
                    className="logo-print"
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        marginBottom: 10,
                    }}
                >
                    <Typography
                        variant="body1"
                        style={{ fontFamily: "monospace", fontSize: "12px" }}
                    >
                        {BRAND_NAME1}
                    </Typography>
                    <Typography
                        variant="body1"
                        style={{ fontFamily: "monospace", fontSize: "11px" }}
                    >
                        {ENTITY_NAME}
                    </Typography>
                    <Typography
                        variant="body1"
                        style={{ fontSize: "11px", fontFamily: "monospace" }}
                    >
                        Phone: {PHONE_NO}
                    </Typography>
                    {Paybill_bs ? (
                        <>
                            <Typography variant="body1" style={{ fontSize: "10px" }}>
                                Business No: {Paybill_bs}
                            </Typography>
                            {Paybill_ac && (
                                <Typography variant="body1" style={{ fontSize: "10px" }}>
                                    Account No: {Paybill_ac}
                                </Typography>
                            )}
                        </>
                    ) : (
                        TILL_NO && (
                            <Typography variant="body1" style={{ fontSize: "10px" }}>
                                Till No: {TILL_NO}
                            </Typography>
                        )
                    )}
                    <Typography
                        variant="body1"
                        style={{ fontSize: "10px", fontFamily: "monospace" }}
                    >
                        {cartDetails?.clientPin && `Client Pin: ${cartDetails?.clientPin}`}
                    </Typography>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography
                        variant="body1"
                        style={{ fontSize: "10px", fontFamily: "monospace" }}
                    >
                        {cartDetails?.order_no}
                    </Typography>
                    <Typography
                        variant="body1"
                        style={{ fontSize: "10px", fontFamily: "monospace" }}
                    >
                        Served By: {cartDetails?.created_by?.username}
                    </Typography>
                </div>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "-8px",
                    }}
                >
                    <Typography
                        variant="body1"
                        style={{ fontSize: "10px", fontFamily: "monospace" }}
                    >
                        Table: {cartDetails?.table_id?.name}
                    </Typography>
                    <Typography
                        variant="body1"
                        style={{ fontSize: "10px", fontFamily: "monospace" }}
                    >
                        Date: {new Date().toLocaleDateString()} {new Date().getHours()}:
                        {String(new Date().getMinutes()).padStart(2, '0')}
                    </Typography>
                </div>
                <TableContainer sx={{ mt: 2, width: "100%" }}>
                    <Table style={{ tableLayout: "fixed", width: "100%" }}>
                        <TableHead>
                            <TableRow>
                                <TableCell
                                    sx={{ padding: 0.5, fontWeight: "bold", width: "10%", fontSize: "10px" }}
                                >
                                    #
                                </TableCell>
                                <TableCell sx={{ padding: 0.5, fontWeight: "bold", fontSize: "10px" }}>
                                    ITEM
                                </TableCell>
                                <TableCell
                                    sx={{
                                        padding: 0.5,
                                        textAlign: "right",
                                        fontWeight: "bold",
                                        fontSize: "10px"
                                    }}
                                >
                                    PRICE(.Ksh)
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data?.map(
                                (item: {
                                    _id: React.Key | null | undefined;
                                    quantity:
                                    | string
                                    | number
                                    | boolean
                                    | React.ReactElement<
                                        any,
                                        string | React.JSXElementConstructor<any>
                                    >
                                    | Iterable<React.ReactNode>
                                    | React.ReactPortal
                                    | null
                                    | undefined;
                                    product_id: {
                                        name:
                                        | string
                                        | number
                                        | boolean
                                        | React.ReactElement<
                                            any,
                                            string | React.JSXElementConstructor<any>
                                        >
                                        | Iterable<React.ReactNode>
                                        | React.ReactPortal
                                        | null
                                        | undefined;
                                    };
                                    price: number;
                                }) => (
                                    <TableRow key={item._id}>
                                        <TableCell
                                            sx={{
                                                padding: 0.5,
                                                fontSize: "10px",
                                                width: "5%",
                                                textAlign: "left",
                                                fontWeight: "bold",
                                            }}
                                        >
                                            {item.quantity}
                                        </TableCell>
                                        <TableCell
                                            component="th"
                                            scope="row"
                                            sx={{
                                                padding: 0.5,
                                                fontSize: "10px",
                                                fontWeight: "bold",
                                                wordWrap: "break-word",
                                                maxWidth: "50mm",
                                            }}
                                        >
                                            {item?.product_id?.name}
                                        </TableCell>
                                        <TableCell
                                            sx={{
                                                padding: 0.5,
                                                textAlign: "right",
                                                fontSize: "10px",
                                                fontWeight: "bold",
                                            }}
                                        >
                                            {item?.price?.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                )
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {cartDetails?.discount && (
                    <Typography
                        variant="body1"
                        style={{
                            fontSize: "10px",
                            fontFamily: "monospace",
                            textAlign: "center",
                            fontWeight: "bold",
                        }}
                    >
                        <RestOutlined /> Discount:
                        {cartDetails?.discount_type === "amount"
                            ? `KSH. ${cartDetails?.discount?.toLocaleString()}`
                            : `${cartDetails?.discount}%`}
                    </Typography>
                )}
                <Typography
                    variant="body1"
                    style={{
                        fontSize: "10px",
                        fontFamily: "monospace",
                        textAlign: "center",
                        fontWeight: "bold",
                        marginTop: "5px"
                    }}
                >
                    Amount Due: Ksh.{totalAmount?.toFixed(2)}
                </Typography>

                <Typography
                    variant="body1"
                    sx={{ textAlign: "center", fontWeight: "12px", fontSize: "10px" }}
                >
                    ============================
                </Typography>
                <div className="qrcoded" style={{ marginTop: 4, textAlign: "center" }}>
                    <QRCodeCanvas value={QR_Code} size={60} className="qrcode" />
                </div>
                <Typography
                    variant="body1"
                    style={{
                        fontSize: "9px",
                        fontFamily: "monospace",
                        textAlign: "center",
                        marginTop: 8,
                    }}
                >
                    Thank you for your support!
                </Typography>
                <Typography
                    variant="body1"
                    style={{
                        fontSize: "9px",
                        fontFamily: "monospace",
                        textAlign: "center",
                    }}
                >
                    Info email: {EMAIL_URL}
                </Typography>
                <Typography
                    variant="body1"
                    style={{
                        fontSize: "9px",
                        fontFamily: "monospace",
                        textAlign: "center",
                    }}
                >
                    Generated on {new Date().toLocaleDateString()}
                </Typography>
            </div>
            <Box
                sx={{
                    mt: 2,
                    display: "flex",
                    justifyContent: "space-evenly",
                    columnGap: 5,
                }}
            ></Box>
        </ModalForm>
    );
};

export default PrintBillSpaModal;