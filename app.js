// بيانات حساب الخدمة السحابي والربط بالجداول
const SERVICE_ACCOUNT = {
  "project_id": "farm-expenses-app",
  "client_email": "farm-manager@farm-expenses-app.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDTC4zoqCa6XkqK\nGytYPrvjMnmCjkeCuUOo88NkwVMT0IQY+1CP/R/umXRfciIk4sX1aLxcHkYX/fcK\nuXZ+YGlTFNXoQSKePriBJyG/VbOsA0LIumsiNmmpeVTA2raOaP3yu+AJcbwiefCT\nFbyd429z9OFXIpYOIocdTLg8vZo+nquRXJSVM0Ar5XnxL7Vy+Ur02UckENQwGvsI\nlnjPk+ujwllqJ5++1yTg1+HxeqSqhWFTC7DkgSrF30WE4knqqKtdEKqbyD6frTW4\nX94cQvdE8/DsHca+4yptuNGiVjlXC4oVdr8ShaU41maEdflDJR+qAmjJwghoFY0P\nzTijoqkbAgMBAAECggEAAMbI+JTj/hQn3kfz6gGySpmFn2vqq4Qo4AYJzxBXCGct\nlnSCVtibk+KF3W5NPmM8WOLiciiMeGriCwTQM3pOuwNf7t0sEsGVwXymnhR5D0Ew\nfv++esCdLe4mZFKVKOsXtjhSI9Ym6mCAexTt/xJ+7YDI7bt8R3CVAdrkhanSqc2Y\nlPy6cZ2JglUUHcG8A2SZeOqH9tD9D5CK+baqC+kRhn9+RlIdEA2a6nq8v9AqjIDE\nMOE6rvRjf3cmvgz+sA0gb9iecbeZQSx+RrNgL8L5NXzE5lfE9mOJg1RODSS99/Yh\n85d+4oBp9IVh64o1/ix5o10bUdb/ipG+BBeVM5MKQQKBgQDwNuHBo6Ajbb0Mijph\n44Xd6zADtmtZd2w+/ccb+E6mztOjQ1W+wHEBgN1ekW65z7xplpTng1Es20Qh/HsH\nDvbNyH3Ark5n5Zj5w2a6+rsYDekq67shv5OCR+SwGB07LUvwe6Lz7U5uZ+z2AWpl\ng2mFueOg1z3X7Pxj1R3rMUuN+QKBgQDg6fR/SeSRTaOf1ePSpNWzyB14zaqoXcz4\nJPPqAyhC9+hITBEH9TybJwRi3GPzhNELdkn6yCwGpQyTZLTCbbg88ChmSSI7WGTI\neIw6AEoGydCNVZGxxQKuPSNZ7sdbPicskAm7kF3UjTAplVW/kdhTW8dmbn48cB7e\nm7OeOeqEswKBgCjiDlY4lP6ypKRHulwCrzvv1UIsf+TAMIogAw09m5VESjzVLvjC\nI/mPhx2bPu8c7gJCgKFOdjheMSBfqkivQU4Qu2ZZxDpmlzybBxb3qXQUmgSWDklW\nI7LerYtS71atBOmvATLmxpx/z5Km9wbD8OezlYxAVeQ0D1imYusufp9xAoGAd8ki\nhoh8S0bmVkI8S/uuNUnnKGeg9HrAp4hGv+Nelgwikh6xE2PxG1D0bRKjyRZ7n3co\nf4AMsp1EzVtdSg/Vh98AJTneGW1Cf+J0DJAK3QKvKBbiuaMLgnDdWxBo7Jd1la5B\nALwqvQFVHVCDkrvCUuMWl99RLC8qwbR7PVHrLTECgYEA3p4xaQXh5jJ3q7v4bB0O\nw2tzKrJvQPXVwPVi3YtarWrupeiRepryOwf4tjoT4GGgEyzBWS4UME8U5AZLjjvK\nXLbz6L10ksIjirDpLz2uqOBsHJvztALT0YEdUSzSwKlkrC4o1gdysoeoJhreAIhx\n4aMy6HUEgDlYQX0sSUnoVK8=\n-----END PRIVATE KEY-----\n"
};

