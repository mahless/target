import { ServiceEntry, Expense, Branch, User, LoginResponse } from '../types';

// سنقوم بتحديث هذا الرابط "Web App URL" لاحقاً
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw9tgRY5Bm7AuwcHrxCpmDFiCEobYkdWEG5Iz7zUEZEjUaZGpLgYlbW7BHGXvrPTVzr/exec';

export const GoogleSheetsService = {
    /**
     * تسجيل الدخول والتحقق من الهوية
     */
    async login(id: string, password: string): Promise<LoginResponse> {
        if (!GOOGLE_SCRIPT_URL) return { success: false, message: 'URL missing' };
        try {
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=login&id=${id}&password=${password}`);
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
            // التحويل ليتوافق مع getData في backend.gs
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getData&sheetName=${sheetName}&t=${Date.now()}`);
            const json = await response.json();

            if (json && !json.status) { // الـ backend.gs يعيد مصفوفة مباشرة في حالة النجاح
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
     * حفظ صف جديد في ورقة محددة
     */
    async addRow(sheetName: string, data: any, role: string): Promise<boolean> {
        if (!GOOGLE_SCRIPT_URL) return false;

        try {
            // التحويل ليتوافق مع addRow في backend.gs
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=addRow&sheetName=${sheetName}&role=${encodeURIComponent(role)}`, {
                method: 'POST',
                headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                },
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
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAvailableBarcode&branch=${branchId}&category=${category}&t=${Date.now()}`);
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
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=addStockBatch&role=${encodeURIComponent(role)}`, {
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
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=updateStockStatus&role=${encodeURIComponent(role)}`, {
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
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=updateEntry&sheetName=${sheetName}&role=${encodeURIComponent(role)}`, {
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
    }
};
