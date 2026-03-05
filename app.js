// ============================================
// CONFIGURACIÓN
// ============================================
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxmPBIboe_Evn45ZHjtkjydbmlPRMuSax_sEiTc2iN8cqqi2i4-Pf_lOd6875cQXEd_yg/exec';
const WHATSAPP_BOT_URL = 'https://bot-yy1q.onrender.com/send';
const WHATSAPP_NUMBER = '120363406622431210@g.us';
const PANEL_URL = 'https://diegoturijancontacto-sudo.github.io/search/panel.html';

// ============================================
// ESTADO GLOBAL
// ============================================
let proyectos = [];
let subproyectos = [];
let tareas = [];
let responsables = [];
let comentarios = [];
let historial = [];

// Navegación jerárquica
let currentProyecto = null;
let currentSubproyecto = null;
let currentTarea = null;
let currentNavLevel = 'home'; // 'home' | 'proyecto' | 'subproyecto' | 'tarea_detail'

let ganttConfig = { pxPerDay: 50, headerStep: 1 };
let currentUserFilter = '';
let currentPriorityFilter = '';
let currentStatusFilter = '';

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    checkCurrentUser();
    renderCurrentLevel(); // Render initial state immediately
    refreshData();        // Then load data from backend
    const ganttScrollArea = document.getElementById('gantt-scroll-area');
    if (ganttScrollArea) {
        ganttScrollArea.addEventListener('scroll', function (e) {
            document.getElementById('gantt-project-list').scrollTop = e.target.scrollTop;
        });
    }
});

// ============================================
// SESIÓN DE USUARIO
// ============================================
function checkCurrentUser() {
    const userJson = sessionStorage.getItem('currentUser');
    const display = document.getElementById('current-user-display');
    if (!userJson) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(userJson);
    display.innerText = '\u{1F464} ' + user.name + ' (' + getRoleLabel(user.role) + ')';
}

function getRoleLabel(role) {
    switch (role) {
        case 'director': return 'Director';
        case 'supervisor': return 'Supervisor';
        case 'responsable': return 'Responsable';
        default: return role;
    }
}

function getCurrentUser() {
    const userJson = sessionStorage.getItem('currentUser');
    return userJson ? JSON.parse(userJson) : null;
}

function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// ============================================
// CARGA DE DATOS
// ============================================
function showLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
}

async function refreshData() {
    if (!WEB_APP_URL) return;
    showLoading(true);
    try {
        const response = await fetch(WEB_APP_URL);
        const responseText = await response.text();
        let data;
        try { data = JSON.parse(responseText); } catch (e) {
            console.error('Error parsing JSON:', e);
            return;
        }
        if (data.error) {
            console.error('Error del servidor:', data.error);
            return;
        }
        proyectos = data.proyectos || [];
        subproyectos = data.subproyectos || [];
        tareas = data.tareas || [];
        responsables = data.responsables || [];
        comentarios = data.comentarios || [];
        historial = data.historial || [];

        console.log('Proyectos:', proyectos.length, 'Subproyectos:', subproyectos.length, 'Tareas:', tareas.length);

        renderCurrentLevel();
        updateResponsableSelect();
        updateUserFilterSelect();
    } catch (error) {
        console.error('Error al cargar datos:', error);
    } finally {
        showLoading(false);
    }
}

// ============================================
// NAVEGACIÓN JERÁRQUICA
// ============================================
function navigateTo(level) {
    if (level === 'home') {
        currentProyecto = null;
        currentSubproyecto = null;
        currentTarea = null;
        currentNavLevel = 'home';
    } else if (level === 'proyecto') {
        currentSubproyecto = null;
        currentTarea = null;
        currentNavLevel = 'proyecto';
    } else if (level === 'subproyecto') {
        currentTarea = null;
        currentNavLevel = 'subproyecto';
    }
    renderCurrentLevel();
}

function selectProyecto(id) {
    currentProyecto = proyectos.find(p => p.id === id);
    currentSubproyecto = null;
    currentNavLevel = 'proyecto';
    renderCurrentLevel();
}

function selectSubproyecto(id) {
    currentSubproyecto = subproyectos.find(s => s.id === id);
    currentNavLevel = 'subproyecto';
    renderCurrentLevel();
}

function renderCurrentLevel() {
    updateBreadcrumb();
    updateHeaderActions();
    updateFilterBar();
    renderSidebar();

    document.getElementById('view-global-tasks').classList.add('hidden');
    document.getElementById('view-subproyectos').classList.add('hidden');
    document.getElementById('view-tareas').classList.add('hidden');
    document.getElementById('view-tarea-detalle').classList.add('hidden');
    document.getElementById('view-form-cuenta').classList.add('hidden');
    document.getElementById('view-form-programa').classList.add('hidden');

    // Toggle main element layout for tarea_detail (needs its own scroll + sticky header)
    var mainEl = document.querySelector('main');
    if (currentNavLevel === 'tarea_detail') {
        mainEl.classList.remove('overflow-y-auto');
        mainEl.classList.add('overflow-hidden', 'flex', 'flex-col');
    } else {
        mainEl.classList.remove('overflow-hidden', 'flex', 'flex-col');
        mainEl.classList.add('overflow-y-auto');
    }

    if (currentNavLevel === 'home') {
        document.getElementById('view-global-tasks').classList.remove('hidden');
        renderGlobalTasksList();
    } else if (currentNavLevel === 'proyecto') {
        document.getElementById('view-subproyectos').classList.remove('hidden');
        renderSubproyectos();
    } else if (currentNavLevel === 'subproyecto') {
        document.getElementById('view-tareas').classList.remove('hidden');
        renderTareasBoard();
        renderTareasList();
    } else if (currentNavLevel === 'tarea_detail') {
        document.getElementById('view-tarea-detalle').classList.remove('hidden');
        renderTareaDetalle();
    } else if (currentNavLevel === 'cuenta_form') {
        document.getElementById('view-form-cuenta').classList.remove('hidden');
    } else if (currentNavLevel === 'programa_form') {
        document.getElementById('view-form-programa').classList.remove('hidden');
    }
}

function updateBreadcrumb() {
    const elProyecto = document.getElementById('breadcrumb-proyecto');
    const elSubproyecto = document.getElementById('breadcrumb-subproyecto');
    const elTarea = document.getElementById('breadcrumb-tarea');
    const elProyectoBtn = document.getElementById('breadcrumb-proyecto-btn');
    const elSubproyectoBtn = document.getElementById('breadcrumb-subproyecto-btn');
    const elTareaName = document.getElementById('breadcrumb-tarea-name');

    elProyecto.classList.add('hidden');
    elSubproyecto.classList.add('hidden');
    if (elTarea) elTarea.classList.add('hidden');

    if (currentNavLevel === 'proyecto' || currentNavLevel === 'programa_form') {
        elProyecto.classList.remove('hidden');
        elProyecto.style.display = 'inline-flex';
        elProyectoBtn.innerText = currentProyecto ? currentProyecto.nombre : '';
    } else if (currentNavLevel === 'subproyecto') {
        elProyecto.classList.remove('hidden');
        elProyecto.style.display = 'inline-flex';
        elProyectoBtn.innerText = currentProyecto ? currentProyecto.nombre : '';
        elSubproyecto.classList.remove('hidden');
        elSubproyecto.style.display = 'inline-flex';
        if (elSubproyectoBtn) elSubproyectoBtn.innerText = currentSubproyecto ? currentSubproyecto.nombre : '';
    } else if (currentNavLevel === 'tarea_detail') {
        elProyecto.classList.remove('hidden');
        elProyecto.style.display = 'inline-flex';
        elProyectoBtn.innerText = currentProyecto ? currentProyecto.nombre : '';
        elSubproyecto.classList.remove('hidden');
        elSubproyecto.style.display = 'inline-flex';
        if (elSubproyectoBtn) elSubproyectoBtn.innerText = currentSubproyecto ? currentSubproyecto.nombre : '';
        if (elTarea && currentTarea) {
            elTarea.classList.remove('hidden');
            elTarea.style.display = 'inline-flex';
            elTareaName.innerText = (currentTarea.detalles || '').substring(0, 40) + (currentTarea.detalles && currentTarea.detalles.length > 40 ? '…' : '');
        }
    }
}

function updateHeaderActions() {
    const user = getCurrentUser();
    const isDirector = user && user.role === 'director';
    const container = document.getElementById('header-actions');
    let extraBtns = '';

    if (currentNavLevel === 'proyecto' && isDirector) {
        extraBtns = '<button onclick="openSubproyectoModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-semibold shadow-sm transition-all flex items-center gap-2 text-sm"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" /></svg> Nuevo Programa</button>';
    } else if ((currentNavLevel === 'subproyecto' || currentNavLevel === 'tarea_detail') && isDirector) {
        extraBtns = '<button onclick="openTareaModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-semibold shadow-sm transition-all flex items-center gap-2 text-sm"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" /></svg> Nueva Tarea</button>';
    }

    container.innerHTML = extraBtns + '<button onclick="refreshData()" class="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg font-medium shadow-sm transition-all text-sm">Actualizar</button><a href="admin.html" class="text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg> Usuarios</a><a href="index.html" class="text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-1">📄 Documentación</a>';
}

function updateFilterBar() {
    const bar = document.getElementById('filter-bar');
    if (currentNavLevel === 'subproyecto') {
        bar.classList.remove('hidden');
        bar.style.display = 'block';
    } else {
        bar.classList.add('hidden');
    }
}

// ============================================
// SIDEBAR
// ============================================
function renderSidebar() {
    const cuentasPanel = document.getElementById('sidebar-cuentas');
    const programasPanel = document.getElementById('sidebar-programas');
    const tareasPanel = document.getElementById('sidebar-tareas');

    // Show "Nueva Cuenta" button only for directors
    const user = getCurrentUser();
    const btnNuevaCuenta = document.getElementById('btn-nueva-cuenta');
    if (btnNuevaCuenta) btnNuevaCuenta.classList.toggle('hidden', !(user && user.role === 'director'));

    if (currentNavLevel === 'home' || currentNavLevel === 'cuenta_form') {
        cuentasPanel.classList.remove('hidden');
        cuentasPanel.style.display = 'flex';
        if (programasPanel) { programasPanel.classList.add('hidden'); programasPanel.style.display = 'none'; }
        tareasPanel.classList.add('hidden'); tareasPanel.style.display = 'none';
        renderSidebarCuentas();
    } else if (currentNavLevel === 'proyecto' || currentNavLevel === 'programa_form') {
        cuentasPanel.classList.add('hidden'); cuentasPanel.style.display = 'none';
        if (programasPanel) {
            programasPanel.classList.remove('hidden');
            programasPanel.style.display = 'flex';
        }
        tareasPanel.classList.add('hidden'); tareasPanel.style.display = 'none';
        renderSidebarProgramas();
    } else {
        cuentasPanel.classList.add('hidden'); cuentasPanel.style.display = 'none';
        if (programasPanel) { programasPanel.classList.add('hidden'); programasPanel.style.display = 'none'; }
        tareasPanel.classList.remove('hidden');
        tareasPanel.style.display = 'flex';
        renderSidebarTareas();
    }
}

function renderSidebarProgramas() {
    const container = document.getElementById('sidebar-programas-list');
    const cuentaLabel = document.getElementById('sidebar-programas-cuenta');
    const btnNuevo = document.getElementById('btn-nuevo-programa-sidebar');
    if (!container) return;

    if (cuentaLabel && currentProyecto) {
        cuentaLabel.textContent = currentProyecto.nombre || '';
    }

    const user = getCurrentUser();
    if (btnNuevo) btnNuevo.classList.toggle('hidden', !(user && user.role === 'director'));

    const subs = subproyectos.filter(function (s) {
        return s.id_proyecto === (currentProyecto ? currentProyecto.id : null);
    });

    if (subs.length === 0) {
        container.innerHTML = '<p class="text-center text-slate-400 text-sm py-6">No hay programas</p>';
        return;
    }

    container.innerHTML = subs.map(function (s) {
        const taskCount = tareas.filter(function (t) { return t.id_subproyecto === s.id; }).length;
        const firstChar = (s.nombre || '?').charAt(0).toUpperCase();
        const isActive = currentSubproyecto && currentSubproyecto.id === s.id;
        const activeClass = isActive
            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
            : 'border-transparent hover:bg-slate-50 text-slate-700';
        return '<div onclick="selectSubproyecto(\'' + s.id + '\')" class="w-full flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer text-left transition-all ' + activeClass + '">' +
            '<div class="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm flex-shrink-0">' + firstChar + '</div>' +
            '<div class="min-w-0 flex-1">' +
            '<p class="font-semibold text-sm truncate">' + (s.nombre || 'Sin nombre') + '</p>' +
            '<p class="text-xs text-slate-400">' + taskCount + ' tarea' + (taskCount !== 1 ? 's' : '') + '</p>' +
            '</div>' +
            '</div>';
    }).join('');
}

function renderSidebarCuentas() {
    const container = document.getElementById('sidebar-cuentas-list');
    if (!container) return;

    if (proyectos.length === 0) {
        container.innerHTML = '<p class="text-center text-slate-400 text-sm py-6">No hay cuentas</p>';
        return;
    }

    container.innerHTML = proyectos.map(function (p) {
        const isActive = currentProyecto && currentProyecto.id === p.id;
        const firstChar = (p.nombre || '?').charAt(0).toUpperCase();
        const progCount = subproyectos.filter(function (s) { return s.id_proyecto === p.id; }).length;
        const activeClass = isActive
            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
            : 'border-transparent hover:bg-slate-50 text-slate-700';
        const editBtn = (getCurrentUser() && getCurrentUser().role === 'director')
            ? '<button onclick="event.stopPropagation(); openProyectoModal(\'' + p.id + '\')" class="ml-auto text-slate-400 hover:text-indigo-600 flex-shrink-0 p-1 rounded" title="Editar"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>'
            : '';

        return '<div onclick="selectProyecto(\'' + p.id + '\')" class="w-full flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer text-left transition-all ' + activeClass + '">' +
            '<div class="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">' + firstChar + '</div>' +
            '<div class="min-w-0 flex-1">' +
            '<p class="font-semibold text-sm truncate">' + (p.nombre || 'Sin nombre') + '</p>' +
            '<p class="text-xs text-slate-400">' + progCount + ' programa' + (progCount !== 1 ? 's' : '') + '</p>' +
            '</div>' +
            editBtn +
            '</div>';
    }).join('');
}

