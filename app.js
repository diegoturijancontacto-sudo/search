// ============================================
// CONFIGURACIÓN (¡ACTUALIZA ESTO!)
// ============================================
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxJpPgkX8dUfMkZBgrNTnMqJMJRyjwz82jA2Ho05yvahbrRfyZagoHMnbQo7Qch8CT9lw/exec';
const WHATSAPP_BOT_URL = 'https://bot-yy1q.onrender.com/send';
const WHATSAPP_NUMBER = '120363406622431210@g.us'; // <--- NÚMERO DE WHATSAPP O GRUPO
const PANEL_URL = 'https://diegoturijancontacto-sudo.github.io/search/panel.html';

let projects = [];
let ganttConfig = { pxPerDay: 50, headerStep: 1 };

// Inicialización
document.addEventListener('DOMContentLoaded', refreshData);

// ============================================
// FUNCIONES PARA NOTIFICACIONES WHATSAPP
// ============================================
async function sendWhatsAppNotification(message) {
    if (!WHATSAPP_NUMBER) {
        console.warn('Número de WhatsApp no configurado. No se envió notificación.');
        return;
    }
    try {
        const url = `${WHATSAPP_BOT_URL}?number=${encodeURIComponent(WHATSAPP_NUMBER)}&message=${encodeURIComponent(message)}`;
        // Enviamos la notificación sin esperar respuesta para no ralentizar la UI
        fetch(url, { mode: 'no-cors' })
            .then(() => console.log('Notificación enviada intento (modo no-cors)'))
            .catch(err => console.error('Error al enviar notificación WhatsApp:', err));
    } catch (error) {
        console.error('Error al preparar notificación WhatsApp:', error);
    }
}

function formatProjectMessage(action, projData) {
    const actionText = action === 'create' ? '🟢 NUEVO PROYECTO CREADO' : '🔴 PROYECTO ELIMINADO';
    const fechaActual = new Date().toLocaleString('es-ES', { timeZone: 'America/Asuncion' });
    let mensaje = `${actionText}\n`;
    mensaje += `📅 Fecha/Hora: ${fechaActual}\n`;
    mensaje += `━━━━━━━━━━━━━━━━\n`;
    mensaje += `📌 *${projData.name}*\n`;
    mensaje += `👤 Responsable: ${projData.owner}\n`;

    // Añadir notas si existen
    if (projData.notes) {
        mensaje += `📝 Notas: ${projData.notes}\n`;
    }

    if (action === 'create') {
        mensaje += `📊 Estado: ${projData.status === 'curso' ? 'En Curso' : projData.status === 'pausa' ? 'Pausa' : 'Terminado'}\n`;
        mensaje += `📅 Inicio: ${projData.start}\n`;
        if (projData.status !== 'terminado') {
            mensaje += `⏳ Días estimados: ${projData.days || 'N/A'}\n`;
        } else {
            mensaje += `🏁 Fin: ${projData.end}\n`;
        }
    }

    mensaje += `━━━━━━━━━━━━━━━━\n`;
    mensaje += `🔗 Ver panel: ${PANEL_URL}`;
    return mensaje;
}

// ============================================
// FUNCIONES DE GESTIÓN DE DATOS
// ============================================

function showLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
}

async function refreshData() {
    if (!WEB_APP_URL) {
        console.warn("Falta WEB_APP_URL. Los cambios no se guardarán en Google Sheets.");
        return;
    }
    showLoading(true);
    try {
        const response = await fetch(WEB_APP_URL);
        const data = await response.json();

        // Ahora data es un objeto con projects y users
        projects = data.projects || [];
        availableUsers = data.users || [];

        console.log('Proyectos cargados:', projects.length);
        console.log('Usuarios cargados:', availableUsers.length);

        updateUserSelect();
        updateMentions();
        renderAll();
    } catch (error) {
        console.error("Error al cargar datos:", error);
    } finally {
        showLoading(false);
    }
}

function renderAll() {
    // Si hay un filtro activo, aplicarlo
    if (currentUserFilter) {
        filterProjects();
    } else {
        renderBoard(projects);
        renderList(projects);
        renderGantt(projects);
    }
}

function switchView(view) {
    ['board', 'list', 'gantt'].forEach(v => {
        document.getElementById('view-' + v).classList.add('hidden');
        document.getElementById('btn-' + v).className = 'view-btn px-6 py-2 rounded-lg font-medium transition-all text-slate-600 hover:text-slate-900';
    });
    document.getElementById('view-' + view).classList.remove('hidden');
    document.getElementById('btn-' + view).className = 'view-btn px-6 py-2 rounded-lg font-medium transition-all bg-white text-indigo-600 shadow-sm';

    if (view === 'gantt') renderGantt();
}

// Función para calcular días transcurridos
function calculateDaysElapsed(startDate, status) {
    if (!startDate) return 0;

    const start = new Date(startDate);
    const today = new Date();

    if (status === 'terminado') {
        const project = projects.find(p => p.start === startDate);
        if (project && project.end) {
            const end = new Date(project.end);
            return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        }
    }

    return Math.ceil((today - start) / (1000 * 60 * 60 * 24));
}