const SPREADSHEET_ID = '10UIif1ruBR16x38cP7YwLtGuI-e-GBsWxt0_86QGWIg';
let accessToken = null;
let tokenExpiry = 0;
let currentUser = null;
let globalCachedData = JSON.parse(localStorage.getItem('globalCachedData') || '{}');

const $ = id => document.getElementById(id);
function setText(id, text){ const el=$(id); if(el) el.textContent=text; }

if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js');

async function getGoogleAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (accessToken && now < tokenExpiry) return accessToken;
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: SERVICE_ACCOUNT.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };
  const jwt = KJUR.jws.JWS.sign("RS256", JSON.stringify(header), JSON.stringify(claim), SERVICE_ACCOUNT.private_key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const data = await res.json();
  accessToken = data.access_token;
  tokenExpiry = now + 3600;
  return accessToken;
}

async function fetchSheetRows(sheetName) {
  const token = await getGoogleAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!A1:Z1500`;
  const res = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
  const data = await res.json();
  return data.values || [];
}

async function appendSheetRow(sheetName, rowArray) {
  const token = await getGoogleAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!A1:append?valueInputOption=USER_ENTERED`;
  await fetch(url, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [rowArray] })
  });
}

async function updateSheetCell(sheetName, range, value) {
  const token = await getGoogleAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!${range}?valueInputOption=USER_ENTERED`;
  await fetch(url, {
    method: "PUT",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [[value]] })
  });
}

async function clearAndRewriteRows(sheetName, filterColumnIndex, filterValue, headerRow, newRowsArrays) {
  const token = await getGoogleAccessToken();
  const allRows = await fetchSheetRows(sheetName);
  if(!allRows.length) return;
  const keptRows = [allRows[0]]; 
  for(let i=1; i<allRows.length; i++) {
    if(String(allRows[i][filterColumnIndex]).trim() !== String(filterValue).trim()) {
      keptRows.push(allRows[i]);
    }
  }
  newRowsArrays.forEach(r => keptRows.push(r));
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!A1:Z1500:clear`;
  await fetch(clearUrl, { method: "POST", headers: { "Authorization": `Bearer ${token}` } });
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!A1?valueInputOption=USER_ENTERED`;
  await fetch(updateUrl, {
    method: "PUT",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: keptRows })
  });
}

// معالج الأزرار التفاؤلي اللحظي - يتحول للرمادي فوراً وينفذ الأكشن محلياً بدون أي تأخير
async function handleBtnAction(btnId, loadingStr, actionFn, instantSuccessFn) {
  const btn = $(btnId); 
  let origText = "";
  if(btn) { 
    origText = btn.textContent; 
    btn.disabled = true; 
    btn.classList.add('btn-disabled'); 
    btn.style.backgroundColor = '#4b5563'; 
  }
  if (instantSuccessFn) instantSuccessFn();
  try { 
    await actionFn(); 
  } catch(e) { 
    console.error(e); 
    alert('خطأ في الاتصال: ' + e.message); 
  } finally { 
    if(btn) { 
      btn.disabled = false; 
      btn.classList.remove('btn-disabled'); 
      btn.style.backgroundColor = ''; 
      btn.textContent = origText; 
    } 
  }
}

function convertRowsToObjects(rows) {
  if(!rows || rows.length === 0) return [];
  const header = rows[0];
  return rows.slice(1).map(r => {
    const obj = {};
    header.forEach((hName, idx) => { obj[hName.trim()] = r[idx] !== undefined ? r[idx] : ""; });
    return obj;
  });
}

function fmtOnlyDate(v) {
  if(!v) return '-'; 
  const d = new Date(v);
  return isNaN(d) ? v.split('T')[0] : d.toLocaleDateString('ar-SA');
}

async function refreshAllSheetsCacheInBackground() {
  try {
    const sheets = ['Users', 'Groups', 'GroupMembers', 'ExpenseCategories', 'Expenses', 'Payments'];
    const freshDb = {};
    for (const sh of sheets) { freshDb[sh] = await fetchSheetRows(sh); }
    globalCachedData = freshDb;
    localStorage.setItem('globalCachedData', JSON.stringify(freshDb));
    renderActiveScreensFromCache();
  } catch(e) { console.error(e); }
}

function renderActiveScreensFromCache() {
  fillSelectorsFromCache();
  loadCurrentContextData();
}

function fillSelectorsFromCache() {
  const members = convertRowsToObjects(globalCachedData['GroupMembers'] || []);
  const groups = convertRowsToObjects(globalCachedData['Groups'] || []);
  const gMap = {}; groups.forEach(g => gMap[g.GroupID] = g.GroupName);
  
  const myMem = currentUser?.Role === 'Admin' ? members : members.filter(m => String(m.UserID).trim() === String(currentUser?.UserID).trim());
  const uniqueGroupIds = [...new Set(myMem.map(m => m.GroupID))];

  ['admin-group-select', 'admin-report-group', 'recorder-group', 'payer-group'].forEach(id => {
    const s = $(id); if(!s) return;
    const currentVal = s.value;
    s.innerHTML = id === 'admin-group-select' ? '<option value="">-- مجموعة جديدة --</option>' : '';
    uniqueGroupIds.forEach(gid => {
      const o = document.createElement('option'); o.value = gid; o.textContent = gMap[gid] || gid; s.appendChild(o);
    });
    if(currentVal) s.value = currentVal;
  });
}

function loadCurrentContextData() {
  let activeGid = "";
  if(currentUser?.Role === 'Recorder' || currentUser?.Role === 'Admin') activeGid = $('recorder-group')?.value;
  if(!activeGid && $('payer-group')) activeGid = $('payer-group').value;
  if(!activeGid) return;

  // واجهة المسجل: قائمة التصنيفات
  const cats = convertRowsToObjects(globalCachedData['ExpenseCategories'] || []).filter(c => String(c.GroupID) === String(activeGid));
  const catSel = $('recorder-category'); 
  if(catSel) {
    catSel.innerHTML = '';
    cats.forEach(c => { const o = document.createElement('option'); o.value = c.CategoryID; o.textContent = c.CategoryName; catSel.appendChild(o); });
  }
  
  // واجهة المسجل: آخر 15 مصروف مسجل
  const exps = convertRowsToObjects(globalCachedData['Expenses'] || []).filter(e => String(e.GroupID) === String(activeGid));
  const ulRec = $('recorder-last-expenses'); 
  if(ulRec) {
    ulRec.innerHTML = '';
    exps.slice(-15).reverse().forEach(e => {
      const li = document.createElement('li'); li.className = 'summary-item';
      let statusBadge = e.Status === 'Approved' ? `<span class="badge badge-approved">معتمد</span>` : (e.Status === 'Rejected' ? `<span class="badge badge-rejected">مرفوض</span>` : `<span class="badge badge-pending">بانتظار الموافقة</span>`);
      let payBadge = String(e.PaymentStatus).trim() === 'Paid' ? ` <span style="color:#22c55e;">[مدفوع]</span>` : ` <span style="color:#fb7185;">[غير مسدد]</span>`;
      li.innerHTML = `<strong>البيان: ${e.Description || 'مصروف'}</strong> | المبلغ: <strong>${e.Amount}</strong> | ${statusBadge}${payBadge}`;
      ulRec.appendChild(li);
    });
  }

  // واجهة المسجل: اعتماد الحوالات (مع زرين تنفيذ فوري)
  loadRecorderPendingPayments(activeGid);

  // واجهة المسدد: المصاريف المعلقة
  const ulPayPending = $('payer-pending-list'); 
  if(ulPayPending) {
    ulPayPending.innerHTML = '';
    const rawExpenses = globalCachedData['Expenses'] || [];
    const pendingExps = convertRowsToObjects(rawExpenses).filter(e => String(e.GroupID) === String(activeGid) && (e.Status === 'Pending' || !e.Status));
    if(!pendingExps.length) { 
      ulPayPending.innerHTML = '<li class="muted">لا توجد مصاريف معلقة.</li>'; 
    } else {
      pendingExps.forEach(e => {
        const li = document.createElement('li'); li.className = 'summary-item';
        li.innerHTML = `<strong>بقيمة: ${e.Amount}</strong> | البيان: ${e.Description}`;
        
        let sheetRowIndex = -1;
        for(let i = 1; i < rawExpenses.length; i++) { if(String(rawExpenses[i][0]).trim() === String(e.ExpenseID).trim()) { sheetRowIndex = i + 1; break; } }
        
        const divActions = document.createElement('div'); divActions.style.display="flex"; divActions.style.gap="10px"; divActions.style.marginTop="8px";
        const btnOk = document.createElement('button'); btnOk.id = `e-ok-${e.ExpenseID}`; btnOk.textContent = '✓ اعتماد'; btnOk.className = 'small';
        btnOk.onclick = () => handleBtnAction(`e-ok-${e.ExpenseID}`, '', async () => {
          if(sheetRowIndex > -1) { await updateSheetCell('Expenses', `H${sheetRowIndex}`, 'Approved'); await refreshAllSheetsCacheInBackground(); }
        }, () => {
          li.remove();
        });
        divActions.append(btnOk); li.appendChild(divActions); ulPayPending.appendChild(li);
      });
    }
  }

  // واجهة المسدد: جدول آخر 10 مصاريف (معتمدة وغير معتمدة معاً)
  const tableBody = $('payer-last-expenses-table-body');
  if(tableBody) {
    tableBody.innerHTML = '';
    const last10Exps = exps.slice(-10).reverse();
    if(!last10Exps.length) {
      tableBody.innerHTML = `<tr><td colspan="5" class="muted" style="text-align:center; padding:12px;">لا توجد مصاريف مسجلة.</td></tr>`;
    } else {
      last10Exps.forEach(e => {
        let statusText = e.Status === 'Approved' ? 'معتمد' : (e.Status === 'Rejected' ? 'مرفوض' : 'بانتظار الموافقة');
        let payText = String(e.PaymentStatus).trim() === 'Paid' ? 'مدفوع' : 'غير مسدد';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="padding:10px; border-bottom:1px solid #334155;">${e.Description}</td>
          <td style="padding:10px; border-bottom:1px solid #334155;">${e.Amount}</td>
          <td style="padding:10px; border-bottom:1px solid #334155;">${statusText}</td>
          <td style="padding:10px; border-bottom:1px solid #334155;">${payText}</td>
          <td style="padding:10px; border-bottom:1px solid #334155;">${fmtOnlyDate(e.CreatedAt)}</td>
        `;
        tableBody.appendChild(tr);
      });
    }
  }

  // واجهة المسدد: قائمة المستفيدين بالسداد
  loadPayerBeneficiariesList(activeGid);
}

