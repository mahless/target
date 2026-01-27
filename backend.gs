/**
 * ملف Google Apps Script الشامل لتطبيق تارجت للخدمات
 * يرجى نسخ هذا الكود بالكامل ولصقه في Apps Script المرتبط بجوجل شيت الخاصة بك.
 * تأكد من وجود شيتات بأسمـاء: (Entries, Expenses, Stock)
 */

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getData') {
    return handleGetData(e.parameter.sheetName);
  }
  
  if (action === 'getAvailableBarcode') {
    return handleGetAvailableBarcode(e.parameter.branch, e.parameter.category);
  }

  if (action === 'login') {
    return handleLogin(e.parameter.id, e.parameter.password);
  }
  
  return createJSONResponse({ status: "error", message: "Invalid Action" });
}

function doPost(e) {
  let requestData;
  try {
    requestData = JSON.parse(e.postData.contents);
  } catch (err) {
    return createJSONResponse({ status: "error", message: "Invalid JSON" });
  }

  const action = e.parameter.action;
  const userRole = e.parameter.role || "employee"; // الافتراضي موظف

  if (action === 'addRow') {
    // حماية: المدير هو الوحيد الذي يمكنه مسح أو تعديل بيانات قديمة، لكن الكل يمكنه الإضافة
    return handleAddRow(e.parameter.sheetName, requestData);
  }

  if (action === 'addStockBatch') {
    // حماية: المساعد والمدير فقط يمكنهما إضافة مخزون
    if (userRole === 'موظف') {
      return createJSONResponse({ status: "error", message: "Unauthorized: Employees cannot add stock" });
    }
    return handleAddStockBatch(requestData);
  }

  if (action === 'updateStockStatus') {
    return handleUpdateStockStatus(requestData);
  }

  if (action === 'updateEntry') {
    return handleUpdateEntry(e.parameter.sheetName, requestData);
  }

  return createJSONResponse({ status: "error", message: "Invalid POST Action" });
}

/**
 * 0. تسجيل الدخول والتحقق من المستخدم
 */
function handleLogin(id, password) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Users");
    if (!sheet) return createJSONResponse({ success: false, message: "Users sheet not found" });
    
    const data = sheet.getDataRange().getValues();
    
    // Header mapping: find column indices by column names
    const headers = data[0];
    const idCol = headers.indexOf('id');
    const nameCol = headers.indexOf('name');
    const passwordCol = headers.indexOf('password');
    const roleCol = headers.indexOf('role');
    const assignedBranchIdCol = headers.indexOf('assignedBranchId');
    
    // Validate required columns exist
    if (idCol === -1 || passwordCol === -1) {
      return createJSONResponse({ success: false, message: "Missing required columns in Users sheet" });
    }
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(id) && String(data[i][passwordCol]) === String(password)) {
        return createJSONResponse({ 
          success: true, 
          id: data[i][idCol], 
          name: nameCol !== -1 ? data[i][nameCol] : '',
          role: roleCol !== -1 ? data[i][roleCol] : 'موظف',
          assignedBranchId: assignedBranchIdCol !== -1 ? (data[i][assignedBranchIdCol] || null) : null
        });
      }
    }
    return createJSONResponse({ success: false, message: "ID أو كلمة مرور خاطئة" });
  } catch (err) {
    return createJSONResponse({ success: false, message: err.toString() });
  }
}

/**
 * 1. جلب البيانات من أي شيت (Entries, Expenses, Stock)
 */
function handleGetData(sheetName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return createJSONResponse([]);
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return createJSONResponse([]);
    
    const headers = data[0].map(h => String(h).trim());
    const rows = data.slice(1);
    
    const result = rows
      .filter(row => row.some(cell => String(cell).trim() !== "")) // تجاهل الصفوف الفارغة تماماً
      .map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          let val = row[index];
          // إذا كانت القيمة تاريخاً، نقوم بتحويلها لنص ثابت بصيغة YYYY-MM-DD لتجنب تزحزح التوقيت
          if (val instanceof Date) {
            val = Utilities.formatDate(val, SpreadsheetApp.getActive().getSpreadsheetTimeZone(), "yyyy-MM-dd");
          }
          obj[header] = val;
        });
        return obj;
      });
    
    return createJSONResponse(result);
  } catch (err) {
    return createJSONResponse({ status: "error", message: err.toString() });
  }
}

/**
 * 2. إضافة سجل جديد (Entry أو Expense)
 */
