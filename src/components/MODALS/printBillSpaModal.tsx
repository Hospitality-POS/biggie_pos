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
            <div className="receipt" id="receipt" ref={componentRef}>
                <div
                    className="logo-print"
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        marginBottom: 10, // Reduced margin
                    }}
                >
                    <Typography
                        variant="body1"
                        style={{ fontFamily: "monospace", fontSize: "1em" }} // Reduced from 1.3em
                    >
                        {BRAND_NAME1}
                    </Typography>
                    <Typography
                        variant="body1"
                        style={{ fontFamily: "monospace", fontSize: "0.9em" }} // Reduced from 1.2em
                    >
                        {ENTITY_NAME}
                    </Typography>
                    <Typography
                        variant="body1"
                        style={{ fontSize: "0.9em", fontFamily: "monospace" }} // Reduced from 1.2em
                    >
                        Phone: {PHONE_NO}
                    </Typography>
                    <Typography
                        variant="body1"
                        style={{ fontSize: "0.9em", fontFamily: "monospace" }} // Reduced from 1.2em
                    >
                        Business No: {Paybill_bs}
                    </Typography>
                    <Typography
                        variant="body1"
                        style={{ fontSize: "0.9em", fontFamily: "monospace" }} // Reduced from 1.2em
                    >
                        Account No: {Paybill_ac}
                    </Typography>
                    <Typography
                        variant="body1"
                        style={{ fontSize: "0.8em", fontFamily: "monospace" }} // Reduced from 1em
                    >
                        {cartDetails?.clientPin && `Client Pin: ${cartDetails?.clientPin}`}
                    </Typography>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography
                        variant="body1"
                        style={{ fontSize: "0.9em", fontFamily: "monospace" }} // Reduced from 1.15em
                    >
                        {cartDetails?.order_no}
                    </Typography>
                    <Typography
                        variant="body1"
                        style={{ fontSize: "0.9em", fontFamily: "monospace" }} // Reduced from 1.15em
                    >
                        Served By: {cartDetails?.created_by?.username}
                    </Typography>
                </div>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "-10px", // Reduced from -15px
                    }}
                >
                    <Typography
                        variant="body1"
                        style={{ fontSize: "0.9em", fontFamily: "monospace" }} // Reduced from 1.15em
                    >
                        Table: {cartDetails?.table_id?.name}
                    </Typography>
                    <Typography
                        variant="body1"
                        style={{ fontSize: "0.8em", fontFamily: "monospace" }} // Reduced from 1em
                    >
                        Date: {new Date().toLocaleDateString()} {new Date().getHours()}:
                        {new Date().getMinutes()}
                    </Typography>
                </div>
                <TableContainer sx={{ mt: 2, width: "inherit" }}> {/* Reduced margin top */}
                    <Table style={{ tableLayout: "fixed" }}>
                        <TableHead>
                            <TableRow>
                                <TableCell
                                    sx={{ padding: 0.5, fontWeight: "bold", width: "10%" }} // Reduced padding
                                >
                                    #
                                </TableCell>
                                <TableCell sx={{ padding: 0.5, fontWeight: "bold" }}> {/* Reduced padding */}
                                    ITEM
                                </TableCell>
                                <TableCell
                                    sx={{
                                        padding: 0.5, // Reduced padding
                                        textAlign: "right",
                                        fontWeight: "bold",
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
                                                padding: 0.8, // Reduced padding
                                                fontSize: "0.9em", // Reduced from 1em
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
                                                padding: 0.8, // Reduced padding
                                                fontSize: "0.9em", // Reduced from 1.2em
                                                fontWeight: "bold",
                                                wordWrap: "break-word",
                                            }}
                                        >
                                            {item?.product_id?.name}
                                        </TableCell>
                                        <TableCell
                                            sx={{
                                                padding: 0.8, // Reduced padding
                                                textAlign: "right",
                                                fontSize: "0.9em", // Reduced from 1em
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
                            fontSize: "0.9em", // Reduced from 1.2em
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
                        fontSize: "1em", // Reduced from 1.2em
                        fontFamily: "monospace",
                        textAlign: "center",
                        fontWeight: "bold",
                    }}
                >
                    Amount Due: Ksh.{totalAmount?.toFixed(2)}
                </Typography>

                <Typography
                    variant="body1"
                    sx={{ textAlign: "center", fontWeight: "12px" }}
                >
                    ============================
                </Typography>
                <div className="qrcoded" style={{ marginTop: 4 }}>
                    <QRCodeCanvas value={QR_Code} size={70} className="qrcode" /> {/* Reduced size from 80 */}
                </div>
                <Typography
                    variant="body1"
                    style={{
                        fontSize: "0.8em", // Reduced from 0.9em
                        fontFamily: "monospace",
                        textAlign: "center",
                        marginTop: 8, // Reduced from 10
                    }}
                >
                    Thank you for your support!
                </Typography>
                <Typography
                    variant="body1"
                    style={{
                        fontSize: "0.8em", // Reduced from 0.9em
                        fontFamily: "monospace",
                        textAlign: "center",
                    }}
                >
                    Info email: {EMAIL_URL}
                </Typography>
                <Typography
                    variant="body1"
                    style={{
                        fontSize: "0.7em", // Reduced from 0.8em
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

export default PrintBillModal;