// --- INITIAL DATA ---
const INITIAL_DATA = [
    {
        id: 'SC-' + Math.floor(Math.random() * 10000),
        warehouseId: 'A-01',
        name: 'Nebula Fragment',
        imageId: null, // Will use placeholder if null
        status: 'in', // 'in' | 'out'
        history: [
            { type: 'new', person: 'Admin', date: new Date().toISOString(), notes: 'Initial Migration' }
        ]
    }
];

// --- APP STATE ---
let STATE = {
    items: [],
    view: 'inventory' // inventory | detail | new
};

// --- MAIN CONTROLLER ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Init DB
    await db.init();

    // 2. Load Data
    const saved = await db.getState('app_data');
    if (saved) {
        STATE.items = saved;
    } else {
        STATE.items = INITIAL_DATA;
    }

    // 3. Render
    renderRouter();

    // 4. Global Events
    setupNavigation();
    setupSearch();
});

// --- ROUTER ---
function renderRouter() {
    const content = document.getElementById('content-area');
    const pageTitle = document.getElementById('page-title');
    const pageSub = document.getElementById('page-subtitle');

    content.innerHTML = '';

    // reset active nav
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

    if (STATE.view === 'inventory') {
        document.querySelector('[data-view="inventory"]').classList.add('active');
        pageTitle.textContent = 'Inventario General';
        pageSub.classList.add('hidden');
        renderInventory(content);
    }
    else if (STATE.view === 'new-item') {
        document.querySelector('[data-view="new-item"]').classList.add('active');
        pageTitle.textContent = 'Nueva Pieza';
        pageSub.classList.add('hidden');
        renderNewForm(content);
    }
    else if (STATE.view.startsWith('detail:')) {
        const id = STATE.view.split(':')[1];
        pageTitle.textContent = 'Inventario';
        pageSub.textContent = ' / Detalle de Pieza';
        pageSub.classList.remove('hidden');
        renderDetail(content, id);
    }
}

function navigate(view) {
    STATE.view = view;
    renderRouter();
}
window.navigate = navigate;

// --- VIEWS ---

