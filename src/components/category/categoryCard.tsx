import { CheckCard } from "@ant-design/pro-components";
import { Image, Space, Typography } from "antd";

import { usePrimaryColor } from "@context/PrimaryColorContext";

function CategoryCard({
  icon,
  name,
  id,
  handleSelectedCard,
  style,
}: any) {
  
  const primaryColor = usePrimaryColor();

  return (
    <CheckCard
      onClick={() => handleSelectedCard(id)}
      title={
        <Space style={{ justifyContent: "center", width: "100%" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <Image
              preview={false}
              src={icon ? icon : "/categoryIcon.svg"}
              width={50}
              style={{
                filter: "brightness(0) saturate(100%) invert(0%) sepia(100%) saturate(7500%) hue-rotate(0deg) brightness(50%) contrast(100%)",
              }}
            />
          </div>
        </Space>
      }
      description={
        <Typography.Title level={5} ellipsis={{ rows: 3 }} style={{ textAlign: "center", margin: 0, fontSize: 13 }}>
          {name}
        </Typography.Title>
      }
      style={{ minWidth: 140, overflow: "hidden", ...style }}
    />
  );
}

export default CategoryCard;