function renderSidebarTareas() {
    const container = document.getElementById('sidebar-tareas-list');
    const programaLabel = document.getElementById('sidebar-tareas-programa');
    if (!container) return;

    if (programaLabel && currentSubproyecto) {
        programaLabel.textContent = currentSubproyecto.nombre || '';
    }

    const tareasActuales = getTareasActuales();

    if (tareasActuales.length === 0) {
        container.innerHTML = '<p class="text-center text-slate-400 text-sm py-6">No hay tareas</p>';
        return;
    }

    container.innerHTML = tareasActuales.map(function (t) {
        const isActive = currentTarea && currentTarea.id === t.id;
        const prioColor = getPriorityColor(t.prioridad);
        const prioIcon = getPriorityIcon(t.prioridad);
        const statusBadge = getStatusBadge(t.estatus);
        const activeClass = isActive
            ? 'bg-indigo-50 border-indigo-200'
            : 'border-transparent hover:bg-slate-50';

        return '<div onclick="selectTareaDetalle(\'' + t.id + '\')" class="w-full flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer text-left transition-all ' + activeClass + '">' +
            '<span class="text-xs font-bold px-1.5 py-0.5 rounded-full mt-0.5 flex-shrink-0 ' + prioColor + '">' + prioIcon + '</span>' +
            '<div class="min-w-0">' +
            '<p class="text-sm text-slate-700 leading-snug line-clamp-2">' + (t.detalles || 'Sin detalles') + '</p>' +
            '<p class="text-[10px] text-slate-400 mt-0.5 font-medium">' + statusBadge.label + '</p>' +
            '</div>' +
            '</div>';
    }).join('');
}

// ============================================
// RENDER: CUENTAS (sidebar, antes PROYECTOS)
// ============================================
function renderProyectos() {
    renderSidebarCuentas();
}

// ============================================
// RENDER: TAREAS GLOBALES (home level)
// ============================================
function renderGlobalTasksList() {
    const container = document.getElementById('view-global-tasks');
    if (!container) return;

    if (tareas.length === 0) {
        container.innerHTML = '<div class="text-center py-16 text-slate-400"><p class="text-lg mb-2">No hay tareas aún</p><p class="text-sm">Selecciona una cuenta y abre un programa para empezar</p></div>';
        return;
    }

    container.innerHTML =
        '<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">' +
        '<div class="p-4 border-b border-slate-200 flex items-center justify-between">' +
        '<div><h2 class="font-bold text-slate-700 text-lg">Todas las Tareas</h2>' +
        '<p class="text-sm text-slate-400 mt-0.5">' + tareas.length + ' tarea' + (tareas.length !== 1 ? 's' : '') + ' en total</p></div>' +
        '</div>' +
        '<div class="overflow-x-auto">' +
        '<table class="w-full text-left border-collapse">' +
        '<thead class="bg-slate-50 border-b border-slate-200"><tr>' +
        '<th class="p-4 font-semibold text-slate-600">Tarea</th>' +
        '<th class="p-4 font-semibold text-slate-600">Cuenta / Programa</th>' +
        '<th class="p-4 font-semibold text-slate-600 text-center">Prioridad</th>' +
        '<th class="p-4 font-semibold text-slate-600 text-center">Estado</th>' +
        '<th class="p-4 font-semibold text-slate-600 text-center">Responsable</th>' +
        '<th class="p-4 font-semibold text-slate-600 text-center">Vencimiento</th>' +
        '</tr></thead>' +
        '<tbody id="global-tasks-content"></tbody>' +
        '</table></div></div>';

    const tbody = document.getElementById('global-tasks-content');
    tareas.forEach(function (tarea) {
        const resp = responsables.find(function (r) { return r.id === tarea.id_responsable; });
        const respNombre = resp ? resp.nombre : 'Sin asignar';
        const prioColor = getPriorityColor(tarea.prioridad);
        const prioIcon = getPriorityIcon(tarea.prioridad);
        const statusBadge = getStatusBadge(tarea.estatus);

        const sub = subproyectos.find(function (s) { return s.id === tarea.id_subproyecto; });
        const proy = sub ? proyectos.find(function (p) { return p.id === sub.id_proyecto; }) : null;
        const locationHtml = (proy && sub)
            ? '<span class="font-medium text-slate-700">' + proy.nombre + '</span>' +
              '<span class="text-slate-400"> / ' + sub.nombre + '</span>'
            : '<span class="text-slate-400">—</span>';

        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer';
        tr.onclick = function () {
            if (sub && proy) {
                currentProyecto = proy;
                currentSubproyecto = sub;
                currentTarea = tarea;
                currentNavLevel = 'tarea_detail';
                renderCurrentLevel();
            }
        };

        tr.innerHTML =
            '<td class="p-4 text-slate-700 max-w-xs"><p class="text-sm leading-snug">' + (tarea.detalles || 'Sin detalles') + '</p></td>' +
            '<td class="p-4 text-sm">' + locationHtml + '</td>' +
            '<td class="p-4 text-center"><span class="text-xs px-2 py-1 rounded-full font-bold ' + prioColor + '">' + prioIcon + ' ' + (tarea.prioridad || 'media') + '</span></td>' +
            '<td class="p-4 text-center"><span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ' + statusBadge.class + '">' + statusBadge.label + '</span></td>' +
            '<td class="p-4 text-center text-slate-500 text-sm">' + respNombre + '</td>' +
            '<td class="p-4 text-center text-slate-500 text-sm">' + (tarea.fecha_limite || '—') + '</td>';

        tbody.appendChild(tr);
    });
}

// ============================================
// NAVEGACIÓN: TAREA DETALLE
// ============================================
function selectTareaDetalle(tareaId) {
    currentTarea = tareas.find(function (t) { return t.id === tareaId; });
    currentNavLevel = 'tarea_detail';
    renderCurrentLevel();
}

function renderTareaDetalle() {
    const container = document.getElementById('tarea-detalle-content');
    const header = document.getElementById('tarea-doc-header');
    if (!container) return;
    if (!currentTarea) {
        if (header) header.innerHTML = '';
        container.innerHTML = '<p class="text-slate-400">Selecciona una tarea en la barra lateral</p>';
        return;
    }

    const t = currentTarea;
    const resp = responsables.find(function (r) { return r.id === t.id_responsable; });
    const respNombre = resp ? resp.nombre : 'Sin asignar';
    const prioColor = getPriorityColor(t.prioridad);
    const prioIcon = getPriorityIcon(t.prioridad);
    const statusBadge = getStatusBadge(t.estatus);
    const user = getCurrentUser();
    const canEdit = user && (user.role === 'director' || user.role === 'supervisor');
    const isSupervisor = user && (user.role === 'supervisor' || user.role === 'director');
    const isDirector = user && user.role === 'director';
    const commentCount = comentarios.filter(function (c) { return c.id_tarea === t.id; }).length;

    // ── Document header (sticky bar) ──────────────────────────────────────────
    if (header) {
        var editBtn = canEdit
            ? '<button onclick="openInlineEditForm(\'' + t.id + '\')" class="ml-auto flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors flex-shrink-0">' +
              '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>' +
              'Editar</button>'
            : '';
        var dupBtn = isDirector
            ? '<button onclick="duplicateTarea(\'' + t.id + '\')" class="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-200 flex-shrink-0">⧉ Duplicar</button>'
            : '';

        header.innerHTML =
            '<button onclick="navigateTo(\'subproyecto\')" class="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 font-medium text-xs transition-colors flex-shrink-0 mr-1">' +
            '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>Tablero</button>' +
            '<span class="text-slate-200 text-sm">|</span>' +
            '<span class="text-xs px-2 py-1 rounded-full font-bold flex-shrink-0 ' + prioColor + '">' + prioIcon + ' ' + (t.prioridad || 'media') + '</span>' +
            '<span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ' + statusBadge.class + '">' + statusBadge.label + '</span>' +
            '<span class="text-xs text-slate-600 flex-shrink-0 hidden sm:flex items-center gap-1">👤 ' + escapeHtml(respNombre) + '</span>' +
            (t.fecha_limite ? '<span class="text-xs text-slate-500 flex-shrink-0 hidden sm:flex items-center gap-1">📅 ' + escapeHtml(t.fecha_limite) + '</span>' : '') +
            dupBtn + editBtn;
    }

    // ── Action buttons based on status ────────────────────────────────────────
    let actionBtns = '';
    const isLocked = t.estatus === 'bloqueada';
    if (isLocked) {
        actionBtns = isSupervisor
            ? '<button onclick="desbloquearTarea(\'' + t.id + '\')" class="flex items-center gap-1.5 bg-green-100 text-green-700 hover:bg-green-200 px-4 py-2 rounded-lg text-sm font-semibold">🔓 Desbloquear</button>'
            : '<span class="text-sm text-red-500 font-medium">🔒 Tarea bloqueada</span>';
    } else if (t.estatus === 'pendiente') {
        actionBtns = '<button onclick="quickChangeEstatus(\'' + t.id + '\', \'en_curso\')" class="flex items-center gap-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 rounded-lg text-sm font-semibold">▶ Iniciar</button>';
        if (isSupervisor) actionBtns += '<button onclick="bloquearTarea(\'' + t.id + '\')" class="flex items-center gap-1.5 bg-red-100 text-red-600 hover:bg-red-200 px-4 py-2 rounded-lg text-sm font-semibold">🔒 Bloquear</button>';
    } else if (t.estatus === 'en_curso') {
        actionBtns = '<button onclick="quickChangeEstatus(\'' + t.id + '\', \'pendiente\')" class="flex items-center gap-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-lg text-sm font-semibold">⏸ Pausar</button>' +
            '<button onclick="quickChangeEstatus(\'' + t.id + '\', \'en_revision\')" class="flex items-center gap-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 px-4 py-2 rounded-lg text-sm font-semibold">🔍 Enviar a revisión</button>';
        if (isSupervisor) actionBtns += '<button onclick="bloquearTarea(\'' + t.id + '\')" class="flex items-center gap-1.5 bg-red-100 text-red-600 hover:bg-red-200 px-4 py-2 rounded-lg text-sm font-semibold">🔒 Bloquear</button>';
    } else if (t.estatus === 'en_revision' && isSupervisor) {
        actionBtns = '<button onclick="openAprobacionModal(\'' + t.id + '\')" class="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-4 py-2 rounded-lg text-sm font-semibold">✅ Aprobar / Rechazar</button>';
    }

    // ── Entregables section ────────────────────────────────────────────────────
    var entregables = Array.isArray(t.entregables) ? t.entregables : [];
    var medioLabel = function (m, otro) {
        return ({ opcore: 'OpCore', drive: 'Drive', whatsapp: 'WhatsApp', correo: 'Correo', fisica: 'Física', otro: otro || 'Otro' })[m] || m;
    };
    var entregablesSection = '';
    if (canEdit || entregables.length > 0) {
        var entRows = entregables.length > 0
            ? entregables.map(function (en) {
                var editBtns = canEdit
                    ? '<button onclick="openEntregableModal(\'' + t.id + '\', \'' + en.id + '\')" class="opacity-0 group-hover:opacity-100 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-opacity ml-2">Editar</button>' +
                      '<button onclick="deleteEntregableItem(\'' + t.id + '\', \'' + en.id + '\')" class="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 font-medium transition-opacity ml-1">✕</button>'
                    : '';
                return '<div class="flex items-start gap-2.5 py-1.5 group">' +
                    '<input type="checkbox" disabled class="mt-0.5 w-4 h-4 text-indigo-600 rounded flex-shrink-0 cursor-default">' +
                    '<div class="flex-1 min-w-0">' +
                    '<span class="text-sm text-slate-700">' + escapeHtml(en.descripcion_entregable || '') + '</span>' +
                    (en.formato_requerido || en.medio_entrega ? '<span class="block text-xs text-slate-400 mt-0.5">' + (en.formato_requerido ? escapeHtml(en.formato_requerido) + ' · ' : '') + (en.medio_entrega ? medioLabel(en.medio_entrega, en.medio_otro) : '') + '</span>' : '') +
                    '</div>' + editBtns + '</div>';
            }).join('')
            : '<p class="text-sm text-slate-400 italic py-1">Sin entregables definidos</p>';

        entregablesSection = '<div class="mb-6 pb-6 border-b border-slate-100">' +
            '<div class="flex items-center justify-between mb-2">' +
            '<h3 class="font-semibold text-slate-700 text-xs uppercase tracking-wider">📋 Entregables (' + entregables.length + ')</h3>' +
            (canEdit ? '<button onclick="openEntregableModal(\'' + t.id + '\')" class="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-1 rounded-lg font-semibold">+ Agregar</button>' : '') +
            '</div>' +
            entRows +
            '</div>';
    }

    // ── Document content ───────────────────────────────────────────────────────
    container.innerHTML =
        // Big document title
        '<h2 class="text-3xl font-bold text-slate-800 leading-tight mb-4">' + escapeHtml(t.detalles || 'Sin título') + '</h2>' +
        (t.asignacion ? '<p class="text-xs text-slate-400 font-mono mb-4">#' + escapeHtml(t.asignacion) + '</p>' : '') +
        // Action buttons
        (actionBtns ? '<div class="flex flex-wrap gap-2 mb-6 pb-6 border-b border-slate-100">' + actionBtns + '</div>' : '') +
        // Entregables (above description)
        entregablesSection +
        // Description
        (t.descripcion ? '<div class="mb-6"><div class="text-slate-700 text-base leading-relaxed doc-editor" style="pointer-events:none">' + t.descripcion + '</div></div>' : '') +
        // Attachments
        buildAdjuntosHtml_(t, isSupervisor) +
        // Comments button
        '<div class="pt-4 border-t border-slate-100">' +
        '<button onclick="showTareaComments(\'' + t.id + '\')" class="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium">' +
        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>' +
        'Ver Comentarios (' + commentCount + ')' +
        '</button>' +
        '</div>';
}