// --- LÓGICA KANBAN ---
function renderBoard(projectsToRender = null) {
    const projectsToUse = projectsToRender || projects;
    console.log("Renderizando board con", projectsToUse.length, "proyectos");

    const columns = ['curso', 'pausa', 'terminado'];

    columns.forEach(col => {
        const container = document.getElementById(col);
        if (!container) {
            console.error(`Columna ${col} no encontrada`);
            return;
        }

        container.innerHTML = '';
        const filtered = projectsToUse.filter(p => p && p.status === col);

        document.getElementById(`count-${col}`).innerText = filtered.length;

        filtered.forEach(proj => {
            const card = document.createElement('div');
            card.className = 'project-card bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow';
            card.draggable = true;
            card.id = `card-${proj.id}`;
            card.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', proj.id);
            };

            const daysElapsed = calculateDaysElapsed(proj.start, proj.status);
            const commentCount = comments.filter(c => c.projectId == proj.id).length;

            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <h4 class="font-bold text-slate-800 mb-1">${proj.name || 'Sin nombre'}</h4>
                    <div class="flex gap-1">
                        ${proj.notes ?
                    `<button onclick="event.stopPropagation(); showNotes('${proj.id}')" class="text-indigo-500 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors" title="Ver notas">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                                </svg>
                            </button>` :
                    ''
                }
                        <button onclick="event.stopPropagation(); showProjectComments('${proj.id}')" class="text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg transition-colors relative" title="Comentarios">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                            </svg>
                            ${commentCount > 0 ? `<span class="absolute -top-1 -right-1 bg-indigo-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center">${commentCount}</span>` : ''}
                        </button>
                        <button onclick="event.stopPropagation(); editProject('${proj.id}')" class="text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg transition-colors" title="Editar">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <p class="text-xs text-slate-400 mb-3 font-medium uppercase tracking-tight">${proj.owner || 'Sin responsable'}</p>
                <div class="flex items-center justify-between">
                    <div class="flex items-center text-[10px] font-bold text-slate-500 bg-slate-50 p-1.5 rounded-md w-fit border border-slate-100">
                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        ${daysElapsed} días
                    </div>
                    ${proj.status === 'terminado' ? '<span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">Completado</span>' : ''}
                </div>
            `;
            container.appendChild(card);
        });
    });
}

function allowDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function dragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function drop(e) {
    e.preventDefault();
    const col = e.currentTarget;
    col.classList.remove('drag-over');

    const id = e.dataTransfer.getData('text/plain');
    const type = e.dataTransfer.getData('type');

    const project = projects.find(p => p.id == id);
    if (!project) return;

    // Obtener el elemento sobre el que se soltó
    const targetCard = e.target.closest('.project-card');

    if (targetCard && targetCard.id !== `card-${id}`) {
        // Se soltó sobre otra tarjeta - convertir en subproyecto
        const targetId = targetCard.id.replace('card-', '');
        const targetProject = projects.find(p => p.id == targetId);

        if (targetProject && targetProject.owner === project.owner) {
            // Solo permitir subproyectos del mismo responsable
            makeSubProject(id, targetId);
        }
    } else if (project.status !== col.id) {
        // Se soltó en la columna - cambiar estado
        const oldStatus = project.status;
        project.status = col.id;
        if (col.id === 'terminado' && oldStatus !== 'terminado') {
            const today = new Date();
            project.end = today.toISOString().split('T')[0];
        }

        if (currentUserFilter) {
            filterProjects();
        } else {
            renderAll();
        }
        updateProjectInSheets(project, 'status_only');
    }
}

// --- LÓGICA LISTA ---
function renderList(projectsToRender = null) {
    const projectsToUse = projectsToRender || projects;

    const container = document.getElementById('list-content');
    if (!container) return;

    container.innerHTML = '';

    projectsToUse.forEach(proj => {
        if (!proj) return;

        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 hover:bg-slate-50 transition-colors group';

        let badgeClass = 'bg-blue-100 text-blue-600';
        let statusText = 'En Curso';
        if (proj.status === 'pausa') {
            badgeClass = 'bg-amber-100 text-amber-600';
            statusText = 'Pausa';
        }
        if (proj.status === 'terminado') {
            badgeClass = 'bg-emerald-100 text-emerald-600';
            statusText = 'Terminado';
        }

        const daysElapsed = calculateDaysElapsed(proj.start, proj.status);
        const commentCount = comments.filter(c => c.projectId == proj.id).length;

        tr.innerHTML = `
            <td class="p-4">
                <div class="flex items-center gap-2">
                    <div class="font-bold text-slate-700">${proj.name || 'Sin nombre'}</div>
                    ${proj.notes ? '<span class="text-indigo-500 text-xs bg-indigo-50 px-2 py-0.5 rounded-full">📝</span>' : ''}
                </div>
            </td>
            <td class="p-4 text-center text-slate-500 text-sm font-medium">${proj.owner || 'Sin responsable'}</td>
            <td class="p-4 text-center text-slate-700 font-bold">${daysElapsed} días</td>
            <td class="p-4 text-center">
                <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeClass}">${statusText}</span>
            </td>
            <td class="p-4 text-right">
                <div class="flex gap-1 justify-end">
                    ${proj.notes ?
                `<button onclick="showNotes('${proj.id}')" class="text-indigo-500 hover:bg-indigo-50 p-2 rounded-lg transition-colors" title="Ver notas">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                            </svg>
                        </button>` : ''
            }
                    <button onclick="showProjectComments('${proj.id}')" class="text-slate-400 hover:bg-slate-100 p-2 rounded-lg transition-colors relative" title="Comentarios">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                        </svg>
                        ${commentCount > 0 ? `<span class="absolute -top-1 -right-1 bg-indigo-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center">${commentCount}</span>` : ''}
                    </button>
                    <button onclick="editProject('${proj.id}')" class="text-indigo-500 hover:bg-indigo-50 p-2 rounded-lg transition-colors font-bold text-xs uppercase">Editar</button>
                </div>
            </td>
        `;
        container.appendChild(tr);
    });
}

// --- LÓGICA GANTT DINÁMICO ---
function changeZoom(direction) {
    if (direction === 'in') {
        ganttConfig.pxPerDay = 50;
        ganttConfig.headerStep = 1;
    } else {
        ganttConfig.pxPerDay = 12;
        ganttConfig.headerStep = 7;
    }
    renderGantt();
}

// Sincronización scroll Gantt
document.getElementById('gantt-scroll-area').addEventListener('scroll', function (e) {
    document.getElementById('gantt-project-list').scrollTop = e.target.scrollTop;
});

// --- LÓGICA MODAL Y FORMULARIO ---
function handleStatusChange() {
    const status = document.getElementById('projStatus').value;
    const daysField = document.getElementById('days-field-container');
    const dateFields = document.getElementById('date-fields-container');

    if (status === 'terminado') {
        daysField.classList.add('hidden');
        dateFields.classList.remove('hidden');

        if (!document.getElementById('projId').value) {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            document.getElementById('projStart').value = todayStr;
            document.getElementById('projEnd').value = todayStr;
        }
    } else {
        daysField.classList.remove('hidden');
        dateFields.classList.add('hidden');
    }
}

function openModal(isEdit = false, proj = null) {
    const modal = document.getElementById('modal');
    const form = document.getElementById('project-form');
    const title = document.getElementById('modal-title');
    const btnDel = document.getElementById('btn-delete-modal');

    form.reset();
    btnDel.classList.toggle('hidden', !isEdit);

    if (isEdit && proj) {
        title.innerText = "Editar Proyecto";
        document.getElementById('projId').value = proj.id;
        document.getElementById('projName').value = proj.name;
        document.getElementById('projOwner').value = proj.owner;
        document.getElementById('projStatus').value = proj.status;
        document.getElementById('projPriority').value = proj.priority || 'media'; // NUEVO
        document.getElementById('projNotes').value = proj.notes || '';

        if (proj.status === 'terminado') {
            document.getElementById('days-field-container').classList.add('hidden');
            document.getElementById('date-fields-container').classList.remove('hidden');
            document.getElementById('projStart').value = proj.start;
            document.getElementById('projEnd').value = proj.end;
        } else {
            document.getElementById('days-field-container').classList.remove('hidden');
            document.getElementById('date-fields-container').classList.add('hidden');
            if (proj.days) {
                document.getElementById('projDays').value = proj.days;
            }
        }
    } else {
        title.innerText = "Nuevo Proyecto";
        document.getElementById('projId').value = "";
        document.getElementById('projStatus').value = "curso";
        document.getElementById('projPriority').value = "media"; // NUEVO
        document.getElementById('days-field-container').classList.remove('hidden');
        document.getElementById('date-fields-container').classList.add('hidden');
        document.getElementById('projDays').value = "7";
        document.getElementById('projNotes').value = '';
    }
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

function calculateEndDate(startDate, days) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + parseInt(days));
    return date.toISOString().split('T')[0];
}

async function saveProject(e) {
    e.preventDefault();

    if (document.getElementById('btn-save').disabled) return;

    setLoading(true);

    try {
        const id = document.getElementById('projId').value;
        const name = document.getElementById('projName').value;
        const owner = document.getElementById('projOwner').value;
        const status = document.getElementById('projStatus').value;
        const priority = document.getElementById('projPriority').value; // NUEVO
        const notes = document.getElementById('projNotes').value;

        let start, end, days = null;
        const today = new Date().toISOString().split('T')[0];

        if (status === 'terminado') {
            start = document.getElementById('projStart').value;
            end = document.getElementById('projEnd').value;
            if (!start || !end) {
                alert('Por favor selecciona las fechas de inicio y fin');
                setLoading(false);
                return;
            }
        } else {
            days = document.getElementById('projDays').value;
            start = today;
            end = calculateEndDate(today, days);
        }

        const projData = {
            id: id || Date.now().toString(),
            name,
            owner,
            status,
            priority, // NUEVO
            parentId: null, // NUEVO
            start,
            end,
            days: days,
            notes: notes
        };

        if (id) {
            const idx = projects.findIndex(p => p.id == id);
            // Mantener parentId existente
            projData.parentId = projects[idx].parentId || null;
            projects[idx] = projData;
            await updateProjectInSheets(projData, 'full_update');
        } else {
            projects.push(projData);
            await sendToSheets(projData, 'add');
            const mensaje = formatProjectMessage('create', projData);
            sendWhatsAppNotification(mensaje);
        }

        renderAll();
        closeModal();
    } catch (error) {
        console.error('Error al guardar:', error);
        alert('Error al guardar el proyecto. Por favor intenta de nuevo.');
    } finally {
        setLoading(false);
    }
}

async function updateProjectInSheets(proj, type) {
    if (!WEB_APP_URL) return;
    showLoading(true);
    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // Quita esto si no es necesario
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'update', type: type, data: proj })
        });
    } finally {
        showLoading(false);
    }
}

async function sendToSheets(proj, action) {
    if (!WEB_APP_URL) return;
    showLoading(true);
    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // Quita esto si no es necesario
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: action, data: proj })
        });
    } finally {
        showLoading(false);
    }
}

function editProject(id) {
    const project = projects.find(p => p.id == id);
    if (project) openModal(true, project);
}

async function deleteCurrentProject() {
    const id = document.getElementById('projId').value;
    if (!id || !confirm('¿Estás seguro de eliminar este proyecto?')) return;

    const projectToDelete = projects.find(p => p.id == id);

    projects = projects.filter(p => p.id != id);
    renderAll();
    closeModal();

    if (WEB_APP_URL) {
        showLoading(true);
        try {
            await fetch(WEB_APP_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'delete', data: { id } })
            });

            if (projectToDelete) {
                const mensaje = formatProjectMessage('delete', projectToDelete);
                sendWhatsAppNotification(mensaje);
            }
        } finally {
            showLoading(false);
        }
    }
}

// Función para abrir el modal de notas
function showNotes(projectId) {
    const project = projects.find(p => p.id == projectId);
    if (!project) return;

    const modal = document.getElementById('notes-modal');
    const title = document.getElementById('notes-modal-title');
    const content = document.getElementById('notes-modal-content');

    title.innerText = `Notas: ${project.name}`;

    // Crear contenido del modal
    content.innerHTML = `
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                </div>
                <div>
                    <p class="font-bold text-slate-800">${project.owner}</p>
                    <p class="text-xs text-slate-500">Responsable</p>
                </div>
            </div>
            
            <div class="mb-4">
                <p class="text-sm font-bold text-slate-700 mb-2">📝 Notas:</p>
                ${project.notes ?
            `<div class="bg-white p-4 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap">${project.notes}</div>` :
            '<p class="text-slate-400 italic bg-white p-4 rounded-lg border border-slate-200">Este proyecto no tiene notas.</p>'
        }
            </div>
            
            <div class="flex items-center gap-2 text-xs text-slate-500 border-t border-slate-200 pt-3">
                <span class="bg-slate-200 px-2 py-1 rounded-full">📅 Inicio: ${project.start || 'No definido'}</span>
                <span class="bg-slate-200 px-2 py-1 rounded-full">🏁 Fin: ${project.end || 'No definido'}</span>
                <span class="bg-slate-200 px-2 py-1 rounded-full">📊 ${project.status === 'curso' ? 'En Curso' : project.status === 'pausa' ? 'Pausa' : 'Terminado'}</span>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

// Función para cerrar el modal de notas
function closeNotesModal() {
    document.getElementById('notes-modal').classList.add('hidden');
}

// Cerrar modal con tecla ESC
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeNotesModal();
    }
});

