// --- PLACEHOLDER SVG ---
const PLACEHOLDER_THUMB = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiB2aWV3Qm94PSIwIDAgMTUwIDE1MCI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiMyNzI3MmEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTJweCIgZmlsbD0iIzcxNzE3YSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlNpbiBGb3RvPC90ZXh0Pjwvc3ZnPg==';

const CATEGORIES = [
    'Villa Navideña',
    'Super Bowl',
    'Vaca Loca',
    'Pascua',
    'Halloween',
    'San Patricio',
    'San Valentín',
    'General'
];

const CATEGORY_COLORS = {
    'Villa Navideña': { bg: 'rgba(239, 68, 68, 0.12)', text: '#fca5a5', border: 'rgba(239, 68, 68, 0.28)', icon: 'ac_unit' },
    'Super Bowl': { bg: 'rgba(59, 130, 246, 0.12)', text: '#93c5fd', border: 'rgba(59, 130, 246, 0.28)', icon: 'sports_football' },
    'Vaca Loca': { bg: 'rgba(245, 158, 11, 0.12)', text: '#fcd34d', border: 'rgba(245, 158, 11, 0.28)', icon: 'pets' },
    'Pascua': { bg: 'rgba(168, 85, 247, 0.12)', text: '#d8b4fe', border: 'rgba(168, 85, 247, 0.28)', icon: 'egg' },
    'Halloween': { bg: 'rgba(249, 115, 22, 0.12)', text: '#fdba74', border: 'rgba(249, 115, 22, 0.28)', icon: 'skull' },
    'San Patricio': { bg: 'rgba(16, 185, 129, 0.12)', text: '#6ee7b7', border: 'rgba(16, 185, 129, 0.28)', icon: 'eco' },
    'San Valentín': { bg: 'rgba(236, 72, 153, 0.12)', text: '#f9a8d4', border: 'rgba(236, 72, 153, 0.28)', icon: 'favorite' },
    'General': { bg: 'rgba(161, 161, 170, 0.12)', text: '#d4d4d8', border: 'rgba(161, 161, 170, 0.28)', icon: 'category' }
};

// --- INITIAL DATA (Fallback for local offline preview) ---
const INITIAL_DATA = [
    {
        id: 'SC-1777046300386',
        warehouseId: '8522864',
        name: 'Casco NFL rojo',
        imageId: 'SC-1777046300386_img',
        location: 'SOLULOGIS',
        category: 'Super Bowl',
        dimensions: '120cm x 153cm x 130cm',
        weight: '30 kg',
        quantity: '1 de 2 pzas',
        modelUrl: '',
        dates: { repair: '', workshopReq: '', warehouseRet: '2026-04-24', propertyDue: '' },
        history: [{ type: 'new', person: 'Sistema', date: '2026-04-24T15:58:21.092Z', notes: 'Alta de Inventario' }]
    }
];

// --- APP STATE ---
let STATE = {
    items: [],
    view: 'inventory', // 'inventory' | 'new-item' | 'detail:<id>'
    layout: localStorage.getItem('resguardo_layout') || 'table', // 'table' | 'grid'
    filterCategory: 'ALL',
    filterLocation: 'ALL', // 'ALL' | 'SOLULOGIS' | 'taller' | 'propiedad' | 'CON_ID' | 'SIN_ID'
    searchTerm: ''
};

let renderGeneration = 0;