function loadRecorderPendingPayments(gid) {
  const ul = $('recorder-payments-list'); if(!ul) return; ul.innerHTML = '';
  const rawPayments = globalCachedData['Payments'] || [];
  const pays = convertRowsToObjects(rawPayments).filter(p => String(p.GroupID) === String(gid) && (p.Status === 'Pending' || !p.Status));
  const uMap = {}; convertRowsToObjects(globalCachedData['Users'] || []).forEach(u => uMap[u.UserID] = u.Name);

  if(!pays.length) { ul.innerHTML = '<li class="muted">لا توجد حوالات بانتظار الاعتماد.</li>'; return; }
  pays.forEach(p => {
    const li = document.createElement('li'); li.className = 'summary-item';
    li.innerHTML = `<strong>حوالة من: ${uMap[p.UserID_Payer] || p.UserID_Payer} بقيمة: ${p.Amount}</strong><br>البيان: ${p.Notes}`;
    
    let sheetRowIndex = -1;
    for(let i = 1; i < rawPayments.length; i++) { if(String(rawPayments[i][0]).trim() === String(p.PaymentID).trim()) { sheetRowIndex = i + 1; break; } }
    
    const divActions = document.createElement('div'); divActions.style.display="flex"; divActions.style.gap="10px"; divActions.style.marginTop="8px";
    
    const btnApprove = document.createElement('button'); btnApprove.id = `p-app-${p.PaymentID}`; btnApprove.textContent = '✓ اعتماد'; btnApprove.className = 'small';
    btnApprove.onclick = () => handleBtnAction(`p-app-${p.PaymentID}`, '', async () => {
      if(sheetRowIndex > -1) { await updateSheetCell('Payments', `H${sheetRowIndex}`, 'Approved'); await refreshAllSheetsCacheInBackground(); }
    }, () => { li.remove(); });
    
    const btnReject = document.createElement('button'); btnReject.id = `p-rej-${p.PaymentID}`; btnReject.textContent = '❌ رفض'; btnReject.className = 'small'; btnReject.style.backgroundColor = '#fb7185';
    btnReject.onclick = () => handleBtnAction(`p-rej-${p.PaymentID}`, '', async () => {
      if(sheetRowIndex > -1) { await updateSheetCell('Payments', `H${sheetRowIndex}`, 'Rejected'); await refreshAllSheetsCacheInBackground(); }
    }, () => { li.remove(); });

    divActions.append(btnApprove, btnReject); li.appendChild(divActions); ul.appendChild(li);
  });
}

