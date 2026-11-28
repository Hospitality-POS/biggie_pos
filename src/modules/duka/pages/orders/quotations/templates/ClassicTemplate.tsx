import React from "react";
import { branding, computeTotals, money, quoteDate, type QuoteRenderProps } from "./shared";

// A compact one-table quote: "QUOTATION" heading with the number and dates,
// a bill-to box, every section's lines in one table (section names as group
// rows), the total, then the text blocks as terms. Specification, features
// and pictures are listed briefly after the terms.

const FONT = "'Segoe UI', Arial, sans-serif";
const td: React.CSSProperties = { padding: "7px 8px", borderBottom: "1px solid #e5e7eb", fontSize: 12.5, verticalAlign: "top" };

const ClassicTemplate: React.FC<QuoteRenderProps> = (props) => {
    const { quote } = props;
    const brand = branding(props);
    const { sections, grand_total } = computeTotals(quote.sections || []);
    const currency = quote.currency || "KES";
    const client = quote.client || {};

    return (
        <div style={{ fontFamily: FONT, color: "#1f2937", background: "#fff", width: "100%" }}>
            {brand.header && <img src={brand.header} alt="" style={{ width: "100%", display: "block", marginBottom: 12 }} />}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
                <div>
                    <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 2, color: brand.accent }}>QUOTATION</div>
                    {quote.title && <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{quote.title}</div>}
                </div>
                <table style={{ fontSize: 12.5, borderCollapse: "collapse" }}>
                    <tbody>
                        <tr><td style={{ paddingRight: 12, color: "#6b7280" }}>Quote No</td><td style={{ fontWeight: 700 }}>{quote.quote_no || "Draft"}</td></tr>
                        <tr><td style={{ paddingRight: 12, color: "#6b7280" }}>Date</td><td>{quoteDate(quote.issue_date)}</td></tr>
                        {quote.valid_until && <tr><td style={{ paddingRight: 12, color: "#6b7280" }}>Valid until</td><td>{quoteDate(quote.valid_until)}</td></tr>}
                    </tbody>
                </table>
            </div>

            {(client.name || client.phone || client.email) && (
                <div style={{ marginTop: 16, padding: "10px 12px", background: "#f9fafb", borderLeft: `4px solid ${brand.accent}`, fontSize: 13, lineHeight: 1.6 }}>
                    <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Quote for</div>
                    <div style={{ fontWeight: 700 }}>{client.name}</div>
                    {client.contact_person && <div>Attn: {client.contact_person}</div>}
                    {[client.phone, client.email].filter(Boolean).join(" · ")}
                    {client.address && <div>{client.address}</div>}
                    {client.kra_pin && <div>KRA PIN: {client.kra_pin}</div>}
                </div>
            )}

            {quote.intro && <div style={{ whiteSpace: "pre-wrap", fontSize: 13, marginTop: 14 }}>{quote.intro}</div>}
            {quote.objectives && (
                <div style={{ whiteSpace: "pre-wrap", fontSize: 13, marginTop: 10 }}>
                    <strong>{quote.objectives_heading || "Customer objectives"}: </strong>{quote.objectives}
                </div>
            )}

            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
                <thead>
                    <tr style={{ borderBottom: `2px solid ${brand.accent}`, textAlign: "left" }}>
                        <th style={td}>Description</th>
                        <th style={{ ...td, width: 60, textAlign: "center" }}>Qty</th>
                        <th style={{ ...td, width: 120, textAlign: "right" }}>Unit price</th>
                        <th style={{ ...td, width: 130, textAlign: "right" }}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {sections.map((s, si) => (
                        <React.Fragment key={s._id || si}>
                            {sections.length > 1 && (
                                <tr><td colSpan={4} style={{ ...td, fontWeight: 700, background: "#f3f4f6" }}>{s.title || `Section ${si + 1}`}</td></tr>
                            )}
                            {s.lines.map((l, li) => (
                                <tr key={l._id || li}>
                                    <td style={{ ...td, whiteSpace: "pre-wrap" }}>{l.description}</td>
                                    <td style={{ ...td, textAlign: "center" }}>{l.quantity}</td>
                                    <td style={{ ...td, textAlign: "right" }}>{money(l.unit_price)}</td>
                                    <td style={{ ...td, textAlign: "right" }}>{money(l.amount)}</td>
                                </tr>
                            ))}
                            {!!s.vat_rate && (
                                <tr><td colSpan={3} style={{ ...td, textAlign: "right" }}>VAT {Math.round(s.vat_rate * 100)}%</td><td style={{ ...td, textAlign: "right" }}>{money(s.vat_amount)}</td></tr>
                            )}
                            {sections.length > 1 && (
                                <tr><td colSpan={3} style={{ ...td, textAlign: "right", fontWeight: 600 }}>Subtotal — {s.title}</td><td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{money(s.total)}</td></tr>
                            )}
                        </React.Fragment>
                    ))}
                    <tr>
                        <td colSpan={3} style={{ ...td, textAlign: "right", fontWeight: 800, fontSize: 14, borderBottom: "none" }}>Total ({currency})</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 800, fontSize: 14, borderBottom: "none", color: brand.accent }}>{money(grand_total)}</td>
                    </tr>
                </tbody>
            </table>

            {(quote.blocks || []).filter((b) => b.body?.trim()).map((b, i) => (
                <div key={b._id || i} style={{ marginTop: 12, fontSize: 12.5 }}>
                    {b.heading && <div style={{ fontWeight: 700, marginBottom: 2 }}>{b.heading}</div>}
                    <div style={{ whiteSpace: "pre-wrap", color: "#374151" }}>{b.body}</div>
                </div>
            ))}

            {(quote.spec_groups || []).map((g, gi) => (
                <div key={g._id || gi} style={{ marginTop: 14, fontSize: 12.5 }}>
                    <div style={{ fontWeight: 700 }}>{g.title || quote.spec_heading}</div>
                    {g.rows.map((r, ri) => <div key={ri}><span style={{ color: "#6b7280" }}>{r.label}:</span> {r.value}</div>)}
                </div>
            ))}

            {!!quote.features?.length && (
                <div style={{ marginTop: 14, fontSize: 12.5 }}>
                    <div style={{ fontWeight: 700 }}>{quote.features_heading || "Optional functions"}</div>
                    {quote.features.map((f, i) => (
                        <div key={f._id || i}>• {f.name}{f.description ? ` — ${f.description}` : ""}{f.included ? " (included)" : ""}</div>
                    ))}
                </div>
            )}

            {!!quote.gallery?.length && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 14 }}>
                    {quote.gallery.map((g, i) => (
                        <div key={g._id || i} style={{ textAlign: "center", fontSize: 11 }}>
                            <img src={g.image} alt="" style={{ width: "100%", height: 100, objectFit: "contain" }} />
                            {g.caption}
                        </div>
                    ))}
                </div>
            )}

            {brand.footer && <img src={brand.footer} alt="" style={{ width: "100%", display: "block", marginTop: 20 }} />}
        </div>
    );
};

export default ClassicTemplate;
