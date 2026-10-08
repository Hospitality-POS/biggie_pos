/**
 * EMAIL TEMPLATES
 * ═══════════════════════════════════════════════════════════════════════════════
 * A small catalog of ready-made HTML shells for email campaigns. The user's
 * own message (plain text or simple HTML) is dropped into the template's
 * content area, so they don't have to write HTML from scratch.
 *
 * `render(subject, bodyHtml)` returns the final HTML sent to the provider.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface EmailTemplate {
    id: string;
    name: string;
    description: string;
    accent: string;
    render: (subject: string, bodyHtml: string) => string;
}

// Turn plain-text messages (with \n line breaks) into safe paragraph HTML;
// leaves already-HTML content (containing tags) untouched.
const toHtml = (body: string) => {
    if (/<[a-z][\s\S]*>/i.test(body)) return body;
    return body
        .split(/\n{2,}/)
        .map((p) => `<p style="margin:0 0 14px;">${p.replace(/\n/g, "<br/>")}</p>`)
        .join("");
};

const wrap = (opts: {
    preheader: string;
    headerHtml: string;
    bodyHtml: string;
    footerHtml: string;
    bg: string;
    cardBg: string;
    fontFamily?: string;
}) => `
<div style="display:none;max-height:0;overflow:hidden;">${opts.preheader}</div>
<div style="background:${opts.bg};padding:24px 12px;font-family:${opts.fontFamily || "Arial, Helvetica, sans-serif"};">
  <div style="max-width:600px;margin:0 auto;background:${opts.cardBg};border-radius:10px;overflow:hidden;">
    ${opts.headerHtml}
    <div style="padding:28px 28px 8px;color:#1f2937;font-size:14px;line-height:1.6;">
      ${opts.bodyHtml}
    </div>
    ${opts.footerHtml}
  </div>
</div>`;

export const EMAIL_TEMPLATES: EmailTemplate[] = [
    {
        id: "simple",
        name: "Simple (Plain)",
        description: "A neutral, text-first layout with no heavy branding — reads like a personal email.",
        accent: "#64748b",
        render: (subject, body) => wrap({
            preheader: subject,
            bg: "#ffffff",
            cardBg: "#ffffff",
            headerHtml: "",
            bodyHtml: toHtml(body),
            footerHtml: `<div style="padding:16px 28px 28px;color:#94a3b8;font-size:11px;">Sent via your business messaging.</div>`,
        }),
    },
    {
        id: "professional",
        name: "Professional / Corporate",
        description: "Clean banner header, structured body, formal footer — suited for business correspondence.",
        accent: "#0E388A",
        render: (subject, body) => wrap({
            preheader: subject,
            bg: "#f1f5f9",
            cardBg: "#ffffff",
            headerHtml: `<div style="background:#0E388A;padding:22px 28px;">
                <div style="color:#fff;font-size:17px;font-weight:700;letter-spacing:.3px;">${subject}</div>
            </div>`,
            bodyHtml: toHtml(body),
            footerHtml: `<div style="padding:16px 28px 24px;border-top:1px solid #e2e8f0;color:#64748b;font-size:11px;">
                This is a business communication. Please do not share this email beyond its intended recipient.
            </div>`,
        }),
    },
    {
        id: "modern_minimal",
        name: "Modern Minimal",
        description: "Lots of whitespace, a thin accent rule, sans-serif type — a light contemporary feel.",
        accent: "#111827",
        render: (subject, body) => wrap({
            preheader: subject,
            bg: "#ffffff",
            cardBg: "#ffffff",
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            headerHtml: `<div style="padding:28px 28px 0;">
                <div style="width:40px;height:3px;background:#111827;margin-bottom:14px;"></div>
                <div style="font-size:19px;font-weight:600;color:#111827;">${subject}</div>
            </div>`,
            bodyHtml: toHtml(body),
            footerHtml: `<div style="padding:16px 28px 28px;color:#9ca3af;font-size:11px;">— sent with care</div>`,
        }),
    },
    {
        id: "promotional",
        name: "Promotional / Marketing",
        description: "Bold color banner with a call-to-action feel — good for offers and announcements.",
        accent: "#ef4444",
        render: (subject, body) => wrap({
            preheader: subject,
            bg: "#fff1f2",
            cardBg: "#ffffff",
            headerHtml: `<div style="background:linear-gradient(135deg,#ef4444,#f97316);padding:30px 28px;text-align:center;">
                <div style="color:#fff;font-size:20px;font-weight:800;">${subject}</div>
            </div>`,
            bodyHtml: toHtml(body),
            footerHtml: `<div style="padding:18px 28px 26px;text-align:center;color:#9ca3af;font-size:11px;">
                You're receiving this because you're a valued customer.
            </div>`,
        }),
    },
    {
        id: "newsletter",
        name: "Newsletter",
        description: "Masthead-style header and article-like body spacing — good for periodic updates.",
        accent: "#0d9488",
        render: (subject, body) => wrap({
            preheader: subject,
            bg: "#f8fafc",
            cardBg: "#ffffff",
            headerHtml: `<div style="padding:20px 28px;border-bottom:3px solid #0d9488;">
                <div style="font-size:11px;letter-spacing:1.5px;color:#0d9488;font-weight:700;text-transform:uppercase;">Newsletter</div>
                <div style="font-size:19px;font-weight:700;color:#0f172a;margin-top:4px;">${subject}</div>
            </div>`,
            bodyHtml: toHtml(body),
            footerHtml: `<div style="padding:16px 28px 26px;color:#94a3b8;font-size:11px;">You're subscribed to our updates.</div>`,
        }),
    },
    {
        id: "formal_announcement",
        name: "Formal Announcement",
        description: "A neutral, non-partisan / apolitical tone — centered title, serif type, restrained styling for official notices.",
        accent: "#374151",
        render: (subject, body) => wrap({
            preheader: subject,
            bg: "#ffffff",
            cardBg: "#ffffff",
            fontFamily: "Georgia, 'Times New Roman', serif",
            headerHtml: `<div style="padding:30px 28px 10px;text-align:center;border-bottom:1px solid #e5e7eb;">
                <div style="font-size:18px;font-weight:700;color:#111827;">${subject}</div>
            </div>`,
            bodyHtml: toHtml(body),
            footerHtml: `<div style="padding:16px 28px 28px;text-align:center;color:#9ca3af;font-size:11px;">
                Official notice — for general information only.
            </div>`,
        }),
    },
    {
        id: "friendly",
        name: "Friendly / Casual",
        description: "Rounded card, warm color, conversational tone — good for personal-feeling outreach.",
        accent: "#f59e0b",
        render: (subject, body) => wrap({
            preheader: subject,
            bg: "#fffbeb",
            cardBg: "#ffffff",
            headerHtml: `<div style="padding:24px 28px 0;">
                <div style="display:inline-block;background:#fef3c7;color:#b45309;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;">Hi there 👋</div>
                <div style="font-size:19px;font-weight:700;color:#1f2937;margin-top:10px;">${subject}</div>
            </div>`,
            bodyHtml: toHtml(body),
            footerHtml: `<div style="padding:16px 28px 26px;color:#b45309;font-size:11px;">Thanks for being awesome 🎉</div>`,
        }),
    },
];

export const getEmailTemplate = (id?: string): EmailTemplate =>
    EMAIL_TEMPLATES.find((t) => t.id === id) || EMAIL_TEMPLATES[0];
