// =====================================================================
// Lo de Mari ERP - Cuentas Corrientes y Control de Deudores
// =====================================================================

        function setupDebtors() {
            document.getElementById('add-debtor-form').addEventListener('submit', (e) => { e.preventDefault(); const nameInput = document.getElementById('debtor-name'); const name = nameInput.value.trim(); if (name) { const id = name.toLowerCase().replace(/\s+/g, '-'); if (currentDebtors.find(d => d.id === id)) { showToast("Deudor ya existe.", true); return; } currentDebtors.push({ id: id, name: name, items: [], saldoFavor: 0, history: [], savedDebts: [] }); saveDebtors(); loadDebtors(); renderDebtorList(document.getElementById('debtor-search')?.value || ''); updatePosDebtorSelect(); showToast("Deudor agregado."); nameInput.value = ''; } });
            document.getElementById('debtor-add-item').addEventListener('click', addItemToDebtor);
            document.getElementById('debtor-charge-all').addEventListener('click', showDebtorPaymentModal);
            document.getElementById('clear-saldo-favor-btn').addEventListener('click', clearSaldoFavor);
            document.getElementById('debtor-save-debt').addEventListener('click', saveCurrentDebt);
            document.getElementById('debtor-account-search').addEventListener('input', renderDebtorItemList);

            document.getElementById('debtor-product').addEventListener('change', (e) => {
                const quantLabel = document.getElementById('debtor-quantity-label');
                const quantInput = document.getElementById('debtor-quantity');
                const selectedOption = e.target.options[e.target.selectedIndex];
                const isPeso = selectedOption && selectedOption.dataset.type === 'Kilo';
                quantLabel.textContent = isPeso ? "Peso (gr)" : "Cantidad";
                quantInput.step = isPeso ? 10 : 1;
                quantInput.value = isPeso ? 100 : 1;
                handleDebtorProductChange(selectedOption);
            });
        }
        function renderDebtorList(filter = '') { 
            calculateAllDebtorsTotal();
            const list = document.getElementById('debtor-list'); list.innerHTML = ''; const term = filter.trim().toLowerCase(); const filtered = currentDebtors.filter(d => d.name.toLowerCase().includes(term)); calculateAllDebtorsTotal();
            if (filtered.length === 0) { list.innerHTML = `<li class="text-gray-500 dark:text-gray-400 text-sm p-2">No se encontraron deudores ${term ? 'con ese filtro' : ''}.</li>`; return; }
            filtered.forEach(d => { const li = document.createElement('li'); li.className = `flex justify-between items-center p-3 rounded-lg cursor-pointer ${currentDebtorId === d.id ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`; li.innerHTML = `<span class="font-medium">${d.name}</span><button class="delete-debtor-btn text-red-500 hover:text-red-700 delete-list-item-btn" data-id="${d.id}" data-name="${d.name}"><svg class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>`; li.addEventListener('click', (e) => { if (!e.target.closest('.delete-debtor-btn')) { showDebtorDetails(d.id); } }); li.querySelector('.delete-debtor-btn').addEventListener('click', async (e) => { e.stopPropagation(); const id = e.currentTarget.dataset.id, name = e.currentTarget.dataset.name; const conf = await showModal("Confirmar Borrado", `Borrar a "${name}"?`); if (conf) { currentDebtors = currentDebtors.filter(db => db.id !== id); saveDebtors(); loadDebtors(); showToast("Deudor borrado."); if (currentDebtorId === id) { showDebtorDetails(null); } renderDebtorList(document.getElementById('debtor-search')?.value || ''); updatePosDebtorSelect(); } }); list.appendChild(li); });
        }
        function showDebtorDetails(id) {
            const panel = document.getElementById('debtor-details-panel'), placeholder = document.getElementById('debtor-details-placeholder'); if (!id) { currentDebtorId = null; currentDebtorData = null; panel.classList.add('hidden'); placeholder.classList.remove('hidden'); renderDebtorList(document.getElementById('debtor-search')?.value || ''); return; } currentDebtorId = id; currentDebtorData = currentDebtors.find(d => d.id === id); if (currentDebtorData) { document.getElementById('debtor-detail-name').textContent = currentDebtorData.name; renderDebtorItemList(); calculateDebtorTotal(); panel.classList.remove('hidden'); placeholder.classList.add('hidden'); } else { showDebtorDetails(null); } renderDebtorList(document.getElementById('debtor-search')?.value || '');
        }

        function handleDebtorProductChange(selectedOption) {
            const quantLabel = document.getElementById('debtor-quantity-label');
            const quantInput = document.getElementById('debtor-quantity');
            const isPeso = selectedOption && selectedOption.dataset.type === 'Kilo';
            quantLabel.textContent = isPeso ? "Peso (gr)" : "Cantidad";
            quantInput.step = isPeso ? 10 : 1;
            quantInput.value = isPeso ? 100 : 1;
        }

        function addItemToDebtor(event, productId = null, qty = null) {
            const isScan = productId !== null;
            const prodId = isScan ? productId : document.getElementById('debtor-product').value;
            const quantInput = document.getElementById('debtor-quantity');
            const quantity = isScan ? qty : parseFloat(quantInput.value);

            if (!currentDebtorId || !prodId || isNaN(quantity) || quantity <= 0) { showToast("Faltan datos.", true); return; } 
            const product = localInventory.find(p => p.id === prodId); 
            if (!product) { showToast("Producto no encontrado.", true); return; } 
            const itemType = product.type === 'Kilo' ? 'Peso' : 'Unidad'; 
            if (product.type === 'Unidad' && !Number.isInteger(quantity)) { showToast("Cantidad para producto por unidad debe ser un número entero.", true); return; }
            
            const saleRecordId = generateId();
            const existingItem = currentDebtorData.items.find(i => i.productId === prodId && i.type === itemType);
            
            const newItem = { id: generateId(), productId: prodId, quantity: quantity, type: itemType, addedAt: new Date().toISOString(), saleRecordId: saleRecordId, lockedPrice: product.price };
            currentDebtorData.items.push(newItem);
            const pricePerGram = product.price / 1000;
            const itemPrice = itemType === 'Unidad' ? roundPrice(product.price * quantity) : roundPrice(pricePerGram * quantity);
            // Solo registrar la venta si el producto es de verdulería
            const todayStr = getYearMonthDay(new Date());
            if (product.category === 'Verduleria') {
                if (!dailyEarnings[todayStr]) dailyEarnings[todayStr] = { pendingSales: [] };
                if (!dailyEarnings[todayStr].debtorSales) dailyEarnings[todayStr].debtorSales = [];
                dailyEarnings[todayStr].debtorSales.push({ id: saleRecordId, items: [{ productId: product.id, price: itemPrice, quantity: quantity }], debtorId: currentDebtorId, timestamp: new Date().toISOString() });
                saveDailyEarnings();
            }
            saveDebtors(); renderDebtorItemList(); calculateDebtorTotal(); document.getElementById('debtor-product').value = ''; quantInput.value = 1; document.getElementById('debtor-item-search').value = ''; updateProductSelects('', 'debtor');
        }
        function adjustDebtorItemQuantity(itemId, amount) { if (!currentDebtorData) return; const item = currentDebtorData.items.find(it => it.id === itemId); if (!item || item.type !== 'Unidad') return; item.quantity += amount; if (item.quantity <= 0) { currentDebtorData.items = currentDebtorData.items.filter(it => it.id !== itemId); showToast("Item eliminado."); } saveDebtors(); renderDebtorItemList(); calculateDebtorTotal(); }
        function renderDebtorItemList() {
            const list = document.getElementById('debtor-item-list'); list.innerHTML = '';
            const filterTerm = document.getElementById('debtor-account-search')?.value.toLowerCase() || '';

            if (!currentDebtorData || !currentDebtorData.items || currentDebtorData.items.length === 0) { list.innerHTML = `<li class="text-gray-500 dark:text-gray-400 text-sm">Cuenta principal vacía.</li>`; } else { 
                currentDebtorData.items.sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt));
                
                const filteredItems = currentDebtorData.items.filter(item => {
                    const product = localInventory.find(p => p.id === item.productId);
                    const pName = product ? product.name : (item.name || '');
                    return pName.toLowerCase().includes(filterTerm);
                });

                if (filteredItems.length === 0 && filterTerm) { list.innerHTML = `<li class="text-gray-500 dark:text-gray-400 text-sm">No se encontraron items.</li>`; }

                filteredItems.forEach((item) => {
                const product = localInventory.find(p => p.id === item.productId);
                // Si el producto no existe en el inventario, no se puede calcular su precio, así que lo omitimos de la lista visible.
                // if (!product && item.productId !== 'summary-item' && item.productId !== CUMULATIVE_DEBT_ID) return;
                const pName = product ? product.name : (item.name || `Producto Eliminado`);
                const pBrand = product && product.brand ? `(${product.brand})` : '';
                const pPrice = product ? Math.max(item.lockedPrice || 0, product.price) : 0;
                const priceText = product ? (item.type === 'Kilo' ? `/kg` : `c/u`) : '';
                let itemText = '';
                const li = document.createElement('li');
                li.className = `flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg`;
                let controlsHTML = '';

                if (item.productId === 'summary-item' || item.productId === CUMULATIVE_DEBT_ID) {
                    itemText = `${pName}: $${formatNumber(item.quantity)}`;
                    controlsHTML = `<button class="debtor-remove-item text-red-500 hover:text-red-700 delete-list-item-btn" data-id="${item.id}" data-name="${itemText}"><svg class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>`;
                    li.innerHTML = `<span class="text-sm">${itemText}</span><div class="flex-shrink-0">${controlsHTML}</div>`;
                } else {
                    itemText = item.type === 'Peso' ? `${item.quantity}gr ${pName}${pBrand}` : `${item.quantity}x ${pName}${pBrand}`;
                    const removeBtnHTML = `<button class="debtor-remove-item text-red-500 hover:text-red-700 delete-list-item-btn" data-id="${item.id}"><svg class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>`;
                    if (item.type === 'Unidad') {
                        controlsHTML = `
                            <div class="flex items-center space-x-2">
                                <button class="debtor-adjust-qty text-blue-500" data-id="${item.id}" data-amount="-1"><svg class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18 12H6" /></svg></button>
                                <span class="font-medium text-sm w-8 text-center">${item.quantity}x</span>
                                <button class="debtor-adjust-qty text-blue-500" data-id="${item.id}" data-amount="1"><svg class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></button>
                                <div class="border-l border-gray-300 dark:border-gray-600 h-6 mx-2"></div>
                                ${removeBtnHTML}
                            </div>`;
                        li.innerHTML = `<span class="text-sm">${itemText} <span class="text-xs text-gray-500 dark:text-gray-400">($${formatNumber(roundPrice(pPrice))} ${priceText})</span></span><div class="flex-shrink-0">${controlsHTML}</div>`;
                    } else {
                        const priceDetail = pPrice > 0 ? `<span class="text-xs text-gray-500 dark:text-gray-400">($${formatNumber(pPrice)}/kg)</span>` : '';
                        li.innerHTML = `<span class="text-sm">${itemText} ${priceDetail}</span><div class="flex-shrink-0">${removeBtnHTML}</div>`;
                    }
                }
                list.appendChild(li);
            });
            }
            list.querySelectorAll('.debtor-adjust-qty').forEach(b => b.addEventListener('click', (e) => { const id = e.currentTarget.dataset.id; const amount = parseInt(e.currentTarget.dataset.amount); adjustDebtorItemQuantity(id, amount); e.stopPropagation(); }));
            list.querySelectorAll('.debtor-remove-item').forEach(b => b.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = e.currentTarget.dataset.id;
                const itemToRemove = currentDebtorData.items.find(it => it.id === id);
                if (!itemToRemove) return;
                const product = localInventory.find(p => p.id === itemToRemove.productId);
                const productName = product ? product.name : (itemToRemove.name || 'Item borrado');
                const text = itemToRemove.productId === 'summary-item' || itemToRemove.productId === CUMULATIVE_DEBT_ID ? `${productName}: $${formatNumber(itemToRemove.quantity)}` : `${itemToRemove.quantity}${itemToRemove.type === 'Unidad' ? 'x' : 'gr'} ${productName}`;
                const conf = await showModal("Confirmar Borrado", `¿Seguro que quieres borrar "${text}"?`);
                if (conf) {
                    if (itemToRemove.saleRecordId) {
                        const itemDate = getYearMonthDay(new Date(itemToRemove.addedAt));
                        if (dailyEarnings[itemDate] && dailyEarnings[itemDate].debtorSales) {
                            dailyEarnings[itemDate].debtorSales = dailyEarnings[itemDate].debtorSales.filter(s => s.id !== itemToRemove.saleRecordId);
                            saveDailyEarnings();
                            if (document.getElementById('view-verduleria').offsetParent !== null) renderVerduleriaSummary(getYearMonth(currentFinanceDate));
                            showToast("Ítem borrado de la cuenta y del resumen.");
                        }
                    } else { showToast("Ítem borrado de la cuenta."); }
                    currentDebtorData.items = currentDebtorData.items.filter(it => it.id !== id);
                    saveDebtors();
                    renderDebtorItemList();
                    calculateDebtorTotal();
                }
            }));
            renderSavedDebts();
        }
        function renderSavedDebts() {
            const container = document.getElementById('saved-debts-section');
            container.innerHTML = '';
            if (!currentDebtorData || !currentDebtorData.savedDebts || currentDebtorData.savedDebts.length === 0) return;

            const title = document.createElement('h4');
            title.className = 'text-lg font-semibold mb-3';
            title.textContent = 'Deudas Guardadas';
            container.appendChild(title);

            currentDebtorData.savedDebts.forEach(savedDebt => {
                const debtBox = document.createElement('div');
                debtBox.className = 'bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4';
                let itemsHTML = '';
                savedDebt.items.forEach(item => {
                    const product = localInventory.find(p => p.id === item.productId);
                    const pName = product ? product.name : (item.name || 'Item borrado');
                    const text = item.productId === 'summary-item' || item.productId === CUMULATIVE_DEBT_ID ? `${pName}: $${formatNumber(item.quantity)}` : `${item.quantity}${item.type === 'Unidad' ? 'x' : 'gr'} ${pName}`;
                    itemsHTML += `<li class="text-sm">${text}</li>`;
                });

                const savedDebtTotal = calculateDebtorTotal(savedDebt.items);
                const finalTotal = savedDebtTotal - (savedDebt.saldoFavor || 0);

                debtBox.innerHTML = `
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h5 class="font-semibold">${savedDebt.name}</h5>
                            <span class="font-bold text-red-500 dark:text-red-400">$${formatNumber(finalTotal)}</span>
                        </div>
                        <button class="delete-saved-debt-btn text-red-500 hover:text-red-700 delete-list-item-btn" data-id="${savedDebt.id}" title="Borrar esta deuda guardada">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                        </button>
                    </div>
                    <ul class="list-disc list-inside pl-2 mb-3">${itemsHTML}</ul>
                    ${savedDebt.saldoFavor > 0 ? `<div class="text-sm text-green-600 dark:text-green-400 mb-2">Saldo a favor: $${formatNumber(savedDebt.saldoFavor)}</div>` : ''}
                    <button class="pay-saved-debt-btn w-full text-sm bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-lg transition-colors mt-2" data-id="${savedDebt.id}">Pagarla</button>
                `;
                container.appendChild(debtBox);
            });

            container.querySelectorAll('.pay-saved-debt-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const debtId = e.currentTarget.dataset.id;
                    showSavedDebtPaymentModal(debtId);
                });
            });
            container.querySelectorAll('.delete-saved-debt-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const debtId = e.currentTarget.dataset.id;
                    if (!currentDebtorData) return;
                    const debtIndex = currentDebtorData.savedDebts.findIndex(d => d.id === debtId);
                    if (debtIndex === -1) return;

                    const confirmed = await showModal("Confirmar Borrado", `¿Estás seguro de que quieres borrar esta deuda guardada? Esta acción no se puede deshacer.`);
                    if (confirmed) {
                        currentDebtorData.savedDebts.splice(debtIndex, 1);
                        saveDebtors();
                        renderDebtorItemList(); // Esto redibuja la lista de deudas guardadas
                        calculateDebtorTotal(); // Recalcula el total del deudor
                        showToast("Deuda guardada eliminada.");
                    }
                });
            });
        }
        function calculateDebtorTotal(items = null) {
            if (!currentDebtorData && !items) { document.getElementById('debtor-total-price').textContent = "$0"; return 0; } 
            let total = 0;
            const itemsToCalculate = items || currentDebtorData.items;
            itemsToCalculate.forEach(item => {
                if (item.productId === 'summary-item' || item.productId === CUMULATIVE_DEBT_ID) {
                    total += item.quantity;
                } else {
                    const product = localInventory.find(p => p.id === item.productId);
                    if (product) {
                        const effectivePrice = Math.max(item.lockedPrice || 0, product.price);
                        if (item.type === 'Unidad') { total += effectivePrice * item.quantity; }
                        else if (item.type === 'Peso') { total += (effectivePrice / 1000) * item.quantity; }
                    }
                }
            });
           
            if (!items) {
                const saldoContainer = document.getElementById('debtor-saldo-favor-container'), saldoEl = document.getElementById('debtor-saldo-favor-amount');
                let finalTotal = total;
                if (currentDebtorData.saldoFavor > 0.01) {
                    finalTotal -= currentDebtorData.saldoFavor;
                    saldoEl.textContent = `-$${formatNumber(currentDebtorData.saldoFavor)}`;
                    saldoContainer.classList.remove('hidden');
                } else {
                    saldoContainer.classList.add('hidden');
                }
                const roundedTotal = roundPrice(finalTotal);
                document.getElementById('debtor-total-price').textContent = `$${formatNumber(roundedTotal)}`;
                return roundedTotal;
            }
           
            return roundPrice(total);
        }
        function saveCurrentDebt() {
            if (!currentDebtorData || currentDebtorData.items.length === 0) { showToast("La cuenta principal está vacía, no hay nada que guardar.", true); return; }
            const newSavedDebt = { id: generateId(), name: `Deuda guardada el ${new Date().toLocaleDateString('es-AR')}`, items: currentDebtorData.items, saldoFavor: 0 };
            if (!currentDebtorData.savedDebts) currentDebtorData.savedDebts = [];
            currentDebtorData.savedDebts.push(newSavedDebt);
            currentDebtorData.items = [];
            renderDebtorItemList();
            calculateDebtorTotal();
            saveDebtors();
            showToast("La deuda actual ha sido guardada.");
        }
        async function clearSaldoFavor() {
            if (!currentDebtorData || !(currentDebtorData.saldoFavor > 0)) return;
            const confirmed = await showModal("Confirmar Borrado", `¿Desea borrar el saldo a favor de $${formatNumber(currentDebtorData.saldoFavor)}?`);
            if (!confirmed) return;
            currentDebtorData.saldoFavor = 0; 
            saveDebtors(); renderDebtorItemList(); calculateDebtorTotal(); showToast("Saldo a favor borrado.");
        }
        function showDebtorPaymentModal() {
            if (!currentDebtorData) { showToast("Seleccione un deudor.", true); return; }
            const totalDebt = calculateDebtorTotal();
            if (totalDebt <= 0) { showToast("La cuenta no tiene deuda para saldar.", true); return; }
            openGenericPaymentModal(totalDebt, (paymentAmount, paymentMethod) => {
                processDebtorPayment(currentDebtorData, paymentAmount, paymentMethod); // Esto ya guarda y actualiza totales.
                renderDebtorItemList();
                calculateDebtorTotal();
            });
        }
        function showSavedDebtPaymentModal(debtId) {
            if (!currentDebtorData) return;
            const debtIndex = currentDebtorData.savedDebts.findIndex(d => d.id === debtId);
            if (debtIndex === -1) return;
            const savedDebt = currentDebtorData.savedDebts[debtIndex];
            const debtItemsTotal = calculateDebtorTotal(savedDebt.items);
            const totalDebt = debtItemsTotal - (savedDebt.saldoFavor || 0);
            if (totalDebt <= 0) { showToast("Esta deuda guardada no tiene monto para pagar.", true); return; }

            openGenericPaymentModal(totalDebt, (paymentAmount, paymentMethod) => {
                processDebtorPayment(savedDebt, paymentAmount, paymentMethod);
                if (savedDebt.items.length === 0) {
                    currentDebtorData.savedDebts.splice(debtIndex, 1);
                    currentDebtorData.saldoFavor = (currentDebtorData.saldoFavor || 0) + (savedDebt.saldoFavor || 0);
                }
                renderDebtorItemList();
                calculateDebtorTotal();
                saveDebtors(); // Guardar cambios después de la operación.
            });
        }
        function getPaymentMethodFromUI(containerId) { 
            const container = document.getElementById(containerId);
            const activeButton = container.querySelector('.payment-method-btn.type-btn-active');
            return activeButton ? activeButton.dataset.method : 'Efectivo';
        }
        function openGenericPaymentModal(totalDebt, onConfirm) {
            const modal = document.getElementById('debtor-payment-modal');
            document.getElementById('debtor-payment-total-debt').textContent = `$${formatNumber(totalDebt)}`;
            const amountInput = document.getElementById('debtor-payment-amount-input');
            amountInput.value = totalDebt;

            setPaymentMethodUI('debtor-payment-methods', 'Efectivo');
            const paymentMethodHandler = (e) => {
                const btn = e.target.closest('.payment-method-btn');
                if (!btn) return;
                setPaymentMethodUI('debtor-payment-methods', btn.dataset.method);
            };
            document.getElementById('debtor-payment-methods').addEventListener('click', paymentMethodHandler);

            const confirmHandler = () => {
                const paymentAmount = parseFloat(amountInput.value);
                if (isNaN(paymentAmount) || paymentAmount <= 0) { 
                    showToast("Monto de pago inválido.", true); 
                } else { 
                    onConfirm(paymentAmount, getPaymentMethodFromUI('debtor-payment-methods')); 
                    cleanup();
                }
            };
            const cancelHandler = () => {
                cleanup();
            };

            const cleanup = () => {
                document.getElementById('debtor-payment-methods').removeEventListener('click', paymentMethodHandler);
                document.getElementById('debtor-payment-confirm-btn').onclick = null;
                document.getElementById('debtor-payment-cancel-btn').onclick = null;
                modal.classList.add('hidden');
            };

            document.getElementById('debtor-payment-confirm-btn').onclick = confirmHandler;
            document.getElementById('debtor-payment-cancel-btn').onclick = cancelHandler;
            modal.classList.remove('hidden');
        }
        function processDebtorPayment(debtObject, paymentAmount, paymentMethod) {
            const todayStr = getYearMonthDay(new Date());
            if (!dailyEarnings[todayStr]) dailyEarnings[todayStr] = {};
            if (!dailyEarnings[todayStr].debtorPayments) dailyEarnings[todayStr].debtorPayments = []; 
            
            dailyEarnings[todayStr].debtorPayments.push({ id: generateId(), amount: paymentAmount, timestamp: new Date().toISOString(), paymentMethod: paymentMethod });
            saveDailyEarnings();
            showToast(`Pago de $${formatNumber(paymentAmount)} registrado.`);

            let availablePayment = paymentAmount + (debtObject.saldoFavor || 0);

            let cumulativeDebtItem = debtObject.items.find(i => i.productId === CUMULATIVE_DEBT_ID);
            if (cumulativeDebtItem && availablePayment > 0) {
                if (availablePayment >= cumulativeDebtItem.quantity) {
                    availablePayment -= cumulativeDebtItem.quantity;
                    debtObject.items = debtObject.items.filter(i => i.productId !== CUMULATIVE_DEBT_ID);
                } else {
                    cumulativeDebtItem.quantity -= availablePayment;
                    availablePayment = 0;
                }
            }

            let payableItems = debtObject.items.map(item => {
                const product = localInventory.find(p => p.id === item.productId);
                const price = (item.productId === 'summary-item') ? item.quantity : (product ? (item.type === 'Unidad' ? product.price * item.quantity : (product.price / 1000) * item.quantity) : 0);
                return { ...item, calculatedPrice: roundPrice(price) };
            }).filter(item => item.calculatedPrice >= 0 && item.productId !== CUMULATIVE_DEBT_ID).sort((a, b) => b.calculatedPrice - a.calculatedPrice);

            const paidItemIds = new Set();
            for (const item of payableItems) {
                if (availablePayment < 0.01 && item.calculatedPrice > 0) break;
                const originalItem = debtObject.items.find(i => i.id === item.id);
                if (!originalItem) continue;

                if (availablePayment >= item.calculatedPrice) {
                    availablePayment -= item.calculatedPrice;
                    paidItemIds.add(item.id);
                } else {
                    const product = localInventory.find(p => p.id === originalItem.productId);
                    if (originalItem.productId === 'summary-item') {
                        originalItem.quantity -= availablePayment;
                        availablePayment = 0;
                    } else if (product && originalItem.type === 'Unidad' && originalItem.quantity > 1) {
                        const unitPrice = roundPrice(product.price);
                        if (unitPrice > 0) {
                            const unitsToPay = Math.floor(availablePayment / unitPrice);
                            if (unitsToPay > 0) {
                                availablePayment -= (unitsToPay * unitPrice);
                                originalItem.quantity -= unitsToPay;
                            }
                        }
                    }
                }
            }
            debtObject.items = debtObject.items.filter(i => !paidItemIds.has(i.id));
            debtObject.saldoFavor = availablePayment;
            
            if (debtObject.history) {
                debtObject.history.push({ type: 'payment', date: new Date().toISOString(), amount: paymentAmount });
            }
            saveDebtors(); // Guardar y luego actualizar el total general.
            calculateAllDebtorsTotal();
        }
        function calculateAllDebtorsTotal() {
            let totalDebtOfAll = 0;
            currentDebtors.forEach(debtor => {
                let singleDebtorTotal = 0;
                // Sumar items de la cuenta principal
                debtor.items.forEach(item => {
                    const product = localInventory.find(p => p.id === item.productId);
                    if (item.productId === 'summary-item' || item.productId === CUMULATIVE_DEBT_ID) { singleDebtorTotal += item.quantity; }
                    else if (product) { singleDebtorTotal += item.type === 'Unidad' ? product.price * item.quantity : (product.price / 1000) * item.quantity; }
                });
                // Sumar deudas guardadas
                (debtor.savedDebts || []).forEach(savedDebt => { singleDebtorTotal += calculateDebtorTotal(savedDebt.items) - (savedDebt.saldoFavor || 0); });
                totalDebtOfAll += (singleDebtorTotal - (debtor.saldoFavor || 0));
            }); 
            // Asegurarse de que el total no sea negativo si hay más saldo a favor que deuda.
            totalDebtOfAll = Math.max(0, totalDebtOfAll);
            document.getElementById('all-debtors-total').textContent = `$${formatNumber(roundPrice(totalDebtOfAll))}`;
        }

