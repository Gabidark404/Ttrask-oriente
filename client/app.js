/* ============================================
   TTRAKS ORIENTE — Frontend App
   v2.0 — Premium UI + Optimizations
   ============================================ */

// ---------- SUPABASE CLIENT ----------
const supabaseUrl = 'https://plvikymtlgxmpbuborsz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdmlreW10bGd4bXBidWJvcnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNjk5NjgsImV4cCI6MjA5NzY0NTk2OH0.1-0o_h0VIqWASZhXpn5HaYqDyMKZfFlk_OsBbH4ke54';
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

// ---------- API CONFIG ----------
const API_BASE = '/api';   // Relative — works in production (Vercel) and locally
let currentPage = 0;
const PAGE_SIZE = 20;
let herramientaSeleccionadaCode = null;

// Track which tabs have been loaded (lazy loading)
const loadedTabs = new Set();

// ---------- INIT ----------
function initApp() {
    checkAuth();
    setupNavigation();
    setupFilters();
    setupImport();
    setupModal();
    setupLogout();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// ---------- UTILITIES ----------
function formatDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('es-VE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        });
    } catch { return iso; }
}

function formatDateShort(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('es-VE', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    } catch { return iso; }
}

// ---------- AUTH ----------
function checkAuth() {
    const token = localStorage.getItem('supabase-token');
    if (!token) {
        showLoginModal();
    } else {
        hideLoginModal();
        const role = localStorage.getItem('supabase-role') || 'tecnico';
        const user = localStorage.getItem('supabase-user') || 'Usuario';
        applyRoleUI(role, user);
        // Lazy: only load dashboard on init
        loadDashboard();
    }
}

function showLoginModal() {
    document.getElementById('login-modal').classList.add('open');
    const loginBtn = document.getElementById('login-btn');
    // Prevent duplicate listeners
    loginBtn.onclick = login;
    document.getElementById('login-pass').onkeypress = (e) => {
        if (e.key === 'Enter') login();
    };
}

function hideLoginModal() {
    document.getElementById('login-modal').classList.remove('open');
    document.body.classList.remove('unauthenticated');
}

async function login() {
    const userInput = document.getElementById('login-user').value.trim();
    const passInput = document.getElementById('login-pass').value;
    const errorEl   = document.getElementById('login-error');
    const loginBtn  = document.getElementById('login-btn');

    if (!userInput || !passInput) {
        errorEl.innerText = 'El correo y la contraseña son obligatorios';
        return;
    }

    errorEl.innerText = '';
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="material-symbols-outlined" style="animation:spin 0.8s linear infinite">sync</span> Conectando...';

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: userInput,
            password: passInput
        });

        if (error) {
            errorEl.innerText = error.message === 'Invalid login credentials'
                ? 'Correo o contraseña incorrectos'
                : error.message;
            return;
        }

        const token = data.session.access_token;
        localStorage.setItem('supabase-token', token);
        localStorage.setItem('supabase-user', userInput);

        const { data: userInfo } = await supabase.auth.getUser();
        const role = userInfo?.user?.app_metadata?.role || 'tecnico';
        localStorage.setItem('supabase-role', role);

        hideLoginModal();
        applyRoleUI(role, userInput);
        loadedTabs.clear();
        loadDashboard();

    } catch (err) {
        errorEl.innerText = 'Error de conexión: ' + err.message;
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span class="material-symbols-outlined">login</span> Iniciar Sesión';
    }
}

function setupLogout() {
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        loadedTabs.clear();
        document.getElementById('user-display').innerText = '';
        // Reset to dashboard tab
        switchTab('dashboard');
        showLoginModal();
    });
}

// ---------- ROLE-BASED UI ----------
function applyRoleUI(role, userEmail) {
    // Show username (extract name from email for cleaner display)
    const displayName = userEmail.split('@')[0] || userEmail;
    document.getElementById('user-display').innerText = `${displayName} · ${role === 'supervisor' ? '🔑 Supervisor' : '👤 Técnico'}`;

    // Show/hide role-restricted tabs
    document.querySelectorAll('[data-role-required]').forEach(el => {
        const required = el.getAttribute('data-role-required');
        if (required === 'supervisor' && role !== 'supervisor') {
            el.style.display = 'none';
        } else {
            el.style.display = '';
        }
    });
}

