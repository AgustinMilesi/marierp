// =====================================================================
// Lo de Mari ERP - Punto de Venta (POS), Carrito y Cobro Rápido
// =====================================================================

        function setPaymentMethodUI(containerOrId, selectedMethod) {
            const container = typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
            if (!container) return;
            const buttons = container.querySelectorAll('.payment-method-btn');
            buttons.forEach(btn => {
                if (btn.dataset.method === selectedMethod) {
                    btn.classList.add('type-btn-active');
                    btn.classList.remove('type-btn-inactive');
                } else {
                    btn.classList.remove('type-btn-active');
                    btn.classList.add('type-btn-inactive');
                }
            });
        }

        function setupPOS() { /* This function's content has been integrated or is handled by renderSaleList now */ }

        function addPOSToSale(saleIndex, productId = null, quantity = null, saleType = null) {
            const isScan = productId !== null;
            const viewContainer = document.getElementById('view-vender');
            if (!viewContainer) return;

            const prodSelect = viewContainer.querySelector('.pos-product');
            const quantInput = viewContainer.querySelector('.pos-quantity');
            const searchInput = viewContainer.querySelector('.pos-search');

            const prodId = isScan ? productId : (prodSelect ? prodSelect.value : '');
            let qty = isScan ? quantity : (quantInput ? parseFloat(quantInput.value) : 0);
            
            if (!prodId) { showToast("Seleccione un producto.", true); return; }
            if (isNaN(qty) || qty <= 0) { showToast("Cantidad inválida.", true); return; } 
            
            const product = localInventory.find(p => p.id === prodId); 
            if (!product) { showToast("Producto no encontrado.", true); return; } 
            
            let type = product.type;

            if (isScan) {
                type = saleType;
            } else if (prodSelect.options[prodSelect.selectedIndex]) { // This part seems redundant now
                const selectedOption = prodSelect.options[prodSelect.selectedIndex];
                type = selectedOption?.dataset.type === 'Kilo' ? 'Peso' : 'Unidad';
            }

            if (!isScan) {
                if (product.type !== 'Kilo' && type === 'Peso') { showToast("Este producto se vende por unidad.", true); return; } 
                if (product.type === 'Kilo' && type === 'Unidad') { showToast("Este producto se vende por peso.", true); return; } 
            }
            
            const activeSale = posSales[saleIndex]; // Use saleIndex
            if (product.type === 'Unidad') { 
                qty = Math.floor(qty); 
                const existingItem = activeSale.items.find(i => i.productId === prodId && i.type === 'Unidad'); 
                if (existingItem) { 
                    existingItem.quantity += qty; 
                    existingItem.price = roundPrice(product.price * existingItem.quantity); 
                } else { 
                    activeSale.items.push({ id: generateId(), productId: product.id, name: product.name, brand: product.brand, unitPrice: product.price, quantity: qty, type: 'Unidad', price: roundPrice(product.price * qty) }); 
                } 
            } else {
                const pricePerGram = product.price / 1000; 
                const price = roundPrice(pricePerGram * qty); 
                activeSale.items.push({ id: generateId(), productId: product.id, name: product.name, brand: product.brand, unitPrice: pricePerGram, quantity: qty, type: type, price: price }); 
            } 
            
            savePosSales(); 
            renderSaleList();
            updateSaleTotal(saleIndex);

            if (prodSelect) prodSelect.value = '';
            if (quantInput) quantInput.value = '1';
            if (searchInput) {
                searchInput.value = '';
                updateProductSelects('', 'pos');
            }
        }

        function renderSaleList() {
            const col1 = document.getElementById('pos-col-1');
            const col2 = document.getElementById('pos-col-2');
            const template = document.getElementById('pos-order-template');
            if (!col1 || !col2 || !template || col1.offsetParent === null) return;
            
            // Render Tabs
            const tabsContainer = document.getElementById('pos-tabs');
            if (tabsContainer) {
                tabsContainer.innerHTML = '';
                posSales.forEach((_, saleIndex) => {
                    const tab = document.createElement('button');
                    tab.className = `pos-tab-btn px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full transition-all duration-200 cursor-pointer`;
                    if (saleIndex === activePosSaleIndex) {
                        tab.classList.add('bg-[#2b413c]', 'text-white', 'shadow-sm');
                    } else {
                        tab.classList.add('text-[#5e7770]', 'hover:text-[#253a35]', 'hover:bg-white/60');
                    }
                    tab.textContent = `Pedido ${saleIndex + 1}`;
                    tab.dataset.index = saleIndex;
                    tab.addEventListener('click', () => {
                        activePosSaleIndex = saleIndex;
                        localStorage.setItem('loDeMari_activePosSaleIndex', saleIndex);
                        renderSaleList();
                    });
                    tabsContainer.appendChild(tab);
                });
            }

            // Render Active Sale Card
            col1.innerHTML = '';
            col2.innerHTML = '';

            const mainContainer = document.querySelector('#view-vender .pos-order-card');
            if (mainContainer) mainContainer.dataset.index = activePosSaleIndex;

            const sale = posSales[activePosSaleIndex];
            if (sale) {
                const card = template.content.cloneNode(true).firstElementChild;
                card.dataset.index = activePosSaleIndex;
                const listEl = card.querySelector('.pos-item-list');

                sale.items.forEach((item, index) => {
                        const li = document.createElement('li');
                        li.className = "flex items-center bg-gray-50 dark:bg-gray-700/50 p-1 rounded-md text-sm";
                        const removeBtnHTML = `<button class="pos-remove-item text-red-500 hover:text-red-700 opacity-50 hover:opacity-100" data-id="${item.id}"><svg class="h-4 w-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>`;
                        let controlsHTML = (item.type === 'Unidad') ? `
                            <div class="flex items-center space-x-1.5">
                                <button class="pos-adjust-qty text-blue-500" data-id="${item.id}" data-amount="-1"><svg class="h-4 w-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18 12H6" /></svg></button>
                                <span class="font-medium w-6 text-center">${item.quantity}x</span>
                                <button class="pos-adjust-qty text-blue-500" data-id="${item.id}" data-amount="1"><svg class="h-4 w-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></button>
                                <div class="border-l border-gray-300 dark:border-gray-600 h-5 mx-1"></div>
                                ${removeBtnHTML}
                            </div>` : removeBtnHTML;
                        const brandText = item.brand ? `<span class="text-xs text-gray-500 dark:text-gray-400">(${item.brand})</span>` : '';
                        li.innerHTML = `
                            <span class="font-medium text-gray-500 dark:text-gray-400 w-5 text-center">${index + 1}.</span>
                            <div class="flex-grow"><p>${item.name} ${brandText}</p><p class="text-xs text-gray-500 dark:text-gray-400">${item.type === 'Peso' ? item.quantity + 'gr' : ''}</p></div>
                            <span class="font-medium mx-2">$${formatNumber(item.price)}</span>
                            <div class="flex-shrink-0">${controlsHTML}</div>`;
                        listEl.appendChild(li);
                });

                if (listEl.children.length === 0) {
                    listEl.innerHTML = `<li class="text-center text-gray-500 dark:text-gray-400 italic text-xs py-4">Pedido vacío</li>`;
                }

                const searchInput = card.querySelector('.pos-search');
                if (searchInput) {
                    searchInput.addEventListener('input', (e) => {
                        updateProductSelects(e.target.value, 'pos');
                        localStorage.setItem(APP_STATE_PREFIX + `pos-search-${activePosSaleIndex}`, e.target.value);
                    });
                }
                const productSelect = card.querySelector('.pos-product');
                productSelect.addEventListener('change', (e) => {
                    const selectedOption = e.target.options[e.target.selectedIndex];
                    const quantityInput = card.querySelector('.pos-quantity');
                    if (selectedOption && selectedOption.dataset.type === 'Kilo') {
                        quantityInput.value = 100;
                    } else {
                        quantityInput.value = 1;
                    }
                });
                card.querySelector('.pos-add-item').addEventListener('click', (e) => { e.stopPropagation(); addPOSToSale(activePosSaleIndex); });
                card.querySelectorAll('.pos-adjust-qty').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); adjustPOSItemQuantity(e.currentTarget.dataset.id, parseInt(e.currentTarget.dataset.amount), activePosSaleIndex); }));
                card.querySelectorAll('.pos-remove-item').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); posSales[activePosSaleIndex].items = posSales[activePosSaleIndex].items.filter(i => i.id !== e.currentTarget.dataset.id); savePosSales(); renderSaleList(); updateSaleTotal(activePosSaleIndex); }));
                card.querySelector('.pos-cobrar-btn').addEventListener('click', (e) => { e.stopPropagation(); confirmSale(activePosSaleIndex); });
                card.querySelector('.pos-pending-btn').addEventListener('click', (e) => { e.stopPropagation(); moveToPending(activePosSaleIndex); });
                card.querySelector('.pos-send-to-debtor').addEventListener('click', (e) => { e.stopPropagation(); sendSaleToDebtor(activePosSaleIndex); });
                card.querySelector('.pos-debtor-select').addEventListener('change', (e) => { posSales[activePosSaleIndex].debtorId = e.target.value; savePosSales(); });
                card.querySelector('.pos-payment-methods').addEventListener('click', (e) => { const btn = e.target.closest('.payment-method-btn'); if (!btn) return; posSales[activePosSaleIndex].paymentMethod = btn.dataset.method; setPaymentMethodUI(e.currentTarget, btn.dataset.method); savePosSales(); });
                
                const searcherCard = card.children[0];
                const itemListCard = card.children[1];
                const actionsCard = card.children[2];

                col1.appendChild(searcherCard);
                col1.appendChild(actionsCard);
                col2.appendChild(itemListCard);

                updateSaleTotal(activePosSaleIndex);
                
                const debtorSelect = actionsCard.querySelector('.pos-debtor-select');
                if (debtorSelect) {
                    debtorSelect.innerHTML = '<option value="">Seleccionar...</option>';
                    currentDebtors.forEach(d => {
                        const opt = document.createElement('option');
                        opt.value = d.id;
                        opt.textContent = d.name;
                        debtorSelect.appendChild(opt);
                    });
                    debtorSelect.value = sale.debtorId || '';
                }

                setPaymentMethodUI(actionsCard.querySelector('.pos-payment-methods'), sale.paymentMethod || 'Efectivo');
                updateProductSelects(searcherCard.querySelector('.pos-search').value || '', 'pos');
            }
        }
        function adjustPOSItemQuantity(itemId, amount, saleIndex) { 
            const activeSaleItems = posSales[saleIndex].items; 
            const item = activeSaleItems.find(it => it.id === itemId); 
            if (!item || item.type !== 'Unidad') return; 
            item.quantity += amount; 
            if (item.quantity <= 0) { 
                posSales[saleIndex].items = activeSaleItems.filter(it => it.id !== itemId); 
            } else { 
                item.price = roundPrice(item.unitPrice * item.quantity); 
            } 
            savePosSales(); 
            renderSaleList(); 
            updateSaleTotal(saleIndex);
        }
        function updateSaleTotal(saleIndex) { 
            const saleToUpdate = posSales[saleIndex];
            if (!saleToUpdate) return 0;
            const total = saleToUpdate.items.reduce((acc, item) => acc + item.price, 0);
            const totalEl = document.querySelector(`#view-vender .pos-total-price`);
            if (totalEl) totalEl.textContent = `$${formatNumber(total)}`;
            return total;
        }
        function clearPosSaleOnly(saleIndex) { 
            posSales[saleIndex] = { items: [], debtorId: '', paymentMethod: 'Efectivo' }; 
            savePosSales(); 
            renderSaleList(); 
            updateSaleTotal(saleIndex); 
        }

        function moveToPending(saleIndex) {
            const sale = posSales[saleIndex];
            const total = updateSaleTotal(saleIndex);
            if (total <= 0) { showToast("El pedido está vacío.", true); return; }
            
            const pendingSale = {
                id: generateId(),
                items: [...sale.items],
                total: total,
                timestamp: new Date().toISOString(),
                debtorId: sale.debtorId,
                paymentMethod: sale.paymentMethod
            };
            
            if (!Array.isArray(pendingPayments)) pendingPayments = [];
            pendingPayments.unshift(pendingSale);
            savePendingPayments();
            clearPosSaleOnly(saleIndex);
            renderPendingSales();
            showToast("Pedido guardado en Pendientes.");
        }

        function renderPendingSales() {
            const container = document.getElementById('pending-sales-section');
            const list = document.getElementById('pending-sales-list');
            if (!container || !list) return;

            list.innerHTML = '';

            if (!Array.isArray(pendingPayments)) pendingPayments = [];
            if (pendingPayments.length === 0) {
                list.innerHTML = '<li class="text-gray-500 dark:text-gray-400 text-center italic text-sm py-4">No hay pagos pendientes.</li>';
                return;
            }

            pendingPayments.forEach(sale => {
                const li = document.createElement('li');
                li.className = "bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg flex justify-between items-center";
                li.innerHTML = `
                    <div>
                        <p class="font-bold text-lg text-yellow-600 dark:text-yellow-500">$${formatNumber(sale.total)}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">${new Date(sale.timestamp).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})} - ${new Date(sale.timestamp).toLocaleDateString('es-AR')}</p>
                        <p class="text-sm text-gray-600 dark:text-gray-300 truncate w-40">${sale.items.map(i => i.name).join(', ')}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button class="resume-pending-btn bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg" data-id="${sale.id}" title="Retomar / Cobrar">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                        <button class="delete-pending-list-btn text-red-500 hover:text-red-700 p-2" data-id="${sale.id}" title="Borrar">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>`;
                list.appendChild(li);
            });

            list.querySelectorAll('.resume-pending-btn').forEach(btn => btn.addEventListener('click', (e) => resumePendingSale(e.currentTarget.dataset.id)));
            list.querySelectorAll('.delete-pending-list-btn').forEach(btn => btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                const conf = await showModal("Confirmar Borrado", "¿Borrar esta venta pendiente?");
                if (conf) {
                    pendingPayments = pendingPayments.filter(p => p.id !== id);
                    savePendingPayments();
                    renderPendingSales();
                    showToast("Venta pendiente borrada.");
                }
            }));
        }

        async function resumePendingSale(id) {
            const index = pendingPayments.findIndex(p => p.id === id);
            if (index === -1) return;
            const pendingSale = pendingPayments[index];
            
            let targetIndex = posSales.findIndex(s => s.items.length === 0);
            if (targetIndex === -1) targetIndex = activePosSaleIndex;
            
            if (posSales[targetIndex].items.length > 0) {
                const conf = await showModal("Pestaña ocupada", "La pestaña actual no está vacía. ¿Sobrescribir con el pedido pendiente?");
                if (!conf) return;
            }
            
            posSales[targetIndex] = {
                items: [...pendingSale.items],
                debtorId: pendingSale.debtorId || '',
                paymentMethod: pendingSale.paymentMethod || 'Efectivo'
            };
            
            activePosSaleIndex = targetIndex;
            localStorage.setItem('loDeMari_activePosSaleIndex', targetIndex);
            
            pendingPayments.splice(index, 1);
            savePendingPayments();
            savePosSales();
            
            renderSaleList();
            renderPendingSales();
            
            document.getElementById('view-vender').scrollIntoView({ behavior: 'smooth' });
            showToast("Pedido retomado.");
        }

        function confirmSale(saleIndex) {
            const activeSale = posSales[saleIndex];
            const totalSaleAmount = updateSaleTotal(saleIndex);
            if (totalSaleAmount <= 0) { showToast("Agregue items a la venta.", true); return; }

            const modal = document.getElementById('split-payment-modal');
            const totalEl = document.getElementById('split-total-amount');
            const remainingEl = document.getElementById('split-remaining');
            const confirmBtn = document.getElementById('split-confirm-btn');
            const remainingLabel = document.getElementById('split-remaining-label');
            const inputs = {
                Efectivo: document.getElementById('split-efectivo'),
                Transferencia: document.getElementById('split-transferencia'),
                Posnet: document.getElementById('split-posnet')
            };
            const toDebtorSection = document.getElementById('split-to-debtor-section');
            const debtorSelect = document.getElementById('split-debtor-select');
            const sendToDebtorBtn = document.getElementById('split-send-to-debtor-btn');

            debtorSelect.innerHTML = '<option value="">Seleccionar deudor...</option>';
            currentDebtors.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.textContent = d.name;
                debtorSelect.appendChild(opt);
            });

            function updateRemaining() {
                const paid = Object.values(inputs).reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
                const difference = paid - totalSaleAmount;
                if (difference >= -0.01) {
                    remainingLabel.textContent = "Vuelto:";
                    remainingEl.textContent = `$${formatNumber(difference)}`;
                    remainingEl.classList.remove('text-red-600', 'dark:text-red-400');
                    remainingEl.classList.add('text-green-600', 'dark:text-green-400');
                } else { 
                    remainingLabel.textContent = "Falta por cubrir:";
                    remainingEl.textContent = `$${formatNumber(Math.abs(difference))}`;
                    remainingEl.classList.remove('text-green-600', 'dark:text-green-400');
                    remainingEl.classList.add('text-red-600', 'dark:text-red-400');
                }

                toDebtorSection.classList.toggle('hidden', difference >= -0.01);
                sendToDebtorBtn.disabled = difference >= -0.01 || debtorSelect.value === '';
                confirmBtn.disabled = difference < -0.01;
            }

            Object.values(inputs).forEach(input => input.value = '');
            
            const currentMethod = activeSale.paymentMethod || 'Efectivo';
            if (inputs[currentMethod]) {
                inputs[currentMethod].value = totalSaleAmount;
            }

            totalEl.textContent = `$${formatNumber(totalSaleAmount)}`;
            debtorSelect.value = '';

            document.querySelectorAll('.split-input').forEach(input => input.oninput = updateRemaining);
            document.getElementById('split-cancel-btn').onclick = () => modal.classList.add('hidden');
            confirmBtn.onclick = () => {
                try {
                    const todayStr = getYearMonthDay(new Date());
                    if (!dailyEarnings[todayStr]) dailyEarnings[todayStr] = { pendingSales: [] };
                    if (!dailyEarnings[todayStr].pendingSales) dailyEarnings[todayStr].pendingSales = [];
                    const items = activeSale.items.map(item => ({ productId: item.productId, price: item.price, quantity: item.quantity, name: item.name, type: item.type }));
                    let finalSaleTotal = 0;
                    const paymentMethodsSummary = {};

                    Object.entries(inputs).forEach(([method, input]) => {
                        let amount = parseFloat(input.value) || 0;
                        if (amount > 0) { 
                            dailyEarnings[todayStr].pendingSales.push({ id: generateId(), amount: amount, timestamp: new Date().toISOString(), items: items, paymentMethod: method }); 
                            finalSaleTotal += amount; 
                            paymentMethodsSummary[method] = amount;
                        }
                    });

                    if (finalSaleTotal > 0) {
                        const historyRecord = { id: generateId(), timestamp: new Date().toISOString(), items: items, totalAmount: finalSaleTotal, paymentMethods: paymentMethodsSummary, type: 'Venta Directa' };
                        salesHistory.unshift(historyRecord);
                        saveSalesHistory();
                    }

                    saveDailyEarnings(); 
                    showToast(`Venta de $${formatNumber(finalSaleTotal)} registrada.`); 
                    clearPosSaleOnly(saleIndex); 
                    updateCierreCajaView(); 
                } catch (e) {
                    console.error("Error al confirmar venta:", e);
                    showToast("Error al registrar venta. Verifique consola.", true);
                }
                modal.classList.add('hidden');
            };
            
            debtorSelect.onchange = updateRemaining;

            sendToDebtorBtn.onclick = () => {
                const debtorId = debtorSelect.value;
                if (!debtorId) { showToast("Seleccione un deudor para enviar el restante.", true); return; }
                const debtor = currentDebtors.find(d => d.id === debtorId);
                if (!debtor) { showToast("Deudor no encontrado.", true); return; }

                const paidAmount = Object.values(inputs).reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0); const remainingDebt = totalSaleAmount - paidAmount; if (paidAmount > 0) { const todayStr = getYearMonthDay(new Date());
                    const paymentMethodsSummary = {};
                    if (!dailyEarnings[todayStr]) dailyEarnings[todayStr] = { pendingSales: [] };
                    Object.entries(inputs).forEach(([method, input]) => {
                        const amount = parseFloat(input.value) || 0;
                        if (amount > 0) { 
                            dailyEarnings[todayStr].pendingSales.push({ id: generateId(), amount: amount, timestamp: new Date().toISOString(), items: [], paymentMethod: method });
                            paymentMethodsSummary[method] = amount;
                        }
                    });
                    saveDailyEarnings();

                    const itemsForHistory = activeSale.items.map(item => ({ productId: item.productId, price: item.price, quantity: item.quantity, name: item.name, type: item.type }));
                    const historyRecord = { id: generateId(), timestamp: new Date().toISOString(), items: itemsForHistory, totalAmount: paidAmount, paymentMethods: paymentMethodsSummary, type: 'Pago Parcial', notes: `Resto $${formatNumber(remainingDebt)} a ${debtor.name}` };
                    salesHistory.unshift(historyRecord);
                    saveSalesHistory();

                    showToast(`Pago parcial de $${formatNumber(paidAmount)} registrado.`);
                }

                let cumulativeDebtItem = debtor.items.find(i => i.productId === CUMULATIVE_DEBT_ID);
                if (cumulativeDebtItem) {
                    cumulativeDebtItem.quantity = roundPrice(cumulativeDebtItem.quantity + remainingDebt);
                } else {
                    debtor.items.push({ id: generateId(), productId: CUMULATIVE_DEBT_ID, name: 'Fiado Acumulado', quantity: roundPrice(remainingDebt), type: 'Unidad', addedAt: new Date().toISOString() });
                }
                saveDebtors(); // Guardar y actualizar el total general.
                calculateAllDebtorsTotal();
                showToast(`$${formatNumber(remainingDebt)} sumado al fiado de ${debtor.name}.`);

                clearPosSaleOnly(saleIndex);
                updateCierreCajaView();
                modal.classList.add('hidden');
            };

            modal.classList.remove('hidden');
            updateRemaining();
        }
        function sendSaleToDebtor(saleIndex) {
            const activeSale = posSales[saleIndex];
            const debtorId = activeSale.debtorId; const totalSaleAmount = updateSaleTotal(saleIndex);

            if (!debtorId) { showToast("Seleccione un deudor.", true); return; }
            if (activeSale.items.length === 0) { showToast("Agregue items a la venta.", true); return; }

            const debtor = currentDebtors.find(d => d.id === debtorId);
            if (!debtor) { showToast("Deudor no encontrado.", true); return; }

            activeSale.items.forEach(item => {
                const product = localInventory.find(p => p.id === item.productId);
                const newItem = { id: generateId(), productId: item.productId, quantity: item.quantity, type: item.type, addedAt: new Date().toISOString(), lockedPrice: product ? product.price : item.price };
                debtor.items.push(newItem);
            });

            const itemsForHistory = activeSale.items.map(item => ({ productId: item.productId, price: item.price, quantity: item.quantity, name: item.name, type: item.type }));
            const historyRecord = { id: generateId(), timestamp: new Date().toISOString(), items: itemsForHistory, totalAmount: totalSaleAmount, paymentMethods: { Deudor: totalSaleAmount }, type: 'Enviado a Deudor', notes: `A cuenta de ${debtor.name}` };
            salesHistory.unshift(historyRecord);

            // Registrar la venta a deudor en las ganancias diarias para el resumen de verdulería
            activeSale.items.forEach(item => {
                const product = localInventory.find(p => p.id === item.productId);
                if (product && product.category === 'Verduleria') {
                    const todayStr = getYearMonthDay(new Date());
                    if (!dailyEarnings[todayStr]) dailyEarnings[todayStr] = { debtorSales: [] };
                    if (!dailyEarnings[todayStr].debtorSales) dailyEarnings[todayStr].debtorSales = [];
                    dailyEarnings[todayStr].debtorSales.push({ id: generateId(), items: [item], debtorId: debtorId, timestamp: new Date().toISOString() });
                }
            });

            saveDailyEarnings();
            saveSalesHistory();
            saveDebtors();
            loadDebtors();
            showToast(`Venta de $${formatNumber(totalSaleAmount)} enviada a la cuenta de ${debtor.name}.`);
            
            if (currentDebtorId === debtorId) {
                renderDebtorItemList(); 
                calculateDebtorTotal();
            }
            clearPosSaleOnly(saleIndex);
        }

