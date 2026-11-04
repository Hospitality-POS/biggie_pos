import React from "react";
import { Select, Space, Tag } from "antd";
import type { SelectProps } from "antd";
import { useQuery } from "@tanstack/react-query";
import { getProjects, Project } from "@services/accounting/projects";

type Props = Omit<SelectProps, "options"> & {
    /** Include finished / cancelled projects (e.g. for report filters). */
    includeClosed?: boolean;
};

/**
 * Picks a project to tag a transaction with (or to filter a report by).
 * Value is the project _id; clearing sets it to undefined.
 */
const ProjectSelect: React.FC<Props> = ({ includeClosed = false, placeholder, loading, ...rest }) => {
    const shopId = localStorage.getItem("shopId") || undefined;
    const { data, isLoading } = useQuery({
        queryKey: ["projects", "select", shopId, includeClosed],
        queryFn: () =>
            getProjects({
                shop_id: shopId,
                status: includeClosed ? undefined : "Active,On Hold",
            }),
        staleTime: 60_000,
    });

    const options = (data?.projects || []).map((p: Project) => ({
        value: p._id,
        searchText: `${p.code || ""} ${p.name}`.toLowerCase(),
        label: (
            <Space size={6}>
                {p.code && <Tag style={{ marginInlineEnd: 0 }}>{p.code}</Tag>}
                <span>{p.name}</span>
            </Space>
        ),
    }));

    return (
        <Select
            allowClear
            showSearch
            placeholder={placeholder ?? "No project"}
            loading={isLoading || loading}
            options={options}
            filterOption={(input, option) =>
                String((option as any)?.searchText || "").includes(input.toLowerCase())
            }
            {...rest}
        />
    );
};

export default ProjectSelect;
