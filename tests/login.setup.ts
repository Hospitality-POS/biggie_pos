import { expect, test as setup } from "@playwright/test";
import { credentials } from "../tests/credentials";

setup("Login flow", async ({ page }) => {
  const { company_code, pin } = credentials.user_three;
  await page.goto("/login");
  await page.getByPlaceholder("Company Code").fill(company_code);
  await page.getByRole("button").click();
  await expect(page.getByText("Hi Big Mac d, Welcome back!")).toBeVisible();

  for (const digit of pin) {
    await page.click(`button:has-text("${digit}")`);
  }
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL("**/tables");
  await expect(page.url()).toContain("/tables");
  //   await expect(page.getByText("Home")).toBeVisible();
  await page.context().storageState({
    path: ".auth/creds.json",
  });
});
