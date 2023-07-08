import React, { useRef, useState } from "react";
import { Box, Button, IconButton } from "@mui/material";
import { ArrowBackIos, ArrowForwardIos } from "@mui/icons-material";

const HorizontalCategorySection = ({ categories }) => {
  const containerRef = useRef(null);

  const handleScrollLeft = () => {
    containerRef.current.scrollBy({
      left: -containerRef.current.offsetWidth,
      behavior: "smooth",
    });
  };

  const handleScrollRight = () => {
    containerRef.current.scrollBy({
      left: containerRef.current.offsetWidth,
      behavior: "smooth",
    });
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", overflowX: "auto" }}>
      <IconButton onClick={handleScrollLeft} sx={{ display: { xs: "none", md: "block" } }}>
        <ArrowBackIos />
      </IconButton>
      <div ref={containerRef} sx={{ display: "flex", gap: "10px" }}>
        {categories.map((category, index) => (
          <Box
            key={index}
            sx={{
              width: 120,
              height: 120,
              backgroundColor: "#e0e0e0",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {category}
          </Box>
        ))}
      </div>
      <IconButton onClick={handleScrollRight} sx={{ display: { xs: "none", md: "block" } }}>
        <ArrowForwardIos />
      </IconButton>
      <Button onClick={handleScrollLeft} sx={{ display: { xs: "block", md: "none" } }}>
        Scroll Left
      </Button>
      <Button onClick={handleScrollRight} sx={{ display: { xs: "block", md: "none" } }}>
        Scroll Right
      </Button>
    </Box>
  );
};

export default HorizontalCategorySection;