function selectTareaDetalleAndEdit(tareaId) {
    var found = tareas.find(function (t) { return t.id === tareaId; });
    if (!found) return;
    currentTarea = found;
    currentNavLevel = 'tarea_detail';
    renderCurrentLevel();
    openInlineEditForm(tareaId);
}

function openInlineEditForm(id) {
    var t = tareas.find(function (x) { return x.id === id; });
    if (!t) return;
    var user = getCurrentUser();
    var isPrivileged = user && (user.role === 'supervisor' || user.role === 'director');
    if (t.estatus === 'bloqueada' && !isPrivileged) {
        alert('Esta tarea está bloqueada y no puede ser modificada.');
        return;
    }

    var respOptions = '<option value="">Sin asignar</option>';
    responsables.forEach(function (r) {
        respOptions += '<option value="' + r.id + '"' + (t.id_responsable === r.id ? ' selected' : '') + '>' + escapeHtml(r.nombre) + '</option>';
    });
    var statusOpts =
        '<option value="pendiente"' + (t.estatus === 'pendiente' ? ' selected' : '') + '>Pendiente</option>' +
        '<option value="en_curso"' + (t.estatus === 'en_curso' ? ' selected' : '') + '>En Curso</option>' +
        '<option value="en_revision"' + (t.estatus === 'en_revision' ? ' selected' : '') + '>En Revisión</option>' +
        (isPrivileged ? '<option value="completado"' + (t.estatus === 'completado' ? ' selected' : '') + '>Completado</option><option value="bloqueada"' + (t.estatus === 'bloqueada' ? ' selected' : '') + '>🔒 Bloqueada</option>' : '');

    // ── Sticky doc header ─────────────────────────────────────────────────────
    var header = document.getElementById('tarea-doc-header');
    if (header) {
        var selectClass = 'px-2 py-1 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white text-xs font-medium text-slate-700 cursor-pointer';
        header.innerHTML =
            '<button type="button" onclick="renderTareaDetalle()" class="flex items-center gap-1 text-slate-500 hover:text-slate-700 font-medium text-xs transition-colors flex-shrink-0 mr-1">' +
            '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>Cancelar</button>' +
            '<span class="text-slate-200 text-sm flex-shrink-0">|</span>' +
            '<select id="inline_responsable" class="' + selectClass + '">' + respOptions + '</select>' +
            '<select id="inline_prioridad" class="' + selectClass + '">' +
            '<option value="alta"' + (t.prioridad === 'alta' ? ' selected' : '') + '>🔴 Alta</option>' +
            '<option value="media"' + ((t.prioridad === 'media' || !t.prioridad) ? ' selected' : '') + '>🟡 Media</option>' +
            '<option value="baja"' + (t.prioridad === 'baja' ? ' selected' : '') + '>🟢 Baja</option>' +
            '</select>' +
            '<select id="inline_estatus" class="' + selectClass + '">' + statusOpts + '</select>' +
            '<input type="date" id="inline_fecha_limite" value="' + escapeHtml(t.fecha_limite || '') + '" class="' + selectClass + '">' +
            '<button type="button" onclick="saveInlineTareaBtn(\'' + id + '\')" id="btn-save-inline-tarea" class="ml-auto flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex-shrink-0">' +
            '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Guardar</button>';
    }

    // ── Inline entregables list ────────────────────────────────────────────────
    var entregables = Array.isArray(t.entregables) ? t.entregables : [];
    var inputClass = 'flex-1 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-400 focus:outline-none text-sm py-1.5 text-slate-700 transition-colors';
    var entRowsHtml = entregables.map(function (en) {
        return '<div class="flex items-center gap-2 group" data-ent-row="1" data-ent-id="' + escapeHtml(en.id) + '" data-formato="' + escapeHtml(en.formato_requerido || '') + '" data-medio="' + escapeHtml(en.medio_entrega || 'opcore') + '" data-medio-otro="' + escapeHtml(en.medio_otro || '') + '">' +
            '<input type="checkbox" class="w-4 h-4 text-indigo-600 rounded cursor-pointer flex-shrink-0">' +
            '<input type="text" value="' + escapeHtml(en.descripcion_entregable || '') + '" placeholder="Describir entregable..." class="' + inputClass + '">' +
            '<button type="button" onclick="this.closest(\'[data-ent-row]\').remove()" class="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 text-sm leading-none">✕</button>' +
            '</div>';
    }).join('');

    // ── Rich text editor: load existing description ───────────────────────────
    var descContent = t.descripcion || '';

    // ── Document content ───────────────────────────────────────────────────────
    var container = document.getElementById('tarea-detalle-content');
    container.innerHTML =
        // Big document title
        '<textarea id="inline_detalles" class="doc-title mb-6" rows="2" placeholder="Título de la tarea..." required>' + escapeHtml(t.detalles || '') + '</textarea>' +
        // Entregables section
        '<div class="mb-6 pb-6 border-b border-slate-100">' +
        '<div class="flex items-center justify-between mb-2">' +
        '<h3 class="font-semibold text-slate-700 text-xs uppercase tracking-wider">📋 Entregables</h3>' +
        '</div>' +
        '<div id="inline-entregables-list" class="space-y-0.5">' + entRowsHtml + '</div>' +
        '<button type="button" onclick="addInlineEntregable()" class="mt-2 flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-700 font-medium">' +
        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>' +
        'Agregar entregable</button>' +
        '</div>' +
        // Rich text toolbar
        '<div class="mb-2 pb-2 border-b border-slate-100 flex items-center gap-1">' +
        '<button type="button" onclick="execFormatCmd(\'bold\')" class="toolbar-btn font-bold" title="Negrita">B</button>' +
        '<button type="button" onclick="execFormatCmd(\'italic\')" class="toolbar-btn italic" title="Cursiva">I</button>' +
        '<span class="text-slate-200 text-sm mx-1">|</span>' +
        '<button type="button" onclick="execFormatCmd(\'insertUnorderedList\')" class="toolbar-btn" title="Lista">• Lista</button>' +
        '<button type="button" onclick="execFormatCmd(\'insertOrderedList\')" class="toolbar-btn" title="Lista numerada">1. Lista</button>' +
        '</div>' +
        // Contenteditable description
        '<div id="inline_descripcion_rich" contenteditable="true" data-placeholder="Descripción, contexto, instrucciones…" class="doc-editor mb-6 text-slate-700 min-h-[160px]">' + descContent + '</div>' +
        // Adjuntos
        buildInlineAdjuntosHtml(t, isPrivileged) +
        // Delete (privileged)
        (isPrivileged ? '<button type="button" onclick="deleteTareaInline(\'' + id + '\')" class="w-full mt-4 text-red-400 text-sm font-medium hover:text-red-600 hover:underline">Eliminar Tarea</button>' : '');

    // Auto-resize title textarea
    var titleEl = document.getElementById('inline_detalles');
    if (titleEl) {
        titleEl.style.height = 'auto';
        titleEl.style.height = titleEl.scrollHeight + 'px';
        titleEl.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    }
}

async function saveInlineTarea(e, id) {
    e.preventDefault();
    await _doSaveInlineTarea(id);
}

async function saveInlineTareaBtn(id) {
    await _doSaveInlineTarea(id);
}

async function _doSaveInlineTarea(id) {
    var t = tareas.find(function (x) { return x.id === id; });
    if (!t) return;
    var id_responsable = document.getElementById('inline_responsable') ? document.getElementById('inline_responsable').value : t.id_responsable;
    var prioridad = document.getElementById('inline_prioridad') ? document.getElementById('inline_prioridad').value : t.prioridad;
    var estatus = document.getElementById('inline_estatus') ? document.getElementById('inline_estatus').value : t.estatus;
    var detalles = document.getElementById('inline_detalles') ? document.getElementById('inline_detalles').value : t.detalles;
    var fecha_limite = document.getElementById('inline_fecha_limite') ? document.getElementById('inline_fecha_limite').value : t.fecha_limite;
    // Read rich text content
    var descripcionEl = document.getElementById('inline_descripcion_rich');
    var descripcion = descripcionEl ? normalizeRichTextContent(descripcionEl.innerHTML) : (document.getElementById('inline_descripcion') ? document.getElementById('inline_descripcion').value : t.descripcion);

    if (!detalles || !detalles.trim()) {
        alert('El título de la tarea no puede estar vacío.');
        return;
    }

    var data = {
        id: id,
        id_subproyecto: t.id_subproyecto,
        id_responsable: id_responsable,
        prioridad: prioridad,
        estatus: estatus,
        detalles: detalles,
        descripcion: descripcion,
        adjuntos: t.adjuntos || [],
        fecha_inicio: t.fecha_inicio || null,
        fecha_limite: fecha_limite
    };

    showLoading(true);
    setButtonLoading('btn-save-inline-tarea', true);
    try {
        var idx = tareas.findIndex(function (x) { return x.id === id; });
        var estatusAnterior = tareas[idx] ? tareas[idx].estatus : null;
        tareas[idx] = Object.assign({}, tareas[idx], data);
        currentTarea = tareas[idx];
        await postToBackend('tarea_update', data);
        if (estatusAnterior && estatusAnterior !== estatus) {
            sendWhatsAppNotification('🔄 TAREA ACTUALIZADA: *' + (detalles || id) + '*\n📊 Estado: ' + estatusAnterior + ' → ' + estatus + '\n📅 ' + new Date().toLocaleString('es-ES') + '\n🔗 ' + PANEL_URL);
        }

        // Sync inline entregables
        var newEntregables = getInlineEntregables();
        if (newEntregables !== null) {
            var originalEntregables = Array.isArray(t.entregables) ? t.entregables : [];
            await syncInlineEntregables(id, originalEntregables, newEntregables);
            tareas[idx].entregables = newEntregables;
            currentTarea = tareas[idx];
        }

        renderTareasBoard();
        renderTareasList();
        var inlineAdjEl = document.getElementById('inline_adjuntos');
        if (inlineAdjEl && inlineAdjEl.files && inlineAdjEl.files.length > 0) {
            await uploadAttachments(id, inlineAdjEl.files);
            await refreshData();
        } else {
            renderTareaDetalle();
        }
    } finally {
        showLoading(false);
        setButtonLoading('btn-save-inline-tarea', false);
    }
}

// ============================================
// DOCUMENT EDITOR HELPERS
// ============================================

// Normalize rich text content — returns empty string for visually-empty editors
function normalizeRichTextContent(html) {
    if (!html) return '';
    // Create a temporary element to get the plain text content
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    if (!tmp.textContent.trim()) return '';
    return html;
}

// Execute rich text format command
function execFormatCmd(cmd) {
    document.getElementById('inline_descripcion_rich').focus();
    document.execCommand(cmd, false, null);
}

// Add a new entregable row to the inline list
function addInlineEntregable() {
    var list = document.getElementById('inline-entregables-list');
    if (!list) return;
    var inputClass = 'flex-1 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-400 focus:outline-none text-sm py-1.5 text-slate-700 transition-colors';
    var row = document.createElement('div');
    row.className = 'flex items-center gap-2 group';
    row.setAttribute('data-ent-row', '1');
    row.setAttribute('data-ent-id', '');
    row.setAttribute('data-formato', '');
    row.setAttribute('data-medio', 'opcore');
    row.setAttribute('data-medio-otro', '');
    row.innerHTML =
        '<input type="checkbox" class="w-4 h-4 text-indigo-600 rounded cursor-pointer flex-shrink-0">' +
        '<input type="text" placeholder="Describir entregable..." class="' + inputClass + '">' +
        '<button type="button" onclick="this.closest(\'[data-ent-row]\').remove()" class="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 text-sm leading-none">✕</button>';
    list.appendChild(row);
    var inp = row.querySelector('input[type="text"]');
    if (inp) inp.focus();
}

