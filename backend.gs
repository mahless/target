// متغير عام لحفظ مرجع الشيت خلال نفس الطلب لتقليل الاستدعاءات
let cachedSS = null;
function getSS() {
  if (cachedSS) return cachedSS;
  cachedSS = SpreadsheetApp.getActiveSpreadsheet();
  return cachedSS;
}

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getData') {
    return handleGetData(e.parameter.sheetName);
  }
  
  if (action === 'getAvailableBarcode') {
    return handleGetAvailableBarcode(e.parameter.branch, e.parameter.category);
  }

  if (action === 'getHRReport') {
    return handleGetHRReport();
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

  if (action === 'updateStockItem') {
    return handleUpdateStockItem(requestData);
  }

  if (action === 'deleteStockItem') {
    return handleDeleteStockItem(requestData.barcode);
  }

  if (action === 'updateEntry') {
    return handleUpdateEntry(e.parameter.sheetName, requestData);
  }

  if (action === 'attendance') {
    return handleAttendance(requestData);
  }

  return createJSONResponse({ status: "error", message: "Invalid POST Action" });
}

/**
 * 6. نظام الحضور والانصراف (Attendance)
 */
function handleAttendance(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getSS();
    let sheet = ss.getSheetByName("Attendance");
    
    // إنشاء الشيت إذا لم تكن موجودة
    if (!sheet) {
      sheet = ss.insertSheet("Attendance");
      sheet.appendRow(["id", "username", "branchId", "Type", "ip", "Timestamp", "date", "Total_Hours"]);
    }
    
    const map = getHeaderMapping(sheet, "Attendance");

    // 1. التحقق من الـ IP (Dynamic Whitelist Logic)
    let isAuthorized = true;
    let debugInfo = "";
    const configSheet = ss.getSheetByName("Branches_Config");
    
    if (configSheet) {
      const configMap = getHeaderMapping(configSheet, "Branches_Config");
      const configData = configSheet.getDataRange().getValues();
      const idxBranchName = configMap['Branch_Name'];
      const idxAuthIP = configMap['Authorized_IP'];
      
      if (idxBranchName !== undefined && idxAuthIP !== undefined) {
        const targetBranch = normalizeArabic(data.branchId);
        let branchAllowedIP = "0.0.0.0";
        let foundConfig = false;
        
        for (let i = 1; i < configData.length; i++) {
          if (normalizeArabic(configData[i][idxBranchName]) === targetBranch) {
            branchAllowedIP = String(configData[i][idxAuthIP]).trim();
            foundConfig = true;
            break;
          }
        }
        
        debugInfo = `Branch: ${targetBranch}, UserIP: ${data.ip}, AllowedIP: ${branchAllowedIP}, Found: ${foundConfig}`;

        if (foundConfig && branchAllowedIP !== "0.0.0.0" && branchAllowedIP !== "" && data.ip !== branchAllowedIP) {
          isAuthorized = false;
        }
      }
    }
    
    if (!isAuthorized) {
       return createJSONResponse({ 
         status: "error", 
         message: `لا يمكن تسجيل الحضور من هذا الموقع. IP الجهاز الحالي (${data.ip}) غير مطابق للـ IP المعتمد لهذا الفرع في الإعدادات.` 
       });
    }

    const today = new Date();
    // توقيت القاهرة للتسجيل النصي
    const cairoTime = Utilities.formatDate(today, "Africa/Cairo", "yyyy-MM-dd HH:mm:ss");
    const todayDate = Utilities.formatDate(today, "Africa/Cairo", "yyyy-MM-dd");
    
    // التوقيت الفعلي للحسابات
    const currentMillis = today.getTime();
    
    let totalHours = "";

    // منطق حساب الساعات عند الانصراف
    if (data.type === 'check-out') {
      const rows = sheet.getDataRange().getValues();
      const idxUsername = map['username'];
      const idxType = map['Type'];
      const idxTimestamp = map['Timestamp'];

      if (idxUsername !== undefined && idxType !== undefined && idxTimestamp !== undefined) {
         // البحث عكسياً عن آخر تسجيل دخول لنفس المستخدم
         const targetUser = String(data.username).trim().toLowerCase();
         
         for (let i = rows.length - 1; i > 0; i--) {
           const row = rows[i];
           const rowUser = String(row[idxUsername]).trim().toLowerCase();
           const rowType = String(row[idxType]).trim();
           
           if (rowUser === targetUser && rowType === 'check-in') {
             
             let checkInDate;
             const rawTimestamp = row[idxTimestamp];
             
             // دالة مساعدة لتحليل التاريخ من النص بنفس التنسيق
             const parseDateFromCairoStr = (str) => {
               const parts = String(str).split(' ');
               if (parts.length >= 2) {
                 const dParts = parts[0].split('-'); // yyyy-MM-dd
                 const tParts = parts[1].split(':'); // HH:mm:ss
                 return new Date(
                   parseInt(dParts[0]), 
                   parseInt(dParts[1]) - 1, 
                   parseInt(dParts[2]), 
                   parseInt(tParts[0]), 
                   parseInt(tParts[1]), 
                   parseInt(tParts[2])
                 );
               }
               return null;
             };

             if (rawTimestamp instanceof Date) {
               checkInDate = rawTimestamp; // في حال كان الكائن تاريخاً أصلاً
             } else {
               checkInDate = parseDateFromCairoStr(rawTimestamp);
             }

             // نحتاج أيضاً تحويل وقت الانصراف (cairoTime) لنفس التنسيق للمقارنة العادلة
             // لأن currentMillis هو توقيت السيرفر (UTC) بينما checkInDate قد يكون مشتقاً من نص توقيت القاهرة
             const checkOutDate = parseDateFromCairoStr(cairoTime);

             if (checkInDate && checkOutDate && !isNaN(checkInDate.getTime()) && !isNaN(checkOutDate.getTime())) {
               const diffMs = checkOutDate.getTime() - checkInDate.getTime();
               // حساب الساعات بدقة
               if (diffMs > 0) {
                 const diffHrs = (diffMs / (1000 * 60 * 60)).toFixed(2);
                 totalHours = diffHrs;
               } else {
                 totalHours = "0.00"; // تجنب القيم السالبة
               }
             }
             break; 
           }
         }
      }
    }

    // جلب الهيدرز من الـ Map بدلاً من إعادة قراءتها من الشيت
    const headerKeys = Object.keys(map).sort((a, b) => map[a] - map[b]);
    const newRow = headerKeys.map(h => {
       switch(h) {
         case 'id': return Date.now().toString();
         case 'username': return data.username;
         case 'branchId': return data.branchId;
         case 'Type': return data.type;
         case 'ip': return data.ip;
         case 'Timestamp': return cairoTime;
         case 'date': return todayDate;
         case 'Total_Hours': return totalHours;
         default: return "";
       }
    });

    sheet.appendRow(newRow);
    // SpreadsheetApp.flush() تم إزالته لدعم التحديث المتوازي بناءً على طلب المستخدم، الكتابة ستتم تلقائياً
    
    return createJSONResponse({ status: "success", timestamp: cairoTime });

  } catch (err) {
    return createJSONResponse({ status: "error", message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * 0. تسجيل الدخول والتحقق من المستخدم
 */
function handleLogin(id, password) {
  try {
    const ss = getSS();
    const sheet = ss.getSheetByName("Users");
    if (!sheet) return createJSONResponse({ success: false, message: "Users sheet not found" });
    
    const data = sheet.getDataRange().getValues();
  
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
      if (String(row[0]) === String(id) && String(row[2]) === String(password)) {
        return createJSONResponse({ 
          success: true, 
          id: row[0], 
          name: row[1], 
          role: row[3], 
          assignedBranchId: row[4]
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
    const ss = getSS();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return createJSONResponse([]);
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return createJSONResponse([]);
    
    const headers = data[0].map(h => String(h).trim());
    const rows = data.slice(1);
    const tz = ss.getSpreadsheetTimeZone();
    
    const result = rows
      .filter(row => row.some(cell => String(cell).trim() !== "")) 
      .map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          let val = row[index];
          if (val instanceof Date) {
            val = Utilities.formatDate(val, tz, "yyyy-MM-dd");
          }
          // توحيد مسميات الحقول للحماية من اختلاف حالة الأحرف (Case sensitivity)
          const normalizedKey = header.toLowerCase();
          obj[header] = val;
          if (!obj[normalizedKey]) obj[normalizedKey] = val; // نسخة بديلة لتسهيل الوصول
        });
        return obj;
      });
    
    return createJSONResponse(result);
  } catch (err) {
    return createJSONResponse({ status: "error", message: err.toString() });
  }
}

/**
 * دالة جلب تقرير HR للمدير (الساعات الأسبوعية والشهرية)
 */
function handleGetHRReport() {
  try {
    const ss = getSS();
    const sheet = ss.getSheetByName("Attendance");
    if (!sheet) return createJSONResponse([]);
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return createJSONResponse([]);
    
    const map = getHeaderMapping(sheet, "Attendance");
    const idxUser = map['username'];
    const idxHours = map['Total_Hours'];
    const idxDate = map['date'];
    
    if (idxUser === undefined || idxHours === undefined || idxDate === undefined) {
      return createJSONResponse({ status: "error", message: "Missing required columns in Attendance sheet" });
    }

    const now = new Date();
    // استخدام توقيت القاهرة لتحديد الشهر الحالي بدقة
    const cairoDateStr = Utilities.formatDate(now, "Africa/Cairo", "yyyy-MM-dd");
    const [cYear, cMonth, cDay] = cairoDateStr.split('-').map(Number);
    
    // cMonth is 1-based from formatDate (01..12), while Date.getMonth is 0-based.
    // We can just use the parsed numbers.
    const currentYear = cYear;
    const currentMonth = cMonth;

    const report = {};

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const username = String(row[idxUser]).trim();
      if (!username) continue;
      
      // تخطي الصفوف التي ليس لها ساعات مسجلة (مثل تسجيلات الدخول فقط)
      // إلا إذا كنا نريد حساب الحضور، ولكن التقرير عن الساعات
      // فحص القيمة بصرامة
      let hours = 0;
      const rawHours = row[idxHours];
      if (typeof rawHours === 'number') {
        hours = rawHours;
      } else if (rawHours && String(rawHours).trim() !== "") {
        hours = parseFloat(String(rawHours));
      }

      if (!hours || isNaN(hours) || hours <= 0) continue;

      const dateVal = row[idxDate];
      let rowYear, rowMonth, rowDay;

      if (dateVal instanceof Date) {
         // إذا كان الحقل تاريخاً، نحولة لتوقيت القاهرة لاستخراج السنة والشهر
         const dStr = Utilities.formatDate(dateVal, "Africa/Cairo", "yyyy-MM-dd");
         const parts = dStr.split('-');
         rowYear = parseInt(parts[0]);
         rowMonth = parseInt(parts[1]);
         rowDay = parseInt(parts[2]);
      } else {
         // إذا كان نصاً yyyy-MM-dd
         const dStr = String(dateVal).trim();
         const parts = dStr.split(/\D+/); // يغطي - أو /
         if (parts.length >= 3) {
            // غالباً التنسيق yyyy-MM-dd محفوظ من handleAttendance
            // لكن لو كان dd/MM/yyyy
             if (parts[0].length === 4) {
               rowYear = parseInt(parts[0]);
               rowMonth = parseInt(parts[1]);
               rowDay = parseInt(parts[2]);
             } else {
               // افتراض dd/MM/yyyy
               rowYear = parseInt(parts[2]);
               rowMonth = parseInt(parts[1]);
               rowDay = parseInt(parts[0]);
             }
         }
      }

      if (!rowYear || !rowMonth) continue;

      // التأكد من أن السجل في الشهر الحالي (مقارنة أرقام مباشرة)
      if (rowMonth !== currentMonth || rowYear !== currentYear) continue;

      if (!report[username]) {
        report[username] = {
          name: username,
          week1: 0,
          week2: 0,
          week3: 0,
          week4: 0,
          totalMonth: 0
        };
      }

      // تقسيم الأسابيع
      if (rowDay <= 7) report[username].week1 += hours;
      else if (rowDay <= 14) report[username].week2 += hours;
      else if (rowDay <= 21) report[username].week3 += hours;
      else report[username].week4 += hours;

      report[username].totalMonth += hours;
    }

    // تحويل الكائن لمصفوفة وتنظيف الأرقام
    const finalResult = Object.values(report).map(u => ({
      name: u.name,
      week1: Number(u.week1.toFixed(2)),
      week2: Number(u.week2.toFixed(2)),
      week3: Number(u.week3.toFixed(2)),
      week4: Number(u.week4.toFixed(2)),
      totalMonth: Number(u.totalMonth.toFixed(2))
    }));

    return createJSONResponse(finalResult);
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
    const ss = getSS();
    const sheet = ss.getSheetByName(sheetName);
    const map = getHeaderMapping(sheet, sheetName);
    const headerKeys = Object.keys(map).sort((a, b) => map[a] - map[b]);
    
    const newRow = headerKeys.map(h => data[h] || "");
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
    const ss = getSS();
    const sheet = ss.getSheetByName(sheetName);
    
    const map = getHeaderMapping(sheet, sheetName);
    let idColIdx = map['id'] ?? map['معرف'];
    
    if (idColIdx === undefined) return createJSONResponse({ status: "error", message: "ID Column not found" });

    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
        if (String(values[i][idColIdx]) === String(data.id)) {
            rowIndex = i;
            break;
        }
    }
    
    if (rowIndex === -1) return createJSONResponse({ status: "error", message: "Entry not found" });
    
    const rowToUpdate = values[rowIndex];
    Object.keys(data).forEach(key => {
       if (key === 'id') return;
       const colIdx = map[key];
       if (colIdx !== undefined) {
           rowToUpdate[colIdx] = data[key];
       }
    });
    
    sheet.getRange(rowIndex + 1, 1, 1, rowToUpdate.length).setValues([rowToUpdate]);
    
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
  const ss = getSS();
  const sheet = ss.getSheetByName("Stock");
  if (!sheet) return createJSONResponse({ status: "error", message: "Stock sheet not found" });
  
  const map = getHeaderMapping(sheet, "Stock");
  if (['Barcode', 'Category', 'Branch', 'Status'].some(k => map[k] === undefined)) {
     return createJSONResponse({ status: "error", message: "Invalid Stock Sheet Structure" });
  }

  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[map['Branch']]) === String(branch) && 
        String(row[map['Category']]) === String(category) && 
        row[map['Status']] === "Available") {
      return createJSONResponse({ status: "success", barcode: row[map['Barcode']] });
    }
  }
  return createJSONResponse({ status: "error", message: "Out of stock" });
}

