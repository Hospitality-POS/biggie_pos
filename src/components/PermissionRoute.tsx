import { ReactNode } from "react";
import { useAppSelector } from "src/store";
import { makePermissionChecker, PERMISSIONS } from "@utils/accessControl";
import AccessDenied from "@components/AccessDenied";

interface PermissionRouteProps {
    /** The permission key required to view this route, e.g. "ACCOUNTING_REPORT_PROFIT_LOSS" */
    permission: string;
    children: ReactNode;
}

/**
 * Wraps a route's page component and renders <AccessDenied /> instead
 * when the current user doesn't hold the required permission.
 *
 * Admins always bypass the check.
 *
 * Usage (in Routers.tsx):
 *
 *   <Route
 *     path="accounting/reports"
 *     element={privatePage(AccountingReportsPage)}  ← wrap this
 *   />
 *
 *   becomes:
 *
 *   <Route
 *     path="accounting/reports"
 *     element={
 *       <PermissionRoute permission="ACCOUNTING_REPORT_PROFIT_LOSS">
 *         {privatePage(AccountingReportsPage)}
 *       </PermissionRoute>
 *     }
 *   />
 */
function PermissionRoute({ permission, children }: PermissionRouteProps) {
    const { user } = useAppSelector((state) => state.auth);

    const isAdmin = user?.role === "admin";
    const rolePermissions: string[] =
        (user as any)?.rolePermissions ?? (user as any)?.permissions ?? [];

    const can = makePermissionChecker(rolePermissions, isAdmin);

    if (!can(permission)) {
        const label = PERMISSIONS[permission]?.label;
        return <AccessDenied permissionKey={permission} permissionLabel={label} />;
    }

    return <>{children}</>;
}

export default PermissionRoute;