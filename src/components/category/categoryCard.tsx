import { CheckCard } from "@ant-design/pro-components";
import { Image, Typography } from "antd";

function CategoryCard({
  icon,
  name,
  id,
  selectedCard,
  handleSelectedCard,
  style,
}: any) {
  const isSelected = selectedCard === id;

  return (
    <CheckCard
      className="category-checkcard"
      checked={isSelected}
      onClick={() => handleSelectedCard(id)}
      description={
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            textAlign: "center",
            padding: "4px 0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 46,
              height: 46,
              marginBottom: 8,
            }}
          >
            <Image
              preview={false}
              src={icon ? icon : "/categoryIcon.svg"}
              width={42}
              height={42}
              style={{
                objectFit: "contain",
                filter:
                  "brightness(0) saturate(100%) invert(0%) sepia(100%) saturate(7500%) hue-rotate(0deg) brightness(50%) contrast(100%)",
              }}
            />
          </div>
          <Typography.Title
            level={5}
            ellipsis={{ rows: 2 }}
            style={{
              textAlign: "center",
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1.35,
              width: "100%",
              wordBreak: "break-word",
            }}
          >
            {name}
          </Typography.Title>
        </div>
      }
      style={{
        width: "100%",
        margin: 0,
        overflow: "hidden",
        ...style,
      }}
    />
  );
}

export default CategoryCard;