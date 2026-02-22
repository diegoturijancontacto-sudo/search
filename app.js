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
let currentNavLevel = 'home'; // 'home' | 'proyecto' | 'subproyecto'

let ganttConfig = { pxPerDay: 50, headerStep: 1 };
let currentUserFilter = '';

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
        currentNavLevel = 'home';
    } else if (level === 'proyecto') {
        currentSubproyecto = null;
        currentNavLevel = 'proyecto';
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

    document.getElementById('view-proyectos').classList.add('hidden');
    document.getElementById('view-subproyectos').classList.add('hidden');
    document.getElementById('view-tareas').classList.add('hidden');

    if (currentNavLevel === 'home') {
        document.getElementById('view-proyectos').classList.remove('hidden');
        renderProyectos();
    } else if (currentNavLevel === 'proyecto') {
        document.getElementById('view-subproyectos').classList.remove('hidden');
        renderSubproyectos();
    } else if (currentNavLevel === 'subproyecto') {
        document.getElementById('view-tareas').classList.remove('hidden');
        renderTareasBoard();
        renderTareasList();
    }
}

function updateBreadcrumb() {
    const elProyecto = document.getElementById('breadcrumb-proyecto');
    const elSubproyecto = document.getElementById('breadcrumb-subproyecto');
    const elProyectoBtn = document.getElementById('breadcrumb-proyecto-btn');
    const elSubproyectoName = document.getElementById('breadcrumb-subproyecto-name');

    if (currentNavLevel === 'home') {
        elProyecto.classList.add('hidden');
        elSubproyecto.classList.add('hidden');
    } else if (currentNavLevel === 'proyecto') {
        elProyecto.classList.remove('hidden');
        elProyecto.style.display = 'inline-flex';
        elProyectoBtn.innerText = currentProyecto ? currentProyecto.nombre : '';
        elSubproyecto.classList.add('hidden');
    } else if (currentNavLevel === 'subproyecto') {
        elProyecto.classList.remove('hidden');
        elProyecto.style.display = 'inline-flex';
        elProyectoBtn.innerText = currentProyecto ? currentProyecto.nombre : '';
        elSubproyecto.classList.remove('hidden');
        elSubproyecto.style.display = 'inline-flex';
        elSubproyectoName.innerText = currentSubproyecto ? currentSubproyecto.nombre : '';
    }
}

function updateHeaderActions() {
    const user = getCurrentUser();
    const isDirector = user && user.role === 'director';
    const container = document.getElementById('header-actions');
    let extraBtns = '';

    if (currentNavLevel === 'home' && isDirector) {
        extraBtns = '<button onclick="openProyectoModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm transition-all flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" /></svg> Nuevo Proyecto</button>';
    } else if (currentNavLevel === 'proyecto' && isDirector) {
        extraBtns = '<button onclick="openSubproyectoModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm transition-all flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" /></svg> Nuevo Subproyecto</button>';
    } else if (currentNavLevel === 'subproyecto' && isDirector) {
        extraBtns = '<button onclick="openTareaModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm transition-all flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" /></svg> Nueva Tarea</button>';
    }

    container.innerHTML = extraBtns + '<button onclick="refreshData()" class="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all">Actualizar</button><a href="admin.html" class="text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-2.5 rounded-lg font-medium transition-all flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg> Usuarios</a>';
}

function updateFilterBar() {
    const bar = document.getElementById('filter-bar');
    if (currentNavLevel === 'subproyecto') {
        bar.classList.remove('hidden');
        bar.style.display = 'flex';
    } else {
        bar.classList.add('hidden');
    }
}