function loadPayerBeneficiariesList(gid) {
  const sel = $('payer-beneficiaries'); if(!sel) return;
  sel.innerHTML = '';
  const members = convertRowsToObjects(globalCachedData['GroupMembers'] || []).filter(m => String(m.GroupID) === String(gid));
  const users = convertRowsToObjects(globalCachedData['Users'] || []);
  const uMap = {}; users.forEach(u => uMap[u.UserID] = u.Name);
  
  members.forEach(m => {
    const o = document.createElement('option'); o.value = m.UserID; o.textContent = uMap[m.UserID] || m.UserID; sel.appendChild(o);
  });
  if(!sel.value && currentUser) sel.value = currentUser.UserID;
}

function addMemberRow(userId = '', role = 'Payer', ratio = '0') {
  const container = $('group-members-editor'); if(!container) return;
  const div = document.createElement('div'); div.className = 'member-row';
  
  const userSelect = document.createElement('select');
  convertRowsToObjects(globalCachedData['Users'] || []).forEach(u => {
    const o = document.createElement('option'); o.value = u.UserID; o.textContent = u.Name; userSelect.appendChild(o);
  });
  userSelect.value = userId;
  
  const roleSelect = document.createElement('select');
  roleSelect.innerHTML = `<option value="Payer">Payer</option><option value="Recorder">Recorder</option>`;
  roleSelect.value = role;
  
  const ratioInput = document.createElement('input'); ratioInput.type = 'number'; ratioInput.placeholder = '%'; ratioInput.value = ratio;
  const delBtn = document.createElement('button'); delBtn.type = 'button'; delBtn.textContent = 'X'; delBtn.style.backgroundColor = '#fb7185';
  delBtn.onclick = () => div.remove();
  
  div.append(userSelect, roleSelect, ratioInput, delBtn); container.appendChild(div);
}

