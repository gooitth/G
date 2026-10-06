// app.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://etztnzuivagqxjahlyqa.supabase.co';
const SUPABASE_ANON_KEY = 'Sb_publishable_rHRivMdg5__JBuOND0tCKg_CY1Z7sA0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentShiftId = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    const mgrLogoutBtn = document.getElementById('manager-logout-btn');
    if (mgrLogoutBtn) mgrLogoutBtn.addEventListener('click', handleLogout);
    
    const startShiftBtn = document.getElementById('start-shift-btn');
    if (startShiftBtn) startShiftBtn.addEventListener('click', startShift);

    const soldCountInput = document.getElementById('sold-count');
    if (soldCountInput) soldCountInput.addEventListener('input', calculateTotals);

    const openingCashInput = document.getElementById('opening-cash');
    if (openingCashInput) openingCashInput.addEventListener('input', calculateTotals);

    const reinforcementInput = document.getElementById('reinforcement');
    if (reinforcementInput) reinforcementInput.addEventListener('input', calculateTotals);

    const hasMiscSelect = document.getElementById('has-misc');
    if (hasMiscSelect) hasMiscSelect.addEventListener('change', toggleMiscFields);

    const miscCountInput = document.getElementById('misc-count');
    if (miscCountInput) miscCountInput.addEventListener('input', renderMiscInputs);

    const unsoldCountInput = document.getElementById('unsold-count');
    if (unsoldCountInput) unsoldCountInput.addEventListener('input', renderUnsoldInputs);

    const resetFormBtn = document.getElementById('reset-form-btn');
    if (resetFormBtn) resetFormBtn.addEventListener('click', resetForm);

    const endShiftBtn = document.getElementById('end-shift-btn');
    if (endShiftBtn) endShiftBtn.addEventListener('click', endShift);
});

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) {
            currentUser = profile;
            if (profile.role === 'manager') {
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('manager-dashboard').classList.remove('hidden');
                loadManagerData();
            } else {
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('employee-dashboard').classList.remove('hidden');
                document.getElementById('emp-name-display').textContent = profile.full_name;
            }
        }
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    errorDiv.classList.add('hidden');

    const { data: profile } = await supabase.from('profiles').select('*').eq('username', username).single();
    if (!profile) {
        errorDiv.textContent = 'اسم المستخدم غير موجود';
        errorDiv.classList.remove('hidden');
        return;
    }

    const { error } = await supabase.auth.signInWithPassword({
        email: `${username}@system.local`,
        password: password
    });

    if (error) {
        errorDiv.textContent = 'كلمة المرور غير صحيحة';
        errorDiv.classList.remove('hidden');
        return;
    }

    location.reload();
}

async function handleLogout() {
    await supabase.auth.signOut();
    location.reload();
}

async function startShift() {
    const shiftType = document.getElementById('shift-type').value;
    const openingCash = parseFloat(document.getElementById('opening-cash').value) || 0;

    const { data, error } = await supabase.from('shifts').insert([{
        employee_id: currentUser.id,
        shift_type: shiftType,
        opening_cash: openingCash,
        status: 'open',
        start_date: new Date().toISOString().split('T')[0],
        start_time: new Date().toTimeString().split(' ')[0]
    }]).select().single();

    if (error) {
        alert('حدث خطأ أثناء بدء الشفت');
        return;
    }

    currentShiftId = data.id;
    document.getElementById('start-shift-btn').disabled = true;
    document.getElementById('active-shift-fields').classList.remove('hidden');
    alert('تم بدء الشفت بنجاح');
}

window.calculateTotals = function() {
    const openingCash = parseFloat(document.getElementById('opening-cash').value) || 0;
    const reinforcement = parseFloat(document.getElementById('reinforcement').value) || 0;
    const soldCount = parseInt(document.getElementById('sold-count').value) || 0;
    const soldAmount = soldCount * 2000;

    document.getElementById('sold-amount-display').textContent = soldAmount.toLocaleString();

    let miscTotal = 0;
    document.querySelectorAll('.misc-price-input').forEach(input => {
        miscTotal += parseFloat(input.value) || 0;
    });
    document.getElementById('misc-total-display').textContent = miscTotal.toLocaleString();

    const totalSales = soldAmount + miscTotal;
    document.getElementById('total-sales-display').textContent = totalSales.toLocaleString();

    const endingCash = openingCash + reinforcement - totalSales;
    document.getElementById('ending-cash-display').textContent = endingCash.toLocaleString();
}

function toggleMiscFields() {
    const hasMisc = document.getElementById('has-misc').value;
    const miscContainer = document.getElementById('misc-container');
    if (hasMisc === 'yes') {
        miscContainer.classList.remove('hidden');
    } else {
        miscContainer.classList.add('hidden');
        document.getElementById('misc-count').value = 0;
        document.getElementById('misc-inputs-list').innerHTML = '';
        window.calculateTotals();
    }
}

function renderMiscInputs() {
    const count = parseInt(document.getElementById('misc-count').value) || 0;
    const list = document.getElementById('misc-inputs-list');
    list.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        list.innerHTML += `
            <div>
                <label class="block text-xs text-gray-600 mb-1">المعاملة المتفرقة ${i} — السعر</label>
                <input type="number" min="0" value="0" class="misc-price-input w-full px-3 py-1.5 border rounded-lg text-sm" oninput="calculateTotals()">
            </div>
        `;
    }
    window.calculateTotals();
}

