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

    if (currentNavLevel === 'proyecto') {
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

    container.innerHTML = extraBtns + '<button onclick="refreshData()" class="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg font-medium shadow-sm transition-all text-sm">Actualizar</button><a href="admin.html" class="text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg> Usuarios</a>';
}

function updateFilterBar() {
    const bar = document.getElementById('filter-bar');
    if (currentNavLevel === 'subproyecto' || currentNavLevel === 'tarea_detail') {
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

    if (currentNavLevel === 'home') {
        cuentasPanel.classList.remove('hidden');
        cuentasPanel.style.display = 'flex';
        if (programasPanel) { programasPanel.classList.add('hidden'); programasPanel.style.display = 'none'; }
        tareasPanel.classList.add('hidden'); tareasPanel.style.display = 'none';
        renderSidebarCuentas();
    } else if (currentNavLevel === 'proyecto') {
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
    if (!container) return;
    if (!currentTarea) {
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
    const editBtn = canEdit
        ? '<button onclick="openInlineEditForm(\'' + t.id + '\')" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700">Editar</button>'
        : '';
    const commentCount = comentarios.filter(function (c) { return c.id_tarea === t.id; }).length;

    // Action buttons based on status
    let actionBtns = '';
    const isLocked = t.estatus === 'bloqueada';
    if (isLocked) {
        if (isSupervisor) {
            actionBtns = '<button onclick="desbloquearTarea(\'' + t.id + '\')" class="flex items-center gap-1.5 bg-green-100 text-green-700 hover:bg-green-200 px-4 py-2 rounded-lg text-sm font-semibold">🔓 Desbloquear</button>';
        } else {
            actionBtns = '<span class="text-sm text-red-500 font-medium">🔒 Tarea bloqueada</span>';
        }
    } else if (t.estatus === 'pendiente') {
        actionBtns = '<button onclick="quickChangeEstatus(\'' + t.id + '\', \'en_curso\')" class="flex items-center gap-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 rounded-lg text-sm font-semibold">▶ Iniciar</button>';
        if (isSupervisor) {
            actionBtns += '<button onclick="bloquearTarea(\'' + t.id + '\')" class="flex items-center gap-1.5 bg-red-100 text-red-600 hover:bg-red-200 px-4 py-2 rounded-lg text-sm font-semibold">🔒 Bloquear</button>';
        }
    } else if (t.estatus === 'en_curso') {
        actionBtns = '<button onclick="quickChangeEstatus(\'' + t.id + '\', \'pendiente\')" class="flex items-center gap-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-lg text-sm font-semibold">⏸ Pausar</button>' +
            '<button onclick="quickChangeEstatus(\'' + t.id + '\', \'en_revision\')" class="flex items-center gap-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 px-4 py-2 rounded-lg text-sm font-semibold">🔍 Enviar a revisión</button>';
        if (isSupervisor) {
            actionBtns += '<button onclick="bloquearTarea(\'' + t.id + '\')" class="flex items-center gap-1.5 bg-red-100 text-red-600 hover:bg-red-200 px-4 py-2 rounded-lg text-sm font-semibold">🔒 Bloquear</button>';
        }
    } else if (t.estatus === 'en_revision') {
        if (isSupervisor) {
            actionBtns = '<button onclick="openAprobacionModal(\'' + t.id + '\')" class="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-4 py-2 rounded-lg text-sm font-semibold">✅ Aprobar / Rechazar</button>';
        }
    }

    container.innerHTML =
        '<div class="flex items-start justify-between mb-6">' +
        '<div>' +
        '<h2 class="text-2xl font-bold text-slate-800">' + (t.detalles || 'Sin título') + '</h2>' +
        (t.asignacion ? '<p class="text-xs text-slate-400 font-mono mt-1">#' + t.asignacion + '</p>' : '') +
        '</div>' +
        '<div class="flex gap-2">' + editBtn + '</div>' +
        '</div>' +
        '<div class="flex flex-wrap gap-3 mb-6">' +
        '<div class="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg"><span class="text-xs text-slate-500 font-medium">Prioridad</span><span class="text-xs px-2 py-0.5 rounded-full font-bold ' + prioColor + '">' + prioIcon + ' ' + (t.prioridad || 'media') + '</span></div>' +
        '<div class="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg"><span class="text-xs text-slate-500 font-medium">Estado</span><span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ' + statusBadge.class + '">' + statusBadge.label + '</span></div>' +
        '<div class="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg"><span class="text-xs text-slate-500 font-medium">Responsable</span><span class="text-sm text-slate-700 font-medium">' + respNombre + '</span></div>' +
        (t.fecha_limite ? '<div class="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg"><span class="text-xs text-slate-500 font-medium">Vencimiento</span><span class="text-sm text-slate-700">📅 ' + t.fecha_limite + '</span></div>' : '') +
        '</div>' +
        (actionBtns ? '<div class="flex flex-wrap gap-2 mb-6 pb-6 border-b border-slate-200">' + actionBtns + '</div>' : '') +
        (t.descripcion ? '<div class="bg-slate-50 rounded-xl p-4 mb-6"><h3 class="font-semibold text-slate-700 mb-2 text-sm uppercase tracking-wider">Descripción</h3><p class="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">' + t.descripcion + '</p></div>' : '') +
        (t.adjuntos && t.adjuntos.length > 0 ?
            '<div class="bg-slate-50 rounded-xl p-4 mb-6"><h3 class="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wider">📎 Adjuntos (' + t.adjuntos.length + ')</h3><div class="space-y-2">' +
            t.adjuntos.map(function (url, i) {
                return '<a href="' + url + '" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 hover:underline break-all">' +
                    '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>' +
                    'Archivo ' + (i + 1) + '</a>';
            }).join('') +
            '</div></div>' : '') +
        '<div class="pt-4 border-t border-slate-200">' +
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
        respOptions += '<option value="' + r.id + '"' + (t.id_responsable === r.id ? ' selected' : '') + '>' + r.nombre + ' (' + (r.rol || '') + ')</option>';
    });
    var statusOpts =
        '<option value="pendiente"' + (t.estatus === 'pendiente' ? ' selected' : '') + '>Pendiente</option>' +
        '<option value="en_curso"' + (t.estatus === 'en_curso' ? ' selected' : '') + '>En Curso</option>' +
        '<option value="en_revision"' + (t.estatus === 'en_revision' ? ' selected' : '') + '>En Revisión</option>' +
        (isPrivileged ? '<option value="completado"' + (t.estatus === 'completado' ? ' selected' : '') + '>Completado</option><option value="bloqueada"' + (t.estatus === 'bloqueada' ? ' selected' : '') + '>🔒 Bloqueada</option>' : '');

    var container = document.getElementById('tarea-detalle-content');
    container.innerHTML =
        '<div class="flex items-center justify-between mb-6">' +
        '<h2 class="text-xl font-bold text-slate-800">Editar Tarea</h2>' +
        '<button type="button" onclick="renderTareaDetalle()" class="text-slate-400 hover:text-slate-600 text-sm font-medium">✕ Cancelar</button>' +
        '</div>' +
        '<form class="space-y-4" onsubmit="saveInlineTarea(event, \'' + id + '\')">' +
        '<div>' +
        '<label class="block text-sm font-bold text-slate-700 mb-1">Título / Detalles</label>' +
        '<textarea id="inline_detalles" required rows="3" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none">' + (t.detalles || '') + '</textarea>' +
        '</div>' +
        '<div>' +
        '<label class="block text-sm font-bold text-slate-700 mb-1">Descripción (larga, opcional)</label>' +
        '<textarea id="inline_descripcion" rows="4" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none">' + (t.descripcion || '') + '</textarea>' +
        '</div>' +
        '<div>' +
        '<label class="block text-sm font-bold text-slate-700 mb-1">Responsable</label>' +
        '<select id="inline_responsable" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">' + respOptions + '</select>' +
        '</div>' +
        '<div>' +
        '<label class="block text-sm font-bold text-slate-700 mb-1">Prioridad</label>' +
        '<select id="inline_prioridad" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">' +
        '<option value="alta"' + (t.prioridad === 'alta' ? ' selected' : '') + '>🔴 Alta</option>' +
        '<option value="media"' + ((t.prioridad === 'media' || !t.prioridad) ? ' selected' : '') + '>🟡 Media</option>' +
        '<option value="baja"' + (t.prioridad === 'baja' ? ' selected' : '') + '>🟢 Baja</option>' +
        '</select>' +
        '</div>' +
        '<div>' +
        '<label class="block text-sm font-bold text-slate-700 mb-1">Estado</label>' +
        '<select id="inline_estatus" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">' + statusOpts + '</select>' +
        '</div>' +
        '<div>' +
        '<label class="block text-sm font-bold text-slate-700 mb-1">Fecha Límite</label>' +
        '<input type="date" id="inline_fecha_limite" value="' + (t.fecha_limite || '') + '" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none">' +
        '</div>' +
        '<div class="flex gap-3 pt-2">' +
        '<button type="button" onclick="renderTareaDetalle()" class="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>' +
        '<button type="submit" id="btn-save-inline-tarea" class="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2"><span>Guardar</span></button>' +
        '</div>' +
        '<button type="button" onclick="deleteTareaInline(\'' + id + '\')" class="w-full mt-2 text-red-500 text-sm font-medium hover:underline' + (isPrivileged ? '' : ' hidden') + '">Eliminar Tarea</button>' +
        '</form>';
}

async function saveInlineTarea(e, id) {
    e.preventDefault();
    var t = tareas.find(function (x) { return x.id === id; });
    if (!t) return;
    var id_responsable = document.getElementById('inline_responsable').value;
    var prioridad = document.getElementById('inline_prioridad').value;
    var estatus = document.getElementById('inline_estatus').value;
    var detalles = document.getElementById('inline_detalles').value;
    var descripcion = document.getElementById('inline_descripcion').value;
    var fecha_limite = document.getElementById('inline_fecha_limite').value;

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
        renderTareasBoard();
        renderTareasList();
        renderTareaDetalle();
    } finally {
        showLoading(false);
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

    container.innerHTML = subs.map(function (s) {
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
        '<div class="flex gap-1">' + descBtnHtml + commentBtnHtml + lockBtnHtml + unlockBtnHtml + editBtnHtml + '</div>' +
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
            '<td class="p-4 text-right"><div class="flex gap-1 justify-end">' + descBtn + editBtn + '</div></td>';

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
// MODALES: PROYECTO
// ============================================
function openProyectoModal(id) {
    const modal = document.getElementById('modal-proyecto');
    const form = document.getElementById('form-proyecto');
    const title = document.getElementById('modal-proyecto-title');
    const btnDelete = document.getElementById('btn-delete-proyecto');
    form.reset();
    if (id) {
        const p = proyectos.find(function (x) { return x.id === id; });
        if (!p) return;
        title.innerText = 'Editar Cuenta';
        document.getElementById('proyectoId').value = p.id;
        document.getElementById('proyectoNombre').value = p.nombre || '';
        document.getElementById('proyectoDesc').value = p.descripcion || '';
        document.getElementById('proyectoEstado').value = p.estado || 'activo';
        btnDelete.classList.remove('hidden');
    } else {
        title.innerText = 'Nueva Cuenta';
        document.getElementById('proyectoId').value = '';
        btnDelete.classList.add('hidden');
    }
    modal.classList.remove('hidden');
}

function closeProyectoModal() {
    document.getElementById('modal-proyecto').classList.add('hidden');
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
// MODALES: SUBPROYECTO
// ============================================
function openSubproyectoModal(id) {
    const modal = document.getElementById('modal-subproyecto');
    const form = document.getElementById('form-subproyecto');
    const title = document.getElementById('modal-subproyecto-title');
    const btnDelete = document.getElementById('btn-delete-subproyecto');
    form.reset();
    if (id) {
        const s = subproyectos.find(function (x) { return x.id === id; });
        if (!s) return;
        title.innerText = 'Editar Programa';
        document.getElementById('subproyectoId').value = s.id;
        document.getElementById('subproyectoNombre').value = s.nombre || '';
        document.getElementById('subproyectoDesc').value = s.descripcion || '';
        document.getElementById('subproyectoFechaInicio').value = s.fecha_inicio || '';
        document.getElementById('subproyectoFechaFin').value = s.fecha_fin_estimada || '';
        btnDelete.classList.remove('hidden');
    } else {
        title.innerText = 'Nuevo Programa';
        document.getElementById('subproyectoId').value = '';
        btnDelete.classList.add('hidden');
    }
    modal.classList.remove('hidden');
}

function closeSubproyectoModal() {
    document.getElementById('modal-subproyecto').classList.add('hidden');
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

function openTareaModal(id) {
    const user = getCurrentUser();
    const modal = document.getElementById('modal-tarea');
    const form = document.getElementById('form-tarea');
    const title = document.getElementById('modal-tarea-title');
    const btnDelete = document.getElementById('btn-delete-tarea');
    const statusSelect = document.getElementById('tareaEstatus');
    form.reset();
    updateResponsableSelect();

    const descEl = document.getElementById('tareaDescripcion');
    if (descEl) descEl.value = '';

    const adjuntosEl = document.getElementById('tareaAdjuntos');
    if (adjuntosEl) adjuntosEl.value = '';

    const isPrivileged = user && (user.role === 'supervisor' || user.role === 'director');
    statusSelect.innerHTML = '<option value="pendiente">Pendiente</option><option value="en_curso">En Curso</option><option value="en_revision">En Revisión</option>' + (isPrivileged ? '<option value="completado">Completado</option><option value="bloqueada">🔒 Bloqueada</option>' : '');

    if (id) {
        const t = tareas.find(function (x) { return x.id === id; });
        if (!t) return;
        if (t.estatus === 'bloqueada' && !isPrivileged) {
            alert('Esta tarea está bloqueada y no puede ser modificada.');
            return;
        }
        title.innerText = 'Editar Tarea';
        document.getElementById('tareaId').value = t.id;
        document.getElementById('tareaDetalles').value = t.detalles || '';
        if (descEl) descEl.value = t.descripcion || '';
        document.getElementById('tareaResponsable').value = t.id_responsable || '';
        document.getElementById('tareaPrioridad').value = t.prioridad || 'media';
        document.getElementById('tareaEstatus').value = t.estatus || 'pendiente';
        document.getElementById('tareaFechaLimite').value = t.fecha_limite || '';
        btnDelete.classList.remove('hidden');
    } else {
        title.innerText = 'Nueva Tarea';
        document.getElementById('tareaId').value = '';
        btnDelete.classList.add('hidden');
    }
    modal.classList.remove('hidden');
}

function closeTareaModal() {
    document.getElementById('modal-tarea').classList.add('hidden');
}

async function saveTarea(e) {
    e.preventDefault();
    const id = document.getElementById('tareaId').value;

    const id_responsable = document.getElementById('tareaResponsable').value;
    const prioridad = document.getElementById('tareaPrioridad').value;
    const estatus = document.getElementById('tareaEstatus').value;
    const detalles = document.getElementById('tareaDetalles').value;

    const descEl = document.getElementById('tareaDescripcion');
    const descripcion = descEl ? descEl.value : '';

    let nuevoId;
    if (id) {
        nuevoId = id;
    } else {
        const timestamp = Date.now();
        const detallesClean = detalles
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .substring(0, 20);

        nuevoId = [
            currentProyecto ? currentProyecto.id : 'sin_proyecto',
            currentSubproyecto ? currentSubproyecto.id : 'sin_subproyecto',
            timestamp,
            id_responsable || 'sin_responsable',
            prioridad || 'media',
            estatus || 'pendiente',
            detallesClean || 'sin_detalles'
        ].join('.');

        if (tareaIdExists(nuevoId)) {
            nuevoId = nuevoId + '.' + Date.now();
        }
    }

    const data = {
        id: nuevoId,
        id_subproyecto: currentSubproyecto ? currentSubproyecto.id : null,
        id_responsable: id_responsable,
        prioridad: prioridad,
        estatus: estatus,
        detalles: detalles,
        descripcion: descripcion, // NUEVO
        adjuntos: [],
        fecha_limite: document.getElementById('tareaFechaLimite').value
    };

    if (!id) {
        data.fecha_inicio = new Date().toISOString().split('T')[0];
    }

    showLoading(true);
    setButtonLoading('btn-save-tarea', true);
    try {
        if (id) {
            const idx = tareas.findIndex(function (t) { return t.id === id; });
            const estatusAnterior = tareas[idx] ? tareas[idx].estatus : null;
            tareas[idx] = Object.assign({}, tareas[idx], data);
            await postToBackend('tarea_update', data);
            if (estatusAnterior && estatusAnterior !== estatus) {
                sendWhatsAppNotification('🔄 TAREA ACTUALIZADA: *' + (detalles || id) + '*\n📊 Estado: ' + estatusAnterior + ' → ' + estatus + '\n📅 ' + new Date().toLocaleString('es-ES') + '\n🔗 ' + PANEL_URL);
            }
        } else {
            tareas.push(data);
            await postToBackend('tarea_add', data);
            sendWhatsAppNotification('📋 NUEVA TAREA: *' + (detalles || id) + '*\n' + (currentSubproyecto ? '📁 Programa: ' + currentSubproyecto.nombre + '\n' : '') + '📅 ' + new Date().toLocaleString('es-ES') + '\n🔗 ' + PANEL_URL);
        }
        const adjuntosEl = document.getElementById('tareaAdjuntos');
        if (adjuntosEl && adjuntosEl.files && adjuntosEl.files.length > 0) {
            await uploadAttachments(nuevoId, adjuntosEl.files);
            closeTareaModal();
            await refreshData();
        } else {
            closeTareaModal();
            renderTareasBoard();
            renderTareasList();
            // If viewing task detail, refresh the view
            if (currentNavLevel === 'tarea_detail' && currentTarea && data.id === currentTarea.id) {
                currentTarea = tareas.find(function (t) { return t.id === data.id; });
                renderTareaDetalle();
            }
        }
    } finally {
        showLoading(false);
        setButtonLoading('btn-save-tarea', false);
    }
}

async function deleteTarea() {
    const id = document.getElementById('tareaId').value;
    if (!id || !confirm('¿Eliminar esta tarea?')) return;
    const wasCurrentTarea = currentTarea && currentTarea.id === id;
    tareas = tareas.filter(function (t) { return t.id !== id; });
    closeTareaModal();
    if (wasCurrentTarea) {
        currentTarea = null;
        currentNavLevel = 'subproyecto';
    }
    renderTareasBoard();
    renderTareasList();
    if (wasCurrentTarea) renderCurrentLevel();
    await postToBackend('tarea_delete', { id: id });
}

// ============================================
// MODAL: DESCRIPCIÓN (POPUP)
// ============================================
function ensureDescripcionModal_() {
    if (document.getElementById('descripcion-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'descripcion-modal';
    modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 hidden p-4 flex items-center justify-center';

    modal.innerHTML =
        '<div class="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden">' +
        '<div class="p-4 border-b border-slate-100 flex items-center justify-between">' +
        '<h3 id="descripcion-modal-title" class="text-base font-bold text-slate-800">Descripción</h3>' +
        '<button onclick="closeDescripcionModal()" class="text-slate-400 hover:text-slate-600 p-1 rounded">' +
        '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>' +
        '</svg>' +
        '</button>' +
        '</div>' +
        '<div class="p-4">' +
        '<div id="descripcion-modal-content" class="text-sm text-slate-700 whitespace-pre-wrap"></div>' +
        '</div>' +
        '<div class="p-4 border-t border-slate-100 flex justify-end">' +
        '<button onclick="closeDescripcionModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">Cerrar</button>' +
        '</div>' +
        '</div>';

    document.body.appendChild(modal);
}

function showTareaDescripcion(tareaId) {
    ensureDescripcionModal_();
    const tarea = tareas.find(function (t) { return t.id === tareaId; });
    if (!tarea) return;

    document.getElementById('descripcion-modal-title').innerText =
        'Descripción: ' + ((tarea.detalles || 'Tarea').toString().substring(0, 60));

    document.getElementById('descripcion-modal-content').textContent =
        (tarea.descripcion || '').trim() || 'Sin descripción.';

    document.getElementById('descripcion-modal').classList.remove('hidden');
}

function closeDescripcionModal() {
    const modal = document.getElementById('descripcion-modal');
    if (modal) modal.classList.add('hidden');
}

// ============================================
// COMENTARIOS
// ============================================
function showTareaComments(tareaId) {
    const tarea = tareas.find(function (t) { return t.id === tareaId; });
    if (!tarea) return;
    const tareaComments = comentarios.filter(function (c) { return c.id_tarea === tareaId; });
    const modal = document.getElementById('comments-modal');
    document.getElementById('comments-modal-title').innerText = 'Comentarios: ' + (tarea.detalles || '').substring(0, 40);

    const commentsHtml = tareaComments.length === 0
        ? '<p class="text-center text-slate-400 py-4">No hay comentarios aún</p>'
        : tareaComments.map(function (c) {
            const resp = responsables.find(function (r) { return r.id === c.id_responsable; });
            return '<div class="bg-slate-50 p-3 rounded-lg border border-slate-200"><div class="flex justify-between items-start mb-1"><span class="font-bold text-xs text-indigo-600">' + (resp ? resp.nombre : c.id_responsable) + '</span><span class="text-[10px] text-slate-400">' + (c.fecha ? new Date(c.fecha).toLocaleString() : '') + '</span></div><p class="text-sm text-slate-700">' + c.comentario + '</p></div>';
        }).join('');

    document.getElementById('comments-modal-content').innerHTML =
        '<div class="space-y-4">' +
        '<div class="space-y-3 max-h-60 overflow-y-auto">' + commentsHtml + '</div>' +
        '<div class="border-t border-slate-200 pt-4">' +
        '<textarea id="new-comment" rows="2" class="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" placeholder="Escribe tu comentario..."></textarea>' +
        '<div class="flex justify-end mt-2">' +
        '<button onclick="addTareaComment(\'' + tareaId + '\')" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Enviar</button>' +
        '</div>' +
        '</div>' +
        '</div>';

    modal.classList.remove('hidden');
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
    document.getElementById('comments-modal').classList.add('hidden');
}

// ============================================
// FILTRO
// ============================================
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

async function uploadAttachments(idTarea, files) {
    if (!WEB_APP_URL || !files || files.length === 0) return;
    var failed = [];
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        try {
            var base64 = await readFileAsBase64(file);
            await fetch(WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'tarea_upload_adjunto',
                    data: {
                        id_tarea: idTarea,
                        filename: file.name,
                        mimeType: file.type || 'application/octet-stream',
                        base64: base64
                    }
                })
            });
        } catch (err) {
            console.error('Error subiendo adjunto:', file.name, err);
            failed.push(file.name);
        }
    }
    if (failed.length > 0) {
        alert('No se pudieron subir los siguientes archivos:\n' + failed.join('\n'));
    }
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
