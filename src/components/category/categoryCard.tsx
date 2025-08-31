import { CheckCard } from "@ant-design/pro-components";
import { Image, Space, Typography } from "antd";

import { usePrimaryColor } from "@context/PrimaryColorContext";

function CategoryCard({
  icon,
  name,
  id,
  handleSelectedCard,
}: any) {
  
  const primaryColor = usePrimaryColor();

  return (
    <CheckCard
      onClick={() => handleSelectedCard(id)}
      title={
        <Space style={{ justifyContent: "center", width: "100vw" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <Image
              preview={false}
              src={icon ? icon : "/categoryIcon.svg"}
              width={50}
              style={{
                filter: "brightness(0) saturate(100%) invert(0%) sepia(100%) saturate(7500%) hue-rotate(0deg) brightness(50%) contrast(100%)",
              }}
            />
            {/* Color overlay to apply primary color to icon */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                mixBlendMode: "multiply",
                pointerEvents: "none",
              }}
            />
          </div>
        </Space>
      }
      description={
        <Typography.Title level={5} ellipsis={{ rows: 3 }} style={{ textAlign: "center" }}>
          {name}
        </Typography.Title>
      }
      style={{ width: 200, overflow: "hidden" }}
    />
  );
}

export default CategoryCard;