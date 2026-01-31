import { ServiceEntry, Expense, Branch, User, LoginResponse } from '../types';

// سنقوم بتحديث هذا الرابط "Web App URL" لاحقاً
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzZPcN93a8EcbxVsFfaxI8XexGRAl5p6Wlhkb5N5sWVnBWQc2hhclq7WpspzcuioT3H/exec';

export const GoogleSheetsService = {
    /**
     * Helper for fetch with timeout
     */
    async fetchWithTimeout(url: string, options: any = {}, timeout: number = 10000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    },

    /**
     * تسجيل الدخول والتحقق من الهوية
     */
    async login(id: string, password: string): Promise<LoginResponse> {
        if (!GOOGLE_SCRIPT_URL) return { success: false, message: 'URL missing' };
        try {
            const response = await this.fetchWithTimeout(`${GOOGLE_SCRIPT_URL}?action=login&id=${id}&password=${password}`);
            return await response.json();
        } catch (error) {
            return { success: false, message: 'فشل الاتصال بالسيرفر' };
        }
    },

    /**
     * جلب البيانات من ورقة محددة
     */
    async getData<T>(sheetName: string): Promise<T[]> {
        if (!GOOGLE_SCRIPT_URL) {
            console.warn('Google Script URL is missing');
            return [];
        }

        try {
            const response = await this.fetchWithTimeout(`${GOOGLE_SCRIPT_URL}?action=getData&sheetName=${sheetName}&t=${Date.now()}`);
            const json = await response.json();

            if (json && !json.status) {
                return json as T[];
            }
            console.error('Sheet API Error:', json.message);
            return [];
        } catch (error) {
            console.error('Network Error:', error);
            return [];
        }
    },

    /**
     * جلب تقرير HR (ساعات الموظفين) للمدير
     */
    async getHRReport(): Promise<any[]> {
        if (!GOOGLE_SCRIPT_URL) return [];
        try {
            const response = await this.fetchWithTimeout(`${GOOGLE_SCRIPT_URL}?action=getHRReport&t=${Date.now()}`);
            const json = await response.json();
            if (json && !json.status) return json;
            return [];
        } catch (error) {
            console.error('HR Report Error:', error);
            return [];
        }
    },

    /**
     * حفظ صف جديد في ورقة محددة
     */
    async addRow(sheetName: string, data: any, role: string): Promise<boolean> {
        if (!GOOGLE_SCRIPT_URL) return false;

        try {
            const response = await this.fetchWithTimeout(`${GOOGLE_SCRIPT_URL}?action=addRow&sheetName=${sheetName}&role=${encodeURIComponent(role)}`, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(data)
            });

            const json = await response.json();
            return json.status === 'success';
        } catch (error) {
            console.error('Save Error:', error);
            return false;
        }
    },

    /**
     * جلب أقدم باركود متاح لفرع وفئة محددة
     */
    async getAvailableBarcode(branchId: string, category: string): Promise<string | null> {
        if (!GOOGLE_SCRIPT_URL) return null;
        try {
            const response = await this.fetchWithTimeout(`${GOOGLE_SCRIPT_URL}?action=getAvailableBarcode&branch=${branchId}&category=${category}&t=${Date.now()}`);
            const json = await response.json();
            return json.status === 'success' ? json.barcode : null;
        } catch (error) {
            console.error('Fetch Barcode Error:', error);
            return null;
        }
    },

    /**
     * إضافة دفعة باركودات جديدة للمخزن
     */
    async addStockBatch(items: any[], role: string): Promise<boolean> {
        if (!GOOGLE_SCRIPT_URL) return false;
        try {
            const response = await this.fetchWithTimeout(`${GOOGLE_SCRIPT_URL}?action=addStockBatch&role=${encodeURIComponent(role)}`, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(items)
            });
            const json = await response.json();
            return json.status === 'success';
        } catch (error) {
            console.error('Add Stock Error:', error);
            return false;
        }
    },

    /**
     * تحديث حالة الباركود (مستخدم، خطأ، إلخ)
     */
    async updateStockStatus(barcode: string, status: string, usedBy: string, role: string, orderId?: string): Promise<boolean> {
        if (!GOOGLE_SCRIPT_URL) return false;
        try {
            const response = await this.fetchWithTimeout(`${GOOGLE_SCRIPT_URL}?action=updateStockStatus&role=${encodeURIComponent(role)}`, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ barcode, status, usedBy, orderId })
            });
            const json = await response.json();
            return json.status === 'success';
        } catch (error) {
            console.error('Update Stock Error:', error);
            return false;
        }
    },

    /**
     * تحديث بيانات معاملة موجودة (مثل الإلغاء)
     */
    async updateEntry(sheetName: string, data: any, role: string): Promise<boolean> {
        if (!GOOGLE_SCRIPT_URL) return false;
        try {
            const response = await this.fetchWithTimeout(`${GOOGLE_SCRIPT_URL}?action=updateEntry&sheetName=${sheetName}&role=${encodeURIComponent(role)}`, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(data)
            });
            const json = await response.json();
            return json.status === 'success';
        } catch (error) {
            console.error('Update Entry Error:', error);
            return false;
        }
    },

    /**
     * تحديث بيانات باركود (الرقم أو الفرع)
     */
    async updateStockItem(oldBarcode: string, newBarcode: string, newBranch: string, role: string): Promise<boolean> {
        if (!GOOGLE_SCRIPT_URL) return false;
        try {
            const response = await this.fetchWithTimeout(`${GOOGLE_SCRIPT_URL}?action=updateStockItem&role=${encodeURIComponent(role)}`, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ oldBarcode, newBarcode, newBranch })
            });
            const json = await response.json();
            return json.status === 'success';
        } catch (error) {
            console.error('Update Stock Error:', error);
            return false;
        }
    },

    /**
     * حذف باركود من المخزن
     */
    async deleteStockItem(barcode: string, role: string): Promise<boolean> {
        if (!GOOGLE_SCRIPT_URL) return false;
        try {
            const response = await this.fetchWithTimeout(`${GOOGLE_SCRIPT_URL}?action=deleteStockItem&role=${encodeURIComponent(role)}`, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ barcode })
            });
            const json = await response.json();
            return json.status === 'success';
        } catch (error) {
            console.error('Delete Stock Error:', error);
            return false;
        }
    },

    /**
     * جلب عنوان IP العميل (Frontend)
     */
    async fetchClientIP(): Promise<string | null> {
        try {
            const response = await this.fetchWithTimeout('https://api.ipify.org?format=json', {}, 3000);
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.error("Error fetching IP:", error);
            return '0.0.0.0';
        }
    },

    /**
     * تسجيل الحضور أو الانصراف
     */
    async recordAttendance(username: string, branchId: string, type: 'check-in' | 'check-out', ip: string): Promise<{ success: boolean; message?: string; timestamp?: string }> {
        if (!GOOGLE_SCRIPT_URL) return { success: false, message: 'URL missing' };
        try {
            const response = await this.fetchWithTimeout(`${GOOGLE_SCRIPT_URL}?action=attendance`, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ username, branchId, type, ip })
            });
            const data = await response.json();
            if (data.status === 'success') {
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
     * تسليم المعاملة وتحصيل المتبقي
     */
    async deliverOrder(orderId: string, remainingCollected: number, clientName: string, collectorName: string, branchId: string): Promise<boolean> {
        if (!GOOGLE_SCRIPT_URL) return false;
        try {
            const response = await this.fetchWithTimeout(`${GOOGLE_SCRIPT_URL}?action=deliverOrder`, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ orderId, remainingCollected, clientName, collectorName, branchId })
            });
            const json = await response.json();
            return json.status === 'success';
        } catch (error) {
            console.error('Deliver Order Error:', error);
            return false;
        }
    }
};