// --- MAIN CONTROLLER ---
document.addEventListener('DOMContentLoaded', async () => {
    await db.init();
    updateAdminLockUI();

    const saved = await db.getState('app_data');
    if (saved && Array.isArray(saved)) {
        let migrated = false;
        saved.forEach(item => {
            if (item.location === 'solulogics') {
                item.location = 'SOLULOGIS';
                migrated = true;
            }
            if (!item.category) item.category = 'General';
            if (!item.dimensions) item.dimensions = '';
            if (!item.weight) item.weight = '';
            if (!item.quantity) item.quantity = '1 pza';
            if (!item.modelUrl) item.modelUrl = '';
        });
        STATE.items = saved;

        if (migrated) {
            await db.saveState('app_data', STATE.items);
        }
    } else {
        STATE.items = INITIAL_DATA;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    if (viewParam) {
        STATE.view = viewParam;
    }

    setupNavigation();
    setupSearch();
    setupKeyboardShortcuts();
    renderRouter();
});

// --- ROUTER ---
function renderRouter() {
    const content = document.getElementById('content-area');
    const pageTitle = document.getElementById('page-title');
    const pageSub = document.getElementById('page-subtitle');
    const backBtn = document.getElementById('back-nav-btn');
    const viewSwitcher = document.getElementById('header-view-switcher');
    const totalBadge = document.getElementById('nav-total-badge');

    if (totalBadge) totalBadge.textContent = STATE.items.length;
    updateSidebarCategories();
    updateViewButtonsUI();

    document.querySelectorAll('.nav-menu > .nav-group > .nav-item').forEach(b => b.classList.remove('active'));

    if (STATE.view === 'inventory') {
        const invBtn = document.querySelector('[data-view="inventory"]');
        if (invBtn && STATE.layout === 'table') invBtn.classList.add('active');
        const gridNavBtn = document.getElementById('nav-grid-btn');
        if (gridNavBtn && STATE.layout === 'grid') gridNavBtn.classList.add('active');

        pageTitle.textContent = 'Inventario General';
        pageSub.classList.add('hidden');
        if (backBtn) backBtn.classList.add('hidden');
        if (viewSwitcher) viewSwitcher.classList.remove('hidden');
        renderInventory(content);
    } else if (STATE.view === 'new-item') {
        const newBtn = document.querySelector('[data-view="new-item"]');
        if (newBtn) newBtn.classList.add('active');
        pageTitle.textContent = 'Inventario General';
        pageSub.textContent = ' / Registrar Nueva Pieza';
        pageSub.classList.remove('hidden');
        if (backBtn) backBtn.classList.remove('hidden');
        if (viewSwitcher) viewSwitcher.classList.add('hidden');
        renderNewForm(content);
    } else if (STATE.view.startsWith('detail:')) {
        const id = STATE.view.split(':')[1];
        const item = STATE.items.find(i => i.id === id);
        pageTitle.textContent = 'Inventario General';
        pageSub.textContent = item ? ` / ${item.name}` : ' / Detalle de Pieza';
        pageSub.classList.remove('hidden');
        if (backBtn) backBtn.classList.remove('hidden');
        if (viewSwitcher) viewSwitcher.classList.add('hidden');
        renderDetail(content, id);
    }
}

function navigate(view) {
    STATE.view = view;
    renderRouter();
}
window.navigate = navigate;

window.setInventoryLayout = (layout) => {
    STATE.layout = layout;
    localStorage.setItem('resguardo_layout', layout);
    if (STATE.view !== 'inventory') {
        STATE.view = 'inventory';
    }
    renderRouter();
};

function updateViewButtonsUI() {
    const btnTable = document.getElementById('btn-view-table');
    const btnGrid = document.getElementById('btn-view-grid');
    if (btnTable && btnGrid) {
        btnTable.classList.toggle('active', STATE.layout === 'table');
        btnGrid.classList.toggle('active', STATE.layout === 'grid');
    }
}

function updateSidebarCategories() {
    const container = document.getElementById('sidebar-categories');
    if (!container) return;

    const counts = {};
    STATE.items.forEach(i => {
        const cat = i.category || 'General';
        counts[cat] = (counts[cat] || 0) + 1;
    });

    let html = `
        <button class="sidebar-cat-item ${STATE.filterCategory === 'ALL' && STATE.view === 'inventory' ? 'active' : ''}" onclick="window.filterByCategory('ALL')">
            <span class="cat-dot" style="background: var(--primary);"></span>
            <span class="cat-name">Todas las temporadas</span>
            <span class="cat-count">${STATE.items.length}</span>
        </button>
    `;

    Object.keys(counts).sort((a, b) => counts[b] - counts[a]).forEach(cat => {
        const theme = CATEGORY_COLORS[cat] || CATEGORY_COLORS['General'];
        const isActive = STATE.filterCategory === cat && STATE.view === 'inventory';
        html += `
            <button class="sidebar-cat-item ${isActive ? 'active' : ''}" onclick="window.filterByCategory('${escapeHtml(cat)}')">
                <span class="cat-dot" style="background: ${theme.text};"></span>
                <span class="cat-name">${escapeHtml(cat)}</span>
                <span class="cat-count">${counts[cat]}</span>
            </button>
        `;
    });

    container.innerHTML = html;
}

window.filterByCategory = (cat) => {
    STATE.filterCategory = cat;
    if (STATE.view !== 'inventory') {
        STATE.view = 'inventory';
    }
    renderRouter();
};

window.filterByLocation = (loc) => {
    STATE.filterLocation = STATE.filterLocation === loc ? 'ALL' : loc;
    if (STATE.view !== 'inventory') {
        STATE.view = 'inventory';
    }
    renderRouter();
};

window.resetFilters = () => {
    STATE.filterCategory = 'ALL';
    STATE.filterLocation = 'ALL';
    STATE.searchTerm = '';
    const input = document.getElementById('global-search');
    const clearBtn = document.getElementById('clear-search-btn');
    if (input) input.value = '';
    if (clearBtn) clearBtn.classList.add('hidden');
    renderRouter();
};

// --- FILTERING & KPI HELPERS ---
function getFilteredItems() {
    const term = STATE.searchTerm.trim().toLowerCase();

    return STATE.items.filter(item => {
        updateItemLocation(item);

        if (STATE.filterCategory !== 'ALL' && (item.category || 'General') !== STATE.filterCategory) {
            return false;
        }

        const hasValidId = item.warehouseId && item.warehouseId.toLowerCase() !== 'sin id';
        if (STATE.filterLocation === 'SOLULOGIS' && item.location !== 'SOLULOGIS') return false;
        if (STATE.filterLocation === 'taller' && item.location !== 'taller') return false;
        if (STATE.filterLocation === 'propiedad' && item.location !== 'propiedad') return false;
        if (STATE.filterLocation === 'CON_ID' && !hasValidId) return false;
        if (STATE.filterLocation === 'SIN_ID' && hasValidId) return false;

        if (term) {
            const haystack = [
                item.name,
                item.warehouseId,
                item.id,
                item.category,
                item.dimensions,
                item.weight,
                item.quantity,
                item.location,
                ...(item.history || []).map(h => `${h.person || ''} ${h.text || ''} ${h.notes || ''}`)
            ].join(' ').toLowerCase();
            if (!haystack.includes(term)) return false;
        }

        return true;
    });
}

function parseTotalWeightKg(items) {
    let total = 0;
    items.forEach(item => {
        if (!item.weight) return;
        const match = String(item.weight).match(/(\d+(?:\.\d+)?)\s*kg/i);
        if (match) total += parseFloat(match[1]);
    });
    return total;
}

// --- INVENTORY VIEW ---
function renderInventory(container) {
    const myGen = ++renderGeneration;
    container.innerHTML = '';

    // Ensure locations are up to date
    STATE.items.forEach(item => updateItemLocation(item));

    // --- 1. UPCOMING ALERTS BANNER ---
    const today = new Date().toISOString().split('T')[0];
    const alerts = [];

    STATE.items.forEach(item => {
        if (!item.dates) return;
        const checkDeadline = (dateStr, type) => {
            if (!dateStr) return;
            const d = new Date(dateStr + 'T12:00:00').getTime();
            const t = new Date(today + 'T12:00:00').getTime();
            const diffDays = Math.round((d - t) / (1000 * 3600 * 24));
            if (diffDays >= 0 && diffDays <= 7) {
                alerts.push({
                    id: item.id,
                    name: item.name,
                    warehouseId: item.warehouseId,
                    days: diffDays,
                    type,
                    date: dateStr
                });
            }
        };
        checkDeadline(item.dates.repair, 'Reparación Programada');
        checkDeadline(item.dates.propertyDue, 'Entrega a Propiedad');
    });

    if (alerts.length > 0) {
        const alertBox = document.createElement('div');
        alertBox.className = 'alerts-banner';
        let alertHtml = `
            <div class="alerts-banner-header">
                <span class="material-symbols-rounded">notifications_active</span>
                <span>Atención Requerida &bull; Próximos 7 días (${alerts.length})</span>
            </div>
            <div class="alerts-banner-list">
        `;
        alerts.forEach(a => {
            alertHtml += `
                <div class="alert-row" onclick="navigate('detail:${a.id}')">
                    <div class="alert-row-main">
                        <span class="alert-piece-name">${escapeHtml(a.name)}</span>
                        <span class="alert-piece-id">${escapeHtml(a.warehouseId)}</span>
                        <span class="alert-piece-type">${a.type} (${displayDate(a.date)})</span>
                    </div>
                    <div class="alert-row-right">
                        <span class="alert-countdown">
                            ${a.days === 0 ? 'HOY' : (a.days === 1 ? 'MAÑANA' : `En ${a.days} días`)}
                        </span>
                        <span class="material-symbols-rounded" style="font-size: 18px; color: var(--text-secondary);">arrow_forward</span>
                    </div>
                </div>
            `;
        });
        alertHtml += `</div>`;
        alertBox.innerHTML = alertHtml;
        container.appendChild(alertBox);
    }

    // --- 2. KPI SUMMARY STRIP ---
    const totalCount = STATE.items.length;
    const solulogisCount = STATE.items.filter(i => i.location === 'SOLULOGIS').length;
    const tallerCount = STATE.items.filter(i => i.location === 'taller').length;
    const propCount = STATE.items.filter(i => i.location === 'propiedad').length;
    const conIdCount = STATE.items.filter(i => i.warehouseId && i.warehouseId.toLowerCase() !== 'sin id').length;
    const sinIdCount = totalCount - conIdCount;
    const totalWeight = parseTotalWeightKg(STATE.items);

    const kpiStrip = document.createElement('div');
    kpiStrip.className = 'kpi-strip';
    kpiStrip.innerHTML = `
        <button type="button" class="kpi-card ${STATE.filterLocation === 'ALL' ? 'active' : ''}" onclick="window.filterByLocation('ALL')">
            <div class="kpi-top">
                <span class="kpi-label">Total Resguardo</span>
                <span class="material-symbols-rounded kpi-icon">deployed_code</span>
            </div>
            <div class="kpi-value">${totalCount} <span class="kpi-unit">piezas</span></div>
            <div class="kpi-sub">${totalWeight.toLocaleString('es-MX')} kg peso total est.</div>
        </button>

        <button type="button" class="kpi-card kpi-success ${STATE.filterLocation === 'SOLULOGIS' ? 'active' : ''}" onclick="window.filterByLocation('SOLULOGIS')">
            <div class="kpi-top">
                <span class="kpi-label">En SOLULOGIS</span>
                <span class="badge-dot" style="background: var(--success);"></span>
            </div>
            <div class="kpi-value" style="color: var(--success);">${solulogisCount}</div>
            <div class="kpi-sub">Bodega central activa</div>
        </button>

        <button type="button" class="kpi-card kpi-warning ${STATE.filterLocation === 'taller' ? 'active' : ''}" onclick="window.filterByLocation('taller')">
            <div class="kpi-top">
                <span class="kpi-label">En Taller</span>
                <span class="badge-dot" style="background: var(--warning);"></span>
            </div>
            <div class="kpi-value" style="color: var(--warning);">${tallerCount}</div>
            <div class="kpi-sub">Mantenimiento / Fibra</div>
        </button>

        <button type="button" class="kpi-card kpi-indigo ${STATE.filterLocation === 'propiedad' ? 'active' : ''}" onclick="window.filterByLocation('propiedad')">
            <div class="kpi-top">
                <span class="kpi-label">En Propiedad</span>
                <span class="badge-dot" style="background: #818cf8;"></span>
            </div>
            <div class="kpi-value" style="color: #818cf8;">${propCount}</div>
            <div class="kpi-sub">Exhibición en hotel</div>
        </button>

        <button type="button" class="kpi-card ${STATE.filterLocation === 'SIN_ID' ? 'active' : ''}" onclick="window.filterByLocation('SIN_ID')" title="Clic para filtrar piezas pendientes de ID SOLULOGIS">
            <div class="kpi-top">
                <span class="kpi-label">Etiquetas SOLULOGIS</span>
                <span class="material-symbols-rounded kpi-icon" style="color: ${sinIdCount > 0 ? '#fbbf24' : 'var(--success)'};">qr_code_2</span>
            </div>
            <div class="kpi-value">${conIdCount}<span class="kpi-unit"> / ${totalCount}</span></div>
            <div class="kpi-sub" style="color: ${sinIdCount > 0 ? '#fbbf24' : 'var(--text-tertiary)'};">
                ${sinIdCount > 0 ? `${sinIdCount} piezas sin ID asignado` : '100% etiquetado'}
            </div>
        </button>
    `;
    container.appendChild(kpiStrip);

    // --- 3. CATEGORY & STATUS FILTER BAR ---
    const filteredItems = getFilteredItems();
    const catCounts = {};
    STATE.items.forEach(i => {
        const c = i.category || 'General';
        catCounts[c] = (catCounts[c] || 0) + 1;
    });

    const filterBar = document.createElement('div');
    filterBar.className = 'filter-bar';

    let pillsHtml = `
        <button type="button" class="filter-pill ${STATE.filterCategory === 'ALL' ? 'active' : ''}" onclick="window.filterByCategory('ALL')">
            Todas <span>${STATE.items.length}</span>
        </button>
    `;
    Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]).forEach(cat => {
        const active = STATE.filterCategory === cat ? 'active' : '';
        pillsHtml += `
            <button type="button" class="filter-pill ${active}" onclick="window.filterByCategory('${escapeHtml(cat)}')">
                ${escapeHtml(cat)} <span>${catCounts[cat]}</span>
            </button>
        `;
    });

    const hasActiveFilters = STATE.filterCategory !== 'ALL' || STATE.filterLocation !== 'ALL' || STATE.searchTerm.trim() !== '';

    filterBar.innerHTML = `
        <div class="filter-pills-scroll">
            ${pillsHtml}
        </div>
        <div class="filter-meta">
            <span class="filter-count-label">Mostrando <strong>${filteredItems.length}</strong> de ${STATE.items.length}</span>
            ${hasActiveFilters ? `<button type="button" class="reset-filter-btn" onclick="window.resetFilters()">Limpiar filtros</button>` : ''}
        </div>
    `;
    container.appendChild(filterBar);

    // --- 4. EMPTY STATE ---
    if (filteredItems.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = `
            <span class="material-symbols-rounded empty-icon">inventory_2</span>
            <h3>No se encontraron piezas con estos filtros</h3>
            <p>Intenta cambiar la temporada seleccionada, ubicación o término de búsqueda.</p>
            <button type="button" class="action-btn btn-secondary" style="width: auto; padding: 8px 16px;" onclick="window.resetFilters()">
                Mostrar todas las piezas (${STATE.items.length})
            </button>
        `;
        container.appendChild(empty);
        return;
    }

    // --- 5. RENDER TABLE OR GRID ---
    if (STATE.layout === 'grid') {
        renderInventoryGrid(container, filteredItems, myGen);
    } else {
        renderInventoryTable(container, filteredItems, myGen);
    }
}

