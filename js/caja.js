// =====================================================================
// Lo de Mari ERP - Turnos de Caja y Arqueo / Cierre
// =====================================================================

        function setupCierreCaja() {
            document.getElementById('record-manana').addEventListener('click', () => recordEarnings('manana'));
            document.getElementById('record-tarde').addEventListener('click', () => recordEarnings('tarde'));
            updateCierreCajaView();
        }
        function updateCierreCajaView() {
            const todayStr = getYearMonthDay(new Date());
            const earningsToday = dailyEarnings[todayStr] || { pendingSales: [] };
            const pendingSales = earningsToday.pendingSales || [];

            const lists = {
                Efectivo: document.getElementById('cierre-list-efectivo'),
                Transferencia: document.getElementById('cierre-list-transferencia'),
                Posnet: document.getElementById('cierre-list-posnet')
            };
            const subtotals = { Efectivo: 0, Transferencia: 0, Posnet: 0 };
            Object.values(lists).forEach(list => list.innerHTML = '');

            pendingSales.forEach(sale => {
                const method = sale.paymentMethod || 'Efectivo';
                subtotals[method] += sale.amount;
                const listEl = lists[method];
                if (listEl) {
                    const saleTime = new Date(sale.timestamp);
                    const timeString = `${String(saleTime.getHours()).padStart(2, '0')}:${String(saleTime.getMinutes()).padStart(2, '0')}`;
                    const li = document.createElement('li');
                    li.className = "flex justify-between items-center";
                    li.innerHTML = `<span><span class="font-medium">$${formatNumber(sale.amount)}</span> <span class="text-xs text-gray-500">(${timeString}hs)</span></span>
                        <div class="space-x-2">
                            <button class="edit-pending-sale-btn text-blue-500 hover:text-blue-700 text-sm" data-id="${sale.id}">Editar</button>
                            <button class="delete-pending-sale-btn text-red-500 hover:text-red-700 text-sm" data-id="${sale.id}">Borrar</button>
                        </div>`;
                    listEl.appendChild(li);
                }
            });

            document.getElementById('cierre-subtotal-efectivo').textContent = `$${formatNumber(subtotals.Efectivo)}`;
            document.getElementById('cierre-subtotal-transferencia').textContent = `$${formatNumber(subtotals.Transferencia)}`;
            document.getElementById('cierre-subtotal-posnet-bruto').textContent = `$${formatNumber(subtotals.Posnet)}`;
            const posnetDescuento = subtotals.Posnet * 0.04;
            const posnetNeto = subtotals.Posnet - posnetDescuento;
            document.getElementById('cierre-subtotal-posnet-descuento').textContent = `-$${formatNumber(posnetDescuento)}`;
            document.getElementById('cierre-subtotal-posnet-neto').textContent = `$${formatNumber(roundPrice(posnetNeto))}`;

            Object.values(lists).forEach(listEl => {
                if (listEl.innerHTML === '') {
                    listEl.innerHTML = '<li class="text-center text-gray-500 dark:text-gray-400 italic text-xs">Sin ventas.</li>';
                }
            });

            document.querySelectorAll('.edit-pending-sale-btn').forEach(btn => btn.addEventListener('click', (e) => editPendingSale(e.currentTarget.dataset.id)));
            document.querySelectorAll('.delete-pending-sale-btn').forEach(btn => btn.addEventListener('click', (e) => deletePendingSale(e.currentTarget.dataset.id)));

            const totalPending = subtotals.Efectivo + subtotals.Transferencia + roundPrice(posnetNeto);
            document.getElementById('cierre-total-pending').textContent = `$${formatNumber(totalPending)}`;
        }
        async function editPendingSale(saleId) {
            const todayStr = getYearMonthDay(new Date());
            const sale = dailyEarnings[todayStr]?.pendingSales.find(s => s.id === saleId);
            if (!sale) return;

            const newAmountStr = prompt(`Editar monto de la venta (actual: $${formatNumber(sale.amount)}):`, sale.amount);
            if (newAmountStr === null) return;

            const newAmount = parseFloat(newAmountStr);
            if (isNaN(newAmount) || newAmount < 0) { showToast("Monto inválido.", true); return; }

            sale.amount = roundPrice(newAmount); 
            saveDailyEarnings();
            updateCierreCajaView();
            showToast("Monto de venta actualizado.");
        }
        async function deletePendingSale(saleId) {
            const todayStr = getYearMonthDay(new Date());
            if (!dailyEarnings[todayStr]?.pendingSales) return;

            const conf = await showModal("Confirmar Borrado", "¿Seguro que quieres borrar esta entrada de venta?");
            if (conf) {
                dailyEarnings[todayStr].pendingSales = dailyEarnings[todayStr].pendingSales.filter(s => s.id !== saleId);
                saveDailyEarnings();
                updateCierreCajaView();
                showToast("Entrada de venta borrada."); 
            }
        }
        function recordEarnings(shift) {
            const todayStr = getYearMonthDay(new Date());
            const pendingSales = dailyEarnings[todayStr]?.pendingSales || [];
            if (pendingSales.length === 0) { showToast("No hay ventas pendientes para registrar.", true); return; }

            if (!dailyEarnings[todayStr]) dailyEarnings[todayStr] = {};
            if (typeof dailyEarnings[todayStr][shift] !== 'object' || dailyEarnings[todayStr][shift] === null) {
                dailyEarnings[todayStr][shift] = { total: 0, Efectivo: 0, Transferencia: 0, Posnet: 0, items: [] };
            }

            let totalToRecord = 0;
            let allItemsFromSales = [];
            const paymentMethodTotals = { Efectivo: 0, Transferencia: 0, Posnet: 0 };

            pendingSales.forEach(sale => {
                const method = sale.paymentMethod || 'Efectivo';
                let amountToRecord = sale.amount;
                if (method === 'Posnet') {
                    amountToRecord *= 0.96;
                }
                totalToRecord += amountToRecord;
                paymentMethodTotals[method] += amountToRecord;
                if (sale.items) {
                    allItemsFromSales.push(...sale.items);
                }
            });

            const currentShiftData = dailyEarnings[todayStr][shift];
            currentShiftData.total = (currentShiftData.total || 0) + totalToRecord;
            currentShiftData.Efectivo = (currentShiftData.Efectivo || 0) + paymentMethodTotals.Efectivo;
            currentShiftData.Transferencia = (currentShiftData.Transferencia || 0) + paymentMethodTotals.Transferencia;
            currentShiftData.Posnet = (currentShiftData.Posnet || 0) + paymentMethodTotals.Posnet;
            currentShiftData.items = (currentShiftData.items || []).concat(allItemsFromSales);
            
            dailyEarnings[todayStr].pendingSales = [];
            saveDailyEarnings();
            showToast(`Ganancia ${shift} ($${formatNumber(totalToRecord)}) registrada.`);
            updateCierreCajaView();
        }

