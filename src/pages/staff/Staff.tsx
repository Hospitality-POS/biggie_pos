import { useQuery } from "@tanstack/react-query";
import StaffCard from "../../components/staffCard/StaffCard";
import { Divider, Typography, Input, Pagination, Empty, Flex } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import classes from "./staffs.module.css";
import { Key, useEffect, useState, useRef } from "react";
import SkeletonCard from "../../components/staffCard/SkeletonCard";
import { fetchAllUsersByShopId } from "../../services/users";
import React from "react";

const { Title, Text } = Typography;

const Staff = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pageSize = 10;

  // Fetch staff with pagination and search
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["staff", currentPage, searchQuery],
    queryFn: async () => {
      const result = await fetchAllUsersByShopId({
        page: currentPage,
        pageSize: pageSize,
        search: searchQuery,
      });
      return result;
    },
  });

  const users = data?.users || [];
  const pagination = data?.pagination || { total: 0, limit: pageSize, skip: 0 };
  
  // Calculate total pages
  const totalPages = Math.ceil(pagination.total / pageSize);

  // Handle search with debouncing
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setSearchQuery(query);
    setCurrentPage(1);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      refetch();
    }, 500);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div>
        <div className={classes.staffheader}>
          <Title level={4} style={{ margin: "16px 0 8px 16px" }}>
            Registered Staff
          </Title>
        </div>
        <Divider style={{ margin: "12px 0" }} />
        <div className="cards">
          {[...Array(12)].map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return <div>An error has occurred: {(error as any)?.message}</div>;
  }

  return (
    <section className="staff-section">
      <div className={classes.staffheader}>
        <Title level={4} style={{ margin: "16px 0 8px 16px" }}>
          Registered Staff ({pagination.total})
        </Title>
        <div style={{ marginLeft: 16, marginTop: 8, marginBottom: 16, maxWidth: 400 }}>
          <Input
            size="middle"
            placeholder="Search staff by name..."
            value={searchQuery}
            onChange={handleSearchChange}
            prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
            allowClear
          />
        </div>
      </div>
      <Divider style={{ margin: "12px 0" }} />
      <div className="cards">
        {users.length > 0 ? (
          users.map((item: { _id: Key | null | undefined }) => (
            <StaffCard key={item._id} item={item} />
          ))
        ) : (
          <div style={{ padding: "48px 16px", textAlign: "center", width: "100%" }}>
            <Empty description={`No staff members found matching "${searchQuery}"`} />
          </div>
        )}
      </div>
      {totalPages > 1 && (
        <Flex justify="center" style={{ padding: 24 }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={pagination.total}
            onChange={handlePageChange}
            showSizeChanger={false}
            showTotal={(total, range) => `Showing ${range[0]}-${range[1]} of ${total} staff members`}
          />
        </Flex>
      )}
    </section>
  );
};

export default Staff;