function handleAddRow(sheetName, data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const newRow = headers.map(h => data[h] || "");
    sheet.appendRow(newRow);
    
    return createJSONResponse({ status: "success" });
  } catch (err) {
    return createJSONResponse({ status: "error", message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * 2b. تحديث سجل موجود (Update Entry)
 */
function handleUpdateEntry(sheetName, data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    const headers = values[0];
    
    // 1. تحديد مكان عمود الـ ID في الشيت
    let idColIdx = -1;
    const idVariants = ["id", "معرف", "ID", "المعرف", "الرقم"];
    for (let i = 0; i < headers.length; i++) {
        if (idVariants.indexOf(headers[i].toLowerCase()) !== -1) {
            idColIdx = i;
            break;
        }
    }
    
    if (idColIdx === -1) idColIdx = 0; // افتراض العمود الأول إذا لم نجد التسمية
    
    // 2. البحث عن القيمة الفعلية للـ ID المرسلة (سواء باسم id أو معرف)
    const requestId = data.id || data["معرف"] || data["ID"];
    if (!requestId) return createJSONResponse({ status: "error", message: "No ID provided in data" });

    // 3. البحث عن الصف
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
        if (String(values[i][idColIdx]) === String(requestId)) {
            rowIndex = i + 1;
            break;
        }
    }
    
    if (rowIndex === -1) return createJSONResponse({ status: "error", message: "Entry not found for ID: " + requestId });
    
    // 4. تحديث القيم الموجودة في الكائن المرسل فقط والتي تطابق الهيدرز
    headers.forEach((h, colIdx) => {
        // موازنة الأسماء (دعم إرسال id أو معرف)
        let val = data[h];
        if (val === undefined && h.toLowerCase() === "معرف") val = data.id;
        if (val === undefined && h.toLowerCase() === "id") val = data.id || data["معرف"];
        
        if (val !== undefined) {
            sheet.getRange(rowIndex, colIdx + 1).setValue(val);
        }
    });
    
    return createJSONResponse({ status: "success" });
  } catch (err) {
    return createJSONResponse({ status: "error", message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * 3. جلب أقدم باركود متاح (توزيع ذكي)
 */
function handleGetAvailableBarcode(branch, category) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Stock");
  if (!sheet) return createJSONResponse({ status: "error", message: "Stock sheet not found" });
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    // Column indices: Barcode(0), Category(1), Branch(2), Status(3)
    if (String(data[i][2]) === String(branch) && 
        String(data[i][1]) === String(category) && 
        data[i][3] === "Available") {
      return createJSONResponse({ status: "success", barcode: data[i][0] });
    }
  }
  return createJSONResponse({ status: "error", message: "Out of stock" });
}

/**
 * 4. إضافة دفعة باركودات للمخزن (Batch Upload)
 */
function handleAddStockBatch(items) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Stock");
    
    // إنشاء الشيت إذا لم تكن موجودة بالهيكل المطلوب
    if (!sheet) {
      sheet = ss.insertSheet("Stock");
      sheet.appendRow(["Barcode", "Category", "Branch", "Status", "Created_At", "Used_By", "Usage_Date", "Order_ID"]);
    }
    
    const rows = items.map(item => [
      item.barcode, 
      item.category, 
      item.branch, 
      "Available", 
      new Date().toISOString(), 
      "", "", ""
    ]);
    
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 8).setValues(rows);
    return createJSONResponse({ status: "success" });
  } catch (err) {
    return createJSONResponse({ status: "error", message: err.toString() });
  }
}

/**
 * 5. تحديث حالة الباركود (مستخدم، خطأ، تالف) مع قفل
 */
function handleUpdateStockStatus(params) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Stock");
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(params.barcode)) {
        const rowIdx = i + 1;
        sheet.getRange(rowIdx, 4).setValue(params.status); // Status
        sheet.getRange(rowIdx, 6).setValue(params.usedBy || ""); // Used_By
        sheet.getRange(rowIdx, 7).setValue(new Date().toISOString()); // Usage_Date
        if(params.orderId) sheet.getRange(rowIdx, 8).setValue(params.orderId); // Order_ID
        return createJSONResponse({ status: "success" });
      }
    }
    return createJSONResponse({ status: "error", message: "Barcode not found" });
  } catch (err) {
    return createJSONResponse({ status: "error", message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * مساعد استجابة JSON
 */
function createJSONResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
