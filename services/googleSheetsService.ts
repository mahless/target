import { ServiceEntry, Expense, Branch, User, LoginResponse, BackendResponse, StockItem, HRReportItem, UserLogEntry } from '../types';
import { API_ACTIONS, SHEET_NAMES, NETWORK, ROLES, STATUS, EXTERNAL_LINKS } from '../constants';

// "Web App URL"
const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

export const GoogleSheetsService = {
    /**
     * Helper for fetch with timeout and retry logic
     */
    async fetchWithRetry(url: string, options: RequestInit = {}, timeout: number = NETWORK.TIMEOUT_DEFAULT, retries: number = NETWORK.RETRIES): Promise<Response> {
        const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        for (let i = 0; i < retries; i++) {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            try {
                const response = await fetch(url, { ...options, signal: controller.signal });
                clearTimeout(id);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response;
            } catch (error: any) {
                clearTimeout(id);
                const isLastAttempt = i === retries - 1;
                if (isLastAttempt) throw error;

                // Exponential backoff: 1s, 2s, 4s...
                const delay = 1000 * Math.pow(2, i);
                console.warn(`Fetch failed (attempt ${i + 1}/${retries}), retrying in ${delay}ms...`, error.message);
                await wait(delay);
            }
        }
        throw new Error('All fetch attempts failed');
    },

    /**
     * Authenticate user credentials.
     * 
     * @api GET ?action=login
     * @param id - User ID
     * @param password - User Password
     * @returns LoginResponse
     */
    async login(id: string, password: string): Promise<LoginResponse> {
        if (!GOOGLE_SCRIPT_URL) return { success: false, message: 'URL missing' };
        try {
            const response = await this.fetchWithRetry(`${GOOGLE_SCRIPT_URL}?action=${API_ACTIONS.LOGIN}&id=${id}&password=${password}`);
            return await response.json();
        } catch (error) {
            return { success: false, message: 'فشل الاتصال بالسيرفر' };
        }
    },

    /**
     * Retrieve data from a specific sheet.
     * 
     * @api GET ?action=getData
     * @param sheetName - Name of the sheet to fetch (e.g., 'Entries', 'Expenses')
     * @param role - User role for authorization (optional)
     * @param username - Username for logging/filtering (optional)
     * @returns Array of T objects or empty array on error
     */
    async getData<T>(sheetName: string, role?: string, username?: string): Promise<T[]> {
        if (!GOOGLE_SCRIPT_URL) {
            console.warn('Google Script URL is missing');
            return [];
        }

        try {
            let url = `${GOOGLE_SCRIPT_URL}?action=${API_ACTIONS.GET_DATA}&sheetName=${sheetName}&t=${Date.now()}`;
            if (role) url += `&role=${encodeURIComponent(role)}`;
            if (username) url += `&username=${encodeURIComponent(username)}`;

            const response = await this.fetchWithRetry(url);
            const json = await response.json() as BackendResponse | T[];

            // Check if it's an error response object (has status prop) or an array
            if (json && !Array.isArray(json) && (json as BackendResponse).status === STATUS.ERROR) {
                console.error('Sheet API Error:', (json as BackendResponse).message);
                return [];
            }
            // Otherwise assume it's the data array
            return json as T[];
        } catch (error) {
            console.error('Network Error:', error);
            return [];
        }
    },

    /**
     * Retrieve HR report for admin dashboard.
     * 
     * @api GET ?action=getHRReport
     * @param month - Target month in 'YYYY-MM' format (optional)
     * @returns Array of HRReportItem
     */
    async getHRReport(month?: string): Promise<HRReportItem[]> {
        if (!GOOGLE_SCRIPT_URL) return [];
        try {
            let url = `${GOOGLE_SCRIPT_URL}?action=${API_ACTIONS.GET_HR_REPORT}&t=${Date.now()}`;
            if (month) url += `&month=${month}`;
            const response = await this.fetchWithRetry(url);
            const json = await response.json() as BackendResponse | HRReportItem[];

            if (json && !Array.isArray(json) && (json as BackendResponse).status) return [];
            return json as HRReportItem[];
        } catch (error) {
            console.error('HR Report Error:', error);
            return [];
        }
    },

    /**
     * Add a new row to a sheet.
     * 
     * @api POST ?action=addRow
     * @param sheetName - Target sheet name
     * @param data - Row data object
     * @param role - User role for authorization
     * @returns BackendResponse { success: boolean, message?: string }
     */
    async addRow<T>(sheetName: string, data: T, role: string): Promise<{ success: boolean; message?: string }> {
        if (!GOOGLE_SCRIPT_URL) return { success: false, message: 'URL missing' };

        try {
            const response = await this.fetchWithRetry(`${GOOGLE_SCRIPT_URL}?action=${API_ACTIONS.ADD_ROW}&sheetName=${sheetName}&role=${encodeURIComponent(role)}`, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(data)
            }, NETWORK.TIMEOUT_LONG);

            const json = await response.json() as BackendResponse;
            return { success: json.status === STATUS.SUCCESS, message: json.message };
        } catch (error) {
            console.error('Save Error:', error);
            return { success: false, message: 'خطأ في الاتصال' };
        }
    },

    /**
     * Get the oldest available barcode for a branch and category.
     * 
     * @api GET ?action=getAvailableBarcode
     * @param branchId - Branch identifier
     * @param category - Stock category
     * @returns Barcode string or null
     */
    async getAvailableBarcode(branchId: string, category: string): Promise<string | null> {
        if (!GOOGLE_SCRIPT_URL) return null;
        try {
            const response = await this.fetchWithRetry(`${GOOGLE_SCRIPT_URL}?action=${API_ACTIONS.GET_AVAILABLE_BARCODE}&branch=${branchId}&category=${category}&t=${Date.now()}`);
            const json = await response.json() as BackendResponse;
            return json.status === STATUS.SUCCESS && json.barcode ? json.barcode : null;
        } catch (error) {
            console.error('Fetch Barcode Error:', error);
            return null;
        }
    },

    /**
     * Add a batch of stock items.
     * 
     * @api POST ?action=addStockBatch
     * @param items - Array of stock items
     * @param role - User role for authorization
     * @returns boolean (success/failure)
     */
    async addStockBatch(items: Partial<StockItem>[], role: string): Promise<boolean> {
        if (!GOOGLE_SCRIPT_URL) return false;
        try {
            const response = await this.fetchWithRetry(`${GOOGLE_SCRIPT_URL}?action=${API_ACTIONS.ADD_STOCK_BATCH}&role=${encodeURIComponent(role)}`, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(items)
            });
            const json = await response.json() as BackendResponse;
            return json.status === STATUS.SUCCESS;
        } catch (error) {
            console.error('Add Stock Error:', error);
            return false;
        }
    },

    /**
     * Update status of a stock item (e.g., mark as used).
     * 
     * @api POST ?action=updateStockStatus
     * @param barcode - Item barcode
     * @param status - New status
     * @param usedBy - User who used the item
     * @param role - User role
     * @param orderId - Associated order ID (optional)
     * @returns boolean (success/failure)
     */
    async updateStockStatus(barcode: string, status: string, usedBy: string, role: string, orderId?: string): Promise<boolean> {
        if (!GOOGLE_SCRIPT_URL) return false;
        try {
            const response = await this.fetchWithRetry(`${GOOGLE_SCRIPT_URL}?action=${API_ACTIONS.UPDATE_STOCK_STATUS}&role=${encodeURIComponent(role)}`, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ barcode, status, usedBy, orderId })
            }, NETWORK.TIMEOUT_LONG);
            const json = await response.json() as BackendResponse;
            return json.status === STATUS.SUCCESS;
        } catch (error) {
            console.error('Update Stock Error:', error);
            return false;
        }
    },

    /**
     * Update an existing entry or expense.
     * 
     * @api POST ?action=updateEntry
     * @param sheetName - 'Entries' or 'Expenses'
     * @param data - Updated data fields
     * @param role - User role
     * @returns boolean (success/failure)
     */
    async updateEntry(sheetName: string, data: Partial<ServiceEntry> | Partial<Expense>, role: string): Promise<boolean> {
        if (!GOOGLE_SCRIPT_URL) return false;
        try {
            const response = await this.fetchWithRetry(`${GOOGLE_SCRIPT_URL}?action=${API_ACTIONS.UPDATE_ENTRY}&sheetName=${sheetName}&role=${encodeURIComponent(role)}`, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(data)
            }, NETWORK.TIMEOUT_LONG);
            const json = await response.json() as BackendResponse;
            return json.status === STATUS.SUCCESS;
        } catch (error) {
            console.error('Update Entry Error:', error);
            return false;
        }
    },

    /**
     * Update stock item details (barcode or branch).
     * 
     * @api POST ?action=updateStockItem
     * @param oldBarcode - Current barcode
     * @param newBarcode - New barcode
     * @param newBranch - New branch ID
     * @param role - User role
     * @returns boolean (success/failure)
     */
    async updateStockItem(oldBarcode: string, newBarcode: string, newBranch: string, role: string): Promise<boolean> {
        if (!GOOGLE_SCRIPT_URL) return false;
        try {
            const response = await this.fetchWithRetry(`${GOOGLE_SCRIPT_URL}?action=${API_ACTIONS.UPDATE_STOCK_ITEM}&role=${encodeURIComponent(role)}`, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ oldBarcode, newBarcode, newBranch })
            });
            const json = await response.json() as BackendResponse;
            return json.status === STATUS.SUCCESS;
        } catch (error) {
            console.error('Update Stock Error:', error);
            return false;
        }
    },

    /**
     * Delete a stock item.
     * 
     * @api POST ?action=deleteStockItem
     * @param barcode - Item barcode
     * @param role - User role
     * @returns boolean (success/failure)
     */
    async deleteStockItem(barcode: string, role: string): Promise<boolean> {
        if (!GOOGLE_SCRIPT_URL) return false;
        try {
            const response = await this.fetchWithRetry(`${GOOGLE_SCRIPT_URL}?action=${API_ACTIONS.DELETE_STOCK_ITEM}&role=${encodeURIComponent(role)}`, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ barcode })
            });
            const json = await response.json() as BackendResponse;
            return json.status === STATUS.SUCCESS;
        } catch (error) {
            console.error('Delete Stock Error:', error);
            return false;
        }
    },

    /**
     * Fetch client IP address from ipify.
     * 
     * @returns IP address string or '0.0.0.0' on failure
     */
    async fetchClientIP(): Promise<string | null> {
        try {
            const response = await this.fetchWithRetry(EXTERNAL_LINKS.IP_API, {}, NETWORK.TIMEOUT_SHORT);
            const data = await response.json() as { ip: string };
            return data.ip;
        } catch (error) {
            console.error("Error fetching IP:", error);
            return '0.0.0.0';
        }
    },

    /**
     * Record employee attendance (check-in/out).
     * 
     * @api POST ?action=attendance
     * @param users_ID - User ID
     * @param username - User name
     * @param branchId - Branch ID
     * @param type - 'check-in' or 'check-out'
     * @param ip - Client IP
     * @returns Object { success, message?, timestamp? }
     */
    async recordAttendance(users_ID: string, username: string, branchId: string, type: 'check-in' | 'check-out', ip: string): Promise<{ success: boolean; message?: string; timestamp?: string }> {
        if (!GOOGLE_SCRIPT_URL) return { success: false, message: 'URL missing' };
        try {
            const response = await this.fetchWithRetry(`${GOOGLE_SCRIPT_URL}?action=${API_ACTIONS.ATTENDANCE}`, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ users_ID, username, branchId, type, ip })
            });
            const data = await response.json() as BackendResponse;
            if (data.status === STATUS.SUCCESS) {
                return { success: true, timestamp: data.timestamp };
            } else {
                return { success: false, message: data.message || 'فشل تسجيل الحضور' };
            }
        } catch (error) {
            console.error("Error recording attendance:", error);
            return { success: false, message: 'خطأ في الاتصال' };
        }
    },

    /**
     * Mark an order as delivered and collect remaining amount.
     * 
     * @api POST ?action=deliverOrder
     * @param orderId - Entry ID
     * @param remainingCollected - Amount collected
     * @param clientName - Client name
     * @param collectorName - Employee name
     * @param branchId - Branch ID
     * @returns boolean (success/failure)
     */
    async deliverOrder(orderId: string, remainingCollected: number, clientName: string, collectorName: string, branchId: string): Promise<boolean> {
        if (!GOOGLE_SCRIPT_URL) return false;
        try {
            const response = await this.fetchWithRetry(`${GOOGLE_SCRIPT_URL}?action=${API_ACTIONS.DELIVER_ORDER}`, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ orderId, remainingCollected, clientName, collectorName, branchId })
            });
            const json = await response.json() as BackendResponse;
            return json.status === STATUS.SUCCESS;
        } catch (error) {
            console.error('Deliver Order Error:', error);
            return false;
        }
    },

    /**
     * Get detailed attendance logs for a user.
     * 
     * @api GET ?action=getUserLogs
     * @param username - User name
     * @param month - Target month 'YYYY-MM' (optional)
     * @returns Array of UserLogEntry
     */
    async getUserLogs(username: string, month?: string): Promise<UserLogEntry[]> {
        if (!GOOGLE_SCRIPT_URL) return [];
        try {
            let url = `${GOOGLE_SCRIPT_URL}?action=${API_ACTIONS.GET_USER_LOGS}&username=${encodeURIComponent(username)}&t=${Date.now()}`;
            if (month) url += `&month=${month}`;
            const response = await this.fetchWithRetry(url);
            const json = await response.json() as BackendResponse | UserLogEntry[];

            if (json && !Array.isArray(json) && (json as BackendResponse).status) return [];
            return json as UserLogEntry[];
        } catch (error) {
            console.error('Get User Logs Error:', error);
            return [];
        }
    },

    /**
     * Get all branches configuration.
     * 
     * @api GET ?action=getBranches
     * @returns Array of Branch objects
     */
    async getBranches(): Promise<Branch[]> {
        if (!GOOGLE_SCRIPT_URL) return [];
        try {
            const response = await this.fetchWithRetry(`${GOOGLE_SCRIPT_URL}?action=${API_ACTIONS.GET_BRANCHES}&t=${Date.now()}`);
            const json = await response.json() as BackendResponse | Branch[];
            if (json && !Array.isArray(json) && (json as BackendResponse).status) return [];
            return json as Branch[];
        } catch (error) {
            console.error('Get Branches Error:', error);
            return [];
        }
    },

    /**
     * Transfer funds between branches.
     * 
     * @api POST ?action=branchTransfer
     * @param data - { fromBranch, toBranch, amount, recordedBy }
     * @param role - User role
     * @returns Object { success, message? }
     */
    async branchTransfer(data: { fromBranch: string, toBranch: string, amount: number, recordedBy: string }, role?: string): Promise<{ success: boolean; message?: string }> {
        if (!GOOGLE_SCRIPT_URL) return { success: false, message: 'URL missing' };
        try {
            let url = `${GOOGLE_SCRIPT_URL}?action=${API_ACTIONS.BRANCH_TRANSFER}`;
            if (role) url += `&role=${encodeURIComponent(role)}`;

            const response = await this.fetchWithRetry(url, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(data)
            }, NETWORK.TIMEOUT_LONG);
            const json = await response.json() as BackendResponse;
            return { success: json.status === STATUS.SUCCESS, message: json.message };
        } catch (error) {
            console.error('Transfer Error:', error);
            return { success: false, message: 'فشل عملية التحويل' };
        }
    },

    /**
     * Delete an expense entry.
     * 
     * @api POST ?action=deleteExpense
     * @param id - Expense ID
     * @returns Object { success, message? }
     */
    async deleteExpense(id: string): Promise<{ success: boolean; message?: string }> {
        if (!GOOGLE_SCRIPT_URL) return { success: false, message: 'URL missing' };
        try {
            const response = await this.fetchWithRetry(`${GOOGLE_SCRIPT_URL}?action=${API_ACTIONS.DELETE_EXPENSE}`, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ id })
            }, NETWORK.TIMEOUT_LONG);
            const json = await response.json() as BackendResponse;
            return { success: json.status === STATUS.SUCCESS, message: json.message };
        } catch (error) {
            console.error('Delete Expense Error:', error);
            return { success: false, message: 'فشل حذف المصروف' };
        }
    },

    /**
     * Add/Update/Delete users.
     * 
     * @api POST ?action=manageUsers
     * @param data - { type: 'add'|'update'|'delete', user?, id? }
     * @param role - User role (must be admin)
     * @returns Object { success, message? }
     */
    async manageUsers(data: { type: 'add' | 'update' | 'delete', user?: Partial<User>, id?: string }, role: string): Promise<{ success: boolean; message?: string }> {
        if (!GOOGLE_SCRIPT_URL) return { success: false, message: 'URL missing' };
        try {
            const response = await this.fetchWithRetry(`${GOOGLE_SCRIPT_URL}?action=${API_ACTIONS.MANAGE_USERS}&role=${encodeURIComponent(role)}`, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(data)
            }, NETWORK.TIMEOUT_LONG);
            const json = await response.json() as BackendResponse;
            return { success: json.status === STATUS.SUCCESS, message: json.message };
        } catch (error) {
            return { success: false, message: 'خطأ في الاتصال بالسيرفر' };
        }
    },

    /**
     * Add/Delete branches.
     * 
     * @api POST ?action=manageBranches
     * @param data - { type: 'add'|'delete', branch?, name? }
     * @param role - User role (must be admin)
     * @returns Object { success, message? }
     */
    async manageBranches(data: { type: 'add' | 'delete', branch?: { name: string, ip?: string }, name?: string }, role: string): Promise<{ success: boolean; message?: string }> {
        if (!GOOGLE_SCRIPT_URL) return { success: false, message: 'URL missing' };
        try {
            const response = await this.fetchWithRetry(`${GOOGLE_SCRIPT_URL}?action=${API_ACTIONS.MANAGE_BRANCHES}&role=${encodeURIComponent(role)}`, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(data)
            }, NETWORK.TIMEOUT_LONG);
            const json = await response.json() as BackendResponse;
            return { success: json.status === STATUS.SUCCESS, message: json.message };
        } catch (error) {
            return { success: false, message: 'خطأ في الاتصال بالسيرفر' };
        }
    },

    /**
     * Update application settings (dropdown lists).
     * 
     * @api POST ?action=updateSettings
     * @param data - { serviceList: string, expenseList: string }
     * @param role - User role (must be admin)
     * @returns Object { success, message? }
     */
    async updateSettings(data: { serviceList: string, expenseList: string }, role: string): Promise<{ success: boolean; message?: string }> {
        if (!GOOGLE_SCRIPT_URL) return { success: false, message: 'URL missing' };
        try {
            const response = await this.fetchWithRetry(`${GOOGLE_SCRIPT_URL}?action=${API_ACTIONS.UPDATE_SETTINGS}&role=${encodeURIComponent(role)}`, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(data)
            }, NETWORK.TIMEOUT_LONG);
            const json = await response.json() as BackendResponse;
            return { success: json.status === STATUS.SUCCESS, message: json.message };
        } catch (error) {
            return { success: false, message: 'خطأ في الاتصال بالسيرفر' };
        }
    }
};