// Funciones para manejar el estado de carga del botón
function setLoading(loading) {
    const btn = document.getElementById('btn-save');
    const btnText = document.getElementById('btn-save-text');
    const btnSpinner = document.getElementById('btn-save-spinner');

    if (loading) {
        btn.disabled = true;
        btn.classList.add('opacity-75', 'cursor-not-allowed');
        btnText.classList.add('hidden');
        btnSpinner.classList.remove('hidden');
    } else {
        btn.disabled = false;
        btn.classList.remove('opacity-75', 'cursor-not-allowed');
        btnText.classList.remove('hidden');
        btnSpinner.classList.add('hidden');
    }
}

// Variables para filtros
let currentUserFilter = '';
let availableUsers = [];

// Cargar usuarios al iniciar
async function loadUsers() {
    try {
        const response = await fetch(WEB_APP_URL);
        const data = await response.json();
        availableUsers = data.users || [];
        updateUserSelect();
        updateMentions();
    } catch (error) {
        console.error('Error cargando usuarios:', error);
    }
}

// Actualizar select de filtro
function updateUserSelect() {
    const select = document.getElementById('filterUser');
    if (!select) return;

    select.innerHTML = '<option value="">Todos los usuarios</option>';
    availableUsers.forEach(user => {
        select.innerHTML += `<option value="${user.name}" ${currentUserFilter === user.name ? 'selected' : ''}>${user.name}</option>`;
    });
}

