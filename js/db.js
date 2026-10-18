// =====================================================================
// Lo de Mari ERP - Motor de Persistencia (IndexedDB + Memoria) e Import/Export
// =====================================================================

        const IDB_NAME = 'loDeMari_IndexedDB';
        const IDB_VERSION = 1;
        const IDB_STORE = 'app_data';
        let _idbInstance = null;
        const _memCache = {};

        function openIndexedDB() {
            if (_idbInstance) return Promise.resolve(_idbInstance);
            return new Promise((resolve) => {
                if (!window.indexedDB) {
                    console.warn("IndexedDB no disponible, usando fallback en memoria.");
                    return resolve(null);
                }
                const req = indexedDB.open(IDB_NAME, IDB_VERSION);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(IDB_STORE)) {
                        db.createObjectStore(IDB_STORE);
                    }
                };
                req.onsuccess = (e) => {
                    _idbInstance = e.target.result;
                    resolve(_idbInstance);
                };
                req.onerror = () => {
                    console.warn("No se pudo abrir IndexedDB:", req.error);
                    resolve(null);
                };
            });
        }

        async function idbSet(key, value) {
            try {
                const db = await openIndexedDB();
                if (!db) return;
                return new Promise((resolve) => {
                    const tx = db.transaction(IDB_STORE, 'readwrite');
                    const store = tx.objectStore(IDB_STORE);
                    const req = store.put(value, key);
                    req.onsuccess = () => resolve();
                    req.onerror = () => resolve();
                });
            } catch (e) {
                console.warn("idbSet error:", e);
            }
        }

        async function idbGetAll() {
            try {
                const db = await openIndexedDB();
                if (!db) return {};
                return new Promise((resolve) => {
                    const tx = db.transaction(IDB_STORE, 'readonly');
                    const store = tx.objectStore(IDB_STORE);
                    const req = store.openCursor();
                    const results = {};
                    req.onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (cursor) {
                            results[cursor.key] = cursor.value;
                            cursor.continue();
                        } else {
                            resolve(results);
                        }
                    };
                    req.onerror = () => resolve({});
                });
            } catch (e) {
                return {};
            }
        }

        async function initStorageEngine() {
            // 1. Cargar datos desde IndexedDB a la memoria caché síncrona
            const idbData = await idbGetAll();
            for (const key in idbData) {
                _memCache[key] = idbData[key];
            }

            // 2. Si hay datos en localStorage que no están en IndexedDB, migrarlos automáticamente
            const keysToMigrate = [
                'loDeMari_inventory',
                'loDeMari_debtors',
                'loDeMari_calendarNotes',
                'loDeMari_allExpenses',
                'loDeMari_dailyEarnings',
                'loDeMari_salesHistory',
                'loDeMari_pendingPayments',
                'loDeMari_posSales',
                'loDeMari_activePosSaleIndex'
            ];
            for (const k of keysToMigrate) {
                if (_memCache[k] === undefined) {
                    const lsRaw = localStorage.getItem(k);
                    if (lsRaw) {
                        try {
                            const parsed = JSON.parse(lsRaw);
                            _memCache[k] = parsed;
                            await idbSet(k, parsed);
                        } catch (e) {
                            _memCache[k] = lsRaw;
                            await idbSet(k, lsRaw);
                        }
                    }
                }
            }
            console.log("Motor de almacenamiento IndexedDB listo. Claves activas:", Object.keys(_memCache));
        }

        function saveAllData() {
            saveInventory();
            saveDebtors();
            savePendingPayments();
            saveExpenses();
            saveDailyEarnings();
            saveSalesHistory();
            console.log("Todos los datos guardados en IndexedDB.");
        }
        function saveToStorage(key, data) {
            _memCache[key] = data;
            // Persistir de forma segura en IndexedDB (sin límite de 5MB)
            idbSet(key, data);
            // Guardar copia en localStorage solo si no es el historial gigante de ventas
            try {
                if (key !== 'loDeMari_salesHistory') {
                    localStorage.setItem(key, JSON.stringify(data));
                }
            } catch (e) {
                // Si localStorage está lleno, IndexedDB ya tiene los datos asegurados
            }
        }
        function loadFromStorage(key, defaultValue = null) { 
            if (_memCache[key] !== undefined) {
                return _memCache[key];
            }
            const data = localStorage.getItem(key); 
            try {
                return data ? JSON.parse(data) : defaultValue; 
            } catch (e) {
                return defaultValue;
            }
        }

        function saveInventory() { saveToStorage('loDeMari_inventory', localInventory); }
        function loadInventory() {
            const data = loadFromStorage('loDeMari_inventory', []);
            localInventory = data.map(p => ({ 
                ...p, 
                price: roundPrice(p.price),
                category: p.category || 'General',
                size: p.size || '',
                barcodes: p.barcodes || []
            }));
            localInventory.sort((a, b) => a.name.localeCompare(b.name));
        }
        function saveDebtors() { saveToStorage('loDeMari_debtors', currentDebtors); }
        function loadDebtors() { 
            const data = loadFromStorage('loDeMari_debtors', []);
            
            const ensureLockedPrice = (item) => {
                let lockedPrice = item.lockedPrice;
                if (lockedPrice === undefined) {
                    const product = localInventory.find(p => p.id === item.productId);
                    lockedPrice = product ? product.price : 0;
                }
                return { ...item, id: item.id || generateId(), lockedPrice };
            };

            currentDebtors = data.map(debtor => ({
                ...debtor,
                id: debtor.id || generateId(),
                history: debtor.history || [],
                items: (debtor.items || []).map(ensureLockedPrice),
                savedDebts: (debtor.savedDebts || []).map(sd => ({
                    ...sd, 
                    saldoFavor: sd.saldoFavor || 0,
                    items: (sd.items || []).map(ensureLockedPrice)
                })),
                saldoFavor: debtor.saldoFavor || 0
            })); 
            currentDebtors.sort((a, b) => a.name.localeCompare(b.name)); 
        }
        function savePendingPayments() { saveToStorage('loDeMari_pendingPayments', pendingPayments); }
        function loadPendingPayments() { 
            const loaded = loadFromStorage('loDeMari_pendingPayments', []); 
            pendingPayments = Array.isArray(loaded) ? loaded : []; 
        }
        function saveExpenses() { saveToStorage('loDeMari_allExpenses', allExpenses); }
        function loadExpenses() { allExpenses = loadFromStorage('loDeMari_allExpenses', {}); }
        function saveDailyEarnings() { saveToStorage('loDeMari_dailyEarnings', dailyEarnings); }
        function loadDailyEarnings() {
            const data = loadFromStorage('loDeMari_dailyEarnings', {});
            for (const dateKey in data) {
                const dayData = data[dateKey] || {};
                if (dayData) {
                    ['manana', 'tarde'].forEach(shift => {
                        if (typeof dayData[shift] === 'number') {
                            dayData[shift] = { total: dayData[shift], Efectivo: dayData[shift], Transferencia: 0, Posnet: 0 };
                        } else if (typeof dayData[shift] === 'undefined' || dayData[shift] === null) {
                            dayData[shift] = { total: 0, Efectivo: 0, Transferencia: 0, Posnet: 0 };
                        }
                    });
                    if (!dayData.pendingSales) dayData.pendingSales = [];
                    if (!dayData.debtorPayments) dayData.debtorPayments = [];
                }
            }
            dailyEarnings = data;
        }
        function savePosSales() { saveToStorage('loDeMari_posSales', posSales); }
        function loadPosSales() { 
            let loadedSales = loadFromStorage('loDeMari_posSales', []);
            if (!Array.isArray(loadedSales) || loadedSales.length < 4) {
                loadedSales = Array(4).fill(null).map(() => ({ items: [], debtorId: '', paymentMethod: 'Efectivo' }));
            }
            posSales = loadedSales.slice(0, 4).map(sale => sale || { items: [], debtorId: '', paymentMethod: 'Efectivo' });
            activePosSaleIndex = parseInt(loadFromStorage('loDeMari_activePosSaleIndex', '0')) || 0;
        }
        function saveSalesHistory() { saveToStorage('loDeMari_salesHistory', salesHistory); }
        function loadSalesHistory() {
            salesHistory = loadFromStorage('loDeMari_salesHistory', []);
        }


        function setupImportExport() {
            document.getElementById('export-data-btn').addEventListener('click', exportData);
            document.getElementById('import-data-btn').addEventListener('click', () => { document.getElementById('import-data-input').click(); });
            document.getElementById('import-data-input').addEventListener('change', importData);
        }
        async function exportData() {
            const dataToExport = {};
            const keys = ['loDeMari_inventory', 'loDeMari_debtors', 'loDeMari_calendarNotes', 'loDeMari_allExpenses', 'loDeMari_dailyEarnings', 'loDeMari_salesHistory'];
            for (const key of keys) {
                const data = _memCache[key] !== undefined ? _memCache[key] : loadFromStorage(key);
                if (data) {
                    dataToExport[key] = data;
                }
            }
            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `lo-de-mari-backup-${getYearMonthDay(new Date())}.json`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            showToast(`Datos exportados correctamente (${(blob.size / (1024 * 1024)).toFixed(1)} MB).`);
        }
        async function importData(event) {
            const file = event.target.files[0]; if (!file) return;
            const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
            const conf = await showModal("Confirmar Importación", `Esto cargará el respaldo completo (${sizeMb} MB) en la base de datos local IndexedDB. ¿Estás seguro?`);
            if (!conf) { event.target.value = ''; return; }
            showToast(`Leyendo e importando ${sizeMb} MB... por favor esperá.`, false);
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    const keys = Object.keys(importedData);
                    for (const key of keys) {
                        _memCache[key] = importedData[key];
                        await idbSet(key, importedData[key]);
                        try {
                            if (key !== 'loDeMari_salesHistory') {
                                localStorage.setItem(key, JSON.stringify(importedData[key]));
                            }
                        } catch (err) {}
                    }
                    const prodCount = Array.isArray(importedData.loDeMari_inventory) ? importedData.loDeMari_inventory.length : 0;
                    const debtCount = Array.isArray(importedData.loDeMari_debtors) ? importedData.loDeMari_debtors.length : 0;
                    const salesCount = Array.isArray(importedData.loDeMari_salesHistory) ? importedData.loDeMari_salesHistory.length : 0;
                    showToast(`¡Respaldo importado con éxito! (${prodCount} productos, ${debtCount} deudores, ${salesCount} ventas). Recargando...`);
                    setTimeout(() => location.reload(), 1500);
                } catch (error) {
                    showToast("Error al importar el archivo: " + error.message, true);
                    console.error("Error al importar:", error);
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        }

