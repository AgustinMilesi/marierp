// =====================================================================
// Lo de Mari ERP - Controlador Principal, Enrutador y Arranque
// =====================================================================

        function setupNavigation() { const btns = document.querySelectorAll('.nav-btn'), menu = document.getElementById('mobile-menu'), overlay = document.getElementById('menu-overlay'); btns.forEach(b => { b.addEventListener('click', () => { const viewId = b.getAttribute('data-view'); switchView(viewId); menu.classList.add('-translate-x-full'); overlay.classList.add('hidden'); }); }); }
        
        function switchView(viewId, callback = null) {
            localStorage.setItem('loDeMari_currentView', viewId);
            document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
            document.getElementById('main-content').classList.toggle('max-w-full', viewId === 'vender');
            const targetView = document.getElementById(`view-${viewId}`) || document.getElementById('view-vender'); // Fallback to vender view
            targetView.classList.remove('hidden');
            
            document.querySelectorAll('.nav-btn').forEach(b => {
                const active = b.getAttribute('data-view') === viewId;
                b.setAttribute('data-active', active ? 'true' : 'false');
                b.classList.toggle('nav-active', active);
                b.classList.toggle('bg-[#e6ede9]', active);
                b.classList.toggle('text-[#243733]', active);
                b.classList.toggle('font-extrabold', active);
                b.classList.toggle('shadow-md', active);
                b.classList.toggle('text-white/80', !active);
                b.classList.toggle('hover:bg-white/10', !active);

                const icon = b.querySelector('.nav-icon');
                if (icon) {
                    icon.classList.toggle('text-[#df9b28]', active);
                    icon.classList.toggle('text-white/60', !active);
                }
            });

            // Actualizar pestañas o título en la barra superior
            const posTabs = document.getElementById('pos-tabs');
            const viewTitlePill = document.getElementById('view-title-pill');
            const viewTitleText = document.getElementById('view-title-text');
            if (posTabs) {
                posTabs.classList.toggle('hidden', viewId !== 'vender');
            }
            if (viewTitlePill && viewTitleText) {
                const viewNames = {
                    'vender': 'Punto de Venta',
                    'deudores': 'Control de Deudores',
                    'cierre-caja': 'Cierre de Caja',
                    'inventario': 'Inventario y Artículos',
                    'finanzas': 'Gestión Financiera',
                    'verduleria': 'Resumen Verdulería',
                    'historial': 'Historial de Ventas',
                    'configuracion': 'Configuración y Datos'
                };
                viewTitleText.textContent = viewNames[viewId] || viewId;
                viewTitlePill.classList.toggle('hidden', viewId === 'vender');
                viewTitlePill.classList.toggle('flex', viewId !== 'vender');
            }

            updateUIForNewView(viewId, callback);
        }

        function updateUIForNewView(viewId, callback = null) {
            // Se usa requestAnimationFrame para asegurar que las actualizaciones de UI
            // se ejecuten después de que el navegador haya renderizado los cambios de vista.            
            requestAnimationFrame(() => {
                if (viewId === 'vender') { updateProductSelects(); renderSaleList(); renderPendingSales(); }
                if (viewId === 'deudores') { updateProductSelects(); renderDebtorList(); updatePosDebtorSelect(); if(currentDebtorId) showDebtorDetails(currentDebtorId, false); }
                if (viewId === 'inventario') { InventoryService.render(); }
                if (viewId === 'finanzas' || viewId === 'verduleria') { renderFinanzasView(); }
                if (viewId === 'cierre-caja') { updateCierreCajaView(); }
                if (viewId === 'configuracion') { setupImportExport(); }
                if (viewId === 'historial') { renderSalesHistory(); }

                if (callback) {
                    callback();
                }
            });
        }

        function setupHamburgerMenu() { const btn = document.getElementById('menu-toggle-btn'), menu = document.getElementById('mobile-menu'), overlay = document.getElementById('menu-overlay'); btn.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.remove('-translate-x-full'); overlay.classList.remove('hidden'); }); overlay.addEventListener('click', () => { menu.classList.add('-translate-x-full'); overlay.classList.add('hidden'); }); }
        function setupThemeToggle() {
            const btn = document.getElementById('theme-toggle');
            const light = document.getElementById('theme-toggle-light');
            const dark = document.getElementById('theme-toggle-dark');
            const html = document.documentElement;

            const update = () => {
                const isDark = html.classList.contains('dark');
                if (light) light.classList.toggle('hidden', !isDark);
                if (dark) dark.classList.toggle('hidden', isDark);
                localStorage.setItem('loDeMari_theme', isDark ? 'dark' : 'light');
                const textColor = isDark ? '#e6f0ec' : '#243733';
                if (financeChart) {
                    try {
                        if (financeChart.options?.plugins?.legend?.labels) financeChart.options.plugins.legend.labels.color = textColor;
                        if (financeChart.options?.plugins?.title) financeChart.options.plugins.title.color = textColor;
                        financeChart.update('none');
                    } catch (e) { console.error("Error updating chart colors:", e); }
                }
            };

            const saved = localStorage.getItem('loDeMari_theme');
            if (saved === 'dark') {
                html.classList.add('dark');
            } else if (saved === 'light') {
                html.classList.remove('dark');
            } else {
                // Si no hay preferencia guardada, respetamos la clase inicial o preferencia de sistema
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    html.classList.add('dark');
                }
            }
            update();

            if (btn) {
                btn.onclick = (e) => {
                    e.preventDefault();
                    html.classList.toggle('dark');
                    update();
                };
            }
        }
        function setupSearchFilters() { document.getElementById('inventory-search').addEventListener('input', (e) => { InventoryService.render(e.target.value); localStorage.setItem(APP_STATE_PREFIX + 'inventory-search', e.target.value); }); document.getElementById('debtor-search').addEventListener('input', (e) => { renderDebtorList(e.target.value); localStorage.setItem(APP_STATE_PREFIX + 'debtor-search', e.target.value); }); }
        function showToast(message, isError = false) { const t = document.getElementById('toast'), m = document.getElementById('toast-message'); m.textContent = message; t.className = `fixed bottom-20 right-5 text-white py-2 px-4 rounded-lg shadow-lg transform transition-transform duration-300 z-50 ${isError ? 'bg-red-600' : 'bg-green-600'}`; t.classList.remove('translate-x-[120%]'); setTimeout(() => { t.classList.add('translate-x-[120%]'); }, 3000); }
        function showModal(title, message) { const m = document.getElementById('confirm-modal'); document.getElementById('modal-title').textContent = title; document.getElementById('modal-message').textContent = message; m.classList.remove('hidden'); return new Promise((res) => { document.getElementById('modal-confirm-btn').onclick = () => { m.classList.add('hidden'); res(true); }; document.getElementById('modal-cancel-btn').onclick = () => { m.classList.add('hidden'); res(false); }; }); }
        function setupQuickSave() { document.getElementById('quick-save-btn').addEventListener('click', () => { saveAllData(); showToast("Cambios guardados."); }); document.getElementById('debtor-item-search').addEventListener('input', (e) => { updateProductSelects(e.target.value, 'debtor'); }); document.getElementById('debtor-item-search').addEventListener('search', (e) => { if (!e.target.value) updateProductSelects('', 'debtor'); }); }


        function setupFormPersistence() {
            const persist = (formId, fields) => {
                const form = document.getElementById(formId);
                const storageKey = APP_STATE_PREFIX + formId;
                fields.forEach(fieldId => {
                    const input = form.querySelector(`#${fieldId}`);
                    if (input) {
                        input.addEventListener('input', () => {
                            const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
                            data[fieldId] = input.value;
                            localStorage.setItem(storageKey, JSON.stringify(data));
                        });
                    }
                });
            };
            persist('product-form', ['product-name', 'product-brand', 'product-size', 'product-price', 'product-type']); 
            persist('add-expense-form', ['expense-date', 'expense-description', 'expense-amount']); 
        }
        function restoreFormState() {
            document.querySelectorAll('form').forEach(form => {
                const storageKey = APP_STATE_PREFIX + form.id;
                const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
                Object.keys(data).forEach(fieldId => {
                    const input = form.querySelector(`#${fieldId}`);
                    if (input) input.value = data[fieldId];
                });
            });
            ['inventory-search', 'pos-search', 'debtor-search', 'pos-quantity', 'percentage-category', 'percentage-increase'].forEach(id => {
                const value = localStorage.getItem(APP_STATE_PREFIX + id); // Note: pos-search is now per-card
                const el = document.getElementById(id);
                if (el && value) el.value = value;
            });
        }

        function initializeBarcodeListener() {
            let buffer = '', lastKeyTime = 0;
            window.addEventListener('keydown', (e) => {
                const currentTime = new Date().getTime();
                if (currentTime - lastKeyTime > 100) {
                    buffer = '';
                }

                if (e.key === 'Enter') {
                    if (buffer.length > 3) {
                        const product = localInventory.find(p => p.barcodes && p.barcodes.includes(buffer));
                        if (product) {
                            handleScannedProduct(product);
                        } else {
                            showToast(`Código de barras "${buffer}" no encontrado.`, true);
                        }
                    }
                    buffer = '';
                } else if (!['Shift', 'Control', 'Alt', 'CapsLock', 'Tab', 'Meta'].includes(e.key)) {
                    buffer += e.key;
                }
                lastKeyTime = currentTime;
            });
        }
        
        function handleScannedProduct(product) {
            const currentView = localStorage.getItem('loDeMari_currentView') || 'vender';
            if (currentView === 'vender') {
                addPOSToSale(activePosSaleIndex, product.id, 1, 'Unidad');
                showToast(`${product.name} agregado al pedido activo.`);
            } else if (currentView === 'deudores' && currentDebtorId) {                
                addItemToDebtor(null, product.id, 1);
                showToast(`${product.name} agregado a la cuenta de ${currentDebtorData?.name}.`);
            } else {
                switchView('vender', () => {
                    addPOSToSale(activePosSaleIndex, product.id, 1, 'Unidad');
                    showToast(`${product.name} agregado al pedido activo.`);
                });
            }
        }

        function setupKeyboardNavigation() {
            window.addEventListener('keydown', (e) => {
                const activeEl = document.activeElement;
                if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
                    return;
                }

                const navButtons = Array.from(document.querySelectorAll('#mobile-menu .nav-btn'));
                const viewOrder = navButtons.map(btn => btn.dataset.view);
                const currentView = localStorage.getItem('loDeMari_currentView') || 'vender'; // Esto se puede mejorar
                const currentIndex = viewOrder.indexOf(currentView);

                if (currentIndex === -1) return;

                if (e.key === 'ArrowDown') {
                    e.preventDefault(); // Prevenir scroll
                    switchView(viewOrder[(currentIndex + 1) % viewOrder.length]);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    switchView(viewOrder[(currentIndex - 1 + viewOrder.length) % viewOrder.length]);
                }
            });
        }

        function updateTopBarInfo() {
            const dateEl = document.getElementById('live-date-text');
            const shiftEl = document.getElementById('live-shift-text');
            const now = new Date();
            if (dateEl) {
                const options = { weekday: 'short', day: 'numeric', month: 'short' };
                dateEl.textContent = now.toLocaleDateString('es-AR', options).toUpperCase();
            }
            if (shiftEl) {
                const hour = now.getHours();
                shiftEl.textContent = hour < 14 ? '☀️ Mañana' : '🌙 Tarde';
            }
            const shiftPill = document.getElementById('top-shift-pill');
            if (shiftPill && !shiftPill._listenerSet) {
                shiftPill._listenerSet = true;
                shiftPill.addEventListener('click', () => switchView('cierre-caja'));
            }
        }

        document.addEventListener('DOMContentLoaded', async () => {
            // Inicializar el motor IndexedDB primero para cargar datos sin límite de 5MB
            await initStorageEngine();

            loadInventory(); 
            loadExpenses(); 
            loadDailyEarnings(); 
            loadSalesHistory();
            loadPosSales();
            loadDebtors();
            loadPendingPayments();
            
            restoreFormState();
            
            setupNavigation(); 
            setupThemeToggle(); 
            setupHamburgerMenu();
            InventoryService.init();
            setupSearchFilters(); 
            setupQuickSave();
            setupFormPersistence();
            setupKeyboardNavigation();
            initializeBarcodeListener();
            setupPOS(); 
            setupDebtors();
            setupFinanzas(); 
            setupCierreCaja(); 
            setupSalesHistory();
            setupImportExport();
            
            updateTopBarInfo();
            updateProductSelects(); 
            updatePosDebtorSelect();
            renderPendingSales();
            
            const lastView = localStorage.getItem('loDeMari_currentView') || 'vender';
            switchView(lastView);

            // Si la base de datos está vacía, avisar amigablemente al usuario
            if (localInventory.length === 0 && currentDebtors.length === 0 && salesHistory.length === 0) {
                setTimeout(() => {
                    showToast("💡 Base de datos vacía. Podés ir a 'Configuración > Importar datos' para cargar tu respaldo de productos y deudores.", false);
                }, 1000);
            }
        });
    