// التقرير الموحد الاحترافي لجميع الواجهات (تصنيفات ومصاريف تفصيلية مع الحسابات الحقيقية)
function runUnifiedReport(groupSelectId, typeSelectId, fromDateId, toDateId, outputDivId, buttonId) {
  const gid = $(groupSelectId).value; 
  const rType = $(typeSelectId).value;
  const from = $(fromDateId).value; 
  const to = $(toDateId).value; 
  const out = $(outputDivId);
  
  if(!gid) { alert('اختر المجموعة أولاً'); return; }
  
  handleBtnAction(buttonId, '', async () => {
    const dFrom = from ? new Date(from) : null; 
    const dTo = to ? new Date(to) : null; 
    if(dTo) dTo.setHours(23,59,59,999);
    
    const cats = convertRowsToObjects(globalCachedData['ExpenseCategories'] || []).filter(c => String(c.GroupID) === String(gid));
    const catMap = {}; cats.forEach(c => catMap[c.CategoryID] = c.CategoryName);
    
    const expenses = convertRowsToObjects(globalCachedData['Expenses'] || []).filter(e => String(e.GroupID) === String(gid) && e.Status === 'Approved');
    
    let totalSum = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;
    
    let filteredExps = expenses.filter(e => {
      const cDate = new Date(e.CreatedAt);
      return (!dFrom || cDate >= dFrom) && (!dTo || cDate <= dTo);
    });

    let html = `<div style="background:#111827; padding:15px; border-radius:12px; border:1px solid #334155; margin-top:10px;">`;
    html += `<table class="report-table" style="width:100%; border-collapse:collapse;">`;
    
    if (rType === 'cats') {
      html += `<thead><tr><th>التصنيف</th><th>المبلغ</th></tr></thead><tbody>`;
      const catSummary = {};
      filteredExps.forEach(e => {
        const amt = Number(e.Amount) || 0;
        const cName = catMap[e.CategoryID] || "عام / أخرى";
        catSummary[cName] = (catSummary[cName] || 0) + amt;
        
        totalSum += amt;
        if (String(e.PaymentStatus).trim().toLowerCase() === 'paid') totalPaid += amt;
        else totalUnpaid += amt;
      });
      Object.keys(catSummary).forEach(k => {
        html += `<tr><td style="padding:8px; border-bottom:1px solid #334155;">${k}</td><td style="padding:8px; border-bottom:1px solid #334155;">${catSummary[k].toFixed(2)} ج.م</td></tr>`;
      });
    } else {
      html += `<thead><tr><th>البيان</th><th>المبلغ</th><th>حالة السداد</th><th>التاريخ</th></tr></thead><tbody>`;
      filteredExps.forEach(e => {
        const amt = Number(e.Amount) || 0;
        totalSum += amt;
        let isPaid = String(e.PaymentStatus).trim().toLowerCase() === 'paid';
        if (isPaid) totalPaid += amt; else totalUnpaid += amt;
        
        html += `<tr>
          <td style="padding:8px; border-bottom:1px solid #334155;">${e.Description}</td>
          <td style="padding:8px; border-bottom:1px solid #334155;">${amt.toFixed(2)}</td>
          <td style="padding:8px; border-bottom:1px solid #334155; color:${isPaid?'#22c55e':'#fb7185'}">${isPaid?'مدفوع':'غير مسدد'}</td>
          <td style="padding:8px; border-bottom:1px solid #334155;">${fmtOnlyDate(e.CreatedAt)}</td>
        </tr>`;
      });
    }
    
    html += `<tr style="font-weight:bold; background:#1e293b;"><td style="padding:8px;">إجمالي المصروفات</td><td colspan="3" style="padding:8px;">${totalSum.toFixed(2)} ج.م</td></tr>`;
    html += `<tr style="font-weight:bold; color:#22c55e;"><td style="padding:8px;">إجمالي المسدد</td><td colspan="3" style="padding:8px;">${totalPaid.toFixed(2)} ج.م</td></tr>`;
    html += `<tr style="font-weight:bold; color:#fb7185;"><td style="padding:8px;">إجمالي الغير مسدد</td><td colspan="3" style="padding:8px;">${totalUnpaid.toFixed(2)} ج.م</td></tr>`;
    html += `</tbody></table></div>`;
    
    out.innerHTML = html;
  }, () => {});
}