function getLocationBadgeInfo(location) {
    if (location === 'taller') {
        return { badgeClass: 'out', badgeText: 'EN TALLER', style: '' };
    }
    if (location === 'propiedad') {
        return { badgeClass: 'new', badgeText: 'EN PROPIEDAD', style: 'background: rgba(99, 102, 241, 0.12); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.25);' };
    }
    return { badgeClass: 'stock', badgeText: 'EN SOLULOGIS', style: '' };
}

function getCategoryBadgeHtml(category) {
    const cat = category || 'General';
    const theme = CATEGORY_COLORS[cat] || CATEGORY_COLORS['General'];
    return `
        <span class="cat-badge" style="background: ${theme.bg}; color: ${theme.text}; border-color: ${theme.border};">
            <span class="material-symbols-rounded" style="font-size: 13px;">${theme.icon}</span>
            ${escapeHtml(cat)}
        </span>
    `;
}

function renderInventoryTable(container, items, myGen) {
    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-responsive';

    const table = document.createElement('table');
    table.className = 'inventory-table';

    table.innerHTML = `
        <thead>
            <tr>
                <th style="width: 68px">Pieza</th>
                <th>Nombre / ID SOLULOGIS</th>
                <th>Temporada</th>
                <th>Ficha Técnica (L&times;A&times;H / Peso)</th>
                <th>Ubicación Actual</th>
                <th>Agenda (Rep / Ing / Prop)</th>
                <th style="text-align: right;">Acciones</th>
            </tr>
        </thead>
    `;

    const tbody = document.createElement('tbody');

    items.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'inventory-row';
        row.onclick = (e) => {
            if (!e.target.closest('button') && !e.target.closest('a') && !e.target.closest('.cell-img-zoom')) {
                navigate(`detail:${item.id}`);
            }
        };

        const { badgeClass, badgeText, style } = getLocationBadgeInfo(item.location);
        const d = item.dates || {};
        const pretty = (dt) => dt ? displayDate(dt) : '—';
        const isSinId = !item.warehouseId || item.warehouseId.toLowerCase() === 'sin id';

        // Last note preview if available
        const notes = (item.history || []).filter(h => h.type === 'note' && !String(h.text || '').startsWith('Se actualizó'));
        const lastNote = notes.length > 0 ? notes[notes.length - 1] : null;

        row.innerHTML = `
            <td>
                <div class="cell-img-zoom" title="Clic para ampliar foto">
                    <img id="row-img-${item.id}" src="${PLACEHOLDER_THUMB}" class="cell-img" alt="${escapeHtml(item.name)}">
                </div>
            </td>
            <td>
                <div class="cell-info">
                    <div class="piece-title-row">
                        <span class="piece-name-text">${escapeHtml(item.name)}</span>
                        ${item.quantity && item.quantity !== '1 pza' ? `<span class="qty-pill">${escapeHtml(item.quantity)}</span>` : ''}
                    </div>
                    <div class="piece-sub-row">
                        <span class="warehouse-id-pill ${isSinId ? 'sin-id' : ''}">
                            ${isSinId ? 'SIN ID SOLULOGIS' : `ID: ${escapeHtml(item.warehouseId)}`}
                        </span>
                        ${lastNote ? `<span class="last-note-chip" title="${escapeHtml(lastNote.person + ': ' + (lastNote.text || lastNote.notes || ''))}">💬 ${escapeHtml(truncateText(lastNote.text || lastNote.notes || '', 34))}</span>` : ''}
                    </div>
                </div>
            </td>
            <td>
                ${getCategoryBadgeHtml(item.category)}
            </td>
            <td>
                <div class="specs-cell">
                    <div class="spec-dim">${item.dimensions ? escapeHtml(item.dimensions) : '<span style="color:var(--text-tertiary)">Sin medidas</span>'}</div>
                    <div class="spec-weight">${item.weight ? `<span class="material-symbols-rounded" style="font-size:13px; vertical-align:-2px;">scale</span> ${escapeHtml(item.weight)}` : ''}</div>
                </div>
            </td>
            <td>
                <span class="badge ${badgeClass}" style="${style}">
                    <span class="badge-dot"></span> ${badgeText}
                </span>
            </td>
            <td>
                <div class="dates-grid-cell">
                    <div>
                        <div class="date-col-label">Reparación</div>
                        <div class="date-col-val" style="color:${d.repair ? '#F59E0B' : 'var(--text-tertiary)'}">${pretty(d.repair)}</div>
                    </div>
                    <div>
                        <div class="date-col-label">Ingreso</div>
                        <div class="date-col-val" style="color:${d.warehouseRet ? '#3b82f6' : 'var(--text-tertiary)'}">${pretty(d.warehouseRet)}</div>
                    </div>
                    <div>
                        <div class="date-col-label">Propiedad</div>
                        <div class="date-col-val" style="color:${d.propertyDue ? '#10B981' : 'var(--text-tertiary)'}">${pretty(d.propertyDue)}</div>
                    </div>
                </div>
            </td>
            <td>
                <div class="row-actions">
                    ${item.modelUrl ? `
                        <a href="${escapeHtml(item.modelUrl)}" target="_blank" rel="noopener" class="icon-action-btn" title="Ver Modelo 3D en Sketchfab">
                            <span class="material-symbols-rounded">view_in_ar</span>
                        </a>
                    ` : ''}
                    <button type="button" onclick="window.printFicha('${item.id}')" class="icon-action-btn" title="Imprimir Etiqueta / Ficha QR">
                        <span class="material-symbols-rounded">qr_code_2</span>
                    </button>
                    <button type="button" onclick="navigate('detail:${item.id}')" class="action-btn btn-secondary row-detail-btn">
                        Detalle
                    </button>
                    <button type="button" onclick="window.deleteItem('${item.id}', event)" class="icon-action-btn danger" title="Eliminar pieza">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(row);

        // Load cached image asynchronously without blocking table build
        if (item.imageId) {
            db.getImageUrl(item.imageId).then(url => {
                if (myGen !== renderGeneration || !url) return;
                const imgEl = document.getElementById(`row-img-${item.id}`);
                if (imgEl) {
                    imgEl.src = url;
                    const zoomWrap = imgEl.closest('.cell-img-zoom');
                    if (zoomWrap) {
                        zoomWrap.onclick = (ev) => {
                            ev.stopPropagation();
                            window.openLightbox(url, item.name, `ID SOLULOGIS: ${item.warehouseId} • ${item.dimensions || ''} ${item.weight ? '• ' + item.weight : ''}`);
                        };
                    }
                }
            });
        }
    });

    table.appendChild(tbody);
    tableWrap.appendChild(table);
    container.appendChild(tableWrap);
}

function renderInventoryGrid(container, items, myGen) {
    const grid = document.createElement('div');
    grid.className = 'catalog-grid';

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'catalog-card';
        card.onclick = (e) => {
            if (!e.target.closest('button') && !e.target.closest('a') && !e.target.closest('.card-zoom-btn')) {
                navigate(`detail:${item.id}`);
            }
        };

        const { badgeClass, badgeText, style } = getLocationBadgeInfo(item.location);
        const isSinId = !item.warehouseId || item.warehouseId.toLowerCase() === 'sin id';
        const notes = (item.history || []).filter(h => h.type === 'note' && !String(h.text || '').startsWith('Se actualizó'));
        const lastNote = notes.length > 0 ? notes[notes.length - 1] : null;

        card.innerHTML = `
            <div class="card-media">
                <img id="card-img-${item.id}" src="${PLACEHOLDER_THUMB}" alt="${escapeHtml(item.name)}" class="card-img">
                <div class="card-top-badges">
                    ${getCategoryBadgeHtml(item.category)}
                    <span class="warehouse-id-pill ${isSinId ? 'sin-id' : ''}">
                        ${isSinId ? 'SIN ID' : escapeHtml(item.warehouseId)}
                    </span>
                </div>
                <button type="button" class="card-zoom-btn" id="card-zoom-${item.id}" title="Ampliar imagen">
                    <span class="material-symbols-rounded">zoom_in</span>
                </button>
            </div>
            <div class="card-body">
                <div class="card-title-row">
                    <h3 class="card-title">${escapeHtml(item.name)}</h3>
                    <span class="badge ${badgeClass}" style="${style}">
                        <span class="badge-dot"></span> ${badgeText}
                    </span>
                </div>

                <div class="card-specs-grid">
                    <div class="card-spec-box">
                        <span class="card-spec-label">Medidas (L&times;A&times;H)</span>
                        <span class="card-spec-val">${escapeHtml(item.dimensions || '—')}</span>
                    </div>
                    <div class="card-spec-box">
                        <span class="card-spec-label">Peso / Cant.</span>
                        <span class="card-spec-val">${escapeHtml(item.weight || '—')} &bull; ${escapeHtml(item.quantity || '1 pza')}</span>
                    </div>
                </div>

                ${lastNote ? `
                    <div class="card-note-preview">
                        <span class="material-symbols-rounded" style="font-size:14px;">chat</span>
                        <span><strong>${escapeHtml(lastNote.person)}:</strong> ${escapeHtml(truncateText(lastNote.text || lastNote.notes || '', 65))}</span>
                    </div>
                ` : ''}

                <div class="card-footer">
                    <button type="button" onclick="navigate('detail:${item.id}')" class="action-btn btn-secondary" style="padding: 7px 12px; font-size: 12px;">
                        <span class="material-symbols-rounded" style="font-size: 16px;">visibility</span>
                        Ficha y Bitácora
                    </button>
                    <button type="button" onclick="window.printFicha('${item.id}')" class="icon-action-btn" title="Imprimir Ficha QR">
                        <span class="material-symbols-rounded">qr_code_2</span>
                    </button>
                    ${item.modelUrl ? `
                        <a href="${escapeHtml(item.modelUrl)}" target="_blank" rel="noopener" class="icon-action-btn" title="Ver Modelo 3D en Sketchfab">
                            <span class="material-symbols-rounded">view_in_ar</span>
                        </a>
                    ` : ''}
                </div>
            </div>
        `;

        grid.appendChild(card);

        if (item.imageId) {
            db.getImageUrl(item.imageId).then(url => {
                if (myGen !== renderGeneration || !url) return;
                const imgEl = document.getElementById(`card-img-${item.id}`);
                const zoomBtn = document.getElementById(`card-zoom-${item.id}`);
                if (imgEl) imgEl.src = url;
                if (zoomBtn) {
                    zoomBtn.onclick = (ev) => {
                        ev.stopPropagation();
                        window.openLightbox(url, item.name, `ID SOLULOGIS: ${item.warehouseId} • ${item.dimensions || ''} ${item.weight ? '• ' + item.weight : ''}`);
                    };
                }
            });
        }
    });

    container.appendChild(grid);
}

// --- DETAIL VIEW ---
async function renderDetail(container, id) {
    const myGen = ++renderGeneration;
    const item = STATE.items.find(i => i.id === id);
    if (!item) return navigate('inventory');

    if (!item.dates) item.dates = { repair: '', warehouseRet: '', propertyDue: '' };
    updateItemLocation(item);

    let imgUrl = PLACEHOLDER_THUMB;
    if (item.imageId) {
        const cachedUrl = await db.getImageUrl(item.imageId);
        if (myGen !== renderGeneration) return;
        if (cachedUrl) imgUrl = cachedUrl;
    }

    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'detail-container';

    const locMap = {
        'SOLULOGIS': { color: 'var(--success)', label: 'EN SOLULOGIS', dot: '#10B981' },
        'taller': { color: 'var(--warning)', label: 'EN TALLER', dot: '#F59E0B' },
        'propiedad': { color: '#818cf8', label: 'EN PROPIEDAD', dot: '#6366f1' }
    };
    const currentLoc = locMap[item.location] || locMap['SOLULOGIS'];

    // High Visibility Date Summary
    let dateSummaryHTML = '';
    const hasDates = item.dates.repair || item.dates.warehouseRet || item.dates.propertyDue;
    if (hasDates) {
        dateSummaryHTML = `
            <div class="agenda-active-box">
                <h4 class="agenda-active-title">
                    <span class="material-symbols-rounded" style="font-size:16px">event_upcoming</span>
                    Agenda Activa
                </h4>
                ${item.dates.repair ? `
                    <div class="agenda-active-row">
                        <span style="color: var(--text-secondary);">Reparación:</span>
                        <div style="display:flex; gap:6px; align-items:center">
                            <span style="font-weight: 600; color: var(--warning);">${displayDate(item.dates.repair)}</span>
                            <a href="${getGCalLink('Reparación: ' + item.name, item.dates.repair)}" target="_blank" title="Agregar a Google Calendar" class="cal-link"><span class="material-symbols-rounded" style="font-size:16px">calendar_today</span></a>
                        </div>
                    </div>` : ''}
                ${item.dates.warehouseRet ? `
                    <div class="agenda-active-row">
                        <span style="color: var(--text-secondary);">Ingreso SOLULOGIS:</span>
                        <div style="display:flex; gap:6px; align-items:center">
                            <span style="font-weight: 600; color: var(--text-primary);">${displayDate(item.dates.warehouseRet)}</span>
                            <a href="${getGCalLink('Ingreso: ' + item.name, item.dates.warehouseRet)}" target="_blank" title="Agregar a Google Calendar" class="cal-link"><span class="material-symbols-rounded" style="font-size:16px">calendar_today</span></a>
                        </div>
                    </div>` : ''}
                ${item.dates.propertyDue ? `
                    <div class="agenda-active-row">
                        <span style="color: var(--text-secondary);">En Propiedad:</span>
                        <div style="display:flex; gap:6px; align-items:center">
                            <span style="font-weight: 600; color: #818cf8;">${displayDate(item.dates.propertyDue)}</span>
                            <a href="${getGCalLink('Propiedad: ' + item.name, item.dates.propertyDue)}" target="_blank" title="Agregar a Google Calendar" class="cal-link"><span class="material-symbols-rounded" style="font-size:16px">calendar_today</span></a>
                        </div>
                    </div>` : ''}
            </div>
        `;
    }

    const catOptionsHtml = CATEGORIES.map(c =>
        `<option value="${escapeHtml(c)}" ${(item.category || 'General') === c ? 'selected' : ''}>${escapeHtml(c)}</option>`
    ).join('');

    // LEFT COL: Info, Specs & Auto-Status
    const left = document.createElement('div');
    left.className = 'detail-sidebar';
    left.innerHTML = `
        <div>
            <div class="detail-photo-box">
                <img src="${imgUrl}" class="big-image" onclick="window.openLightbox('${imgUrl}', '${escapeQuotes(item.name)}', 'ID SOLULOGIS: ${escapeQuotes(item.warehouseId)}')" title="Clic para ver en pantalla completa">
                <button type="button" class="photo-action-btn photo-zoom-trigger" onclick="window.openLightbox('${imgUrl}', '${escapeQuotes(item.name)}', 'ID SOLULOGIS: ${escapeQuotes(item.warehouseId)}')" title="Ampliar imagen">
                    <span class="material-symbols-rounded">zoom_in</span>
                </button>
                <button type="button" class="photo-action-btn photo-replace-trigger" onclick="if(checkAuth()) document.getElementById('edit-img-input').click()" title="Reemplazar fotografía">
                    <span class="material-symbols-rounded">add_a_photo</span> Cambiar Foto
                </button>
            </div>
            <input type="file" id="edit-img-input" accept="image/*" style="display: none" onchange="replaceImage('${item.id}', this)">

            <input type="text" class="editable-title" value="${escapeHtml(item.name)}" onchange="updateBasicData('${item.id}', 'name', this.value)" title="Clic para editar el nombre">

            <div style="display:flex; justify-content:space-between; align-items:center; gap: 8px; margin-top: 6px; flex-wrap: wrap;">
                <div style="display:flex; align-items:center; gap: 6px;">
                    <span style="font-size: 11px; color: var(--text-tertiary); font-weight: 600;">ID SOLULOGIS:</span>
                    <input type="text" class="editable-subtitle" value="${escapeHtml(item.warehouseId)}" onchange="updateBasicData('${item.id}', 'warehouseId', this.value)" title="Clic para editar el ID de SOLULOGIS">
                </div>
                <div style="display:flex; gap: 6px;">
                    ${item.modelUrl ? `
                        <a href="${escapeHtml(item.modelUrl)}" target="_blank" rel="noopener" class="action-btn btn-secondary" style="width: auto; padding: 4px 10px; font-size: 12px; height: 32px; text-decoration: none;" title="Abrir modelo 3D interactivo en Sketchfab">
                            <span class="material-symbols-rounded" style="font-size: 16px;">view_in_ar</span> 3D
                        </a>
                    ` : ''}
                    <button type="button" onclick="window.printFicha('${item.id}')" class="action-btn btn-secondary" style="width: auto; padding: 4px 12px; font-size: 12px; height: 32px;" title="Imprimir Ficha PDF con QR">
                        <span class="material-symbols-rounded" style="font-size: 16px;">print</span> Ficha QR
                    </button>
                </div>
            </div>
        </div>

        <!-- UBICACIÓN ACTUAL (Manual + Automática) -->
        <div class="detail-section-box">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                <label class="section-micro-label">UBICACIÓN ACTUAL</label>
                <span style="font-size: 11px; font-weight: 600; color: ${currentLoc.color}; display:flex; align-items:center; gap:4px;">
                    <span class="badge-dot" style="background: ${currentLoc.dot}"></span> ${currentLoc.label}
                </span>
            </div>
            <div class="location-segmented">
                <button type="button" class="loc-seg-btn ${item.location === 'SOLULOGIS' ? 'active-solulogis' : ''}" onclick="window.setManualLocation('${item.id}', 'SOLULOGIS')">
                    SOLULOGIS
                </button>
                <button type="button" class="loc-seg-btn ${item.location === 'taller' ? 'active-taller' : ''}" onclick="window.setManualLocation('${item.id}', 'taller')">
                    Taller
                </button>
                <button type="button" class="loc-seg-btn ${item.location === 'propiedad' ? 'active-propiedad' : ''}" onclick="window.setManualLocation('${item.id}', 'propiedad')">
                    Propiedad
                </button>
            </div>
        </div>

        <!-- FICHA TÉCNICA DE LA PIEZA -->
        <div class="detail-section-box">
            <label class="section-micro-label" style="margin-bottom: 10px; display:flex; align-items:center; gap:6px;">
                <span class="material-symbols-rounded" style="font-size:15px;">straighten</span>
                ESPECIFICACIONES TÉCNICAS
            </label>
            <div class="specs-edit-grid">
                <div>
                    <label class="field-mini-label">Temporada / Categoría</label>
                    <select onchange="updateBasicData('${item.id}', 'category', this.value)">
                        ${catOptionsHtml}
                    </select>
                </div>
                <div>
                    <label class="field-mini-label">Cantidad / Piezas</label>
                    <input type="text" value="${escapeHtml(item.quantity || '1 pza')}" placeholder="Ej. 1 pza" onchange="updateBasicData('${item.id}', 'quantity', this.value)">
                </div>
                <div>
                    <label class="field-mini-label">Medidas (Largo &times; Ancho &times; Alto)</label>
                    <input type="text" value="${escapeHtml(item.dimensions || '')}" placeholder="Ej. 120cm x 153cm x 130cm" onchange="updateBasicData('${item.id}', 'dimensions', this.value)">
                </div>
                <div>
                    <label class="field-mini-label">Peso Estimado</label>
                    <input type="text" value="${escapeHtml(item.weight || '')}" placeholder="Ej. 30 kg" onchange="updateBasicData('${item.id}', 'weight', this.value)">
                </div>
                <div style="grid-column: 1 / -1;">
                    <label class="field-mini-label">URL Modelo 3D (Sketchfab)</label>
                    <input type="url" value="${escapeHtml(item.modelUrl || '')}" placeholder="https://skfb.ly/..." onchange="updateBasicData('${item.id}', 'modelUrl', this.value)">
                </div>
            </div>
        </div>

        ${dateSummaryHTML}

        <!-- DATE FORM -->
        <div style="border-top: 1px solid var(--bg-layer-2); padding-top: 16px;">
            <h4 style="margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.04em;">
                <span class="material-symbols-rounded" style="font-size: 15px; vertical-align: middle;">settings_automation</span>
                Programación de Fechas
            </h4>

            <div class="warning-callout">
                <span class="material-symbols-rounded" style="font-size: 15px; margin-top:1px">warning</span>
                <span>Solicitar con 2 semanas de anticipación a SOLULOGIS</span>
            </div>

            <form id="dates-form" style="display: grid; gap: 12px;">
                <div>
                    <label class="field-mini-label">REPARACIÓN PROGRAMADA</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="date" name="repair" value="${item.dates.repair || ''}">
                        <button type="button" onclick="showNotificationOptions('${escapeQuotes(item.name)}', '${escapeQuotes(item.warehouseId)}', 'repair')" class="action-btn btn-secondary" style="width: auto; padding: 0 10px;" title="Notificar por Correo / WhatsApp / Teams">
                            <span class="material-symbols-rounded" style="font-size: 18px;">campaign</span>
                        </button>
                    </div>
                </div>
                <div>
                    <label class="field-mini-label">INGRESO A SOLULOGIS</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="date" name="warehouseRet" value="${item.dates.warehouseRet || ''}">
                        <button type="button" onclick="showNotificationOptions('${escapeQuotes(item.name)}', '${escapeQuotes(item.warehouseId)}', 'warehouse')" class="action-btn btn-secondary" style="width: auto; padding: 0 10px;" title="Notificar por Correo / WhatsApp / Teams">
                            <span class="material-symbols-rounded" style="font-size: 18px;">campaign</span>
                        </button>
                    </div>
                </div>
                <div>
                    <label class="field-mini-label">DEBE ESTAR EN PROPIEDAD</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="date" name="propertyDue" value="${item.dates.propertyDue || ''}">
                        <button type="button" onclick="showNotificationOptions('${escapeQuotes(item.name)}', '${escapeQuotes(item.warehouseId)}', 'prop')" class="action-btn btn-secondary" style="width: auto; padding: 0 10px;" title="Notificar por Correo / WhatsApp / Teams">
                            <span class="material-symbols-rounded" style="font-size: 18px;">campaign</span>
                        </button>
                    </div>
                </div>

                <div style="margin-top: 8px; display:flex; justify-content:flex-end">
                    <button type="button" id="save-dates-btn" class="action-btn btn-primary" style="width: auto; padding: 8px 16px;">
                        <span class="material-symbols-rounded" style="font-size: 18px;">save</span> Guardar Fechas
                    </button>
                </div>
            </form>
        </div>
    `;

    // Handle Manual Save of Dates
    left.querySelector('#save-dates-btn').addEventListener('click', async () => {
        if (!checkAuth()) return;
        const form = left.querySelector('#dates-form');
        const fd = new FormData(form);

        item.dates.repair = fd.get('repair');
        item.dates.warehouseRet = fd.get('warehouseRet');
        item.dates.propertyDue = fd.get('propertyDue');

        updateItemLocation(item);
        await saveAll();

        const btn = left.querySelector('#save-dates-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="material-symbols-rounded">check</span> Guardado';
        btn.style.background = 'var(--success)';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
            renderRouter();
        }, 800);
    });

    // Notification Helper
    window.showNotificationOptions = (name, wid, type) => {
        const msg = `Atención: Gestión requerida para pieza ${name} (ID SOLULOGIS: ${wid}). Favor de revisar fechas en el Catálogo de Resguardo 3D.`;
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999;';
        modal.innerHTML = `
            <div style="background:var(--bg-layer-1); padding:24px; border-radius:12px; width:320px; border:1px solid var(--bg-layer-2);">
                <h3 style="margin-top:0; margin-bottom:16px; font-size:16px;">📢 Notificar a Responsable</h3>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <a href="mailto:?subject=Aviso Pieza ${encodeURIComponent(name)}&body=${encodeURIComponent(msg)}" target="_blank" class="action-btn btn-secondary" style="text-decoration:none">
                        <span class="material-symbols-rounded">mail</span> Correo Electrónico
                    </a>
                    <a href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" class="action-btn btn-secondary" style="text-decoration:none; color:#25D366; border-color: currentColor; background: rgba(37, 211, 102, 0.1);">
                        <span class="material-symbols-rounded">chat</span> WhatsApp
                    </a>
                    <a href="https://teams.microsoft.com/l/chat/0/0?users=&message=${encodeURIComponent(msg)}" target="_blank" class="action-btn btn-secondary" style="text-decoration:none; color:#818cf8; border-color: currentColor; background: rgba(98, 100, 167, 0.12);">
                        <span class="material-symbols-rounded">group</span> Microsoft Teams
                    </a>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="margin-top:16px; width:100%; padding:8px; background:transparent; border:none; color:var(--text-tertiary); cursor:pointer;">Cerrar</button>
            </div>
        `;
        document.body.appendChild(modal);
    };

    // RIGHT COL: Comments / Bitácora
    const right = document.createElement('div');
    right.className = 'detail-main';

    const commentSection = `
        <div class="detail-card-panel">
            <h4 style="margin: 0 0 12px 0; font-size: 14px; display:flex; align-items:center; gap:6px;">
                <span class="material-symbols-rounded" style="font-size: 18px; color: var(--primary);">edit_note</span>
                Agregar Nota a Bitácora
            </h4>
            <form id="comment-form" style="display: grid; gap: 12px;">
                <div style="display: grid; grid-template-columns: 220px 1fr; gap: 12px;">
                    <input type="text" name="author" placeholder="Tu Nombre / Responsable" required>
                    <input type="text" name="text" placeholder="Escribe una observación de estado, daño o movimiento..." required>
                </div>
                <div style="display:flex; justify-content: flex-end;">
                    <button type="submit" class="action-btn btn-primary" style="width: auto; padding: 8px 16px;">
                        <span class="material-symbols-rounded" style="font-size: 16px;">add_comment</span> Guardar Nota
                    </button>
                </div>
            </form>
        </div>
    `;

    // Status Report Gallery
    let statusGalleryHtml = '';
    if (item.statusImages && item.statusImages.length > 0) {
        statusGalleryHtml = `
            <div style="margin-bottom: 20px; background: rgba(0,0,0,0.2); padding: 14px; border-radius: 8px; border: 1px dashed var(--bg-layer-3);">
                <h4 style="margin: 0 0 12px 0; font-size: 11px; text-transform: uppercase; color: var(--text-secondary); display:flex; align-items:center; gap:6px;">
                    <span class="material-symbols-rounded" style="font-size:16px;">photo_library</span>
                    Último Reporte Fotográfico (${item.statusImages.length})
                </h4>
                <div id="status-gallery-${item.id}" style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px;">
                    <span style="color:var(--text-tertiary); font-size:12px;">Cargando imágenes...</span>
                </div>
            </div>
        `;

        setTimeout(async () => {
            const gallery = document.getElementById(`status-gallery-${item.id}`);
            if (!gallery) return;
            gallery.innerHTML = '';
            for (let imgId of item.statusImages) {
                const url = await db.getImageUrl(imgId);
                if (url) {
                    const img = document.createElement('img');
                    img.src = url;
                    img.style.cssText = 'height: 100px; width: 100px; border-radius: 6px; object-fit: cover; border: 1px solid var(--bg-layer-3); cursor: pointer;';
                    img.title = 'Clic para ampliar';
                    img.onclick = () => window.openLightbox(url, `Reporte Fotográfico • ${item.name}`, `ID SOLULOGIS: ${item.warehouseId}`);
                    gallery.appendChild(img);
                }
            }
        }, 50);
    }

    const uploadStatusHtml = `
        <div class="detail-card-panel">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h4 style="margin: 0; font-size: 14px;">Evidencia Fotográfica de Estado</h4>
                    <span style="font-size: 12px; color: var(--text-tertiary);">Sube fotos del estado físico actual en bodega o taller</span>
                </div>
                <button type="button" onclick="document.getElementById('status-imgs-input').click()" class="action-btn btn-secondary" style="width:auto; padding: 6px 12px; font-size: 12px;">
                    <span class="material-symbols-rounded" style="font-size: 16px;">add_photo_alternate</span> Subir Fotos
                </button>
                <input type="file" id="status-imgs-input" accept="image/*" multiple style="display: none" onchange="window.previewStatusImages(this)">
            </div>

            <form id="status-report-form" style="display: none; gap: 12px; flex-direction: column; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--bg-layer-3);">
                <div id="status-imgs-preview" style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px;"></div>
                <input type="text" name="author" placeholder="Tu Nombre / Responsable del reporte" required>
                <div style="display:flex; justify-content: flex-end; gap: 8px;">
                    <button type="button" onclick="window.cancelStatusReport()" class="action-btn" style="width: auto; background:transparent; color: var(--text-secondary);">Cancelar</button>
                    <button type="submit" id="btn-submit-status" class="action-btn btn-primary" style="width: auto; padding: 8px 16px;">Actualizar Reporte</button>
                </div>
            </form>
        </div>
    `;

    let historyHtml = '<div class="timeline">';
    [...(item.history || [])].reverse().forEach(h => {
        let dotColor = '#10B981';
        let title = 'Acción';

        if (h.type === 'note') {
            dotColor = '#9CA3AF';
            title = '💬 Nota / Comentario';
        } else if (h.destination === 'taller') {
            dotColor = '#F59E0B';
            title = '➡️ Traslado a TALLER';
        } else if (h.destination === 'propiedad') {
            dotColor = '#6366f1';
            title = '➡️ Traslado a PROPIEDAD';
        } else if (h.destination === 'SOLULOGIS') {
            dotColor = '#10B981';
            title = '➡️ Ingreso a SOLULOGIS';
        } else if (h.type === 'new') {
            title = '✨ Alta de Inventario';
        }

        historyHtml += `
            <div class="timeline-item">
                <div class="timeline-dot" style="background: ${dotColor}; border-color: var(--bg-layer-1);"></div>
                <div class="timeline-header">
                    <span class="timeline-actor">${escapeHtml(h.person || 'Sistema')}</span>
                    <span class="timeline-date">${formatDate(h.date)}</span>
                </div>
                <div class="timeline-content">
                    <div style="font-weight: 500; margin-bottom: 4px; color: var(--text-primary);">${title}</div>
                    <div class="timeline-note">${escapeHtml(h.notes || h.text || '')}</div>
                </div>
            </div>
        `;
    });
    historyHtml += '</div>';

    right.innerHTML = `
        <div class="detail-top-bar">
            <button type="button" class="action-btn btn-secondary" style="width: auto; padding: 6px 12px; font-size: 12px;" onclick="navigate('inventory')">
                <span class="material-symbols-rounded" style="font-size: 16px;">arrow_back</span> Volver al Inventario
            </button>
            <div style="display:flex; align-items:center; gap: 8px;">
                ${getCategoryBadgeHtml(item.category)}
                <span style="font-size: 12px; color: var(--text-tertiary); font-family: 'JetBrains Mono', monospace;">${escapeHtml(item.id)}</span>
            </div>
        </div>
        ${statusGalleryHtml}
        ${uploadStatusHtml}
        ${commentSection}
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid var(--bg-layer-2); padding-bottom: 10px; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 15px;">Bitácora de Movimientos</h3>
            <span style="font-size: 12px; color: var(--text-tertiary);">${(item.history || []).length} registros</span>
        </div>
        <div style="flex: 1; overflow-y: auto;">
            ${historyHtml}
        </div>
    `;

    wrapper.appendChild(left);
    wrapper.appendChild(right);
    container.appendChild(wrapper);

    // Handle Comment Submit
    right.querySelector('#comment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        item.history.push({
            type: 'note',
            person: fd.get('author'),
            text: fd.get('text'),
            date: new Date().toISOString()
        });
        await saveAll();
        renderDetail(container, id);
    });

    // Handle Status Report Submit
    const statusForm = right.querySelector('#status-report-form');
    if (statusForm) {
        statusForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('status-imgs-input');
            const files = fileInput.files;
            if (!files || files.length === 0) return;

            if (!checkAuth()) return;

            const fd = new FormData(e.target);
            const author = fd.get('author');

            const btn = document.getElementById('btn-submit-status');
            btn.innerHTML = '<span class="material-symbols-rounded">sync</span> Subiendo...';
            btn.disabled = true;

            const newStatusImages = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const imgId = `${item.id}_status_${i}`;
                await db.saveImage(imgId, file);
                newStatusImages.push(imgId);
            }

            item.statusImages = newStatusImages;
            item.history.push({
                type: 'note',
                person: author,
                text: `Se actualizó el reporte fotográfico de estado con ${files.length} foto(s).`,
                date: new Date().toISOString()
            });

            await saveAll();
            renderDetail(container, id);
        });
    }
}

// --- NEW PIECE FORM ---
function renderNewForm(container) {
    container.innerHTML = '';
    const formContainer = document.createElement('div');
    formContainer.style.maxWidth = '680px';
    formContainer.style.margin = '0 auto';

    const catOptionsHtml = CATEGORIES.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

    formContainer.innerHTML = `
        <div style="background: var(--bg-layer-1); padding: 32px; border-radius: 10px; border: 1px solid var(--bg-layer-2);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 20px;">Registrar Nueva Pieza en Resguardo</h2>
                <button type="button" class="action-btn btn-secondary" style="width: auto; padding: 6px 12px; font-size: 12px;" onclick="navigate('inventory')">
                    Cancelar
                </button>
            </div>
            <form id="create-form" style="display: flex; flex-direction: column; gap: 18px;">
                <!-- Image Upload -->
                <div id="new-img-dropzone" style="border: 2px dashed var(--bg-layer-3); padding: 24px; text-align: center; border-radius: 8px; cursor: pointer; position: relative;" onclick="document.getElementById('file-input').click()">
                    <input type="file" id="file-input" accept="image/*" style="display: none">
                    <img id="new-img-preview" src="" style="display: none; max-height: 180px; margin: 0 auto 10px auto; border-radius: 6px;">
                    <span class="material-symbols-rounded" id="new-img-icon" style="font-size: 32px; color: var(--text-secondary);">add_photo_alternate</span>
                    <div style="color: var(--text-secondary); margin-top: 8px;" id="file-label">Clic para subir render o fotografía de la pieza</div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <label class="field-mini-label">NOMBRE DE LA PIEZA *</label>
                        <input type="text" name="name" placeholder="Ej. Cabeza de Lobo" required>
                    </div>
                    <div>
                        <label class="field-mini-label">ID DE SOLULOGIS</label>
                        <input type="text" name="warehouseId" placeholder="Ej. 8510751 (o dejar vacío si es Sin ID)">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
                    <div>
                        <label class="field-mini-label">TEMPORADA / CATEGORÍA</label>
                        <select name="category">
                            ${catOptionsHtml}
                        </select>
                    </div>
                    <div>
                        <label class="field-mini-label">UBICACIÓN INICIAL</label>
                        <select name="location">
                            <option value="SOLULOGIS" selected>EN SOLULOGIS</option>
                            <option value="taller">EN TALLER</option>
                            <option value="propiedad">EN PROPIEDAD</option>
                        </select>
                    </div>
                    <div>
                        <label class="field-mini-label">CANTIDAD</label>
                        <input type="text" name="quantity" value="1 pza" placeholder="Ej. 1 pza / Set 2 pzas">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <label class="field-mini-label">MEDIDAS (LARGO &times; ANCHO &times; ALTO)</label>
                        <input type="text" name="dimensions" placeholder="Ej. 90cm x 110cm x 120cm">
                    </div>
                    <div>
                        <label class="field-mini-label">PESO ESTIMADO</label>
                        <input type="text" name="weight" placeholder="Ej. 30 kg">
                    </div>
                </div>

                <div>
                    <label class="field-mini-label">ENLACE MODELO 3D INTERACTIVO (OPCIONAL)</label>
                    <input type="url" name="modelUrl" placeholder="https://skfb.ly/...">
                </div>

                <button type="submit" class="action-btn btn-primary" style="padding: 13px; margin-top: 6px;">
                    <span class="material-symbols-rounded">add_circle</span> GUARDAR PIEZA EN INVENTARIO
                </button>
            </form>
        </div>
    `;

    container.appendChild(formContainer);

    const fileInput = document.getElementById('file-input');
    const fileLabel = document.getElementById('file-label');
    const previewImg = document.getElementById('new-img-preview');
    const previewIcon = document.getElementById('new-img-icon');
    let selectedFile = null;

    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            selectedFile = e.target.files[0];
            fileLabel.textContent = `Seleccionado: ${selectedFile.name}`;
            fileLabel.style.color = 'var(--primary)';
            previewImg.src = URL.createObjectURL(selectedFile);
            previewImg.style.display = 'block';
            previewIcon.style.display = 'none';
        }
    });

    document.getElementById('create-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!checkAuth()) return;
        const formData = new FormData(e.target);

        const newId = 'SC-' + Date.now();
        let imageId = null;

        if (selectedFile) {
            imageId = newId + '_img';
            await db.saveImage(imageId, selectedFile);
        }

        const today = new Date().toISOString().split('T')[0];
        const initialLoc = formData.get('location') || 'SOLULOGIS';

        const newItem = {
            id: newId,
            warehouseId: (formData.get('warehouseId') || '').trim() || 'Sin ID',
            name: (formData.get('name') || '').trim(),
            imageId: imageId,
            location: initialLoc,
            category: formData.get('category') || 'General',
            dimensions: (formData.get('dimensions') || '').trim(),
            weight: (formData.get('weight') || '').trim(),
            quantity: (formData.get('quantity') || '').trim() || '1 pza',
            modelUrl: (formData.get('modelUrl') || '').trim(),
            dates: {
                repair: '',
                workshopReq: '',
                warehouseRet: initialLoc === 'SOLULOGIS' ? today : '',
                propertyDue: ''
            },
            history: [{
                type: 'new',
                person: 'Sistema',
                date: new Date().toISOString(),
                notes: 'Alta de Inventario'
            }]
        };

        STATE.items.push(newItem);
        await saveAll();
        navigate('inventory');
    });
}

// --- UTILS & ACTIONS ---
async function saveAll() {
    const indicator = document.getElementById('db-status-indicator');
    if (indicator) {
        indicator.textContent = '● Guardando en D1...';
        indicator.style.color = 'var(--warning)';
    }
    const ok = await db.saveState('app_data', STATE.items);
    if (indicator) {
        indicator.textContent = ok ? '● Sincronizado D1' : '● Error de red';
        indicator.style.color = ok ? 'var(--success)' : 'var(--danger)';
    }
}

function setupNavigation() {
    document.querySelectorAll('[data-view]').forEach(btn => {
        btn.addEventListener('click', () => navigate(btn.dataset.view));
    });
}

function setupSearch() {
    const input = document.getElementById('global-search');
    const clearBtn = document.getElementById('clear-search-btn');
    if (!input) return;

    input.addEventListener('input', (e) => {
        STATE.searchTerm = e.target.value;
        if (clearBtn) {
            clearBtn.classList.toggle('hidden', !STATE.searchTerm);
        }
        if (STATE.view !== 'inventory') {
            STATE.view = 'inventory';
        }
        renderRouter();
    });
}

window.clearSearch = () => {
    STATE.searchTerm = '';
    const input = document.getElementById('global-search');
    const clearBtn = document.getElementById('clear-search-btn');
    if (input) {
        input.value = '';
        input.focus();
    }
    if (clearBtn) clearBtn.classList.add('hidden');
    if (STATE.view === 'inventory') renderRouter();
};

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            window.closeLightbox();
        }
        if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
            e.preventDefault();
            const input = document.getElementById('global-search');
            if (input) input.focus();
        }
    });
}

function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function displayDate(isoDateStr) {
    if (!isoDateStr) return '';
    return new Date(isoDateStr + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function updateItemLocation(item) {
    if (!item.location) item.location = 'SOLULOGIS';
    if (!item.dates) return;

    const today = new Date().toISOString().split('T')[0];
    const { repair, warehouseRet, propertyDue } = item.dates;

    // Collect reached scheduled milestones (date <= today)
    const milestones = [];
    if (repair && today >= repair) milestones.push({ date: repair, loc: 'taller' });
    if (warehouseRet && today >= warehouseRet) milestones.push({ date: warehouseRet, loc: 'SOLULOGIS' });
    if (propertyDue && today >= propertyDue) milestones.push({ date: propertyDue, loc: 'propiedad' });

    if (milestones.length === 0) {
        // Keep current item.location (defaulting to SOLULOGIS rather than forcing taller)
        return;
    }

    // Sort chronologically so the most recent reached milestone wins
    milestones.sort((a, b) => a.date.localeCompare(b.date));
    const latestMilestone = milestones[milestones.length - 1];

    // If user manually set location more recently than the milestone date, respect manual override
    if (item.manualLocationDate && item.manualLocationDate > latestMilestone.date) {
        return;
    }

    item.location = latestMilestone.loc;
}

window.setManualLocation = async (id, newLoc) => {
    if (!checkAuth()) return;
    const item = STATE.items.find(i => i.id === id);
    if (!item || item.location === newLoc) return;

    const oldLoc = item.location;
    const today = new Date().toISOString().split('T')[0];
    item.location = newLoc;
    item.manualLocationDate = today;

    const labels = { 'SOLULOGIS': 'SOLULOGIS', 'taller': 'TALLER', 'propiedad': 'PROPIEDAD' };
    item.history.push({
        type: 'move',
        destination: newLoc,
        person: 'Admin Bodega',
        date: new Date().toISOString(),
        notes: `Ubicación actualizada manualmente de ${labels[oldLoc] || oldLoc} a ${labels[newLoc] || newLoc}.`
    });

    await saveAll();
    renderDetail(document.getElementById('content-area'), id);
};

// --- AUTH ---
const VALID_PASSWORDS = ['Palace2026**', 'Ibsanesgay2026'];

function isAdminUnlocked() {
    return VALID_PASSWORDS.includes(sessionStorage.getItem('admin_auth'));
}

function updateAdminLockUI() {
    const btn = document.getElementById('admin-lock-btn');
    const icon = document.getElementById('admin-lock-icon');
    const label = document.getElementById('admin-lock-label');
    if (!btn || !icon || !label) return;

    if (isAdminUnlocked()) {
        icon.textContent = 'lock_open';
        label.textContent = 'Edición Activa (Cerrar)';
        btn.style.color = 'var(--success)';
    } else {
        icon.textContent = 'lock';
        label.textContent = 'Desbloquear Edición';
        btn.style.color = '';
    }
}

window.toggleAdminSession = () => {
    if (isAdminUnlocked()) {
        sessionStorage.removeItem('admin_auth');
        updateAdminLockUI();
    } else {
        window.checkAuth();
    }
};

window.checkAuth = () => {
    if (isAdminUnlocked()) return true;
    const pwd = prompt("Acceso Restringido: Ingresa la contraseña de administrador para realizar cambios:");
    if (VALID_PASSWORDS.includes(pwd)) {
        sessionStorage.setItem('admin_auth', pwd);
        updateAdminLockUI();
        return true;
    }
    if (pwd !== null) alert("Contraseña incorrecta.");
    return false;
};

function getGCalLink(title, dateStr) {
    if (!dateStr) return '#';
    const start = dateStr.replace(/-/g, '');
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const end = d.toISOString().split('T')[0].replace(/-/g, '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}`;
}