// ---------- API CALLS ----------
async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('supabase-token');
    const headers = { Authorization: `Bearer ${token}`, ...options.headers };

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const resp = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

    // Session expired
    if (resp.status === 401) {
        localStorage.clear();
        showLoginModal();
        throw new Error('Sesión expirada. Por favor inicia sesión de nuevo.');
    }

    if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: resp.statusText }));
        throw new Error(err.error || resp.statusText);
    }
    return resp.json();
}

// ---------- NAVIGATION ----------
function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    document.getElementById('refresh-dashboard').addEventListener('click', () => {
        loadedTabs.delete('dashboard');
        loadDashboard();
    });
}

function switchTab(tabId) {
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
        b.removeAttribute('aria-current');
    });
    const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeBtn) activeBtn.setAttribute('aria-current', 'page');

    // Update sections
    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
    const section = document.getElementById(`tab-${tabId}`);
    if (section) section.classList.add('active');

    // Load data for the tab (always reload on every click for responsiveness)
    if (tabId === 'dashboard')   { loadedTabs.delete('dashboard');   loadDashboard(); }
    if (tabId === 'catalogo')    { loadedTabs.delete('catalogo');    loadCatalogo(0); }
    if (tabId === 'supervision') { loadedTabs.delete('supervision'); loadSupervision(); }
    // 'importar' has no initial data to load
}

// ---------- TOAST NOTIFICATIONS ----------
const TOAST_ICONS = {
    success: 'check_circle',
    error:   'error',
    warning: 'warning',
    info:    'info'
};

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="material-symbols-outlined toast-icon">${TOAST_ICONS[type] || 'info'}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.transition = 'opacity 0.3s, transform 0.3s';
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(110%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ---------- DASHBOARD ----------
async function loadDashboard() {
    loadedTabs.add('dashboard');
    try {
        const data = await apiFetch('/inventory/dashboard');
        const vals = {
            'metric-total':         data.total        || 0,
            'metric-disponibles':   data.disponible   || 0,
            'metric-prestadas':     data.prestada     || 0,
            'metric-mantenimiento': data.mantenimiento|| 0,
            'metric-extraviadas':   data.extraviada   || 0,
            'metric-pendientes':    data.pendientes   || 0,
        };
        Object.entries(vals).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val;
        });

        const badge = document.getElementById('badge-pendientes');
        if (badge) {
            badge.innerText = data.pendientes || 0;
            badge.style.display = data.pendientes > 0 ? 'inline-block' : 'none';
        }
    } catch (err) {
        console.error('Dashboard error:', err);
        showToast('Error al cargar dashboard: ' + err.message, 'error');
    }

    // Also load notifications (part of dashboard view)
    loadNotifications();

    // Load recent history
    try {
        const reqData = await apiFetch('/requests?limit=10');
        const tbody = document.getElementById('history-table-body');
        const rows = reqData.data || [];
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state" style="padding:24px">No hay movimientos recientes</td></tr>';
            return;
        }
        tbody.innerHTML = rows.map(r => `
            <tr>
                <td><strong style="color:var(--primary-dark)">${r.toolName || '—'}</strong></td>
                <td style="color:var(--text-secondary)">${r.user || '—'}</td>
                <td style="color:var(--text-muted);font-size:11.5px">${formatDateShort(r.requestDate)}</td>
                <td><span class="status-tag status-${r.status}">${r.status}</span></td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('History error:', err);
    }
}

// ---------- NOTIFICATIONS ----------
async function loadNotifications() {
    try {
        const data = await apiFetch('/notifications?limit=30');
        const list = document.getElementById('notifications-list');
        const items = data.data || [];
        if (!items.length) {
            list.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">notifications_off</span><p>No hay notificaciones</p></div>';
            return;
        }
        list.innerHTML = items.map(n => `
            <div class="notification-item">
                <p class="notification-msg">${n.message}</p>
                <div class="notification-meta">
                    <span><strong>Por:</strong> ${n.user || '—'}</span>
                    <span>${formatDate(n.createdAt)}</span>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Notifications error:', err);
    }
}

