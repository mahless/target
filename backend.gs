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
    return handleGetData(e.parameter.sheetName, e.parameter.role, e.parameter.username);
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

  if (action === 'getUserLogs') {
    return handleGetUserLogs(e.parameter.username);
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
    return handleBranchTransfer(requestData);
  }

  return createJSONResponse({ status: "error", message: "Invalid POST Action" });
}

/**
 * 7. تسليم المعاملة وتحصيل المتبقي (Delivery & Collection)
 */
function handleDeliverOrder(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getSS();
    const sheetEntries = ss.getSheetByName("Entries");
    if (!sheetEntries) return createJSONResponse({ status: "error", message: "Entries sheet not found" });

    const map = getHeaderMapping(sheetEntries, "Entries");
    const idColIdx = map['id'] ?? map['معرف'];
    const statusColIdx = map['status'] ?? map['الحاله'];
    // البحث عن عمود تاريخ التسليم بشكل مرن
    const deliveredDateColIdx = map['deliveredDate'] ?? map['تاريخ التسليم'];

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
    if (data.remainingCollected > 0) {
      const headerKeys = Object.keys(map).sort((a, b) => map[a] - map[b]);
      const newRow = headerKeys.map(h => {
        const key = h.toLowerCase();
        if (key === 'id' || key === 'معرف') return Date.now().toString() + "-collect";
        if (key === 'clientname' || key === 'العميل') return data.clientName;
        if (key === 'servicetype' || key === 'نوع الخدمة') return "سداد مديونية";
        if (key === 'amountpaid' || key === 'المدفوع') return data.remainingCollected;
        if (key === 'servicecost' || key === 'التكلفه') return data.remainingCollected; // في السداد التكلفة = المدفوع
        if (key === 'remainingamount' || key === 'المتبقي') return 0;
        if (key === 'entrydate' || key === 'التاريخ') return cairoTime;
        if (key === 'timestamp') return Date.now();
        if (key === 'recordedby' || key === 'الموظف') return data.collectorName;
        if (key === 'branchid' || key === 'الفرع') return data.branchId;
        if (key === 'status' || key === 'الحاله') return "active";
        if (key === 'parententryid') return data.orderId;
        return "";
      });
      sheetEntries.appendRow(newRow);
      // تطبيق التنسيق النصي
      applyTextFormatting(sheetEntries, map, sheetEntries.getLastRow());
      
      // 3. تحديث رصيد الفرع المحصل
      updateBranchBalance(data.branchId, Number(data.remainingCollected));
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
               checkInDate = rawTimestamp;
             } else {
               checkInDate = parseDateFromCairoStr(rawTimestamp);
             }

             const checkOutDate = parseDateFromCairoStr(cairoTime);

             if (checkInDate && checkOutDate && !isNaN(checkInDate.getTime()) && !isNaN(checkOutDate.getTime())) {
               const diffMs = checkOutDate.getTime() - checkInDate.getTime();
               // حساب الساعات بدقة
               if (diffMs > 0) {
                 totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
               } else {
                 totalHours = "0.00";
               }
             } else {
               // في حالة فشل التحليل، نحاول استخدام الوقت الحالي مباشرة
               totalHours = "0.00";
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
    
    // تحديد أعمدة الفلترة بناءً على اسم الشيت
    let userFilterColIdx = -1;
    if (role !== 'مدير' && username) {
       const map = getHeaderMapping(sheet, sheetName);
       // البحث عن عمود الموظف بكل الصيغ المحتملة
       userFilterColIdx = map['recordedBy'] ?? map['الموظف'] ?? map['username'] ?? -1;
    }

    const result = rows
      .filter(row => {
        // فلترة الصفوف الفارغة
        if (!row.some(cell => String(cell).trim() !== "")) return false;

        // الحماية: إذا لم يكن مديراً، ويوجد عمود للموظف، نقوم بالفلترة
        if (role !== 'مدير' && userFilterColIdx !== -1) {
           const rowUser = String(row[userFilterColIdx]).trim();
           // تفعيل الفلترة الصارمة
           if (rowUser !== String(username).trim()) return false;
        }
        return true;
      })
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
          // ربط إضافي للملاحظات لضمان التوافق مع الفرونت إند
          if (normalizedKey === 'ملاحظات') obj['notes'] = val;
          if (normalizedKey === 'notes') obj['ملاحظات'] = val;
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
      
      const dateVal = row[idxDate];
      let rowYear, rowMonth, rowDay, rowDateStr;

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
             if (parts[0].length === 4) {
               rowYear = parseInt(parts[0]);
               rowMonth = parseInt(parts[1]);
               rowDay = parseInt(parts[2]);
             } else {
               rowYear = parseInt(parts[2]);
               rowMonth = parseInt(parts[1]);
               rowDay = parseInt(parts[0]);
             }
         }
      }

      if (!rowYear || !rowMonth) continue;
      
      if (!report[username]) {
        report[username] = {
          name: username,
          week1: 0,
          week2: 0,
          week3: 0,
          week4: 0,
          totalMonth: 0,
          todayStatus: "غائب"
        };
      }

      // تحديد حالة اليوم (وقت أول حضور اليوم)
      if (rowDateStr === cairoDateStr) {
        const typeIdx = map['Type'];
        const timeIdx = map['Timestamp'];
        if (typeIdx !== undefined && timeIdx !== undefined) {
          if (String(row[typeIdx]) === 'check-in' && report[username].todayStatus === "غائب") {
            let timePart = "";
            const val = row[timeIdx];
            if (val instanceof Date) {
              timePart = Utilities.formatDate(val, "Africa/Cairo", "hh:mm a");
            } else {
              const fullTime = String(val);
              timePart = fullTime.includes(' ') ? fullTime.split(' ')[1] : fullTime;
            }
            report[username].todayStatus = timePart;
          }
        }
      }

      // التأكد من أن السجل في الشهر الحالي للتجميع
      if (rowMonth !== currentMonth || rowYear !== currentYear) continue;

      let hours = 0;
      const rawHours = row[idxHours];
      if (typeof rawHours === 'number') {
        hours = rawHours;
      } else if (rawHours && String(rawHours).trim() !== "") {
        hours = parseFloat(String(rawHours));
      }
      if (isNaN(hours) || hours <= 0) continue;

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
      totalMonth: Number(u.totalMonth.toFixed(2)),
      todayStatus: u.todayStatus
    }));

    return createJSONResponse(finalResult);
  } catch (err) {
    return createJSONResponse({ status: "error", message: err.toString() });
  }
}