window.deleteItem = async (id, e) => {
    if (e) e.stopPropagation();
    if (!checkAuth()) return;
    const item = STATE.items.find(i => i.id === id);
    if (!confirm(`¿Estás seguro de ELIMINAR "${item ? item.name : id}" permanentemente?`)) return;
    STATE.items = STATE.items.filter(i => i.id !== id);
    await saveAll();
    renderRouter();
};

const FIELD_LABELS = {
    name: 'Nombre',
    warehouseId: 'ID de SOLULOGIS',
    category: 'Temporada',
    dimensions: 'Medidas',
    weight: 'Peso',
    quantity: 'Cantidad',
    modelUrl: 'Link Modelo 3D'
};

window.updateBasicData = async (id, field, value) => {
    if (!checkAuth()) {
        renderDetail(document.getElementById('content-area'), id);
        return;
    }
    const item = STATE.items.find(i => i.id === id);
    if (item) {
        let cleanValue = String(value || '').trim();
        if (field === 'name' && cleanValue === '') return;
        if (field === 'warehouseId' && cleanValue === '') cleanValue = 'Sin ID';

        const oldVal = item[field] || '';
        if (oldVal !== cleanValue) {
            item[field] = cleanValue;
            const fieldName = FIELD_LABELS[field] || field;
            item.history.push({
                type: 'note',
                person: 'Sistema',
                text: `Se actualizó ${fieldName} de "${oldVal || 'vacío'}" a "${cleanValue}"`,
                date: new Date().toISOString()
            });
            await saveAll();
        }
        renderDetail(document.getElementById('content-area'), id);
        updateSidebarCategories();
    }
};

