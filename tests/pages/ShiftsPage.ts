import { expect, Locator, Page } from "@playwright/test";
import { Timeouts } from "../config/timeouts";

export class ShiftsPage {
  readonly page: Page;

  // Locators
  readonly shiftsButton: Locator;
  readonly addNewShiftButton: Locator;
  readonly addShiftButton: Locator;
  readonly saveShiftButton: Locator;
  readonly okButton: Locator;
  readonly employeeSelect: Locator;
  readonly dayOfWeekSelect: Locator;
  readonly startTimeSelect: Locator;
  readonly endTimeSelect: Locator;
  readonly successMessage: Locator;
  readonly endTimeError: Locator;
  readonly dropdownOverlay: Locator;
  readonly employeeRow: Locator;
  readonly deleteShiftButton: Locator;
  readonly acceptDeleteShiftButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Buttons & actions
    this.shiftsButton = page.getByRole("link").getByText("Shifts", {
      exact: true,
    });
    this.deleteShiftButton = page.getByRole("button", {
      name: "Delete",
    });
    this.addNewShiftButton = page.getByRole("button", {
      name: "New Shift",
    });
    this.addShiftButton = page.getByRole("button", {
      name: "Add Shift",
    });
    this.saveShiftButton = page.getByRole("button", {
      name: "Create Shift",
    });
    this.okButton = page.getByRole("button", {
      name: "OK",
    });
    this.acceptDeleteShiftButton = page.getByRole("button", {
      name: "Yes",
    });

    this.employeeRow = page
      .locator(".shift-card")
      .filter({ hasText: /^08:00 - 17:00$/ })
      .first();

    // Form Fields
    this.employeeSelect = page.getByLabel("Employee", { exact: true });
    this.dayOfWeekSelect = page.getByLabel("Day of Week");
    this.startTimeSelect = page.getByLabel("Start Time");
    this.endTimeSelect = page.getByLabel("End Time");

    // Feedback
    this.successMessage = page.getByText("Shift created successfully");
    this.endTimeError = page.getByText("End time must be after start time");

    // Ant Design dropdown overlay (for reliability)
    this.dropdownOverlay = page.locator(".ant-select-dropdown");
  }

  // Page-specific actions
  async goto() {
    await this.page.goto("/tables");
  }

  async getOption(value: string) {
    // select an option from option list
    const option = this.page.getByText(value).last();
    await option.waitFor({
      state: "visible",
      timeout: Timeouts.MEDIUM,
    });
    await option.click();
  }

  async openEmployeeShifts() {
    await expect(this.shiftsButton).toBeVisible();
    await this.shiftsButton.click();
    await expect(this.page).toHaveURL("/employee-shift");
  }

  async openAddShiftModal() {
    await this.addNewShiftButton.click({
      timeout: Timeouts.LONG,
    });
    await expect(this.page.getByText("Add New Employee Shift")).toBeVisible();
  }

  async selectEmployee(name: string) {
    await this.employeeSelect.click();
    await this.page.keyboard.type(name); //e.g., 'mikey'

    // select an option from option list
    const option = this.page.getByText(name).first();
    await option.waitFor({
      state: "visible",
      timeout: Timeouts.MEDIUM,
    });
    await option.click();
  }

  async selectDayOfWeek(day: string) {
    await this.dayOfWeekSelect.click();
    await this.page.keyboard.type(day);

    // select day of week from dropdown
    await this.getOption(day);
  }

  async selectStartTime(time: string) {
    await this.startTimeSelect.click();
    await this.page.keyboard.type(time);

    // select start time from dropdown
    await this.getOption(time);
  }

  async selectEndTime(time: string) {
    await this.endTimeSelect.click();
    await this.page.keyboard.type(time);

    // select end time from dropdown
    await this.getOption(time);
  }

  async saveShift() {
    await this.saveShiftButton.click();
    await this.okButton.click();
  }

  async waitForSuccessMessage() {
    await this.successMessage.waitFor({
      state: "visible",
      timeout: Timeouts.MEDIUM,
    });
  }

  async hasEndTimeError(): Promise<boolean> {
    return await this.endTimeError.isVisible();
  }

  async deleteShift() {
    await this.employeeRow.hover();
    // await this.shiftCard.hover();
    await this.deleteShiftButton.click();
    await this.acceptDeleteShiftButton.click();
  }
}