// ============================================
// RENDER: PROYECTOS
// ============================================
function renderProyectos() {
    const container = document.getElementById('view-proyectos');
    const user = getCurrentUser();
    const isDirector = user && user.role === 'director';

    if (proyectos.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-16 text-slate-400"><p class="text-lg mb-2">No hay proyectos aún</p>' + (isDirector ? '<p class="text-sm">Haz clic en "Nuevo Proyecto" para comenzar</p>' : '') + '</div>';
        return;
    }

    container.innerHTML = proyectos.map(function (p) {
        const subCount = subproyectos.filter(function (s) { return s.id_proyecto === p.id; }).length;
        const estadoBadge = p.estado === 'completado' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600';
        const firstChar = (p.nombre || '?').charAt(0).toUpperCase();
        const editBtn = isDirector ? '<button onclick="event.stopPropagation(); openProyectoModal(\'' + p.id + '\')" class="text-xs text-indigo-500 hover:text-indigo-700 font-medium">Editar</button>' : '';
        const descHtml = p.descripcion ? '<p class="text-sm text-slate-500 mb-3 line-clamp-2">' + p.descripcion + '</p>' : '';
        return '<div onclick="selectProyecto(\'' + p.id + '\')" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"><div class="flex items-start justify-between mb-3"><div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg group-hover:bg-indigo-200 transition-colors">' + firstChar + '</div><span class="text-xs px-2 py-1 rounded-full font-bold ' + estadoBadge + '">' + (p.estado || 'activo') + '</span></div><h3 class="font-bold text-slate-800 text-lg mb-1">' + (p.nombre || 'Sin nombre') + '</h3>' + descHtml + '<div class="flex items-center justify-between mt-3 pt-3 border-t border-slate-100"><span class="text-xs text-slate-400 font-medium">' + subCount + ' subproyecto' + (subCount !== 1 ? 's' : '') + '</span>' + editBtn + '</div></div>';
    }).join('');
}

