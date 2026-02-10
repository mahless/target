/**
 * API Action Constants
 */
export const API_ACTIONS = {
  LOGIN: 'login',
  GET_DATA: 'getData',
  GET_HR_REPORT: 'getHRReport',
  ADD_ROW: 'addRow',
  GET_AVAILABLE_BARCODE: 'getAvailableBarcode',
  ADD_STOCK_BATCH: 'addStockBatch',
  UPDATE_STOCK_STATUS: 'updateStockStatus',
  UPDATE_ENTRY: 'updateEntry',
  UPDATE_STOCK_ITEM: 'updateStockItem',
  DELETE_STOCK_ITEM: 'deleteStockItem',
  ATTENDANCE: 'attendance',
  DELIVER_ORDER: 'deliverOrder',
  GET_USER_LOGS: 'getUserLogs',
  GET_BRANCHES: 'getBranches',
  BRANCH_TRANSFER: 'branchTransfer',
  DELETE_EXPENSE: 'deleteExpense',
  MANAGE_USERS: 'manageUsers',
  MANAGE_BRANCHES: 'manageBranches',
  UPDATE_SETTINGS: 'updateSettings'
} as const;

/**
 * Sheet Name Constants
 */
export const SHEET_NAMES = {
  ENTRIES: 'Entries',
  EXPENSES: 'Expenses',
  STOCK: 'Stock',
  ATTENDANCE: 'Attendance',
  USERS: 'Users',
  BRANCHES_CONFIG: 'Branches_Config',
  SERVICE_EXPENSE: 'Service_Expense'
} as const;

/**
 * Network Timeouts (ms)
 */
export const NETWORK = {
  TIMEOUT_DEFAULT: 25000,
  TIMEOUT_LONG: 30000,
  TIMEOUT_SHORT: 3000,
  RETRIES: 3
} as const;

/**
 * User Roles
 */
export const ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'مدير',
  ASSISTANT: 'مساعد',
  EMPLOYEE: 'موظف',
  VIEWER: 'مشاهد' // Updated to match usage in Dashboard and Types
} as const;

/**
 * Common Status Strings
 */
export const STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  AVAILABLE: 'Available',
  USED: 'Used',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DELIVERED: 'تم التسليم',
  CHECK_IN: 'check-in',
  CHECK_OUT: 'check-out',
  PRESENT: 'حاضر',
  ABSENT: 'غائب'
} as const;

/**
 * Service Speed
 */
export const SPEED = {
  NORMAL: 'عادي',
  URGENT: 'مستعجل',
  INSTANT: 'فوري',
  SUPER_INSTANT: 'سوبر فوري'
} as const;

/**
 * Stock Categories
 */
export const STOCK_CATEGORY = {
  NORMAL: 'عادي',
  URGENT: 'مستعجل',
  INSTANT: 'فوري'
} as const;

/**
 * Service Types & Expense Categories
 */
export const SERVICE_TYPES = {
  DEBT_SETTLEMENT: 'سداد مديونية'
} as const;

export const EXPENSE_CATEGORIES = {
  THIRD_PARTY: 'طرف ثالث'
} as const;

/**
 * Local Storage Keys
 */
export const STORAGE_KEYS = {
  ACTIVE_EMPLOYEE_ID: 'active_employee_id',
  DASHBOARD_SEARCH_TERM: 'dashboard_search_term'
} as const;

/**
 * External Links and Assets
 */
export const EXTERNAL_LINKS = {
  IP_API: 'https://api.ipify.org?format=json'
} as const;

/**
 * Branch Constants
 */
export const BRANCHES = {
  ALL: 'all'
} as const;

/**
 * Service Speeds Arrays
 */
export const ID_CARD_SPEEDS = [SPEED.NORMAL, SPEED.URGENT, SPEED.INSTANT, SPEED.SUPER_INSTANT] as const;
export const PASSPORT_SPEEDS = [SPEED.NORMAL, SPEED.URGENT, SPEED.INSTANT] as const;

/**
 * Electronic Payment Methods
 */
export const ELECTRONIC_METHODS = ['انستا باي', 'محفظة إلكترونية'] as const;