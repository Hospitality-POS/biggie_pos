import { Button, Result } from "antd/lib";
import { useNavigate } from "react-router-dom";

interface AccessDeniedProps {
    /** Optional: the permission key that was missing, e.g. "ACCOUNTING_REPORT_PROFIT_LOSS" */
    permissionKey?: string;
    /** Optional: human-readable label for the missing permission */
    permissionLabel?: string;
}

function AccessDenied({ permissionLabel }: AccessDeniedProps) {
    const navigate = useNavigate();

    return (
        <Result
            status="403"
            title="Access Denied"
            subTitle={
                permissionLabel
                    ? `You don't have permission to access "${permissionLabel}". Contact your administrator to request access.`
                    : "You don't have permission to view this page. Contact your administrator to request access."
            }
            extra={
                <Button type="primary" onClick={() => navigate(-1)}>
                    Go Back
                </Button>
            }
            style={{ margin: "0 auto" }}
        />
    );
}

export default AccessDenied;