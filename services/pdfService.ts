import { ServiceEntry } from '../types';

export const generateReceiptHtml = (entry: ServiceEntry): string => {
  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>إيصال تارجت</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        
        @page {
          size: A5 portrait;
          margin: 5mm;
        }
        
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        body {
          margin: 0;
          padding: 0;
          font-family: 'Cairo', sans-serif;
          background: white;
          color: black;
          font-size: 10pt;
        }

        .container {
          max-width: 148mm;
          margin: 0 auto;
          border: 2px solid #000;
          padding: 10px;
        }

        /* Header */
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }

        .company-name {
          font-size: 16pt;
          font-weight: 900;
          margin: 0 0 3px 0;
          line-height: 1.2;
        }

        .branch-name {
          font-size: 10pt;
          font-weight: 700;
          margin: 0;
          color: #333;
        }

        .meta-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
          font-size: 9pt;
          margin-top: 5px;
        }

        .meta-item {
          font-weight: 700;
        }

        /* Content Table - 2 columns */
        .content-table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
          border: 2px solid #000;
        }

        .content-table th {
          background-color: #f0f0f0;
          border: 2px solid #000;
          padding: 5px;
          font-size: 12pt;
          font-weight: 900;
        }

        .content-table td {
          border: 2px solid #000;
          padding: 8px;
          font-size: 10pt;
          font-weight: 700;
          vertical-align: top;
        }

        .label {
          font-size: 9pt;
          color: #555;
          font-weight: 600;
          display: block;
          margin-bottom: 2px;
        }

        .value {
          font-size: 10pt;
          font-weight: 700;
          display: block;
        }

        /* Footer */
        .footer {
          border-top: 2px solid #000;
          padding-top: 8px;
          margin-top: 10px;
        }

        .totals-section {
          display: flex;
          gap: 15px;
          justify-content: space-around;
          background: #f9f9f9;
          padding: 8px;
          border-radius: 5px;
          border: 1px solid #ddd;
          margin-bottom: 10px;
        }

        .total-item {
          text-align: center;
        }

        .total-label {
          font-size: 8pt;
          color: #555;
          font-weight: 700;
          display: block;
        }

        .total-value {
          font-size: 12pt;
          font-weight: 900;
          display: block;
          margin-top: 2px;
        }

        /* Compact Signatures - Horizontal */
        .signatures {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-top: 10px;
        }

        .signature-box {
          flex: 1;
          border-top: 1px dashed #000;
          padding-top: 3px;
          text-align: center;
          font-size: 9pt;
          font-weight: 700;
        }

        @media print {
           body {
             width: 148mm;
           }
        }
      </style>
    </head>
    <body onload="window.print()">
      <div class="container">
        
        <!-- Header -->
        <div class="header">
          <h1 class="company-name">تارجت للخدمات الحكومية</h1>
          <p class="branch-name">فرع: ${entry.branchId || 'الرئيسي'}</p>
          <div class="meta-info">
            <div class="meta-item">التاريخ: ${entry.entryDate}</div>
            <div class="meta-item">رقم: #${entry.id.substring(entry.id.length - 6)}</div>
            <div class="meta-item">الوقت: ${new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
            <div class="meta-item">الموظف: ${entry.recordedBy}</div>
          </div>
        </div>

        <!-- Content Table - Single Column -->
        <table class="content-table">
          <tbody>
            <tr>
              <td colspan="2">
                <span class="label">اسم العميل:</span>
                <span class="value">${entry.clientName}</span>
              </td>
            </tr>
            <tr>
              <td style="width: 50%;">
                <span class="label">رقم الهاتف:</span>
                <span class="value" style="font-size: 9pt;">${entry.phoneNumber || '-'}</span>
              </td>
              <td style="width: 50%;">
                <span class="label">الرقم القومي:</span>
                <span class="value" style="font-size: 9pt;">${entry.nationalId}</span>
              </td>
            </tr>
            <tr>
              <td style="width: 50%;">
                <span class="label">نوع الخدمة:</span>
                <span class="value">${entry.serviceType}</span>
              </td>
              <td style="width: 50%;">
                <span class="label">الباركود:</span>
                <span class="value" style="font-family: monospace; font-size: 9pt;">${entry.barcode || '-'}</span>
              </td>
            </tr>
            ${entry.notes ? `
            <tr>
              <td colspan="2">
                <span class="label">ملاحظات:</span>
                <span class="value" style="font-size: 9pt;">${entry.notes}</span>
              </td>
            </tr>` : ''}
          </tbody>
        </table>

        <!-- Footer -->
        <div class="footer">
          <div class="totals-section">
            <div class="total-item">
              <span class="total-label">الإجمالي</span>
              <span class="total-value">${entry.serviceCost} EGP</span>
            </div>
            <div class="total-item">
              <span class="total-label">المدفوع</span>
              <span class="total-value" style="color: green;">${entry.amountPaid} EGP</span>
            </div>
            <div class="total-item">
              <span class="total-label">المتبقي</span>
              <span class="total-value" style="color: ${entry.remainingAmount > 0 ? 'red' : '#000'}">${entry.remainingAmount} EGP</span>
            </div>
          </div>

          <div class="signatures">
            <div class="signature-box">ختم الشركة</div>
            <div class="signature-box">توقيع المستلم</div>
          </div>
        </div>

      </div>
      
      <script>
        window.onload = function() {
           setTimeout(function() {
             // Print triggered by parent
           }, 500);
        }
      </script>
    </body>
    </html>
  `;
};

export const generateReceipt = async (entry: ServiceEntry): Promise<void> => {
  return new Promise((resolve) => {
    // 1. Create invisible iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed'; // Fixed to avoid affecting layout
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden'; // Hide it

    document.body.appendChild(iframe);

    // 2. Get the HTML
    const htmlContent = generateReceiptHtml(entry);

    // 3. Write to iframe
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      // 4. Print logic
      // We use a small timeout to let the iframe render content including fonts
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error("Printing failed", e);
        } finally {
          // Resolve immediately so UI can unblock,
          // but keep iframe for a moment to ensure print dialog grabs it?
          // Actually, removing iframe immediately after print() calls might break it in some browsers
          // if the dialog relies on the DOM.
          // Safe to remove after a minute or reuse. 
          // For simplicity in this task, let's remove it after a delay.
          resolve();

          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 10000); // 10 seconds should be enough for the spooler to pick it up or dialog to open
        }
      }, 500); // 500ms delay for rendering
    } else {
      resolve(); // Should not happen
    }
  });
};