// Sistema de menciones @
function setupMentions() {
    const ownerInput = document.getElementById('projOwner');
    let mentionContainer = document.getElementById('mention-suggestions');

    if (!mentionContainer) {
        mentionContainer = document.createElement('div');
        mentionContainer.id = 'mention-suggestions';
        mentionContainer.className = 'absolute z-50 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto hidden';
        ownerInput.parentElement.style.position = 'relative';
        ownerInput.parentElement.appendChild(mentionContainer);
    }

    ownerInput.addEventListener('input', function (e) {
        const value = e.target.value;
        const atIndex = value.lastIndexOf('@');

        if (atIndex !== -1 && (atIndex === 0 || value[atIndex - 1] === ' ')) {
            const searchTerm = value.substring(atIndex + 1).toLowerCase();
            const matches = availableUsers.filter(user =>
                user.name.toLowerCase().includes(searchTerm)
            );

            if (matches.length > 0) {
                showMentions(matches, atIndex);
            } else {
                mentionContainer.classList.add('hidden');
            }
        } else {
            mentionContainer.classList.add('hidden');
        }
    });

    ownerInput.addEventListener('blur', function () {
        setTimeout(() => mentionContainer.classList.add('hidden'), 200);
    });
}

function showMentions(users, atIndex) {
    const container = document.getElementById('mention-suggestions');
    const input = document.getElementById('projOwner');

    container.innerHTML = '';
    users.forEach(user => {
        const div = document.createElement('div');
        div.className = 'px-4 py-2 hover:bg-indigo-50 cursor-pointer flex items-center gap-2';
        div.innerHTML = `
            <span class="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                ${user.name.charAt(0).toUpperCase()}
            </span>
            <span class="font-medium">${user.name}</span>
            <span class="text-xs text-slate-400">${user.role}</span>
        `;
        div.onclick = () => {
            const currentValue = input.value;
            input.value = currentValue.substring(0, atIndex) + user.name + ' ';
            container.classList.add('hidden');
        };
        container.appendChild(div);
    });

    container.classList.remove('hidden');
}

