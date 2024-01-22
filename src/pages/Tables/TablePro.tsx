import { ProCard } from "@ant-design/pro-components";
import TableCard from "@components/TableCard/TableCard";
import { useQuery } from "@tanstack/react-query";
import { Flex, Spin } from "antd";
import { Space } from "antd/lib";
import axios from "axios";
import React, { useState } from "react";

export default function TablePro() {
  const [open, setOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);

  const handleOpen = (productId: React.SetStateAction<null>) => {
    setOpen(true);
    setSelectedProductId(productId);
  };

  const fetchTable = async () => {
    const response = await axios.get(
      "http://localhost:3000/tables/tables/unique-locatedAt"
    );
    //  console.log(response.data);

    return response.data;
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tables"],
    queryFn: fetchTable,
  });

  const tabsItems = data?.map(
    (item: { _id: string; name: string; tables?: any[] }) => ({
      key: `${item._id}`,
      tab: "Table",
      label: item.name,
      children: item?.tables?.map((T) => (
        <Space align="center">
          <div
            className="cards"
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
              marginTop: "5px",
              flexWrap: "wrap",
              width: "100%",
              bottom: 0,
            }}
          >
            <TableCard key={T._id} item={T} openModal={handleOpen} />
          </div>
        </Space>
      )),
    })
  );

  if (isLoading) {
    return <Spin size="large" fullscreen />;
  }

  if (isError) {
    return "ERROr";
  }

  return (
    <ProCard
      title={<Space>Tables</Space>}
      tabs={{
        type: "card",
        items: tabsItems,
      }}
    />
  );
}
