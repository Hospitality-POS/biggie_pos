import test from "@playwright/test";
import { NewShiftData } from "../data/Shifts";
import { ShiftsPage } from "../pages/ShiftsPage";

test("should add a new shift", async ({ page }) => {
  const { step } = test;
  const shiftsPage = new ShiftsPage(page);

  await step("Navigate and open shift modal", async () => {
    await shiftsPage.goto();
    await shiftsPage.openEmployeeShifts();
    await shiftsPage.openAddShiftModal();
  });

  await step("Fill shift details", async () => {
    await shiftsPage.selectEmployee(NewShiftData.employeeName);
    await shiftsPage.selectDayOfWeek(NewShiftData.dayOfWeek);
    await shiftsPage.selectStartTime(NewShiftData.startTime);
    await shiftsPage.selectEndTime(NewShiftData.endTime);
  });

  await step("Submit and verify", async () => {
    await shiftsPage.saveShift();
    await shiftsPage.waitForSuccessMessage();
  });

  await step("Delete shift", async () => {
    await shiftsPage.deleteShift();
  });
});
