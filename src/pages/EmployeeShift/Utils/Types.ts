import { Dayjs } from "dayjs";
import { RefObject } from "react";

export interface Shift {
  createdAt: string;
  dayOfWeek: string;
  endTime: string;
  shop_id: string;
  startTime: string;
  updatedAt: string;
  _id: string;
  employee_id: EmployeeId;
}

export interface EmployeeId {
  _id: string;
  fullname: string;
}

export interface User {
  createdAt: string;
  email: string;
  fullname: string;
  hashedPin: string;
  idNumber: string;
  isAdmin: boolean;
  pin: string;
  roleId: string;
  status: boolean;
  thumbnail: string;
  updatedAt: string;
  username: string;
  _id: string;
  clockInArray: ClockIn[];
  role: Role;
  shop_id: ShopId;
}

export interface ClockIn {
  clock_in: string;
  clock_out: string;
  createdAt: string;
  staff_id: string;
  updatedAt: string;
}

export interface Role {
  createdAt: string;
  role_type: string;
  updatedAt: string;
}

export interface ShopId {
  location: string;
  name: string;
  _id: string;
}

export interface SetCurrentShift {
  employee_id: string;
  dayOfWeek: string;
  date: string;
}

export interface ShiftCardProps {
  shift: Shift;
  users: User[];
  onEdit: (shift: Shift) => void;
  onDelete: (shiftId: string) => void;
}

export interface WeeklyViewProps {
  timeFilter: string;
  users: User[];
  weekDays: Dayjs[];
  shifts: Shift[];
  scheduleRef: RefObject<HTMLDivElement>;
  editShiftButtonRef: RefObject<HTMLDivElement>;
  newShiftButtonRef: RefObject<HTMLDivElement>;
  setCurrentShift: (shift: Shift) => void;
  setIsEditMode: (val: boolean) => void;
  setAddCurrentShift: (shift: SetCurrentShift) => void;
}

export interface CalendarHeaderProps {
  timeFilter: string;
  exportLoading: boolean;
  currentDate: Dayjs;
  scheduleRef: RefObject<HTMLDivElement>;
  newShiftButtonRef: RefObject<HTMLDivElement>;
  setCurrentDate: (date: Dayjs) => void;
  setTimeFilter: (timeFilter: string) => void;
  setExportLoading: (val: boolean) => void;
}
