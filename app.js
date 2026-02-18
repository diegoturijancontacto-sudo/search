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
function renderBoard() {
    const columns = ['curso', 'pausa', 'terminado'];
    columns.forEach(col => {
        const container = document.getElementById(col);
        container.innerHTML = '';
        const filtered = projects.filter(p => p.status === col);
        document.getElementById(`count-${col}`).innerText = filtered.length;

        filtered.forEach(proj => {
            const card = document.createElement('div');
            card.className = 'project-card bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow';
            card.draggable = true;
            card.id = `card-${proj.id}`;
            card.ondragstart = (e) => e.dataTransfer.setData('text/plain', proj.id);

            const daysElapsed = calculateDaysElapsed(proj.start, proj.status);

            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <h4 class="font-bold text-slate-800 mb-1">${proj.name}</h4>
                    <div class="flex gap-1">
                        ${proj.notes ?
                    `<button onclick="event.stopPropagation(); showNotes('${proj.id}')" class="text-indigo-500 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors" title="Ver notas">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                                </svg>
                            </button>` :
                    `<span class="text-slate-300 p-1.5" title="Sin notas">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                                </svg>
                            </span>`
                }
                        <button onclick="event.stopPropagation(); editProject('${proj.id}')" class="text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg transition-colors" title="Editar">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <p class="text-xs text-slate-400 mb-3 font-medium uppercase tracking-tight">${proj.owner}</p>
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
    const project = projects.find(p => p.id == id);
    if (project && project.status !== col.id) {
        const oldStatus = project.status;
        project.status = col.id;
        if (col.id === 'terminado' && oldStatus !== 'terminado') {
            const today = new Date();
            project.end = today.toISOString().split('T')[0];
        }
        // Actualizar manteniendo el filtro
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
    console.log("Renderizando lista con", projectsToUse.length, "proyectos");

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

function renderGantt() {
    const listContainer = document.getElementById('gantt-project-list');
    const headerContainer = document.getElementById('gantt-header');
    const barsContainer = document.getElementById('gantt-bars-area');
    const gridContainer = document.getElementById('gantt-grid-lines');

    listContainer.innerHTML = '';
    headerContainer.innerHTML = '';
    barsContainer.innerHTML = '';
    gridContainer.innerHTML = '';

    const validProjects = projects.filter(p => p.start && p.end);
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

        listItem.innerHTML = `
                        <span class="font-bold text-slate-700 text-xs truncate">${proj.name}</span>
                        <span class="text-[9px] text-slate-400 font-bold uppercase tracking-tighter flex items-center gap-1">
                            ${proj.owner} • ${daysElapsed} días
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
        bar.innerText = `${proj.name} (${daysElapsed} días)`;
        bar.onclick = () => editProject(proj.id);
        barsContainer.appendChild(bar);

        const rowLine = document.createElement('div');
        rowLine.className = 'absolute w-full border-b border-slate-100 pointer-events-none';
        rowLine.style.top = `${(index + 1) * ROW_HEIGHT}px`;
        barsContainer.appendChild(rowLine);
    });
    barsContainer.style.height = `${validProjects.length * ROW_HEIGHT}px`;
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
        document.getElementById('projNotes').value = proj.notes || ''; // <-- AÑADIR ESTA LÍNEA

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
        document.getElementById('days-field-container').classList.remove('hidden');
        document.getElementById('date-fields-container').classList.add('hidden');
        document.getElementById('projDays').value = "7";
        document.getElementById('projNotes').value = ''; // <-- AÑADIR ESTA LÍNEA
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

    // Evitar doble clic
    if (document.getElementById('btn-save').disabled) {
        return;
    }

    setLoading(true); // Activar estado de carga

    try {
        const id = document.getElementById('projId').value;
        const name = document.getElementById('projName').value;
        const owner = document.getElementById('projOwner').value;
        const status = document.getElementById('projStatus').value;
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
            start,
            end,
            days: days,
            notes: notes
        };

        const isNewProject = !id;

        if (id) {
            const idx = projects.findIndex(p => p.id == id);
            projects[idx] = projData;
            await updateProjectInSheets(projData, 'full_update');
        } else {
            projects.push(projData);
            await sendToSheets(projData, 'add');

            // Enviar notificación WhatsApp para nuevos proyectos
            const mensaje = formatProjectMessage('create', projData);
            sendWhatsAppNotification(mensaje);
        }

        renderAll();
        closeModal();
    } catch (error) {
        console.error('Error al guardar:', error);
        alert('Error al guardar el proyecto. Por favor intenta de nuevo.');
    } finally {
        setLoading(false); // Desactivar estado de carga siempre
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
        console.log(`Proyectos en ${col}:`, filtered.length);

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

function renderGantt(projectsToRender = null) {
    const projectsToUse = projectsToRender || projects;
    console.log("Renderizando Gantt con", projectsToUse.length, "proyectos");

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
    console.log("Proyectos con fechas válidas:", validProjects.length);

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

        listItem.innerHTML = `
            <span class="font-bold text-slate-700 text-xs truncate">${proj.name || 'Sin nombre'}</span>
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
        bar.innerText = `${proj.name} (${daysElapsed} días)`;
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

// Agrega esto temporalmente después de refreshData
setTimeout(() => {
    console.log('Estado actual:');
    console.log('- Proyectos:', projects);
    console.log('- Usuarios:', availableUsers);
}, 2000);