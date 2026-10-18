// =====================================================================
// Lo de Mari ERP - Gestión Financiera, Calendario y Verdulería
// =====================================================================

        function setupFinanzas() { 
            document.getElementById('prev-month-finanzas').addEventListener('click', () => changeFinanceMonth(-1)); 
            document.getElementById('next-month-finanzas').addEventListener('click', () => changeFinanceMonth(1)); 
            document.getElementById('prev-month-verduleria').addEventListener('click', () => changeFinanceMonth(-1)); 
            document.getElementById('next-month-verduleria').addEventListener('click', () => changeFinanceMonth(1)); 
            document.getElementById('add-expense-form').addEventListener('submit', (e) => { e.preventDefault(); addExpense(); }); 
            document.getElementById('expense-date').value = getYearMonthDay(new Date()); 
            renderFinanzasView(); 
        }
        function changeFinanceMonth(delta) { currentFinanceDate.setMonth(currentFinanceDate.getMonth() + delta); renderFinanzasView(); }
        function renderFinanzasView() {
            const yearMonth = getYearMonth(currentFinanceDate);
            const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            document.getElementById('month-year-finanzas').textContent = document.getElementById('month-year-verduleria').textContent = `${months[currentFinanceDate.getMonth()]} ${currentFinanceDate.getFullYear()}`;

            const expensesInMonth = Object.entries(allExpenses).filter(([dateKey]) => dateKey.startsWith(yearMonth)).flatMap(([dateKey, expenses]) => expenses.map(exp => ({ ...exp, date: dateKey }))).sort((a, b) => new Date(a.date) - new Date(b.date));
            let totalExpenses = 0;
            const expensesListEl = document.getElementById('summary-expenses-list');
            expensesListEl.innerHTML = '';
            if (expensesInMonth.length === 0) {
                expensesListEl.innerHTML = '<li class="text-gray-500 dark:text-gray-400 italic">No hay gastos registrados.</li>';
            } else {
                expensesInMonth.forEach(exp => {
                    totalExpenses += exp.amount;
                    const li = document.createElement('li');
                    li.className = "flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700 last:border-b-0";
                    const day = exp.date.split('-')[2];
                    const descriptionText = exp.description.charAt(0).toUpperCase() + exp.description.slice(1);
                    li.innerHTML = `<span>${day}/${yearMonth.split('-')[1]} - ${descriptionText}:</span><div class="flex items-center"><span class="font-medium text-red-500 dark:text-red-400 mr-2">$${formatNumber(exp.amount)}</span><button class="delete-expense-btn text-red-500 hover:text-red-700 delete-list-item-btn" data-date="${exp.date}" data-id="${exp.id}"><svg class="h-4 w-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div>`;
                    expensesListEl.appendChild(li);
                });
            }
            document.getElementById('summary-total-expenses').textContent = `-$${formatNumber(totalExpenses)}`;

            const earningsListEl = document.getElementById('summary-daily-earnings-list');
            earningsListEl.innerHTML = '';

            let totalMonthlyDebtorEarnings = 0;
            let totalMonthlySalesEarnings = 0;
            const paymentMethodTotals = { Efectivo: 0, Transferencia: 0, Posnet: 0 };
            const daysInMonth = Object.keys(dailyEarnings).filter(dateKey => dateKey.startsWith(yearMonth)).sort();

            const getShiftDetails = (shiftData) => {
                if (!shiftData) return { total: 0, breakdown: '', payments: {} };
                const total = shiftData.total || 0;
                const parts = [];
                if (shiftData.Efectivo > 0) parts.push(`E: $${formatNumber(shiftData.Efectivo)}`);
                if (shiftData.Transferencia > 0) parts.push(`T: $${formatNumber(shiftData.Transferencia)}`);
                if (shiftData.Posnet > 0) parts.push(`P: $${formatNumber(shiftData.Posnet)}`);
                return { total, breakdown: parts.join(' / '), payments: { Efectivo: shiftData.Efectivo || 0, Transferencia: shiftData.Transferencia || 0, Posnet: shiftData.Posnet || 0 } };
            };

            if (daysInMonth.length === 0) {
                earningsListEl.innerHTML = '<li class="text-gray-500 dark:text-gray-400 italic">No hay ganancias registradas.</li>';
            } else {
                daysInMonth.forEach(dateKey => {
                    const earnings = dailyEarnings[dateKey] || {};
                    const day = dateKey.split('-')[2];

                    const manana = getShiftDetails(earnings.manana);
                    const tarde = getShiftDetails(earnings.tarde);
                    const debtorPaymentsOnDay = (earnings.debtorPayments || []).reduce((sum, p) => sum + p.amount, 0);
                   
                    const totalSalesOnDay = (manana.total || 0) + (tarde.total || 0); // Solo ventas cerradas
                    const totalDia = totalSalesOnDay + debtorPaymentsOnDay;
                    totalMonthlyDebtorEarnings += debtorPaymentsOnDay;
                    totalMonthlySalesEarnings += totalSalesOnDay;

                    paymentMethodTotals.Efectivo += (manana.payments.Efectivo || 0) + (tarde.payments.Efectivo || 0);
                    paymentMethodTotals.Transferencia += (manana.payments.Transferencia || 0) + (tarde.payments.Transferencia || 0);
                    paymentMethodTotals.Posnet += (manana.payments.Posnet || 0) + (tarde.payments.Posnet || 0);
                    
                    (earnings.debtorPayments || []).forEach(p => {
                        const method = p.paymentMethod || 'Efectivo';
                        paymentMethodTotals[method] = (paymentMethodTotals[method] || 0) + p.amount;
                    });

                    let debtorPaymentsBreakdown = (earnings.debtorPayments || []).map(p => 
                        `<p class="text-xs text-blue-500 dark:text-blue-400 ml-2">Cobro Deuda: $${formatNumber(p.amount)} <span class="text-gray-500 dark:text-gray-400">(${p.paymentMethod || 'Efectivo'})</span></p>`
                    ).join('');

                    const li = document.createElement('li');
                    li.className = "flex flex-col items-start py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0";
                    li.innerHTML = `
                        <div class="flex justify-between items-center w-full">
                            <span>Día ${day}: <span class="font-medium text-lg">$${formatNumber(totalDia)}</span></span>
                            <button class="delete-earning-btn text-red-500 hover:text-red-700 delete-list-item-btn" data-date="${dateKey}"><svg class="h-4 w-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        ${manana.breakdown ? `<p class="text-xs text-gray-500 dark:text-gray-400 ml-2">Mañana: ${manana.breakdown}</p>` : ''}
                        ${tarde.breakdown ? `<p class="text-xs text-gray-500 dark:text-gray-400 ml-2">Tarde: ${tarde.breakdown}</p>` : ''}
                        ${debtorPaymentsBreakdown}
                    `;
                    earningsListEl.appendChild(li);
                });
            }

            document.getElementById('summary-total-sales-earnings').textContent = `$${formatNumber(totalMonthlySalesEarnings)}`;
            document.getElementById('summary-total-debtor-earnings').textContent = `$${formatNumber(totalMonthlyDebtorEarnings)}`;
            const netEarnings = totalMonthlySalesEarnings + totalMonthlyDebtorEarnings - totalExpenses;
            document.getElementById('summary-total-net-earnings').textContent = `$${formatNumber(netEarnings)}`;

            expensesListEl.querySelectorAll('.delete-expense-btn').forEach(btn => { btn.addEventListener('click', (e) => { const date = e.currentTarget.dataset.date; const id = e.currentTarget.dataset.id; deleteExpense(date, id); }); });
            earningsListEl.querySelectorAll('.delete-earning-btn').forEach(btn => { btn.addEventListener('click', (e) => { const date = e.currentTarget.dataset.date; deleteDailyEarning(date); }); });

            const isDark = document.documentElement.classList.contains('dark'), txtColor = isDark ? '#FFF' : '#333';
            const ctx = document.getElementById('finance-chart').getContext('2d');
            if (financeChart) { financeChart.destroy(); }
            if (totalMonthlySalesEarnings > 0 || totalMonthlyDebtorEarnings > 0 || totalExpenses > 0) {
                financeChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Ganancias (Ventas)', 'Cobro Deudas', 'Gastos'],
                        datasets: [{
                            label: 'Monto ($)',
                            data: [totalMonthlySalesEarnings, totalMonthlyDebtorEarnings, totalExpenses],
                            backgroundColor: ['rgba(16, 185, 129, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(239, 68, 68, 0.7)'],
                            borderColor: ['#10B981', '#3B82F6', '#EF4444'],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { x: { ticks: { color: txtColor } }, y: { ticks: { color: txtColor } } },
                        plugins: {
                            legend: { display: false },
                            title: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: (context) => `Monto: $${formatNumber(context.parsed.x)}`
                                }
                            }
                        }
                    }
                });
            } else {
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = isDark ? '#9CA3AF' : '#6B7280'; ctx.font = '16px Inter';
                ctx.fillText('Sin datos para el mes', ctx.canvas.width / 2, ctx.canvas.height / 2);
                ctx.restore();
            }

            renderVerduleriaSummary(yearMonth);
        }
        function renderVerduleriaSummary(yearMonth) {
            const summaryList = document.getElementById('verduleria-summary-list');
            const dailyTotalsContainer = document.getElementById('verduleria-daily-totals');
            
            summaryList.innerHTML = '';
            dailyTotalsContainer.innerHTML = '';
            dailyTotalsContainer.classList.add('hidden');

            const createAccordion = (label, total, contentEl, level) => {
                const wrapper = document.createElement('div');
                const bgColors = ['bg-white dark:bg-gray-800', 'bg-gray-50 dark:bg-gray-700/30', 'bg-gray-100 dark:bg-gray-700/50', 'bg-gray-200 dark:bg-gray-700/70'];
                wrapper.className = `mb-2 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 ${bgColors[Math.min(level, 3)]}`;
                
                const header = document.createElement('div');
                header.className = 'flex justify-between items-center p-3 cursor-pointer select-none hover:bg-opacity-80 transition-colors duration-200';
                header.innerHTML = `
                    <div class="flex items-center gap-2">
                        <span class="arrow text-gray-400 dark:text-gray-500 transform transition-transform duration-200">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
                        </span>
                        <span class="font-semibold text-gray-800 dark:text-gray-200 ${level===1?'text-lg':''}">${label}</span>
                    </div>
                    <span class="font-bold text-green-600 dark:text-green-400">$${formatNumber(total)}</span>`;
                
                contentEl.className = 'hidden p-2 border-t border-gray-200 dark:border-gray-700 pl-4';
                
                header.addEventListener('click', (e) => {
                    e.stopPropagation();
                    contentEl.classList.toggle('hidden');
                    const arrow = header.querySelector('.arrow');
                    arrow.style.transform = contentEl.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(90deg)';
                });

                wrapper.appendChild(header);
                wrapper.appendChild(contentEl);
                return wrapper;
            };

            const daysInMonth = Object.keys(dailyEarnings).filter(dateKey => dateKey.startsWith(yearMonth)).sort().reverse();
            const hierarchy = {}; 
            let monthlyTotal = 0;

            daysInMonth.forEach(dateKey => {
                const earnings = dailyEarnings[dateKey] || {};
                const dayItems = [];
                let dayTotal = 0;

                const collectItems = (sourceItems) => {
                    if (!sourceItems) return;
                    sourceItems.forEach(item => {
                        const product = localInventory.find(p => p.id === item.productId);
                        if (product && product.category === 'Verduleria') {
                            const existing = dayItems.find(i => i.productId === item.productId);
                            if (existing) {
                                existing.quantity += item.quantity;
                                existing.price += item.price;
                            } else {
                                dayItems.push({ productId: item.productId, name: product.name, quantity: item.quantity, price: item.price, type: product.type });
                            }
                            dayTotal += item.price;
                        }
                    });
                };

                collectItems(earnings.manana?.items);
                collectItems(earnings.tarde?.items);
                (earnings.debtorSales || []).forEach(s => collectItems(s.items));
                (earnings.pendingSales || []).forEach(s => collectItems(s.items));

                if (dayItems.length > 0) {
                    monthlyTotal += dayTotal;
                    const [y, m, d] = dateKey.split('-').map(Number);
                    const dateObj = new Date(y, m - 1, d);
                    const dayLabel = dateObj.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric' });
                    
                    const dayOfWeek = dateObj.getDay() || 7;
                    const startOfWeek = new Date(dateObj);
                    startOfWeek.setDate(dateObj.getDate() - dayOfWeek + 1);
                    const endOfWeek = new Date(dateObj);
                    endOfWeek.setDate(dateObj.getDate() + (7 - dayOfWeek));
                    
                    const weekKey = `${startOfWeek.toISOString().split('T')[0]}_${endOfWeek.toISOString().split('T')[0]}`;
                    const weekLabel = `Semana del ${startOfWeek.getDate()} al ${endOfWeek.getDate()}`;

                    if (!hierarchy[weekKey]) hierarchy[weekKey] = { label: weekLabel, total: 0, days: {} };
                    hierarchy[weekKey].total += dayTotal;
                    hierarchy[weekKey].days[dateKey] = { label: dayLabel, total: dayTotal, items: dayItems.sort((a, b) => a.name.localeCompare(b.name)) };
                }
            });

            if (Object.keys(hierarchy).length === 0) {
                summaryList.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 italic">No hay ventas de verdulería este mes.</p>';
                return;
            }

            Object.keys(hierarchy).sort().reverse().forEach(weekKey => {
                const weekData = hierarchy[weekKey];
                const weekContent = document.createElement('div');
                
                Object.keys(weekData.days).sort().reverse().forEach(dayKey => {
                    const dayData = weekData.days[dayKey];
                    const dayContent = document.createElement('div');
                    dayContent.className = 'bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700';
                    
                    const ul = document.createElement('ul');
                    ul.className = 'space-y-1';
                    dayData.items.forEach(item => {
                        const li = document.createElement('li');
                        li.className = 'flex justify-between text-sm';
                        const qtyStr = item.type === 'Kilo' ? `${formatNumber(item.quantity)} gr` : `${item.quantity} u.`;
                        li.innerHTML = `<span>${item.name} <span class="text-gray-500 dark:text-gray-400">(${qtyStr})</span></span> <span>$${formatNumber(item.price)}</span>`;
                        ul.appendChild(li);
                    });
                    dayContent.appendChild(ul);

                    weekContent.appendChild(createAccordion(dayData.label, dayData.total, dayContent, 3));
                });

                summaryList.appendChild(createAccordion(weekData.label, weekData.total, weekContent, 2));
            });

            const totalDiv = document.createElement('div');
            totalDiv.className = 'mt-4 pt-4 border-t-2 border-gray-300 dark:border-gray-700 flex justify-between items-center font-bold text-xl';
            totalDiv.innerHTML = `<span>Total del Mes:</span><span class="text-green-600 dark:text-green-400">$${formatNumber(monthlyTotal)}</span>`;
            summaryList.appendChild(totalDiv);
        }
        function addExpense() { 
            const dateInput = document.getElementById('expense-date'), descriptionInput = document.getElementById('expense-description'), amountInput = document.getElementById('expense-amount'); 
            const dateValue = dateInput.value; 
            const description = descriptionInput.value.trim(); 
            const amount = parseFloat(amountInput.value) || 0;
            if (!dateValue) { showToast("Seleccione fecha.", true); return; } if (!description) { showToast("Ingrese una descripción para el gasto.", true); return; } if (amount <= 0) { showToast("Ingrese monto válido.", true); return; } const newExpense = { id: generateId(), description, amount }; if (!allExpenses[dateValue]) { allExpenses[dateValue] = []; } allExpenses[dateValue].push(newExpense); saveExpenses(); renderFinanzasView(); showToast(`Gasto de $${formatNumber(amount)} (${description}) agregado.`); amountInput.value = ''; descriptionInput.value = ''; 
        }
        async function deleteExpense(dateKey, expenseId) { if (!allExpenses[dateKey]) return; const expenseIndex = allExpenses[dateKey].findIndex(exp => exp.id === expenseId); if (expenseIndex === -1) return; const expense = allExpenses[dateKey][expenseIndex]; const conf = await showModal("Confirmar Borrado", `Borrar gasto de $${formatNumber(expense.amount)} (${expense.description}) del ${dateKey}?`); if (conf) { allExpenses[dateKey].splice(expenseIndex, 1); if (allExpenses[dateKey].length === 0) { delete allExpenses[dateKey]; } saveExpenses(); renderFinanzasView(); showToast("Gasto borrado."); } }
        async function deleteDailyEarning(dateKey) {
            if (!dailyEarnings[dateKey]) return;
            const earnings = dailyEarnings[dateKey] || {};
            const getShiftTotal = (shiftData) => (shiftData ? shiftData.total : 0) || 0;
            const totalDia = getShiftTotal(earnings.manana) + getShiftTotal(earnings.tarde) + (earnings.debtorPayments || []).reduce((s, p) => s + p.amount, 0);
            const conf = await showModal("Confirmar Borrado", `Borrar todas las ganancias ($${formatNumber(totalDia)}) del ${dateKey}?`); if (conf) { delete dailyEarnings[dateKey]; saveDailyEarnings(); renderFinanzasView(); showToast(`Ganancias del ${dateKey} borradas.`); }
        }

