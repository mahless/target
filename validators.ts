import { ServiceEntry } from './types';
import { normalizeArabic } from './utils';

export interface ServiceValidationContext {
    serviceType: string;
    isOtherService: boolean;
    isSellingForm: boolean;
    nationalId: string;
    phoneNumber: string;
    isElectronic: boolean;
    electronicMethod: string;
    electronicAmount: number;
    amountPaid: number;
    speed: string;
    isExternalBarcode: boolean;
    barcode: string;
    entries: ServiceEntry[];
}

/**
 * Validates the service form submission based on strict business rules.
 * Returns an error message string if any validation fails, or null if successful.
 * 
 * Order of checks:
 * 1. National ID Length (14 digits)
 * 2. Service Type Selection
 * 3. Phone Number Format (must start with 0)
 * 4. Electronic Payment Method Selection
 * 5. Electronic Payment Amount Logic
 * 6. Speed Selection (for specific services)
 * 7. Duplicate External Barcode
 * 8. Internal Barcode Availability
 */
export const validateServiceSubmission = (ctx: ServiceValidationContext): string | null => {
    const {
        serviceType,
        isOtherService,
        isSellingForm,
        nationalId,
        phoneNumber,
        isElectronic,
        electronicMethod,
        electronicAmount,
        amountPaid,
        speed,
        isExternalBarcode,
        barcode,
        entries
    } = ctx;

    // 1. National ID Check
    if (!isOtherService && !isSellingForm && nationalId.length !== 14) {
        return "الرقم القومي يجب أن يكون 14 رقم";
    }

    // 2. Service Type Check
    if (!serviceType) {
        return "يرجى اختيار نوع الخدمة من القائمة";
    }

    // 3. Phone Number Check
    if (!isOtherService && !isSellingForm && !phoneNumber.startsWith('0')) {
        return " رقم الهاتف يجب أن يبدأ بصفر (0)";
    }

    // 4. Electronic Method Check
    if (isElectronic && (!electronicMethod || electronicMethod === '')) {
        return "يرجى اختيار وسيلة التحصيل الإلكتروني";
    }

    // 5. Electronic Amount Logic
    if (isElectronic && electronicAmount > amountPaid) {
        return "خطأ: مبلغ التحصيل الإلكتروني لا يمكن أن يكون أكبر من إجمالي المبلغ المحصل.";
    }

    // 6. Speed Selection Check
    if ((serviceType === 'بطاقة رقم قومي' || serviceType === 'جواز سفر') && !speed) {
        return "يرجى اختيار سرعة تنفيذ الخدمة (عادي/مستعجل/فوري)";
    }

    // 7. Duplicate External Barcode Check
    if (isExternalBarcode && barcode) {
        const duplicate = entries.find(e => e.barcode === barcode);
        if (duplicate) {
            return `هذا الباركود (${barcode}) مسجل مسبقاً للعميل ${duplicate.clientName}`;
        }
    }

    // 8. Internal Barcode Availability Check
    if (serviceType === 'بطاقة رقم قومي' && !isExternalBarcode && !barcode) {
        return " لا يمكن إتمام المعاملة؛ مخزن الباركود فارغ ...";
    }

    return null;
};