function renderInventory(container) {
    container.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'inventory-table';

    const thead = `
        <thead>
            <tr>
                <th style="width: 60px">Pieza</th>
                <th>Nombre / ID</th>
                <th>Ubicación Actual</th>
                <th>Agenda (Rep / Ing / Prop)</th>
                <th>Acción</th>
            </tr>
        </thead>
    `;

    const tbody = document.createElement('tbody');

    // LOAD IMAGES ASYNC
    STATE.items.forEach(async (item) => {
        // Auto-update location based on dates before render
        updateItemLocation(item);

        const row = document.createElement('tr');
        row.className = 'inventory-row';
        row.onclick = (e) => {
            if (!e.target.closest('button')) navigate(`detail:${item.id}`);
        };

        const lastMove = item.history[item.history.length - 1];

        // Migration safeguard
        if (!item.location) item.location = item.status === 'out' ? 'propiedad' : 'bodega';

        // Status Badge Logic
        let badgeClass = 'stock'; // default green
        let badgeText = 'EN BODEGA';

        if (item.location === 'taller') {
            badgeClass = 'out'; // reusing out (orange)
            badgeText = 'EN TALLER';
        } else if (item.location === 'propiedad') {
            badgeClass = 'new'; // reusing new (blue)
            badgeText = 'EN PROPIEDAD';
        }

        // Image Handling
        let imgUrl = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiB2aWV3Qm94PSIwIDAgMTUwIDE1MCI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWc8L3RleHQ+PC9zdmc+';
        if (item.imageId) {
            const blob = await db.getImage(item.imageId);
            if (blob) imgUrl = URL.createObjectURL(blob);
        }

        // Dates for Column
        const d = item.dates || {};
        const pretty = (dt) => dt ? displayDate(dt) : '-';

        row.innerHTML = `
            <td>
                <img src="${imgUrl}" class="cell-img">
            </td>
            <td>
                <div class="cell-info">
                    <div style="font-size: 14px;">${item.name}</div>
                    <span style="font-family: monospace; color: var(--primary);">${item.warehouseId}</span>
                </div>
            </td>
            <td>
                <span class="badge ${badgeClass}" style="${item.location === 'propiedad' ? 'background: rgba(99, 102, 241, 0.1); color: #818cf8;' : ''}">
                    <span class="badge-dot"></span> ${badgeText}
                </span>
            </td>
            <td>
                <div style="display: flex; gap: 16px; align-items: center; white-space: nowrap;">
                    <div style="text-align: left;">
                        <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase; margin-bottom:2px;">Reparación</div>
                        <div style="font-size:12px; font-weight:500; color:${d.repair ? '#F59E0B' : 'var(--text-tertiary)'}">${pretty(d.repair)}</div>
                    </div>
                    <div style="text-align: left;">
                        <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase; margin-bottom:2px;">Ingreso</div>
                        <div style="font-size:12px; font-weight:500; color:${d.warehouseRet ? '#3b82f6' : 'var(--text-tertiary)'}">${pretty(d.warehouseRet)}</div>
                    </div>
                    <div style="text-align: left;">
                         <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase; margin-bottom:2px;">Propiedad</div>
                        <div style="font-size:12px; font-weight:500; color:${d.propertyDue ? '#10B981' : 'var(--text-tertiary)'}">${pretty(d.propertyDue)}</div>
                    </div>
                </div>
            </td>
            <td style="display:flex; align-items:center; gap:6px;">
                <button onclick="navigate('detail:${item.id}')" class="action-btn btn-secondary" style="width: auto; padding: 4px 8px; font-size: 12px;">
                    Ver Detalle
                </button>
                <button onclick="window.deleteItem('${item.id}', event)" class="action-btn" style="width: auto; padding: 4px; color: #ef4444; background: transparent; border:none;" title="Eliminar">
                    <span class="material-symbols-rounded" style="font-size:20px;">delete</span>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    table.innerHTML = thead;
    table.appendChild(tbody);
    container.appendChild(table);
}

async function renderDetail(container, id) {
    container.innerHTML = ''; // Prevent duplication
    const item = STATE.items.find(i => i.id === id);
    if (!item) return navigate('inventory');

    // Init Logic
    if (!item.dates) item.dates = { repair: '', warehouseRet: '', propertyDue: '' };
    updateItemLocation(item); // Ensure logic is current

    // Load Image
    let imgUrl = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNDAwIDQwMCI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjRweCIgZmlsbD0iIzg4OCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
    if (item.imageId) {
        const blob = await db.getImage(item.imageId);
        if (blob) imgUrl = URL.createObjectURL(blob);
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'detail-container';

    // Helper for Location Display (Updated)
    const locMap = {
        'bodega': { color: 'var(--success)', label: 'EN BODEGA', dot: '#10B981' },
        'taller': { color: 'var(--warning)', label: 'EN TALLER', dot: '#F59E0B' },
        'propiedad': { color: '#818cf8', label: 'EN PROPIEDAD', dot: '#6366f1' }
    };
    const currentLoc = locMap[item.location] || locMap['bodega'];

    // Mailto Link
    const mailSubject = `Recordatorio Reparación: ${item.name} (${item.warehouseId})`;
    const mailBody = `Hola,\n\nSe requiere atención para la pieza ${item.name}.\n\nFecha Programada: ${item.dates.repair || 'Pendiente'}\n\nFavor de gestionar con anticipación.`;
    const mailLink = `mailto:itrujillo@thepalacecompany.com?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;

    // High Visibility Date Summary
    let dateSummaryHTML = '';
    const hasDates = item.dates.repair || item.dates.warehouseRet || item.dates.propertyDue;
    if (hasDates) {
        dateSummaryHTML = `
            <div style="background: rgba(39, 39, 42, 0.5); border: 1px solid var(--primary); border-radius: 8px; padding: 16px; margin-top: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <h4 style="margin: 0 0 12px 0; font-size: 11px; text-transform: uppercase; color: var(--primary); letter-spacing: 1px; display:flex; align-items:center; gap:6px;">
                    <span class="material-symbols-rounded" style="font-size:16px">event_upcoming</span> 
                    Agenda Activa
                </h4>
                ${item.dates.repair ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
                        <span style="color: var(--text-secondary);">Reparación:</span>
                        <div style="display:flex; gap:6px; align-items:center">
                            <span style="font-weight: 600; color: var(--text-primary);">${displayDate(item.dates.repair)}</span>
                            <a href="${getGCalLink('Reparación: ' + item.name, item.dates.repair)}" target="_blank" title="Agregar a Calendario" style="text-decoration:none; color:var(--text-tertiary)"><span class="material-symbols-rounded" style="font-size:16px">calendar_today</span></a>
                        </div>
                    </div>` : ''}
                ${item.dates.warehouseRet ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
                        <span style="color: var(--text-secondary);">Ingreso Bodega:</span>
                        <div style="display:flex; gap:6px; align-items:center">
                            <span style="font-weight: 600; color: var(--text-primary);">${displayDate(item.dates.warehouseRet)}</span>
                            <a href="${getGCalLink('Ingreso: ' + item.name, item.dates.warehouseRet)}" target="_blank" title="Agregar a Calendario" style="text-decoration:none; color:var(--text-tertiary)"><span class="material-symbols-rounded" style="font-size:16px">calendar_today</span></a>
                        </div>
                    </div>` : ''}
                ${item.dates.propertyDue ? `
                    <div style="display: flex; justify-content: space-between; font-size: 13px;">
                        <span style="color: var(--text-secondary);">En Propiedad:</span>
                        <div style="display:flex; gap:6px; align-items:center">
                            <span style="font-weight: 600; color: #818cf8;">${displayDate(item.dates.propertyDue)}</span>
                            <a href="${getGCalLink('Propiedad: ' + item.name, item.dates.propertyDue)}" target="_blank" title="Agregar a Calendario" style="text-decoration:none; color:var(--text-tertiary)"><span class="material-symbols-rounded" style="font-size:16px">calendar_today</span></a>
                        </div>
                    </div>` : ''}
            </div>
        `;
    }

    // LEFT COL: Info & Auto-Status
    const left = document.createElement('div');
    left.className = 'detail-sidebar';
    left.innerHTML = `
        <div>
            <img src="${imgUrl}" class="big-image">
            <h2 style="margin: 0 0 4px 0;">${item.name}</h2>
            <div style="color: var(--primary); font-family: monospace;">${item.warehouseId}</div>
        </div>

        <div style="background: var(--bg-layer-2); padding: 12px; border-radius: 6px;">
            <label style="display: block; font-size: 11px; margin-bottom: 4px; color: var(--text-tertiary);">UBICACIÓN (Autodetectada)</label>
            <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; color: ${currentLoc.color}">
                <span class="badge-dot" style="background: ${currentLoc.dot}"></span>
                ${currentLoc.label}
            </div>
        </div>

        ${dateSummaryHTML}

        <!-- DATE FORM -->
        <div style="border-top: 1px solid var(--bg-layer-2); padding-top: 16px;">
            <h4 style="margin: 0 0 12px 0; font-size: 13px; text-transform: uppercase; color: var(--text-secondary);">
                <span class="material-symbols-rounded" style="font-size: 14px; vertical-align: middle;">settings_automation</span> 
                Programación
            </h4>
            
            <div style="font-size: 11px; color: #fbbf24; background: rgba(251, 191, 36, 0.1); padding: 8px; border-radius: 4px; margin-bottom: 12px; line-height: 1.4; display:flex; gap:6px; align-items:flex-start">
                <span class="material-symbols-rounded" style="font-size: 14px; margin-top:1px">warning</span>
                <span>Solicitar con 2 semanas de anticipación a bodega</span>
            </div>

            <form id="dates-form" style="display: grid; gap: 12px;">
                <div>
                    <label style="display: block; font-size: 11px; color: var(--text-tertiary); margin-bottom: 4px;">REPARACIÓN PROGRAMADA (Notificar a ITrujillo)</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="date" name="repair" value="${item.dates.repair || ''}">
                        <a href="${mailLink}" class="action-btn btn-secondary" style="width: auto; padding: 0 10px;" title="Enviar Correo">
                            <span class="material-symbols-rounded" style="font-size: 18px;">mail</span>
                        </a>
                    </div>
                    <div style="font-size:10px; color:#555; margin-top:2px">* Al llegar fecha, pasa a Taller</div>
                </div>
                <div>
                    <label style="display: block; font-size: 11px; color: var(--text-tertiary); margin-bottom: 4px;">INGRESO A BODEGA</label>
                    <input type="date" name="warehouseRet" value="${item.dates.warehouseRet || ''}">
                     <div style="font-size:10px; color:#555; margin-top:2px">* Al llegar fecha, pasa a Bodega</div>
                </div>
                <div>
                    <label style="display: block; font-size: 11px; color: var(--text-tertiary); margin-bottom: 4px;">DEBE ESTAR EN PROPIEDAD</label>
                    <input type="date" name="propertyDue" value="${item.dates.propertyDue || ''}">
                     <div style="font-size:10px; color:#555; margin-top:2px">* Al llegar fecha, pasa a Propiedad</div>
                </div>
            </form>
        </div>
    `;

    // Trigger update on date change
    left.querySelectorAll('input[type="date"]').forEach(input => {
        input.addEventListener('change', async (e) => {
            item.dates[e.target.name] = e.target.value;
            updateItemLocation(item); // THE SMART LOGIC
            await saveAll();
            renderDetail(container, id); // Refresh UI
        });
    });

    // RIGHT COL: Comments / Bitácora
    const right = document.createElement('div');
    right.className = 'detail-main';

    // Add Comment Form
    const commentSection = `
        <div style="background: var(--bg-layer-2); padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <h4 style="margin: 0 0 12px 0;">Agregar Nota a Bitácora</h4>
            <form id="comment-form" style="display: grid; gap: 12px;">
                <input type="text" name="author" placeholder="Tu Nombre / Responsable" required style="width: 100%;">
                <textarea name="text" placeholder="Escribe un comentario..." required style="width: 100%; min-height: 60px;"></textarea>
                <div style="display:flex; justify-content: flex-end;">
                    <button type="submit" class="action-btn btn-primary" style="width: auto;">Guardar Nota</button>
                </div>
            </form>
        </div>
    `;

    let historyHtml = '<div class="timeline">';
    [...item.history].reverse().forEach(h => {
        let dotColor = '#10B981'; // green default
        let title = 'Acción';

        if (h.type === 'note') {
            dotColor = '#9CA3AF'; // gray
            title = '💬 Nota / Comentario';
        } else if (h.destination === 'taller') {
            dotColor = '#F59E0B';
            title = `➡️ Traslado a TALLER`;
        } else if (h.destination === 'propiedad') {
            dotColor = '#6366f1';
            title = `➡️ Traslado a PROPIEDAD`;
        } else if (h.type === 'new') {
            title = '✨ Alta Original';
        }

        historyHtml += `
            <div class="timeline-item">
                <div class="timeline-dot" style="background: ${dotColor}; border-color: var(--bg-layer-1);"></div>
                <div class="timeline-header">
                    <span class="timeline-actor">${h.person}</span>
                    <span class="timeline-date">${formatDate(h.date)}</span>
                </div>
                <div class="timeline-content">
                    <div style="font-weight: 500; margin-bottom: 4px; color: var(--text-primary);">${title}</div>
                    <div class="timeline-note">${h.notes || h.text || ''}</div>
                </div>
            </div>
        `;
    });
    historyHtml += '</div>';

    right.innerHTML = `
        ${commentSection}
        <h3 style="margin: 0 0 20px 0; border-bottom: 1px solid var(--bg-layer-2); padding-bottom: 12px;">Bitácora de Movimientos</h3>
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
            text: fd.get('text'), // using 'text' key for notes
            date: new Date().toISOString()
        });
        await saveAll();
        renderDetail(container, id); // refresh list
    });
}

function renderNewForm(container) {
    const formContainer = document.createElement('div');
    formContainer.style.maxWidth = '600px';
    formContainer.style.margin = '0 auto';

    formContainer.innerHTML = `
        <div style="background: var(--bg-layer-1); padding: 32px; border-radius: 8px; border: 1px solid var(--bg-layer-2);">
            <h2 style="margin-top: 0;">Registrar Nueva Pieza</h2>
            <form id="create-form" style="display: flex; flex-direction: column; gap: 20px;">
                
                <!-- Image Upload -->
                <div style="border: 2px dashed var(--bg-layer-3); padding: 20px; text-align: center; border-radius: 8px; cursor: pointer;" onclick="document.getElementById('file-input').click()">
                    <input type="file" id="file-input" accept="image/*" style="display: none">
                    <span class="material-symbols-rounded" style="font-size: 32px; color: var(--text-secondary);">add_photo_alternate</span>
                    <div style="color: var(--text-secondary); margin-top: 8px;" id="file-label">Click para subir foto</div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 500; color: var(--text-secondary);">ID DE BODEGA</label>
                        <input type="text" name="warehouseId" placeholder="Ej. A-104" required>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 500; color: var(--text-secondary);">NOMBRE</label>
                        <input type="text" name="name" placeholder="Ej. Cubo Abstracto" required>
                    </div>
                </div>

                <div style="color: var(--text-tertiary); font-size: 11px;">
                    * Al registrarse, la pieza tendrá el estado inicial "EN BODEGA".
                </div>

                <button type="submit" class="action-btn btn-primary" style="padding: 14px;">GUARDAR PIEZA</button>
            </form>
        </div>
    `;

    container.appendChild(formContainer);

    // File Preview
    const fileInput = document.getElementById('file-input');
    const fileLabel = document.getElementById('file-label');
    let selectedFile = null;

    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            selectedFile = e.target.files[0];
            fileLabel.textContent = `Seleccionado: ${selectedFile.name}`;
            fileLabel.style.color = 'var(--primary)';
        }
    });

    // Handle Submit
    document.getElementById('create-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const newId = 'SC-' + Date.now();
        let imageId = null;

        // Save Image if exists
        if (selectedFile) {
            imageId = newId + '_img';
            await db.saveImage(imageId, selectedFile);
        }

        const newItem = {
            id: newId,
            warehouseId: formData.get('warehouseId'),
            name: formData.get('name'),
            imageId: imageId,
            location: 'bodega', // DEFAULT
            dates: { repair: '', workshopReq: '', warehouseRet: '', propertyDue: '' },
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


// --- UTILS ---
async function saveAll() {
    await db.saveState('app_data', STATE.items);
}

function setupNavigation() {
    document.querySelectorAll('[data-view]').forEach(btn => {
        btn.addEventListener('click', () => navigate(btn.dataset.view));
    });
}

function setupSearch() {
    const input = document.getElementById('global-search');
    input.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        // Simple filter render?
        // Actually, let's just re-render inventory with filter if we adhere to MVC properly
        // For now, quick hack: hide rows
        const rows = document.querySelectorAll('.inventory-row');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    });
}

function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function displayDate(isoDateStr) {
    if (!isoDateStr) return '';
    // Append T12:00:00 to avoid timezone shifts on date-only strings
    return new Date(isoDateStr + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function updateItemLocation(item) {
    if (!item.dates) return;
    const today = new Date().toISOString().split('T')[0];
    const { repair, warehouseRet, propertyDue } = item.dates;

    // Smart Logic:
    // 1. Default -> Bodega
    // 2. If Today >= Repair Date -> Taller
    // 3. If Today >= Warehouse Entry -> Bodega (Back from Taller)
    // 4. If Today >= Property Due -> Propiedad

    // This sequence allows the phases to override each other chronologically
    let newLoc = 'bodega';

    if (repair && today >= repair) newLoc = 'taller';
    if (warehouseRet && today >= warehouseRet) newLoc = 'bodega';
    if (propertyDue && today >= propertyDue) newLoc = 'propiedad';

    item.location = newLoc;
}

function getGCalLink(title, dateStr) {
    if (!dateStr) return '#';
    const start = dateStr.replace(/-/g, '');
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    const end = d.toISOString().split('T')[0].replace(/-/g, '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}`;
}

window.deleteItem = async (id, e) => {
    e.stopPropagation();
    if (!confirm('¿Estás seguro de ELIMINAR esta pieza permanentemente?')) return;
    STATE.items = STATE.items.filter(i => i.id !== id);
    await saveAll();
    renderInventory(document.getElementById('content-area'));
};
