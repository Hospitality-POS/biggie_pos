import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Divider, Select, Space, Spin, Tooltip } from "antd";
import { PlusOutlined, UserAddOutlined } from "@ant-design/icons";
import { useDebounce } from "@hooks/useDebounce";
import { usePermissions } from "@hooks/usePermissions";
import { fetchAllCustomers } from "@services/customers";
import AddCustomerModal from "@pages/Customer/AddCustomerModal";

export interface PickedCustomer {
  _id: string;
  customer_name?: string;
  company_name?: string;
  phone?: string | number;
}

const nameOf = (c?: PickedCustomer | null) => c?.customer_name || c?.company_name || "";
const phoneOf = (c?: PickedCustomer | null) => (c?.phone ? `0${String(c.phone).replace(/^0/, "")}` : "");

interface Props {
  value: PickedCustomer | null;
  onChange: (customer: PickedCustomer | null) => void;
  size?: "middle" | "large";
}

/**
 * Customer search with a "+" to create a new customer on the spot — the new
 * customer is selected as soon as it's saved.
 */
const CustomerPicker: React.FC<Props> = ({ value, onChange, size = "middle" }) => {
  const { can } = usePermissions();
  const canAdd = can("CUSTOMERS_CREATE");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [open, setOpen] = useState(false);
  // What was typed when "add" was clicked — the Select clears its search text on close
  const [typed, setTyped] = useState("");
  const debounced = useDebounce(search, 300);

  const { data: customers = [], isFetching } = useQuery({
    queryKey: ["customer-picker", debounced],
    queryFn: () => fetchAllCustomers({ search: debounced }) as Promise<PickedCustomer[]>,
    enabled: debounced.trim().length >= 2,
  });

  // Keep the chosen customer in the list so the Select can show its name
  const options = [...(value && !customers.some((c) => c._id === value._id) ? [value] : []), ...customers.slice(0, 30)];

  const openAdd = () => {
    setTyped(search.trim());
    setOpen(false);
    setAddOpen(true);
  };

  return (
    <>
      <Space.Compact style={{ width: "100%" }}>
        <Select
          showSearch
          size={size}
          open={open}
          onDropdownVisibleChange={setOpen}
          value={value?._id}
          placeholder="Search by name, phone or email"
          filterOption={false}
          onSearch={setSearch}
          onChange={(id) => onChange(options.find((c) => c._id === id) ?? null)}
          notFoundContent={
            isFetching ? <Spin size="small" /> : debounced.length >= 2 ? "No customers found" : "Type at least 2 letters"
          }
          options={options.map((c) => ({ value: c._id, label: `${nameOf(c)}${phoneOf(c) ? ` · ${phoneOf(c)}` : ""}` }))}
          style={{ flex: 1, minWidth: 0 }}
          dropdownRender={(menu) => (
            <>
              {menu}
              {canAdd && (
                <>
                  <Divider style={{ margin: "6px 0" }} />
                  <Button type="text" icon={<UserAddOutlined />} onClick={openAdd} block style={{ textAlign: "left" }}>
                    {search.trim() ? `Add “${search.trim()}” as a new customer` : "Add a new customer"}
                  </Button>
                </>
              )}
            </>
          )}
        />
        {canAdd && (
          <Tooltip title="New customer">
            <Button size={size} icon={<PlusOutlined />} onClick={openAdd} aria-label="Add a new customer" />
          </Tooltip>
        )}
      </Space.Compact>

      {canAdd && (
        <AddCustomerModal
          visible={addOpen}
          onClose={() => setAddOpen(false)}
          // Start the new customer with what was typed in the search box
          prefill={typed ? (/^[\d+\s]{7,}$/.test(typed) ? { phone: typed } : { customer_name: typed }) : undefined}
          onSuccess={(saved) => {
            if (saved?._id) onChange(saved as PickedCustomer);
            setSearch("");
            setTyped("");
          }}
        />
      )}
    </>
  );
};

export default CustomerPicker;
