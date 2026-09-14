export interface Article {
  id: number;
  title: string;
  description: string;
  type: "article" | "video";
  readTime: string;
  views: number;
  helpful: number;
  content: string;
}

export interface Category {
  key: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

export type HelpCategoryKey =
  | "duka"
  | "pesa"
  | "mteja"
  | "dala"
  | "etims"
  | "bandu"
  | "admin"
  | "reports"
  | "onboarding"
  | "billing"
  | "faq";
