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
          size: 210mm 297mm; /* A4 size to accommodate 210mm width */
          margin: 0; /* Hide browser headers/footers */
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
          max-width: 210mm;
          margin: 0 auto;
          /* border: 2px solid #000; Removed external border as requested */
          padding: 20px 80px;
          position: relative;
          overflow: hidden;
        }

        .watermark {
          position: absolute;
          top: 45%;
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
          padding-top: 2px;
          padding-bottom: 5px;
          margin-bottom: 2px;
        }

        .company-name {
          font-size: 18pt;
          font-weight: 900;
          margin: 0;
          line-height: 1.2;
          text-align: right;
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
          margin: 2px 0;
          border: 1px solid #000;
        }

        .content-table th {
          background-color: #f0f0f0;
          border: 1px solid #000;
          padding: 5px;
          font-size: 12pt;
          font-weight: 900;
        }

        .content-table td {
          border: 1px solid #000;
          padding: 4px;
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
          padding-top: 2px;
          margin-top: 2px;
        }

        .totals-section {
          display: flex;
          gap: 15px;
          justify-content: space-around;
          background: #f9f9f9;
          padding: 2px 8px;
          border-radius: 5px;
          border: 1px solid #ddd;
          margin-bottom: 3px;
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
          font-size: 11pt;
          font-weight: 900;
          display: block;
          margin-top: 0;
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
           body { width: 210mm; }
           .watermark { -webkit-filter: grayscale(100%); filter: grayscale(100%); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Watermark with Relative Path -->
        <img src="./assets/watermark.jpg" class="watermark" alt="Watermark" id="watermarkImg" />
        
        <div class="header">
          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #ddd; margin-bottom: 10px;">
            <h1 class="company-name">تارجت للخدمات الحكومية</h1>
            <div style="width: 120px;">
              <img src="./assets/sidebar-logo.jpg" style="width: 100%; height: auto; object-fit: contain;" alt="Logo" id="logoImg" />
            </div>
          </div>
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
              <td style="width: 50%;"><span class="label">اسم العميل:</span><span class="value">${entry.clientName}</span></td>
              <td style="width: 50%;"><span class="label">الرقم القومي:</span><span class="value" style="font-size: 9pt;">${entry.nationalId}</span></td>
            </tr>
            <tr>
              <td style="width: 50%;"><span class="label">رقم الهاتف:</span><span class="value" style="font-size: 9pt;">${entry.phoneNumber || '-'}</span></td>
              <td style="width: 50%;"><span class="label">نوع الخدمة:</span><span class="value">${entry.serviceType}</span></td>
            </tr>
            <tr>
              <td style="width: 50%;"><span class="label">الملاحظات:</span><span class="value" style="font-size: 9pt;">${entry.notes || '-'}</span></td>
              <td style="width: 50%;"><span class="label">الباركود:</span><span class="value" style="font-family: monospace; font-size: 9pt;">${entry.barcode || '-'}</span></td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <div class="totals-section">
            <div class="total-item"><span class="total-label">الإجمالي</span><span class="total-value">${entry.serviceCost} EGP</span></div>
            <div class="total-item"><span class="total-label">المدفوع</span><span class="total-value" style="color: green;">${entry.amountPaid} EGP</span></div>
            <div class="total-item"><span class="total-label">المتبقي</span><span class="total-value" style="color: ${entry.remainingAmount > 0 ? 'red' : '#000'}">${entry.remainingAmount} EGP</span></div>
          </div>
          
          <div class="contact-info">
            <div class="footer-line" style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
              <div style="display: flex; flex-direction: column; text-align: right; gap: 2px; font-weight: 700;">
                <div>فرع امبابة / 01121119729 - 0233106268</div>
                <div>فرع فيصل / 01121455500 - 0237782520</div>
                <div>فرع الملكه / 01119987566 - 0237211184</div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 4px; direction: ltr; padding-top: 2px;">
                <div style="font-size: 7pt; font-weight: 900; margin-bottom: 2px; color: #555; text-align: left;">Administration:</div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#25D366" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7.9.9 0 1 1 0 1.8 6.7 6.7 0 1 0 6 9.2 6.7 6.7 0 0 0 .1-6.7.9.9 0 1 1 1.6-.8Z"/></svg>
                  <span style="font-family: sans-serif; font-weight: 900;">01005757346</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e40af" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  <span style="font-family: sans-serif; font-weight: 900;">01154344029</span>
                </div>
              </div>
            </div>
            <div class="footer-line" style="margin-top: 5px;">يمكنكم طلب ومتابعة الخدمة من خلال موقعنا</div>
            <div class="footer-line website-link">www.target4gov.com</div>
          </div>
        </div>
      </div>
      
      <script>
        // Ensure images are loaded before notifying the parent
        function checkImages() {
          const imgs = [
            document.getElementById('watermarkImg'), 
            document.getElementById('qrImg'),
            document.getElementById('logoImg')
          ];
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