function updateMentions() {
    if (document.getElementById('projOwner')) {
        setupMentions();
    }
}

// Funciones de filtro
function applyUserFilter() {
    const select = document.getElementById('filterUser');
    currentUserFilter = select.value;

    const badge = document.getElementById('filterBadge');
    if (currentUserFilter) {
        badge.classList.remove('hidden');
        badge.innerText = `Filtrado por: ${currentUserFilter}`;
    } else {
        badge.classList.add('hidden');
    }

    filterProjects();
}

function clearFilter() {
    currentUserFilter = '';
    document.getElementById('filterUser').value = '';
    document.getElementById('filterBadge').classList.add('hidden');
    filterProjects();
}

function filterProjects() {
    console.log('Filtrando por usuario:', currentUserFilter);
    console.log('Total proyectos:', projects.length);

    const filteredProjects = currentUserFilter
        ? projects.filter(p => p.owner === currentUserFilter)
        : projects;

    console.log('Proyectos filtrados:', filteredProjects.length);

    // Actualizar las vistas con los proyectos filtrados
    renderBoard(filteredProjects);
    renderList(filteredProjects);
    renderGantt(filteredProjects);
}

// Modificar las funciones de renderizado para aceptar proyectos filtrados
function renderBoard(projectsToRender = null) {
    const projectsToUse = projectsToRender || projects;

    // Organizar por responsable
    const organizedByOwner = organizeProjectsByOwner(projectsToUse);

    const columns = ['curso', 'pausa', 'terminado'];

    columns.forEach(col => {
        const container = document.getElementById(col);
        if (!container) return;

        container.innerHTML = '';

        // Filtrar proyectos de esta columna
        const columnProjects = projectsToUse.filter(p => p && p.status === col);

        // Organizar por responsable para esta columna
        const ownerGroups = {};
        columnProjects.forEach(p => {
            if (!ownerGroups[p.owner]) {
                ownerGroups[p.owner] = [];
            }
            ownerGroups[p.owner].push(p);
        });

        // Mostrar conteo total
        document.getElementById(`count-${col}`).innerText = columnProjects.length;

        // Renderizar por grupo de responsable
        Object.keys(ownerGroups).sort().forEach(owner => {
            const ownerProjects = ownerGroups[owner];

            // Separar padres e hijos
            const parents = ownerProjects.filter(p => !p.parentId);
            const children = ownerProjects.filter(p => p.parentId);

            // Crear contenedor del grupo
            const groupDiv = document.createElement('div');
            groupDiv.className = 'mb-4';
            groupDiv.innerHTML = `
                <div class="flex items-center gap-2 mb-2 px-2">
                    <div class="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                        ${owner.charAt(0).toUpperCase()}
                    </div>
                    <h4 class="font-bold text-sm text-slate-600">${owner}</h4>
                    <span class="ml-auto text-xs bg-slate-200 px-2 py-0.5 rounded-full">${ownerProjects.length}</span>
                </div>
                <div class="space-y-2" id="group-${col}-${owner.replace(/\s/g, '')}">
                </div>
            `;

            container.appendChild(groupDiv);
            const groupContainer = groupDiv.querySelector(`[id^="group-"]`);

            // Renderizar proyectos padre
            parents.sort((a, b) => {
                const priorityOrder = { 'alta': 0, 'media': 1, 'baja': 2 };
                return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
            }).forEach(parent => {
                const parentCard = createProjectCard(parent, true);
                groupContainer.appendChild(parentCard);

                // Renderizar hijos
                const projectChildren = children.filter(c => c.parentId === parent.id);
                projectChildren.sort((a, b) => a.name.localeCompare(b.name)).forEach(child => {
                    const childCard = createProjectCard(child, false);
                    childCard.classList.add('ml-6', 'border-l-4', 'border-indigo-200', 'bg-indigo-50/30');
                    groupContainer.appendChild(childCard);
                });
            });
        });
    });
}

