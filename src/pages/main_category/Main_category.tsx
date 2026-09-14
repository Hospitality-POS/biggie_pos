import React from "react";
import { Button, Flex } from "antd";
import { Link, Outlet, useParams } from "react-router-dom";

const MainCategory: React.FC = () => {
  const { id } = useParams();
  return (
    <div style={{ minHeight: "100vh", padding: "24px" }}>
      <Flex justify="center" align="center" style={{ height: "80vh" }} gap="middle">
        <Link to={`/main-category/${id}/kitchen`}>
          <Button type="primary" size="large">
            Kitchen
          </Button>
        </Link>
        <Link to={`/main-category/${id}/bar`}>
          <Button size="large">
            BAR
          </Button>
        </Link>
      </Flex>
      <Outlet />
    </div>
  );
};

export default MainCategory;