// ---------- CATÁLOGO ----------
async function loadCatalogo(page = 0) {
    currentPage = page;
    loadedTabs.add('catalogo');
    const tbody = document.getElementById('catalogo-table-body');
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state" style="padding:28px">
        <span class="material-symbols-outlined" style="animation:spin 0.8s linear infinite">sync</span>
        <p>Cargando inventario...</p>
    </td></tr>`;

    try {
        const search = document.getElementById('search-input').value.trim();
        const status = document.getElementById('status-filter').value;
        const brand  = document.getElementById('brand-filter').value;

        const params = new URLSearchParams({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
        if (search) params.set('search', search);
        if (status) params.set('status', status);
        if (brand)  params.set('brand', brand);

        const resp  = await apiFetch(`/inventory?${params}`);
        const tools = resp.data || [];

        // Pagination
        const total      = resp.pagination?.total ?? tools.length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        document.getElementById('page-info').innerText = `Página ${page + 1} de ${totalPages}`;
        document.getElementById('prev-page').disabled = page === 0;
        document.getElementById('next-page').disabled = page >= totalPages - 1;
        document.getElementById('prev-page').onclick = () => loadCatalogo(page - 1);
        document.getElementById('next-page').onclick = () => loadCatalogo(page + 1);

        // Brand filter — preserve selection
        const brandSelect    = document.getElementById('brand-filter');
        const currentBrand   = brandSelect.value;
        const allBrands = [...new Set(tools.map(t => t.brand).filter(Boolean))].sort();
        brandSelect.innerHTML = '<option value="">Todas las marcas</option>' +
            allBrands.map(b => `<option value="${b}" ${b === currentBrand ? 'selected' : ''}>${b}</option>`).join('');

        if (!tools.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state" style="padding:28px"><span class="material-symbols-outlined">search_off</span><p>No se encontraron herramientas con esos filtros</p></td></tr>';
            return;
        }

        tbody.innerHTML = tools.map(tool => `
            <tr>
                <td class="text-center" style="font-weight:600;color:var(--text-muted);font-size:12px">${tool.item || '—'}</td>
                <td>
                    <strong style="color:var(--primary-dark)">${tool.code}</strong><br>
                    <span class="font-mono">${tool.codification || '—'}</span>
                </td>
                <td>
                    <span style="font-weight:600;color:var(--text-main);font-size:13px">${tool.description}</span>
                </td>
                <td style="color:var(--text-secondary)">${tool.brand || '—'}</td>
                <td class="text-center">
                    <strong style="font-size:15px">${tool.available}</strong>
                    <span style="color:var(--text-muted);font-size:11px"> / ${tool.quantity}</span>
                </td>
                <td style="color:var(--text-muted);font-size:12px">${tool.location || '—'}</td>
                <td><span class="status-tag status-${(tool.status || '').replace(/ /g, '-')}">${getStatusIcon(tool.status)} ${tool.status}</span></td>
                <td class="text-center">
                    <button class="btn btn-primary btn-sm"
                        onclick="abrirSolicitudModal('${tool.code}')"
                        ${tool.available <= 0 || tool.status !== 'Disponible' ? 'disabled' : ''}
                        aria-label="Solicitar ${tool.description}">
                        Solicitar
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-state" style="padding:28px;color:#EF4444"><span class="material-symbols-outlined">error</span><p>Error: ${err.message}</p></td></tr>`;
        showToast('Error al cargar catálogo: ' + err.message, 'error');
    }
}

function getStatusIcon(status) {
    const icons = {
        'Disponible':       '🟢',
        'Prestada':         '🟡',
        'Reservada':        '🔵',
        'En mantenimiento': '🟠',
        'Extraviada':       '🔴',
        'Fuera de servicio':'⚫'
    };
    return icons[status] || '';
}

function setupFilters() {
    let debounceTimer;
    document.getElementById('search-input').addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => loadCatalogo(0), 300);
    });
    document.getElementById('status-filter').addEventListener('change', () => loadCatalogo(0));
    document.getElementById('brand-filter').addEventListener('change',  () => loadCatalogo(0));
}

