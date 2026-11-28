import React from "react";
import { branding, computeTotals, money, quoteDate, sectionLetter, type QuoteRenderProps } from "./shared";

// The default layout, drawn after the business's Word quote template: a
// banner header, the quote title with its date, an introduction and the
// customer's objectives, priced sections (A, B, C…) each with its own total,
// the contract total, then notes / payment terms, a specification table with
// pictures, optional functions and a picture gallery, and a banner footer.

const FONT = "'Calibri', 'Segoe UI', Arial, sans-serif";

const cell: React.CSSProperties = {
    border: "1px solid #9ca3af",
    padding: "6px 8px",
    fontSize: 12.5,
    verticalAlign: "top",
};

const Heading: React.FC<{ children: React.ReactNode; color: string }> = ({ children, color }) => (
    <div style={{
        fontWeight: 700, fontSize: 14, textTransform: "uppercase", color,
        margin: "18px 0 8px", letterSpacing: 0.3,
    }}>
        {children}
    </div>
);

const Text: React.FC<{ value?: string }> = ({ value }) =>
    value ? <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.55 }}>{value}</div> : null;

const SectionedTemplate: React.FC<QuoteRenderProps> = (props) => {
    const { quote } = props;
    const brand = branding(props);
    const { sections, grand_total } = computeTotals(quote.sections || []);
    const currency = quote.currency || "KES";
    const letters = sections.map((_, i) => sectionLetter(i));
    const client = quote.client || {};
    const clientLine = [client.name, client.contact_person, client.phone, client.email, client.address]
        .filter(Boolean).join(" · ");

    return (
        <div style={{ fontFamily: FONT, color: "#111827", background: "#fff", width: "100%" }}>
            {brand.header && (
                <img src={brand.header} alt=""
                    style={{ width: "100%", display: "block", marginBottom: 14 }} />
            )}

            <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16,
                borderBottom: `3px solid ${brand.secondary}`, paddingBottom: 6,
            }}>
                <div style={{ fontWeight: 800, fontSize: 18, textTransform: "uppercase", color: brand.accent }}>
                    {quote.title || "Quotation"}
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>{quoteDate(quote.issue_date)}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12, color: "#4b5563", marginTop: 4 }}>
                <span>{quote.quote_no ? `Quote No: ${quote.quote_no}` : "Draft quote"}</span>
                {quote.valid_until && <span>Valid until {quoteDate(quote.valid_until)}</span>}
            </div>
            {clientLine && (
                <div style={{ fontSize: 13, marginTop: 10 }}>
                    <strong>Prepared for:</strong> {clientLine}
                    {client.kra_pin ? ` · KRA PIN ${client.kra_pin}` : ""}
                </div>
            )}

            {quote.intro && <div style={{ marginTop: 14 }}><Text value={quote.intro} /></div>}

            {quote.objectives && (
                <>
                    <Heading color={brand.accent}>{quote.objectives_heading || "Customer objectives"}</Heading>
                    <Text value={quote.objectives} />
                </>
            )}

            {sections.map((section, si) => (
                <div key={section._id || si} style={{ breakInside: "avoid" }}>
                    <Heading color={brand.accent}>
                        {letters[si]}. {section.title || "Charges"}
                        {section.currency ? ` in ${section.currency}` : ""}
                    </Heading>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: brand.accent, color: "#fff" }}>
                                <th style={{ ...cell, textAlign: "left" }}>Item</th>
                                <th style={{ ...cell, width: 60, textAlign: "center" }}>Qty</th>
                                <th style={{ ...cell, width: 120, textAlign: "right" }}>Unit price</th>
                                <th style={{ ...cell, width: 130, textAlign: "right" }}>Cost ({section.currency || currency})</th>
                            </tr>
                        </thead>
                        <tbody>
                            {section.lines.map((line, li) => (
                                <tr key={line._id || li}>
                                    <td style={cell}>
                                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                            {line.image && (
                                                <img src={line.image} alt=""
                                                    style={{ width: 110, maxHeight: 80, objectFit: "contain" }} />
                                            )}
                                            <span style={{ whiteSpace: "pre-wrap" }}>{line.description}</span>
                                        </div>
                                    </td>
                                    <td style={{ ...cell, textAlign: "center" }}>{line.quantity}</td>
                                    <td style={{ ...cell, textAlign: "right" }}>{money(line.unit_price)}</td>
                                    <td style={{ ...cell, textAlign: "right" }}>{money(line.amount)}</td>
                                </tr>
                            ))}
                            {!!section.vat_rate && (
                                <tr>
                                    <td style={cell} colSpan={3}>VAT {Math.round(section.vat_rate * 100)}%</td>
                                    <td style={{ ...cell, textAlign: "right" }}>{money(section.vat_amount)}</td>
                                </tr>
                            )}
                            <tr style={{ fontWeight: 700, background: "#f3f4f6" }}>
                                <td style={cell} colSpan={3}>TOTAL</td>
                                <td style={{ ...cell, textAlign: "right" }}>{money(section.total)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ))}

            {sections.length > 1 && (
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
                    <tbody>
                        <tr style={{ fontWeight: 800, background: brand.secondary, color: "#fff" }}>
                            <td style={{ ...cell, fontSize: 13.5 }}>
                                TOTAL CONTRACT CHARGES ({letters.slice(0, -1).join(", ")} AND {letters[letters.length - 1]})
                            </td>
                            <td style={{ ...cell, fontSize: 13.5, width: 170, textAlign: "right" }}>
                                {currency} {money(grand_total)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            )}

            {(quote.blocks || []).filter((b) => b.body?.trim()).map((block, i) => (
                <div key={block._id || i} style={{ breakInside: "avoid" }}>
                    {block.heading && <Heading color={brand.accent}>{block.heading}</Heading>}
                    <Text value={block.body} />
                </div>
            ))}

            {!!quote.spec_groups?.length && (
                <>
                    <Heading color={brand.accent}>{quote.spec_heading || "Specification"}</Heading>
                    {quote.spec_groups.map((group, gi) => (
                        <table key={group._id || gi} style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10, breakInside: "avoid" }}>
                            <tbody>
                                <tr style={{ background: brand.accent, color: "#fff", fontWeight: 700 }}>
                                    <td style={cell} colSpan={2}>{group.title}</td>
                                    {group.image && <td style={{ ...cell, width: "34%" }}>{group.image_caption}</td>}
                                </tr>
                                {group.rows.map((row, ri) => (
                                    <tr key={ri}>
                                        <td style={{ ...cell, width: "28%", fontWeight: 600 }}>{row.label}</td>
                                        <td style={{ ...cell, whiteSpace: "pre-wrap" }}>{row.value}</td>
                                        {group.image && ri === 0 && (
                                            <td style={{ ...cell, textAlign: "center", verticalAlign: "middle" }} rowSpan={group.rows.length}>
                                                <img src={group.image} alt=""
                                                    style={{ maxWidth: "100%", maxHeight: Math.max(120, group.rows.length * 34), objectFit: "contain" }} />
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ))}
                    <Text value={quote.spec_note} />
                </>
            )}

            {!!quote.features?.length && (
                <>
                    <Heading color={brand.accent}>{quote.features_heading || "Optional functions"}</Heading>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                        {quote.features.map((f, i) => (
                            <div key={f._id || i} style={{ border: "1px solid #d1d5db", padding: 8, textAlign: "center", breakInside: "avoid" }}>
                                {f.image && (
                                    <img src={f.image} alt=""
                                        style={{ width: "100%", height: 110, objectFit: "contain" }} />
                                )}
                                <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{f.name}</div>
                                {f.description && <div style={{ fontSize: 12, color: "#4b5563" }}>{f.description}</div>}
                                {f.included && (
                                    <div style={{ marginTop: 4, fontSize: 11, fontWeight: 800, color: brand.secondary }}>INCLUDED</div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {!!quote.gallery?.length && (
                <>
                    <Heading color={brand.accent}>{quote.gallery_heading || "Pictures"}</Heading>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                        {quote.gallery.map((g, i) => (
                            <div key={g._id || i} style={{ textAlign: "center", breakInside: "avoid" }}>
                                <img src={g.image} alt=""
                                    style={{ width: "100%", height: 150, objectFit: "contain", border: "1px solid #e5e7eb" }} />
                                {g.caption && <div style={{ fontSize: 12, marginTop: 3 }}>{g.caption}</div>}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {brand.footer && (
                <img src={brand.footer} alt=""
                    style={{ width: "100%", display: "block", marginTop: 22 }} />
            )}
        </div>
    );
};

export default SectionedTemplate;
