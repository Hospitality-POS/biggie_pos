import { useState } from "react";
import {
  Input,
  Card,
  Typography,
  Layout,
  List,
  Tag,
  Button,
  Drawer,
  Empty,
  Space,
  Rate,
} from "antd";
import {
  QuestionCircleOutlined,
  CreditCardOutlined,
  RocketOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  LikeOutlined,
  BookOutlined,
  ShoppingCartOutlined,
  DollarCircleOutlined,
  UserOutlined,
  HomeOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const { Title, Paragraph, Text } = Typography;
const { Content } = Layout;

interface Article {
  id: number;
  title: string;
  description: string;
  type: "article" | "video";
  readTime: string;
  views: number;
  helpful: number;
  content: string;
}

interface Category {
  key: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const categories: Category[] = [
  {
    key: "duka",
    icon: <ShoppingCartOutlined />,
    title: "Duka (POS)",
    description: "Point of Sale & Store Management",
    color: "#3b82f6",
  },
  {
    key: "pesa",
    icon: <DollarCircleOutlined />,
    title: "Pesa (Accounting)",
    description: "Financial Management & Accounting",
    color: "#10b981",
  },
  {
    key: "mteja",
    icon: <UserOutlined />,
    title: "Mteja (CRM)",
    description: "Customer Relationship Management",
    color: "#8b5cf6",
  },
  {
    key: "dala",
    icon: <HomeOutlined />,
    title: "Dala (Property)",
    description: "Property & Real Estate Management",
    color: "#f59e0b",
  },
  {
    key: "bandu",
    icon: <RocketOutlined />,
    title: "Bandu (HR)",
    description: "Human Resources & Payroll",
    color: "#ec4899",
  },
  {
    key: "etims",
    icon: <SafetyOutlined />,
    title: "Etims (Tax)",
    description: "KRA Tax Compliance & Integration",
    color: "#ef4444",
  },
  {
    key: "admin",
    icon: <QuestionCircleOutlined />,
    title: "Admin Dashboard",
    description: "System Administration & Management",
    color: "#6366f1",
  },
  {
    key: "reports",
    icon: <FileTextOutlined />,
    title: "Reports & Analytics",
    description: "Business Intelligence & Insights",
    color: "#14b8a6",
  },
  {
    key: "onboarding",
    icon: <RocketOutlined />,
    title: "Getting Started",
    description: "Basic setup and first steps",
    color: "#6366f1",
  },
  {
    key: "billing",
    icon: <CreditCardOutlined />,
    title: "Account & Billing",
    description: "Manage your subscription",
    color: "#ec4899",
  },
  {
    key: "faq",
    icon: <QuestionCircleOutlined />,
    title: "FAQ",
    description: "Common questions",
    color: "#64748b",
  },
];

const articles = {
  duka: [
    {
      id: 1,
      title: "Duka Quick Start Guide",
      description: "Get started with Duka POS in 10 minutes",
      type: "article",
      readTime: "10 min",
      views: 2500,
      helpful: 190,
      content: `
# Duka Quick Start Guide

## Overview
Duka by Base is a comprehensive Point of Sale (POS) system for managing sales, inventory, customers, and daily operations.

## Setup Flow

\`\`\`
┌─────────────────┐
│   Login to      │
│   Base Point    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Admin         │
│   Dashboard     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Create Shop   │
│   (Shops Tab)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Add Products  │
│   (Products)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Configure     │
│   Categories    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Setup         │
│   Payments      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Start         │
│   Selling!      │
└─────────────────┘
\`\`\`

## First Steps

### 1. Set Up Your Shop
- Navigate to **Admin Dashboard > Shops**
- Click **Create Shop** to add your first location
- Configure shop details: name, address, phone, and POS mode (Restaurant or Retail)
- Set up tables if using Restaurant mode

### 2. Add Products
- Go to **Products** in the sidebar
- Click **Add Product** to create inventory items
- Set product name, price, category, and tax settings
- Upload product images for better recognition
- Set stock levels for inventory tracking

### 3. Configure Categories
- Create product categories to organize your menu/catalog
- Examples: Food, Beverages, Electronics, Clothing
- Set up sub-categories for better organization

### 4. Add Payment Methods
- Configure cash, card, M-Pesa, and other payment options
- Set up Pesapal integration for online payments
- Configure receipt printing settings

## Making a Sale - Retail Mode

\`\`\`
┌──────────────┐
│ Select/      │
│ Search       │
│ Products     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Add to Cart │
│ (Qty, Price)│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Apply        │
│ Discounts?   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Select       │
│ Payment      │
│ Method       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Complete     │
│ Sale         │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Print        │
│ Receipt      │
└──────────────┘
\`\`\`

### Retail Mode Steps
1. Select or search for products
2. Add to cart
3. Apply discounts if needed
4. Select payment method
5. Complete sale and print receipt

## Making a Sale - Restaurant Mode

\`\`\`
┌──────────────┐
│ Select Table │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Add Items    │
│ to Order     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Send to      │
│ Kitchen      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Track Order  │
│ Status       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Generate     │
│ Bill         │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Process      │
│ Payment      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Clear Table  │
└──────────────┘
\`\`\`

### Restaurant Mode Steps
1. Select table
2. Add items to order
3. Send to kitchen
4. Track order status
5. Generate bill
6. Process payment

## Daily Operations

### Shift Management
- Start and end shifts for staff
- Track sales by shift
- Handle shift handovers

### Inventory Management
- Monitor stock levels
- Receive new stock
- Track inventory movements
- Generate inventory reports

### Customer Management
- Add customer details
- Track customer purchases
- Manage customer accounts
- Apply customer discounts

## Reports
- View daily sales reports
- Analyze best-selling items
- Track revenue trends
- Export sales data
      `,
    },
    {
      id: 2,
      title: "Managing Tables & Dining Areas",
      description: "Configure tables for restaurant operations",
      type: "article",
      readTime: "5 min",
      views: 1200,
      helpful: 85,
      content: `
# Managing Tables & Dining Areas

## Table Setup
1. Go to **Tables** in the admin panel
2. Create table locations (e.g., Main Hall, Outdoor, VIP)
3. Add tables to each location
4. Set table capacity and numbering

## Table Operations
- Assign orders to tables
- Transfer orders between tables
- Merge tables for large groups
- Clear tables after payment

## Auto Slots (Retail Mode)
- Create auto slots for quick checkout
- Useful for takeaway orders
- Reduces wait time
      `,
    },
    {
      id: 3,
      title: "Inventory & Stock Management",
      description: "Track and manage your inventory",
      type: "article",
      readTime: "8 min",
      views: 1800,
      helpful: 120,
      content: `
# Inventory & Stock Management

## Adding Inventory
- Manually add stock items
- Import from Excel templates
- Set minimum stock levels for alerts

## Stock Movements
- Track stock in (purchases)
- Track stock out (sales, wastage)
- Transfer stock between locations
- Adjust stock for discrepancies

## Low Stock Alerts
- Receive notifications when stock is low
- Set reorder points
- Generate purchase orders

## Inventory Reports
- View stock valuation
- Track fast-moving items
- Identify slow-moving stock
- Generate inventory usage reports
      `,
    },
    {
      id: 28,
      title: "Delivery Management",
      description: "Handle delivery orders and logistics",
      type: "article",
      readTime: "7 min",
      views: 1100,
      helpful: 90,
      content: `
# Delivery Management

## Delivery Order Flow

\`\`\`
┌──────────────┐
│ Customer     │
│ Places Order │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Mark as      │
│ Delivery     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Assign to    │
│ Driver       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Driver       │
│ Picks Up     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ In Transit   │
│ (Tracking)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Delivered    │
│ (Confirm)    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Payment      │
│ Collected    │
└──────────────┘
\`\`\`

## Setting Up Delivery
1. Go to **Settings > Delivery**
2. Configure delivery zones
3. Set delivery fees by zone
4. Define delivery time slots
5. Assign delivery staff

## Processing Delivery Orders
- Mark orders as delivery
- Assign to delivery driver
- Track delivery status
- Update customer on progress

## Delivery Zones
- Define geographic zones
- Set zone-specific fees
- Configure delivery times
- Manage zone availability

## Delivery Staff
- Add delivery personnel
- Assign routes
- Track performance
- Calculate commissions

## Customer Communication
- SMS notifications
- Order tracking
- Delivery confirmations
- Feedback collection
      `,
    },
    {
      id: 29,
      title: "Product Modifiers & Add-ons",
      description: "Configure product variations and extras",
      type: "article",
      readTime: "6 min",
      views: 950,
      helpful: 75,
      content: `
# Product Modifiers & Add-ons

## What are Modifiers?
Modifiers allow customers to customize their orders with extras, special requests, or variations.

## Creating Modifiers
1. Go to **Products > Modifiers**
2. Click **Add Modifier Group**
3. Name the group (e.g., "Extra Toppings")
4. Add modifier options
5. Set prices for each option

## Modifier Types
- **Required**: Customer must select an option
- **Optional**: Customer can choose to add
- **Multi-select**: Customer can select multiple options
- **Single-select**: Customer can only choose one

## Common Use Cases
- Pizza toppings
- Burger extras
- Drink sizes
- Side dishes
- Cooking preferences

## Pricing
- Set base price for modifier group
- Add individual prices for options
- Configure free modifiers
- Set quantity limits
      `,
    },
    {
      id: 30,
      title: "Supplier Management",
      description: "Manage vendors and purchase orders",
      type: "article",
      readTime: "8 min",
      views: 1050,
      helpful: 88,
      content: `
# Supplier Management

## Purchase Order Flow

\`\`\`
┌──────────────┐
│ Create PO    │
│ (Select      │
│  Supplier)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Add Items    │
│ (Qty, Price) │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Review &     │
│ Approve      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Send to      │
│ Supplier    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Supplier     │
│ Ships Items  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Receive      │
│ Goods        │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Update       │
│ Inventory    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Pay Supplier│
└──────────────┘
\`\`\`

## Adding Suppliers
1. Go to **Inventory > Suppliers**
2. Click **Add Supplier**
3. Enter supplier details
4. Add contact information
5. Set payment terms

## Supplier Information
- Company name and address
- Contact person
- Phone and email
- Payment terms
- Tax information

## Purchase Orders
- Create purchase orders
- Send to suppliers
- Track order status
- Receive goods
- Update inventory

## Supplier Performance
- Track delivery times
- Monitor quality
- Compare pricing
- Rate suppliers
- Analyze reliability

## Supplier Reports
- Purchase history
- Cost analysis
- Delivery performance
- Payment tracking
      `,
    },
    {
      id: 31,
      title: "Shift Management",
      description: "Manage staff shifts and handovers",
      type: "article",
      readTime: "6 min",
      views: 1300,
      helpful: 105,
      content: `
# Shift Management

## Shift Workflow

\`\`\`
┌──────────────┐
│ Start Shift  │
│ (Opening     │
│  Cash Count) │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Process      │
│ Sales        │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Record Cash │
│ Drops        │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Track Sales  │
│ Throughout   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ End Shift    │
│ (Closing     │
│  Cash Count) │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Reconcile    │
│ Cash         │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Handover     │
│ (Next Shift) │
└──────────────┘
\`\`\`

## Creating Shifts
1. Go to **Staff > Shifts**
2. Click **Add Shift**
3. Set shift name and time
4. Assign staff members
5. Configure responsibilities

## Shift Operations
- Start shift with opening cash
- Track sales during shift
- Record cash drops
- End shift with closing count
- Handle discrepancies

## Shift Handover
- Document pending orders
- Transfer cash
- Note issues
- Update inventory
- Sign off

## Shift Reports
- Sales by shift
- Cash reconciliation
- Staff performance
- Customer traffic
- Incident reports

## Best Practices
- Regular cash counts
- Clear documentation
- Proper handovers
- Timely reporting
      `,
    },
  ],
  pesa: [
    {
      id: 4,
      title: "Pesa Accounting Overview",
      description: "Understanding Pesa accounting system",
      type: "article",
      readTime: "12 min",
      views: 3000,
      helpful: 220,
      content: `
# Pesa Accounting Overview

## What is Pesa?
Pesa by Base is a comprehensive accounting module that integrates seamlessly with Duka POS, Mteja CRM, and other Base Suite products.

## Accounting Flow

\`\`\`
┌──────────────┐
│ Duka Sale    │
│ (POS)        │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Auto-Create  │
│ Journal Entry│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Post to      │
│ Accounts     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Update       │
│ Inventory    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Generate     │
│ Reports      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Reconcile    │
│ Bank         │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Tax Reports  │
│ (Etims)      │
└──────────────┘
\`\`\`

## Key Features

### 1. Chart of Accounts
- Pre-configured account structure
- Customizable to your business needs
- Supports multiple account types: Assets, Liabilities, Equity, Revenue, Expenses

### 2. Journal Entries
- Automatic journal entries from POS sales
- Manual journal entry creation
- Draft, post, and void entries
- Multi-currency support

### 3. Financial Reports
- Profit & Loss statements
- Balance sheets
- Trial balance
- Cash flow statements
- Custom report generation

### 4. Tax Management
- VAT tracking and reporting
- Tax compliance features
- Etims integration for KRA
- Automated tax calculations

### 5. Accounts Receivable & Payable
- Track customer invoices
- Manage supplier bills
- Aging reports
- Payment tracking

## Getting Started

### Setup
1. Configure your fiscal year
2. Set up Chart of Accounts
3. Configure tax rates
4. Connect bank accounts
5. Import opening balances

### Daily Operations
- Review journal entries
- Reconcile bank accounts
- Post adjustments
- Generate reports

## Integration with Duka
- Sales automatically create journal entries
- Inventory updates affect cost of goods sold
- Customer payments update accounts receivable
      `,
    },
    {
      id: 5,
      title: "Managing Journal Entries",
      description: "Create and manage journal entries",
      type: "article",
      readTime: "7 min",
      views: 1500,
      helpful: 95,
      content: `
# Managing Journal Entries

## Creating Manual Entries
1. Go to **Journal Entries** in Pesa
2. Click **New Entry**
3. Select date and reference number
4. Add debit and credit lines
5. Ensure entries balance
6. Save as draft or post

## Entry Types
- **Manual**: Created by users
- **POS Sale**: Auto-generated from Duka
- **Invoice**: From customer invoicing
- **Bill**: From supplier bills
- **Payment**: Payment transactions
- **Reconciliation**: Bank reconciliation

## Posting Entries
- Draft entries can be edited
- Posted entries are locked
- Void posted entries if needed
- Audit trail maintained

## Reviewing Entries
- View recent entries on dashboard
- Filter by date, source, or account
- Export to Excel or PDF
      `,
    },
    {
      id: 6,
      title: "Financial Reports Guide",
      description: "Generate and understand financial reports",
      type: "article",
      readTime: "10 min",
      views: 2000,
      helpful: 150,
      content: `
# Financial Reports Guide

## Available Reports

### Profit & Loss Statement
- Shows revenue and expenses
- Calculates net profit/loss
- Compare periods
- View by month, quarter, or year

### Balance Sheet
- Assets, liabilities, and equity
- Financial position snapshot
- Track business health

### Trial Balance
- List of all account balances
- Verify accounting accuracy
- Debits must equal credits

### Cash Flow Statement
- Cash inflows and outflows
- Operating, investing, financing activities
- Cash position tracking

### VAT Reports
- VAT collected on sales
- VAT paid on purchases
- Net VAT payable/refundable
- KRA submission ready

## Generating Reports
1. Go to **Reports** in Pesa
2. Select report type
3. Choose date range
4. Apply filters if needed
5. Generate and export

## Custom Reports
- Create custom report templates
- Save frequently used reports
- Schedule automatic generation
      `,
    },
    {
      id: 32,
      title: "Accounts Receivable Management",
      description: "Track and manage customer invoices",
      type: "article",
      readTime: "9 min",
      views: 1700,
      helpful: 135,
      content: `
# Accounts Receivable Management

## Invoice Workflow

\`\`\`
┌──────────────┐
│ Create       │
│ Invoice      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Send to      │
│ Customer     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Track Due    │
│ Date         │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Send         │
│ Reminders    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Receive      │
│ Payment      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Apply to     │
│ Invoice      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Update       │
│ Customer     │
│ Balance      │
└──────────────┘
\`\`\`

## Creating Invoices
1. Go to **Accounts Receivable > Invoices**
2. Click **Create Invoice**
3. Select customer
4. Add line items
5. Set payment terms
6. Send invoice

## Invoice Tracking
- Track invoice status
- Monitor due dates
- Send payment reminders
- Record payments

## Aging Reports
- View outstanding invoices
- Categorize by age (30, 60, 90+ days)
- Identify overdue accounts
- Prioritize collection efforts

## Customer Statements
- Generate customer statements
- Show transaction history
- Include outstanding balance
- Send to customers

## Payment Processing
- Record customer payments
- Apply to specific invoices
- Handle partial payments
- Issue credit notes

## Best Practices
- Regular invoice reviews
- Timely payment reminders
- Clear payment terms
- Accurate record keeping
      `,
    },
    {
      id: 33,
      title: "Accounts Payable Management",
      description: "Manage supplier bills and payments",
      type: "article",
      readTime: "8 min",
      views: 1450,
      helpful: 115,
      content: `
# Accounts Payable Management

## Recording Bills
1. Go to **Accounts Payable > Bills**
2. Click **Add Bill**
3. Select supplier
4. Add bill details
5. Upload supporting documents
6. Save for approval

## Bill Approval Workflow
- Submit for approval
- Review and approve
- Reject if needed
- Track approval status

## Payment Processing
- Schedule payments
- Select bills to pay
- Record payment details
- Update supplier accounts

## Vendor Management
- Maintain supplier details
- Track payment terms
- Monitor credit limits
- Evaluate supplier performance

## Aging Reports
- View outstanding bills
- Categorize by due date
- Identify overdue payments
- Plan cash flow

## Expense Tracking
- Categorize expenses
- Track by department
- Monitor budget compliance
- Generate expense reports
      `,
    },
    {
      id: 34,
      title: "Bank Reconciliation",
      description: "Reconcile bank accounts with records",
      type: "article",
      readTime: "10 min",
      views: 1600,
      helpful: 125,
      content: `
# Bank Reconciliation

## Why Reconcile?
- Ensure accuracy of records
- Detect errors or fraud
- Verify bank balances
- Maintain financial integrity

## Reconciliation Process
1. Go to **Banking > Reconciliation**
2. Select bank account
3. Choose statement period
4. Import bank statement
5. Match transactions
6. Resolve discrepancies

## Matching Transactions
- Auto-match by amount and date
- Manual matching for complex cases
- Add missing transactions
- Remove duplicates

## Handling Discrepancies
- Identify missing items
- Record bank fees
- Adjust for errors
- Document reasons

## Reconciliation Reports
- Generate reconciliation reports
- Track unresolved items
- Monitor reconciliation status
- Export for audit

## Best Practices
- Reconcile monthly
- Keep detailed records
- Investigate discrepancies promptly
- Maintain supporting documents
      `,
    },
  ],
  mteja: [
    {
      id: 7,
      title: "Mteja CRM Introduction",
      description: "Customer relationship management basics",
      type: "article",
      readTime: "8 min",
      views: 2200,
      helpful: 175,
      content: `
# Mteja CRM Introduction

## What is Mteja?
Mteja by Base is a customer relationship management (CRM) system that helps you manage leads, customers, and marketing campaigns.

## Key Features

### 1. Lead Management
- Capture leads from multiple sources
- Visual pipeline tracking
- Lead scoring and qualification
- Convert leads to customers

### 2. Customer Database
- Centralized customer profiles
- Purchase history tracking
- Communication logs
- Customer segmentation

### 3. Marketing Campaigns
- Email campaigns
- SMS campaigns
- WhatsApp integration
- Campaign analytics

### 4. Sales Tracking
- Sales targets and budgets
- Performance tracking
- Team sales reports
- Commission calculations

### 5. Loyalty Programs
- Customer rewards
- Points system
- Tiered membership
- Special offers

## Getting Started

### Setup
1. Configure lead stages
2. Set up customer fields
3. Create email/SMS templates
4. Configure communication channels
5. Set sales targets

### Daily Use
- Add new leads
- Update lead status
- Send communications
- Track conversions
- Monitor campaigns
      `,
    },
    {
      id: 8,
      title: "Lead Pipeline Management",
      description: "Track and convert leads effectively",
      type: "article",
      readTime: "6 min",
      views: 1400,
      helpful: 110,
      content: `
# Lead Pipeline Management

## Lead Conversion Flow

\`\`\`
┌──────────────┐
│ Capture Lead │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Qualify      │
│ Lead         │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Contact      │
│ Lead         │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Present      │
│ Proposal     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Negotiate    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Close Deal   │
│ (Won/Lost)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Convert to   │
│ Customer     │
└──────────────┘
\`\`\`

## Pipeline Stages
Common stages include:
- New
- Contacted
- Qualified
- Proposal
- Negotiation
- Won/Lost

## Managing Leads
- Add leads manually or import
- Assign to sales team
- Schedule follow-ups
- Track activities
- Move through pipeline

## Lead Scoring
- Assign scores based on actions
- Prioritize high-value leads
- Automate follow-ups
- Improve conversion rates

## Conversion
- Convert leads to customers
- Create opportunities
- Track conversion rates
- Analyze pipeline health
      `,
    },
    {
      id: 35,
      title: "Marketing Campaigns",
      description: "Create and manage marketing campaigns",
      type: "article",
      readTime: "9 min",
      views: 1250,
      helpful: 100,
      content: `
# Marketing Campaigns

## Campaign Types
- Email campaigns
- SMS campaigns
- WhatsApp broadcasts
- Multi-channel campaigns

## Creating Campaigns
1. Go to **Marketing > Campaigns**
2. Click **Create Campaign**
3. Select campaign type
4. Define target audience
5. Create content
6. Schedule send

## Targeting
- Segment by customer attributes
- Filter by purchase history
- Target by location
- Custom audience lists

## Content Creation
- Use templates
- Customize messages
- Add personalization
- Include calls-to-action

## Scheduling
- Set send date and time
- Optimize for engagement
- A/B testing
- Automated triggers

## Analytics
- Open rates
- Click rates
- Conversion tracking
- ROI measurement
      `,
    },
    {
      id: 36,
      title: "Loyalty Programs",
      description: "Set up and manage customer loyalty",
      type: "article",
      readTime: "7 min",
      views: 1100,
      helpful: 92,
      content: `
# Loyalty Programs

## Program Setup
1. Go to **Customers > Loyalty**
2. Click **Create Program**
3. Set earning rules
4. Configure redemption
5. Define tiers
6. Launch program

## Points System
- Points per purchase
- Bonus points actions
- Point expiration
- Point multipliers

## Tiers and Rewards
- Bronze, Silver, Gold tiers
- Tier benefits
- Upgrade criteria
- Exclusive offers

## Customer Engagement
- Points balance tracking
- Reward notifications
- Birthday bonuses
- Referral rewards

## Program Analytics
- Enrollment rates
- Redemption rates
- Customer retention
- Program ROI
      `,
    },
  ],
  dala: [
    {
      id: 9,
      title: "Dala Property Management",
      description: "Real estate and property management",
      type: "article",
      readTime: "10 min",
      views: 1800,
      helpful: 140,
      content: `
# Dala Property Management

## What is Dala?
Dala by Base is a property and real estate management system for managing properties, tenants, leases, and maintenance.

## Key Features

### 1. Property Management
- Property portfolio tracking
- Unit management
- Property details and amenities
- Location mapping

### 2. Tenant Management
- Tenant database
- Lease agreements
- Rent tracking
- Payment history

### 3. Lease Management
- Lease creation and renewal
- Rent schedules
- Deposit tracking
- Lease termination

### 4. Maintenance
- Work order management
- Vendor management
- Maintenance tracking
- Cost tracking

### 5. Financials
- Rent collection
- Expense tracking
- Property P&L
- Tax reporting

## Getting Started

### Setup
1. Add properties
2. Configure units
3. Set up lease templates
4. Add vendors
5. Configure rent schedules

### Daily Operations
- Process rent payments
- Handle maintenance requests
- Update tenant information
- Generate reports
      `,
    },
    {
      id: 10,
      title: "Lease & Rent Management",
      description: "Manage leases and rent collection",
      type: "article",
      readTime: "7 min",
      views: 1300,
      helpful: 105,
      content: `
# Lease & Rent Management

## Lease Lifecycle

\`\`\`
┌──────────────┐
│ Create Lease │
│ (Property,   │
│  Unit, Tenant)│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Collect      │
│ Security     │
│ Deposit      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Generate     │
│ Agreement    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Schedule     │
│ Rent Payments│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Collect Rent │
│ (Monthly)    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Track        │
│ Payments     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Renewal/     │
│ Termination  │
└──────────────┘
\`\`\`

## Creating Leases
1. Select property and unit
2. Add tenant details
3. Set lease terms
4. Configure rent schedule
5. Collect security deposit
6. Generate lease agreement

## Rent Collection
- Automatic rent reminders
- Online payment processing
- Receipt generation
- Late fee calculation
- Payment tracking

## Lease Renewals
- Renewal reminders
- Rent increase options
- Term modification
- Agreement updates

## Lease Termination
- Notice period tracking
- Deposit refund calculation
- Final settlement
- Unit availability update
      `,
    },
    {
      id: 37,
      title: "Maintenance Management",
      description: "Handle property maintenance requests",
      type: "article",
      readTime: "8 min",
      views: 1150,
      helpful: 95,
      content: `
# Maintenance Management

## Work Orders
1. Go to **Maintenance > Work Orders**
2. Click **Create Work Order**
3. Select property and unit
4. Describe the issue
5. Set priority level
6. Assign to vendor

## Request Types
- Repairs
- Inspections
- Upgrades
- Emergency maintenance
- Preventive maintenance

## Vendor Management
- Add maintenance vendors
- Track vendor performance
- Compare pricing
- Manage contracts

## Scheduling
- Schedule appointments
- Track completion
- Update tenants
- Document work

## Cost Tracking
- Labor costs
- Material costs
- Vendor invoices
- Budget tracking

## Reporting
- Maintenance history
- Cost analysis
- Vendor performance
- Property condition
      `,
    },
    {
      id: 38,
      title: "Property Analytics",
      description: "Analyze property performance",
      type: "article",
      readTime: "6 min",
      views: 950,
      helpful: 78,
      content: `
# Property Analytics

## Occupancy Rates
- Track occupancy by property
- Vacancy analysis
- Lease expiration tracking
- Renewal rates

## Revenue Metrics
- Rental income
- Additional revenue
- Revenue trends
- Comparison by property

## Expense Tracking
- Maintenance costs
- Operating expenses
- Capital improvements
- Cost per unit

## Property Performance
- Net operating income
- Cap rate calculation
- ROI analysis
- Property valuation

## Tenant Analytics
- Tenant retention
- Payment history
- Lease terms analysis
- Default rates

## Reports
- Property performance reports
- Portfolio overview
- Cash flow analysis
- Investment returns
      `,
    },
  ],
  etims: [
    {
      id: 11,
      title: "Etims Integration Guide",
      description: "KRA tax compliance and Etims setup",
      type: "article",
      readTime: "15 min",
      views: 3500,
      helpful: 280,
      content: `
# Etims Integration Guide

## What is Etims?
Etims (Electronic Tax Invoice Management System) is KRA's system for electronic tax invoicing and compliance in Kenya.

## Etims Integration Flow

\`\`\`
┌──────────────┐
│ Configure    │
│ Etims        │
│ (KRA PIN,    │
│  Credentials)│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Test         │
│ Connection   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Enable       │
│ Integration  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Sale Made    │
│ (Duka POS)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Auto-Generate│
│ Invoice      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Validate     │
│ with KRA     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Submit to    │
│ KRA          │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Track Status │
│ & Reports    │
└──────────────┘
\`\`\`

## Integration Benefits
- Automatic VAT invoice generation
- Direct KRA submission
- Compliance with tax regulations
- Real-time validation
- Digital receipt management

## Setup Requirements

### Prerequisites
- Valid KRA PIN
- Etims credentials from KRA
- Active internet connection
- Valid business license

### Configuration Steps
1. Go to **Settings > Etims**
2. Enter KRA PIN
3. Configure Etims credentials
4. Set up communication details
5. Test connection
6. Enable integration

## Using Etims

### Invoice Generation
- Invoices auto-generated on sales
- Validated against KRA system
- Unique serial numbers
- QR code inclusion

### Submission
- Automatic or manual submission
- Real-time status updates
- Error handling
- Retry mechanism

### Reporting
- VAT returns
- Sales reports
- Export to KRA format
- Audit trail

## Troubleshooting
- Connection issues
- Validation errors
- Submission failures
- Serial number conflicts

## Compliance Notes
- Ensure all sales are invoiced
- Keep records for 7 years
- Regular reconciliation
- Stay updated on KRA changes
      `,
    },
    {
      id: 12,
      title: "VAT Compliance & Reporting",
      description: "Manage VAT and tax reporting",
      type: "article",
      readTime: "9 min",
      views: 2800,
      helpful: 210,
      content: `
# VAT Compliance & Reporting

## VAT Overview
- Standard VAT rate: 16%
- Zero-rated items: 0%
- Exempt items: No VAT

## VAT Configuration
1. Set up tax rates in Pesa
2. Mark products as taxable/exempt
3. Configure VAT accounts
4. Set reporting periods

## VAT Tracking
- VAT collected on sales
- VAT paid on purchases
- Input VAT credit
- Net VAT calculation

## VAT Returns
- Monthly or quarterly filing
- Automatic calculation
- KRA submission ready
- Export to required format

## Best Practices
- Regular reconciliation
- Proper documentation
- Timely filing
- Audit preparation
      `,
    },
  ],
  bandu: [
    {
      id: 19,
      title: "Bandu HR Overview",
      description: "Human resources and payroll management",
      type: "article",
      readTime: "10 min",
      views: 1600,
      helpful: 130,
      content: `
# Bandu HR Overview

## What is Bandu?
Bandu by Base is a comprehensive Human Resources and Payroll management system integrated with the Base Suite.

## Key Features

### 1. Employee Management
- Employee profiles and records
- Department and role assignments
- Employment history tracking
- Document management

### 2. Payroll Processing
- Automated payroll calculations
- Salary structures and grades
- Deductions and allowances
- Payslip generation

### 3. Attendance & Time Tracking
- Clock in/out tracking
- Leave management
- Overtime calculation
- Attendance reports

### 4. Benefits & Compensation
- Health insurance
- Pension schemes
- Bonus calculations
- Tax compliance

## Getting Started

### Setup
1. Configure company details
2. Set up departments
3. Create salary structures
4. Add employee records
5. Configure payroll schedules

### Daily Operations
- Record attendance
- Process leave requests
- Manage payroll runs
- Generate reports

## Integration with Other Modules
- Syncs with Pesa for accounting
- Integrates with Duka for staff sales tracking
- Connects to Mteja for employee communication
      `,
    },
    {
      id: 20,
      title: "Managing Wages & Payroll",
      description: "Process payroll and manage employee wages",
      type: "article",
      readTime: "12 min",
      views: 1400,
      helpful: 115,
      content: `
# Managing Wages & Payroll

## Payroll Processing Flow

\`\`\`
┌──────────────┐
│ Record       │
│ Attendance   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Calculate    │
│ Hours Worked │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Calculate    │
│ Overtime     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Apply Wage   │
│ Structure    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Calculate    │
│ Deductions   │
│ (PAYE, NSSF, │
│  NHIF, etc.) │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Calculate    │
│ Net Pay      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Generate     │
│ Payslips     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Process      │
│ Payments     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Update       │
│ Accounting   │
└──────────────┘
\`\`\`

## Setting Up Wages

### 1. Create Wage Structure
- Go to **Admin > Wages**
- Click **Add Wage Structure**
- Define basic salary
- Add allowances and deductions
- Set tax configurations

### 2. Assign to Employees
- Select employees
- Assign wage structure
- Set effective dates
- Configure payment schedule

## Processing Payroll

### Monthly Payroll Run
1. Navigate to **Wages > Process Payroll**
2. Select pay period
3. Review attendance data
4. Calculate overtime
5. Preview payroll
6. Approve and process

### Payslip Generation
- Automatic payslip generation
- Email to employees
- PDF download
- Archive for records

## Managing Deductions

### Common Deductions
- PAYE (tax)
- NSSF (social security)
- NHIF (health insurance)
- Pension contributions
- Loan repayments

### Configuring Deductions
1. Go to **Wages > Deductions**
2. Add deduction type
3. Set calculation method
4. Assign to employees

## Reports
- Payroll summary
- Tax reports
- Deduction reports
- Cost analysis
      `,
    },
  ],
  admin: [
    {
      id: 21,
      title: "Admin Dashboard Overview",
      description: "Navigate and use the admin dashboard",
      type: "article",
      readTime: "8 min",
      views: 3200,
      helpful: 245,
      content: `
# Admin Dashboard Overview

## Dashboard Navigation Flow

\`\`\`
┌──────────────┐
│ Login to     │
│ Base Point   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Admin        │
│ Dashboard    │
└──────┬───────┘
       │
       ├─────────────┬─────────────┬─────────────┐
       ▼             ▼             ▼             ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Shops    │ │Customers │ │ Staff    │ │ Settings │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
       │             │             │             │
       ▼             ▼             ▼             ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Manage   │ │ Manage   │ │ Manage   │ │ Configure│
│ Locations│ │ Database │ │ Users    │ │ System   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
\`\`\`

## Dashboard Navigation
The Admin Dashboard is your central hub for managing all aspects of your Base Point solution.

## Main Sections

### 1. Dashboard
- Overview of key metrics
- Quick access to recent activities
- Performance indicators
- Module status

### 2. Shops & Branches
- Manage multiple locations
- Configure shop settings
- Track branch performance
- Transfer inventory

### 3. Customers
- Customer database
- Customer profiles
- Purchase history
- Communication logs

### 4. Staff & Users
- User management
- Role-based access control
- Permissions configuration
- Activity tracking

### 5. Settings
- Company configuration
- Module settings
- Integration setup
- System preferences

## Quick Actions
- Add new shop
- Create customer
- Add staff member
- Generate reports
- Access help center

## Customization
- Configure dashboard widgets
- Set up notifications
- Customize views
- Create shortcuts
      `,
    },
    {
      id: 22,
      title: "Managing Shops & Branches",
      description: "Configure and manage multiple shop locations",
      type: "article",
      readTime: "10 min",
      views: 1900,
      helpful: 155,
      content: `
# Managing Shops & Branches

## Shop Setup Flow

\`\`\`
┌──────────────┐
│ Go to Admin │
│ > Shops      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Click Add    │
│ Shop         │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Enter Basic  │
│ Info (Name,  │
│  Address)    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Select POS   │
│ Mode         │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Configure    │
│ Tax &        │
│ Payments     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Link         │
│ Inventory    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Setup Tables │
│ (Restaurant) │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Save &       │
│ Activate     │
└──────────────┘
\`\`\`

## Adding a New Shop

### Step 1: Basic Information
1. Go to **Admin > Shops**
2. Click **Add Shop**
3. Enter shop name
4. Add address and contact details
5. Set operating hours

### Step 2: Configuration
- Select POS mode (Restaurant/Retail)
- Configure tax settings
- Set up receipt templates
- Configure payment methods

### Step 3: Inventory Setup
- Link to inventory
- Set stock levels
- Configure suppliers
- Set reorder points

## Managing Multiple Branches

### Branch Operations
- Transfer inventory between branches
- Track branch performance
- Compare sales data
- Centralized reporting

### Branch Settings
- Individual branch configuration
- Local pricing options
- Branch-specific tax rates
- Custom payment methods

## Shop Services
- Configure service types
- Set up service pricing
- Manage service availability
- Track service usage

## Reports
- Branch performance reports
- Inventory by location
- Sales comparison
- Staff performance by branch
      `,
    },
    {
      id: 23,
      title: "Customer Management",
      description: "Manage customer data and relationships",
      type: "article",
      readTime: "7 min",
      views: 2100,
      helpful: 170,
      content: `
# Customer Management

## Adding Customers

### Manual Entry
1. Go to **Admin > Customers**
2. Click **Add Customer**
3. Enter customer details
4. Add contact information
6. Save customer profile

### Import from CSV
1. Download customer template
2. Fill in customer data
3. Upload CSV file
4. Map fields
5. Import customers

## Customer Profiles

### Information Tracked
- Personal details
- Contact information
- Purchase history
- Payment methods
- Loyalty points
- Communication preferences

### Customer Segmentation
- Create customer groups
- Segment by purchase behavior
- Target specific segments
- Custom pricing rules

## Customer Engagement

### Communication
- Send email campaigns
- SMS notifications
- WhatsApp messages
- Birthday greetings

### Loyalty Programs
- Points system
- Reward tiers
- Special offers
- Referral bonuses

## Customer Analytics
- Purchase patterns
- Lifetime value
- Churn analysis
- Satisfaction scores
      `,
    },
    {
      id: 24,
      title: "System Settings & Configuration",
      description: "Configure system-wide settings",
      type: "article",
      readTime: "12 min",
      views: 2500,
      helpful: 195,
      content: `
# System Settings & Configuration

## Company Settings

### Basic Information
- Company name and logo
- Business address
- Contact details
- Tax registration numbers

### Business Configuration
- Fiscal year settings
- Currency configuration
- Time zone settings
- Date format preferences

## Module Configuration

### Duka Settings
- POS mode selection
- Receipt customization
- Payment method setup
- Tax configuration

### Pesa Settings
- Chart of accounts
- Tax rates
- Fiscal periods
- Bank accounts

### Mteja Settings
- Lead stages
- Communication templates
- Sales targets
- Loyalty rules

### Dala Settings
- Property types
- Lease templates
- Rent schedules
- Maintenance rules

## Integration Settings

### Payment Gateways
- Pesapal configuration
- M-Pesa integration
- Card payment setup
- Mobile money options

### Tax Integration
- Etims setup
- KRA credentials
- VAT configuration
- Compliance settings

### Third-Party Integrations
- Email services
- SMS providers
- Accounting software
- CRM systems

## Security Settings
- User authentication
- Password policies
- Two-factor authentication
- Session management
- Audit logging

## Notification Settings
- Email notifications
- SMS alerts
- In-app notifications
- Notification preferences
      `,
    },
  ],
  reports: [
    {
      id: 25,
      title: "Reports & Analytics Overview",
      description: "Understanding business intelligence features",
      type: "article",
      readTime: "10 min",
      views: 2800,
      helpful: 220,
      content: `
# Reports & Analytics Overview

## Report Generation Flow

\`\`\`
┌──────────────┐
│ Select       │
│ Report Type  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Choose       │
│ Date Range   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Apply        │
│ Filters      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Generate     │
│ Report       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ View         │
│ Visualizations│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Export       │
│ (PDF/Excel)  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Share/       │
│ Schedule     │
└──────────────┘
\`\`\`

## Report Categories

### 1. Sales Reports
- Daily sales summary
- Product performance
- Category analysis
- Staff performance
- Time-based trends

### 2. Inventory Reports
- Stock levels
- Movement reports
- Valuation reports
- Low stock alerts
- Reorder recommendations

### 3. Financial Reports
- Revenue reports
- Expense tracking
- Profit analysis
- Cash flow
- Tax reports

### 4. Customer Reports
- Customer analysis
- Purchase patterns
- Loyalty metrics
- Churn analysis
- Lifetime value

### 5. Operational Reports
- Staff performance
- Shift reports
- Service metrics
- Efficiency analysis
- Capacity utilization

## Dashboard Analytics

### Key Performance Indicators
- Revenue trends
- Growth metrics
- Conversion rates
- Average order value
- Customer satisfaction

### Visualizations
- Charts and graphs
- Heat maps
- Trend lines
- Comparative analysis
- Geographic distribution

## Custom Reports

### Creating Custom Reports
1. Select data source
2. Choose metrics
3. Apply filters
4. Set date ranges
5. Configure visualization
6. Save and schedule

### Report Scheduling
- Daily, weekly, monthly
- Email delivery
- PDF export
- Dashboard embedding

## Export Options
- Excel spreadsheets
- PDF reports
- CSV data
- API access
- Real-time dashboards
      `,
    },
    {
      id: 26,
      title: "Sales Performance Reports",
      description: "Analyze sales data and trends",
      type: "article",
      readTime: "8 min",
      views: 2200,
      helpful: 175,
      content: `
# Sales Performance Reports

## Daily Sales Report
- Total revenue
- Transaction count
- Average order value
- Payment method breakdown
- Hourly sales distribution

## Product Performance
- Top-selling products
- Slow-moving items
- Category analysis
- Margin analysis
- Stock turnover

## Staff Performance
- Sales by staff
- Average transaction value
- Customer satisfaction
- Upsell success rate
- Productivity metrics

## Time-Based Analysis
- Daily comparisons
- Weekly trends
- Monthly summaries
- Year-over-year growth
- Seasonal patterns

## Customer Insights
- New vs returning customers
- Purchase frequency
- Average spend
- Basket analysis
- Channel performance

## Generating Reports
1. Go to **Reports > Sales**
2. Select report type
3. Choose date range
4. Apply filters
5. Generate report
6. Export or share
      `,
    },
    {
      id: 27,
      title: "Inventory Reports",
      description: "Track and analyze inventory data",
      type: "article",
      readTime: "7 min",
      views: 1800,
      helpful: 145,
      content: `
# Inventory Reports

## Stock Status Report
- Current stock levels
- Reorder points
- Stock value
- Location breakdown
- Category summary

## Movement Reports
- Stock in (purchases)
- Stock out (sales)
- Transfers
- Adjustments
- Wastage

## Valuation Reports
- Total inventory value
- Cost of goods sold
- Inventory turnover
- Aging analysis
- Margin analysis

## Low Stock Alerts
- Items below reorder point
- Out of stock items
- Critical shortages
- Recommended orders
- Supplier information

## Generating Inventory Reports
1. Go to **Reports > Inventory**
2. Select report type
3. Choose date range
4. Filter by location/category
5. Generate report
6. Export to Excel/PDF
      `,
    },
  ],
  onboarding: [
    {
      id: 13,
      title: "Quick Start Guide",
      description: "Get up and running in 5 minutes",
      type: "video",
      readTime: "5 min",
      views: 1200,
      helpful: 89,
      content: `
# Quick Start Guide

## Welcome to Base Point
This guide will help you get started with Base Point in just 5 minutes.

## Step 1: Account Setup
1. Log in to your account
2. Complete your profile
3. Configure your business details
4. Set up your first shop

## Step 2: Module Activation
- Activate Duka (POS) for sales
- Activate Pesa (Accounting) for finances
- Activate Mteja (CRM) for customers
- Activate Dala (Property) if needed
- Activate Bandu (HR) for payroll

## Step 3: Basic Configuration
- Add your first products
- Set up payment methods
- Configure tax settings
- Add staff members

## Step 4: First Sale
- Open the POS interface
- Add items to cart
- Complete the sale
- Print receipt

## Step 5: Explore
- Check the dashboard
- View reports
- Try the help center

## Need Help?
- Browse our help articles
- Contact support
- Watch video tutorials
      `,
    },
    {
      id: 14,
      title: "Account Setup",
      description: "Configure your account settings",
      type: "article",
      readTime: "3 min",
      views: 800,
      helpful: 65,
      content: `
# Account Setup

## Profile Configuration
1. Go to **Settings > Profile**
2. Upload your logo
3. Add business address
4. Set contact details
5. Configure time zone

## Business Information
- Company name
- Business type
- Tax registration
- Industry details

## User Preferences
- Language settings
- Date format
- Currency format
- Notification preferences

## Security Setup
- Set strong password
- Enable 2FA
- Configure session timeout
- Set up recovery options
      `,
    },
    {
      id: 39,
      title: "Module Activation Guide",
      description: "Activate and configure Base Suite modules",
      type: "article",
      readTime: "8 min",
      views: 1500,
      helpful: 120,
      content: `
# Module Activation Guide

## Module Activation Flow

\`\`\`
┌──────────────┐
│ Go to        │
│ Discover     │
│ Page         │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Select       │
│ Module       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Review       │
│ Features     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Click Enable │
│ Module       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Configure    │
│ Settings     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Complete     │
│ Setup Wizard │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Start Using │
│ Module       │
└──────────────┘
\`\`\`

## Available Modules

### Duka (POS)
- Point of Sale operations
- Inventory management
- Customer management
- Sales reporting

### Pesa (Accounting)
- Financial management
- Journal entries
- Financial reports
- Tax compliance

### Mteja (CRM)
- Lead management
- Customer database
- Marketing campaigns
- Loyalty programs

### Dala (Property)
- Property management
- Tenant management
- Lease tracking
- Maintenance

### Bandu (HR)
- Employee management
- Payroll processing
- Attendance tracking
- Benefits management

## Activation Steps
1. Go to **Discover** page
2. Select module to activate
3. Review module features
4. Click **Enable Module**
5. Configure settings
6. Start using

## Module Integration
- Modules work together seamlessly
- Data syncs automatically
- Unified dashboard
- Cross-module reporting
      `,
    },
    {
      id: 40,
      title: "Data Import Guide",
      description: "Import your existing data into Base Point",
      type: "article",
      readTime: "10 min",
      views: 1100,
      helpful: 95,
      content: `
# Data Import Guide

## Supported Data Types
- Products
- Customers
- Suppliers
- Employees
- Inventory

## Import Process

### 1. Download Template
1. Go to **Settings > Import**
2. Select data type
3. Download CSV template
4. Fill in your data

### 2. Prepare Data
- Follow template format
- Use correct data types
- Validate required fields
- Check for duplicates

### 3. Upload File
1. Select prepared CSV
2. Map fields
3. Preview data
4. Validate import

### 4. Complete Import
- Review summary
- Handle errors
- Confirm import
- Verify data

## Best Practices
- Backup before import
- Import in batches
- Validate after import
- Keep original files
      `,
    },
  ],
  billing: [
    {
      id: 15,
      title: "Subscription Plans",
      description: "Compare plans and pricing",
      type: "article",
      readTime: "4 min",
      views: 950,
      helpful: 72,
      content: `
# Subscription Plans

## Plan Tiers

### Starter
- Basic POS features
- Single location
- Limited users
- Essential reports

### Professional
- Full POS suite
- Multiple locations
- Advanced reports
- Integration support

### Enterprise
- All modules included
- Unlimited locations
- Custom integrations
- Priority support

## Pricing
- Monthly billing
- Annual discounts
- Per-location pricing
- Add-on modules

## Choosing a Plan
- Assess your needs
- Consider growth
- Compare features
- Calculate ROI

## Upgrading
- Easy upgrade process
- Pro-rated billing
- Data migration
- No downtime
      `,
    },
    {
      id: 16,
      title: "Payment Methods",
      description: "Add and manage payment options",
      type: "article",
      readTime: "2 min",
      views: 650,
      helpful: 45,
      content: `
# Payment Methods

## Supported Methods
- Credit/Debit Cards
- M-Pesa
- Bank Transfer
- Mobile Money
- Cash

## Adding Payment Method
1. Go to **Settings > Billing**
2. Click **Add Payment Method**
3. Enter card details
4. Set as default
5. Save

## Managing Payments
- View payment history
- Update payment methods
- Set auto-renewal
- Manage invoices

## Invoices
- Automatic invoicing
- PDF download
- Email delivery
- Payment tracking
      `,
    },
    {
      id: 41,
      title: "Understanding Your Bill",
      description: "Read and understand your billing statement",
      type: "article",
      readTime: "5 min",
      views: 750,
      helpful: 60,
      content: `
# Understanding Your Bill

## Bill Components

### Base Subscription
- Plan cost
- Location fees
- User licenses
- Module add-ons

### Usage Charges
- Transaction fees
- Storage costs
- API calls
- Overages

### Taxes
- VAT (if applicable)
- Service taxes
- Local taxes

## Reading Your Bill
- Review billing period
- Check line items
- Verify charges
- Compare with previous

## Payment Options
- Auto-pay
- Manual payment
- Payment plans
- Early payment discounts

## Disputes
- Contact support
- Provide documentation
- Timeline for resolution
- Credit policies
      `,
    },
  ],
  faq: [
    {
      id: 17,
      title: "Common Issues",
      description: "Troubleshoot frequent problems",
      type: "article",
      readTime: "6 min",
      views: 2100,
      helpful: 180,
      content: `
# Common Issues

## Login Problems
- Forgot password: Use reset link
- Account locked: Contact support
- 2FA issues: Use backup codes
- Session expired: Log in again

## POS Issues
- Products not showing: Check inventory
- Payment failed: Try again or use different method
- Receipt not printing: Check printer settings
- Sync errors: Check internet connection

## Performance
- Slow loading: Clear cache
- App crashes: Update browser
- Data not syncing: Check connection
- Timeout errors: Refresh page

## Data Issues
- Missing data: Check filters
- Incorrect totals: Verify entries
- Duplicate records: Merge or delete
- Export errors: Check permissions

## Getting Help
- Search help center
- Contact support
- Join community
- Schedule training
      `,
    },
    {
      id: 18,
      title: "Contact Support",
      description: "Get help from our team",
      type: "article",
      readTime: "1 min",
      views: 500,
      helpful: 30,
      content: `
# Contact Support

## Support Channels

### Email Support
- support@basepoint.com
- Response within 24 hours
- Include account details
- Describe the issue

### Phone Support
- Available for Enterprise plans
- Business hours only
- Have account info ready
- Describe issue clearly

### Live Chat
- Available in app
- Instant responses
- For quick questions
- Business hours

### Ticket System
- Submit detailed tickets
- Track progress
- Attach screenshots
- View history

## Before Contacting
- Check help center
- Try troubleshooting
- Gather error details
- Note steps to reproduce

## Response Times
- Critical: 4 hours
- High: 8 hours
- Normal: 24 hours
- Low: 48 hours
      `,
    },
    {
      id: 42,
      title: "Security Best Practices",
      description: "Keep your account and data secure",
      type: "article",
      readTime: "7 min",
      views: 1800,
      helpful: 150,
      content: `
# Security Best Practices

## Password Security
- Use strong, unique passwords
- Change passwords regularly
- Never share passwords
- Use password manager
- Enable 2FA

## Account Security
- Enable two-factor authentication
- Review login history
- Revoke unknown sessions
- Update recovery options
- Monitor account activity

## Data Protection
- Regular backups
- Encrypt sensitive data
- Limit access permissions
- Use secure connections
- Keep software updated

## User Management
- Remove ex-employees promptly
- Review access regularly
- Use role-based permissions
- Audit user activity
- Train staff on security

## Phishing Awareness
- Verify sender identity
- Don't click suspicious links
- Report phishing attempts
- Keep software updated
- Use email filters

## Compliance
- Follow data protection laws
- Maintain audit trails
- Regular security reviews
- Incident response plan
- Staff security training
      `,
    },
    {
      id: 43,
      title: "Performance Optimization",
      description: "Improve system performance and speed",
      type: "article",
      readTime: "5 min",
      views: 1200,
      helpful: 98,
      content: `
# Performance Optimization

## Browser Optimization
- Use latest browser version
- Clear cache regularly
- Disable unnecessary extensions
- Enable hardware acceleration
- Reduce open tabs

## Network Optimization
- Use stable internet connection
- Prefer wired connection
- Check bandwidth
- Use CDN if available
- Minimize network calls

## Data Management
- Archive old data
- Clean up unused records
- Optimize database
- Regular maintenance
- Monitor storage limits

## System Configuration
- Adjust cache settings
- Optimize image sizes
- Enable compression
- Use lazy loading
- Minimize API calls

## Monitoring
- Track performance metrics
- Identify bottlenecks
- Monitor error rates
- Set up alerts
- Regular reviews

## When to Contact Support
- Persistent slowness
- Frequent errors
- Timeout issues
- Unusual behavior
- Performance degradation
      `,
    },
  ],
};

const ArticleDrawer = ({ article, visible, onClose }: { article: Article | null; visible: boolean; onClose: () => void }) => {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleFeedback = () => {
    setSubmitted(true);
  };

  if (!article) return null;

  return (
    <Drawer
      title={
        <Space>
          <BookOutlined style={{ color: "#1890ff" }} />
          <span>{article.title}</span>
        </Space>
      }
      width={720}
      open={visible}
      onClose={onClose}
      styles={{
        body: { background: "#fafafa" },
      }}
      footer={
        <div style={{ textAlign: "center", padding: "16px", borderTop: "1px solid #f0f0f0" }}>
          {!submitted ? (
            <Space direction="vertical" size="small">
              <Text style={{ fontSize: 13 }}>Was this helpful?</Text>
              <Rate value={rating} onChange={setRating} />
              <Button
                type="primary"
                disabled={!rating}
                onClick={handleFeedback}
                icon={<LikeOutlined />}
              >
                Submit Feedback
              </Button>
            </Space>
          ) : (
            <Space>
              <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 20 }} />
              <Text type="success" style={{ fontSize: 14 }}>Thanks for your feedback!</Text>
            </Space>
          )}
        </div>
      }
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* Article Meta */}
        <div style={{ background: "#fff", padding: "16px", borderRadius: 8, border: "1px solid #f0f0f0" }}>
          <Space wrap>
            <Tag
              color={article.type === "video" ? "red" : "blue"}
              icon={article.type === "video" ? <PlayCircleOutlined /> : <FileTextOutlined />}
              style={{ fontSize: 12, padding: "4px 12px" }}
            >
              {article.type.toUpperCase()}
            </Tag>
            <Tag icon={<ClockCircleOutlined />} style={{ fontSize: 12, padding: "4px 12px" }}>
              {article.readTime}
            </Tag>
            <Tag icon={<EyeOutlined />} style={{ fontSize: 12, padding: "4px 12px" }}>
              {article.views} views
            </Tag>
            <Tag icon={<LikeOutlined />} color="green" style={{ fontSize: 12, padding: "4px 12px" }}>
              {article.helpful} helpful
            </Tag>
          </Space>
        </div>

        {/* Article Content */}
        <div
          style={{
            background: "#fff",
            padding: "24px",
            borderRadius: 8,
            border: "1px solid #f0f0f0",
            minHeight: 400,
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <Title level={2} style={{ marginTop: 24, marginBottom: 16, color: "#1f2937" }}>
                  {children}
                </Title>
              ),
              h2: ({ children }) => (
                <Title level={3} style={{ marginTop: 20, marginBottom: 12, color: "#374151" }}>
                  {children}
                </Title>
              ),
              h3: ({ children }) => (
                <Title level={4} style={{ marginTop: 16, marginBottom: 8, color: "#4b5563" }}>
                  {children}
                </Title>
              ),
              p: ({ children }) => (
                <Paragraph style={{ marginBottom: 12, lineHeight: 1.7, color: "#6b7280" }}>
                  {children}
                </Paragraph>
              ),
              ul: ({ children }) => (
                <ul style={{ marginBottom: 16, paddingLeft: 20, color: "#6b7280" }}>
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol style={{ marginBottom: 16, paddingLeft: 20, color: "#6b7280" }}>
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li style={{ marginBottom: 8, lineHeight: 1.6 }}>
                  {children}
                </li>
              ),
              strong: ({ children }) => (
                <strong style={{ color: "#1f2937", fontWeight: 600 }}>
                  {children}
                </strong>
              ),
              code: ({ children }) => (
                <code
                  style={{
                    background: "#f3f4f6",
                    padding: "2px 6px",
                    borderRadius: 4,
                    fontSize: 13,
                    color: "#dc2626",
                  }}
                >
                  {children}
                </code>
              ),
              blockquote: ({ children }) => (
                <div
                  style={{
                    borderLeft: "4px solid #3b82f6",
                    background: "#eff6ff",
                    padding: "12px 16px",
                    margin: "16px 0",
                    borderRadius: 4,
                    color: "#1e40af",
                  }}
                >
                  {children}
                </div>
              ),
            }}
          >
            {article.content}
          </ReactMarkdown>
        </div>
      </Space>
    </Drawer>
  );
};

