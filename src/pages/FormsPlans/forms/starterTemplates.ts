import { newField, newSectionKey } from "./constants";
import type { Audience, BuiltInCategory, EditableForm, FieldType, FormField, FormSection, PrefillSource } from "./types";

/**
 * Ready-made forms a shop can start from instead of uploading paper. Picking
 * one creates a normal draft in the builder, so the business edits the
 * wording, then sends it for approval like any other form. The wording is a
 * plain-English starting point, not legal advice.
 */

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  category: BuiltInCategory;
  /** Short line on the gallery card */
  useFor: string;
  build: () => EditableForm;
}

// ── Builders ──────────────────────────────────────────────────────────────────

const field = (type: FieldType, label: string, extra: Partial<FormField> = {}): FormField => ({
  ...newField(type),
  label,
  ...extra,
});

const info = (...content: string[]) => field("info", "", { content });
const consent = (label: string, required = true) => field("consent", label, { required });
const yesNo = (label: string, extra: Partial<FormField> = {}) =>
  field("yes_no", label, { required: true, detail_label: "", ...extra });
const text = (label: string, prefill: PrefillSource = "none", extra: Partial<FormField> = {}) =>
  field("short_text", label, { prefill_from: prefill, ...extra });

const section = (title: string, fields: FormField[], description = ""): FormSection => ({
  key: newSectionKey(),
  title,
  description,
  enabled: true,
  fields,
});

const choice = (type: "single_choice" | "multi_choice", label: string, options: string[], extra: Partial<FormField> = {}) => {
  const base = newField(type);
  return {
    ...base,
    label,
    required: true,
    options: options.map((o, i) => ({ key: `opt_${i}_${base.key.slice(-4)}`, label: o, enabled: true, is_alert: false })),
    ...extra,
  };
};

/** Name, phone, email (and optionally ID) — filled from the contact's details. */
const yourDetails = (opts: { id?: boolean; address?: boolean; title?: string } = {}) =>
  section(opts.title ?? "Your details", [
    text("Full name", "customer_name", { required: true }),
    field("phone", "Phone number", { prefill_from: "phone", width: "half" }),
    field("email", "Email address", { prefill_from: "email", width: "half" }),
    ...(opts.id ? [text("ID / passport number", "id_number", { width: "half" })] : []),
    ...(opts.address ? [field("long_text", "Address", { prefill_from: "address" })] : []),
  ]);

const signedOn = () => field("date", "Date", { prefill_from: "today", required: true, width: "half" });

const SIGNATORY = [{ role: "client" as const, label: "Signatory", required: true }];
const WITH_STAFF = [
  { role: "client" as const, label: "Signatory", required: true },
  { role: "therapist" as const, label: "Company representative", required: true },
];

// ── Contact (Mteja) templates ────────────────────────────────────────────────