// Función auxiliar para crear tarjetas de proyecto
function createProjectCard(proj, isParent = true) {
    const card = document.createElement('div');
    card.className = `project-card bg-white p-4 rounded-xl shadow-sm border ${isParent ? 'border-slate-200' : 'border-indigo-100'} mb-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow`;
    card.draggable = true;
    card.id = `card-${proj.id}`;
    card.setAttribute('data-owner', proj.owner);
    card.setAttribute('data-priority', proj.priority);
    card.setAttribute('data-parent', proj.parentId || '');

    card.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', proj.id);
        e.dataTransfer.setData('type', 'project');
    };

    const daysElapsed = calculateDaysElapsed(proj.start, proj.status);
    const commentCount = comments.filter(c => c.projectId == proj.id).length;
    const priorityColor = getPriorityColor(proj.priority);
    const priorityIcon = getPriorityIcon(proj.priority);

    card.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-bold px-2 py-0.5 rounded-full ${priorityColor}">
                        ${priorityIcon} ${proj.priority}
                    </span>
                    ${!isParent ? '<span class="text-xs text-indigo-400">⊢ subproyecto</span>' : ''}
                </div>
                <h4 class="font-bold text-slate-800 mb-1">${proj.name || 'Sin nombre'}</h4>
            </div>
            <div class="flex gap-1">
                ${proj.notes ?
            `<button onclick="event.stopPropagation(); showNotes('${proj.id}')" class="text-indigo-500 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors" title="Ver notas">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                        </svg>
                    </button>` : ''
        }
                <button onclick="event.stopPropagation(); showProjectComments('${proj.id}')" class="text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg transition-colors relative" title="Comentarios">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                    </svg>
                    ${commentCount > 0 ? `<span class="absolute -top-1 -right-1 bg-indigo-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center">${commentCount}</span>` : ''}
                </button>
                <button onclick="event.stopPropagation(); editProject('${proj.id}')" class="text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg transition-colors" title="Editar">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                    </svg>
                </button>
                ${proj.parentId ?
            `<button onclick="event.stopPropagation(); removeHierarchy('${proj.id}')" class="text-amber-500 hover:bg-amber-50 p-1.5 rounded-lg transition-colors" title="Convertir en proyecto independiente">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                    </button>` : ''
        }
            </div>
        </div>
        <p class="text-xs text-slate-400 mb-3 font-medium uppercase tracking-tight">${proj.owner || 'Sin responsable'}</p>
        <div class="flex items-center justify-between">
            <div class="flex items-center text-[10px] font-bold text-slate-500 bg-slate-50 p-1.5 rounded-md w-fit border border-slate-100">
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                ${daysElapsed} días
            </div>
            ${proj.status === 'terminado' ? '<span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">Completado</span>' : ''}
        </div>
    `;

    return card;
}

function renderGantt(projectsToRender = null) {
    const projectsToUse = projectsToRender || projects;

    const listContainer = document.getElementById('gantt-project-list');
    const headerContainer = document.getElementById('gantt-header');
    const barsContainer = document.getElementById('gantt-bars-area');
    const gridContainer = document.getElementById('gantt-grid-lines');

    if (!listContainer || !headerContainer || !barsContainer || !gridContainer) {
        console.error("Contenedores de Gantt no encontrados");
        return;
    }

    listContainer.innerHTML = '';
    headerContainer.innerHTML = '';
    barsContainer.innerHTML = '';
    gridContainer.innerHTML = '';

    const validProjects = projectsToUse.filter(p => p && p.start && p.end);

    if (validProjects.length === 0) {
        listContainer.innerHTML = '<div class="p-6 text-sm text-slate-400">Sin fechas definidas.</div>';
        return;
    }

    // Cálculo de límites temporales
    let minDate = new Date(Math.min(...validProjects.map(p => new Date(p.start))));
    let maxDate = new Date(Math.max(...validProjects.map(p => new Date(p.end))));
    minDate.setDate(minDate.getDate() - 5);
    maxDate.setDate(maxDate.getDate() + 15);

    const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));

    // Render de Cabecera y Grid
    for (let i = 0; i <= totalDays; i++) {
        const currentDate = new Date(minDate);
        currentDate.setDate(minDate.getDate() + i);
        const leftPos = i * ganttConfig.pxPerDay;

        const line = document.createElement('div');
        line.className = 'absolute top-0 bottom-0 border-r border-slate-100';
        line.style.left = `${leftPos}px`;
        line.style.width = `${ganttConfig.pxPerDay}px`;
        const dayNum = currentDate.getDay();
        if (dayNum === 0 || dayNum === 6) line.classList.add('bg-slate-50/50');
        gridContainer.appendChild(line);

        if (i % ganttConfig.headerStep === 0) {
            const dateCell = document.createElement('div');
            dateCell.className = 'absolute top-0 h-full flex items-center justify-center text-[10px] text-slate-400 border-r border-slate-200 truncate px-1 uppercase font-bold';
            dateCell.style.left = `${leftPos}px`;
            dateCell.style.width = `${ganttConfig.pxPerDay * ganttConfig.headerStep}px`;
            dateCell.innerText = currentDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
            headerContainer.appendChild(dateCell);
        }
    }

    // Render de Barras
    const ROW_HEIGHT = 48;
    validProjects.forEach((proj, index) => {
        // Lista lateral
        const listItem = document.createElement('div');
        listItem.className = 'h-12 border-b border-slate-100 flex flex-col justify-center px-4 hover:bg-slate-50 transition cursor-pointer';

        const daysElapsed = calculateDaysElapsed(proj.start, proj.status);
        const commentCount = comments.filter(c => c.projectId == proj.id).length;

        listItem.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="font-bold text-slate-700 text-xs truncate">${proj.name || 'Sin nombre'}</span>
                ${commentCount > 0 ? '<span class="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 rounded-full">💬</span>' : ''}
            </div>
            <span class="text-[9px] text-slate-400 font-bold uppercase tracking-tighter flex items-center gap-1">
                ${proj.owner || 'Sin responsable'} • ${daysElapsed} días
            </span>
        `;
        listItem.onclick = () => editProject(proj.id);
        listContainer.appendChild(listItem);

        // Cálculo de barra
        const start = new Date(proj.start);
        const end = new Date(proj.end);
        const left = ((start - minDate) / (1000 * 60 * 60 * 24)) * ganttConfig.pxPerDay;
        const duration = ((end - start) / (1000 * 60 * 60 * 24)) + 1;
        const width = duration * ganttConfig.pxPerDay;

        let barColor = 'bg-blue-500 shadow-blue-100';
        if (proj.status === 'pausa') barColor = 'bg-amber-500 shadow-amber-100';
        if (proj.status === 'terminado') barColor = 'bg-emerald-500 shadow-emerald-100';

        const bar = document.createElement('div');
        bar.className = `absolute h-6 rounded-md shadow-sm text-[10px] text-white flex items-center px-2 overflow-hidden whitespace-nowrap cursor-pointer hover:brightness-110 transition z-10 font-bold ${barColor}`;
        bar.style.top = `${(index * ROW_HEIGHT) + 12}px`;
        bar.style.left = `${left}px`;
        bar.style.width = `${width}px`;
        bar.innerText = `${proj.name} (${daysElapsed} días)${commentCount > 0 ? ' 💬' : ''}`;
        bar.onclick = () => editProject(proj.id);
        barsContainer.appendChild(bar);

        const rowLine = document.createElement('div');
        rowLine.className = 'absolute w-full border-b border-slate-100 pointer-events-none';
        rowLine.style.top = `${(index + 1) * ROW_HEIGHT}px`;
        barsContainer.appendChild(rowLine);
    });

    barsContainer.style.height = `${validProjects.length * ROW_HEIGHT}px`;
}