window.replaceImage = async (id, fileInput) => {
    const file = fileInput.files[0];
    if (!file) return;

    const item = STATE.items.find(i => i.id === id);
    if (!item) return;

    if (!item.imageId) {
        item.imageId = id + '_img';
    }

    await db.saveImage(item.imageId, file);

    item.history.push({
        type: 'note',
        person: 'Sistema',
        text: 'Se actualizó la fotografía de la pieza.',
        date: new Date().toISOString()
    });

    await saveAll();
    renderDetail(document.getElementById('content-area'), id);
};

// --- LIGHTBOX ---
window.openLightbox = (imgUrl, title, subtitle) => {
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    const titleEl = document.getElementById('lightbox-title');
    const subEl = document.getElementById('lightbox-subtitle');
    if (!modal || !img) return;

    img.src = imgUrl;
    if (titleEl) titleEl.textContent = title || 'Vista Previa';
    if (subEl) subEl.textContent = subtitle || '';
    modal.classList.remove('hidden');
};

window.closeLightbox = () => {
    const modal = document.getElementById('lightbox-modal');
    if (modal) modal.classList.add('hidden');
};

// --- PRINT FICHA QR ---
window.printFicha = async (id, fallbackName, fallbackWarehouseId, fallbackImgUrl) => {
    const item = STATE.items.find(i => i.id === id) || {
        id,
        name: fallbackName || 'Pieza',
        warehouseId: fallbackWarehouseId || 'Sin ID',
        category: 'General',
        dimensions: '—',
        weight: '—',
        quantity: '1 pza'
    };

    let imgUrl = fallbackImgUrl || PLACEHOLDER_THUMB;
    if (!fallbackImgUrl && item.imageId) {
        const cached = await db.getImageUrl(item.imageId);
        if (cached) imgUrl = cached;
    }

    const ficha = document.getElementById('print-ficha');
    const baseUrl = window.location.origin + window.location.pathname;
    const qrUrl = baseUrl + '?view=detail:' + item.id;

    ficha.innerHTML = `
        <div class="ficha-container">
            <div class="ficha-header">Catálogo Resguardo 3D &bull; SOLULOGIS Central &bull; The Palace Company</div>

            <div class="ficha-body">
                <div class="ficha-img-wrapper">
                    <img src="${imgUrl}" class="ficha-img">
                </div>

                <div class="ficha-details">
                    <div class="ficha-name-label">Temporada: ${escapeHtml(item.category || 'General')}</div>
                    <div class="ficha-name">${escapeHtml(item.name)}</div>

                    <div class="ficha-id-label">ID de Inventario SOLULOGIS</div>
                    <div class="ficha-id">${escapeHtml(item.warehouseId)}</div>

                    <div class="ficha-specs-table">
                        <div><strong>Medidas:</strong> ${escapeHtml(item.dimensions || 'No registradas')}</div>
                        <div><strong>Peso Estimado:</strong> ${escapeHtml(item.weight || 'No registrado')}</div>
                        <div><strong>Cantidad:</strong> ${escapeHtml(item.quantity || '1 pza')}</div>
                    </div>

                    <div id="ficha-qr-code" class="ficha-qr"></div>
                </div>
            </div>

            <div class="ficha-footer">
                <span>Escanear QR para ver bitácora, estado y traslados en vivo</span>
                <span style="color: #666;">Folio: ${escapeHtml(item.id)}</span>
            </div>
        </div>
    `;

    new QRCode(document.getElementById('ficha-qr-code'), {
        text: qrUrl,
        width: 140,
        height: 140,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    setTimeout(() => {
        window.print();
    }, 450);
};

// --- EXPORT CSV ---
window.exportInventoryCSV = () => {
    const headers = [
        'ID Sistema',
        'ID SOLULOGIS',
        'Nombre de la Pieza',
        'Temporada / Categoría',
        'Ubicación Actual',
        'Medidas (LxAxH)',
        'Peso Estimado',
        'Cantidad',
        'Modelo 3D',
        'Fecha Reparación',
        'Fecha Ingreso SOLULOGIS',
        'Fecha Propiedad',
        'Última Nota en Bitácora'
    ];

    const rows = STATE.items.map(item => {
        const notes = (item.history || []).filter(h => h.type === 'note');
        const lastNote = notes.length > 0 ? `${notes[notes.length - 1].person}: ${notes[notes.length - 1].text || notes[notes.length - 1].notes || ''}` : '';
        const d = item.dates || {};
        return [
            item.id,
            item.warehouseId || 'Sin ID',
            item.name || '',
            item.category || 'General',
            item.location || 'SOLULOGIS',
            item.dimensions || '',
            item.weight || '',
            item.quantity || '1 pza',
            item.modelUrl || '',
            d.repair || '',
            d.warehouseRet || '',
            d.propertyDue || '',
            lastNote
        ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Catalogo_Resguardo_3D_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

window.previewStatusImages = (input) => {
    const files = input.files;
    const previewContainer = document.getElementById('status-imgs-preview');
    const form = document.getElementById('status-report-form');

    if (!files || files.length === 0) {
        form.style.display = 'none';
        return;
    }

    form.style.display = 'flex';
    previewContainer.innerHTML = '';

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = URL.createObjectURL(file);
        const img = document.createElement('img');
        img.src = url;
        img.style.cssText = 'height: 80px; width: 80px; border-radius: 6px; object-fit: cover; border: 1px solid var(--bg-layer-3);';
        previewContainer.appendChild(img);
    }
};

window.cancelStatusReport = () => {
    document.getElementById('status-imgs-input').value = '';
    document.getElementById('status-report-form').style.display = 'none';
    document.getElementById('status-imgs-preview').innerHTML = '';
};

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeQuotes(str) {
    return String(str ?? '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function truncateText(str, maxLen) {
    const s = String(str ?? '');
    return s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
}