// Read entregables from the inline edit form
function getInlineEntregables() {
    var list = document.getElementById('inline-entregables-list');
    if (!list) return null;
    var rows = list.querySelectorAll('[data-ent-row]');
    return Array.from(rows).map(function (row) {
        var inp = row.querySelector('input[type="text"]');
        var chk = row.querySelector('input[type="checkbox"]');
        var entId = row.getAttribute('data-ent-id');
        return {
            id: entId || ('ent_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)),
            descripcion_entregable: inp ? inp.value.trim() : '',
            completado: chk ? chk.checked : false,
            formato_requerido: row.getAttribute('data-formato') || '',
            medio_entrega: row.getAttribute('data-medio') || 'opcore',
            medio_otro: row.getAttribute('data-medio-otro') || ''
        };
    }).filter(function (e) { return e.descripcion_entregable; });
}

// Sync entregables between original and new arrays
async function syncInlineEntregables(tareaId, originalEntregables, newEntregables) {
    var user = getCurrentUser();
    var origIds = originalEntregables.map(function (e) { return e.id; });
    var newIds = newEntregables.filter(function (e) { return e.id; }).map(function (e) { return e.id; });

    // Delete removed
    for (var orig of originalEntregables) {
        if (!newIds.includes(orig.id)) {
            await postToBackend('tarea_entregable_delete', { id_tarea: tareaId, entregableId: orig.id, id_actor: user ? user.id : '' });
        }
    }
    // Add new or update changed
    for (var newEnt of newEntregables) {
        if (origIds.includes(newEnt.id)) {
            var origEnt = originalEntregables.find(function (e) { return e.id === newEnt.id; });
            if (origEnt && origEnt.descripcion_entregable !== newEnt.descripcion_entregable) {
                // Preserve original fields, only update description
                var updated = Object.assign({}, origEnt, { descripcion_entregable: newEnt.descripcion_entregable });
                await postToBackend('tarea_entregable_update', { id_tarea: tareaId, entregable: updated, id_actor: user ? user.id : '' });
                newEnt.formato_requerido = origEnt.formato_requerido;
                newEnt.medio_entrega = origEnt.medio_entrega;
                newEnt.medio_otro = origEnt.medio_otro;
            }
        } else {
            await postToBackend('tarea_entregable_add', { id_tarea: tareaId, entregable: newEnt, id_actor: user ? user.id : '' });
        }
    }
}

async function deleteTareaInline(id) {
    if (!id || !confirm('¿Eliminar esta tarea? Esta acción no se puede deshacer.')) return;
    tareas = tareas.filter(function (t) { return t.id !== id; });
    currentTarea = null;
    currentNavLevel = 'subproyecto';
    renderTareasBoard();
    renderTareasList();
    renderCurrentLevel();
    await postToBackend('tarea_delete', { id: id });
}
function renderSubproyectos() {
    const container = document.getElementById('view-subproyectos');
    const user = getCurrentUser();
    const isDirector = user && user.role === 'director';
    const subs = subproyectos.filter(function (s) { return s.id_proyecto === (currentProyecto ? currentProyecto.id : null); });

    if (subs.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-16 text-slate-400"><p class="text-lg mb-2">No hay programas en esta cuenta</p>' + (isDirector ? '<p class="text-sm">Haz clic en "Nuevo Programa" para comenzar</p>' : '') + '</div>';
        return;
    }

    container.innerHTML = '<div class="col-span-full mb-4"><button onclick="navigateTo(\'home\')" class="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 font-medium text-sm transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg> Cuentas</button></div>' +
    subs.map(function (s) {
        const taskCount = tareas.filter(function (t) { return t.id_subproyecto === s.id; }).length;
        const completadoCount = tareas.filter(function (t) { return t.id_subproyecto === s.id && t.estatus === 'completado'; }).length;
        const enRevisionCount = tareas.filter(function (t) { return t.id_subproyecto === s.id && t.estatus === 'en_revision'; }).length;
        const enCursoCount = tareas.filter(function (t) { return t.id_subproyecto === s.id && t.estatus === 'en_curso'; }).length;
        const pendienteCount = tareas.filter(function (t) { return t.id_subproyecto === s.id && t.estatus === 'pendiente'; }).length;
        const progress = taskCount > 0 ? Math.round((completadoCount / taskCount) * 100) : 0;
        const firstChar = (s.nombre || '?').charAt(0).toUpperCase();
        const asignHtml = s.asignacion ? '<p class="text-[11px] text-slate-400 font-mono mt-1">#' + s.asignacion + '</p>' : '';
        const editBtn = isDirector ? '<button onclick="event.stopPropagation(); openSubproyectoModal(\'' + s.id + '\')" class="text-xs text-indigo-500 hover:text-indigo-700 font-medium">Editar</button>' : '';
        const descHtml = s.descripcion ? '<p class="text-sm text-slate-500 mb-2 line-clamp-2">' + s.descripcion + '</p>' : '';
        const fechasHtml = (s.fecha_inicio || s.fecha_fin_estimada) ? '<div class="flex gap-2 text-xs text-slate-400 mb-3">' + (s.fecha_inicio ? '<span>📅 ' + s.fecha_inicio + '</span>' : '') + (s.fecha_fin_estimada ? '<span>🏁 ' + s.fecha_fin_estimada + '</span>' : '') + '</div>' : '';
        const countersHtml = '<div class="flex gap-1 mb-3 flex-wrap">' +
            (pendienteCount > 0 ? '<span class="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">' + pendienteCount + ' pendiente</span>' : '') +
            (enCursoCount > 0 ? '<span class="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">' + enCursoCount + ' en curso</span>' : '') +
            (enRevisionCount > 0 ? '<span class="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">' + enRevisionCount + ' en revisión</span>' : '') +
            (completadoCount > 0 ? '<span class="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold">' + completadoCount + ' completado</span>' : '') +
            '</div>';

        return '<div onclick="selectSubproyecto(\'' + s.id + '\')" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group">' +
            '<div class="flex items-start justify-between mb-3">' +
            '<div class="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-lg group-hover:bg-violet-200 transition-colors">' + firstChar + '</div>' +
            '<span class="text-xs text-slate-400 font-medium">' + taskCount + ' tarea' + (taskCount !== 1 ? 's' : '') + '</span>' +
            '</div>' +
            '<h3 class="font-bold text-slate-800 text-lg mb-1">' + (s.nombre || 'Sin nombre') + '</h3>' +
            asignHtml +
            descHtml +
            fechasHtml +
            countersHtml +
            '<div class="w-full bg-slate-100 rounded-full h-1.5 mb-3"><div class="bg-emerald-500 h-1.5 rounded-full transition-all" style="width:' + progress + '%"></div></div>' +
            '<div class="flex items-center justify-between pt-2 border-t border-slate-100"><span class="text-xs text-slate-400">' + progress + '% completado</span>' + editBtn + '</div>' +
            '</div>';
    }).join('');
}

// ============================================
// RENDER: TAREAS (KANBAN)
// ============================================
function getTareasActuales() {
    let result = tareas.filter(function (t) { return t.id_subproyecto === (currentSubproyecto ? currentSubproyecto.id : null); });
    if (currentUserFilter) {
        const resp = responsables.find(function (r) { return r.nombre === currentUserFilter; });
        if (resp) result = result.filter(function (t) { return t.id_responsable === resp.id; });
    }
    if (currentPriorityFilter) {
        result = result.filter(function (t) { return t.prioridad === currentPriorityFilter; });
    }
    if (currentStatusFilter) {
        result = result.filter(function (t) { return t.estatus === currentStatusFilter; });
    }
    return result;
}

function renderTareasBoard() {
    const cols = ['en_curso', 'pendiente', 'en_revision', 'completado', 'bloqueada'];
    const tareasActuales = getTareasActuales();
    const user = getCurrentUser();
    const isSupervisor = user && user.role === 'supervisor';
    const isDirector = user && user.role === 'director';

    cols.forEach(function (col) {
        const container = document.getElementById('col-' + col);
        if (!container) return;
        container.innerHTML = '';
        const filtered = tareasActuales.filter(function (t) { return t.estatus === col; });
        document.getElementById('count-' + col).innerText = filtered.length;
        filtered.forEach(function (tarea) {
            const card = createTareaCard(tarea, isSupervisor, isDirector);
            container.appendChild(card);
        });
    });
    renderSidebarTareas();
}

function createTareaCard(tarea, isSupervisor, isDirector) {
    const card = document.createElement('div');
    const isLocked = tarea.estatus === 'bloqueada';
    card.className = 'bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-shadow' + (isLocked ? ' opacity-75' : '');
    card.style.borderLeft = '4px solid ' + getPriorityBorderColor(tarea.prioridad);
    card.draggable = !isLocked && tarea.estatus !== 'completado';
    card.id = 'tarea-' + tarea.id;
    card.ondragstart = function (e) { e.dataTransfer.setData('text/plain', tarea.id); };
    card.addEventListener('click', function () { selectTareaDetalle(tarea.id); });

    const resp = responsables.find(function (r) { return r.id === tarea.id_responsable; });
    const respNombre = resp ? resp.nombre : 'Sin asignar';

    const asignacionHtml = tarea.asignacion
        ? '<p class="text-[10px] text-slate-400 font-mono mt-1">#' + tarea.asignacion + '</p>'
        : '';

    const prioColor = getPriorityColor(tarea.prioridad);
    const prioIcon = getPriorityIcon(tarea.prioridad);
    const commentCount = comentarios.filter(function (c) { return c.id_tarea === tarea.id; }).length;
    const isSupervisorOrDirector = isSupervisor || isDirector;
    const canEdit = isSupervisorOrDirector && !isLocked;
    const duplicateBtnHtml = isDirector ? '<button onclick="event.stopPropagation(); duplicateTarea(\'' + tarea.id + '\')" class="text-slate-400 hover:bg-amber-100 hover:text-amber-600 p-1 rounded" title="Duplicar">⧉</button>' : '';

    // NUEVO: botón de descripción
    const hasDesc = (tarea.descripcion || '').trim().length > 0;
    const descBtnHtml = hasDesc
        ? '<button onclick="event.stopPropagation(); showTareaDescripcion(\'' + tarea.id + '\')" class="text-slate-400 hover:bg-slate-100 p-1 rounded" title="Descripción">' +
        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path>' +
        '</svg>' +
        '</button>'
        : '';

    const commentBtnHtml = '<button onclick="event.stopPropagation(); showTareaComments(\'' + tarea.id + '\')" class="text-slate-400 hover:bg-slate-100 p-1 rounded relative" title="Comentarios"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>' + (commentCount > 0 ? '<span class="absolute -top-1 -right-1 bg-indigo-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center">' + commentCount + '</span>' : '') + '</button>';
    const editBtnHtml = canEdit ? '<button onclick="event.stopPropagation(); selectTareaDetalleAndEdit(\'' + tarea.id + '\')" class="text-slate-400 hover:bg-slate-100 p-1 rounded" title="Editar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>' : '';
    const lockBtnHtml = isSupervisorOrDirector && !isLocked ? '<button onclick="event.stopPropagation(); bloquearTarea(\'' + tarea.id + '\')" class="text-slate-400 hover:bg-red-100 hover:text-red-600 p-1 rounded" title="Bloquear">🔒</button>' : '';
    const unlockBtnHtml = isSupervisorOrDirector && isLocked ? '<button onclick="event.stopPropagation(); desbloquearTarea(\'' + tarea.id + '\')" class="text-red-400 hover:bg-green-100 hover:text-green-600 p-1 rounded" title="Desbloquear">🔓</button>' : '';

    let actionBtns = '';
    if (isLocked) {
        actionBtns = '<span class="text-xs text-red-500 font-medium">🔒 Tarea bloqueada</span>';
    } else if (tarea.estatus === 'pendiente') {
        actionBtns = '<button onclick="event.stopPropagation(); quickChangeEstatus(\'' + tarea.id + '\', \'en_curso\')" class="text-xs bg-blue-100 text-blue-600 hover:bg-blue-200 px-2 py-1 rounded-md font-medium">▶ Iniciar</button>';
    } else if (tarea.estatus === 'en_curso') {
        actionBtns = '<button onclick="event.stopPropagation(); quickChangeEstatus(\'' + tarea.id + '\', \'pendiente\')" class="text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-1 rounded-md font-medium">⏸ Pausar</button>' +
            '<button onclick="event.stopPropagation(); quickChangeEstatus(\'' + tarea.id + '\', \'en_revision\')" class="text-xs bg-amber-100 text-amber-600 hover:bg-amber-200 px-2 py-1 rounded-md font-medium">🔍 Enviar a revisión</button>';
    } else if (tarea.estatus === 'en_revision') {
        if (isSupervisor || isDirector) {
            actionBtns = '<button onclick="event.stopPropagation(); openAprobacionModal(\'' + tarea.id + '\')" class="text-xs bg-emerald-100 text-emerald-600 hover:bg-emerald-200 px-2 py-1 rounded-md font-medium">✅ Aprobar / Rechazar</button>';
        }
    }

    const fechaHtml = tarea.fecha_limite ? '<p class="text-xs text-slate-400 mt-1">📅 ' + tarea.fecha_limite + '</p>' : '';

    card.innerHTML =
        '<div class="flex items-start justify-between mb-2">' +
        '<span class="text-xs font-bold px-2 py-0.5 rounded-full ' + prioColor + '">' + prioIcon + ' ' + (tarea.prioridad || 'media') + '</span>' +
        '<div class="flex gap-1">' + descBtnHtml + commentBtnHtml + lockBtnHtml + unlockBtnHtml + editBtnHtml + duplicateBtnHtml + '</div>' +
        '</div>' +
        '<p class="text-sm text-slate-700 mb-1 leading-snug">' + (tarea.detalles || 'Sin detalles') + '</p>' +
        asignacionHtml +
        '<p class="text-xs text-slate-400 font-medium">' + respNombre + '</p>' +
        fechaHtml +
        '<div class="flex flex-wrap gap-1 mt-3 pt-2 border-t border-slate-100">' + actionBtns + '</div>';

    return card;
}

// ============================================
// RENDER: LISTA DE TAREAS
// ============================================
function renderTareasList() {
    const container = document.getElementById('list-content');
    if (!container) return;
    container.innerHTML = '';
    const tareasActuales = getTareasActuales();
    const user = getCurrentUser();
    const canEdit = user && (user.role === 'director' || user.role === 'supervisor');
    const isDirector = user && user.role === 'director';

    tareasActuales.forEach(function (tarea) {
        const resp = responsables.find(function (r) { return r.id === tarea.id_responsable; });
        const respNombre = resp ? resp.nombre : 'Sin asignar';
        const prioColor = getPriorityColor(tarea.prioridad);
        const statusBadge = getStatusBadge(tarea.estatus);
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer';
        tr.onclick = function () { selectTareaDetalle(tarea.id); };

        const editBtn = canEdit
            ? '<button onclick="event.stopPropagation(); selectTareaDetalleAndEdit(\'' + tarea.id + '\')" class="text-indigo-500 hover:bg-indigo-50 p-2 rounded-lg text-xs font-bold uppercase">Editar</button>'
            : '';

        const duplicateBtn = isDirector
            ? '<button onclick="event.stopPropagation(); duplicateTarea(\'' + tarea.id + '\')" class="text-amber-600 hover:bg-amber-50 p-2 rounded-lg text-xs font-bold uppercase">Duplicar</button>'
            : '';

        const hasDesc = (tarea.descripcion || '').trim().length > 0;
        const descBtn = hasDesc
            ? '<button onclick="event.stopPropagation(); showTareaDescripcion(\'' + tarea.id + '\')" class="text-slate-400 hover:bg-slate-100 p-2 rounded-lg" title="Ver descripción">📝</button>'
            : '';

        const asignacionHtml = tarea.asignacion
            ? '<p class="text-[10px] text-slate-400 font-mono mt-1">#' + tarea.asignacion + '</p>'
            : '';

        tr.innerHTML =
            '<td class="p-4 text-slate-700 max-w-xs">' +
            '<p class="text-sm leading-snug">' + (tarea.detalles || 'Sin detalles') + '</p>' +
            asignacionHtml +
            '<p class="text-[10px] text-slate-400 font-mono mt-0.5">' + (tarea.id || '') + '</p>' +
            '</td>' +
            '<td class="p-4 text-center text-slate-500 text-sm">' + respNombre + '</td>' +
            '<td class="p-4 text-center"><span class="text-xs px-2 py-1 rounded-full font-bold ' + prioColor + '">' + getPriorityIcon(tarea.prioridad) + ' ' + (tarea.prioridad || 'media') + '</span></td>' +
            '<td class="p-4 text-center"><span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ' + statusBadge.class + '">' + statusBadge.label + '</span></td>' +
            '<td class="p-4 text-center text-slate-500 text-sm">' + (tarea.fecha_limite || '-') + '</td>' +
            '<td class="p-4 text-right"><div class="flex gap-1 justify-end">' + descBtn + editBtn + duplicateBtn + '</div></td>';

        container.appendChild(tr);
    });
}

// ============================================
// GANTT
// ============================================
function changeZoom(direction) {
    if (direction === 'in') { ganttConfig.pxPerDay = 50; ganttConfig.headerStep = 1; }
    else { ganttConfig.pxPerDay = 12; ganttConfig.headerStep = 7; }
    renderGantt();
}

function renderGantt() {
    const listContainer = document.getElementById('gantt-project-list');
    const headerContainer = document.getElementById('gantt-header');
    const barsContainer = document.getElementById('gantt-bars-area');
    const gridContainer = document.getElementById('gantt-grid-lines');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    headerContainer.innerHTML = '';
    barsContainer.innerHTML = '';
    gridContainer.innerHTML = '';

    const tareasActuales = getTareasActuales();
    const validTareas = tareasActuales.filter(function (t) { return t.fecha_creacion && t.fecha_limite; });

    if (validTareas.length === 0) {
        listContainer.innerHTML = '<div class="p-6 text-sm text-slate-400">Sin fechas definidas.</div>';
        return;
    }

    let minDate = new Date(Math.min.apply(null, validTareas.map(function (t) { return new Date(t.fecha_creacion); })));
    let maxDate = new Date(Math.max.apply(null, validTareas.map(function (t) { return new Date(t.fecha_limite); })));
    minDate.setDate(minDate.getDate() - 3);
    maxDate.setDate(maxDate.getDate() + 10);

    const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));

    for (let i = 0; i <= totalDays; i++) {
        const currentDate = new Date(minDate);
        currentDate.setDate(minDate.getDate() + i);
        const leftPos = i * ganttConfig.pxPerDay;

        const line = document.createElement('div');
        line.className = 'absolute top-0 bottom-0 border-r border-slate-100';
        line.style.left = leftPos + 'px';
        line.style.width = ganttConfig.pxPerDay + 'px';
        gridContainer.appendChild(line);

        if (i % ganttConfig.headerStep === 0) {
            const dateCell = document.createElement('div');
            dateCell.className = 'absolute top-0 h-full flex items-center justify-center text-[10px] text-slate-400 border-r border-slate-200 truncate px-1 uppercase font-bold';
            dateCell.style.left = leftPos + 'px';
            dateCell.style.width = (ganttConfig.pxPerDay * ganttConfig.headerStep) + 'px';
            dateCell.innerText = currentDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
            headerContainer.appendChild(dateCell);
        }
    }

    const ROW_HEIGHT = 48;
    const barColors = { pendiente: 'bg-slate-400', en_curso: 'bg-blue-500', en_revision: 'bg-amber-500', completado: 'bg-emerald-500' };

    validTareas.forEach(function (tarea, index) {
        const resp = responsables.find(function (r) { return r.id === tarea.id_responsable; });
        const listItem = document.createElement('div');
        listItem.className = 'h-12 border-b border-slate-100 flex flex-col justify-center px-4 hover:bg-slate-50 cursor-pointer';
        const detailShort = (tarea.detalles || 'Sin detalles').substring(0, 30);
        listItem.innerHTML = '<span class="font-bold text-slate-700 text-xs truncate">' + detailShort + '...</span><span class="text-[9px] text-slate-400 font-bold uppercase">' + (resp ? resp.nombre : 'Sin asignar') + '</span>';
        listItem.onclick = function () { selectTareaDetalle(tarea.id); };
        listContainer.appendChild(listItem);

        const start = new Date(tarea.fecha_creacion);
        const end = new Date(tarea.fecha_limite);
        const left = ((start - minDate) / (1000 * 60 * 60 * 24)) * ganttConfig.pxPerDay;
        const duration = Math.max(1, ((end - start) / (1000 * 60 * 60 * 24)) + 1);
        const width = duration * ganttConfig.pxPerDay;
        const barColor = barColors[tarea.estatus] || 'bg-slate-400';

        const bar = document.createElement('div');
        bar.className = 'absolute h-6 rounded-md text-[10px] text-white flex items-center px-2 overflow-hidden whitespace-nowrap cursor-pointer hover:brightness-110 z-10 font-bold ' + barColor;
        bar.style.top = ((index * ROW_HEIGHT) + 12) + 'px';
        bar.style.left = left + 'px';
        bar.style.width = Math.max(width, 30) + 'px';
        bar.innerText = (tarea.detalles || '').substring(0, 20);
        bar.onclick = function () { selectTareaDetalle(tarea.id); };
        barsContainer.appendChild(bar);
    });

    barsContainer.style.height = (validTareas.length * ROW_HEIGHT) + 'px';
}