// ---------- MODAL SOLICITUD ----------
function setupModal() {
    const overlay    = document.getElementById('solicitud-modal');
    const closeBtn   = document.getElementById('close-modal-btn');
    const cancelBtn  = document.getElementById('cancel-modal-btn');
    const form       = document.getElementById('solicitud-form');

    const closeModal = () => overlay.classList.remove('open');

    [closeBtn, cancelBtn].forEach(btn => btn.addEventListener('click', closeModal));
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const motivo = document.getElementById('motivo-input').value.trim();
        const fecha  = document.getElementById('fecha-input').value;
        const user   = localStorage.getItem('supabase-user') || 'Técnico de Guardia';
        const submitBtn = form.querySelector('[type="submit"]');

        if (!motivo) {
            showToast('El motivo es obligatorio', 'warning');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="material-symbols-outlined" style="animation:spin 0.8s linear infinite">sync</span> Enviando...';

        try {
            await apiFetch('/requests', {
                method: 'POST',
                body: JSON.stringify({
                    code: herramientaSeleccionadaCode,
                    reason: motivo,
                    estimatedReturnDate: fecha ? new Date(fecha).toISOString() : null,
                    user
                })
            });
            closeModal();
            form.reset();
            showToast('✅ Solicitud enviada al supervisor', 'success');

            // Refresh dashboard and supervision without full reload
            loadedTabs.delete('dashboard');
            loadedTabs.delete('supervision');
            loadDashboard();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="material-symbols-outlined">send</span> Enviar al Supervisor';
        }
    });
}

window.abrirSolicitudModal = async function(code) {
    herramientaSeleccionadaCode = code;
    try {
        const tool = await apiFetch(`/inventory/code/${code}`);
        document.getElementById('modal-tool-name').innerText = tool.description;
        document.getElementById('modal-tool-meta').innerText =
            `Código: ${tool.code}  ·  Ubicación: ${tool.location || 'N/A'}  ·  Disponibles: ${tool.available} de ${tool.quantity}`;
        const badge = document.getElementById('modal-tool-status');
        badge.innerText = tool.status;
        badge.className = `status-tag status-${(tool.status || '').replace(/ /g, '-')}`;
        document.getElementById('solicitud-modal').classList.add('open');
    } catch (err) {
        showToast('Error al obtener herramienta: ' + err.message, 'error');
    }
};

