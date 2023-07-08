import React from "react";

import { Typography, List, ListItem, ListItemText } from "@mui/material";
import HorizontalCategorySection from "../../components/category/HorizontalCategorySection";

const RestaurantPage = () => {
  const categories = ["Appetizers", "Main Courses", "Desserts", "Drinks"];

  const menus = [
    { name: "Chicken Wings", price: "$10" },
    { name: "Pasta Carbonara", price: "$15" },
    { name: "Cheesecake", price: "$8" },
    { name: "Mojito", price: "$8" },
  ];

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Restaurant Menu
      </Typography>
      <HorizontalCategorySection categories={categories} />

      <Typography variant="h6" gutterBottom mt={4}>
        Menus
      </Typography>
      <List>
        {menus.map((menu, index) => (
          <ListItem key={index}>
            <ListItemText primary={menu.name} secondary={menu.price} />
          </ListItem>
        ))}
      </List>
    </div>
  );
};

export default RestaurantPage;
