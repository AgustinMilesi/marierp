// =====================================================================
// Lo de Mari ERP - Catálogo de Inventario y Precios
// =====================================================================

        function syncDebtorPrices(productId, newPrice) {
            let hasChanges = false;
            currentDebtors.forEach(debtor => {
                const updateItemPrice = (item) => {
                    if (item.productId === productId && newPrice > (item.lockedPrice || 0)) {
                        item.lockedPrice = newPrice;
                        hasChanges = true;
                    }
                };
                // Sincronizar cuenta principal y deudas guardadas simultáneamente
                debtor.items.forEach(updateItemPrice);
                (debtor.savedDebts || []).forEach(sd => (sd.items || []).forEach(updateItemPrice));
            });
            if (hasChanges) saveDebtors(); // Solo guarda si hubo un aumento real
        }


        const InventoryService = {
            init() {
                document.getElementById('product-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.save();
                });
                document.getElementById('product-clear-btn').addEventListener('click', () => this.clearForm());
                document.getElementById('apply-percentage-btn').addEventListener('click', () => this.applyPercentageIncrease());
                this.setupBarcodeHandling();
                this.setupDragAndDrop();
            },
            save() {
                const id = document.getElementById('product-id').value;
                const data = {
                    name: document.getElementById('product-name').value,
                    brand: document.getElementById('product-brand').value || '',
                    size: document.getElementById('product-size').value || '',
                    price: parseFloat(document.getElementById('product-price').value),
                    type: document.getElementById('product-type').value,
                    barcodes: tempBarcodes
                };
                if (isNaN(data.price) || data.price < 0) {
                    showToast("Precio inválido.", true);
                    return;
                }
                data.price = roundPrice(data.price);
                if (id) {
                    const index = localInventory.findIndex(p => p.id === id);
                    if (index !== -1) {
                        const existingCategory = localInventory[index].category;
                        localInventory[index] = { ...localInventory[index], ...data, category: existingCategory };
                        syncDebtorPrices(id, data.price);
                        showToast("Producto actualizado.");
                    }
                } else {
                    data.id = generateId();
                    data.category = 'General';
                    localInventory.push(data);
                    showToast("Producto agregado.");
                }
                saveInventory();
                loadInventory();
                this.render();
                updateProductSelects();
                this.clearForm();
            },
            async delete(id) {
                const product = localInventory.find(p => p.id === id);
                const confirmed = await showModal("Confirmar Borrado", `¿Borrar "${product?.name || 'este producto'}"?`);
                if (confirmed) {
                    localInventory = localInventory.filter(p => p.id !== id);
                    saveInventory();
                    loadInventory();
                    showToast("Producto borrado.");
                    this.render();
                    updateProductSelects();
                }
            },
            edit(id) {
                const product = localInventory.find(p => p.id === id);
                if (product) {
                    document.getElementById('product-id').value = product.id;
                    document.getElementById('product-name').value = product.name;
                    document.getElementById('product-brand').value = product.brand;
                    document.getElementById('product-size').value = product.size || '';
                    document.getElementById('product-price').value = product.price;
                    document.getElementById('product-type').value = product.type;
                    tempBarcodes = [...(product.barcodes || [])];
                    this.renderBarcodeList();
                    document.getElementById('product-save-btn').innerText = 'Actualizar';
                    document.getElementById('product-form').scrollIntoView({ behavior: 'smooth' });
                }
            },
            clearForm() {
                document.getElementById('product-form').reset();
                document.getElementById('product-id').value = '';
                document.getElementById('product-save-btn').innerText = 'Guardar Producto';
                localStorage.removeItem(APP_STATE_PREFIX + 'product-form');
                tempBarcodes = [];
                this.renderBarcodeList();
            },
            render() {
                const filter = document.getElementById('inventory-search')?.value || '';
                const generalList = document.getElementById('inventory-list-general');
                const verduleriaList = document.getElementById('inventory-list-verduleria');
                generalList.innerHTML = '';
                verduleriaList.innerHTML = '';
                const term = filter.trim().toLowerCase();
                const filtered = localInventory.filter(p => p.name.toLowerCase().includes(term) || (p.brand && p.brand.toLowerCase().includes(term)));

                const createItemElement = (p) => {
                    const li = document.createElement('li');
                    li.className = "flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg shadow cursor-grab";
                    li.draggable = true;
                    li.dataset.id = p.id;
                    li.innerHTML = `
                        <div class="flex-grow">
                            <p class="font-medium">${p.name} <span class="text-sm text-gray-500 dark:text-gray-400">${[p.brand, p.size].filter(Boolean).join(' ')}</span></p>
                            <p class="text-sm text-gray-600 dark:text-gray-300">$${formatNumber(p.price)} ${p.type === 'Kilo' ? '<span class="text-xs">/kg</span>' : ''}</p>
                        </div>
                        <div class="flex-shrink-0 space-x-2 ml-2">
                            <button class="edit-btn text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200" data-id="${p.id}">Editar</button>
                            <button class="delete-btn text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200" data-id="${p.id}">Borrar</button>
                        </div>`;
                    li.querySelector('.edit-btn').addEventListener('click', (e) => { e.stopPropagation(); this.edit(p.id); });
                    li.querySelector('.delete-btn').addEventListener('click', (e) => { e.stopPropagation(); this.delete(p.id); });
                    return li;
                };

                filtered.forEach(p => {
                    const itemEl = createItemElement(p);
                    if (p.category === 'Verduleria') {
                        verduleriaList.appendChild(itemEl);
                    } else {
                        generalList.appendChild(itemEl);
                    }
                });

                if (generalList.innerHTML === '') generalList.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 p-4">No hay productos generales.</p>`;
                if (verduleriaList.innerHTML === '') verduleriaList.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 p-4">Arrastra productos aquí.</p>`;
            },
            async applyPercentageIncrease() {
                const percentage = parseFloat(document.getElementById('percentage-increase').value);
                const category = document.getElementById('percentage-category').value;
                if (isNaN(percentage) || percentage <= 0) { showToast("Ingrese un porcentaje de aumento válido.", true); return; }

                const productsToUpdate = localInventory.filter(p => p.category === category);
                if (productsToUpdate.length === 0) { showToast(`No hay productos en la categoría "${category}" para actualizar.`, true); return; }

                const confirmed = await showModal("Confirmar Aumento", `¿Aumentar ${percentage}% a ${productsToUpdate.length} productos de la categoría "${category}"?`);
                if (confirmed) {
                    productsToUpdate.forEach(p => {
                        p.price = roundPrice(p.price * (1 + percentage / 100));
                        syncDebtorPrices(p.id, p.price);
                    });
                    saveInventory();
                    loadInventory();
                    this.render();
                    updateProductSelects();
                    showToast(`Precios de la categoría "${category}" actualizados +${percentage}%.`);
                    document.getElementById('percentage-increase').value = '';
                }
            },
            setupDragAndDrop() {
                const lists = document.querySelectorAll('.inventory-list');
                let draggedItem = null;
                lists.forEach(list => {
                    list.addEventListener('dragstart', e => { draggedItem = e.target; setTimeout(() => e.target.classList.add('dragging'), 0); });
                    list.addEventListener('dragend', e => { if (draggedItem) { draggedItem.classList.remove('dragging'); } draggedItem = null; });
                    list.addEventListener('dragover', e => { e.preventDefault(); });
                    list.addEventListener('drop', e => {
                        e.preventDefault();
                        if (draggedItem && e.currentTarget !== draggedItem.parentNode) {
                            const productId = draggedItem.dataset.id;
                            const product = localInventory.find(p => p.id === productId);
                            if (product) {
                                const newCategory = e.currentTarget.id === 'inventory-list-verduleria' ? 'Verduleria' : 'General';
                                product.category = newCategory;
                                saveInventory();
                                e.currentTarget.appendChild(draggedItem);
                                showToast(`"${product.name}" movido a ${newCategory}.`);
                            }
                        }
                    });
                });
            },
            setupBarcodeHandling() {
                const input = document.getElementById('barcode-input');
                const addBtn = document.getElementById('barcode-add-btn');
                const addBarcode = () => {
                    const code = input.value.trim();
                    if (code && !tempBarcodes.includes(code)) {
                        tempBarcodes.push(code);
                        this.renderBarcodeList();
                    }
                    input.value = '';
                    input.focus();
                };
                input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addBarcode(); } });
                addBtn.addEventListener('click', addBarcode);
            },
            renderBarcodeList() {
                const listEl = document.getElementById('barcode-list');
                listEl.innerHTML = '';
                if (tempBarcodes.length === 0) {
                    listEl.innerHTML = '<li class="text-gray-500 text-sm italic">No hay códigos.</li>';
                    return;
                }
                tempBarcodes.forEach(code => {
                    const li = document.createElement('li');
                    li.className = 'flex justify-between items-center text-sm';
                    li.innerHTML = `<span>${code}</span><button class="text-red-500 font-bold hover:text-red-700 px-2" data-code="${code}">X</button>`;
                    li.querySelector('button').addEventListener('click', (e) => { tempBarcodes = tempBarcodes.filter(c => c !== e.currentTarget.dataset.code); this.renderBarcodeList(); });
                    listEl.appendChild(li);
                });
            }
        };

        function updateProductSelects(filter = '', context = 'all') {
            const posSelect = document.getElementById('pos-product');
            const debtorSelect = document.getElementById('debtor-product');
            const selectsToUpdate = [];
            if (context === 'all' || context === 'pos') selectsToUpdate.push(posSelect);
            if (context === 'all' || context === 'debtor') selectsToUpdate.push(debtorSelect);

            document.querySelectorAll('.pos-product').forEach(s => selectsToUpdate.push(s));

            const term = filter.trim().toLowerCase();
            const filtered = localInventory.filter(p =>
                p.name.toLowerCase().includes(term) ||
                (p.brand && p.brand.toLowerCase().includes(term)) ||
                (p.size && p.size.toLowerCase().includes(term)) ||
                (p.barcodes && p.barcodes.some(barcode => barcode.includes(term)))
            );

            selectsToUpdate.forEach(select => {
                if (!select) return;
                const currentValue = select.value;
                select.innerHTML = '<option value="">Seleccione...</option>';

                if (filtered.length === 0 && term) {
                    select.innerHTML = '<option value="" disabled>No se encontraron productos</option>';
                    return;
                }

                filtered.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    const details = [p.brand, p.size].filter(Boolean).join(' ');
                    opt.textContent = `${p.name} ${details ? `(${details})` : ''} - $${formatNumber(p.price)}${p.type === 'Kilo' ? '/kg' : ''}`;
                    opt.dataset.type = p.type;
                    select.appendChild(opt);
                });

                if (filtered.some(p => p.id === currentValue)) {
                    select.value = currentValue;
                } else if (filtered.length === 1 && term) {
                    select.value = filtered[0].id;
                    select.dispatchEvent(new Event('change'));
                } else {
                    select.value = '';
                }
            });
        }
        function updatePosDebtorSelect() {
            const select = document.getElementById('pos-debtor-select');
            if (!select) return; 
            const currentValue = select.value; 
            select.innerHTML = `<option value="">Seleccionar...</option>`; 
            currentDebtors.forEach(d => { 
                const opt = document.createElement('option'); 
                opt.value = d.id; 
                opt.textContent = d.name; 
                select.appendChild(opt); 
            }); 
            select.value = currentValue;
        }
       
