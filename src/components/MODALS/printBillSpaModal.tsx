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

const PrintBillModal: React.FC<PrintBillProps> = ({
    cartDetails,
    data,
    totalAmount,
}) => {
    const componentRef = useRef<HTMLDivElement>(null);

    const { BRAND_NAME1, EMAIL_URL, PIN, PHONE_NO, QR_Code, Paybill_bs, Paybill_ac } =
        useSystemDetails();

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
    });

    // Define dark and bold text styling to use throughout the component
    const darkTextColor = "#000000";
    const boldFontWeight = 700; // Bold font weight

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
            <div className="receipt" id="receipt" ref={componentRef} style={{ color: darkTextColor, fontWeight: boldFontWeight }}>
                <div
                    className="logo-print"
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        marginBottom: 10,
                        color: darkTextColor,
                        fontWeight: boldFontWeight,
                    }}
                >
                    <Typography
                        variant="body1"
                        style={{ fontFamily: "monospace", fontSize: "1em", color: darkTextColor, fontWeight: boldFontWeight }}
                    >
                        {BRAND_NAME1}
                    </Typography>
                    <Typography
                        variant="body1"
                        style={{ fontFamily: "monospace", fontSize: "0.9em", color: darkTextColor, fontWeight: boldFontWeight }}
                    >
                        {ENTITY_NAME}
                    </Typography>
                    <Typography
                        variant="body1"
                        style={{ fontSize: "0.9em", fontFamily: "monospace", color: darkTextColor, fontWeight: boldFontWeight }}
                    >
                        Phone: {PHONE_NO}
                    </Typography>
                    <Typography
                        variant="body1"
                        style={{ fontSize: "0.9em", fontFamily: "monospace", color: darkTextColor, fontWeight: boldFontWeight }}
                    >
                        Business No: {Paybill_bs}
                    </Typography>
                    <Typography
                        variant="body1"
                        style={{ fontSize: "0.9em", fontFamily: "monospace", color: darkTextColor, fontWeight: boldFontWeight }}
                    >
                        Account No: {Paybill_ac}
                    </Typography>
                    <Typography
                        variant="body1"
                        style={{ fontSize: "0.8em", fontFamily: "monospace", color: darkTextColor, fontWeight: boldFontWeight }}
                    >
                        {cartDetails?.clientPin && `Client Pin: ${cartDetails?.clientPin}`}
                    </Typography>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: darkTextColor, fontWeight: boldFontWeight }}>
                    <Typography
                        variant="body1"
                        style={{ fontSize: "0.9em", fontFamily: "monospace", color: darkTextColor, fontWeight: boldFontWeight }}
                    >
                        {cartDetails?.order_no}
                    </Typography>
                    <Typography
                        variant="body1"
                        style={{ fontSize: "0.9em", fontFamily: "monospace", color: darkTextColor, fontWeight: boldFontWeight }}
                    >
                        Served By: {cartDetails?.created_by?.username}
                    </Typography>
                </div>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "-10px",
                        color: darkTextColor,
                        fontWeight: boldFontWeight,
                    }}
                >
                    <Typography
                        variant="body1"
                        style={{ fontSize: "0.9em", fontFamily: "monospace", color: darkTextColor, fontWeight: boldFontWeight }}
                    >
                        Table: {cartDetails?.table_id?.name}
                    </Typography>
                    <Typography
                        variant="body1"
                        style={{ fontSize: "0.8em", fontFamily: "monospace", color: darkTextColor, fontWeight: boldFontWeight }}
                    >
                        Date: {new Date().toLocaleDateString()} {new Date().getHours()}:
                        {new Date().getMinutes()}
                    </Typography>
                </div>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "10px",
                        color: darkTextColor,
                        fontWeight: boldFontWeight,
                        paddingTop: '10px',
                    }}
                >
                    <Typography variant="body1"
                        style={{ fontSize: "0.9em", fontFamily: "monospace", color: darkTextColor, fontWeight: boldFontWeight }}
                    >
                        {cartDetails?.clientName && ` Client: ${cartDetails?.clientName}`}
                    </Typography>


                </div>
                <TableContainer sx={{ mt: 2, width: "inherit" }}>
                    <Table style={{ tableLayout: "fixed", color: darkTextColor }}>
                        <TableHead>
                            <TableRow>
                                <TableCell
                                    sx={{ padding: 0.5, fontWeight: boldFontWeight, width: "10%", color: darkTextColor }}
                                >
                                    #
                                </TableCell>
                                <TableCell sx={{ padding: 0.5, fontWeight: boldFontWeight, color: darkTextColor }}>
                                    ITEM
                                </TableCell>
                                <TableCell
                                    sx={{
                                        padding: 0.5,
                                        textAlign: "right",
                                        fontWeight: boldFontWeight,
                                        color: darkTextColor,
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
                                                padding: 0.8,
                                                fontSize: "0.9em",
                                                width: "5%",
                                                textAlign: "left",
                                                fontWeight: boldFontWeight,
                                                color: darkTextColor,
                                            }}
                                        >
                                            {item.quantity}
                                        </TableCell>
                                        <TableCell
                                            component="th"
                                            scope="row"
                                            sx={{
                                                padding: 0.8,
                                                fontSize: "0.9em",
                                                fontWeight: boldFontWeight,
                                                wordWrap: "break-word",
                                                color: darkTextColor,
                                            }}
                                        >
                                            {item?.product_id?.name}
                                        </TableCell>
                                        <TableCell
                                            sx={{
                                                padding: 0.8,
                                                textAlign: "right",
                                                fontSize: "0.9em",
                                                fontWeight: boldFontWeight,
                                                color: darkTextColor,
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
                            fontSize: "0.9em",
                            fontFamily: "monospace",
                            textAlign: "center",
                            fontWeight: boldFontWeight,
                            color: darkTextColor,
                        }}
                    >
                        <RestOutlined style={{ color: darkTextColor }} /> Discount:
                        {cartDetails?.discount_type === "amount"
                            ? `KSH. ${cartDetails?.discount?.toLocaleString()}`
                            : `${cartDetails?.discount}%`}
                    </Typography>
                )}
                <Typography
                    variant="body1"
                    style={{
                        fontSize: "1em",
                        fontFamily: "monospace",
                        textAlign: "center",
                        fontWeight: boldFontWeight,
                        color: darkTextColor,
                    }}
                >
                    Amount Due: Ksh.{totalAmount?.toFixed(2)}
                </Typography>

                <Typography
                    variant="body1"
                    sx={{ textAlign: "center", fontWeight: boldFontWeight, color: darkTextColor }}
                >
                    ============================
                </Typography>
                <div className="qrcoded" style={{ marginTop: 4 }}>
                    <QRCodeCanvas value={QR_Code} size={70} className="qrcode" />
                </div>
                <Typography
                    variant="body1"
                    style={{
                        fontSize: "0.8em",
                        fontFamily: "monospace",
                        textAlign: "center",
                        marginTop: 8,
                        color: darkTextColor,
                        fontWeight: boldFontWeight,
                    }}
                >
                    Thank you for your support!
                </Typography>
                <Typography
                    variant="body1"
                    style={{
                        fontSize: "0.8em",
                        fontFamily: "monospace",
                        textAlign: "center",
                        color: darkTextColor,
                        fontWeight: boldFontWeight,
                    }}
                >
                    Info email: {EMAIL_URL}
                </Typography>
                <Typography
                    variant="body1"
                    style={{
                        fontSize: "0.7em",
                        fontFamily: "monospace",
                        textAlign: "center",
                        color: darkTextColor,
                        fontWeight: boldFontWeight,
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

export default PrintBillModal;