// Modificar refreshData para cargar usuarios también
async function refreshData() {
    if (!WEB_APP_URL) {
        console.warn("Falta WEB_APP_URL. Los cambios no se guardarán en Google Sheets.");
        return;
    }
    showLoading(true);
    try {
        const response = await fetch(WEB_APP_URL);
        console.log("Response status:", response.status);

        const responseText = await response.text();
        console.log("Raw response:", responseText.substring(0, 500));

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error("Error parsing JSON:", e);
            console.log("Response was not JSON:", responseText);
            return;
        }

        console.log("Parsed data:", data);

        // Verificar si hay error
        if (data.error) {
            console.error("Error from Apps Script:", data.error);
            alert("Error del servidor: " + data.error);
            return;
        }

        // Ahora data es un objeto con projects y users
        projects = data.projects || [];
        availableUsers = data.users || [];

        console.log('Proyectos cargados:', projects.length, projects);
        console.log('Usuarios cargados:', availableUsers.length, availableUsers);

        if (projects.length === 0) {
            console.warn("No se encontraron proyectos. Verifica la estructura de la hoja de cálculo.");
            console.log("Headers esperados: ID, Nombre, Responsable, Estado, Fecha Inicio, Fecha Fin, Días, Notas");
        }

        updateUserSelect();
        updateMentions();
        renderAll();
    } catch (error) {
        console.error("Error al cargar datos:", error);
    } finally {
        showLoading(false);
    }
}

// ============================================
// SISTEMA DE SESIÓN DE USUARIO
// ============================================

// Verificar usuario al cargar la página
document.addEventListener('DOMContentLoaded', function () {
    checkCurrentUser();
    refreshData();
});

function checkCurrentUser() {
    const userJson = sessionStorage.getItem('currentUser');
    const display = document.getElementById('current-user-display');

    if (!userJson) {
        // Redirigir al login si no hay usuario
        window.location.href = 'login.html';
        return;
    }

    const user = JSON.parse(userJson);
    display.innerText = `👤 ${user.name} (${user.role})`;
}

function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Obtener usuario actual
function getCurrentUser() {
    const userJson = sessionStorage.getItem('currentUser');
    return userJson ? JSON.parse(userJson) : null;
}

// ============================================
// SISTEMA DE COMENTARIOS
// ============================================

let comments = [];

// Cargar comentarios en refreshData
async function refreshData() {
    if (!WEB_APP_URL) {
        console.warn("Falta WEB_APP_URL. Los cambios no se guardarán en Google Sheets.");
        return;
    }
    showLoading(true);
    try {
        const response = await fetch(WEB_APP_URL);
        const responseText = await response.text();

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error("Error parsing JSON:", e);
            return;
        }

        if (data.error) {
            console.error("Error from Apps Script:", data.error);
            alert("Error del servidor: " + data.error);
            return;
        }

        projects = data.projects || [];
        availableUsers = data.users || [];
        comments = data.comments || [];

        console.log('Proyectos cargados:', projects.length);
        console.log('Usuarios cargados:', availableUsers.length);
        console.log('Comentarios cargados:', comments.length);

        if (projects.length === 0) {
            console.warn("No se encontraron proyectos. Verifica la estructura de la hoja de cálculo.");
        }

        updateUserSelect();
        updateMentions();
        renderAll();
    } catch (error) {
        console.error("Error al cargar datos:", error);
    } finally {
        showLoading(false);
    }
}

