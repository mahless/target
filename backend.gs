const SHEET_CONFIG = {
  Attendance: ['id', 'username', 'branchId', 'Type', 'ip', 'Timestamp', 'date', 'Total_Hours', 'users_ID'],
  Users: ['id', 'name', 'password', 'role', 'assignedBranchId'],
  Entries: [
    'id', 'clientName', 'nationalId', 'phoneNumber', 'serviceType', 'amountPaid', 'date', 'branchId', 
    'recordedBy', 'thirdPartyName', 'thirdPartyCost', 'serviceCost', 'isCostPaid', 'costPaidDate', 
    'remainingAmount', 'barcode', 'speed', 'notes', 'status', 'electronicAmount', 'electronicMethod', 
    'isElectronic', 'cancellationReason', 'adminFee', 'timestamp', 'hasThirdParty', 'costPaidBy', 
    'entryDate', 'parentEntryId', 'paymentMethod', 'Barcode_Source'
  ],
  Stock: ['Barcode', 'Category', 'Branch', 'Status', 'Created_At', 'Used_By', 'Usage_Date', 'Order_ID', 'Error_Reported_By', 'Error_Note'],
  Expenses: ['id', 'category', 'amount', 'date', 'branchId', 'notes', 'timestamp', 'recordedBy', 'relatedEntryId'],
  Branches_Config: ['Branch_Name', 'Current_Balance', 'Authorized_IP', 'Last_Reset_Date'],
  Service_Expense: ['Service_List', 'Expense_List']
};

function getColIndex(sheetName, colName) {
  const map = getHeaderMapping(null, sheetName);
  // البحث في المابينج بشكل مرن ( case-insensitive والبحث عن بدائل)
  const normalizedSearch = normalizeArabic(colName).toLowerCase();
  
  // أولاً البحث عن تطابق مباشر
  if (map[colName] !== undefined) return map[colName];
  
  // ثانياً البحث عن تطابق بعد التوحيد
  for (let key in map) {
    if (normalizeArabic(key).toLowerCase() === normalizedSearch) {
      return map[key];
    }
  }
  
  return undefined;
}

let cachedSS = null;
function getSS() {
  if (cachedSS) return cachedSS;
  cachedSS = SpreadsheetApp.getActiveSpreadsheet();
  return cachedSS;
}

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getData') {
    return handleGetData(e.parameter.sheetName, e.parameter.role, e.parameter.username);
  }
  
  if (action === 'getAvailableBarcode') {
    return handleGetAvailableBarcode(e.parameter.branch, e.parameter.category);
  }

  if (action === 'getHRReport') {
    return handleGetHRReport(e.parameter.month);
  }

  if (action === 'login') {
    return handleLogin(e.parameter.id, e.parameter.password);
  }

  if (action === 'getUserLogs') {
    return handleGetUserLogs(e.parameter.username, e.parameter.month);
  }

  if (action === 'getBranches') {
    return handleGetData('Branches_Config');
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

  if (action === 'deliverOrder') {
    return handleDeliverOrder(requestData);
  }

  if (action === 'branchTransfer') {
    const isAuthorized = normalizeArabic(userRole) === normalizeArabic('مدير') || 
                        normalizeArabic(userRole) === normalizeArabic('مساعد') || 
                        userRole === 'Admin';
    if (!isAuthorized) return createJSONResponse({ status: "error", message: "Unauthorized: Admins and Assistants only" });
    return handleBranchTransfer(requestData);
  }

  if (action === 'manageUsers') {
    const isAuthorized = normalizeArabic(userRole) === normalizeArabic('مدير') || userRole === 'Admin';
    if (!isAuthorized) return createJSONResponse({ status: "error", message: "Unauthorized: Admins only" });
    return handleManageUsers(requestData);
  }

  if (action === 'manageBranches') {
    const isAuthorized = normalizeArabic(userRole) === normalizeArabic('مدير') || userRole === 'Admin';
    if (!isAuthorized) return createJSONResponse({ status: "error", message: "Unauthorized: Admins only" });
    return handleManageBranches(requestData);
  }


  if (action === 'deleteExpense') {
    return handleDeleteExpense(requestData);
  }

  if (action === 'updateSettings') {
    const isAuthorized = normalizeArabic(userRole) === normalizeArabic('مدير') || userRole === 'Admin';
    if (!isAuthorized) return createJSONResponse({ status: "error", message: "Unauthorized: Admins only" });
    return handleUpdateSettings(requestData);
  }

  return createJSONResponse({ status: "error", message: "Invalid POST Action" });
}

/**
 * دالة حذف مصروف وإرجاع المبالغ للخزنة
 * نسخة مطورة (Resilient) تتعرف على المسميات العربية والإنجليزية للأعمدة
 */