/**
 * جلب كافة حركات موظف معين للشهر الحالي
 */
function handleGetUserLogs(username) {
  try {
    const ss = getSS();
    const sheet = ss.getSheetByName("Attendance");
    if (!sheet) return createJSONResponse([]);
    
    const data = sheet.getDataRange().getValues();
    const map = getHeaderMapping(sheet, "Attendance");
    
    const idxUser = map['username'];
    const idxType = map['Type'];
    const idxTime = map['Timestamp'];
    const idxHours = map['Total_Hours'];
    const idxDate = map['date'];

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const logs = [];
    const targetUser = String(username).trim().toLowerCase();

    // نمر على البيانات لجمع كل زوج (دخول/خروج) أو تسجيلات فردية
    // لسهولة العرض في الجدول التفصيلي، سنعيد الحركات مرتبة
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowUser = String(row[idxUser]).trim().toLowerCase();
      if (rowUser !== targetUser) continue;

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

      if (rowMonth !== currentMonth || rowYear !== currentYear) continue;

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
      
      formattedDateTime = `${rowDateStr} ${timePart}`;

      // قراءة قيمة الساعات من العمود مع معالجة أنواع البيانات المختلفة
      let hoursValue = 0;
      if (idxHours !== undefined && row[idxHours] !== undefined && row[idxHours] !== null && row[idxHours] !== "") {
        const rawHours = row[idxHours];
        if (typeof rawHours === 'number') {
          hoursValue = rawHours;
        } else if (typeof rawHours === 'string') {
          const parsed = parseFloat(rawHours);
          if (!isNaN(parsed)) {
            hoursValue = parsed;
          }
        }
      }

      logs.push({
        dateTime: formattedDateTime,
        type: row[idxType],
        hours: hoursValue
      });
    }

    return createJSONResponse(logs.reverse()); // الأحدث أولاً
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
    
    const textFields = new Set([
      'phoneNumber', 'رقم الهاتف', 'phone',
      'barcode', 'الباركود', 'Barcode',
      'nationalId', 'الرقم القومي'
    ]);

    const newRow = headerKeys.map(h => {
      let val = data[h] || "";
      if (textFields.has(h) && val && String(val).startsWith('0')) {
        return "'" + val;
      }
      return val;
    });

    // منطق الرصيد الحي
    if (sheetName === 'Expenses' || sheetName === 'المصروفات') {
      const amount = Number(data['amount'] || data['المبلغ'] || 0);
      const branch = data['branchId'] || data['الفرع'];
      const currentBalance = getBranchBalance(branch);
      
      if (currentBalance < amount) {
        return createJSONResponse({ status: "error", message: "رصيد الفرع لا يكفي لإتمام هذه العملية" });
      }
      updateBranchBalance(branch, -amount);
    } else if (sheetName === 'Entries' || sheetName === 'المعاملات') {
      const amountPaid = Number(data['amountPaid'] || data['المدفوع'] || 0);
      const branch = data['branchId'] || data['الفرع'];
      if (amountPaid > 0) {
        updateBranchBalance(branch, amountPaid);
      }
    }

    sheet.appendRow(newRow);
    
    // تطبيق التنسيق النصي للحفاظ على الأصفار
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
           let val = data[key];
           const textFields = new Set([
             'phoneNumber', 'رقم الهاتف', 'phone',
             'barcode', 'الباركود', 'Barcode',
             'nationalId', 'الرقم القومي'
           ]);
           
           if (textFields.has(key) && val && String(val).startsWith('0')) {
             rowToUpdate[colIdx] = "'" + val;
           } else {
             rowToUpdate[colIdx] = val;
           }
       }
    });
    
    // منطق تحديث الرصيد عند تعديل المبلغ المدفوع (للمعاملات)
    if (sheetName === 'Entries' || sheetName === 'المعاملات') {
      const oldPaidIdx = map['amountPaid'] || map['المدفوع'];
      if (oldPaidIdx !== undefined) {
        const oldPaid = Number(values[rowIndex][oldPaidIdx]) || 0;
        const newPaid = Number(data['amountPaid'] || data['المدفوع'] || oldPaid);
        const branch = data['branchId'] || data['الفرع'] || values[rowIndex][map['branchId'] || map['الفرع']];
        
        if (newPaid !== oldPaid) {
          updateBranchBalance(branch, newPaid - oldPaid);
        }
      }
    }

    sheet.getRange(rowIndex + 1, 1, 1, rowToUpdate.length).setValues([rowToUpdate]);
    
    // إعادة تطبيق التنسيق النصي بعد التحديث
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
        
        // تطبيق التنسيق النصي
        applyTextFormatting(sheet, map, i + 1);

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
        
        // تطبيق التنسيق النصي
        applyTextFormatting(sheet, map, i + 1);

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
  const cacheKey = "headers_v4_" + sheetName; // تم ترقية النسخة إلى v4 لكافة الشيتات
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
 */
