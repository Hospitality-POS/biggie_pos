import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select } from "antd";
import { ShopOutlined } from "@ant-design/icons";
import axiosInstance from "@services/request";
import { BASE_URL } from "@utils/config";

/**
 * Branch filter for admin dashboards (Pesa, Bandu HR).
 *
 * Only active under /admin — a shop-level user keeps their own shop.
 * "" means all branches; the dashboards' APIs treat a missing shop_id that way.
 */
export const useBranchFilter = (ownShopId: string) => {
    const isAdminLayout = window.location.pathname.startsWith("/admin");
    const [branchId, setBranchId] = useState<string>("");

    const { data } = useQuery({
        queryKey: ["dashboard-branches"],
        queryFn: async () => (await axiosInstance.get(`${BASE_URL}/shops`)).data,
        enabled: isAdminLayout,
        staleTime: 60_000,
    });
    const shops: { _id: string; name: string }[] = Array.isArray(data) ? data : data?.shops || [];

    return {
        isAdminLayout,
        shops,
        branchId,
        setBranchId,
        // Shop to pass to the dashboard API
        shopId: isAdminLayout ? branchId : ownShopId,
        // Only worth showing when there is more than one branch to pick from
        showFilter: isAdminLayout && shops.length > 1,
    };
};

export const BranchSelect: React.FC<{
    shops: { _id: string; name: string }[];
    value: string;
    onChange: (v: string) => void;
    size?: "small" | "middle";
    block?: boolean;
}> = ({ shops, value, onChange, size = "small", block }) => (
    <Select
        value={value}
        onChange={onChange}
        size={size}
        suffixIcon={<ShopOutlined />}
        style={{ width: block ? "100%" : 170 }}
        options={[
            { label: "All branches", value: "" },
            ...shops.map((s) => ({ label: s.name, value: s._id })),
        ]}
    />
);
