import { ReactNode } from "react";
import { useAppSelector } from "src/store";
import { makePermissionChecker, PERMISSIONS } from "@utils/accessControl";
import { Tooltip } from "antd";

interface PermissionButtonProps {
    /** The permission key required to perform this action, e.g. "SIGNATURE_CREATE" */
    permission: string;
    children: ReactNode;
    /** Fallback to render when permission is denied (default: hidden) */
    fallback?: ReactNode;
    /** Show disabled button with tooltip instead of hiding */
    showDisabled?: boolean;
    /** Tooltip text when disabled */
    disabledTooltip?: string;
}

/**
 * Wraps a button or other action element and conditionally renders it
 * based on the current user's permissions.
 *
 * Admins always bypass the check.
 *
 * Usage:
 *
 *   <PermissionButton permission="SIGNATURE_CREATE">
 *     <Button type="primary">Create Document</Button>
 *   </PermissionButton>
 *
 *   // With disabled state instead of hiding:
 *   <PermissionButton 
 *     permission="SIGNATURE_DELETE" 
 *     showDisabled
 *     disabledTooltip="You don't have permission to delete documents"
 *   >
 *     <Button danger>Delete</Button>
 *   </PermissionButton>
 */
function PermissionButton({ 
    permission, 
    children, 
    fallback = null, 
    showDisabled = false,
    disabledTooltip = "You don't have permission for this action"
}: PermissionButtonProps) {
    const { user } = useAppSelector((state) => state.auth);

    const isAdmin = user?.role === "admin";
    const rolePermissions: string[] =
        (user as any)?.rolePermissions ?? (user as any)?.permissions ?? [];

    const can = makePermissionChecker(rolePermissions, isAdmin);

    if (can(permission)) {
        return <>{children}</>;
    }

    if (showDisabled) {
        const label = PERMISSIONS[permission]?.label || permission;
        return (
            <Tooltip title={`${disabledTooltip}: ${label}`}>
                <span style={{ display: 'inline-block' }}>
                    {React.cloneElement(children as React.ReactElement, {
                        disabled: true,
                        style: { opacity: 0.5, cursor: 'not-allowed' }
                    })}
                </span>
            </Tooltip>
        );
    }

    return <>{fallback}</>;
}

export default PermissionButton;