const HelpCenter = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const filteredArticles = selectedCategory
    ? (articles[selectedCategory as keyof typeof articles] as Article[]).filter(
      (article) =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : [];

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f7fa" }}>
      <Content style={{ padding: "32px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 80,
                height: 80,
                borderRadius: 20,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                marginBottom: 20,
                boxShadow: "0 10px 40px rgba(102, 126, 234, 0.3)",
              }}
            >
              <BookOutlined style={{ fontSize: 40, color: "#fff" }} />
            </div>
            <Title level={1} style={{ marginBottom: 12, color: "#1f2937" }}>
              Help Center
            </Title>
            <Paragraph style={{ fontSize: 16, color: "#6b7280", marginBottom: 32 }}>
              Comprehensive guides for Duka, Pesa, Mteja, Dala, and Etims
            </Paragraph>
            <Input.Search
              placeholder="Search for guides, tutorials, and articles..."
              size="large"
              style={{ maxWidth: 500, borderRadius: 12 }}
              onChange={(e) => setSearchQuery(e.target.value)}
              prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
            />
          </div>

          {/* Categories or Articles */}
          {!selectedCategory ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
              {categories.map((category) => (
                <Card
                  key={category.key}
                  hoverable
                  onClick={() => setSelectedCategory(category.key)}
                  style={{
                    textAlign: "center",
                    borderRadius: 16,
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                  }}
                  styles={{
                    body: { padding: "32px 24px" },
                  }}
                  bodyStyle={{ padding: "32px 24px" }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 64,
                      height: 64,
                      borderRadius: 16,
                      background: `${category.color}15`,
                      marginBottom: 20,
                      transition: "all 0.3s ease",
                    }}
                  >
                    <span style={{ fontSize: 32, color: category.color }}>
                      {category.icon}
                    </span>
                  </div>
                  <Title level={4} style={{ marginBottom: 8, color: "#1f2937" }}>
                    {category.title}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    {category.description}
                  </Text>
                  <div style={{ marginTop: 16 }}>
                    <Text style={{ fontSize: 12, color: category.color, fontWeight: 500 }}>
                      {(articles[category.key as keyof typeof articles] as Article[])?.length || 0} articles
                    </Text>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 24 }}>
                <Button
                  onClick={() => setSelectedCategory(null)}
                  icon={<ArrowRightOutlined rotate={180} />}
                  style={{ borderRadius: 8 }}
                >
                  Back to Categories
                </Button>
              </div>

              <Title level={3} style={{ marginBottom: 24, color: "#1f2937" }}>
                {categories.find((c) => c.key === selectedCategory)?.title}
              </Title>

              {filteredArticles.length > 0 ? (
                <List
                  grid={{ gutter: 16, column: 1 }}
                  dataSource={filteredArticles}
                  renderItem={(article) => (
                    <List.Item style={{ marginBottom: 16 }}>
                      <Card
                        hoverable
                        onClick={() => setSelectedArticle(article)}
                        style={{
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                          transition: "all 0.2s ease",
                        }}
                        styles={{
                          body: { padding: "20px 24px" },
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            <Title level={5} style={{ marginBottom: 8, color: "#1f2937" }}>
                              {article.title}
                            </Title>
                            <Paragraph style={{ marginBottom: 12, color: "#6b7280", fontSize: 14 }}>
                              {article.description}
                            </Paragraph>
                            <Space wrap>
                              <Tag
                                color={article.type === "video" ? "red" : "blue"}
                                icon={article.type === "video" ? <PlayCircleOutlined /> : <FileTextOutlined />}
                                style={{ fontSize: 12 }}
                              >
                                {article.type.toUpperCase()}
                              </Tag>
                              <Tag icon={<ClockCircleOutlined />} style={{ fontSize: 12 }}>
                                {article.readTime}
                              </Tag>
                              <Tag icon={<EyeOutlined />} style={{ fontSize: 12 }}>
                                {article.views} views
                              </Tag>
                              <Tag icon={<LikeOutlined />} color="green" style={{ fontSize: 12 }}>
                                {article.helpful} helpful
                              </Tag>
                            </Space>
                          </div>
                        </div>
                      </Card>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty
                  description="No articles found"
                  style={{ padding: 60 }}
                />
              )}
            </div>
          )}
        </div>

        <ArticleDrawer
          article={selectedArticle}
          visible={!!selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      </Content>
    </Layout>
  );
};

export default HelpCenter;