// ============================================
// SWITCH VIEW
// ============================================
function switchView(view) {
    ['board', 'list', 'gantt'].forEach(function (v) {
        document.getElementById('view-' + v).classList.add('hidden');
        document.getElementById('btn-' + v).className = 'view-btn px-6 py-2 rounded-lg font-medium transition-all text-slate-600 hover:text-slate-900';
    });
    document.getElementById('view-' + view).classList.remove('hidden');
    document.getElementById('btn-' + view).className = 'view-btn px-6 py-2 rounded-lg font-medium transition-all bg-white text-indigo-600 shadow-sm';
    if (view === 'gantt') renderGantt();
    if (view === 'list') renderTareasList();
}

// ============================================
// DRAG & DROP (TAREAS)
// ============================================
function allowDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function dragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function dropTask(e) {
    e.preventDefault();
    const col = e.currentTarget;
    col.classList.remove('drag-over');
    const tareaId = e.dataTransfer.getData('text/plain');
    const tarea = tareas.find(function (t) { return t.id === tareaId; });
    if (!tarea) return;
    const colId = col.id.replace('col-', '');
    if (colId === tarea.estatus) return;
    const user = getCurrentUser();
    if (tarea.estatus === 'bloqueada') {
        alert('Esta tarea está bloqueada. Solo el supervisor puede modificarla.');
        return;
    }
    if (colId === 'completado' && user && user.role !== 'supervisor' && user.role !== 'director') {
        alert('Solo el supervisor puede mover tareas a Completado.');
        return;
    }
    quickChangeEstatus(tareaId, colId);
}

// ============================================
// CAMBIO RÁPIDO DE ESTADO
// ============================================
async function quickChangeEstatus(tareaId, nuevoEstatus) {
    const tarea = tareas.find(function (t) { return t.id === tareaId; });
    if (!tarea) return;
    if (tarea.estatus === 'bloqueada') {
        const user = getCurrentUser();
        if (!user || (user.role !== 'supervisor' && user.role !== 'director')) {
            alert('Esta tarea está bloqueada. Solo el supervisor puede modificarla.');
            return;
        }
    }
    tarea.estatus = nuevoEstatus;
    renderTareasBoard();
    renderTareasList();
    if (currentNavLevel === 'tarea_detail' && currentTarea && currentTarea.id === tareaId) {
        currentTarea = tarea;
        renderTareaDetalle();
    }
    await postToBackend('tarea_update', tarea);
}

// ============================================
// BLOQUEAR / DESBLOQUEAR TAREAS
// ============================================
async function bloquearTarea(tareaId) {
    const user = getCurrentUser();
    if (!user || (user.role !== 'supervisor' && user.role !== 'director')) {
        alert('Solo el supervisor puede bloquear tareas.');
        return;
    }
    const tarea = tareas.find(function (t) { return t.id === tareaId; });
    if (!tarea) return;
    const motivo = prompt('Motivo del bloqueo (opcional):') || '';
    const resp = responsables.find(function (r) { return r.id === (user ? user.id : ''); });
    showLoading(true);
    try {
        tarea.estatus = 'bloqueada';
        await postToBackend('tarea_bloquear', {
            id_tarea: tareaId,
            id_actor: resp ? resp.id : (user ? user.id : ''),
            motivo: motivo
        });
        renderTareasBoard();
        renderTareasList();
    } finally {
        showLoading(false);
    }
}

async function desbloquearTarea(tareaId) {
    const user = getCurrentUser();
    if (!user || (user.role !== 'supervisor' && user.role !== 'director')) {
        alert('Solo el supervisor puede desbloquear tareas.');
        return;
    }
    const tarea = tareas.find(function (t) { return t.id === tareaId; });
    if (!tarea) return;
    const resp = responsables.find(function (r) { return r.id === (user ? user.id : ''); });
    showLoading(true);
    try {
        tarea.estatus = 'en_curso';
        await postToBackend('tarea_desbloquear', {
            id_tarea: tareaId,
            id_actor: resp ? resp.id : (user ? user.id : '')
        });
        renderTareasBoard();
        renderTareasList();
    } finally {
        showLoading(false);
    }
}

// ============================================
// MODALES: PROYECTO (ahora vista inline)
// ============================================
function openProyectoModal(id) {
    const p = id ? proyectos.find(function (x) { return x.id === id; }) : null;
    currentNavLevel = 'cuenta_form';
    renderCurrentLevel();

    const container = document.getElementById('form-cuenta-content');
    container.innerHTML =
        '<div class="flex items-center justify-between mb-6">' +
        '<h2 class="text-xl font-bold text-slate-800">' + (p ? 'Editar Cuenta' : 'Nueva Cuenta') + '</h2>' +
        '<button type="button" onclick="closeProyectoModal()" class="text-slate-400 hover:text-slate-600 text-sm font-medium">✕ Cancelar</button>' +
        '</div>' +
        '<form class="space-y-4" onsubmit="saveProyecto(event)">' +
        '<input type="hidden" id="proyectoId" value="' + (p ? escapeHtml(p.id) : '') + '">' +
        '<div>' +
        '<label class="block text-sm font-bold text-slate-700 mb-1">Nombre de la Cuenta</label>' +
        '<input type="text" id="proyectoNombre" required value="' + (p ? escapeHtml(p.nombre || '') : '') + '" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Ej: Cuenta Principal">' +
        '</div>' +
        '<div>' +
        '<label class="block text-sm font-bold text-slate-700 mb-1">Descripción</label>' +
        '<textarea id="proyectoDesc" rows="3" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none" placeholder="Descripción de la cuenta...">' + (p ? escapeHtml(p.descripcion || '') : '') + '</textarea>' +
        '</div>' +
        '<div>' +
        '<label class="block text-sm font-bold text-slate-700 mb-1">Estado</label>' +
        '<select id="proyectoEstado" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">' +
        '<option value="activo"' + (!p || p.estado !== 'completado' ? ' selected' : '') + '>Activo</option>' +
        '<option value="completado"' + (p && p.estado === 'completado' ? ' selected' : '') + '>Completado</option>' +
        '</select>' +
        '</div>' +
        '<div class="flex gap-3 pt-2">' +
        '<button type="button" onclick="closeProyectoModal()" class="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>' +
        '<button type="submit" id="btn-save-proyecto" class="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2"><span>Guardar</span></button>' +
        '</div>' +
        (p ? '<button type="button" onclick="deleteProyecto()" class="w-full mt-2 text-red-500 text-sm font-medium hover:underline">Eliminar Cuenta</button>' : '') +
        '</form>';
}

function closeProyectoModal() {
    if (currentNavLevel !== 'cuenta_form') return;
    currentNavLevel = 'home';
    renderCurrentLevel();
}

async function saveProyecto(e) {
    e.preventDefault();
    const id = document.getElementById('proyectoId').value;
    const data = {
        id: id || Date.now().toString(),
        nombre: document.getElementById('proyectoNombre').value,
        descripcion: document.getElementById('proyectoDesc').value,
        estado: document.getElementById('proyectoEstado').value
    };
    showLoading(true);
    setButtonLoading('btn-save-proyecto', true);
    try {
        if (id) {
            const idx = proyectos.findIndex(function (p) { return p.id === id; });
            proyectos[idx] = Object.assign({}, proyectos[idx], data);
            await postToBackend('proyecto_update', data);
        } else {
            proyectos.push(data);
            await postToBackend('proyecto_add', data);
            sendWhatsAppNotification('🟢 NUEVA CUENTA: *' + data.nombre + '*\n📅 ' + new Date().toLocaleString('es-ES') + '\n🔗 ' + PANEL_URL);
        }
        closeProyectoModal();
        renderProyectos();
    } finally {
        showLoading(false);
        setButtonLoading('btn-save-proyecto', false);
    }
}

async function deleteProyecto() {
    const id = document.getElementById('proyectoId').value;
    if (!id || !confirm('¿Eliminar esta cuenta y todos sus programas?')) return;
    proyectos = proyectos.filter(function (p) { return p.id !== id; });
    closeProyectoModal();
    renderProyectos();
    await postToBackend('proyecto_delete', { id: id });
}