/**
 * 4. إضافة دفعة باركودات للمخزن (Batch Upload)
 */
function handleAddStockBatch(items) {
  try {
    const ss = getSS();
    let sheet = ss.getSheetByName("Stock");
    
    if (!sheet) {
      sheet = ss.insertSheet("Stock");
      sheet.appendRow(["Barcode", "Category", "Branch", "Status", "Created_At", "Used_By", "Usage_Date", "Order_ID"]);
    }
    
    const map = getHeaderMapping(sheet, "Stock");
    const headerKeys = Object.keys(map).sort((a, b) => map[a] - map[b]);

    const rows = items.map(item => {
       const rowData = new Array(headerKeys.length).fill("");
       if (map['Barcode'] !== undefined) rowData[map['Barcode']] = item.barcode;
       if (map['Category'] !== undefined) rowData[map['Category']] = item.category;
       if (map['Branch'] !== undefined) rowData[map['Branch']] = item.branch;
       if (map['Status'] !== undefined) rowData[map['Status']] = "Available";
       if (map['Created_At'] !== undefined) rowData[map['Created_At']] = new Date().toISOString();
       return rowData;
    });
    
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headerKeys.length).setValues(rows);
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
    const ss = getSS();
    const sheet = ss.getSheetByName("Stock");
    
    const map = getHeaderMapping(sheet, "Stock");
    if(map['Barcode'] === undefined) return createJSONResponse({ status: "error", message: "Barcode Column Missing" });

    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][map['Barcode']]) === String(params.barcode)) {
        const rowData = values[i];
        const isAvailable = params.status === "Available";
        
        if (map['Status'] !== undefined) rowData[map['Status']] = params.status;
        if (map['Used_By'] !== undefined) rowData[map['Used_By']] = isAvailable ? "" : (params.usedBy || "");
        if (map['Usage_Date'] !== undefined) rowData[map['Usage_Date']] = isAvailable ? "" : new Date().toISOString();
        if (map['Order_ID'] !== undefined) rowData[map['Order_ID']] = isAvailable ? "" : (params.orderId || "");
        
        sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
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
 * 5b. تحديث كامل لبيانات الباركود (تغيير الرقم أو الفرع)
 */
function handleUpdateStockItem(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getSS();
    const sheet = ss.getSheetByName("Stock");
    const map = getHeaderMapping(sheet, "Stock");
    
    const values = sheet.getDataRange().getValues();
    const oldBarcode = String(data.oldBarcode).trim();

    for (let i = 1; i < values.length; i++) {
      if (String(values[i][map['Barcode']]) === oldBarcode) {
        const range = sheet.getRange(i + 1, 1, 1, values[i].length);
        const rowData = values[i];
        
        if (map['Barcode'] !== undefined) rowData[map['Barcode']] = data.newBarcode;
        if (map['Branch'] !== undefined) rowData[map['Branch']] = data.newBranch;
        
        range.setValues([rowData]);
        return createJSONResponse({ status: "success" });
      }
    }
    return createJSONResponse({ status: "error", message: "الباركود القديم غير موجود" });
  } catch (err) {
    return createJSONResponse({ status: "error", message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * 5c. حذف باركود نهائياً من المخزن
 */
function handleDeleteStockItem(barcode) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getSS();
    const sheet = ss.getSheetByName("Stock");
    const map = getHeaderMapping(sheet, "Stock");
    
    const values = sheet.getDataRange().getValues();
    const targetBarcode = String(barcode).trim();

    for (let i = values.length - 1; i > 0; i--) {
      if (String(values[i][map['Barcode']]) === targetBarcode) {
        sheet.deleteRow(i + 1);
        return createJSONResponse({ status: "success" });
      }
    }
    return createJSONResponse({ status: "error", message: "الباركود غير موجود للحذف" });
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

/**
 * دالة استخراج خريطة للأعمدة بناءً على أسمائها
 */
function getHeaderMapping(sheet, sheetName) {
  const cache = CacheService.getScriptCache();
  // تغيير المفتاح لإجبار تحديث الكاش في حالة تغير الأعمدة مؤخراً
  const cacheKey = "headers_v2_" + sheetName;
  const cached = cache.get(cacheKey);
  
  if (cached) return JSON.parse(cached);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((h, i) => {
    map[String(h).trim()] = i;
  });
  
  cache.put(cacheKey, JSON.stringify(map), 21600); // 6 hours cache
  return map;
}

/**
 * دالة توحيد الحروف العربية لضمان صحة البحث والمطابقة
 */
function normalizeArabic(text) {
  if (!text) return "";
  return String(text)
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();
}
