export type ServiceSpeed = 'عادي' | 'مستعجل' | 'فوري' | 'سوبر فوري';

// ExpenseCategory is now dynamic and loaded from Google Sheets
export type ExpenseCategory = string;

export type ElectronicMethod = 'انستا باي' | 'محفظة إلكترونية';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  notes?: string;
  branchId: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  recordedBy: string; // Username of the employee
}

export interface ServiceEntry {
  id: string;
  clientName: string;
  nationalId: string;
  phoneNumber: string;
  serviceType: string;
  barcode?: string;
  Barcode_Source?: 'خارجي' | 'داخلي' | '-';
  speed?: ServiceSpeed;

  // Financials
  serviceCost: number;
  amountPaid: number; // Total collected (Cash + Electronic)
  remainingAmount: number;

  // Third Party
  hasThirdParty: boolean;
  thirdPartyName?: string;
  thirdPartyCost?: number;
  isCostPaid?: boolean;
  costPaidDate?: string;
  costSettledBy?: string;

  // Electronic Payment
  isElectronic: boolean;
  electronicMethod?: ElectronicMethod;
  electronicAmount?: number;

  notes?: string;

  // System Metadata
  branchId: string;
  entryDate: string; // YYYY-MM-DD
  timestamp: number;
  recordedBy: string; // Username of the employee

  // Cancellation
  status: 'active' | 'cancelled' | 'تم التسليم';
  cancellationReason?: string;
  deliveredDate?: string; // YYYY-MM-DD
  adminFee?: number;

  // Link to original order for debt settlements
  parentEntryId?: string;
}

export type StockStatus = 'Available' | 'Used' | 'Error';
export type StockCategory = 'عادي' | 'مستعجل' | 'فوري';

export interface StockItem {
  barcode: string;
  category: StockCategory;
  branch: string;
  status: StockStatus;
  created_at: number;
  used_by?: string;
  usage_date?: string;
  order_id?: string;
}

export interface User {
  id: string;
  name: string;
  role: 'مدير' | 'مساعد' | 'موظف' | 'مشاهد';
  branchId: string; // Used for local filtering
  assignedBranchId?: string; // New field for auto-assignment
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  id?: string;
  name?: string;
  role?: 'مدير' | 'مساعد' | 'موظف' | 'مشاهد';
  assignedBranchId?: string; // New field
}

export interface Branch {
  id: string;
  name: string;
  Branch_Name?: string;
  Current_Balance?: number;
  currentBalance?: number;
  Authorized_IP?: string;
  Service_List?: string;
  Expense_List?: string;
}

export interface AppState {
  user: User | null;
  currentBranch: Branch | null;
  selectedDate: string | null;
  entries: ServiceEntry[];
  expenses: Expense[];
  stock: StockItem[];
}