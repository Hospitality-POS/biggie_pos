import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, Spin } from "antd";
import { useDebounce } from "@hooks/useDebounce";
import { fetchEmployees } from "@services/bandu";
import CustomerPicker, { type PickedCustomer } from "./CustomerPicker";
import { useAudience } from "../../audience";
import { personName, type PersonLite } from "../person";

const phoneOf = (p?: PersonLite | null) => (p?.phone ? `0${String(p.phone).replace(/^0/, "")}` : "");

interface Props {
  value: PersonLite | null;
  onChange: (person: PersonLite | null) => void;
  size?: "middle" | "large";
}

/** Employee search for HR forms and plans. */
const EmployeePicker: React.FC<Props> = ({ value, onChange, size = "middle" }) => {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);

  const { data: employees = [], isFetching } = useQuery({
    queryKey: ["employee-picker", debounced],
    queryFn: async () => {
      // /employees returns the list under `data` (same as the Employees page reads it)
      const res = await fetchEmployees({ search: debounced || undefined, limit: 30 });
      return (Array.isArray(res) ? res : res?.data ?? res?.employees ?? []) as PersonLite[];
    },
  });

  // Keep the chosen employee in the list so the Select can show their name
  const options = [...(value && !employees.some((e) => e._id === value._id) ? [value] : []), ...employees.slice(0, 30)];

  return (
    <Select
      showSearch
      size={size}
      value={value?._id}
      placeholder="Search employees by name or number"
      filterOption={false}
      onSearch={setSearch}
      onChange={(id) => onChange(options.find((e) => e._id === id) ?? null)}
      notFoundContent={isFetching ? <Spin size="small" /> : "No employees found"}
      options={options.map((e) => ({
        value: e._id,
        label: [personName(e), e.job_title, phoneOf(e)].filter(Boolean).join(" · "),
      }))}
      style={{ width: "100%" }}
    />
  );
};

/** Customer or employee picker, depending on the audience. */
const PersonPicker: React.FC<Props> = (props) => {
  const { audience } = useAudience();
  if (audience === "employee") return <EmployeePicker {...props} />;
  return (
    <CustomerPicker
      value={props.value as PickedCustomer | null}
      onChange={(c) => props.onChange(c)}
      size={props.size}
    />
  );
};

export default PersonPicker;