// ============================================
// MODALES: SUBPROYECTO (ahora vista inline)
// ============================================
function openSubproyectoModal(id) {
    const s = id ? subproyectos.find(function (x) { return x.id === id; }) : null;
    currentNavLevel = 'programa_form';
    renderCurrentLevel();

    const container = document.getElementById('form-programa-content');
    container.innerHTML =
        '<div class="flex items-center justify-between mb-6">' +
        '<h2 class="text-xl font-bold text-slate-800">' + (s ? 'Editar Programa' : 'Nuevo Programa') + '</h2>' +
        '<button type="button" onclick="closeSubproyectoModal()" class="text-slate-400 hover:text-slate-600 text-sm font-medium">✕ Cancelar</button>' +
        '</div>' +
        '<form class="space-y-4" onsubmit="saveSubproyecto(event)">' +
        '<input type="hidden" id="subproyectoId" value="' + (s ? escapeHtml(s.id) : '') + '">' +
        '<div>' +
        '<label class="block text-sm font-bold text-slate-700 mb-1">Nombre del Programa</label>' +
        '<input type="text" id="subproyectoNombre" required value="' + (s ? escapeHtml(s.nombre || '') : '') + '" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Ej: Programa de Marketing">' +
        '</div>' +
        '<div>' +
        '<label class="block text-sm font-bold text-slate-700 mb-1">Descripción</label>' +
        '<textarea id="subproyectoDesc" rows="2" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none" placeholder="Descripción...">' + (s ? escapeHtml(s.descripcion || '') : '') + '</textarea>' +
        '</div>' +
        '<div class="grid grid-cols-2 gap-4">' +
        '<div>' +
        '<label class="block text-sm font-bold text-slate-700 mb-1">Fecha Inicio</label>' +
        '<input type="date" id="subproyectoFechaInicio" value="' + (s ? (s.fecha_inicio || '') : '') + '" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none">' +
        '</div>' +
        '<div>' +
        '<label class="block text-sm font-bold text-slate-700 mb-1">Fecha Fin Estimada</label>' +
        '<input type="date" id="subproyectoFechaFin" value="' + (s ? (s.fecha_fin_estimada || '') : '') + '" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none">' +
        '</div>' +
        '</div>' +
        '<div class="flex gap-3 pt-2">' +
        '<button type="button" onclick="closeSubproyectoModal()" class="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>' +
        '<button type="submit" id="btn-save-subproyecto" class="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2"><span>Guardar</span></button>' +
        '</div>' +
        (s ? '<button type="button" onclick="deleteSubproyecto()" class="w-full mt-2 text-red-500 text-sm font-medium hover:underline">Eliminar Programa</button>' : '') +
        '</form>';
}

function closeSubproyectoModal() {
    if (currentNavLevel !== 'programa_form') return;
    currentNavLevel = 'proyecto';
    renderCurrentLevel();
}

async function saveSubproyecto(e) {
    e.preventDefault();
    const id = document.getElementById('subproyectoId').value;
    const data = {
        id: id || Date.now().toString(),
        id_proyecto: currentProyecto ? currentProyecto.id : null,
        nombre: document.getElementById('subproyectoNombre').value,
        descripcion: document.getElementById('subproyectoDesc').value,
        fecha_inicio: document.getElementById('subproyectoFechaInicio').value,
        fecha_fin_estimada: document.getElementById('subproyectoFechaFin').value
    };
    showLoading(true);
    setButtonLoading('btn-save-subproyecto', true);
    try {
        if (id) {
            const idx = subproyectos.findIndex(function (s) { return s.id === id; });
            subproyectos[idx] = Object.assign({}, subproyectos[idx], data);
            await postToBackend('subproyecto_update', data);
        } else {
            subproyectos.push(data);
            await postToBackend('subproyecto_add', data);
            sendWhatsAppNotification('📂 NUEVO PROGRAMA: *' + data.nombre + '*\n' + (currentProyecto ? '🏢 Cuenta: ' + currentProyecto.nombre + '\n' : '') + '📅 ' + new Date().toLocaleString('es-ES') + '\n🔗 ' + PANEL_URL);
        }
        closeSubproyectoModal();
        renderSubproyectos();
    } finally {
        showLoading(false);
        setButtonLoading('btn-save-subproyecto', false);
    }
}

async function deleteSubproyecto() {
    const id = document.getElementById('subproyectoId').value;
    if (!id || !confirm('¿Eliminar este programa y todas sus tareas?')) return;
    subproyectos = subproyectos.filter(function (s) { return s.id !== id; });
    closeSubproyectoModal();
    renderSubproyectos();
    await postToBackend('subproyecto_delete', { id: id });
}

// ============================================
// MODALES: TAREA
// ============================================
function updateResponsableSelect() {
    const select = document.getElementById('tareaResponsable');
    if (!select) return;
    select.innerHTML = '<option value="">Sin asignar</option>';
    responsables.forEach(function (r) {
        select.innerHTML += '<option value="' + r.id + '">' + r.nombre + ' (' + (r.rol || '') + ')</option>';
    });
}

function buildInlineAdjuntosHtml(t, isPrivileged) {
    var adjuntos = normalizeAdjuntos_(t.adjuntos);
    var listHtml = adjuntos.length > 0
        ? '<div class="mt-1 space-y-1">' +
            adjuntos.map(function (a) {
                return '<div class="flex items-center gap-2 text-sm bg-slate-50 px-3 py-1.5 rounded-lg">' +
                    '<a href="' + escapeHtml(a.url) + '" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:underline truncate flex-1">' + escapeHtml(a.name || a.url) + '</a>' +
                    (isPrivileged && a.id ? '<button type="button" onclick="deleteAttachment(\'' + t.id + '\',\'' + a.id + '\')" class="text-red-400 hover:text-red-600 flex-shrink-0 ml-1" title="Eliminar adjunto">✕</button>' : '') +
                    '</div>';
            }).join('') +
            '</div>'
        : '';
    return '<div>' +
        '<label class="block text-sm font-bold text-slate-700 mb-1">Adjuntos</label>' +
        listHtml +
        '<input type="file" id="inline_adjuntos" multiple class="mt-2 w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer">' +
        '<p class="text-xs text-slate-400 mt-1">Nuevos archivos se subirán a Drive al guardar</p>' +
        '</div>';
}

function renderModalAdjuntos(tareaId) {
    var container = document.getElementById('modal-tarea-adjuntos-list');
    if (!container) return;
    var t = tareas.find(function (x) { return x.id === tareaId; });
    if (!t) { container.innerHTML = ''; return; }
    var adjuntos = normalizeAdjuntos_(t.adjuntos);
    if (adjuntos.length === 0) { container.innerHTML = ''; return; }
    var user = getCurrentUser();
    var isPrivileged = user && (user.role === 'supervisor' || user.role === 'director');
    container.innerHTML = '<div class="mt-1 space-y-1">' +
        adjuntos.map(function (a) {
            return '<div class="flex items-center gap-2 text-sm bg-slate-50 px-3 py-1.5 rounded-lg">' +
                '<a href="' + escapeHtml(a.url) + '" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:underline truncate flex-1">' + escapeHtml(a.name || a.url) + '</a>' +
                (isPrivileged && a.id ? '<button type="button" onclick="deleteAttachment(\'' + tareaId + '\',\'' + a.id + '\')" class="text-red-400 hover:text-red-600 flex-shrink-0 ml-1" title="Eliminar adjunto">✕</button>' : '') +
                '</div>';
        }).join('') +
        '</div>';
}

async function deleteAttachment(tareaId, fileId) {
    if (!confirm('¿Eliminar este archivo adjunto?')) return;
    var user = getCurrentUser();
    showLoading(true);
    try {
        await postToBackend('tarea_adjunto_eliminar', {
            id_tarea: tareaId,
            fileId: fileId,
            id_actor: user ? user.id : ''
        });
        var tarea = tareas.find(function (t) { return t.id === tareaId; });
        if (tarea && Array.isArray(tarea.adjuntos)) {
            tarea.adjuntos = tarea.adjuntos.filter(function (a) {
                return !(typeof a === 'object' && a.id === fileId);
            });
            if (currentTarea && currentTarea.id === tareaId) currentTarea = tarea;
        }
        if (currentNavLevel === 'tarea_detail' && currentTarea && currentTarea.id === tareaId) {
            var inlineForm = document.getElementById('tarea-detalle-content');
            if (inlineForm && inlineForm.querySelector('#inline_detalles')) {
                openInlineEditForm(tareaId);
            }
        }
    } finally {
        showLoading(false);
    }
}

function openTareaModal(id) {
    if (id) {
        selectTareaDetalleAndEdit(id);
    } else {
        openInlineNewTareaForm();
    }
}

function openInlineNewTareaForm() {
    const user = getCurrentUser();
    const isPrivileged = user && (user.role === 'supervisor' || user.role === 'director');
    currentNavLevel = 'tarea_detail';
    currentTarea = null;
    renderCurrentLevel();

    var respOptions = '<option value="">Sin asignar</option>';
    responsables.forEach(function (r) {
        respOptions += '<option value="' + r.id + '">' + escapeHtml(r.nombre) + '</option>';
    });
    var statusOpts = '<option value="pendiente">Pendiente</option><option value="en_curso">En Curso</option><option value="en_revision">En Revisión</option>' +
        (isPrivileged ? '<option value="completado">Completado</option><option value="bloqueada">🔒 Bloqueada</option>' : '');

    var selectClass = 'px-2 py-1 rounded-md border border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white text-xs font-medium text-slate-700 cursor-pointer';

    // Sticky doc header
    var header = document.getElementById('tarea-doc-header');
    if (header) {
        header.innerHTML =
            '<button type="button" onclick="closeTareaModal()" class="flex items-center gap-1 text-slate-500 hover:text-slate-700 font-medium text-xs transition-colors flex-shrink-0 mr-1">' +
            '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>Cancelar</button>' +
            '<span class="text-slate-200 text-sm flex-shrink-0">|</span>' +
            '<select id="new_responsable" class="' + selectClass + '">' + respOptions + '</select>' +
            '<select id="new_prioridad" class="' + selectClass + '">' +
            '<option value="alta">🔴 Alta</option><option value="media" selected>🟡 Media</option><option value="baja">🟢 Baja</option>' +
            '</select>' +
            '<select id="new_estatus" class="' + selectClass + '">' + statusOpts + '</select>' +
            '<input type="date" id="new_fecha_limite" class="' + selectClass + '">' +
            '<button type="button" onclick="saveInlineNewTareaBtn()" id="btn-save-new-tarea" class="ml-auto flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex-shrink-0">' +
            '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Guardar</button>';
    }

    var inputClass = 'flex-1 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-400 focus:outline-none text-sm py-1.5 text-slate-700 transition-colors';

    var container = document.getElementById('tarea-detalle-content');
    container.innerHTML =
        // Big title
        '<textarea id="new_detalles" class="doc-title mb-6" rows="2" placeholder="Título de la nueva tarea..." required></textarea>' +
        // Entregables
        '<div class="mb-6 pb-6 border-b border-slate-100">' +
        '<div class="flex items-center justify-between mb-2">' +
        '<h3 class="font-semibold text-slate-700 text-xs uppercase tracking-wider">📋 Entregables</h3>' +
        '</div>' +
        '<div id="inline-entregables-list" class="space-y-0.5"></div>' +
        '<button type="button" onclick="addInlineEntregable()" class="mt-2 flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-700 font-medium">' +
        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>' +
        'Agregar entregable</button>' +
        '</div>' +
        // Rich text toolbar
        '<div class="mb-2 pb-2 border-b border-slate-100 flex items-center gap-1">' +
        '<button type="button" onclick="execFormatCmd(\'bold\')" class="toolbar-btn font-bold" title="Negrita">B</button>' +
        '<button type="button" onclick="execFormatCmd(\'italic\')" class="toolbar-btn italic" title="Cursiva">I</button>' +
        '<span class="text-slate-200 text-sm mx-1">|</span>' +
        '<button type="button" onclick="execFormatCmd(\'insertUnorderedList\')" class="toolbar-btn" title="Lista">• Lista</button>' +
        '<button type="button" onclick="execFormatCmd(\'insertOrderedList\')" class="toolbar-btn" title="Lista numerada">1. Lista</button>' +
        '</div>' +
        // Contenteditable description
        '<div id="inline_descripcion_rich" contenteditable="true" data-placeholder="Descripción, contexto, instrucciones…" class="doc-editor mb-6 text-slate-700 min-h-[160px]"></div>' +
        // Adjuntos
        '<div><label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Adjuntos (opcional)</label>' +
        '<input type="file" id="new_adjuntos" multiple class="w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer">' +
        '<p class="text-xs text-slate-400 mt-1">Los archivos se subirán a Drive al guardar</p></div>';

    var titleEl = document.getElementById('new_detalles');
    if (titleEl) {
        titleEl.style.height = 'auto';
        titleEl.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
        titleEl.focus();
    }
}

function closeTareaModal() {
    // Only act when the new-task form is open (currentTarea is null).
    // Editing an existing task uses openInlineEditForm which has its own cancel.
    if (currentNavLevel !== 'tarea_detail' || currentTarea !== null) return;
    currentNavLevel = 'subproyecto';
    renderCurrentLevel();
}

async function saveInlineNewTarea(e) {
    if (e) e.preventDefault();
    await saveInlineNewTareaBtn();
}

async function saveInlineNewTareaBtn() {
    var id_responsable = document.getElementById('new_responsable') ? document.getElementById('new_responsable').value : '';
    var prioridad = document.getElementById('new_prioridad') ? document.getElementById('new_prioridad').value : 'media';
    var estatus = document.getElementById('new_estatus') ? document.getElementById('new_estatus').value : 'pendiente';
    var detalles = document.getElementById('new_detalles') ? document.getElementById('new_detalles').value : '';
    var fecha_limite = document.getElementById('new_fecha_limite') ? document.getElementById('new_fecha_limite').value : '';
    var descripcionEl = document.getElementById('inline_descripcion_rich');
    var descripcion = descripcionEl ? normalizeRichTextContent(descripcionEl.innerHTML) : '';

    if (!detalles || !detalles.trim()) {
        alert('El título de la tarea no puede estar vacío.');
        return;
    }

    var timestamp = Date.now();
    var detallesClean = detalles.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
    var nuevoId = [
        currentProyecto ? currentProyecto.id : 'sin_proyecto',
        currentSubproyecto ? currentSubproyecto.id : 'sin_subproyecto',
        timestamp,
        id_responsable || 'sin_responsable',
        prioridad || 'media',
        estatus || 'pendiente',
        detallesClean || 'sin_detalles'
    ].join('.');
    if (tareaIdExists(nuevoId)) nuevoId = nuevoId + '.' + Date.now();

    var data = {
        id: nuevoId,
        id_subproyecto: currentSubproyecto ? currentSubproyecto.id : null,
        id_responsable: id_responsable,
        prioridad: prioridad,
        estatus: estatus,
        detalles: detalles,
        descripcion: descripcion,
        adjuntos: [],
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_limite: fecha_limite
    };

    showLoading(true);
    setButtonLoading('btn-save-new-tarea', true);
    try {
        tareas.push(data);
        await postToBackend('tarea_add', data);
        sendWhatsAppNotification('📋 NUEVA TAREA: *' + (detalles || nuevoId) + '*\n' + (currentSubproyecto ? '📁 Programa: ' + currentSubproyecto.nombre + '\n' : '') + '📅 ' + new Date().toLocaleString('es-ES') + '\n🔗 ' + PANEL_URL);

        // Save inline entregables
        var newEntregables = getInlineEntregables();
        if (newEntregables && newEntregables.length > 0) {
            await syncInlineEntregables(nuevoId, [], newEntregables);
            data.entregables = newEntregables;
        }

        var adjuntosEl = document.getElementById('new_adjuntos');
        if (adjuntosEl && adjuntosEl.files && adjuntosEl.files.length > 0) {
            await uploadAttachments(nuevoId, adjuntosEl.files);
            await refreshData();
        } else {
            currentTarea = data;
            currentNavLevel = 'tarea_detail';
            renderCurrentLevel();
        }
    } finally {
        showLoading(false);
        setButtonLoading('btn-save-new-tarea', false);
    }
}