const CONTACT_TEMPLATES: StarterTemplate[] = [
  {
    id: "data_protection_consent",
    name: "Data Protection Consent",
    category: "data_privacy",
    useFor: "Collecting personal data lawfully (Kenya Data Protection Act, 2019)",
    description: "Explains what personal data you collect, why, how long you keep it and the person's rights, and records their consent.",
    build: () => ({
      name: "Data Protection Consent",
      category: "data_privacy",
      description: "Consent to collect and use personal data, in line with the Data Protection Act, 2019.",
      sections: [
        yourDetails({ id: true }),
        section("How we use your information", [
          info(
            "We collect your name, contact details and any other information you give us so that we can respond to your enquiry, provide our products and services, and keep records required by law.",
            "We only use your information for the purposes explained here. We do not sell it. We share it only with service providers who help us run our business, under agreements that keep it confidential, or where the law requires us to.",
            "We keep your information only for as long as we need it for these purposes or as required by law, then delete or anonymise it."
          ),
          choice("multi_choice", "You agree that we may use your information to:", [
            "Respond to my enquiry and keep in touch about it",
            "Provide the products or services I request",
            "Keep records of our dealings with me",
          ]),
        ]),
        section("Your rights", [
          info(
            "Under the Data Protection Act, 2019 you have the right to be told how your data is used, to see the data we hold about you, to ask us to correct or delete it, to object to its use, and to withdraw this consent at any time.",
            "To use any of these rights, contact us. You may also complain to the Office of the Data Protection Commissioner."
          ),
          consent("I have read and understood how my personal data will be used and I consent to it."),
          consent("I understand I can withdraw this consent at any time by contacting the business."),
          signedOn(),
        ]),
      ],
      signers: SIGNATORY,
      declaration: "I confirm the information I have given is true and I consent to the use of my personal data as described.",
    }),
  },
  {
    id: "marketing_opt_in",
    name: "Marketing & Communications Opt-in",
    category: "marketing_consent",
    useFor: "Permission to send SMS, WhatsApp, email and call offers",
    description: "Lets the person choose which channels and topics you may contact them about, with a clear way to opt out.",
    build: () => ({
      name: "Marketing & Communications Opt-in",
      category: "marketing_consent",
      description: "Choose how and about what we may contact you. You can change your mind at any time.",
      sections: [
        yourDetails(),
        section("How may we contact you?", [
          choice("multi_choice", "I am happy to receive messages by:", ["SMS", "WhatsApp", "Email", "Phone call"]),
          choice("multi_choice", "About:", ["Offers and discounts", "New products and services", "Events and invitations", "News and updates"], {
            required: false,
          }),
          info("You can stop messages at any time by replying STOP, using the unsubscribe link in our emails, or asking us directly."),
          consent("I agree to receive marketing messages through the channels I have ticked."),
          signedOn(),
        ]),
      ],
      signers: SIGNATORY,
      declaration: "I give my consent to receive marketing communications as selected above.",
    }),
  },
  {
    id: "media_release",
    name: "Photo, Video & Media Release",
    category: "media_release",
    useFor: "Using someone's photos, video or testimonial in your marketing",
    description: "Records permission to photograph or film the person and where the images may be used.",
    build: () => ({
      name: "Photo, Video & Media Release",
      category: "media_release",
      description: "Permission to take and use photographs, video and quotes.",
      sections: [
        yourDetails(),
        section("Your permission", [
          info(
            "We would like to take photographs and/or video of you, and may quote what you say, to use in our marketing and communications.",
            "You will not be paid for this use. You can ask us to stop using new material at any time, although material already printed or published may not be withdrawn."
          ),
          choice("multi_choice", "You may use my image, voice or words on:", [
            "Website",
            "Social media",
            "Printed materials (brochures, posters)",
            "Adverts",
            "Internal training only",
          ]),
          yesNo("May we show your name alongside your image or quote?"),
          consent("I give permission for my image, voice and words to be used as ticked above."),
          signedOn(),
        ]),
      ],
      signers: SIGNATORY,
      declaration: "I confirm I am 18 or older (or the parent / guardian of the person shown) and grant this permission.",
    }),
  },
  {
    id: "general_consent",
    name: "General Consent Form",
    category: "consent",
    useFor: "A simple consent for any activity, visit or service",
    description: "A short, editable consent: describe what the person is agreeing to and they tick and sign.",
    build: () => ({
      name: "General Consent Form",
      category: "consent",
      description: "Consent to take part in the activity or receive the service described below.",
      sections: [
        yourDetails(),
        section("What you are agreeing to", [
          info("Describe the activity, service or purpose here, including anything the person should know before agreeing (risks, costs, duration)."),
          yesNo("Have you had the chance to ask questions and are you satisfied with the answers?"),
          consent("I understand the information above and I give my consent."),
          signedOn(),
        ]),
      ],
      signers: SIGNATORY,
      declaration: "I confirm I have read and understood this form and give my consent freely.",
    }),
  },
  {
    id: "parental_consent",
    name: "Parent / Guardian Consent for a Minor",
    category: "consent",
    useFor: "Children under 18 taking part in activities, events or services",
    description: "A parent or guardian gives consent on behalf of a child, with emergency contact and medical details.",
    build: () => ({
      name: "Parent / Guardian Consent for a Minor",
      category: "consent",
      description: "Consent from a parent or legal guardian for a child under 18.",
      sections: [
        yourDetails({ id: true, title: "Parent / guardian details" }),
        section("Child's details", [
          text("Child's full name", "none", { required: true }),
          field("date", "Child's date of birth", { required: true, width: "half" }),
          text("Relationship to child", "none", { required: true, width: "half" }),
        ]),
        section("Health & emergency", [
          yesNo("Does the child have any allergies, medical conditions or needs we should know about?", {
            detail_label: "Please give details",
            alert_on_yes: true,
          }),
          text("Emergency contact name", "none", { required: true, width: "half" }),
          field("phone", "Emergency contact phone", { required: true, width: "half" }),
        ]),
        section("Consent", [
          info("Describe the activity or service the child will take part in, when and where."),
          consent("I am the parent or legal guardian of this child and I consent to their taking part."),
          consent("In an emergency, I consent to the child receiving first aid or medical treatment if I cannot be reached."),
          signedOn(),
        ]),
      ],
      signers: [{ role: "client", label: "Parent / guardian", required: true }],
      declaration: "I confirm I have legal authority to give consent for this child and the information given is true.",
    }),
  },
  {
    id: "liability_waiver",
    name: "Liability Waiver & Release",
    category: "waiver",
    useFor: "Events, trials, test drives, site visits and physical activities",
    description: "The participant acknowledges the risks of an activity, confirms they are fit to take part and releases you from claims.",
    build: () => ({
      name: "Liability Waiver & Release",
      category: "waiver",
      description: "Acknowledgement of risk and release of liability for taking part in an activity.",
      sections: [
        yourDetails({ id: true }),
        section("The activity and its risks", [
          info(
            "Describe the activity, where and when it takes place.",
            "Taking part involves risks, including (list the main risks). You will follow all instructions and safety rules given by our staff."
          ),
          yesNo("Do you have any medical condition, injury or allergy that could affect your safe participation?", {
            detail_label: "Please give details",
            alert_on_yes: true,
          }),
          text("Emergency contact (name & phone)", "none", { required: true }),
        ]),
        section("Release", [
          info(
            "To the extent allowed by law, I release the business, its staff and agents from claims for loss, injury or damage arising from my taking part, except where caused by their negligence.",
            "I am responsible for my own belongings."
          ),
          consent("I understand the risks, I am taking part voluntarily, and I agree to this release."),
          signedOn(),
        ]),
      ],
      signers: SIGNATORY,
      declaration: "I confirm I am 18 or older, I have read this waiver and I sign it freely.",
    }),
  },
  {
    id: "nda",
    name: "Non-Disclosure Agreement",
    category: "nda",
    useFor: "Sharing confidential information with prospects, suppliers or partners",
    description: "A one-way confidentiality agreement: the signatory keeps your information secret and uses it only for the stated purpose.",
    build: () => ({
      name: "Non-Disclosure Agreement",
      category: "nda",
      description: "Agreement to keep the business's confidential information secret.",
      sections: [
        yourDetails({ id: true, title: "Recipient details" }),
        section("Organisation (if signing for one)", [
          text("Organisation name", "none", { width: "half" }),
          text("Your role / title", "none", { width: "half" }),
        ]),
        section("Terms", [
          text("Purpose for which information is shared", "none", { required: true }),
          info(
            "Confidential information means any business, technical, financial or customer information shared with you, in any form, that is not already public.",
            "You will keep it confidential, use it only for the purpose above, share it only with people who need it for that purpose and are bound by the same duty, and return or destroy it when asked.",
            "These obligations do not cover information that is or becomes public through no fault of yours, that you already had, or that the law requires you to disclose.",
            "These obligations last for two (2) years from the date of signing. This agreement is governed by the laws of Kenya."
          ),
          consent("I agree to the terms of this Non-Disclosure Agreement."),
          signedOn(),
        ]),
      ],
      signers: WITH_STAFF,
      declaration: "I confirm I have authority to sign this agreement and I agree to be bound by it.",
    }),
  },
  {
    id: "service_agreement",
    name: "Service / Quotation Acceptance",
    category: "agreement",
    useFor: "A prospect accepting a quote or the terms of a service before you start",
    description: "The person confirms the scope, price and payment terms you agreed, so work can begin.",
    build: () => ({
      name: "Service / Quotation Acceptance",
      category: "agreement",
      description: "Acceptance of the quotation and terms below.",
      sections: [
        yourDetails({ address: true }),
        section("What is agreed", [
          text("Quotation / reference number", "none", { width: "half" }),
          field("number", "Agreed amount (KES)", { required: true, width: "half" }),
          field("long_text", "Scope of work / items", { required: true }),
          choice("single_choice", "Payment terms", ["Full payment upfront", "Deposit, balance on completion", "On invoice (30 days)", "Other"], {
            allow_other: true,
          }),
          field("date", "Expected start date", { width: "half" }),
        ]),
        section("Acceptance", [
          info("Prices are as quoted and valid for the period stated on the quotation. Changes to the scope may change the price and will be agreed in writing first."),
          consent("I accept the quotation and terms above."),
          signedOn(),
        ]),
      ],
      signers: WITH_STAFF,
      declaration: "I confirm I am authorised to accept this quotation.",
    }),
  },
  {
    id: "visitor_registration",
    name: "Visitor & Site Safety Registration",
    category: "registration",
    useFor: "Visitors, contractors and delivery staff signing in to your premises",
    description: "Visitor details, who they're visiting, and acknowledgement of site safety and confidentiality rules.",
    build: () => ({
      name: "Visitor & Site Safety Registration",
      category: "registration",
      description: "Please register before entering the premises.",
      sections: [
        yourDetails({ id: true }),
        section("Your visit", [
          text("Company / organisation", "none", { width: "half" }),
          text("Person you are visiting", "none", { required: true, width: "half" }),
          choice("single_choice", "Reason for visit", ["Meeting", "Delivery", "Contractor / maintenance", "Interview", "Other"], {
            allow_other: true,
          }),
          text("Vehicle registration (if any)", "none", { width: "half" }),
        ]),
        section("Safety & conduct", [
          info(
            "Stay with your host at all times, wear any protective equipment provided, and follow emergency instructions and signs.",
            "Do not photograph or record on the premises without permission, and keep anything you see or hear confidential."
          ),
          consent("I have read and will follow the site safety and conduct rules."),
          signedOn(),
        ]),
      ],
      signers: SIGNATORY,
      declaration: "I confirm the details I have given are correct.",
    }),
  },
  {
    id: "event_registration",
    name: "Event Registration",
    category: "registration",
    useFor: "Sign-ups for launches, workshops, open days and webinars",
    description: "Attendee details, sessions, dietary needs and optional photo / marketing consent.",
    build: () => ({
      name: "Event Registration",
      category: "registration",
      description: "Register for the event.",
      sections: [
        yourDetails(),
        section("About you", [
          text("Organisation", "none", { width: "half" }),
          text("Job title", "none", { width: "half" }),
          choice("single_choice", "How did you hear about this event?", ["Social media", "Email", "Friend or colleague", "Our staff", "Other"], {
            allow_other: true,
            required: false,
          }),
        ]),
        section("Attendance", [
          choice("multi_choice", "Sessions you will attend", ["Morning session", "Afternoon session", "Networking"], { required: false }),
          text("Dietary or accessibility needs", "none"),
          consent("You may photograph me at the event for use in your communications.", false),
          consent("Keep me informed about future events and offers.", false),
          signedOn(),
        ]),
      ],
      signers: SIGNATORY,
      declaration: "I confirm my registration details are correct.",
    }),
  },
  {
    id: "feedback_survey",
    name: "Feedback & Satisfaction Survey",
    category: "feedback",
    useFor: "Collecting feedback after a visit, demo, quote or event",
    description: "Ratings, what went well, what to improve, likelihood to recommend, and permission to follow up.",
    build: () => ({
      name: "Feedback & Satisfaction Survey",
      category: "feedback",
      description: "Tell us how we did — it takes about two minutes.",
      sections: [
        section("Your experience", [
          field("rating", "Overall, how satisfied are you?", { required: true }),
          field("rating", "How likely are you to recommend us to a friend or colleague?", {
            required: true,
            scale_min: 0,
            scale_max: 10,
            scale_min_label: "Not likely",
            scale_max_label: "Very likely",
          }),
          field("long_text", "What did we do well?"),
          field("long_text", "What could we improve?"),
        ]),
        section("Stay in touch (optional)", [
          text("Name", "customer_name"),
          field("phone", "Phone", { prefill_from: "phone", width: "half" }),
          field("email", "Email", { prefill_from: "email", width: "half" }),
          consent("You may contact me about my feedback.", false),
        ]),
      ],
      signers: SIGNATORY,
      declaration: "",
    }),
  },
  {
    id: "referral_agreement",
    name: "Referral Partner Agreement",
    category: "agreement",
    useFor: "Agents and partners who refer customers to you for a commission",
    description: "Referral terms, commission, payment details and conduct rules for an introducer or agent.",
    build: () => ({
      name: "Referral Partner Agreement",
      category: "agreement",
      description: "Terms for introducing customers to the business.",
      sections: [
        yourDetails({ id: true, address: true, title: "Partner details" }),
        section("Commission & payment", [
          text("Commission agreed (e.g. 5% of first invoice)", "none", { required: true }),
          choice("single_choice", "Pay commission by", ["M-Pesa", "Bank transfer"]),
          text("M-Pesa number or bank account details", "none", { required: true }),
          text("KRA PIN", "none", { width: "half" }),
        ]),
        section("Terms", [
          info(
            "Commission is earned only on referrals the business accepts and that pay in full, and is paid within 30 days of the customer's payment.",
            "You act independently, not as an employee, and may not make promises or agreements on the business's behalf.",
            "You will keep customer and business information confidential and follow the Data Protection Act, 2019 when sharing anyone's details with us.",
            "Either party may end this agreement by written notice. Commission already earned remains payable."
          ),
          consent("I agree to these referral terms."),
          signedOn(),
        ]),
      ],
      signers: WITH_STAFF,
      declaration: "I confirm the details I have given are correct and I agree to this agreement.",
    }),
  },
];

export const STARTER_TEMPLATES: Record<Audience, StarterTemplate[]> = {
  client: [],
  employee: [],
  contact: CONTACT_TEMPLATES,
};