function renderUnsoldInputs() {
    const count = parseInt(document.getElementById('unsold-count').value) || 0;
    const list = document.getElementById('unsold-records-list');
    list.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        list.innerHTML += `
            <div class="p-3 border rounded-lg space-y-2 bg-gray-50">
                <p class="text-xs font-semibold text-gray-700">المعاملة غير المباعة ${i}</p>
                <input type="text" placeholder="اسم الزبون (اختياري)" class="unsold-customer w-full px-3 py-1.5 border rounded-lg text-sm bg-white">
                <input type="file" class="unsold-file w-full text-xs text-gray-500">
            </div>
        `;
    }
}

function resetForm() {
    if (confirm('هل أنت متأكد من تفريغ البيانات المدخلة؟')) {
        document.getElementById('active-shift-fields').classList.add('hidden');
        document.getElementById('start-shift-btn').disabled = false;
        document.getElementById('opening-cash').value = 0;
        document.getElementById('reinforcement').value = 0;
        document.getElementById('sold-count').value = 0;
        document.getElementById('has-misc').value = 'no';
        document.getElementById('misc-count').value = 0;
        document.getElementById('misc-inputs-list').innerHTML = '';
        document.getElementById('unsold-count').value = 0;
        document.getElementById('unsold-records-list').innerHTML = '';
        window.calculateTotals();
    }
}

async function endShift() {
    if (!currentShiftId) return;
    if (!confirm('هل أنت متأكد من إنهاء الشفت وحفظ التقرير؟')) return;

    const openingCash = parseFloat(document.getElementById('opening-cash').value) || 0;
    const reinforcement = parseFloat(document.getElementById('reinforcement').value) || 0;
    const soldCount = parseInt(document.getElementById('sold-count').value) || 0;
    const soldAmount = soldCount * 2000;
    const hasMisc = document.getElementById('has-misc').value === 'yes';
    const miscCount = parseInt(document.getElementById('misc-count').value) || 0;
    
    let miscTotal = 0;
    const miscPrices = [];
    document.querySelectorAll('.misc-price-input').forEach(input => {
        const val = parseFloat(input.value) || 0;
        miscPrices.push(val);
        miscTotal += val;
    });

    const totalSales = soldAmount + miscTotal;
    const endingCash = openingCash + reinforcement - totalSales;
    const unsoldCount = parseInt(document.getElementById('unsold-count').value) || 0;

    await supabase.from('shifts').update({
        reinforcement,
        sold_count: soldCount,
        sold_amount: soldAmount,
        has_misc_sales: hasMisc,
        misc_count: miscCount,
        misc_total: miscTotal,
        total_sales: totalSales,
        unsold_count: unsoldCount,
        ending_cash: endingCash,
        status: 'completed',
        end_date: new Date().toISOString().split('T')[0],
        end_time: new Date().toTimeString().split(' ')[0],
        updated_at: new Date()
    }).eq('id', currentShiftId);

    for (let price of miscPrices) {
        await supabase.from('miscellaneous_sales').insert([{ shift_id: currentShiftId, price }]);
    }

    const unsoldRecords = document.querySelectorAll('#unsold-records-list > div');
    for (let record of unsoldRecords) {
        const customerName = record.querySelector('.unsold-customer').value;
        const fileInput = record.querySelector('.unsold-file');

        const { data: unsoldData } = await supabase.from('unsold_transactions').insert([{
            shift_id: currentShiftId,
            customer_name: customerName
        }]).select().single();

        if (unsoldData && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const filePath = `attachments/${currentShiftId}/${Date.now()}_${file.name}`;
            
            const { error: uploadErr } = await supabase.storage.from('attachments').upload(filePath, file);
            if (!uploadErr) {
                const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);
                await supabase.from('attachments').insert([{
                    shift_id: currentShiftId,
                    unsold_transaction_id: unsoldData.id,
                    file_name: file.name,
                    file_path: filePath,
                    file_url: publicUrl,
                    file_type: file.type
                }]);
            }
        }
    }

    alert('تم إنهاء الشفت وحفظ التقرير بنجاح');
    location.reload();
}

async function loadManagerData() {
    const { data: shifts } = await supabase.from('shifts').select('*');
    const reportsList = document.getElementById('manager-reports-list');
    if (reportsList && shifts) {
        if (shifts.length === 0) {
            reportsList.innerHTML = '<p class="text-gray-500 text-sm">لا توجد شفتات مسجلة حتى الآن.</p>';
        } else {
            let html = `
                <table class="w-full text-right border-collapse">
                    <thead>
                        <tr class="bg-gray-100 text-xs text-gray-600 border-b">
                            <th class="p-3">نوع الشفت</th>
                            <th class="p-3">التاريخ</th>
                            <th class="p-3">نقد البداية</th>
                            <th class="p-3">المبيعات</th>
                            <th class="p-3">نقد النهاية</th>
                            <th class="p-3">الحالة</th>
                        </tr>
                    </thead>
                    <tbody class="text-sm">
            `;
            shifts.forEach(s => {
                html += `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="p-3">${s.shift_type}</td>
                        <td class="p-3">${s.start_date}</td>
                        <td class="p-3">${s.opening_cash.toLocaleString()}</td>
                        <td class="p-3 text-blue-600 font-semibold">${s.total_sales.toLocaleString()}</td>
                        <td class="p-3 font-bold">${s.ending_cash.toLocaleString()}</td>
                        <td class="p-3"><span class="px-2 py-1 rounded text-xs ${s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">${s.status === 'completed' ? 'مكتمل' : 'مفتوح'}</span></td>
                    </tr>
                `;
            });
            html += `</tbody></table>`;
            reportsList.innerHTML = html;
        }
    }
}
