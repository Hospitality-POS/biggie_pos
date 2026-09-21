import { FileTextOutlined } from "@ant-design/icons";
import { Typography, Grid } from "antd";
import InvoiceTable from "@pages/OrderManagement/Invoices/InvoiceTable";
import { THEME_C } from "@utils/getPrimaryColor";

const { Text } = Typography;

const C = THEME_C;

const QuotesPage = () => {
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    return (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: isMobile ? "12px 12px 10px" : "16px 20px 14px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ background: C.primaryLight, borderRadius: 7, padding: "5px 7px", color: C.primary, fontSize: 16, lineHeight: 1 }}>
                    <FileTextOutlined />
                </div>
                <div>
                    <Text strong style={{ fontSize: 15, color: C.darkText, display: "block", lineHeight: 1.3 }}>Quotes</Text>
                    <Text style={{ fontSize: 11, color: C.subText }}>Create &amp; manage customer quotations</Text>
                </div>
            </div>

            <div style={{ padding: isMobile ? "12px" : "16px 20px" }}>
                <InvoiceTable quotesOnly />
            </div>
        </div>
    );
};

export default QuotesPage;