// ============================================
// MODAL: DESCRIPCIÓN (ahora inline en tarea_detail)
// ============================================
function showTareaDescripcion(tareaId) {
    // Navigate to tarea detail — description is already visible there
    const tarea = tareas.find(function (t) { return t.id === tareaId; });
    if (!tarea) return;
    if (currentNavLevel !== 'tarea_detail' || !currentTarea || currentTarea.id !== tareaId) {
        currentTarea = tarea;
        currentNavLevel = 'tarea_detail';
        renderCurrentLevel();
    }
}

function closeDescripcionModal() {
    // No-op: description is shown inline in tarea detail
}

// ============================================
// ENTREGABLES (ahora vista inline en tarea_detail)
// ============================================
function openEntregableModal(tareaId, entId) {
    var user = getCurrentUser();
    if (!user || (user.role !== 'supervisor' && user.role !== 'director')) {
        alert('Solo supervisores y directores pueden gestionar entregables.');
        return;
    }
    var tarea = tareas.find(function (t) { return t.id === tareaId; });
    if (!tarea) return;

    if (currentNavLevel !== 'tarea_detail' || !currentTarea || currentTarea.id !== tareaId) {
        currentTarea = tarea;
        currentNavLevel = 'tarea_detail';
        renderCurrentLevel();
    }

    var en = (entId && Array.isArray(tarea.entregables)) ? tarea.entregables.find(function (e) { return e.id === entId; }) : null;
    var medioValue = en ? (en.medio_entrega || 'opcore') : 'opcore';
    var otroValue = en ? (en.medio_otro || '') : '';
    var showOtro = medioValue === 'otro';

    // Update doc header with minimal cancel button
    var header = document.getElementById('tarea-doc-header');
    if (header) {
        header.innerHTML =
            '<button type="button" onclick="closeEntregableModal()" class="flex items-center gap-1 text-slate-500 hover:text-slate-700 font-medium text-xs transition-colors flex-shrink-0">' +
            '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>' +
            '← ' + (entId ? 'Editar Entregable' : 'Nuevo Entregable') + '</button>';
    }

    var container = document.getElementById('tarea-detalle-content');
    container.innerHTML =
        '<div class="flex items-center justify-between mb-6">' +
        '<h2 class="text-xl font-bold text-slate-800">' + (entId ? 'Editar Entregable' : 'Nuevo Entregable') + '</h2>' +
        '<button type="button" onclick="closeEntregableModal()" class="text-slate-400 hover:text-slate-600 text-sm font-medium">✕ Cancelar</button>' +
        '</div>' +
        '<form class="space-y-4" onsubmit="saveEntregable(event)">' +
        '<input type="hidden" id="entregableTareaId" value="' + escapeHtml(tareaId) + '">' +
        '<input type="hidden" id="entregableId" value="' + escapeHtml(entId || '') + '">' +
        '<div>' +
        '<label class="block text-sm font-bold text-slate-700 mb-1">Descripción del Entregable</label>' +
        '<textarea id="entregableDescripcion" required rows="3" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none" placeholder="Resultado concreto esperado...">' + (en ? escapeHtml(en.descripcion_entregable || '') : '') + '</textarea>' +
        '</div>' +
        '<div>' +
        '<label class="block text-sm font-bold text-slate-700 mb-1">Formato Requerido</label>' +
        '<input type="text" id="entregableFormato" value="' + (en ? escapeHtml(en.formato_requerido || '') : '') + '" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="PDF, JPG, enlace, documento físico, etc.">' +
        '</div>' +
        '<div>' +
        '<label class="block text-sm font-bold text-slate-700 mb-1">Medio de Entrega</label>' +
        '<select id="entregableMedio" onchange="toggleMedioOtro()" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">' +
        '<option value="opcore"' + (medioValue === 'opcore' ? ' selected' : '') + '>OpCore</option>' +
        '<option value="drive"' + (medioValue === 'drive' ? ' selected' : '') + '>Drive</option>' +
        '<option value="whatsapp"' + (medioValue === 'whatsapp' ? ' selected' : '') + '>WhatsApp</option>' +
        '<option value="correo"' + (medioValue === 'correo' ? ' selected' : '') + '>Correo</option>' +
        '<option value="fisica"' + (medioValue === 'fisica' ? ' selected' : '') + '>Física</option>' +
        '<option value="otro"' + (medioValue === 'otro' ? ' selected' : '') + '>Otro</option>' +
        '</select>' +
        '</div>' +
        '<div id="entregable-medio-otro-wrapper"' + (showOtro ? '' : ' class="hidden"') + '>' +
        '<label class="block text-sm font-bold text-slate-700 mb-1">Especificar medio</label>' +
        '<input type="text" id="entregableMedioOtro" value="' + escapeHtml(otroValue) + '" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Describe el medio de entrega...">' +
        '</div>' +
        '<div class="flex gap-3 pt-2">' +
        '<button type="button" onclick="closeEntregableModal()" class="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>' +
        '<button type="submit" id="btn-save-entregable" class="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2"><span>Guardar</span></button>' +
        '</div>' +
        (entId ? '<button type="button" onclick="deleteEntregableFromModal()" class="w-full mt-2 text-red-500 text-sm font-medium hover:underline">Eliminar Entregable</button>' : '') +
        '</form>';
}

function closeEntregableModal() {
    if (currentNavLevel === 'tarea_detail') renderTareaDetalle();
}

function toggleMedioOtro() {
    var medio = document.getElementById('entregableMedio').value;
    document.getElementById('entregable-medio-otro-wrapper').classList.toggle('hidden', medio !== 'otro');
}

async function saveEntregable(e) {
    e.preventDefault();
    var user = getCurrentUser();
    var tareaId = document.getElementById('entregableTareaId').value;
    var entId = document.getElementById('entregableId').value;
    var descripcion = document.getElementById('entregableDescripcion').value;
    var formato = document.getElementById('entregableFormato').value;
    var medio = document.getElementById('entregableMedio').value;
    var medioOtro = document.getElementById('entregableMedioOtro').value;
    var entregable = {
        id: entId || ('ent_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)),
        descripcion_entregable: descripcion,
        formato_requerido: formato,
        medio_entrega: medio,
        medio_otro: medioOtro
    };
    showLoading(true);
    setButtonLoading('btn-save-entregable', true);
    try {
        if (entId) {
            await postToBackend('tarea_entregable_update', { id_tarea: tareaId, entregable: entregable, id_actor: user ? user.id : '' });
        } else {
            await postToBackend('tarea_entregable_add', { id_tarea: tareaId, entregable: entregable, id_actor: user ? user.id : '' });
        }
        var tarea = tareas.find(function (t) { return t.id === tareaId; });
        if (tarea) {
            if (!Array.isArray(tarea.entregables)) tarea.entregables = [];
            if (entId) {
                var idx = tarea.entregables.findIndex(function (e) { return e.id === entId; });
                if (idx >= 0) tarea.entregables[idx] = entregable;
            } else {
                tarea.entregables.push(entregable);
            }
            if (currentTarea && currentTarea.id === tareaId) currentTarea = tarea;
        }
        closeEntregableModal();
        renderTareaDetalle();
    } finally {
        showLoading(false);
        setButtonLoading('btn-save-entregable', false);
    }
}

async function deleteEntregableItem(tareaId, entId) {
    if (!confirm('¿Eliminar este entregable?')) return;
    var user = getCurrentUser();
    showLoading(true);
    try {
        await postToBackend('tarea_entregable_delete', { id_tarea: tareaId, entregableId: entId, id_actor: user ? user.id : '' });
        var tarea = tareas.find(function (t) { return t.id === tareaId; });
        if (tarea && Array.isArray(tarea.entregables)) {
            tarea.entregables = tarea.entregables.filter(function (e) { return e.id !== entId; });
            if (currentTarea && currentTarea.id === tareaId) currentTarea = tarea;
        }
        renderTareaDetalle();
    } finally {
        showLoading(false);
    }
}

function deleteEntregableFromModal() {
    var tareaId = document.getElementById('entregableTareaId').value;
    var entId = document.getElementById('entregableId').value;
    closeEntregableModal();
    deleteEntregableItem(tareaId, entId);
}


function showTareaComments(tareaId) {
    const tarea = tareas.find(function (t) { return t.id === tareaId; });
    if (!tarea) return;

    if (currentNavLevel !== 'tarea_detail' || !currentTarea || currentTarea.id !== tareaId) {
        currentTarea = tarea;
        currentNavLevel = 'tarea_detail';
        renderCurrentLevel();
    }

    // Update doc header
    var header = document.getElementById('tarea-doc-header');
    if (header) {
        header.innerHTML =
            '<button type="button" onclick="closeCommentsModal()" class="flex items-center gap-1 text-slate-500 hover:text-slate-700 font-medium text-xs transition-colors flex-shrink-0">' +
            '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>← Volver a tarea</button>' +
            '<span class="text-slate-500 text-xs ml-2 truncate">' + escapeHtml((tarea.detalles || '').substring(0, 50)) + '</span>';
    }

    const tareaComments = comentarios.filter(function (c) { return c.id_tarea === tareaId; });

    const commentsHtml = tareaComments.length === 0
        ? '<p class="text-center text-slate-400 py-4">No hay comentarios aún</p>'
        : tareaComments.map(function (c) {
            const resp = responsables.find(function (r) { return r.id === c.id_responsable; });
            return '<div class="bg-slate-50 p-3 rounded-lg border border-slate-200">' +
                '<div class="flex justify-between items-start mb-1">' +
                '<span class="font-bold text-xs text-indigo-600">' + escapeHtml(resp ? resp.nombre : c.id_responsable) + '</span>' +
                '<span class="text-[10px] text-slate-400">' + escapeHtml(c.fecha ? new Date(c.fecha).toLocaleString() : '') + '</span>' +
                '</div>' +
                '<p class="text-sm text-slate-700">' + escapeHtml(c.comentario) + '</p>' +
                '</div>';
        }).join('');

    const container = document.getElementById('tarea-detalle-content');
    container.innerHTML =
        '<h3 class="font-bold text-slate-800 text-lg mb-4">Comentarios</h3>' +
        '<div class="space-y-3 mb-4">' + commentsHtml + '</div>' +
        '<div class="border-t border-slate-200 pt-4">' +
        '<textarea id="new-comment" rows="2" class="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" placeholder="Escribe tu comentario..."></textarea>' +
        '<div class="flex justify-end mt-2">' +
        '<button onclick="addTareaComment(\'' + tareaId + '\')" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Enviar</button>' +
        '</div>' +
        '</div>';
}

async function addTareaComment(tareaId) {
    const text = document.getElementById('new-comment').value;
    if (!text.trim()) return;
    const currentUser = getCurrentUser();
    const resp = responsables.find(function (r) { return r.id === (currentUser ? currentUser.id : ''); });
    const commentData = {
        id: Date.now().toString(),
        id_tarea: tareaId,
        id_responsable: resp ? resp.id : (currentUser ? currentUser.id : ''),
        comentario: text,
        fecha: new Date().toISOString()
    };
    showLoading(true);
    try {
        await postToBackend('comentario_add', commentData);
        comentarios.push(commentData);
        showTareaComments(tareaId);
    } finally {
        showLoading(false);
    }
}

function closeCommentsModal() {
    if (currentNavLevel === 'tarea_detail') renderTareaDetalle();
}

// ============================================
// APROBACIÓN (ahora vista inline en tarea_detail)
// ============================================
function openAprobacionModal(tareaId) {
    const tarea = tareas.find(function (t) { return t.id === tareaId; });
    if (!tarea) return;

    if (currentNavLevel !== 'tarea_detail' || !currentTarea || currentTarea.id !== tareaId) {
        currentTarea = tarea;
        currentNavLevel = 'tarea_detail';
        renderCurrentLevel();
    }

    // Update doc header
    var header = document.getElementById('tarea-doc-header');
    if (header) {
        header.innerHTML =
            '<button type="button" onclick="closeAprobacionModal()" class="flex items-center gap-1 text-slate-500 hover:text-slate-700 font-medium text-xs transition-colors flex-shrink-0">' +
            '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>← Revisar Tarea</button>' +
            '<span class="text-slate-500 text-xs ml-2 font-medium truncate">' + escapeHtml((tarea.detalles || '').substring(0, 50)) + '</span>';
    }

    const container = document.getElementById('tarea-detalle-content');
    container.innerHTML =
        '<h3 class="font-bold text-slate-800 text-lg mb-4">Revisar Tarea</h3>' +
        '<div class="space-y-4">' +
        '<input type="hidden" id="aprobacionTareaId" value="' + escapeHtml(tareaId) + '">' +
        '<div>' +
        '<label class="block text-sm font-bold text-slate-700 mb-1">Observaciones (opcional)</label>' +
        '<textarea id="aprobacionObservaciones" rows="3" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none" placeholder="Añade observaciones..."></textarea>' +
        '</div>' +
        '<div class="flex gap-3 pt-2">' +
        '<button onclick="closeAprobacionModal()" class="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>' +
        '<button onclick="rechazarTarea()" class="flex-1 bg-red-100 text-red-600 px-4 py-2.5 rounded-lg font-bold hover:bg-red-200">Rechazar</button>' +
        '<button onclick="aprobarTarea()" class="flex-1 bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-emerald-700">Aprobar</button>' +
        '</div>' +
        '</div>';
}

function closeAprobacionModal() {
    if (currentNavLevel === 'tarea_detail') renderTareaDetalle();
}

async function aprobarTarea() {
    const tareaId = document.getElementById('aprobacionTareaId').value;
    const observaciones = document.getElementById('aprobacionObservaciones').value;
    const tarea = tareas.find(function (t) { return t.id === tareaId; });
    if (!tarea) return;
    const user = getCurrentUser();
    showLoading(true);
    try {
        tarea.estatus = 'completado';
        await postToBackend('tarea_aprobar', { id_tarea: tareaId, id_actor: user ? user.id : '', observaciones: observaciones });
        currentTarea = tarea;
        renderTareaDetalle();
        renderTareasBoard();
        renderTareasList();
    } finally {
        showLoading(false);
    }
}

async function rechazarTarea() {
    const tareaId = document.getElementById('aprobacionTareaId').value;
    const observaciones = document.getElementById('aprobacionObservaciones').value;
    const tarea = tareas.find(function (t) { return t.id === tareaId; });
    if (!tarea) return;
    const user = getCurrentUser();
    showLoading(true);
    try {
        tarea.estatus = 'en_curso';
        await postToBackend('tarea_rechazar', { id_tarea: tareaId, id_actor: user ? user.id : '', observaciones: observaciones });
        currentTarea = tarea;
        renderTareaDetalle();
        renderTareasBoard();
        renderTareasList();
    } finally {
        showLoading(false);
    }
}

// ============================================
// DUPLICAR TAREA
// ============================================
async function duplicateTarea(tareaId) {
    const user = getCurrentUser();
    if (!user || user.role !== 'director') {
        alert('Solo el director puede duplicar tareas.');
        return;
    }
    const tarea = tareas.find(function (t) { return t.id === tareaId; });
    if (!tarea) return;
    if (!confirm('¿Duplicar esta tarea?')) return;

    const timestamp = Date.now();
    const detallesClean = (tarea.detalles || '').toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
    // Use the original task's subproyecto context for the duplicate ID
    const subId = tarea.id_subproyecto || (currentSubproyecto ? currentSubproyecto.id : 'sin_subproyecto');
    const proyId = (function () {
        const sub = subproyectos.find(function (s) { return s.id === subId; });
        return sub ? sub.id_proyecto : (currentProyecto ? currentProyecto.id : 'sin_proyecto');
    }());
    var nuevoId = [
        proyId,
        subId,
        timestamp,
        tarea.id_responsable || 'sin_responsable',
        tarea.prioridad || 'media',
        'pendiente',
        detallesClean || 'sin_detalles'
    ].join('.');
    if (tareaIdExists(nuevoId)) nuevoId = nuevoId + '.' + timestamp;

    const nuevaTarea = Object.assign({}, tarea, {
        id: nuevoId,
        id_subproyecto: subId,
        estatus: 'pendiente',
        fecha_inicio: new Date().toISOString().split('T')[0],
        adjuntos: [],
        entregables: [],
        detalles: (tarea.detalles || '') + ' (copia)'
    });

    showLoading(true);
    try {
        tareas.push(nuevaTarea);
        await postToBackend('tarea_add', nuevaTarea);
        currentTarea = nuevaTarea;
        currentNavLevel = 'tarea_detail';
        renderCurrentLevel();
        renderTareasBoard();
        renderTareasList();
    } finally {
        showLoading(false);
    }
}
function updateUserFilterSelect() {
    const select = document.getElementById('filterUser');
    if (!select) return;
    select.innerHTML = '<option value="">Todos los responsables</option>';
    responsables.forEach(function (r) {
        select.innerHTML += '<option value="' + r.nombre + '" ' + (currentUserFilter === r.nombre ? 'selected' : '') + '>' + r.nombre + '</option>';
    });
}

function applyFilters() {
    const filterUser = document.getElementById('filterUser');
    const filterPriority = document.getElementById('filterPriority');
    const filterStatus = document.getElementById('filterStatus');
    currentUserFilter = filterUser ? filterUser.value : '';
    currentPriorityFilter = filterPriority ? filterPriority.value : '';
    currentStatusFilter = filterStatus ? filterStatus.value : '';
    renderTareasBoard();
    renderTareasList();
}

function applyUserFilter() {
    applyFilters();
}

function clearFilter() {
    currentUserFilter = '';
    currentPriorityFilter = '';
    currentStatusFilter = '';
    const filterUser = document.getElementById('filterUser');
    const filterPriority = document.getElementById('filterPriority');
    const filterStatus = document.getElementById('filterStatus');
    if (filterUser) filterUser.value = '';
    if (filterPriority) filterPriority.value = '';
    if (filterStatus) filterStatus.value = '';
    renderTareasBoard();
    renderTareasList();
}

// ============================================
// BACKEND
// ============================================
function readFileAsBase64(file) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function (e) {
            var base64 = e.target.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function postToBackend(action, data) {
    if (!WEB_APP_URL) return;
    try {
        console.log('Enviando a backend:', action, data.id);
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: action, data: data })
        });
    } catch (error) {
        console.error('Error en postToBackend:', error);
    }
}