function updateBranchBalance(branchId, amount) {
  checkAndResetDailyBalances();
  if (!amount) return true;
  const ss = getSS();
  const configSheet = ss.getSheetByName("Branches_Config");
  if (!configSheet) return false;

  const map = getHeaderMapping(configSheet, "Branches_Config");
  const nameCol = map['Branch_Name'];
  const balanceCol = map['Current_Balance'];

  if (nameCol === undefined || balanceCol === undefined) return false;

  const data = configSheet.getDataRange().getValues();
  const targetBranch = normalizeArabic(branchId);

  for (let i = 1; i < data.length; i++) {
    if (normalizeArabic(data[i][nameCol]) === targetBranch) {
      const currentVal = Number(data[i][balanceCol]) || 0;
      configSheet.getRange(i + 1, balanceCol + 1).setValue(currentVal + amount);
      return true;
    }
  }
  return false;
}

/**
 * جلب رصيد فرع معين
 */
function getBranchBalance(branchId) {
  checkAndResetDailyBalances();
  const ss = getSS();
  const configSheet = ss.getSheetByName("Branches_Config");
  if (!configSheet) return 0;

  const map = getHeaderMapping(configSheet, "Branches_Config");
  const nameCol = map['Branch_Name'];
  const balanceCol = map['Current_Balance'];
  if (nameCol === undefined || balanceCol === undefined) return 0;

  const data = configSheet.getDataRange().getValues();
  const target = normalizeArabic(branchId);

  for (let i = 1; i < data.length; i++) {
    if (normalizeArabic(data[i][nameCol]) === target) return Number(data[i][balanceCol]) || 0;
  }
  return 0;
}

/**
 * دالة التحويل المالي بين الفروع
 */
function handleBranchTransfer(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getSS();
    const sheetExpenses = ss.getSheetByName("Expenses");
    
    const amount = Number(data.amount);
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
      const map = getHeaderMapping(sheetExpenses, "Expenses");
      const headerKeys = Object.keys(map).sort((a, b) => map[a] - map[b]);
      const cairoDate = Utilities.formatDate(new Date(), "Africa/Cairo", "yyyy-MM-dd");
      
      const rowFrom = headerKeys.map(h => {
        const k = h.toLowerCase();
        if (k === 'id' || k === 'معرف') return Date.now() + "-tf-out";
        if (k === 'category' || k === 'الفئة') return "تحويل صادر";
        if (k === 'amount' || k === 'المبلغ') return amount;
        if (k === 'branchid' || k === 'الفرع') return data.fromBranch;
        if (k === 'date' || k === 'التاريخ') return cairoDate;
        if (k === 'recordedby') return data.recordedBy;
        if (k === 'notes' || k === 'ملاحظات') return `تحويل إلى فرع: ${data.toBranch}`;
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
        CacheService.getScriptCache().remove("headers_v3_Branches_Config");
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
