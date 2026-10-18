// =====================================================================
// Lo de Mari ERP - Historial de Movimientos y Auditoría de Ventas
// =====================================================================

        function setupSalesHistory() {
            document.getElementById('historial-filter-today').addEventListener('click', () => renderSalesHistory('today'));
            document.getElementById('historial-filter-week').addEventListener('click', () => renderSalesHistory('week'));
            document.getElementById('historial-filter-month').addEventListener('click', () => renderSalesHistory('month'));
            document.getElementById('historial-filter-year').addEventListener('click', () => renderSalesHistory('year'));
        }
        function renderSalesHistory(filter = 'today') {
            const container = document.getElementById('sales-history-container');
            container.innerHTML = '';

            document.querySelectorAll('.historial-filter-btn').forEach(btn => {
                btn.classList.remove('bg-[#2b413c]', 'text-white', 'shadow-sm', 'bg-blue-100', 'dark:bg-blue-900', 'text-blue-700', 'dark:text-blue-300');
                btn.classList.add('bg-[#f0f5f2]', 'text-[#5e7770]', 'hover:text-[#2b413c]', 'hover:bg-[#e4ede8]');
            });
            const activeBtn = document.getElementById(`historial-filter-${filter}`);
            if (activeBtn) {
                activeBtn.classList.add('bg-[#2b413c]', 'text-white', 'shadow-sm');
                activeBtn.classList.remove('bg-[#f0f5f2]', 'text-[#5e7770]', 'hover:text-[#2b413c]', 'hover:bg-[#e4ede8]');
            }

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            const dayOfWeek = today.getDay() || 7; 
            startOfWeek.setDate(today.getDate() - (dayOfWeek - 1));
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfYear = new Date(now.getFullYear(), 0, 1);

            const filteredSales = salesHistory.filter(sale => {
                const saleDate = new Date(sale.timestamp);
                switch (filter) {
                    case 'week': return saleDate >= startOfWeek;
                    case 'month': return saleDate >= startOfMonth;
                    case 'year': return true;
                    case 'today':
                    default: return saleDate >= today;
                }
            });

            if (filteredSales.length === 0) {
                container.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">No hay ventas en el período seleccionado.</p>';
                return;
            }

            // Build Hierarchy: Year -> Month -> Week -> Day
            const hierarchy = {};

            filteredSales.forEach(sale => {
                const date = new Date(sale.timestamp);
                const year = date.getFullYear();
                const monthIndex = date.getMonth();
                const monthLabel = date.toLocaleDateString('es-AR', { month: 'long' });
                const monthKey = `${year}-${String(monthIndex).padStart(2, '0')}`;

                const dayOfWeek = date.getDay() || 7; 
                const startOfWeek = new Date(date);
                startOfWeek.setDate(date.getDate() - dayOfWeek + 1);
                const firstDayOfMonth = new Date(year, monthIndex, 1);
                if (startOfWeek < firstDayOfMonth) startOfWeek.setTime(firstDayOfMonth.getTime());
                
                const endOfWeek = new Date(date);
                endOfWeek.setDate(date.getDate() + (7 - dayOfWeek));
                const lastDayOfMonth = new Date(year, monthIndex + 1, 0);
                if (endOfWeek > lastDayOfMonth) endOfWeek.setTime(lastDayOfMonth.getTime());

                const weekLabel = `Semana del ${startOfWeek.getDate()} al ${endOfWeek.getDate()}`;
                const weekKey = `${monthKey}-${String(startOfWeek.getDate()).padStart(2, '0')}`;

                const dayLabel = date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric' });
                const dayKey = getYearMonthDay(date);

                if (!hierarchy[year]) hierarchy[year] = { total: 0, months: {} };
                hierarchy[year].total += sale.totalAmount;

                if (!hierarchy[year].months[monthKey]) hierarchy[year].months[monthKey] = { label: monthLabel, total: 0, weeks: {} };
                hierarchy[year].months[monthKey].total += sale.totalAmount;

                if (!hierarchy[year].months[monthKey].weeks[weekKey]) hierarchy[year].months[monthKey].weeks[weekKey] = { label: weekLabel, total: 0, days: {} };
                hierarchy[year].months[monthKey].weeks[weekKey].total += sale.totalAmount;

                if (!hierarchy[year].months[monthKey].weeks[weekKey].days[dayKey]) hierarchy[year].months[monthKey].weeks[weekKey].days[dayKey] = { label: dayLabel, total: 0, sales: [] };
                hierarchy[year].months[monthKey].weeks[weekKey].days[dayKey].total += sale.totalAmount;
                hierarchy[year].months[monthKey].weeks[weekKey].days[dayKey].sales.push(sale);
            });

            const createAccordion = (label, total, contentEl, level) => {
                const wrapper = document.createElement('div');
                const bgColors = ['bg-white border-[#d8e2dc]', 'bg-[#f4f8f6] border-[#e4ede8]', 'bg-white border-[#e4ede8]', 'bg-[#f4f8f6] border-[#e4ede8]'];
                wrapper.className = `mb-2.5 rounded-2xl shadow-sm overflow-hidden border ${bgColors[Math.min(level, 3)]}`;
                
                const header = document.createElement('div');
                header.className = 'flex justify-between items-center p-3.5 cursor-pointer select-none hover:bg-black/5 transition-colors duration-200';
                header.innerHTML = `
                    <div class="flex items-center gap-2.5">
                        <span class="arrow text-[#df9b28] transform transition-transform duration-200">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
                        </span>
                        <span class="font-bold text-[#2b413c] ${level===1?'text-base':'text-sm'}">${label}</span>
                    </div>
                    <span class="font-black text-[#df9b28] text-base">$${formatNumber(total)}</span>`;
                
                contentEl.className = 'hidden p-3 border-t border-[#e4ede8] pl-4 sm:pl-6 space-y-2';
                
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

            const renderDays = (days, parentEl) => {
                Object.keys(days).sort().reverse().forEach(dayKey => {
                    const dayData = days[dayKey];
                    const dayContent = document.createElement('div');
                    dayContent.className = 'space-y-2';
                    dayData.sales.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(sale => {
                    const saleEl = document.createElement('details');
                    saleEl.className = 'bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700';
                    const time = new Date(sale.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                    const paymentMethods = Object.entries(sale.paymentMethods || {}).map(([method, amount]) => `${method}: $${formatNumber(amount)}`).join(', ');
                    const itemsList = sale.items.map(item => `<li class="text-sm text-gray-600 dark:text-gray-300">${item.quantity}${item.type === 'Unidad' ? 'x' : 'gr'} ${item.name} - $${formatNumber(item.price)}</li>`).join('');

                    saleEl.innerHTML = `
                        <summary class="flex justify-between items-center cursor-pointer select-none">
                            <div class="flex items-center gap-3">
                                <span class="arrow text-gray-400 dark:text-gray-500 transform transition-transform duration-200">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                                    </svg>
                                </span>
                                <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                    <span class="font-bold text-base">${time}hs</span>
                                    <span class="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">${sale.type || 'Venta'}</span>
                                </div>
                            </div>
                            <span class="font-bold text-base text-green-600 dark:text-green-400">$${formatNumber(sale.totalAmount)}</span>
                        </summary>
                        <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 pl-7">
                            <p class="text-sm mb-2"><strong>Pagado con:</strong> ${paymentMethods}</p>
                            ${sale.notes ? `<p class="text-sm italic text-purple-500 dark:text-purple-400 mb-2">${sale.notes}</p>` : ''}
                            <ul class="list-disc list-inside space-y-1">${itemsList}</ul>
                        </div>`;
                        dayContent.appendChild(saleEl);
                    });
                    parentEl.appendChild(createAccordion(dayData.label, dayData.total, dayContent, 3));
                });
            };

            const renderWeeks = (weeks, parentEl) => {
                Object.keys(weeks).sort().reverse().forEach(weekKey => {
                    const weekData = weeks[weekKey];
                    const weekContent = document.createElement('div');
                    renderDays(weekData.days, weekContent);
                    parentEl.appendChild(createAccordion(weekData.label, weekData.total, weekContent, 2));
                });
            };

            const renderMonths = (months, parentEl) => {
                Object.keys(months).sort().reverse().forEach(monthKey => {
                    const monthData = months[monthKey];
                    const monthContent = document.createElement('div');
                    renderWeeks(monthData.weeks, monthContent);
                    parentEl.appendChild(createAccordion(monthData.label.charAt(0).toUpperCase() + monthData.label.slice(1), monthData.total, monthContent, 1));
                });
            };

            Object.keys(hierarchy).sort().reverse().forEach(yearKey => {
                const yearData = hierarchy[yearKey];
                if (filter === 'year') {
                    const yearContent = document.createElement('div');
                    renderMonths(yearData.months, yearContent);
                    container.appendChild(createAccordion(yearKey, yearData.total, yearContent, 0));
                } else if (filter === 'month') {
                    Object.values(yearData.months).forEach(m => renderWeeks(m.weeks, container));
                } else if (filter === 'week' || filter === 'today') {
                    Object.values(yearData.months).forEach(m => {
                        Object.values(m.weeks).forEach(w => {
                            renderDays(w.days, container);
                        });
                    });
                }
            });
        }