// Función para mostrar comentarios de un proyecto
function showProjectComments(projectId) {
    const project = projects.find(p => p.id == projectId);
    if (!project) return;

    const projectComments = comments.filter(c => c.projectId == projectId);
    const currentUser = getCurrentUser();

    const modal = document.getElementById('comments-modal');
    const title = document.getElementById('comments-modal-title');
    const content = document.getElementById('comments-modal-content');

    title.innerText = `Comentarios: ${project.name}`;

    content.innerHTML = `
        <div class="space-y-4">
            <!-- Lista de comentarios -->
            <div id="comments-list" class="space-y-3 max-h-60 overflow-y-auto p-2">
                ${projectComments.length === 0 ?
            '<p class="text-center text-slate-400 py-4">No hay comentarios aún</p>' :
            projectComments.map(c => `
                        <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div class="flex justify-between items-start mb-1">
                                <span class="font-bold text-xs text-indigo-600">${c.user}</span>
                                <span class="text-[10px] text-slate-400">${new Date(c.date).toLocaleString()}</span>
                            </div>
                            <p class="text-sm text-slate-700">${c.comment}</p>
                        </div>
                    `).join('')
        }
            </div>
            
            <!-- Nuevo comentario -->
            <div class="border-t border-slate-200 pt-4">
                <textarea id="new-comment" rows="2" class="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" placeholder="Escribe tu comentario..."></textarea>
                <div class="flex justify-end mt-2">
                    <button onclick="addComment('${projectId}')" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                        Enviar comentario
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

// Añadir comentario
// Función para añadir comentarios
async function addComment(projectId) {
    const commentText = document.getElementById('new-comment').value;
    if (!commentText.trim()) return;

    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Debes iniciar sesión para comentar');
        return;
    }

    const commentData = {
        id: Date.now().toString(),
        projectId: projectId,
        user: currentUser.name,
        comment: commentText,
        date: new Date().toISOString()
    };

    showLoading(true);
    try {
        // Usar mode: 'no-cors' para evitar problemas de CORS
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // <-- AÑADIR ESTO
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'comment_add', data: commentData })
        });

        // Añadir el comentario localmente aunque la respuesta no se pueda leer
        comments.push(commentData);

        // Actualizar las vistas para mostrar el nuevo contador
        if (currentUserFilter) {
            filterProjects();
        } else {
            renderAll();
        }

        // Recargar el modal para mostrar el nuevo comentario
        showProjectComments(projectId);

    } catch (error) {
        console.error('Error adding comment:', error);
        alert('Error al añadir comentario. Intenta de nuevo.');
    } finally {
        showLoading(false);
    }
}

// Actualiza también sendToSheets
async function sendToSheets(proj, action) {
    if (!WEB_APP_URL) return;
    showLoading(true);
    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // <-- AÑADIR ESTO
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: action, data: proj })
        });

        // Como no podemos ver la respuesta, asumimos que funcionó
        console.log('Solicitud enviada:', action);

    } catch (error) {
        console.error('Error en sendToSheets:', error);
    } finally {
        showLoading(false);
    }
}

// Actualiza updateProjectInSheets
async function updateProjectInSheets(proj, type) {
    if (!WEB_APP_URL) return;
    showLoading(true);
    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // <-- AÑADIR ESTO
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'update', type: type, data: proj })
        });

        console.log('Actualización enviada:', proj.id);

    } catch (error) {
        console.error('Error en updateProjectInSheets:', error);
    } finally {
        showLoading(false);
    }
}

// Actualiza deleteCurrentProject
async function deleteCurrentProject() {
    const id = document.getElementById('projId').value;
    if (!id || !confirm('¿Estás seguro de eliminar este proyecto?')) return;

    const projectToDelete = projects.find(p => p.id == id);

    projects = projects.filter(p => p.id != id);
    renderAll();
    closeModal();

    if (WEB_APP_URL) {
        showLoading(true);
        try {
            await fetch(WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors', // <-- AÑADIR ESTO
                body: JSON.stringify({ action: 'delete', data: { id } })
            });

            if (projectToDelete) {
                const mensaje = formatProjectMessage('delete', projectToDelete);
                sendWhatsAppNotification(mensaje);
            }
        } finally {
            showLoading(false);
        }
    }
}

// Cerrar modal de comentarios
function closeCommentsModal() {
    document.getElementById('comments-modal').classList.add('hidden');
}

function closeCommentsModal() {
    document.getElementById('comments-modal').classList.add('hidden');
}

// Cerrar con ESC
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeCommentsModal();
        closeNotesModal();
    }
});

// ============================================
// SISTEMA DE PRIORIDADES Y SUBPROYECTOS
// ============================================

// Función para obtener el color de prioridad
function getPriorityColor(priority) {
    switch (priority) {
        case 'alta': return 'bg-red-100 text-red-600 border-red-200';
        case 'media': return 'bg-yellow-100 text-yellow-600 border-yellow-200';
        case 'baja': return 'bg-green-100 text-green-600 border-green-200';
        default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
}

// Función para obtener el icono de prioridad
function getPriorityIcon(priority) {
    switch (priority) {
        case 'alta': return '🔴';
        case 'media': return '🟡';
        case 'baja': return '🟢';
        default: return '⚪';
    }
}

// Función para organizar proyectos por responsable y jerarquía
function organizeProjectsByOwner(projectsList) {
    const organized = {};

    projectsList.forEach(proj => {
        if (!organized[proj.owner]) {
            organized[proj.owner] = {
                owner: proj.owner,
                projects: []
            };
        }

        if (!proj.parentId) {
            // Es proyecto padre
            organized[proj.owner].projects.push({
                ...proj,
                children: projectsList.filter(p => p.parentId === proj.id)
            });
        }
    });

    return Object.values(organized);
}

// Función para obtener subproyectos de un proyecto
function getProjectChildren(projectId) {
    return projects.filter(p => p.parentId === projectId);
}

// Función para convertir en subproyecto (drag & drop)
async function makeSubProject(childId, parentId) {
    const child = projects.find(p => p.id == childId);
    const parent = projects.find(p => p.id == parentId);

    if (!child || !parent) return;

    child.parentId = parentId;

    // Actualizar en la UI
    if (currentUserFilter) {
        filterProjects();
    } else {
        renderAll();
    }

    // Guardar en Google Sheets
    await updateProjectInSheets(child, 'full_update');
}

// Función para eliminar jerarquía (convertir en proyecto independiente)
async function removeHierarchy(projectId) {
    const project = projects.find(p => p.id == projectId);
    if (!project) return;

    project.parentId = null;

    if (currentUserFilter) {
        filterProjects();
    } else {
        renderAll();
    }

    await updateProjectInSheets(project, 'full_update');
}
