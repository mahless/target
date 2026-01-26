import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ServiceEntry } from '../types';

export const generateReceipt = async (entry: ServiceEntry) => {
  // 1. Create a temporary container for the receipt
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '148mm'; // A5 Width
  container.dir = 'rtl';

  // 2. Define the HTML structure for the receipt
  container.innerHTML = `
    <div style="padding: 15mm; background: white; font-family: 'Cairo', sans-serif; color: #1f2937; line-height: 1.5;">
      <div style="text-align: center; margin-bottom: 10mm; border-bottom: 2px solid #1e40af; padding-bottom: 5mm;">
        <h1 style="font-size: 24pt; margin: 0; color: #1e40af;">تارجت للخدمات الحكومية</h1>
        <p style="font-size: 14pt; margin: 5px 0; color: #6b7280;">Target Government Services</p>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 10mm;">
        <div>
           <p style="margin: 2px 0;"><strong>رقم الإيصال:</strong> #${entry.id.substring(0, 8)}</p>
           <p style="margin: 2px 0;"><strong>التاريخ:</strong> ${entry.entryDate}</p>
        </div>
        <div style="text-align: left;">
           <p style="margin: 2px 0;"><strong>الموظف:</strong> ${entry.recordedBy}</p>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 10mm;">
        <thead>
          <tr style="background-color: #1e40af; color: white;">
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: right;">البيان</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: center;">التفاصيل</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px; border: 1px solid #d1d5db; font-weight: bold;">اسم العميل</td>
            <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">${entry.clientName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #d1d5db; font-weight: bold;">الرقم القومي</td>
            <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">${entry.nationalId}</td>
          </tr>
           <tr>
            <td style="padding: 8px; border: 1px solid #d1d5db; font-weight: bold;">رقم الهاتف</td>
            <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">${entry.phoneNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #d1d5db; font-weight: bold;">نوع الخدمة</td>
            <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">${entry.serviceType}</td>
          </tr>
          ${entry.barcode ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #d1d5db; font-weight: bold;">الباركود</td>
            <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center; font-family: monospace;">${entry.barcode}</td>
          </tr>` : ''}
          <tr style="background-color: #f9fafb;">
            <td style="padding: 8px; border: 1px solid #d1d5db; font-weight: bold;">إجمالي التكلفة</td>
            <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center; font-weight: bold;">${entry.serviceCost} ج.م</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #d1d5db; font-weight: bold; color: #065f46;">المبلغ المحصل</td>
            <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center; font-weight: bold; color: #065f46;">${entry.amountPaid} ج.م</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #d1d5db; font-weight: bold; color: #991b1b;">المتبقي</td>
            <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center; font-weight: bold; color: #991b1b;">${entry.remainingAmount} ج.م</td>
          </tr>
        </tbody>
      </table>

      <div style="display: flex; justify-content: space-between; margin-top: 15mm; align-items: flex-end;">
         <div style="text-align: center;">
            <p style="margin-bottom: 10mm; font-weight: bold;">توقيع العميل</p>
            <div style="border-top: 1px solid #374151; width: 40mm;"></div>
         </div>
         <div style="text-align: center;">
            <p style="margin-bottom: 10mm; font-weight: bold;">ختم المكتب</p>
            <div style="border: 2px dashed #d1d5db; width: 30mm; height: 30mm; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #d1d5db; font-size: 8pt;">Target Seal</div>
         </div>
      </div>

      <p style="text-align: center; margin-top: 15mm; font-size: 10pt; color: #9ca3af;">شكراً لاختياركم تارجت للخدمات الحكومية</p>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // 3. Capture the element with html2canvas
    const canvas = await html2canvas(container, {
      scale: 2, // تم تقليل القشور لتقليل حجم الملف مع الحفاظ على الجودة
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // استخدام JPEG بدلاً من PNG مع جودة 0.8 لتقليل الحجم بشكل كبير
    const imgData = canvas.toDataURL('image/jpeg', 0.8);

    // 4. Generate PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5',
      compress: true // تفعيل الضغط الداخلي في jspdf
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    // 5. Save and Cleanup
    pdf.save(`تارجت_إيصال_${entry.clientName}.pdf`);
  } catch (error) {
    console.error('PDF Generation Error:', error);
  } finally {
    document.body.removeChild(container);
  }
};