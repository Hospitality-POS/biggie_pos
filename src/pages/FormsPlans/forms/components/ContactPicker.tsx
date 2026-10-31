import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Col, Input, Row, Segmented, Select, Spin, Typography } from "antd";
import { UserAddOutlined, UserOutlined } from "@ant-design/icons";
import { useDebounce } from "@hooks/useDebounce";
import { fetchAllLeads } from "@services/crm/leads";
import type { NewContact } from "@services/formSubmissions";
import { THEME_C } from "@utils/getPrimaryColor";
import { personName, type PersonLite } from "../person";

const { Text } = Typography;

const phoneOf = (p?: PersonLite | null) => (p?.phone ? String(p.phone) : "");

/** Search the shop's Mteja leads. */
export const LeadPicker: React.FC<{
  value: PersonLite | null;
  onChange: (lead: PersonLite | null) => void;
  size?: "middle" | "large";
}> = ({ value, onChange, size = "middle" }) => {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);

  const { data: leads = [], isFetching } = useQuery({
    queryKey: ["lead-picker", debounced],
    queryFn: async () => (await fetchAllLeads({ search: debounced || undefined, limit: 30 })).leads as PersonLite[],
  });

  // Keep the chosen lead in the list so the Select can show their name
  const options = [...(value && !leads.some((l) => l._id === value._id) ? [value] : []), ...leads];

  return (
    <Select
      showSearch
      size={size}
      value={value?._id}
      placeholder="Search leads by name, company or phone"
      filterOption={false}
      onSearch={setSearch}
      onChange={(id) => onChange(options.find((l) => l._id === id) ?? null)}
      notFoundContent={isFetching ? <Spin size="small" /> : "No leads found — use “Someone new”"}
      options={options.map((l) => ({
        value: l._id,
        label: [personName(l), l.company_name && l.company_name !== personName(l) ? l.company_name : "", phoneOf(l)]
          .filter(Boolean)
          .join(" · "),
      }))}
      style={{ width: "100%" }}
    />
  );
};

export type ContactChoice =
  | { mode: "lead"; lead: PersonLite | null }
  | { mode: "new"; contact: NewContact };

export const EMPTY_CONTACT: NewContact = { name: "", phone: "", email: "", id_number: "" };

/** Ready to send: a lead is chosen, or a new person has a name and a phone or email. */
export const contactChoiceReady = (c: ContactChoice) =>
  c.mode === "lead" ? !!c.lead : !!c.contact.name.trim() && !!(c.contact.phone?.trim() || c.contact.email?.trim());

/** The person's name for messages, from either kind of choice. */
export const contactChoiceName = (c: ContactChoice) => (c.mode === "lead" ? personName(c.lead) : c.contact.name.trim());

/**
 * Who a Mteja contact form is for: an existing lead, or someone with no
 * record at all (a visitor, event participant, supplier contact…).
 */
const ContactPicker: React.FC<{
  value: ContactChoice;
  onChange: (value: ContactChoice) => void;
  size?: "middle" | "large";
}> = ({ value, onChange, size = "middle" }) => {
  const set = (patch: Partial<NewContact>) =>
    onChange({ mode: "new", contact: { ...(value.mode === "new" ? value.contact : EMPTY_CONTACT), ...patch } });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Segmented
        block
        value={value.mode}
        onChange={(m) => onChange(m === "lead" ? { mode: "lead", lead: null } : { mode: "new", contact: EMPTY_CONTACT })}
        options={[
          { value: "lead", label: "Existing lead", icon: <UserOutlined /> },
          { value: "new", label: "Someone new", icon: <UserAddOutlined /> },
        ]}
      />
      {value.mode === "lead" ? (
        <LeadPicker value={value.lead} onChange={(lead) => onChange({ mode: "lead", lead })} size={size} />
      ) : (
        <>
          <Input
            size={size}
            placeholder="Full name *"
            value={value.contact.name}
            onChange={(e) => set({ name: e.target.value })}
            maxLength={120}
          />
          <Row gutter={8}>
            <Col xs={24} sm={12} style={{ marginBottom: 8 }}>
              <Input size={size} placeholder="Phone" value={value.contact.phone} onChange={(e) => set({ phone: e.target.value })} maxLength={30} />
            </Col>
            <Col xs={24} sm={12}>
              <Input size={size} type="email" placeholder="Email" value={value.contact.email} onChange={(e) => set({ email: e.target.value })} maxLength={254} />
            </Col>
          </Row>
          <Input
            size={size}
            placeholder="ID / passport no. (optional)"
            value={value.contact.id_number}
            onChange={(e) => set({ id_number: e.target.value })}
            maxLength={40}
          />
          <Text style={{ fontSize: 12, color: THEME_C.subText }}>
            No customer or lead record is created — their details are kept on the signed form. Enter a phone or an email so you can
            send them the link.
          </Text>
        </>
      )}
    </div>
  );
};

export default ContactPicker;
