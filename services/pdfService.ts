import { ServiceEntry } from '../types';

export const generateReceiptHtml = (entry: ServiceEntry): string => {
  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
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
          padding: 25px;
          position: relative;
          overflow: hidden;
        }

        .watermark {
          position: absolute;
          top: 55%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 70%;
          opacity: 0.15;
          z-index: 0;
          pointer-events: none;
        }

        /* Ensure content sits above watermark */
        .header, .content-table, .footer {
          position: relative;
          z-index: 1;
        }

        /* Header */
        .header {
          text-align: center;
          padding-top: 10px;
          padding-bottom: 10px;
          margin-bottom: 5px;
        }

        .company-name {
          font-size: 16pt;
          font-weight: 900;
          margin: 0 0 15px 0;
          line-height: 1.2;
        }

        .branch-name {
          font-size: 10pt;
          font-weight: 700;
          margin: 0;
          color: #333;
          text-align: right;
        }
        .meta-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 9pt;
          margin-top: 5px;
          text-align: right;
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
          padding-top: 8px;
          margin-top: 5px;
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

        /* Company Contact Info Footer */
        .contact-info {
          margin-top: 15px;
          text-align: center;
          font-size: 8pt;
          font-weight: 700;
          color: #333;
          line-height: 1.6;
          border-top: 1px solid #eee;
          padding-top: 10px;
        }

        .footer-line {
          display: block;
        }

        .website-link {
          color: #1e40af;
          font-weight: 900;
          font-size: 9pt;
        }

        @media print {
           body { width: 148mm; }
           .watermark { -webkit-filter: grayscale(100%); filter: grayscale(100%); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Watermark with Relative Path -->
        <img src="./assets/watermark.jpg" class="watermark" alt="Watermark" id="watermarkImg" />
        
        <div class="header">
          <h1 class="company-name">تارجت للخدمات الحكومية</h1>
          <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div class="meta-info">
              <p class="branch-name">فرع: ${entry.branchId || 'الرئيسي'}</p>
              <div class="meta-item">تاريخ العملية: ${entry.entryDate}</div>
              <div class="meta-item">وقت العملية: ${new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
              <div class="meta-item">الموظف: ${entry.recordedBy}</div>
            </div>

            <div class="qr-container" style="display: flex; flex-direction: column; align-items: center; gap: 4px; margin-bottom: 5px; margin-left: 10px;">
              <span style="font-size: 8pt; font-weight: 900; color: #333;">تابع طلبك هنا</span>
              <div style="width: 80px; height: 80px; border: 1px solid #eee; padding: 2px;">
                <img src="./assets/qr-code.jpg" style="width: 100%; height: 100%; object-fit: contain;" alt="QR" id="qrImg" />
              </div>
            </div>
          </div>
        </div>

        <table class="content-table">
          <tbody>
            <tr>
              <td colspan="2"><span class="label">اسم العميل:</span><span class="value">${entry.clientName}</span></td>
            </tr>
            <tr>
              <td style="width: 50%;"><span class="label">رقم الهاتف:</span><span class="value" style="font-size: 9pt;">${entry.phoneNumber || '-'}</span></td>
              <td style="width: 50%;"><span class="label">الرقم القومي:</span><span class="value" style="font-size: 9pt;">${entry.nationalId}</span></td>
            </tr>
            <tr>
              <td style="width: 50%;"><span class="label">نوع الخدمة:</span><span class="value">${entry.serviceType}</span></td>
              <td style="width: 50%;"><span class="label">الباركود:</span><span class="value" style="font-family: monospace; font-size: 9pt;">${entry.barcode || '-'}</span></td>
            </tr>
            ${entry.notes ? `<tr><td colspan="2"><span class="label">ملاحظات:</span><span class="value" style="font-size: 9pt;">${entry.notes}</span></td></tr>` : ''}
          </tbody>
        </table>

        <div class="footer">
          <div class="totals-section">
            <div class="total-item"><span class="total-label">الإجمالي</span><span class="total-value">${entry.serviceCost} EGP</span></div>
            <div class="total-item"><span class="total-label">المدفوع</span><span class="total-value" style="color: green;">${entry.amountPaid} EGP</span></div>
            <div class="total-item"><span class="total-label">المتبقي</span><span class="total-value" style="color: ${entry.remainingAmount > 0 ? 'red' : '#000'}">${entry.remainingAmount} EGP</span></div>
          </div>
          
          <div class="contact-info">
            <div class="footer-line">target868@yahoo.com | https://www.facebook.com/Target868</div>
            <div class="footer-line">01005757346 - 01154344029</div>
            <div class="footer-line" style="margin-top: 5px;">يمكنكم طلب ومتابعة الخدمة من خلال موقعنا</div>
            <div class="footer-line website-link">www.target4gov.com</div>
          </div>
        </div>
      </div>
      
      <script>
        // Ensure images are loaded before notifying the parent
        function checkImages() {
          const imgs = [document.getElementById('watermarkImg'), document.getElementById('qrImg')];
          let loadedCount = 0;
          
          imgs.forEach(img => {
            if (img.complete) {
              loadedCount++;
            } else {
              img.onload = () => {
                loadedCount++;
                if (loadedCount === imgs.length) finish();
              };
              img.onerror = () => {
                loadedCount++; // Still proceed even if an image fails
                if (loadedCount === imgs.length) finish();
              };
            }
          });
          
          if (loadedCount === imgs.length) finish();
        }

        function finish() {
          // Send message to parent that we are ready
          window.parent.postMessage('receipt-ready', '*');
        }

        window.onload = checkImages;
      </script>
    </body>
    </html>
  `;
};

export const generateReceipt = async (entry: ServiceEntry): Promise<void> => {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    // Write content
    const htmlContent = generateReceiptHtml(entry);
    const doc = iframe.contentWindow?.document;

    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      // Listen for the ready message from the iframe
      const handleMessage = (event: MessageEvent) => {
        if (event.data === 'receipt-ready') {
          window.removeEventListener('message', handleMessage);

          // Small extra delay for font rendering
          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch (e) {
              console.error("Printing failed", e);
            } finally {
              resolve();
              setTimeout(() => {
                document.body.removeChild(iframe);
              }, 10000);
            }
          }, 300);
        }
      };

      window.addEventListener('message', handleMessage);
    } else {
      resolve();
    }
  });
};