// ---------- SUPERVISIÓN ----------
async function loadSupervision() {
    const container = document.getElementById('supervision-list');
    const filter    = document.getElementById('supervision-filter').value;
    const role      = localStorage.getItem('supabase-role');
    loadedTabs.add('supervision');

    if (role !== 'supervisor') {
        container.innerHTML = `
            <div class="empty-state" style="padding:60px 40px">
                <span class="material-symbols-outlined" style="color:#EF4444">lock</span>
                <p>Acceso restringido — Solo supervisores</p>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="empty-state" style="padding:60px 40px">
            <span class="material-symbols-outlined" style="animation:spin 0.8s linear infinite">sync</span>
            <p>Cargando solicitudes...</p>
        </div>`;

    try {
        const url  = filter ? `/requests?status=${encodeURIComponent(filter)}` : '/requests';
        const resp = await apiFetch(url);
        const data = resp.data || [];

        if (!data.length) {
            container.innerHTML = `
                <div class="empty-state" style="padding:60px 40px">
                    <span class="material-symbols-outlined">check_circle</span>
                    <p>No hay solicitudes ${filter ? `con estado "${filter}"` : ''}</p>
                </div>`;
            return;
        }

        container.innerHTML = data.map(r => {
            const statusClass = (r.status || '').toLowerCase();
            return `
            <div class="supervision-card status-${statusClass}">
                <div class="sup-info">
                    <h4>${r.toolName || '—'}</h4>
                    <p><strong>Solicitante:</strong> ${r.user || '—'}</p>
                    <p><strong>Motivo:</strong> "${r.reason || '—'}"</p>
                    <p><strong>Retorno estimado:</strong> ${formatDate(r.estimatedReturnDate)}</p>
                    <div class="sup-meta">
                        <span class="material-symbols-outlined" style="font-size:14px">schedule</span>
                        Solicitado: ${formatDate(r.requestDate)}
                    </div>
                </div>
                <div class="sup-actions">
                    ${r.status === 'Pendiente' ? `
                        <button class="btn btn-success btn-sm" onclick="resolverSolicitud(${r.id}, 'Aprobada')" aria-label="Aprobar solicitud">
                            <span class="material-symbols-outlined">check</span> Aprobar
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="resolverSolicitud(${r.id}, 'Rechazada')" aria-label="Rechazar solicitud">
                            <span class="material-symbols-outlined">close</span> Rechazar
                        </button>
                    ` : `<span class="status-tag status-${r.status}">${r.status}</span>`}
                </div>
            </div>`;
        }).join('');

    } catch (err) {
        container.innerHTML = `
            <div class="empty-state" style="padding:60px 40px;color:#EF4444">
                <span class="material-symbols-outlined">error</span>
                <p>Error: ${err.message}</p>
            </div>`;
    }
}

document.getElementById('supervision-filter')?.addEventListener('change', () => {
    loadedTabs.delete('supervision');
    loadSupervision();
});

window.resolverSolicitud = async function(id, nuevoEstado) {
    const btn = event?.currentTarget;
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-symbols-outlined" style="animation:spin 0.8s linear infinite;font-size:14px">sync</span>'; }

    try {
        await apiFetch(`/requests/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: nuevoEstado })
        });
        showToast(`Solicitud ${nuevoEstado === 'Aprobada' ? '✅ aprobada' : '❌ rechazada'} correctamente`, nuevoEstado === 'Aprobada' ? 'success' : 'warning');
        loadedTabs.delete('supervision');
        loadedTabs.delete('dashboard');
        loadSupervision();
        loadDashboard();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
        if (btn) { btn.disabled = false; }
    }
};

// ---------- IMPORT EXCEL ----------
function setupImport() {
    const dropZone  = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('keypress', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });

    dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer?.files?.[0];
        if (file) handleFileUpload(file);
    });

    fileInput.addEventListener('change', e => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(file);
    });
}

async function handleFileUpload(file) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        showToast('El archivo debe ser Excel (.xlsx o .xls)', 'error');
        return;
    }

    const loadingEl = document.getElementById('import-loading');
    const reportEl  = document.getElementById('import-report');
    loadingEl.hidden = false;
    reportEl.hidden  = true;

    try {
        const form  = new FormData();
        form.append('excel', file);

        const token = localStorage.getItem('supabase-token');
        const resp  = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ error: 'Error en la importación' }));
            throw new Error(err.error);
        }

        const data = await resp.json();
        loadingEl.hidden = true;

        document.getElementById('rep-proc').innerText   = data.report?.processed || 0;
        document.getElementById('rep-nuevas').innerText = data.report?.added     || 0;
        document.getElementById('rep-act').innerText    = data.report?.updated   || 0;
        document.getElementById('rep-err').innerText    = data.report?.errors    || 0;

        const errorDetailsEl = document.getElementById('error-details');
        const errorList      = document.getElementById('error-list');
        if (data.report?.errorDetails?.length > 0) {
            errorDetailsEl.hidden = false;
            errorList.innerHTML = data.report.errorDetails.map(e => `<li>${e}</li>`).join('');
        } else {
            errorDetailsEl.hidden = true;
        }

        reportEl.hidden = false;
        showToast(`Importación completada: ${data.report?.added} nuevas, ${data.report?.updated} actualizadas`, 'success');

        // Invalidate cached tabs
        loadedTabs.delete('dashboard');
        loadedTabs.delete('catalogo');

    } catch (err) {
        loadingEl.hidden = true;
        showToast('Error de importación: ' + err.message, 'error');
    }
}

// ---------- CLEAR NOTIFICATIONS ----------
document.getElementById('clear-notifications')?.addEventListener('click', () => {
    document.getElementById('notifications-list').innerHTML =
        '<div class="empty-state"><span class="material-symbols-outlined">notifications_off</span><p>No hay notificaciones</p></div>';
});