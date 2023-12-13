import React, { useState, useEffect, useContext } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  TableSortLabel,
  TablePagination,
  IconButton,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CategoryIcon from "@mui/icons-material/Category";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ActionsIcon from "@mui/icons-material/MoreVert";
import {
  deleteCategory,
  fetchCategories,
} from "../../features/Category/CategoryActions";
import AddCategoryDialog from "../../components/MODALS/Dialogs/AddCategoryDialog";
import { useAppDispatch, useAppSelector } from "../../store";
import {
  ModalForm,
  ProConfigProvider,
  ProFormSelect,
  ProFormText,
  ProProvider,
  ProTable,
  TableDropdown,
  createIntl,
  enUSIntl,
  useIntl,
} from "@ant-design/pro-components";
import { ConfigProvider, Space } from "antd";
import enUS from "antd/es/calendar/locale/en_US";
import dayjs from "dayjs";
import { fetchAllCategories } from "../../services/categories";

export const ModalA =() => {

return (
  <ModalForm
    title="fff"
    submitter={{render:(props, dom)=> {
           return [
             ...dom,
              <Button
                key="ok"
                onClick={() => {
                  props.submit();
                }}
              >
                ok
              </Button>,
            ];
    }}}
    trigger={
 <Button>Add new subcategory</Button>
    }
   
    autoFocusFirstInput
    modalProps={{
      destroyOnClose: true,
      onCancel: () => console.log('run'),
    }}
  >
  <p>Child</p>
  </ModalForm>
);
};
const CategorySettings = () => {
  const dispatch = useAppDispatch();
  const { categories } = useAppSelector((state) => state.Categories);
  const [filter, setFilter] = useState("");
  const [orderBy, setOrderBy] = useState("name");
  const [order, setOrder] = useState("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  // console.log(enUSIntl);




  const enLocale = {
    tableForm: {
      search: "Query",
      reset: "Reset",
      submit: "Submit",
      collapsed: "Expand",
      expand: "Collapse",
      inputPlaceholder: "Please enter",
      selectPlaceholder: "Please select",
    },
    alert: {
      clear: "Clear",
    },
    tableToolBar: {
      leftPin: "Pin to left",
      rightPin: "Pin to right",
      noPin: "Unpinned",
      leftFixedTitle: "Fixed the left",
      rightFixedTitle: "Fixed the right",
      noFixedTitle: "Not Fixed",
      reset: "Reset",
      columnDisplay: "Column Display",
      columnSetting: "Settings",
      fullScreen: "Full Screen",
      exitFullScreen: "Exit Full Screen",
      reload: "Refresh",
      density: "Density",
      densityDefault: "Default",
      densityLarger: "Larger",
      densityMiddle: "Middle",
      densitySmall: "Compact",
    },
    pagination: {
      page: "Page",
      prev: "Previous",
      next: "Next",
      first: "First",
      last: "Last",
      jumpTo: "Jump to",
      jumpToConfirm: "Confirm",
      pageSize: "Page Size",
      total: "Total",
      item: "item(s)",
      range: "Page {0}-{1} of {2}",
      pageSizeOptions: ["10", "20", "50", "100"],
      showTotal: (total, range) =>
        `Showing ${range[0]}-${range[1]} of ${total} items`,
    },
  };

  const values = useContext(ProProvider);
  const enUSIntl3 = createIntl("en_US", enLocale);

  const customLocale = {
    items_per_page: "Items per page",
    jump_to: "Jump to",
    jump_to_confirm: "Confirm",
    page: "Page",
    prev_page: "Previous Page",
    next_page: "Next Page",
    prev_5: "Previous 5 Pages",
    next_5: "Next 5 Pages",
    prev_3: "Previous 3 Pages",
    next_3: "Next 3 Pages",
  };

  const handleSort = (property: React.SetStateAction<string>) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleChangePage = (_: any, newPage: React.SetStateAction<number>) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: { target: { value: string } }) => {
    setRowsPerPage(parseInt(event.target.value, 5));
    setPage(0);
  };

  const handleDeleteClick = (category: React.SetStateAction<null>) => {
    setDeleteCandidate(category);
    setDeleteConfirmationOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteCandidate) {
      dispatch(deleteCategory(deleteCandidate._id));
      setDeleteConfirmationOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationOpen(false);
  };

  const handleOpenAddCategoryDialog = () => {
    setAddCategoryDialogOpen(true);
  };

  const handleAddCategory = (newCategory: any) => {
    // You can update your state or perform any necessary actions here
    // For example, you can add the newCategory to your existing categories
    // and update the table accordingly.
  };

  // Filter categories based on user input
  const filteredCategories = categories
    ? categories.filter((category: { name: string }) =>
        category?.name.toLowerCase().includes(filter?.toLowerCase())
      )
    : [];

  // Sort filtered categories
  const sortedCategories = filteredCategories.slice().sort((a, b) => {
    const compareValueA = a[orderBy];
    const compareValueB = b[orderBy];

    if (orderBy === "product_count") {
      return order === "asc"
        ? compareValueA - compareValueB
        : compareValueB - compareValueA;
    } else {
      const comparison = compareValueA.localeCompare(compareValueB);
      return order === "asc" ? comparison : -comparison;
    }
  });

  useEffect(() => {
    const dispatchFetchAllCategories = () => {
      dispatch(fetchCategories());
    };
    dispatchFetchAllCategories();
  }, [dispatch]);

  return (
    <>
    
      {/* <Typography mt={2} variant="h6" ml={2} gutterBottom>
        List of all categories
      </Typography>
      <Box
        display="flex"
        columnGap={2}
        alignItems="center"
        mb={2}
        mt={2}
        sx={{ paddingLeft: 2 }}
      >
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          style={{ padding: 14, backgroundColor: "#6c1c2c" }}
          onClick={handleOpenAddCategoryDialog}
        >
          Add New Category
        </Button>
        <TextField
          label="Search Category"
          value={filter}
          InputProps={{ endAdornment: <SearchIcon /> }}
          onChange={(e) => setFilter(e.target.value)}
        />
      </Box> */}
      {/* <TableContainer
        style={{
          width: "100%",
          marginTop: "1rem",
          overflowX: "auto",
          paddingLeft: 20,
          paddingRight: 20,
        }}
      >
        <Table>
          <TableHead>
            <TableRow style={{ backgroundColor: "#6c1c2c" }}>
              <TableCell style={{ color: "white" }}>
                <TableSortLabel
                  style={{ color: "white" }}
                  active={orderBy === "name"}
                  direction={orderBy === "name" ? order : "asc"}
                  onClick={() => handleSort("name")}
                >
                  <Box display="flex" alignItems="center">
                    <CategoryIcon style={{ marginRight: "4px" }} />
                    Category Name
                    {orderBy === "name" && (
                      <ArrowDropDownIcon
                        style={{
                          transform:
                            order === "asc" ? "rotate(0deg)" : "rotate(180deg)",
                        }}
                      />
                    )}
                  </Box>
                </TableSortLabel>
              </TableCell>
              <TableCell style={{ color: "white" }}>
                <TableSortLabel
                  style={{ color: "white" }}
                  active={orderBy === "product_count"} 
                  direction={orderBy === "product_count" ? order : "asc"}
                  onClick={() => handleSort("product_count")}
                >
                  <Box display="flex" alignItems="center">
                    SubCategory
                    {orderBy === "product_count" && (
                      <ArrowDropDownIcon
                        style={{
                          transform:
                            order === "asc" ? "rotate(0deg)" : "rotate(180deg)",
                        }}
                      />
                    )}
                  </Box>
                </TableSortLabel>
              </TableCell>
              <TableCell style={{ color: "white" }}>
                <Box display="flex" alignItems="center">
                  <ActionsIcon style={{ marginRight: "4px" }} />
                  Actions
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedCategories
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((category) => (
              <>
                  <TableRow key={category._id}>
                    <TableCell
                      style={{
                        display: "flex",
                        alignItems: "center",
                        columnGap: 5,
                      }}
                    >
                      <IconButton>
                        <CategoryIcon />
                      </IconButton>
                      {category.name}
                    </TableCell>
                    <TableCell>{category?.sub_category?.name}</TableCell>
                    <TableCell>
                      <IconButton color="primary">
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteClick(category)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                </>
                ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredCategories.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      /> */}

      <ConfigProvider
        locale={{ locale: "enUS" }}
        theme={{
          token: {
            colorPrimary: "#6c1c2c",
            colorBgContainer: "#f6ffed",
          },
        }}
      >
        <ProProvider.Provider value={{ ...values, intl: enUSIntl3 }}>
          <ProTable
            rowKey="_id"
            pagination={{
              showQuickJumper: true,
               showTotal: (total, range) => (
          <div>{`Showing ${range[0]}-${range[1]} of ${total} total items`}</div>
        ),
        
            }}
            loading={!categories}
            columns={[
              {
                title: "Name",
                dataIndex: "name",
                hideInSearch: false,

                renderFormItem: () => {
                  return (
                    <ProFormText
                      width={"md"}
                      name={"name"}
                      placeholder={"Search Name"}
                    />
                  );
                },
              },
              {
                title: "Subcategory",
                dataIndex: ["sub_category", "name"],
                hideInSearch: false,

                renderFormItem: () => {
                  return (
                    <ProFormText
                      width={"md"}
                      name={["sub_category", "name"]}
                      placeholder={"Search subcategory"}
                    />
                  );
                },
              },
            ]}
            request={async (params) => {
              // setFilter(params.name)
              // return Promise.resolve({
              //   data: !filter ? categories : filteredCategories,
              //   success: true,
              //   total: categories.length - 1,
              // });
              const data = await fetchAllCategories();
              console.log("========", data);
              return {
                data: data,
                success: true,
                total: data.length - 1,
              };
            }}
            tableAlertRender={({
        selectedRowKeys,
        selectedRows,
        onCleanSelected}
      )=>{
        return <p>You have selected {selectedRowKeys.length}</p>

            }}
            rowSelection={{
              alwaysShowAlert:false,
              selections: false,
            }}
            search={{
              searchText: "Search Category",
              resetText: "Reset",
              labelWidth: "auto",
            }}
            dateFormatter="string"
            headerTitle="List of categories"
            toolBarRender={() => [<ModalA/>]}
          />
        </ProProvider.Provider>
      </ConfigProvider>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmationOpen}
        onClose={handleDeleteCancel}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete :{" "}
          <i>{deleteCandidate ? deleteCandidate.name : ""} </i>the category
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Category Dialog */}
      <AddCategoryDialog
        open={addCategoryDialogOpen}
        onClose={() => setAddCategoryDialogOpen(false)}
        onAddCategory={handleAddCategory}
      />
    </>
  );
};

export default CategorySettings;