// ============================================
// WHATSAPP
// ============================================
async function sendWhatsAppNotification(message) {
    if (!WHATSAPP_NUMBER) return;
    try {
        fetch(WHATSAPP_BOT_URL + '?number=' + encodeURIComponent(WHATSAPP_NUMBER) + '&message=' + encodeURIComponent(message), { mode: 'no-cors' }).catch(function () { });
    } catch (e) {
        console.error('Error WhatsApp:', e);
    }
}

// ============================================
// UTILIDADES
// ============================================
function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function setButtonLoading(btnId, isLoading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isLoading) {
        btn.disabled = true;
        btn.dataset.originalHtml = btn.innerHTML;
        btn.innerHTML = '<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Guardando...</span>';
    } else {
        btn.disabled = false;
        if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
    }
}

function getStatusColor(estatus) {
    switch (estatus) {
        case 'pendiente': return '#94a3b8';
        case 'en_curso': return '#3b82f6';
        case 'en_revision': return '#f59e0b';
        case 'completado': return '#10b981';
        default: return '#e2e8f0';
    }
}

function getPriorityColor(priority) {
    switch (priority) {
        case 'alta': return 'bg-red-100 text-red-600';
        case 'media': return 'bg-yellow-100 text-yellow-600';
        case 'baja': return 'bg-green-100 text-green-600';
        default: return 'bg-gray-100 text-gray-600';
    }
}

function getPriorityIcon(priority) {
    switch (priority) {
        case 'alta': return '🔴';
        case 'media': return '🟡';
        case 'baja': return '🟢';
        default: return '⚪';
    }
}

function getPriorityBorderColor(priority) {
    switch (priority) {
        case 'alta': return '#ef4444';
        case 'media': return '#f59e0b';
        case 'baja': return '#22c55e';
        default: return '#e2e8f0';
    }
}

function getStatusBadge(estatus) {
    switch (estatus) {
        case 'pendiente': return { class: 'bg-slate-100 text-slate-600', label: 'Pendiente' };
        case 'en_curso': return { class: 'bg-blue-100 text-blue-600', label: 'En Curso' };
        case 'en_revision': return { class: 'bg-amber-100 text-amber-600', label: 'En Revisión' };
        case 'completado': return { class: 'bg-emerald-100 text-emerald-600', label: 'Completado' };
        case 'bloqueada': return { class: 'bg-red-100 text-red-600', label: '🔒 Bloqueada' };
        default: return { class: 'bg-gray-100 text-gray-600', label: estatus };
    }
}

// ESC cierra todos los modales (incluye el de descripción)
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeProyectoModal();
        closeSubproyectoModal();
        closeTareaModal();
        closeAprobacionModal();
        closeCommentsModal();
        closeDescripcionModal();
        closeEntregableModal();
    }
});

// Función para parsear el ID de tarea y obtener sus componentes
function parseTareaId(tareaId) {
    if (!tareaId) return null;

    const parts = tareaId.split('.');
    if (parts.length >= 7) {
        return {
            idProyecto: parts[0],
            idSubproyecto: parts[1],
            idTarea: parts[2],
            idResponsable: parts[3],
            prioridad: parts[4],
            estatus: parts[5],
            detallesResumen: parts.slice(6).join('.')
        };
    }
    return null;
}

// Ejemplo de uso (puedes llamarla desde la consola para debug)
function debugTareaId(tareaId) {
    const parsed = parseTareaId(tareaId);
    console.log('ID parseado:', parsed);
    return parsed;
}

// Función para verificar si un ID de tarea ya existe
function tareaIdExists(id) {
    return tareas.some(t => t.id === id);
}

// ======================================================
// PATCH: Compatibilidad con backend nuevo (Adjuntos JSON + Entregables)
// Pegar al FINAL de tu app(1).js
// ======================================================

// ------------------------------
// Utils
// ------------------------------
function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Normaliza adjuntos a array de objetos: {id,name,url,kind,uploadedBy,createdAt}
function normalizeAdjuntos_(adjuntos) {
  if (!adjuntos) return [];

  // Ya viene como array (backend nuevo)
  if (Array.isArray(adjuntos)) {
    // Puede ser array de strings viejo o array de objetos nuevo
    return adjuntos
      .map((a) => {
        if (!a) return null;
        if (typeof a === 'string') {
          const url = a.trim();
          return url
            ? { id: '', name: '', url, kind: 'adjunto', uploadedBy: '', createdAt: '' }
            : null;
        }
        // objeto
        return {
          id: String(a.id || ''),
          name: String(a.name || ''),
          url: String(a.url || ''),
          kind: String(a.kind || 'adjunto'),
          uploadedBy: String(a.uploadedBy || ''),
          createdAt: String(a.createdAt || '')
        };
      })
      .filter(Boolean)
      .filter(a => !!a.url);
  }

  // Si por error te llega string CSV (muy viejo)
  if (typeof adjuntos === 'string') {
    const raw = adjuntos.trim();
    if (!raw) return [];
    return raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(url => ({ id: '', name: '', url, kind: 'adjunto', uploadedBy: '', createdAt: '' }));
  }

  return [];
}

function fileToBase64_(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const result = reader.result || '';
      const base64 = result.toString().split(',')[1] || '';
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}

// ------------------------------
// Upload adjuntos compatible con backend nuevo
// ------------------------------
async function uploadAttachments(idTarea, fileList, kind) {
  const user = getCurrentUser();
  if (!user) throw new Error('No hay usuario logueado');

  const files = Array.from(fileList || []);
  if (files.length === 0) return;

  for (const file of files) {
    const base64 = await fileToBase64_(file);

    // IMPORTANTE: backend nuevo requiere id_actor y permite kind
    await postToBackend('tarea_upload_adjunto', {
      id_tarea: idTarea,
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      base64: base64,
      kind: kind || 'adjunto', // 'adjunto' | 'entregable'
      id_actor: user.id
    });
  }
}

// ------------------------------
// Eliminar adjunto (Drive -> papelera + quitar de tarea)
// ------------------------------
async function deleteAttachmentFromTarea(idTarea, fileId) {
  const user = getCurrentUser();
  if (!user) throw new Error('No hay usuario logueado');

  if (!confirm('¿Eliminar este archivo? (Se moverá a la papelera de Drive)')) return;

  showLoading(true);
  try {
    await postToBackend('tarea_adjunto_eliminar', {
      id_tarea: idTarea,
      fileId: fileId,
      id_actor: user.id
    });
    await refreshData();

    // Si estás en detalle de tarea, vuelve a renderizar
    if (currentTarea && currentTarea.id === idTarea) {
      currentTarea = tareas.find(t => t.id === idTarea) || currentTarea;
      renderTareaDetalle();
    }
  } finally {
    showLoading(false);
  }
}

// ------------------------------
// Render HTML de adjuntos (nuevo)
// ------------------------------
function buildAdjuntosHtml_(t, canDelete) {
  const adj = normalizeAdjuntos_(t.adjuntos);
  if (adj.length === 0) return '';

  const user = getCurrentUser();
  const canDel = !!canDelete;

  return (
    '<div class="bg-slate-50 rounded-xl p-4 mb-6">' +
      '<div class="flex items-center justify-between mb-3">' +
        '<h3 class="font-semibold text-slate-700 text-sm uppercase tracking-wider">📎 Archivos (' + adj.length + ')</h3>' +
      '</div>' +
      '<div class="space-y-2">' +
        adj.map(function (a, i) {
          const badge = a.kind === 'entregable'
            ? '<span class="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">ENTREGABLE</span>'
            : '<span class="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">ADJUNTO</span>';

          const name = a.name ? escapeHtml(a.name) : ('Archivo ' + (i + 1));
          const url = escapeHtml(a.url);

          const delBtn = (canDel && a.id)
            ? '<button type="button" onclick="deleteAttachmentFromTarea(\'' + escapeHtml(t.id) + '\', \'' + escapeHtml(a.id) + '\')" class="text-xs text-red-500 hover:text-red-700 font-semibold">Eliminar</button>'
            : '';

          return (
            '<div class="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3">' +
              '<a href="' + url + '" target="_blank" rel="noopener noreferrer" class="min-w-0 flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 hover:underline">' +
                '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>' +
                '<span class="truncate">' + name + '</span>' +
              '</a>' +
              '<div class="flex items-center gap-2 flex-shrink-0">' +
                badge +
                delBtn +
              '</div>' +
            '</div>'
          );
        }).join('') +
      '</div>' +
    '</div>'
  );
}

// ------------------------------
// PATCH: reemplazo seguro de la parte de adjuntos en renderTareaDetalle()
// ------------------------------
// Si tu función renderTareaDetalle ya existe, NO la reescribimos completa.
// Solo te dejamos un helper que puedes usar en tu HTML:
//
//   + buildAdjuntosHtml_(t, isSupervisor)
//
// En tu renderTareaDetalle(), reemplaza el bloque viejo:
//
// (t.adjuntos && t.adjuntos.length > 0 ? ... t.adjuntos.map(function(url){...}) ... : '')
//
// por:
//
// buildAdjuntosHtml_(t, isSupervisor)
//
// ------------------------------