function handleDeleteExpense(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); 
    const ss = getSS();
    
    console.log("Starting handleDeleteExpense for ID: " + data.id);
    
    let sheet = ss.getSheetByName("Expenses") || ss.getSheetByName("المصروفات");
    if (!sheet) {
      const allSheets = ss.getSheets();
      sheet = allSheets.find(s => normalizeArabic(s.getName()).includes("مصروفات"));
    }
    
    if (!sheet) {
      console.log("Error: Sheet not found");
      return createJSONResponse({ status: "error", message: "لم يتم العثور على جدول المصروفات" });
    }

    console.log("Found Sheet: " + sheet.getName());
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    console.log("Sheet Headers: " + JSON.stringify(headers));
    
    const findCol = (synonyms) => {
      const normalizedSyn = synonyms.map(s => normalizeArabic(s).toLowerCase());
      for (let i = 0; i < headers.length; i++) {
        const h = normalizeArabic(headers[i]).toLowerCase();
        if (normalizedSyn.includes(h)) return i;
      }
      return undefined;
    };

    const idCol = findCol(["id", "ID", "المعرف", "مسلسل", "كود"]);
    const amountCol = findCol(["amount", "المبلغ", "القيمة", "السعر"]);
    const branchCol = findCol(["branchId", "branch", "الفرع", "فرع", "اسم الفرع"]);

    console.log("Column Mapping - ID: " + idCol + ", Amount: " + amountCol + ", Branch: " + branchCol);

    if (idCol === undefined || amountCol === undefined || branchCol === undefined) {
      const missing = [];
      if (idCol === undefined) missing.push("ID");
      if (amountCol === undefined) missing.push("المبلغ");
      if (branchCol === undefined) missing.push("الفرع");
      return createJSONResponse({ status: "error", message: "نقص في أعمدة الجدول: " + missing.join(", ") });
    }

    const values = sheet.getDataRange().getValues();
    const targetId = String(data.id || "").trim();
    
    let foundRowIndex = -1;
    let amountToRefund = 0;
    let branchId = "";

    for (let i = 1; i < values.length; i++) {
      const currentId = String(values[i][idCol]).trim();
      if (currentId === targetId) {
        foundRowIndex = i + 1;
        amountToRefund = parseFloat(values[i][amountCol] || 0);
        branchId = String(values[i][branchCol]);
        break;
      }
    }

    console.log("Search Result - Found: " + (foundRowIndex !== -1) + ", Row: " + foundRowIndex);

    if (foundRowIndex === -1) {
      return createJSONResponse({ status: "error", message: "المصروف غير موجود في السجلات (الرمز المبحوث عنه: " + targetId + ")" });
    }

    sheet.deleteRow(foundRowIndex);
    SpreadsheetApp.flush(); 

    const refundSuccess = updateBranchBalance(branchId, amountToRefund);
    console.log("Refund Process - Branch: " + branchId + ", Amount: " + amountToRefund + ", Status: " + refundSuccess);

    return createJSONResponse({ 
      status: "success", 
      message: "تم حذف المصروف بنجاح وإعادة المبلغ (" + amountToRefund + ") لرصيد فرع " + branchId,
      refunded: amountToRefund,
      refundSuccess: refundSuccess
    });

  } catch (e) {
    console.log("Exception in handleDeleteExpense: " + e.toString());
    return createJSONResponse({ status: "error", message: "فشل الحذف: " + e.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * 7. تسليم المعاملة وتحصيل المتبقي (Delivery & Collection)
 */
function handleDeliverOrder(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const ss = getSS();
    const sheetEntries = ss.getSheetByName("Entries");
    if (!sheetEntries) return createJSONResponse({ status: "error", message: "Entries sheet not found" });

    const map = getHeaderMapping(sheetEntries, "Entries");
    const idColIdx = getColIndex("Entries", "id");
    const statusColIdx = getColIndex("Entries", "status");
    const deliveredDateColIdx = getColIndex("Entries", "deliveredDate");

    if (idColIdx === undefined) return createJSONResponse({ status: "error", message: "ID Column not found" });

    const dataRange = sheetEntries.getDataRange();
    const values = dataRange.getValues();
    
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][idColIdx]) === String(data.orderId)) {
        rowIndex = i;
        break;
      }
    }
    
    if (rowIndex === -1) return createJSONResponse({ status: "error", message: "Order not found" });

    const cairoTime = Utilities.formatDate(new Date(), "Africa/Cairo", "yyyy-MM-dd");

    // 1. تحديث حالة الطلب وتاريخ التسليم
    if (statusColIdx !== undefined) {
      sheetEntries.getRange(rowIndex + 1, statusColIdx + 1).setValue("تم التسليم");
    }
    if (deliveredDateColIdx !== undefined) {
      sheetEntries.getRange(rowIndex + 1, deliveredDateColIdx + 1).setValue(cairoTime);
    }

    // 2. إذا كان هناك مبلغ محصل (سداد مديونية)
    const remainingCollected = parseFloat(data.remainingCollected || 0);
    if (remainingCollected > 0) {
      const headerKeys = SHEET_CONFIG["Entries"];
      const newRow = headerKeys.map(key => {
        const k = key.toLowerCase();
        if (k === 'id') return Date.now().toString() + "-collect";
        if (k === 'clientname') return data.clientName;
        if (k === 'servicetype') return "سداد مديونية";
        if (k === 'amountpaid') return remainingCollected;
        if (k === 'servicecost') return 0; // سداد المديونية تكلفته صفرية لأنه تحصيل فقط
        if (k === 'remainingamount') return 0;
        if (k === 'thirdpartycost') return 0; // فصل منطق الطرف الثالث: السداد لا يحمل تكلفة مورد
        if (k === 'hasthirdparty') return false;
        if (k === 'thirdpartyname') return ""; // مسح اسم المورد لضمان عدم الفلترة الخاطئة
        if (k === 'iscostpaid') return false;
        if (k === 'entrydate') return cairoTime;
        if (k === 'timestamp') return Date.now();
        if (k === 'recordedby') return data.collectorName;
        if (k === 'branchid') return data.branchId;
        if (k === 'status') return "active";
        if (k === 'parententryid') return data.orderId;
        return "";
      });
      sheetEntries.appendRow(newRow);
      applyTextFormatting(sheetEntries, map, sheetEntries.getLastRow());
      
      // 3. تحديث رصيد الفرع المحصل
      updateBranchBalance(data.branchId, remainingCollected);
    }

    return createJSONResponse({ status: "success" });
  } catch (err) {
    return createJSONResponse({ status: "error", message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * 6. نظام الحضور والانصراف (Attendance)
 */
function handleAttendance(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const ss = getSS();
    let sheet = ss.getSheetByName("Attendance");
    
    // إنشاء الشيت إذا لم تكن موجودة بالهيدرز الصحيحة
    if (!sheet) {
      sheet = ss.insertSheet("Attendance");
      sheet.appendRow(SHEET_CONFIG["Attendance"]);
    }
    
    const idxUserID = getColIndex("Attendance", "users_ID");
    const idxType = getColIndex("Attendance", "Type");
    const idxTimestamp = getColIndex("Attendance", "Timestamp");
    const idxHours = getColIndex("Attendance", "Total_Hours");
    const idxBranch = getColIndex("Attendance", "branchId");
    const idxIP = getColIndex("Attendance", "ip");

    if ([idxUserID, idxType, idxTimestamp, idxHours].some(idx => idx === undefined)) {
      return createJSONResponse({ status: "error", message: "هيكل جدول الحضور غير مكتمل" });
    }

    // 1. التحقق من الـ IP (Dynamic Whitelist Logic)
    let isAuthorized = true;
    const configSheet = ss.getSheetByName("Branches_Config");
    
    if (configSheet) {
      const idxBranchName = getColIndex("Branches_Config", "Branch_Name");
      const idxAuthIP = getColIndex("Branches_Config", "Authorized_IP");
      const configData = configSheet.getDataRange().getValues();
      
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
    const cairoTimeStr = Utilities.formatDate(today, "Africa/Cairo", "yyyy-MM-dd HH:mm:ss");
    const todayDateStr = Utilities.formatDate(today, "Africa/Cairo", "yyyy-MM-dd");
    
    let totalHours = 0;

    // منطق حساب الساعات عند الانصراف
    if (data.type === 'check-out') {
      const rows = sheet.getDataRange().getValues();
      const targetUserID = String(data.users_ID || "").trim();
      let foundCheckIn = false;

      for (let i = rows.length - 1; i > 0; i--) {
        const row = rows[i];
        const rowUserID = String(row[idxUserID] || "").trim();
        const rowType = String(row[idxType] || "").trim();
        const rowTimestamp = row[idxTimestamp];

        if (rowUserID === targetUserID && rowType === 'check-in') {
          let checkInDate;
          if (rowTimestamp instanceof Date) {
            checkInDate = rowTimestamp;
          } else {
            const parts = String(rowTimestamp).split(' ');
            if (parts.length >= 2) {
              const d = parts[0].split('-');
              const t = parts[1].split(':');
              checkInDate = new Date(d[0], d[1]-1, d[2], t[0], t[1], t[2]);
            }
          }

          if (checkInDate && !isNaN(checkInDate.getTime())) {
            const diffMs = today.getTime() - checkInDate.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);

            if (diffHours >= 0 && diffHours <= 24) {
              totalHours = parseFloat(diffHours.toFixed(2));
              foundCheckIn = true;
              break;
            }
          }
        }
      }

      if (!foundCheckIn) {
        return createJSONResponse({ 
          status: "error", 
          message: "لا يوجد تسجيل حضور مفتوح لهذا اليوم (خلال آخر 24 ساعة). يرجى تسجيل الحضور أولاً." 
        });
      }
    }

    // إنشاء الصف الجديد بناءً على الهيدرز في SHEET_CONFIG
    const headers = SHEET_CONFIG["Attendance"];
    const newRow = headers.map(headerName => {
       switch(headerName) {
         case 'id': return Date.now().toString();
         case 'users_ID': return String(data.users_ID || "").trim();
         case 'username': return data.username;
         case 'branchId': return data.branchId;
         case 'Type': return data.type;
         case 'ip': return data.ip;
         case 'Timestamp': return cairoTimeStr;
         case 'date': return todayDateStr;
         case 'Total_Hours': return totalHours;
         default: return "";
       }
    });

    sheet.appendRow(newRow);
    return createJSONResponse({ status: "success", timestamp: cairoTimeStr });

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
    const idxId = getColIndex("Users", "id");
    const idxName = getColIndex("Users", "name");
    const idxPass = getColIndex("Users", "password");
    const idxRole = getColIndex("Users", "role");
    const idxBranch = getColIndex("Users", "assignedBranchId");

    if (idxId === undefined || idxPass === undefined) {
      return createJSONResponse({ success: false, message: "هيكل جدول المستخدمين غير صحيح" });
    }
  
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (String(row[idxId]).trim() === String(id).trim() && String(row[idxPass]) === String(password)) {
        return createJSONResponse({ 
          success: true, 
          id: String(row[idxId]), 
          name: row[idxName], 
          role: row[idxRole], 
          assignedBranchId: row[idxBranch]
        });
      }
    }
    return createJSONResponse({ success: false, message: "ID أو كلمة مرور خاطئة" });
  } catch (err) {
    return createJSONResponse({ success: false, message: err.toString() });
  }
}

/**
 * 1. جلب البيانات من أي شيت (Entries, Expenses, Stock) مع فلترة الحماية
 */
function handleGetData(sheetName, role, username) {
  try {
    if (sheetName === 'Branches_Config') checkAndResetDailyBalances();
    const ss = getSS();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return createJSONResponse([]);
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return createJSONResponse([]);
    
    const headers = data[0].map(h => String(h).trim());
    const rows = data.slice(1);
    const tz = ss.getSpreadsheetTimeZone();
    
    const map = getHeaderMapping(sheet, sheetName);
    const isAdmin = normalizeArabic(role) === normalizeArabic('مدير') || role === 'Admin';
    
    const result = rows
      .filter(row => {
        if (!row.some(cell => String(cell).trim() !== "")) return false;
        
        // تطبيق فلتر الصلاحيات (اختياري، مدمج حالياً في العرض بالفرونت إند، لكن هنا للأمان)
        return true;
      })
      .map(row => {
        const obj = {};
        
        // جلب البيانات بناءً على الهيدرز الموجودة
        headers.forEach((header, index) => {
          let val = row[index];
          if (val instanceof Date) {
            val = Utilities.formatDate(val, tz, "yyyy-MM-dd");
          }
          
          const hLower = header.toLowerCase();
          // تحويل الحقول المعرفة كسلاسل نصية
          if (hLower === 'id' || hLower === 'users_id' || hLower === 'معرف' || hLower === 'barcode' || hLower === 'الباركود' || hLower === 'nationalid' || hLower === 'الرقم القومي') {
            val = String(val || "");
          }
          
          obj[header] = val;
          // توفير نسخة بالاسم الصغير لتسهيل الوصول في الفرونت إند
          obj[hLower] = val;
        });

        // تأكيد وجود الحقول الهامة باستخدام الخريطة (Mapping)
        Object.keys(map).forEach(key => {
          const idx = map[key];
          if (idx !== undefined && idx < row.length) {
            let val = row[idx];
            if (val instanceof Date) val = Utilities.formatDate(val, tz, "yyyy-MM-dd");
            obj[key] = val;
          }
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
/**
 * دالة جلب تقرير HR للمدير (الساعات الأسبوعية والشهرية)
 * مطور لدعم فلتر الشهر وتفاصيل الحضور اليومية
 */
function handleGetHRReport(monthParam) {
  try {
    const ss = getSS();
    const sheet = ss.getSheetByName("Attendance");
    if (!sheet) return createJSONResponse([]);
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return createJSONResponse([]);
    
    const idxUserID = getColIndex("Attendance", "users_ID");
    const idxUser = getColIndex("Attendance", "username");
    const idxHours = getColIndex("Attendance", "Total_Hours");
    const idxDate = getColIndex("Attendance", "date");
    const idxType = getColIndex("Attendance", "Type");
    const idxTime = getColIndex("Attendance", "Timestamp");
    
    if (idxUserID === undefined || idxHours === undefined || idxDate === undefined) {
      return createJSONResponse({ status: "error", message: "الأعمدة المطلوبة غير موجودة في جدول الحضور" });
    }

    const now = new Date();
    const todayStr = Utilities.formatDate(now, "Africa/Cairo", "yyyy-MM-dd");

    // تحديد الشهر المستهدف (إما من البارامتر أو الشهر الحالي)
    let targetYear, targetMonth;
    if (monthParam) {
      const parts = monthParam.split('-');
      targetYear = parseInt(parts[0]);
      targetMonth = parseInt(parts[1]);
    } else {
      targetYear = parseInt(Utilities.formatDate(now, "Africa/Cairo", "yyyy"));
      targetMonth = parseInt(Utilities.formatDate(now, "Africa/Cairo", "MM"));
    }

    const report = {};

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const userID = String(row[idxUserID] || "").trim();
      const userName = String(row[idxUser] || "").trim();
      if (!userID) continue;
      
      const dateVal = row[idxDate];
      let rowYear, rowMonth, rowDay, rowDateStr = "";

      // استخراج التاريخ
      if (dateVal instanceof Date) {
         rowDateStr = Utilities.formatDate(dateVal, "Africa/Cairo", "yyyy-MM-dd");
         const parts = rowDateStr.split('-');
         rowYear = parseInt(parts[0]);
         rowMonth = parseInt(parts[1]);
         rowDay = parseInt(parts[2]);
      } else {
         rowDateStr = String(dateVal).trim();
         const parts = rowDateStr.split(/\D+/);
         if (parts.length >= 3) {
            rowYear = parts[0].length === 4 ? parseInt(parts[0]) : parseInt(parts[2]);
            rowMonth = parseInt(parts[1]);
            rowDay = parts[0].length === 4 ? parseInt(parts[2]) : parseInt(parts[0]);
         }
      }

      if (!rowYear || !rowMonth) continue;
      
      if (!report[userID]) {
        report[userID] = {
          name: userName || userID,
          week1: 0,
          week2: 0,
          week3: 0,
          week4: 0,
          totalMonth: 0,
          todayTotal: 0,
          checkIn: "-",
          checkOut: "-",
          todayStatus: "غائب"
        };
      }

      const activeUser = report[userID];
      const hours = parseFloat(row[idxHours] || 0);

      // 1. منطق اليوم الحالي (دائماً مرتبط بتاريخ اليوم الحقيقي للعرض في الجدول الرئيسي)
      if (rowDateStr === todayStr) {
        if (idxType !== undefined && idxTime !== undefined) {
           const type = String(row[idxType]).toLowerCase();
           let timePart = "";
           const val = row[idxTime];
           
           if (val instanceof Date) {
             timePart = Utilities.formatDate(val, "Africa/Cairo", "hh:mm a");
           } else {
             const fullTime = String(val);
             timePart = fullTime.includes(' ') ? fullTime.split(' ')[1] : fullTime;
           }

           if (type.includes('check-in')) {
             activeUser.checkIn = timePart;
             activeUser.todayStatus = "حاضر";
           } else if (type.includes('check-out')) {
             activeUser.checkOut = timePart;
             if (hours > 0) activeUser.todayTotal += hours;
           }
        }
      }

      // 2. منطق تجميع الشهر (بناءً على الشهر المختار للفلترة)
      if (rowMonth === targetMonth && rowYear === targetYear) {
        if (!isNaN(hours) && hours > 0) {
          if (rowDay <= 7) activeUser.week1 += hours;
          else if (rowDay <= 14) activeUser.week2 += hours;
          else if (rowDay <= 21) activeUser.week3 += hours;
          else activeUser.week4 += hours;

          activeUser.totalMonth += hours;
        }
      }
    }

    const finalResult = Object.keys(report).map(id => ({
      id: id,
      name: report[id].name,
      week1: parseFloat(report[id].week1.toFixed(2)),
      week2: parseFloat(report[id].week2.toFixed(2)),
      week3: parseFloat(report[id].week3.toFixed(2)),
      week4: parseFloat(report[id].week4.toFixed(2)),
      totalMonth: parseFloat(report[id].totalMonth.toFixed(2)),
      todayTotal: parseFloat(report[id].todayTotal.toFixed(2)),
      checkIn: report[id].checkIn,
      checkOut: report[id].checkOut,
      todayStatus: report[id].todayStatus
    }));

    return createJSONResponse(finalResult);
  } catch (err) {
    return createJSONResponse({ status: "error", message: err.toString() });
  }
}

/**
 * جلب كافة حركات موظف معين للشهر الحالي
 */
/**
 * جلب كافة حركات موظف معين لشهر محدد أو الشهر الحالي
 */
function handleGetUserLogs(username, monthParam) {
  try {
    const ss = getSS();
    const sheet = ss.getSheetByName("Attendance");
    if (!sheet) return createJSONResponse([]);
    
    const data = sheet.getDataRange().getValues();
    const idxUserID = getColIndex("Attendance", "users_ID");
    const idxType = getColIndex("Attendance", "Type");
    const idxTime = getColIndex("Attendance", "Timestamp");
    const idxHours = getColIndex("Attendance", "Total_Hours");
    const idxDate = getColIndex("Attendance", "date");

    const now = new Date();
    // تحديد الشهر المستهدف
    let targetYear, targetMonth;
    if (monthParam) {
      const parts = monthParam.split('-');
      targetYear = parseInt(parts[0]);
      targetMonth = parseInt(parts[1]);
    } else {
      targetYear = parseInt(Utilities.formatDate(now, "Africa/Cairo", "yyyy"));
      targetMonth = parseInt(Utilities.formatDate(now, "Africa/Cairo", "MM"));
    }

    const logs = [];
    const targetUserID = String(username || "").trim();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (String(row[idxUserID] || "").trim() !== targetUserID) continue;

      const dateVal = row[idxDate];
      let rowYear, rowMonth;
      if (dateVal instanceof Date) {
        rowYear = dateVal.getFullYear();
        rowMonth = dateVal.getMonth() + 1;
      } else {
        const parts = String(dateVal).split(/\D+/);
        if (parts.length >= 3) {
          rowYear = parts[0].length === 4 ? parseInt(parts[0]) : parseInt(parts[2]);
          rowMonth = parseInt(parts[1]);
        }
      }

      if (rowMonth !== targetMonth || rowYear !== targetYear) continue;

      const val = row[idxTime];
      let rowDateStr = "";
      let timePart = "";

      if (dateVal instanceof Date) {
        rowDateStr = Utilities.formatDate(dateVal, "Africa/Cairo", "yyyy-MM-dd");
      } else {
        rowDateStr = String(row[idxDate]).split('T')[0];
      }

      if (val instanceof Date) {
        timePart = Utilities.formatDate(val, "Africa/Cairo", "hh:mm:ss a");
      } else {
        const fullTimeStr = String(val);
        timePart = fullTimeStr.includes(' ') ? fullTimeStr.split(' ')[1] : fullTimeStr;
      }
      
      const formattedDateTime = `${rowDateStr} ${timePart}`;
      const hoursValue = parseFloat(row[idxHours] || 0);

      logs.push({
        dateTime: formattedDateTime,
        type: row[idxType],
        hours: hoursValue
      });
    }

    return createJSONResponse(logs.reverse());
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
    lock.waitLock(20000);
    const ss = getSS();
    const sheet = ss.getSheetByName(sheetName);
    const map = getHeaderMapping(sheet, sheetName);
    
    // جلب الهيدرز الفعلية من الشيت لضمان الترتيب الصحيح
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const textFields = new Set([
      'phoneNumber', 'رقم الهاتف', 'phone',
      'barcode', 'الباركود', 'Barcode',
      'nationalId', 'الرقم القومي'
    ]);

    const isEntries = sheetName === 'Entries' || normalizeArabic(sheetName) === normalizeArabic('المعاملات');
    const serviceType = data['serviceType'] || data['نوع الخدمة'] || "";
    const isSettlement = isEntries && normalizeArabic(serviceType) === normalizeArabic('سداد مديونية');

    if (isSettlement) {
      // فصل منطق سداد المديونية: تصفير أي مبالغ تخص الطرف الثالث لعدم التكرار
      data['thirdPartyCost'] = 0;
      data['thirdpartycost'] = 0;
      data['hasThirdParty'] = false;
      data['hasthirdparty'] = false;
      data['serviceCost'] = 0; // السداد لا تكلفة له
      data['remainingAmount'] = 0;
      // مسح الأسماء لضمان عدم ظهورها في الاحصائيات
      data['thirdPartyName'] = "";
      data['thirdpartyname'] = "";
    }

    const newRow = headers.map(h => {
      const headerName = String(h).trim();
      let val = data[headerName];
      if (val === undefined || val === null) {
        val = data[headerName.toLowerCase()] || "";
      }

      if (textFields.has(headerName) && val && String(val).startsWith('0')) {
        return "'" + val;
      }
      return val;
    });

    // منطق الرصيد الحي
    if (sheetName === 'Expenses' || normalizeArabic(sheetName) === normalizeArabic('المصروفات')) {
      const amount = parseFloat(data['amount'] || data['المبلغ'] || 0);
      const branch = data['branchId'] || data['الفرع'];
      const currentBalance = getBranchBalance(branch);
      
      if (currentBalance < amount) {
        return createJSONResponse({ status: "error", message: "رصيد الفرع لا يكفي لإتمام هذه العملية" });
      }
      updateBranchBalance(branch, -amount);
    } else if (isEntries) {
      const amountPaid = parseFloat(data['amountPaid'] || data['المدفوع'] || 0);
      const branch = data['branchId'] || data['الفرع'];
      
      if (isSettlement) {
        // تحديث المبلع المتبقي في المعاملة الأصلية (Parent Entry)
        const parentId = data['parentEntryId'] || data['المعاملة الأصلية'];
        if (parentId) {
          const idColIdx = getColIndex(sheetName, "id");
          const remColIdx = getColIndex(sheetName, "remainingAmount");
          if (idColIdx !== undefined && remColIdx !== undefined) {
             const values = sheet.getDataRange().getValues();
             for (let i = 1; i < values.length; i++) {
               if (String(values[i][idColIdx]) === String(parentId)) {
                 const currentRem = parseFloat(values[i][remColIdx] || 0);
                 const newRem = Math.max(0, parseFloat((currentRem - amountPaid).toFixed(2)));
                 sheet.getRange(i + 1, remColIdx + 1).setValue(newRem);
                 break;
               }
             }
          }
        }
      }

      if (amountPaid > 0) {
        updateBranchBalance(branch, amountPaid);
      }
    }

    sheet.appendRow(newRow);
    applyTextFormatting(sheet, map, sheet.getLastRow());

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
    lock.waitLock(20000);
    const ss = getSS();
    const sheet = ss.getSheetByName(sheetName);
    const map = getHeaderMapping(sheet, sheetName);
    const idColIdx = getColIndex(sheetName, "id");
    
    if (idColIdx === undefined) return createJSONResponse({ status: "error", message: "ID Column not found" });

    const values = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
        if (String(values[i][idColIdx]) === String(data.id)) {
            rowIndex = i;
            break;
        }
    }
    
    if (rowIndex === -1) return createJSONResponse({ status: "error", message: "السجل غير موجود" });
    
    const rowToUpdate = values[rowIndex];
    const oldStatusIdx = getColIndex(sheetName, "status");
    const oldAmountPaidIdx = getColIndex(sheetName, "amountPaid");
    const branchIdx = getColIndex(sheetName, "branchId");
    
    const oldStatus = oldStatusIdx !== undefined ? String(rowToUpdate[oldStatusIdx]) : "";
    const oldAmountPaid = oldAmountPaidIdx !== undefined ? parseFloat(rowToUpdate[oldAmountPaidIdx] || 0) : 0;
    const branch = branchIdx !== undefined ? String(rowToUpdate[branchIdx]) : "";

    // تحديث البيانات في المصفوفة
    Object.keys(data).forEach(key => {
       if (key === 'id') return;
       const colIdx = getColIndex(sheetName, key);
       if (colIdx !== undefined) {
          let val = data[key];
          const textFields = new Set(['phoneNumber', 'رقم الهاتف', 'phone', 'barcode', 'الباركود', 'Barcode', 'nationalId', 'الرقم القومي']);
          if (textFields.has(key) && val && String(val).startsWith('0')) {
            rowToUpdate[colIdx] = "'" + val;
          } else {
            rowToUpdate[colIdx] = val;
          }
       }
    });
    
    // منطق الإلغاء والخصم الفوري لـ Entries
    if (sheetName === 'Entries' || normalizeArabic(sheetName) === normalizeArabic('المعاملات')) {
      const newStatus = data['status'] || oldStatus;
      const newAmountPaid = data['amountPaid'] !== undefined ? parseFloat(data['amountPaid']) : oldAmountPaid;

      const isNowCancelled = normalizeArabic(newStatus) === normalizeArabic('ملغي') || newStatus.toLowerCase() === 'cancelled';
      const wasCancelled = normalizeArabic(oldStatus) === normalizeArabic('ملغي') || oldStatus.toLowerCase() === 'cancelled';

      if (isNowCancelled && !wasCancelled) {
        updateBranchBalance(branch, -oldAmountPaid);
      } else if (!isNowCancelled && !wasCancelled && newAmountPaid !== oldAmountPaid) {
        updateBranchBalance(branch, newAmountPaid - oldAmountPaid);
      }
    }

    sheet.getRange(rowIndex + 1, 1, 1, rowToUpdate.length).setValues([rowToUpdate]);
    applyTextFormatting(sheet, map, rowIndex + 1);

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
    
    // تطبيق التنسيق النصي على المدى المضاف بالكامل
    const startRow = sheet.getLastRow() - rows.length + 1;
    for (let r = 0; r < rows.length; r++) {
      applyTextFormatting(sheet, map, startRow + r);
    }

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
    lock.waitLock(20000);
    const ss = getSS();
    const sheet = ss.getSheetByName("Stock");
    
    const barcodeCol = getColIndex("Stock", "Barcode");
    const statusCol = getColIndex("Stock", "Status");
    const usedByCol = getColIndex("Stock", "Used_By");
    const usageDateCol = getColIndex("Stock", "Usage_Date");
    const orderIdCol = getColIndex("Stock", "Order_ID");

    if (barcodeCol === undefined) return createJSONResponse({ status: "error", message: "Barcode Column Missing" });

    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][barcodeCol]) === String(params.barcode)) {
        const rowData = values[i];
        const isAvailable = params.status === "Available";
        
        if (statusCol !== undefined) rowData[statusCol] = params.status;
        if (usedByCol !== undefined) rowData[usedByCol] = isAvailable ? "" : (params.usedBy || "");
        if (usageDateCol !== undefined) rowData[usageDateCol] = isAvailable ? "" : new Date().toISOString();
        if (orderIdCol !== undefined) rowData[orderIdCol] = isAvailable ? "" : (params.orderId || "");
        
        sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
        applyTextFormatting(sheet, getHeaderMapping(sheet, "Stock"), i + 1);
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
    lock.waitLock(20000);
    const ss = getSS();
    const sheet = ss.getSheetByName("Stock");
    const barcodeCol = getColIndex("Stock", "Barcode");
    const branchCol = getColIndex("Stock", "Branch");
    
    if (barcodeCol === undefined) return createJSONResponse({ status: "error", message: "Barcode Column missing" });

    const values = sheet.getDataRange().getValues();
    const oldBarcode = String(data.oldBarcode).trim();

    for (let i = 1; i < values.length; i++) {
      if (String(values[i][barcodeCol]) === oldBarcode) {
        const range = sheet.getRange(i + 1, 1, 1, values[i].length);
        const rowData = values[i];
        
        rowData[barcodeCol] = data.newBarcode;
        if (branchCol !== undefined) rowData[branchCol] = data.newBranch;
        
        range.setValues([rowData]);
        applyTextFormatting(sheet, getHeaderMapping(sheet, "Stock"), i + 1);
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
    lock.waitLock(20000);
    const ss = getSS();
    const sheet = ss.getSheetByName("Stock");
    const barcodeCol = getColIndex("Stock", "Barcode");
    
    if (barcodeCol === undefined) return createJSONResponse({ status: "error", message: "Barcode Column missing" });

    const values = sheet.getDataRange().getValues();
    const targetBarcode = String(barcode).trim();

    for (let i = values.length - 1; i > 0; i--) {
      if (String(values[i][barcodeCol]) === targetBarcode) {
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
  const cacheKey = "headers_v5_" + sheetName; // ترقية للنسخة v5
  const cached = cache.get(cacheKey);
  
  if (cached) return JSON.parse(cached);

  if (!sheet) {
    const ss = getSS();
    sheet = ss.getSheetByName(sheetName);
  }
  
  if (!sheet) return {};

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((h, i) => {
    const headerName = String(h).trim();
    map[headerName] = i;
  });
  
  // التأكد من وجود كافة الأعمدة المطلوبة من SCHEMA_CONFIG في المابنج لتجنب الأخطاء
  if (SHEET_CONFIG[sheetName]) {
    SHEET_CONFIG[sheetName].forEach(col => {
      if (map[col] === undefined) {
        // إذا لم يجد الاسم اللاتيني، يبحث عن بديل عربي إذا لزم الأمر أو يتركه undefined
        // لكننا نعتمد الآن على الأسماء في SHEET_CONFIG كمرجع أساسي
      }
    });
  }

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

/**
 * دالة لضبط تنسيق الأعمدة الحساسة (هاتف، باركود، رقم قومي) كـ "Plain Text"
 * لضمان عدم فقدان الأصفار جهة اليسار.
 */
function applyTextFormatting(sheet, map, rowIndex) {
  const textFields = [
    'phoneNumber', 'رقم الهاتف', 'phone',
    'barcode', 'الباركود', 'Barcode',
    'nationalId', 'الرقم القومي'
  ];
  
  textFields.forEach(field => {
    const colIdx = map[field];
    if (colIdx !== undefined) {
      sheet.getRange(rowIndex, colIdx + 1).setNumberFormat('@');
    }
  });
}

/**
 * دالة تحديث رصيد الفرع في شيت الإعدادات
 * تم إضافة حماية LockService وفحص صارم لصحة البيانات
 */
function updateBranchBalance(branchId, amount) {
  checkAndResetDailyBalances();
  const amountParsed = parseFloat(amount || 0);
  if (isNaN(amountParsed) || amountParsed === 0) return true;
  
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const ss = getSS();
    const configSheet = ss.getSheetByName("Branches_Config");
    if (!configSheet) return false;
  
    const nameCol = getColIndex("Branches_Config", "Branch_Name");
    const balanceCol = getColIndex("Branches_Config", "Current_Balance");
  
    if (nameCol === undefined || balanceCol === undefined) return false;
  
    const data = configSheet.getDataRange().getValues();
    const targetBranch = normalizeArabic(branchId);
  
    for (let i = 1; i < data.length; i++) {
      if (normalizeArabic(data[i][nameCol]) === targetBranch) {
        let currentVal = parseFloat(data[i][balanceCol] || 0);
        if (isNaN(currentVal)) currentVal = 0;
        
        const newValue = parseFloat((currentVal + amountParsed).toFixed(2));
        configSheet.getRange(i + 1, balanceCol + 1).setValue(newValue);
        SpreadsheetApp.flush(); 
        return true;
      }
    }
    return false;
  } catch (err) {
    Logger.log("UpdateBalance Error: " + err.toString());
    throw err;
  } finally {
    lock.releaseLock();
  }
}

/**
 * جلب رصيد فرع معين مع فحص صحة البيانات
 */
function getBranchBalance(branchId) {
  checkAndResetDailyBalances();
  const ss = getSS();
  const configSheet = ss.getSheetByName("Branches_Config");
  if (!configSheet) return 0;

  const nameCol = getColIndex("Branches_Config", "Branch_Name");
  const balanceCol = getColIndex("Branches_Config", "Current_Balance");
  if (nameCol === undefined || balanceCol === undefined) return 0;

  const data = configSheet.getDataRange().getValues();
  const target = normalizeArabic(branchId);

  for (let i = 1; i < data.length; i++) {
    if (normalizeArabic(data[i][nameCol]) === target) {
      const val = parseFloat(data[i][balanceCol] || 0);
      return isNaN(val) ? 0 : val;
    }
  }
  return 0;
}

/**
 * دالة التحويل المالي بين الفروع
 */
function handleBranchTransfer(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const ss = getSS();
    const sheetExpenses = ss.getSheetByName("Expenses");
    
    const amount = parseFloat(data.amount || 0);
    if (isNaN(amount) || amount <= 0) return createJSONResponse({ status: "error", message: "مبلغ غير صالح" });

    // 1. خصم من الفرع المرسل وتحقق من الرصيد
    const fromBranchBalance = getBranchBalance(data.fromBranch);
    if (fromBranchBalance < amount) {
      return createJSONResponse({ status: "error", message: "رصيد الفرع المرسل لا يكفي لإتمام هذه العملية" });
    }

    // 2. تحديث الأرصدة
    updateBranchBalance(data.fromBranch, -amount);
    updateBranchBalance(data.toBranch, amount);

    // 3. تسجيل كمصروف في الفرع المرسل للتوثيق
    if (sheetExpenses) {
      const headers = SHEET_CONFIG["Expenses"];
      const cairoDate = Utilities.formatDate(new Date(), "Africa/Cairo", "yyyy-MM-dd");
      const rowFrom = headers.map(key => {
        const k = key.toLowerCase();
        if (k === 'id') return Date.now() + "-tf-out";
        if (k === 'category') return "تحويل صادر";
        if (k === 'amount') return amount;
        if (k === 'branchid') return data.fromBranch;
        if (k === 'date') return cairoDate;
        if (k === 'recordedby') return data.recordedBy;
        if (k === 'notes') return `تحويل إلى فرع: ${data.toBranch}`;
        return "";
      });
      sheetExpenses.appendRow(rowFrom);
    }
    return createJSONResponse({ status: "success" });
  } catch (err) {
    return createJSONResponse({ status: "error", message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * دالة فحص وتصفير الأرصدة يومياً عند بدء أول عملية أو جلب بيانات
 */
function checkAndResetDailyBalances() {
  const lock = LockService.getScriptLock();
  try {
    if (lock.tryLock(15000)) {
      const ss = getSS();
      const configSheet = ss.getSheetByName("Branches_Config");
      if (!configSheet) return;

      const map = getHeaderMapping(configSheet, "Branches_Config");
      let resetDateCol = map['Last_Reset_Date'] || map['Last Reset Date'];
      const balanceCol = map['Current_Balance'];
      
      if (balanceCol === undefined) return;

      if (resetDateCol === undefined) {
        const lastCol = configSheet.getLastColumn();
        configSheet.getRange(1, lastCol + 1).setValue("Last_Reset_Date");
        CacheService.getScriptCache().remove("headers_v5_Branches_Config");
        resetDateCol = lastCol;
      }

      const today = Utilities.formatDate(new Date(), "Africa/Cairo", "yyyy-MM-dd");
      const data = configSheet.getDataRange().getValues();
      let anyReset = false;

      for (let i = 1; i < data.length; i++) {
        const val = data[i][resetDateCol];
        let lastReset = "";
        if (val instanceof Date) {
          lastReset = Utilities.formatDate(val, "Africa/Cairo", "yyyy-MM-dd");
        } else {
          lastReset = String(val || "").split('T')[0];
        }

        if (lastReset !== today) {
          configSheet.getRange(i + 1, balanceCol + 1).setValue(0);
          configSheet.getRange(i + 1, resetDateCol + 1).setValue(today);
          anyReset = true;
        }
      }
      
      if (anyReset) {
        SpreadsheetApp.flush();
      }
    }
  } catch (err) {
    console.error("Reset Error:", err);
  } finally {
    lock.releaseLock();
  }
}

/**
 * إدارة الموظفين للمدير فقط
 */
function handleManageUsers(data) {
  const ss = getSS();
  const sheet = ss.getSheetByName("Users");
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(20000);
    const idCol = getColIndex("Users", "id");
    const nameCol = getColIndex("Users", "name");
    const passCol = getColIndex("Users", "password");
    const roleCol = getColIndex("Users", "role");
    const branchCol = getColIndex("Users", "assignedBranchId");

    const values = sheet.getDataRange().getValues();

    if (data.type === 'add') {
      const newId = String(data.user.id).trim();
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][idCol]).trim() === newId) {
          return createJSONResponse({ status: "error", message: "هذا الـ ID مسجل مسبقاً لموظف آخر" });
        }
      }

      const headers = SHEET_CONFIG["Users"];
      const row = headers.map(key => {
         const k = key.toLowerCase();
         if (k === 'id') return String(data.user.id).trim();
         if (k === 'name') return data.user.name;
         if (k === 'password') return String(data.user.password);
         if (k === 'role') return data.user.role;
         if (k === 'assignedbranchid') return data.user.assignedBranchId;
         return "";
      });
      
      sheet.appendRow(row);
      return createJSONResponse({ status: "success", message: "تم إضافة الموظف بنجاح" });
    }

    if (data.type === 'delete') {
      const targetId = String(data.id).trim();
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][idCol]).trim() === targetId) {
          sheet.deleteRow(i + 1);
          return createJSONResponse({ status: "success", message: "تم حذف الموظف بنجاح" });
        }
      }
      return createJSONResponse({ status: "error", message: "الموظف غير موجود" });
    }

    if (data.type === 'update') {
      const targetId = String(data.user.id).trim();
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][idCol]).trim() === targetId) {
          if (data.user.password && passCol !== undefined) sheet.getRange(i + 1, passCol + 1).setValue(String(data.user.password));
          if (data.user.assignedBranchId && branchCol !== undefined) sheet.getRange(i + 1, branchCol + 1).setValue(data.user.assignedBranchId);
          if (data.user.role && roleCol !== undefined) sheet.getRange(i + 1, roleCol + 1).setValue(data.user.role);
          if (data.user.name && nameCol !== undefined) sheet.getRange(i + 1, nameCol + 1).setValue(data.user.name);
          return createJSONResponse({ status: "success", message: "تم تحديث بيانات الموظف بنجاح" });
        }
      }
    }
  } catch (e) {
    return createJSONResponse({ status: "error", message: e.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * إدارة الفروع للمدير فقط
 */
function handleManageBranches(data) {
  const ss = getSS();
  const sheet = ss.getSheetByName("Branches_Config");
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(20000);
    const nameCol = getColIndex("Branches_Config", "Branch_Name");
    const balanceCol = getColIndex("Branches_Config", "Current_Balance");
    const ipCol = getColIndex("Branches_Config", "Authorized_IP");

    if (data.type === 'add') {
      const headers = SHEET_CONFIG["Branches_Config"];
      const row = headers.map(key => {
         const k = key.toLowerCase();
         if (k === 'branch_name') return data.branch.name;
         if (k === 'current_balance') return 0;
         if (k === 'authorized_ip') return data.branch.ip || '';
         return "";
      });
      sheet.appendRow(row);
      return createJSONResponse({ status: "success", message: "تم إضافة الفرع بنجاح" });
    }

    if (data.type === 'delete') {
      const values = sheet.getDataRange().getValues();
      const targetName = normalizeArabic(data.name);
      for (let i = 1; i < values.length; i++) {
        if (normalizeArabic(values[i][nameCol]) === targetName) {
          sheet.deleteRow(i + 1);
          return createJSONResponse({ status: "success", message: "تم حذف الفرع بنجاح" });
        }
      }
      return createJSONResponse({ status: "error", message: "الفرع غير موجود" });
    }
  } catch (e) {
    return createJSONResponse({ status: "error", message: e.toString() });
  } finally {
    lock.releaseLock();
  }
}
function handleUpdateSettings(data) {
  const ss = getSS();
  let sheet = ss.getSheetByName("Service_Expense");
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(20000);
    
    // 1. إنشاء الشيت إذا لم تكن موجودة
    if (!sheet) {
      sheet = ss.insertSheet("Service_Expense");
      sheet.appendRow(SHEET_CONFIG["Service_Expense"]);
      SpreadsheetApp.flush();
    }

    // 2. فحص الهيدرز
    let lastCol = sheet.getLastColumn();
    let headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    const expected = SHEET_CONFIG["Service_Expense"];
    let updatedHeaders = false;

    expected.forEach(col => {
      const found = headers.some(h => normalizeArabic(String(h).trim()).toLowerCase() === normalizeArabic(col).toLowerCase());
      if (!found) {
        sheet.getRange(1, headers.length + 1).setValue(col);
        headers.push(col);
        updatedHeaders = true;
      }
    });

    if (updatedHeaders) {
      SpreadsheetApp.flush();
      CacheService.getScriptCache().remove("headers_v5_Service_Expense");
    }

    // 3. تحديد أماكن الأعمدة
    let sIdx = -1, eIdx = -1;
    headers.forEach((h, i) => {
      const normH = normalizeArabic(String(h).trim()).toLowerCase();
      if (normH === normalizeArabic("Service_List").toLowerCase()) sIdx = i;
      if (normH === normalizeArabic("Expense_List").toLowerCase()) eIdx = i;
    });

    // 4. حفظ البيانات في الصف الثاني (كإعدادات عالمية)
    // نستخدم صفاً واحداً فقط لكافة الإعدادات
    const rowValues = new Array(headers.length).fill("");
    if (sIdx !== -1) rowValues[sIdx] = data.serviceList || "";
    if (eIdx !== -1) rowValues[eIdx] = data.expenseList || "";

    if (sheet.getLastRow() < 2) {
      sheet.appendRow(rowValues);
    } else {
      sheet.getRange(2, 1, 1, headers.length).setValues([rowValues]);
    }

    SpreadsheetApp.flush();
    return createJSONResponse({ status: "success", message: "تم تحديث الإعدادات في الشيت المخصص بنجاح" });
  } catch (e) {
    return createJSONResponse({ status: "error", message: e.toString() });
  } finally {
    lock.releaseLock();
  }
}