// ============================================
// RENDER: SUBPROYECTOS
// ============================================
function renderSubproyectos() {
    const container = document.getElementById('view-subproyectos');
    const user = getCurrentUser();
    const isDirector = user && user.role === 'director';
    const subs = subproyectos.filter(function (s) { return s.id_proyecto === (currentProyecto ? currentProyecto.id : null); });

    if (subs.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-16 text-slate-400"><p class="text-lg mb-2">No hay subproyectos en este proyecto</p>' + (isDirector ? '<p class="text-sm">Haz clic en "Nuevo Subproyecto" para comenzar</p>' : '') + '</div>';
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
        const editBtn = isDirector ? '<button onclick="event.stopPropagation(); openSubproyectoModal(\'' + s.id + '\')" class="text-xs text-indigo-500 hover:text-indigo-700 font-medium">Editar</button>' : '';
        const descHtml = s.descripcion ? '<p class="text-sm text-slate-500 mb-2 line-clamp-2">' + s.descripcion + '</p>' : '';
        const fechasHtml = (s.fecha_inicio || s.fecha_fin_estimada) ? '<div class="flex gap-2 text-xs text-slate-400 mb-3">' + (s.fecha_inicio ? '<span>\uD83D\uDCC5 ' + s.fecha_inicio + '</span>' : '') + (s.fecha_fin_estimada ? '<span>\uD83C\uDFC1 ' + s.fecha_fin_estimada + '</span>' : '') + '</div>' : '';
        const countersHtml = '<div class="flex gap-1 mb-3 flex-wrap">' +
            (pendienteCount > 0 ? '<span class="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">' + pendienteCount + ' pendiente</span>' : '') +
            (enCursoCount > 0 ? '<span class="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">' + enCursoCount + ' en curso</span>' : '') +
            (enRevisionCount > 0 ? '<span class="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">' + enRevisionCount + ' en revisi\u00F3n</span>' : '') +
            (completadoCount > 0 ? '<span class="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold">' + completadoCount + ' completado</span>' : '') +
            '</div>';
        return '<div onclick="selectSubproyecto(\'' + s.id + '\')" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"><div class="flex items-start justify-between mb-3"><div class="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-lg group-hover:bg-violet-200 transition-colors">' + firstChar + '</div><span class="text-xs text-slate-400 font-medium">' + taskCount + ' tarea' + (taskCount !== 1 ? 's' : '') + '</span></div><h3 class="font-bold text-slate-800 text-lg mb-1">' + (s.nombre || 'Sin nombre') + '</h3>' + descHtml + fechasHtml + countersHtml + '<div class="w-full bg-slate-100 rounded-full h-1.5 mb-3"><div class="bg-emerald-500 h-1.5 rounded-full transition-all" style="width:' + progress + '%"></div></div><div class="flex items-center justify-between pt-2 border-t border-slate-100"><span class="text-xs text-slate-400">' + progress + '% completado</span>' + editBtn + '</div></div>';
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
    return result;
}

function renderTareasBoard() {
    const cols = ['pendiente', 'en_curso', 'en_revision', 'completado'];
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
}

function createTareaCard(tarea, isSupervisor, isDirector) {
    const card = document.createElement('div');
    card.className = 'bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow';
    card.draggable = tarea.estatus !== 'completado';
    card.id = 'tarea-' + tarea.id;
    card.ondragstart = function (e) { e.dataTransfer.setData('text/plain', tarea.id); };

    const resp = responsables.find(function (r) { return r.id === tarea.id_responsable; });
    const respNombre = resp ? resp.nombre : 'Sin asignar';
    const prioColor = getPriorityColor(tarea.prioridad);
    const prioIcon = getPriorityIcon(tarea.prioridad);
    const commentCount = comentarios.filter(function (c) { return c.id_tarea === tarea.id; }).length;
    const canEdit = isDirector || isSupervisor;

    const commentBtnHtml = '<button onclick="event.stopPropagation(); showTareaComments(\'' + tarea.id + '\')" class="text-slate-400 hover:bg-slate-100 p-1 rounded relative" title="Comentarios"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>' + (commentCount > 0 ? '<span class="absolute -top-1 -right-1 bg-indigo-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center">' + commentCount + '</span>' : '') + '</button>';
    const editBtnHtml = canEdit ? '<button onclick="event.stopPropagation(); openTareaModal(\'' + tarea.id + '\')" class="text-slate-400 hover:bg-slate-100 p-1 rounded" title="Editar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>' : '';

    let actionBtns = '';
    if (tarea.estatus === 'pendiente') {
        actionBtns = '<button onclick="event.stopPropagation(); quickChangeEstatus(\'' + tarea.id + '\', \'en_curso\')" class="text-xs bg-blue-100 text-blue-600 hover:bg-blue-200 px-2 py-1 rounded-md font-medium">\u25B6 Iniciar</button>';
    } else if (tarea.estatus === 'en_curso') {
        actionBtns = '<button onclick="event.stopPropagation(); quickChangeEstatus(\'' + tarea.id + '\', \'pendiente\')" class="text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-1 rounded-md font-medium">\u23F8 Pausar</button><button onclick="event.stopPropagation(); quickChangeEstatus(\'' + tarea.id + '\', \'en_revision\')" class="text-xs bg-amber-100 text-amber-600 hover:bg-amber-200 px-2 py-1 rounded-md font-medium">\uD83D\uDD0D Enviar a revisi\u00F3n</button>';
    } else if (tarea.estatus === 'en_revision') {
        if (isSupervisor || isDirector) {
            actionBtns = '<button onclick="event.stopPropagation(); openAprobacionModal(\'' + tarea.id + '\')" class="text-xs bg-emerald-100 text-emerald-600 hover:bg-emerald-200 px-2 py-1 rounded-md font-medium">\u2705 Aprobar / Rechazar</button>';
        } else {
            actionBtns = '<span class="text-xs text-amber-500 font-medium">\u23F3 Esperando aprobaci\u00F3n</span>';
        }
    } else {
        actionBtns = '<span class="text-xs text-emerald-600 font-medium">\u2705 Completado</span>';
    }

    const fechaHtml = tarea.fecha_limite ? '<p class="text-xs text-slate-400 mt-1">\uD83D\uDCC5 ' + tarea.fecha_limite + '</p>' : '';

    card.innerHTML = '<div class="flex items-start justify-between mb-2"><span class="text-xs font-bold px-2 py-0.5 rounded-full ' + prioColor + '">' + prioIcon + ' ' + (tarea.prioridad || 'media') + '</span><div class="flex gap-1">' + commentBtnHtml + editBtnHtml + '</div></div><p class="text-sm text-slate-700 mb-1 leading-snug">' + (tarea.detalles || 'Sin detalles') + '</p><p class="text-[10px] text-slate-400 font-mono mb-2">' + (tarea.id || '') + '</p><p class="text-xs text-slate-400 font-medium">' + respNombre + '</p>' + fechaHtml + '<div class="flex flex-wrap gap-1 mt-3 pt-2 border-t border-slate-100">' + actionBtns + '</div>';
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
        tr.className = 'border-b border-slate-100 hover:bg-slate-50 transition-colors';
        const editBtn = canEdit ? '<button onclick="openTareaModal(\'' + tarea.id + '\')" class="text-indigo-500 hover:bg-indigo-50 p-2 rounded-lg text-xs font-bold uppercase">Editar</button>' : '';
        tr.innerHTML = '<td class="p-4 text-slate-700 max-w-xs"><p class="text-sm leading-snug">' + (tarea.detalles || 'Sin detalles') + '</p><p class="text-[10px] text-slate-400 font-mono mt-0.5">' + (tarea.id || '') + '</p></td><td class="p-4 text-center text-slate-500 text-sm">' + respNombre + '</td><td class="p-4 text-center"><span class="text-xs px-2 py-1 rounded-full font-bold ' + prioColor + '">' + getPriorityIcon(tarea.prioridad) + ' ' + (tarea.prioridad || 'media') + '</span></td><td class="p-4 text-center"><span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ' + statusBadge.class + '">' + statusBadge.label + '</span></td><td class="p-4 text-center text-slate-500 text-sm">' + (tarea.fecha_limite || '-') + '</td><td class="p-4 text-right"><div class="flex gap-1 justify-end">' + editBtn + '</div></td>';
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
        listItem.onclick = function () { openTareaModal(tarea.id); };
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
        bar.onclick = function () { openTareaModal(tarea.id); };
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
    tarea.estatus = nuevoEstatus;
    renderTareasBoard();
    renderTareasList();
    await postToBackend('tarea_update', tarea);
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
        title.innerText = 'Editar Proyecto';
        document.getElementById('proyectoId').value = p.id;
        document.getElementById('proyectoNombre').value = p.nombre || '';
        document.getElementById('proyectoDesc').value = p.descripcion || '';
        document.getElementById('proyectoEstado').value = p.estado || 'activo';
        btnDelete.classList.remove('hidden');
    } else {
        title.innerText = 'Nuevo Proyecto';
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
    try {
        if (id) {
            const idx = proyectos.findIndex(function (p) { return p.id === id; });
            proyectos[idx] = Object.assign({}, proyectos[idx], data);
            await postToBackend('proyecto_update', data);
        } else {
            proyectos.push(data);
            await postToBackend('proyecto_add', data);
            sendWhatsAppNotification('\uD83D\uDFE2 NUEVO PROYECTO: *' + data.nombre + '*\n\uD83D\uDCC5 ' + new Date().toLocaleString('es-ES') + '\n\uD83D\uDD17 ' + PANEL_URL);
        }
        closeProyectoModal();
        renderProyectos();
    } finally {
        showLoading(false);
    }
}

async function deleteProyecto() {
    const id = document.getElementById('proyectoId').value;
    if (!id || !confirm('\u00BFEliminar este proyecto y todos sus subproyectos?')) return;
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
        title.innerText = 'Editar Subproyecto';
        document.getElementById('subproyectoId').value = s.id;
        document.getElementById('subproyectoNombre').value = s.nombre || '';
        document.getElementById('subproyectoDesc').value = s.descripcion || '';
        document.getElementById('subproyectoFechaInicio').value = s.fecha_inicio || '';
        document.getElementById('subproyectoFechaFin').value = s.fecha_fin_estimada || '';
        btnDelete.classList.remove('hidden');
    } else {
        title.innerText = 'Nuevo Subproyecto';
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
    try {
        if (id) {
            const idx = subproyectos.findIndex(function (s) { return s.id === id; });
            subproyectos[idx] = Object.assign({}, subproyectos[idx], data);
            await postToBackend('subproyecto_update', data);
        } else {
            subproyectos.push(data);
            await postToBackend('subproyecto_add', data);
        }
        closeSubproyectoModal();
        renderSubproyectos();
    } finally {
        showLoading(false);
    }
}

async function deleteSubproyecto() {
    const id = document.getElementById('subproyectoId').value;
    if (!id || !confirm('\u00BFEliminar este subproyecto y todas sus tareas?')) return;
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

    const isPrivileged = user && (user.role === 'supervisor' || user.role === 'director');
    statusSelect.innerHTML = '<option value="pendiente">Pendiente</option><option value="en_curso">En Curso</option><option value="en_revision">En Revisi\u00F3n</option>' + (isPrivileged ? '<option value="completado">Completado</option>' : '');

    if (id) {
        const t = tareas.find(function (x) { return x.id === id; });
        if (!t) return;
        title.innerText = 'Editar Tarea';
        document.getElementById('tareaId').value = t.id;
        document.getElementById('tareaDetalles').value = t.detalles || '';
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

    // Obtener datos del formulario
    const id_responsable = document.getElementById('tareaResponsable').value;
    const prioridad = document.getElementById('tareaPrioridad').value;
    const estatus = document.getElementById('tareaEstatus').value;
    const detalles = document.getElementById('tareaDetalles').value;

    // Generar ID con el formato: idproyecto.idsubproyecto.idtarea.idresponsable.prioridad.estatus.detalles
    let nuevoId;
    if (id) {
        // Si es edición, mantener el mismo ID
        nuevoId = id;
    } else {
        // Generar timestamp único para la tarea
        const timestamp = Date.now();

        // Limpiar detalles para el ID (eliminar caracteres especiales y espacios)
        const detallesClean = detalles
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .substring(0, 20); // Limitar a 20 caracteres

        nuevoId = [
            currentProyecto ? currentProyecto.id : 'sin_proyecto',
            currentSubproyecto ? currentSubproyecto.id : 'sin_subproyecto',
            timestamp,
            id_responsable || 'sin_responsable',
            prioridad || 'media',
            estatus || 'pendiente',
            detallesClean || 'sin_detalles'
        ].join('.');
    }

    const data = {
        id: nuevoId,
        id_subproyecto: currentSubproyecto ? currentSubproyecto.id : null,
        id_responsable: id_responsable,
        prioridad: prioridad,
        estatus: estatus,
        detalles: detalles,
        adjuntos: [],
        fecha_limite: document.getElementById('tareaFechaLimite').value
    };

    showLoading(true);
    try {
        if (id) {
            const idx = tareas.findIndex(function (t) { return t.id === id; });
            tareas[idx] = Object.assign({}, tareas[idx], data);
            await postToBackend('tarea_update', data);
        } else {
            tareas.push(data);
            await postToBackend('tarea_add', data);
        }
        closeTareaModal();
        renderTareasBoard();
        renderTareasList();
    } finally {
        showLoading(false);
    }
}

async function deleteTarea() {
    const id = document.getElementById('tareaId').value;
    if (!id || !confirm('\u00BFEliminar esta tarea?')) return;
    tareas = tareas.filter(function (t) { return t.id !== id; });
    closeTareaModal();
    renderTareasBoard();
    renderTareasList();
    await postToBackend('tarea_delete', { id: id });
}

// ============================================
// MODAL DE APROBACIÓN
// ============================================
function openAprobacionModal(tareaId) {
    const tarea = tareas.find(function (t) { return t.id === tareaId; });
    if (!tarea) return;
    const resp = responsables.find(function (r) { return r.id === tarea.id_responsable; });
    document.getElementById('aprobacionTareaId').value = tareaId;
    document.getElementById('aprobacionObservaciones').value = '';
    document.getElementById('aprobacion-tarea-info').innerHTML = '<p class="font-bold mb-1">' + (tarea.detalles || 'Sin detalles') + '</p><p class="text-xs text-slate-500">Responsable: ' + (resp ? resp.nombre : 'Sin asignar') + ' \u2022 Prioridad: ' + (tarea.prioridad || 'media') + '</p>';
    document.getElementById('modal-aprobacion').classList.remove('hidden');
}

function closeAprobacionModal() {
    document.getElementById('modal-aprobacion').classList.add('hidden');
}

async function aprobarTarea() {
    const tareaId = document.getElementById('aprobacionTareaId').value;
    const obs = document.getElementById('aprobacionObservaciones').value;
    const user = getCurrentUser();
    showLoading(true);
    try {
        await postToBackend('tarea_aprobar', { id_tarea: tareaId, id_supervisor: user ? user.id : '', observaciones: obs });
        const tarea = tareas.find(function (t) { return t.id === tareaId; });
        if (tarea) tarea.estatus = 'completado';
        closeAprobacionModal();
        renderTareasBoard();
        renderTareasList();
    } finally {
        showLoading(false);
    }
}

async function rechazarTarea() {
    const tareaId = document.getElementById('aprobacionTareaId').value;
    const obs = document.getElementById('aprobacionObservaciones').value;
    const user = getCurrentUser();
    showLoading(true);
    try {
        await postToBackend('tarea_rechazar', { id_tarea: tareaId, id_supervisor: user ? user.id : '', observaciones: obs });
        const tarea = tareas.find(function (t) { return t.id === tareaId; });
        if (tarea) tarea.estatus = 'en_curso';
        closeAprobacionModal();
        renderTareasBoard();
        renderTareasList();
    } finally {
        showLoading(false);
    }
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
        ? '<p class="text-center text-slate-400 py-4">No hay comentarios a\u00FAn</p>'
        : tareaComments.map(function (c) {
            const resp = responsables.find(function (r) { return r.id === c.id_responsable; });
            return '<div class="bg-slate-50 p-3 rounded-lg border border-slate-200"><div class="flex justify-between items-start mb-1"><span class="font-bold text-xs text-indigo-600">' + (resp ? resp.nombre : c.id_responsable) + '</span><span class="text-[10px] text-slate-400">' + (c.fecha ? new Date(c.fecha).toLocaleString() : '') + '</span></div><p class="text-sm text-slate-700">' + c.comentario + '</p></div>';
        }).join('');

    document.getElementById('comments-modal-content').innerHTML = '<div class="space-y-4"><div class="space-y-3 max-h-60 overflow-y-auto">' + commentsHtml + '</div><div class="border-t border-slate-200 pt-4"><textarea id="new-comment" rows="2" class="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" placeholder="Escribe tu comentario..."></textarea><div class="flex justify-end mt-2"><button onclick="addTareaComment(\'' + tareaId + '\')" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Enviar</button></div></div></div>';
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
    select.innerHTML = '<option value="">Todos</option>';
    responsables.forEach(function (r) {
        select.innerHTML += '<option value="' + r.nombre + '" ' + (currentUserFilter === r.nombre ? 'selected' : '') + '>' + r.nombre + '</option>';
    });
}

function applyUserFilter() {
    currentUserFilter = document.getElementById('filterUser').value;
    renderTareasBoard();
    renderTareasList();
}

function clearFilter() {
    currentUserFilter = '';
    document.getElementById('filterUser').value = '';
    renderTareasBoard();
    renderTareasList();
}

// ============================================
// BACKEND
// ============================================
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
        case 'alta': return '\uD83D\uDD34';
        case 'media': return '\uD83D\uDFE1';
        case 'baja': return '\uD83D\uDFE2';
        default: return '\u26AA';
    }
}

function getStatusBadge(estatus) {
    switch (estatus) {
        case 'pendiente': return { class: 'bg-slate-100 text-slate-600', label: 'Pendiente' };
        case 'en_curso': return { class: 'bg-blue-100 text-blue-600', label: 'En Curso' };
        case 'en_revision': return { class: 'bg-amber-100 text-amber-600', label: 'En Revisi\u00F3n' };
        case 'completado': return { class: 'bg-emerald-100 text-emerald-600', label: 'Completado' };
        default: return { class: 'bg-gray-100 text-gray-600', label: estatus };
    }
}

// ESC cierra todos los modales
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeProyectoModal();
        closeSubproyectoModal();
        closeTareaModal();
        closeAprobacionModal();
        closeCommentsModal();
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

// En saveTarea, después de generar el nuevoId, añade:
if (!id && tareaIdExists(nuevoId)) {
    // Si por alguna razón el ID ya existe, añadir un sufijo
    nuevoId = nuevoId + '.' + Date.now();
}
