// =====================================================================
// Lo de Mari ERP - Estado Global y Funciones de Utilidad
// =====================================================================

let localInventory = [];
let posSales = [];
let activePosSaleIndex = 0;
let currentDebtors = [];
let currentDebtorId = null;
let currentDebtorData = null;
let pendingPayments = [];
let calendarNotes = {};
let currentCalendarDate = new Date();
let salesHistory = [];

let allExpenses = {};
let dailyEarnings = {};
let currentFinanceDate = new Date();
let financeChart = null;
let tempBarcodes = [];

const APP_STATE_PREFIX = 'loDeMari_appState_';
const CUMULATIVE_DEBT_ID = 'fiado-acumulado-id';

function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        try { return crypto.randomUUID(); } catch(e) {}
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function roundPrice(price) {
    if (price <= 0) return 0;
    const remainder = price % 100;
    const base = Math.floor(price / 100) * 100;
    if (remainder === 0) return price;
    if (remainder <= 50) return base + 50;
    return base + 100;
}

function formatNumber(num) {
    return num.toLocaleString('es-AR');
}

function getYearMonth(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getYearMonthDay(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function showToast(message, isError = false) {
    const t = document.getElementById('toast'), m = document.getElementById('toast-message');
    if (!t || !m) return;
    m.textContent = message;
    t.className = `fixed bottom-6 right-6 text-white py-3 px-5 rounded-2xl shadow-2xl border border-[#df9b28]/50 transform transition-transform duration-300 z-50 font-bold text-sm flex items-center gap-2.5 ${isError ? 'bg-red-600' : 'bg-[#2b413c]'}`;
    t.classList.remove('translate-x-[120%]');
    setTimeout(() => { t.classList.add('translate-x-[120%]'); }, 3000);
}

function showModal(title, message) {
    const m = document.getElementById('confirm-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    m.classList.remove('hidden');
    return new Promise((res) => {
        document.getElementById('modal-confirm-btn').onclick = () => { m.classList.add('hidden'); res(true); };
        document.getElementById('modal-cancel-btn').onclick = () => { m.classList.add('hidden'); res(false); };
    });
}
