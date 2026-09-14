import type { Article } from "./types";
import duka from "./duka.json";
import pesa from "./pesa.json";
import mteja from "./mteja.json";
import dala from "./dala.json";
import etims from "./etims.json";
import bandu from "./bandu.json";
import admin from "./admin.json";
import reports from "./reports.json";
import onboarding from "./onboarding.json";
import billing from "./billing.json";
import faq from "./faq.json";

export * from "./types";

export const helpCenterArticles: Record<string, Article[]> = {
  duka: duka as Article[],
  pesa: pesa as Article[],
  mteja: mteja as Article[],
  dala: dala as Article[],
  etims: etims as Article[],
  bandu: bandu as Article[],
  admin: admin as Article[],
  reports: reports as Article[],
  onboarding: onboarding as Article[],
  billing: billing as Article[],
  faq: faq as Article[],
};

export default helpCenterArticles;
