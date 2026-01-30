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
          size: A5 landscape;
          margin: 0;
        }
        
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        body {
          margin: 0;
          padding: 5mm;
          font-family: 'Cairo', sans-serif;
          background: white;
          color: black;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          position: relative;
        }

        .container {
          width: 100%;
          height: 100%;
          border: 2px solid #000;
          padding: 15px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: transparent;
        }

        /* Header Grid: Logo (Right), Info (Center), Meta (Left) */
        .header {
          display: grid;
          grid-template-columns: 1fr 2fr 1fr;
          gap: 20px;
          align-items: center;
          border-bottom: 2px solid #000;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }

        .logo-section {
          text-align: right;
        }
        
        .company-info {
          text-align: center;
        }

        .company-name {
          font-size: 24pt;
          font-weight: 900;
          margin: 0;
          line-height: 1.2;
        }

        .branch-name {
          font-size: 14pt;
          font-weight: 700;
          margin-top: 5px;
          color: #333;
        }

        .meta-info {
          text-align: left;
          font-size: 10pt;
        }

        .meta-item {
          margin-bottom: 5px;
          font-weight: 700;
        }

        /* Main Content Table */
        .content-table {
          width: 100%;
          border-collapse: collapse;
          flex-grow: 1;
        }

        .content-table th {
          background-color: #f0f0f0;
          border: 1px solid #000;
          padding: 8px;
          font-size: 14pt;
          font-weight: 900;
        }

        .content-table td {
          border: 1px solid #000;
          padding: 12px 15px; /* Large padding as requested */
          font-size: 14pt;
          font-weight: 700;
          vertical-align: middle;
        }

        /* Footer Grid */
        .footer {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 30px;
          margin-top: 20px;
          border-top: 2px solid #000;
          padding-top: 15px;
        }

        .totals-section {
          display: flex;
          gap: 20px;
          align-items: center;
          background: #f9f9f9;
          padding: 10px 20px;
          border-radius: 8px;
          border: 1px solid #ddd;
        }

        .total-item {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .total-label {
          font-size: 10pt;
          color: #555;
          font-weight: 700;
        }

        .total-value {
          font-size: 16pt;
          font-weight: 900;
        }

        .signatures {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          text-align: center;
        }

        .signature-box {
          border-top: 1px dashed #000;
          width: 120px;
          padding-top: 5px;
          font-size: 10pt;
          font-weight: 700;
        }

        @media print {
           body {
             width: 210mm;
             height: 148mm;
           }
        }
      </style>
    </head>
    <body onload="window.print()">
      <div class="container">
        
        <!-- Header -->
        <div class="header">
          <div class="logo-section">
            <!-- Simple SVG Logo for Print -->
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="6"></circle>
              <circle cx="12" cy="12" r="2"></circle>
            </svg>
          </div>
          
          <div class="company-info">
            <h1 class="company-name">تارجت للخدمات الحكومية</h1>
            <p class="branch-name">فرع: ${entry.branchId || 'الرئيسي'}</p>
          </div>

          <div class="meta-info">
            <div class="meta-item">رقم الإيصال: #${entry.id.substring(entry.id.length - 6)}</div>
            <div class="meta-item">التاريخ: ${entry.entryDate}</div>
            <div class="meta-item">الوقت: ${new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
            <div class="meta-item">الموظف: ${entry.recordedBy}</div>
          </div>
        </div>

        <!-- Content -->
        <table class="content-table">
          <thead>
            <tr>
              <th style="width: 40%">نوع الخدمة</th>
              <th style="width: 30%">بيانات العميل</th>
              <th style="width: 15%">الباركود</th>
              <th style="width: 15%">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                ${entry.serviceType}
                <div style="font-size: 10pt; font-weight: normal; margin-top: 5px; color: #555;">${entry.notes || ''}</div>
              </td>
              <td>
                <div style="font-size: 12pt;">${entry.clientName}</div>
                <div style="font-size: 10pt; font-weight: normal; margin-top: 2px;">${entry.nationalId}</div>
              </td>
              <td style="font-family: monospace; text-align: center;">${entry.barcode || '-'}</td>
              <td style="text-align: center;">${entry.serviceCost} ج.م</td>
            </tr>
             <!-- Empty rows to fill space if needed, or just let it expand -->
          </tbody>
        </table>

        <!-- Footer -->
        <div class="footer">
          <div class="totals-section">
            <div class="total-item">
              <span class="total-label">إجمالي التكلفة</span>
              <span class="total-value text-blue-600">${entry.serviceCost} EGP</span>
            </div>
            <div style="width: 1px; height: 30px; background: #ccc;"></div>
            <div class="total-item">
              <span class="total-label">المدفوع</span>
              <span class="total-value text-green-600">${entry.amountPaid} EGP</span>
            </div>
            <div style="width: 1px; height: 30px; background: #ccc;"></div>
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
           // Provide a small buffer for fonts to render
           setTimeout(function() {
             // Print is triggered by parent, but backup here
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