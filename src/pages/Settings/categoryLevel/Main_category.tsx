import { useRef } from "react";

import { ActionType, ProTable } from "@ant-design/pro-components";
import { Tooltip, Button, Space, Popconfirm, Switch, Select, message } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { deleteMainCategory, fetchMainCategories, editMainCategory } from "@services/categories";
import { fetchShop, updateShop } from "@services/shops";
import { getTableLocation } from "@services/tables";
import MainCategoryModal from "@components/MODALS/pro/MainCategoryModal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "src/store";

type ZoneRestriction = { main_category: string; locations: string[] };

const MainCategorySettings = () => {
  const actionRef = useRef<ActionType>();
  const queryClient = useQueryClient();
  const shopId = localStorage.getItem("shopId");

  const { data: shopData } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: !!shopId,
  });

  const { data: zones = [] } = useQuery({
    queryKey: ["table-locations"],
    queryFn: () => getTableLocation({}),
  });
  const zoneOptions = (zones as { name: string; _id: string }[]).map((z) => ({ label: z.name, value: z._id }));

  const toRestrictions = (raw: any): ZoneRestriction[] =>
    (raw ?? []).map((r: any) => ({
      main_category: String(r.main_category),
      locations: (r.locations ?? []).map(String),
    }));
  const restrictions = toRestrictions(shopData?.category_zone_restrictions);

  // Each save sends the whole restrictions list, so edits apply to the cached
  // list straight away and saves run one at a time — otherwise a second edit
  // made before the first save returns would overwrite it.
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const saveZoneRestriction = (mainCategoryId: string, locations: string[]) => {
    const shopKey = ["shop", shopId];
    queryClient.setQueryData(shopKey, (old: any) =>
      old && {
        ...old,
        category_zone_restrictions: [
          ...toRestrictions(old.category_zone_restrictions).filter((r) => r.main_category !== mainCategoryId),
          ...(locations.length ? [{ main_category: mainCategoryId, locations }] : []),
        ],
      }
    );
    saveQueue.current = saveQueue.current
      .then(() =>
        updateShop({
          _id: shopId,
          category_zone_restrictions: toRestrictions(
            (queryClient.getQueryData(shopKey) as any)?.category_zone_restrictions
          ),
        })
      )
      // updateShop already shows the error; reload the saved list
      .catch(() => queryClient.invalidateQueries({ queryKey: shopKey }));
  };

  const DeleteMainCategoryMutation = useMutation(deleteMainCategory, {
    onSuccess: () => {
      actionRef.current?.reload();
      message.success("Main-Category deleted successfully");
    },
    onError: () => message.error("Failed to delete main-category"),
  });

  const togglePosMutation = useMutation(editMainCategory, {
    onSuccess: () => {
      actionRef.current?.reload();
      queryClient.invalidateQueries({ queryKey: ["Maincategories"] });
    },
    onError: () => message.error("Failed to update POS visibility"),
  });

  const { user } = useAppSelector((state) => state.auth);
  const isAdminOrCashier = user?.role === "admin" || user?.role === "cashier";

  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_, record: any) => [
      <Space>
        <Tooltip key="edit" title="Edit">
          <MainCategoryModal actionRef={actionRef} data={record} edit={true} />
        </Tooltip>
        <Popconfirm
          title="Are you sure you want to delete this main-category?"
          onConfirm={() => DeleteMainCategoryMutation.mutate(record._id)}
          okText="Yes"
          cancelText="No"
        >
          <Button type="primary" disabled={!isAdminOrCashier} danger icon={<DeleteOutlined />} size="small">
            Delete
          </Button>
        </Popconfirm>
      </Space>,
    ],
  };

  return (
    <>
      <ProTable
        rowKey="_id"
        pagination={{
          pageSize: 5,
          showQuickJumper: false,
          showTotal: (total, range) => (
            <div>{`Showing ${range[0]}-${range[1]} of ${total} total items`}</div>
          ),
        }}
        columns={[
          {
            title: "Main-Category",
            key: "name",
            dataIndex: "name",
            hideInSearch: false,
            fieldProps: {
              placeholder: "Enter Main-Category name",
            },
          },
          {
            title: "Show on POS",
            key: "list_on_pos",
            dataIndex: "list_on_pos",
            hideInSearch: true,
            render: (_, record: any) => (
              <Tooltip title={record.list_on_pos === false ? "Hidden on POS — click to show" : "Listed on POS — click to hide"}>
                <Switch
                  size="small"
                  checked={record.list_on_pos !== false}
                  loading={togglePosMutation.isLoading && togglePosMutation.variables?._id === record._id}
                  onChange={(checked) =>
                    togglePosMutation.mutate({
                      _id: record._id,
                      values: { name: record.name, list_on_pos: checked },
                    })
                  }
                />
              </Tooltip>
            ),
          },
          ...(shopData?.category_zone_restriction_enabled ? [{
            title: "Sell only in zones",
            key: "zone_restriction",
            dataIndex: "zone_restriction",
            hideInSearch: true,
            render: (_: unknown, record: any) => (
              <Select
                mode="multiple"
                allowClear
                size="small"
                style={{ minWidth: 220 }}
                placeholder="All zones"
                options={zoneOptions}
                disabled={!isAdminOrCashier || !shopId}
                value={restrictions.find((r) => r.main_category === record._id)?.locations ?? []}
                onChange={(locations: string[]) => saveZoneRestriction(record._id, locations)}
              />
            ),
          }] : []),
          actionColumn,
        ]}
        request={async () => {
          const data = await fetchMainCategories();
          return {
            data: data,
            success: true,
            total: data.length,
          };
        }}
        tableAlertRender={({ selectedRowKeys }) => {
          return <p>You have selected {selectedRowKeys.length}</p>;
        }}
        actionRef={actionRef}
        options={{
          fullScreen: true,
        }}
        rowSelection={{
          alwaysShowAlert: false,
          selections: false,
        }}
        search={{
          searchText: "Search Main-Category",
          resetText: "Reset",
          labelWidth: "auto",
        }}
        dateFormatter="string"
        headerTitle="List of Main Categories"
        toolBarRender={() => [<MainCategoryModal actionRef={actionRef} />]}
      />
    </>
  );
};

export default MainCategorySettings;
