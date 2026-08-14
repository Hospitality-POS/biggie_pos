import { useQuery } from "@tanstack/react-query";
import StaffCard from "../../components/staffCard/StaffCard";
import { Divider, Typography, TextField, Box, InputAdornment, Pagination, Stack } from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import classes from "./staffs.module.css";
import { Key, useEffect, useState, useRef } from "react";
import SkeletonCard from "../../components/staffCard/SkeletonCard";
import { fetchAllUsersByShopId } from "../../services/users";
import React from "react";

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
    setCurrentPage(1); // Reset to first page on search

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      refetch();
    }, 500);
  };

  // Handle page change
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          <Typography mt={2} variant="h6" ml={2} gutterBottom>
            Registered Staff
          </Typography>
        </div>
        <Divider />
        <div className="cards">
          {[...Array(12)].map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return <div>An error has occurred: {error?.message}</div>;
  }

  return (
    <section className="staff-section">
      <div className={classes.staffheader}>
        <Typography mt={2} variant="h6" ml={2} gutterBottom>
          Registered Staff ({pagination.total})
        </Typography>
        <Box sx={{ ml: 2, mt: 2, mb: 2, maxWidth: 400 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search staff by name..."
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </div>
      <Divider />
      <div className="cards">
        {users.length > 0 ? (
          users.map((item: { _id: Key | null | undefined }) => (
            <StaffCard key={item._id} item={item} />
          ))
        ) : (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body1" color="textSecondary">
              No staff members found matching "{searchQuery}"
            </Typography>
          </Box>
        )}
      </div>
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <Stack spacing={2}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              showFirstButton
              showLastButton
            />
            <Typography variant="caption" color="textSecondary" textAlign="center">
              Showing {pagination.skip + 1}-{Math.min(pagination.skip + pageSize, pagination.total)} of {pagination.total} staff members
            </Typography>
          </Stack>
        </Box>
      )}
    </section>
  );
};

export default Staff;