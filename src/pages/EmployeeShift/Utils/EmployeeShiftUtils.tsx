import { message } from "antd";
import dayjs, { Dayjs } from "dayjs";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { RefObject } from "react";
import { dayNames } from "./Constants";
import { SetCurrentShift, Shift, User } from "./Types";

// Get the days of the current week
export const getWeekDays = (currentDate: Dayjs) => {
    const startOfWeek = currentDate.startOf("week");
    const days = [];
    for (let i = 0; i < 7; i++) {
        days.push(startOfWeek.add(i, "day"));
    }
    return days;
};

// Navigation functions
export const goToPreviousWeek = (currentDate: Dayjs, setCurrentDate: (date: Dayjs) => void) => {
    setCurrentDate(currentDate.subtract(1, "week"));
};

export const goToNextWeek = (currentDate: Dayjs, setCurrentDate: (date: Dayjs) => void) => {
    setCurrentDate(currentDate.add(1, "week"));
};

export const goToToday = (setCurrentDate: (date: Dayjs) => void) => {
    setCurrentDate(dayjs());
};

// Get shifts for a specific employee on a specific day
export const getEmployeeShiftsForDay = (employeeId: string, day: Dayjs, shifts: Shift[], timeFilter: string) => {
    const dayOfWeek = dayNames[day.day()];

    let filteredShifts = shifts?.filter(
      (shift) =>
        shift.employee_id?._id === employeeId &&
        shift.dayOfWeek === dayOfWeek
    ) || [];

    // Apply time filter if not 'all'
    if (timeFilter !== 'all') {
      filteredShifts = filteredShifts.filter(shift => {
        const hour = parseInt(shift.startTime.split(":")[0]);
        if (timeFilter === 'morning' && hour < 12) return true;
        if (timeFilter === 'afternoon' && hour >= 12 && hour < 17) return true;
        if (timeFilter === 'evening' && hour >= 17) return true;
        return false;
      });
    }

    return filteredShifts;
};

// Generate a unique color for each employee
export const getEmployeeColor = (employeeId: string, users: User[]) => {
    // List of distinct colors
    const colors = [
      "#f56a00", "#7265e6", "#ffbf00", "#00a2ae", "#1890ff",
      "#52c41a", "#722ed1", "#eb2f96", "#fa8c16", "#a0d911",
      "#13c2c2", "#1677ff", "#faad14", "#fadb14", "#a8071a",
      "#006d75", "#0958d9", "#531dab", "#c41d7f", "#d4380d"
    ];

    // Find index of the employee in the users array
    const userIndex = users?.findIndex(user => user._id === employeeId) || 0;

    // Use modulo to ensure we don't go out of bounds
    return colors[userIndex % colors.length];
};

// Handle clicking "New Shift" button
export const handleNewShiftClick = (newShiftButtonRef: RefObject<HTMLDivElement>) => {
    if (newShiftButtonRef.current) {
        // Find the button element and programmatically click it
        const buttonElement = newShiftButtonRef.current.querySelector('button');
        if (buttonElement) {
            buttonElement.click();
        }
    }
};

// Handle click to add a new shift from empty cell
export const handleAddShift = (
    employeeId: string, 
    dayOfWeek: string, 
    date: Dayjs, 
    users: User[], 
    newShiftButtonRef: RefObject<HTMLDivElement>,
    setCurrentShift: (shift: SetCurrentShift) => void, 
    setIsEditMode: (val: boolean) => void,
) => {

    const employee = users?.find(user => user._id === employeeId);

    // Set the current shift data (will be picked up by the modal via initialValues)
    // TODO: Research why we are selecting an employee (Confirm with Mike)
    setCurrentShift({
        employee_id: employee?._id || '',
        dayOfWeek: dayOfWeek,
        date: date.format("YYYY-MM-DD")
    });

    setIsEditMode(false);

    // Delay slightly to ensure state is updated before clicking
    setTimeout(() => {
        if (newShiftButtonRef.current) {
            const buttonElement = newShiftButtonRef.current.querySelector('button');
            if (buttonElement) {
                buttonElement.click();
            }
        }
    }, 50);
};

// Handle editing a shift
export const handleEditShift = (
    shift: Shift, 
    editShiftButtonRef: RefObject<HTMLDivElement>,
    setCurrentShift: (shift: Shift) => void,
    setIsEditMode: (val: boolean) => void
) => {

    // Set the current shift data for editing
    setCurrentShift(shift);
    setIsEditMode(true);

    // Delay slightly to ensure state is updated before clicking
    setTimeout(() => {
      if (editShiftButtonRef.current) {
        const buttonElement = editShiftButtonRef.current.querySelector('button');
        if (buttonElement) {
          buttonElement.click();
        }
      }
    }, 50);
};

 // Export schedule as PDF
export const exportToPDF = async (
    currentDate: Dayjs,
    scheduleRef: RefObject<HTMLDivElement>,
    setExportLoading: (val: boolean) => void
) => {
    if (!scheduleRef.current) return;

    setExportLoading(true);

    try {
      const canvas = await html2canvas(scheduleRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
      });

      const imgWidth = 280;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`schedule-week-${currentDate.week()}.pdf`);

      message.success('Schedule exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      message.error('Failed to export schedule');
    } finally {
      setExportLoading(false);
    }
  };