async function startApp() {
  $('login-screen').classList.add('hidden');
  $('dashboard-screen').classList.remove('hidden');
  if($('logout-btn')) $('logout-btn').classList.remove('hidden');
  setText('welcome-text', `مرحباً بك، ${currentUser.Name}`);
  
  document.querySelectorAll('.role-section').forEach(s => s.classList.add('hidden'));
  if(currentUser.Role === 'Admin') { 
    $('admin-section').classList.remove('hidden'); 
  } else if(currentUser.Role === 'Recorder') { 
    $('recorder-section').classList.remove('hidden'); 
  } else if(currentUser.Role === 'Payer') { 
    $('payer-section').classList.remove('hidden'); 
  }
  renderActiveScreensFromCache();
}

async function login(e) {
  if(e) e.preventDefault();
  const u = $('login-username').value.trim(); 
  const p = $('login-password').value.trim();
  const users = convertRowsToObjects(globalCachedData['Users'] || []);
  const found = users.find(x => String(x.Username).trim() === u && String(x.Password).trim() === p);
  
  if(found) {
    currentUser = found; 
    localStorage.setItem('currentUser', JSON.stringify(currentUser)); 
    await startApp();
  } else {
    alert('بيانات الدخول غير صحيحة.');
  }
}

// أحداث عناصر الصفحة
window.addEventListener('DOMContentLoaded', () => {
  refreshAllSheetsCacheInBackground();

  $('login-btn').onclick = login;
  if($('logout-btn')) $('logout-btn').onclick = () => { localStorage.removeItem('currentUser'); window.location.reload(); };
  
  $('recorder-group').onchange = loadCurrentContextData;
  $('payer-group').onchange = loadCurrentContextData;
  
  // أزرار تقارير موحدة
  $('admin-report-btn').onclick = () => runUnifiedReport('admin-report-group', 'admin-report-type', 'admin-report-from', 'admin-report-to', 'admin-report-result', 'admin-report-btn');
  $('recorder-report-btn').onclick = () => runUnifiedReport('recorder-group', 'recorder-report-type', 'recorder-report-from', 'recorder-report-to', 'recorder-report-result', 'recorder-report-btn');
  $('payer-report-btn').onclick = () => runUnifiedReport('payer-group', 'payer-report-type', 'payer-report-from', 'payer-report-to', 'payer-report-result', 'payer-report-btn');

  $('add-member-row-btn').onclick = () => addMemberRow();

  $('admin-group-select').onchange = () => {
    const gid = $('admin-group-select').value;
    const container = $('group-members-editor'); container.innerHTML = '';
    if(!gid) { $('admin-group-name').value = ''; $('admin-group-notes').value = ''; $('admin-group-categories').value = ''; return; }
    
    const group = convertRowsToObjects(globalCachedData['Groups'] || []).find(g => String(g.GroupID) === String(gid));
    if(group) { $('admin-group-name').value = group.GroupName; $('admin-group-notes').value = group.Notes || ''; }
    
    const cats = convertRowsToObjects(globalCachedData['ExpenseCategories'] || []).filter(c => String(c.GroupID) === String(gid)).map(c => c.CategoryName);
    $('admin-group-categories').value = cats.join(', ');
    
    const members = convertRowsToObjects(globalCachedData['GroupMembers'] || []).filter(m => String(m.GroupID) === String(gid));
    members.forEach(m => addMemberRow(m.UserID, m.MemberRole, m.ShareRatio));
  };

  // أدمن: حفظ المجموعات
  $('save-group-btn').onclick = async () => {
    let gid = $('admin-group-select').value;
    const gName = $('admin-group-name').value.trim(), gNotes = $('admin-group-notes').value.trim(), gCatsStr = $('admin-group-categories').value.trim();
    if(!gName) { alert('ادخل اسم المجموعة'); return; }
    if(!gid) gid = 'G' + Math.floor(100 + Math.random() * 900);
    
    handleBtnAction('save-group-btn', '', async () => {
      const rawGroups = globalCachedData['Groups'] || [];
      let foundGIdx = -1;
      for(let i=1; i<rawGroups.length; i++) { if(String(rawGroups[i][0]).trim() === String(gid).trim()) { foundGIdx = i; break; } }
      if(foundGIdx > -1) {
        await updateSheetCell('Groups', `B${foundGIdx+1}`, gName); await updateSheetCell('Groups', `C${foundGIdx+1}`, gNotes);
      } else {
        await appendSheetRow('Groups', [gid, gName, gNotes, new Date().toISOString()]);
      }
      const memberRows = [];
      document.querySelectorAll('#group-members-editor .member-row').forEach(row => {
        const uId = row.children[0].value, role = row.children[1].value, ratio = row.children[2].value;
        if(uId) memberRows.push([gid, uId, role, ratio, 'TRUE']);
      });
      await clearAndRewriteRows('GroupMembers', 0, gid, ['GroupID', 'UserID', 'MemberRole', 'ShareRatio', 'Active'], memberRows);
      
      const catRows = [];
      gCatsStr.split(',').forEach(c => {
        const name = c.trim(); if(!name) return;
        const cId = 'C' + Math.floor(1000 + Math.random() * 9000);
        catRows.push([cId, gid, name, 'TRUE']);
      });
      await clearAndRewriteRows('ExpenseCategories', 1, gid, ['CategoryID', 'GroupID', 'CategoryName', 'Active'], catRows);
      await refreshAllSheetsCacheInBackground();
    }, () => {
      setText('admin-group-msg', 'تم الحفظ');
    });
  };

  // أدمن: إضافة حساب مستخدم
  $('save-user-btn').onclick = async () => {
    const name = $('admin-user-name').value.trim(), user = $('admin-user-username').value.trim(), pass = $('admin-user-password').value.trim(), role = $('admin-user-role').value;
    if(!name || !user || !pass) { alert('أكمل الحقول'); return; }
    const uId = 'U' + Math.floor(100 + Math.random() * 900);
    const row = [uId, name, user, pass, role, 'TRUE', new Date().toISOString()];
    
    if(!globalCachedData['Users']) globalCachedData['Users'] = [];
    globalCachedData['Users'].push(row);

    handleBtnAction('save-user-btn', '', async () => {
      await appendSheetRow('Users', row);
      await refreshAllSheetsCacheInBackground();
    }, () => {
      $('admin-user-name').value = ''; $('admin-user-username').value = ''; $('admin-user-password').value = '';
      setText('admin-user-msg', 'تم حفظ الحساب وتنشيطه');
    });
  };

  // مسجل: حفظ مصروف فوري تفاؤلي
  $('recorder-save-expense').onclick = async () => {
    const groupId = $('recorder-group').value, categoryId = $('recorder-category').value;
    const amount = Number($('recorder-amount').value), description = $('recorder-desc').value.trim();
    if(!groupId || !categoryId || !amount || !description) { alert('الرجاء إدخال كامل البيانات'); return; }
    
    const expId = 'E' + Math.floor(1000 + Math.random() * 9000);
    const row = [expId, groupId, currentUser.UserID, categoryId, amount, description, new Date().toISOString(), 'Pending', '', '', 'Unpaid'];
    
    if(!globalCachedData['Expenses']) globalCachedData['Expenses'] = [];
    globalCachedData['Expenses'].push(row);
    
    handleBtnAction('recorder-save-expense', '', async () => {
      await appendSheetRow('Expenses', row);
      await refreshAllSheetsCacheInBackground();
    }, () => {
      $('recorder-amount').value = ''; $('recorder-desc').value = '';
      loadCurrentContextData(); 
    });
  };

  // مسدد: حفظ حوالة سداد فوري تفاؤلي
  $('payer-save-payment').onclick = async () => {
    const groupId = $('payer-group').value, amount = Number($('payer-amount').value), notes = $('payer-notes').value.trim();
    if(!groupId || !amount) { alert('الرجاء تحديد المبلغ'); return; }
    const beneficiariesSelect = $('payer-beneficiaries');
    const selectedBeneficiaries = Array.from(beneficiariesSelect.selectedOptions).map(o => o.value);
    const beneficiariesStr = selectedBeneficiaries.join(',');

    const pId = 'P' + Math.floor(1000 + Math.random() * 9000);
    const row = [pId, groupId, currentUser.UserID, beneficiariesStr, amount, new Date().toISOString(), notes, 'Pending'];
    
    if(!globalCachedData['Payments']) globalCachedData['Payments'] = [];
    globalCachedData['Payments'].push(row);

    handleBtnAction('payer-save-payment', '', async () => {
      await appendSheetRow('Payments', row);
      await refreshAllSheetsCacheInBackground();
    }, () => {
      $('payer-amount').value = ''; $('payer-notes').value = '';
      setText('payer-pay-msg', 'تم حفظ المعاملة');
      loadCurrentContextData();
    });
  };

  document.querySelectorAll('.tabs').forEach(tabCont => {
    tabCont.addEventListener('click', e => {
      if(!e.target.classList.contains('tab-btn')) return;
      const targetTabId = e.target.getAttribute('data-tab');
      const parentSection = tabCont.closest('.role-section');
      parentSection.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      parentSection.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
      e.target.classList.add('active');
      $(targetTabId).classList.remove('hidden');
    });
  });

  const saved = localStorage.getItem('currentUser');
  if(saved) { currentUser = JSON.parse(saved); startApp(); }
});