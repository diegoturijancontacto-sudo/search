/**

* Backend para Google Sheets (DB)

*

* Hojas (nombres exactos):

* - Proyectos

* - Subproyectos

* - Tareas

* - Responsables

* - Comentarios

* - HistorialAprobaciones

*

* Asignación consecutiva:

* - Proyecto: 1,2,3... (Proyectos!F)

* - Subproyecto: 1.1, 1.2... (Subproyectos!H) según proyecto

* - Tarea: 1.1.1DT (Tareas!K) según subproyecto + iniciales Responsable (Responsables!G)

* donde DT sale de Responsables!Identificador (col G) en MAYÚSCULAS.

* - En tarea_update: si cambia responsable, se actualiza sufijo sin cambiar consecutivo.

*

* Estructura Tareas (con Entregables estructurados):

* A ID

* B ID Subproyecto

* C ID Responsable

* D Prioridad

* E Estatus

* F Detalles

* G Descripción

* H Adjuntos (JSON) <-- incluye adjuntos y evidencias/entregables-subidos

* I Fecha Creación

* J Fecha Límite

* K asignacion

* L Entregables (JSON) <-- entregables estructurados (definición)

*

* BLOQUEADAS:

* - Estado adicional: "bloqueada"

* - Solo supervisor/director puede bloquear/desbloquear

*

* ADJUNTOS / ENTREGABLES (estructura + evidencia):

* - Tareas!H guarda JSON:

* [

* { id, name, url, kind, uploadedBy, createdAt }

* ]

* kind: "adjunto" | "entregable"

*

* ENTREGABLES ESTRUCTURADOS:

* - Tareas!L guarda JSON:

* [

* {

* id: "ent_...",

* descripcion_entregable: "...", // Resultado concreto esperado

* formato_requerido: "PDF|JPG|link|físico|...",

* medio_entrega: "opcore|drive|whatsapp|correo|fisica|otro",

* medio_otro: "..." // solo si medio_entrega = "otro"

* }

* ]

*

* PERMISOS (recomendados):

* - Definir/editar entregables (Tareas!L): supervisor/director

* - Subir archivo kind="entregable": responsable de la tarea o supervisor/director

* - Eliminar archivo (Drive->Papelera + quitar de Tareas!H): supervisor/director

*/


const SHEET_PROYECTOS = 'Proyectos';

const SHEET_SUBPROYECTOS = 'Subproyectos';

const SHEET_TAREAS = 'Tareas';

const SHEET_RESPONSABLES = 'Responsables';

const SHEET_COMENTARIOS = 'Comentarios';

const SHEET_HISTORIAL = 'HistorialAprobaciones';


// Carpeta en Drive donde se guardan archivos

const DRIVE_ATTACHMENTS_FOLDER_ID = '1IKdpJc0ezb6ZwtUzXJm6I91WZIO3s7FS';


// Índices de columnas (1-based) en hoja Tareas

const COL_TAREA_ADJUNTOS = 8; // H

const COL_TAREA_ENTREGABLES = 12; // L

const COL_TAREA_ASIGNACION = 11; // K


// ======================================================

// INIT / VALIDACIÓN DE ESQUEMA

// ======================================================

function ensureSchema_() {

const ss = SpreadsheetApp.getActiveSpreadsheet();


getOrCreateSheet_(ss, SHEET_PROYECTOS, ['ID', 'Nombre', 'Descripción', 'Fecha Creación', 'Estado', 'asignacion']);

getOrCreateSheet_(ss, SHEET_SUBPROYECTOS, ['ID', 'ID Proyecto', 'Nombre', 'Descripción', 'Fecha Inicio', 'Fecha Fin Estimada', 'Fecha Creación', 'asignacion']);


// Importante: agregamos "Entregables" al final (col L) para no romper tu estructura previa

getOrCreateSheet_(ss, SHEET_TAREAS, [

'ID', 'ID Subproyecto', 'ID Responsable', 'Prioridad', 'Estatus',

'Detalles', 'Descripción', 'Adjuntos', 'Fecha Creación', 'Fecha Límite', 'asignacion',

'Entregables'

]);


getOrCreateSheet_(ss, SHEET_RESPONSABLES, ['ID', 'Nombre', 'Departamento', 'Email', 'Rol', 'Fecha Registro', 'Identificador']);

getOrCreateSheet_(ss, SHEET_COMENTARIOS, ['ID', 'ID Tarea', 'ID Responsable', 'Comentario', 'Fecha']);

getOrCreateSheet_(ss, SHEET_HISTORIAL, ['ID', 'ID Tarea', 'ID Supervisor', 'Estado Anterior', 'Estado Nuevo', 'Fecha', 'Observaciones']);


// Asegurar columna Identificador en Responsables y rellenar vacíos

const shR = ss.getSheetByName(SHEET_RESPONSABLES);

const colIdent = ensureColumnWithHeader_(shR, 'Identificador');


const lastRow = shR.getLastRow();

if (lastRow > 1) {

const values = shR.getRange(2, 1, lastRow - 1, Math.max(shR.getLastColumn(), colIdent)).getValues();

for (let i = 0; i < values.length; i++) {

const nombre = (values[i][1] || '').toString();

const ident = (values[i][colIdent - 1] || '').toString().trim();

if (!ident && nombre) {

shR.getRange(i + 2, colIdent).setValue(generarIdentificador(nombre));

}

}

}


// Forzar columnas asignacion como TEXTO (evita 1.1 => 1/1/26)

forceTextColumn_(ss.getSheetByName(SHEET_PROYECTOS), 6); // F

forceTextColumn_(ss.getSheetByName(SHEET_SUBPROYECTOS), 8); // H

forceTextColumn_(ss.getSheetByName(SHEET_TAREAS), COL_TAREA_ASIGNACION); // K

}


function getOrCreateSheet_(ss, name, headers) {

let sh = ss.getSheetByName(name);

if (!sh) {

sh = ss.insertSheet(name);

sh.appendRow(headers);

return sh;

}

if (sh.getLastRow() === 0) {

sh.appendRow(headers);

return sh;

}


// Si la hoja no tiene cabeceras válidas, insertarlas

const a1 = (sh.getRange(1, 1).getValue() || '').toString().trim().toLowerCase();

if (a1 !== 'id') {

sh.insertRowBefore(1);

sh.getRange(1, 1, 1, headers.length).setValues([headers]);

return sh;

}


// Asegurar que existan todas las cabeceras (no destructivo)

const lastCol = Math.max(sh.getLastColumn(), 1);

const row1 = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(v => (v || '').toString().trim());


// Si faltan columnas al final, agrégalas

if (sh.getLastColumn() < headers.length) {

sh.getRange(1, sh.getLastColumn() + 1, 1, headers.length - sh.getLastColumn())

.setValues([headers.slice(sh.getLastColumn())]);

}


// Rellenar headers vacíos dentro del rango existente

for (let i = 0; i < headers.length; i++) {

const expected = headers[i];

const existing = row1[i];

if (!existing) sh.getRange(1, i + 1).setValue(expected);

}


return sh;

}


function ensureColumnWithHeader_(sh, headerName) {

const lastCol = Math.max(sh.getLastColumn(), 1);

const row1 = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(v => (v || '').toString().trim());

let idx = row1.findIndex(h => h.toLowerCase() === headerName.toLowerCase());

if (idx === -1) {

const newCol = lastCol + 1;

sh.getRange(1, newCol).setValue(headerName);

idx = newCol - 1;

}

return idx + 1;

}


function forceTextColumn_(sh, colIndex) {

if (!sh) return;

const lastRow = sh.getLastRow();

if (lastRow < 2) return;

sh.getRange(2, colIndex, lastRow - 1, 1).setNumberFormat('@STRING@');

}


// ======================================================

// UTILIDADES

// ======================================================

function generarIdentificador(nombre) {

if (!nombre) return 'xxx';

const palabras = nombre.toLowerCase().split(' ');

let ident = '';

for (let i = 0; i < Math.min(palabras.length, 3); i++) {

if (palabras[i]) ident += palabras[i][0];

}

if (ident.length === 1 && nombre.length >= 3) ident = nombre.substring(0, 3).toLowerCase();

return ident || 'x';

}


function toIntSafe(v) {

const n = parseInt(v, 10);

return isNaN(n) ? 0 : n;

}


function normalizeAsignacion_(v) {

if (!v) return '';

if (v instanceof Date) return '';

const s = String(v).trim();

if (!s) return '';

if (s.includes('GMT')) return '';

return s;

}


// ======================================================

// ROLES / PERMISOS

// ======================================================

function getResponsableRolById_(ss, responsableId) {

if (!responsableId) return '';

const sh = ss.getSheetByName(SHEET_RESPONSABLES);

if (!sh) return '';

const rows = sh.getDataRange().getValues();

for (let i = 1; i < rows.length; i++) {

if ((rows[i][0] || '').toString() === responsableId.toString()) {

return (rows[i][4] || '').toString(); // col E = Rol

}

}

return '';

}


function isPrivileged_(ss, actorId) {

const rol = getResponsableRolById_(ss, actorId);

return rol === 'supervisor' || rol === 'director';

}


function assertPrivileged_(ss, actorId) {

if (!isPrivileged_(ss, actorId)) {

throw new Error('No autorizado: solo supervisor/director puede realizar esta acción.');

}

}


function getTareaById_(ss, tareaId) {

const shT = ss.getSheetByName(SHEET_TAREAS);

const rows = shT.getDataRange().getValues();

for (let i = 1; i < rows.length; i++) {

if ((rows[i][0] || '').toString() === tareaId.toString()) {

return { rowIndex: i + 1, values: rows[i], sh: shT };

}

}

return null;

}


function assertCanUploadEntregable_(ss, tareaId, actorId) {

const tarea = getTareaById_(ss, tareaId);

if (!tarea) throw new Error('Tarea no encontrada');


const tareaResponsableId = (tarea.values[2] || '').toString(); // col C

if (isPrivileged_(ss, actorId)) return;


if (!actorId || actorId.toString() !== tareaResponsableId.toString()) {

throw new Error('No autorizado: solo el responsable (o supervisor/director) puede subir entregables.');

}

}


function assertCanUploadAdjunto_(ss, tareaId, actorId) {

// Por defecto igual que entregable (puedes relajarlo si quieres)

return assertCanUploadEntregable_(ss, tareaId, actorId);

}


// ======================================================

// ADJUNTOS: JSON en celda (Tareas!H)

// ======================================================

function parseAdjuntosCell_(cellValue) {

const raw = (cellValue || '').toString().trim();

if (!raw) return [];


// JSON

if (raw.startsWith('[') || raw.startsWith('{')) {

try {

const parsed = JSON.parse(raw);

return Array.isArray(parsed) ? parsed : [];

} catch (_) {

// cae a CSV viejo

}

}


// CSV viejo de URLs

return raw

.split(',')

.map(s => s.trim())

.filter(Boolean)

.map(url => ({ id: '', name: '', url, kind: 'adjunto', uploadedBy: '', createdAt: '' }));

}


function stringifyAdjuntosCell_(adjuntos) {

return JSON.stringify(adjuntos || []);

}


// ======================================================

// ENTREGABLES ESTRUCTURADOS: JSON en celda (Tareas!L)

// ======================================================

function parseEntregablesCell_(cellValue) {

const raw = (cellValue || '').toString().trim();

if (!raw) return [];

try {

const parsed = JSON.parse(raw);

return Array.isArray(parsed) ? parsed : [];

} catch (_) {

return [];

}

}


function stringifyEntregablesCell_(entregables) {

return JSON.stringify(entregables || []);

}


function validateMedioEntrega_(medio) {

const allowed = ['opcore', 'drive', 'whatsapp', 'correo', 'fisica', 'otro'];

if (!allowed.includes(medio)) throw new Error('medio_entrega inválido');

}


// ======================================================

// DRIVE

// ======================================================

function getAttachmentsFolder_() {

if (!DRIVE_ATTACHMENTS_FOLDER_ID) throw new Error('Falta DRIVE_ATTACHMENTS_FOLDER_ID');

return DriveApp.getFolderById(DRIVE_ATTACHMENTS_FOLDER_ID);

}


function ensureFileIsShareable_(file) {

// Público por link

file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

}


// ======================================================

// ASIGNACIONES

// ======================================================

function getResponsableInicialesById_(ss, responsableId) {

if (!responsableId) return '';

const sh = ss.getSheetByName(SHEET_RESPONSABLES);

if (!sh) return '';


const colIdent = ensureColumnWithHeader_(sh, 'Identificador');

const rows = sh.getDataRange().getValues();


for (let i = 1; i < rows.length; i++) {

if (rows[i][0]?.toString() === responsableId.toString()) {

const ident = (rows[i][colIdent - 1] || '').toString();

return ident ? ident.toUpperCase() : '';

}

}

return '';

}


function getNextProyectoAsignacion_(ss) {

const sh = ss.getSheetByName(SHEET_PROYECTOS);

const rows = sh.getDataRange().getValues();

let maxA = 0;

for (let i = 1; i < rows.length; i++) maxA = Math.max(maxA, toIntSafe(rows[i][5])); // F

return (maxA + 1).toString();

}


function getProyectoAsignacionById_(ss, proyectoId) {

const sh = ss.getSheetByName(SHEET_PROYECTOS);

const rows = sh.getDataRange().getValues();

for (let i = 1; i < rows.length; i++) {

if (rows[i][0]?.toString() === proyectoId.toString()) return normalizeAsignacion_(rows[i][5]); // F

}

return '';

}


function getNextSubproyectoAsignacion_(ss, proyectoId) {

const proyectoAsign = getProyectoAsignacionById_(ss, proyectoId);

if (!proyectoAsign) return '';


const sh = ss.getSheetByName(SHEET_SUBPROYECTOS);

const rows = sh.getDataRange().getValues();


let maxSub = 0;

for (let i = 1; i < rows.length; i++) {

if (rows[i][1]?.toString() === proyectoId.toString()) {

const asign = normalizeAsignacion_(rows[i][7]); // H

const parts = asign.split('.');

if (parts.length === 2 && parts[0] === proyectoAsign) {

maxSub = Math.max(maxSub, toIntSafe(parts[1]));

}

}

}

return `${proyectoAsign}.${maxSub + 1}`;

}


function getSubproyectoAsignacionById_(ss, subproyectoId) {

const sh = ss.getSheetByName(SHEET_SUBPROYECTOS);

const rows = sh.getDataRange().getValues();

for (let i = 1; i < rows.length; i++) {

if (rows[i][0]?.toString() === subproyectoId.toString()) return normalizeAsignacion_(rows[i][7]); // H

}

return '';

}


function getNextTareaAsignacion_(ss, subproyectoId, responsableId) {

const subAsign = normalizeAsignacion_(getSubproyectoAsignacionById_(ss, subproyectoId)); // "1.1"

if (!subAsign) return '';


const sh = ss.getSheetByName(SHEET_TAREAS);

const rows = sh.getDataRange().getValues();


let maxT = 0;

for (let i = 1; i < rows.length; i++) {

if ((rows[i][1] || '').toString() === subproyectoId.toString()) { // B = ID Subproyecto

const asign = normalizeAsignacion_(rows[i][10]); // K = asignacion

const m = asign.match(/^(\d+)\.(\d+)\.(\d+)([A-Z]*)$/);

if (m) {

const prefix = `${m[1]}.${m[2]}`;

if (prefix === subAsign) maxT = Math.max(maxT, toIntSafe(m[3]));

}

}

}


const ini = getResponsableInicialesById_(ss, responsableId);

return `${subAsign}.${maxT + 1}${ini}`;

}


// ======================================================

// GET

// ======================================================

function doGet() {

try {

ensureSchema_();

const ss = SpreadsheetApp.getActiveSpreadsheet();


const shP = ss.getSheetByName(SHEET_PROYECTOS);

const proyectosData = shP.getDataRange().getValues();

const proyectos = proyectosData.slice(1).map(r => ({

id: r[0]?.toString() || '',

nombre: r[1] || '',

descripcion: r[2] || '',

fecha_creacion: r[3] || '',

estado: r[4] || 'activo',

identificador: generarIdentificador(r[1] || ''),

asignacion: normalizeAsignacion_(r[5])

}));


const shS = ss.getSheetByName(SHEET_SUBPROYECTOS);

const subData = shS.getDataRange().getValues();

const subproyectos = subData.slice(1).map(r => ({

id: r[0]?.toString() || '',

id_proyecto: r[1]?.toString() || '',

nombre: r[2] || '',

descripcion: r[3] || '',

fecha_inicio: r[4] ? new Date(r[4]).toISOString().split('T')[0] : '',

fecha_fin_estimada: r[5] ? new Date(r[5]).toISOString().split('T')[0] : '',

fecha_creacion: r[6] || '',

identificador: generarIdentificador(r[2] || ''),

asignacion: normalizeAsignacion_(r[7])

}));


const shT = ss.getSheetByName(SHEET_TAREAS);

const tareasData = shT.getDataRange().getValues();

const tareas = tareasData.slice(1).map(r => ({

id: (r[0] || '').toString(),

id_subproyecto: (r[1] || '').toString(),

id_responsable: (r[2] || '').toString(),

prioridad: r[3] || 'media',

estatus: r[4] || 'pendiente',

detalles: r[5] || '',

descripcion: r[6] || '',

adjuntos: parseAdjuntosCell_(r[7]),

fecha_creacion: r[8] ? new Date(r[8]).toISOString().split('T')[0] : '',

fecha_limite: r[9] ? new Date(r[9]).toISOString().split('T')[0] : '',

asignacion: normalizeAsignacion_(r[10]),

entregables: parseEntregablesCell_(r[11]) // col L

}));


const shR = ss.getSheetByName(SHEET_RESPONSABLES);

const colIdent = ensureColumnWithHeader_(shR, 'Identificador');

const respData = shR.getDataRange().getValues();

const responsables = respData.slice(1).map(r => ({

id: (r[0] || '').toString(),

nombre: r[1] || '',

departamento: r[2] || '',

email: r[3] || '',

rol: r[4] || 'responsable',

fecha_registro: r[5] || '',

identificador: (r[colIdent - 1] || '').toString() || generarIdentificador(r[1] || '')

}));


const shC = ss.getSheetByName(SHEET_COMENTARIOS);

const comData = shC.getDataRange().getValues();

const comentarios = comData.slice(1).map(r => ({

id: (r[0] || '').toString(),

id_tarea: (r[1] || '').toString(),

id_responsable: (r[2] || '').toString(),

comentario: r[3] || '',

fecha: r[4] || ''

}));


const shH = ss.getSheetByName(SHEET_HISTORIAL);

const histData = shH.getDataRange().getValues();

const historial = histData.slice(1).map(r => ({

id: (r[0] || '').toString(),

id_tarea: (r[1] || '').toString(),

id_supervisor: (r[2] || '').toString(),

estado_anterior: r[3] || '',

estado_nuevo: r[4] || '',

fecha: r[5] || '',

observaciones: r[6] || ''

}));


return ContentService

.createTextOutput(JSON.stringify({ proyectos, subproyectos, tareas, responsables, comentarios, historial }))

.setMimeType(ContentService.MimeType.JSON);


} catch (error) {

return ContentService.createTextOutput(JSON.stringify({

error: error.toString(),

proyectos: [],

subproyectos: [],

tareas: [],

responsables: [],

comentarios: [],

historial: []

})).setMimeType(ContentService.MimeType.JSON);

}

}


// ======================================================

// POST

// ======================================================

function doPost(e) {

try {

ensureSchema_();

const ss = SpreadsheetApp.getActiveSpreadsheet();

const body = JSON.parse(e.postData.contents);

const action = body.action;

const data = body.data || {};


// ======================================================

// 1) ENTREGABLES ESTRUCTURADOS (CRUD) => Tareas!L

// ======================================================

if (action === 'tarea_entregables_set') {

// data: { id_tarea, entregables: [...], id_actor }

const idTarea = (data.id_tarea || '').toString().trim();

const actorId = (data.id_actor || '').toString().trim();

const entregables = Array.isArray(data.entregables) ? data.entregables : [];


if (!idTarea) throw new Error('Falta data.id_tarea');

if (!actorId) throw new Error('Falta data.id_actor');


// Solo supervisor/director define el "qué se entrega" (modelo orientado a resultados)

assertPrivileged_(ss, actorId);


entregables.forEach(en => validateMedioEntrega_((en.medio_entrega || '').toString()));


const tarea = getTareaById_(ss, idTarea);

if (!tarea) throw new Error('Tarea no encontrada');


tarea.sh.getRange(tarea.rowIndex, COL_TAREA_ENTREGABLES).setValue(stringifyEntregablesCell_(entregables));

return ContentService.createTextOutput(JSON.stringify({ result: 'success' }))

.setMimeType(ContentService.MimeType.JSON);

}


else if (action === 'tarea_entregable_add') {

// data: { id_tarea, entregable: {...}, id_actor }

const idTarea = (data.id_tarea || '').toString().trim();

const actorId = (data.id_actor || '').toString().trim();

const entregable = data.entregable || {};


if (!idTarea) throw new Error('Falta data.id_tarea');

if (!actorId) throw new Error('Falta data.id_actor');

assertPrivileged_(ss, actorId);


validateMedioEntrega_((entregable.medio_entrega || '').toString());


const tarea = getTareaById_(ss, idTarea);

if (!tarea) throw new Error('Tarea no encontrada');


const prev = parseEntregablesCell_(tarea.sh.getRange(tarea.rowIndex, COL_TAREA_ENTREGABLES).getValue());


const newEnt = {

id: entregable.id || ('ent_' + Date.now().toString()),

descripcion_entregable: (entregable.descripcion_entregable || '').toString(),

formato_requerido: (entregable.formato_requerido || '').toString(),

medio_entrega: (entregable.medio_entrega || '').toString(),

medio_otro: (entregable.medio_otro || '').toString()

};


prev.push(newEnt);

tarea.sh.getRange(tarea.rowIndex, COL_TAREA_ENTREGABLES).setValue(stringifyEntregablesCell_(prev));


return ContentService.createTextOutput(JSON.stringify({ result: 'success', entregable: newEnt }))

.setMimeType(ContentService.MimeType.JSON);

}


else if (action === 'tarea_entregable_update') {

// data: { id_tarea, entregable: {...}, id_actor }

const idTarea = (data.id_tarea || '').toString().trim();

const actorId = (data.id_actor || '').toString().trim();

const entregable = data.entregable || {};

const entregableId = (entregable.id || '').toString().trim();


if (!idTarea) throw new Error('Falta data.id_tarea');

if (!actorId) throw new Error('Falta data.id_actor');

if (!entregableId) throw new Error('Falta entregable.id');

assertPrivileged_(ss, actorId);


validateMedioEntrega_((entregable.medio_entrega || '').toString());


const tarea = getTareaById_(ss, idTarea);

if (!tarea) throw new Error('Tarea no encontrada');


const prev = parseEntregablesCell_(tarea.sh.getRange(tarea.rowIndex, COL_TAREA_ENTREGABLES).getValue());

const next = prev.map(en => {

if ((en.id || '') !== entregableId) return en;

return {

...en,

descripcion_entregable: (entregable.descripcion_entregable ?? en.descripcion_entregable ?? '').toString(),

formato_requerido: (entregable.formato_requerido ?? en.formato_requerido ?? '').toString(),

medio_entrega: (entregable.medio_entrega ?? en.medio_entrega ?? '').toString(),

medio_otro: (entregable.medio_otro ?? en.medio_otro ?? '').toString()

};

});


tarea.sh.getRange(tarea.rowIndex, COL_TAREA_ENTREGABLES).setValue(stringifyEntregablesCell_(next));

return ContentService.createTextOutput(JSON.stringify({ result: 'success' }))

.setMimeType(ContentService.MimeType.JSON);

}


else if (action === 'tarea_entregable_delete') {

// data: { id_tarea, entregableId, id_actor }

const idTarea = (data.id_tarea || '').toString().trim();

const actorId = (data.id_actor || '').toString().trim();

const entregableId = (data.entregableId || '').toString().trim();


if (!idTarea) throw new Error('Falta data.id_tarea');

if (!actorId) throw new Error('Falta data.id_actor');

if (!entregableId) throw new Error('Falta data.entregableId');

assertPrivileged_(ss, actorId);


const tarea = getTareaById_(ss, idTarea);

if (!tarea) throw new Error('Tarea no encontrada');


const prev = parseEntregablesCell_(tarea.sh.getRange(tarea.rowIndex, COL_TAREA_ENTREGABLES).getValue());

const next = prev.filter(en => (en.id || '') !== entregableId);

tarea.sh.getRange(tarea.rowIndex, COL_TAREA_ENTREGABLES).setValue(stringifyEntregablesCell_(next));


return ContentService.createTextOutput(JSON.stringify({ result: 'success' }))

.setMimeType(ContentService.MimeType.JSON);

}


// ======================================================

// 2) SUBIR ARCHIVO (Adjunto o Entregable como archivo) => Tareas!H

// ======================================================

else if (action === 'tarea_upload_adjunto') {

// data: { id_tarea, filename, mimeType, base64, kind, id_actor }

const idTarea = (data.id_tarea || '').toString().trim();

const actorId = (data.id_actor || '').toString().trim();

const kind = (data.kind || 'adjunto').toString().trim(); // "adjunto" | "entregable"


if (!idTarea) throw new Error('Falta data.id_tarea');

if (!actorId) throw new Error('Falta data.id_actor');

if (!data.base64) throw new Error('Falta data.base64');


if (kind === 'entregable') assertCanUploadEntregable_(ss, idTarea, actorId);

else assertCanUploadAdjunto_(ss, idTarea, actorId);


const folder = getAttachmentsFolder_();

const filename = (data.filename || 'adjunto').toString();

const mimeType = (data.mimeType || 'application/octet-stream').toString();

const base64 = (data.base64 || '').toString();


const bytes = Utilities.base64Decode(base64);

const blob = Utilities.newBlob(bytes, mimeType, filename);


const finalName = `${idTarea}__${kind}__${filename}`;

const file = folder.createFile(blob).setName(finalName);

ensureFileIsShareable_(file);


const fileUrl = file.getUrl();

const fileId = file.getId();


const tarea = getTareaById_(ss, idTarea);

if (tarea) {

const prevRaw = tarea.sh.getRange(tarea.rowIndex, COL_TAREA_ADJUNTOS).getValue();

const prevAdj = parseAdjuntosCell_(prevRaw);

prevAdj.push({

id: fileId,

name: filename,

url: fileUrl,

kind: kind,

uploadedBy: actorId,

createdAt: new Date().toISOString()

});

tarea.sh.getRange(tarea.rowIndex, COL_TAREA_ADJUNTOS).setValue(stringifyAdjuntosCell_(prevAdj));

}


return ContentService.createTextOutput(JSON.stringify({ result: 'success', fileId, url: fileUrl }))

.setMimeType(ContentService.MimeType.JSON);

}


// ======================================================

// 3) ELIMINAR ARCHIVO (Drive->Papelera + quitar de Tareas!H)

// ======================================================

else if (action === 'tarea_adjunto_eliminar') {

// data: { id_tarea, fileId, id_actor }

const idTarea = (data.id_tarea || '').toString().trim();

const fileId = (data.fileId || '').toString().trim();

const actorId = (data.id_actor || '').toString().trim();


if (!idTarea) throw new Error('Falta data.id_tarea');

if (!fileId) throw new Error('Falta data.fileId');

if (!actorId) throw new Error('Falta data.id_actor');


assertPrivileged_(ss, actorId);


DriveApp.getFileById(fileId).setTrashed(true);


const tarea = getTareaById_(ss, idTarea);

if (tarea) {

const prevRaw = tarea.sh.getRange(tarea.rowIndex, COL_TAREA_ADJUNTOS).getValue();

const prevAdj = parseAdjuntosCell_(prevRaw);

const nextAdj = prevAdj.filter(a => (a.id || '') !== fileId);

tarea.sh.getRange(tarea.rowIndex, COL_TAREA_ADJUNTOS).setValue(stringifyAdjuntosCell_(nextAdj));

}


return ContentService.createTextOutput(JSON.stringify({ result: 'success' }))

.setMimeType(ContentService.MimeType.JSON);

}


// ======================================================

// 4) PROYECTOS (CRUD)

// ======================================================

else if (action === 'proyecto_add' || action === 'proyecto_update' || action === 'proyecto_delete') {

const sh = ss.getSheetByName(SHEET_PROYECTOS);


if (action === 'proyecto_add') {

const asignacion = getNextProyectoAsignacion_(ss);

sh.appendRow([data.id, data.nombre, data.descripcion || '', new Date().toISOString(), data.estado || 'activo', '']);

const lastRow = sh.getLastRow();

sh.getRange(lastRow, 6).setNumberFormat('@STRING@');

sh.getRange(lastRow, 6).setValue(String(asignacion));

} else if (action === 'proyecto_update') {

const rows = sh.getDataRange().getValues();

for (let i = 1; i < rows.length; i++) {

if ((rows[i][0] || '').toString() === (data.id || '').toString()) {

sh.getRange(i + 1, 2).setValue(data.nombre);

sh.getRange(i + 1, 3).setValue(data.descripcion || '');

sh.getRange(i + 1, 5).setValue(data.estado || 'activo');

break;

}

}

} else if (action === 'proyecto_delete') {

const rows = sh.getDataRange().getValues();

for (let i = 1; i < rows.length; i++) {

if ((rows[i][0] || '').toString() === (data.id || '').toString()) {

sh.deleteRow(i + 1);

break;

}

}

}

}


// ======================================================

// 5) SUBPROYECTOS (CRUD)

// ======================================================

else if (action === 'subproyecto_add' || action === 'subproyecto_update' || action === 'subproyecto_delete') {

const sh = ss.getSheetByName(SHEET_SUBPROYECTOS);


if (action === 'subproyecto_add') {

const asignacion = getNextSubproyectoAsignacion_(ss, data.id_proyecto);


sh.appendRow([

data.id,

data.id_proyecto,

data.nombre,

data.descripcion || '',

data.fecha_inicio || '',

data.fecha_fin_estimada || '',

new Date().toISOString(),

'' // asignacion (H)

]);


const lastRow = sh.getLastRow();

sh.getRange(lastRow, 8).setNumberFormat('@STRING@'); // H

sh.getRange(lastRow, 8).setValue(String(asignacion || ''));

}

else if (action === 'subproyecto_update') {

const rows = sh.getDataRange().getValues();

for (let i = 1; i < rows.length; i++) {

if ((rows[i][0] || '').toString() === (data.id || '').toString()) {

sh.getRange(i + 1, 2).setValue(data.id_proyecto);

sh.getRange(i + 1, 3).setValue(data.nombre);

sh.getRange(i + 1, 4).setValue(data.descripcion || '');

sh.getRange(i + 1, 5).setValue(data.fecha_inicio || '');

sh.getRange(i + 1, 6).setValue(data.fecha_fin_estimada || '');

break;

}

}

}

else if (action === 'subproyecto_delete') {

const rows = sh.getDataRange().getValues();

for (let i = 1; i < rows.length; i++) {

if ((rows[i][0] || '').toString() === (data.id || '').toString()) {

sh.deleteRow(i + 1);

break;

}

}

}

}


// ======================================================

// 6) TAREAS (CRUD normal)

// ======================================================

else if (action === 'tarea_add' || action === 'tarea_update' || action === 'tarea_delete') {

const sh = ss.getSheetByName(SHEET_TAREAS);


if (action === 'tarea_add') {

const asignacion = getNextTareaAsignacion_(ss, data.id_subproyecto, data.id_responsable);


sh.appendRow([

data.id,

data.id_subproyecto,

data.id_responsable,

data.prioridad || 'media',

data.estatus || 'pendiente',

data.detalles || '',

data.descripcion || '',

// Adjuntos H: puede venir como string o array; lo dejamos como vacío aquí

'', // Adjuntos (H)

new Date().toISOString(),

data.fecha_limite || '',

'' // asignacion (K)

// Entregables (L) se crea en blanco (si existe columna)

]);


// Set asignacion (K) como texto

const lastRow = sh.getLastRow();

sh.getRange(lastRow, COL_TAREA_ASIGNACION).setNumberFormat('@STRING@');

sh.getRange(lastRow, COL_TAREA_ASIGNACION).setValue(String(asignacion || ''));


// Inicializar Entregables (L) si existe

const lastCol = sh.getLastColumn();

if (lastCol >= COL_TAREA_ENTREGABLES) {

sh.getRange(lastRow, COL_TAREA_ENTREGABLES).setValue('[]');

}

}

else if (action === 'tarea_update') {

const rows = sh.getDataRange().getValues();

for (let i = 1; i < rows.length; i++) {

if ((rows[i][0] || '').toString() === (data.id || '').toString()) {

// B..J

sh.getRange(i + 1, 2).setValue(data.id_subproyecto);

sh.getRange(i + 1, 3).setValue(data.id_responsable);

sh.getRange(i + 1, 4).setValue(data.prioridad || 'media');

sh.getRange(i + 1, 5).setValue(data.estatus || 'pendiente');

sh.getRange(i + 1, 6).setValue(data.detalles || '');

sh.getRange(i + 1, 7).setValue(data.descripcion || '');


// Adjuntos (H): si te llegan como array, lo guardamos como JSON

if (Array.isArray(data.adjuntos)) {

sh.getRange(i + 1, COL_TAREA_ADJUNTOS).setValue(stringifyAdjuntosCell_(data.adjuntos));

} else if (typeof data.adjuntos === 'string') {

sh.getRange(i + 1, COL_TAREA_ADJUNTOS).setValue(data.adjuntos);

}


sh.getRange(i + 1, 10).setValue(data.fecha_limite || '');


// actualizar sufijo de asignacion según responsable (sin cambiar 1.1.3)

const prevAsign = normalizeAsignacion_(rows[i][10]); // K (index 10)

const ini = getResponsableInicialesById_(ss, data.id_responsable);

const m = prevAsign.match(/^(\d+\.\d+\.\d+)([A-Z]*)$/);

const newAsign = m ? `${m[1]}${ini}` : getNextTareaAsignacion_(ss, data.id_subproyecto, data.id_responsable);


sh.getRange(i + 1, COL_TAREA_ASIGNACION).setNumberFormat('@STRING@');

sh.getRange(i + 1, COL_TAREA_ASIGNACION).setValue(String(newAsign || ''));


break;

}

}

}

else if (action === 'tarea_delete') {

const rows = sh.getDataRange().getValues();

for (let i = 1; i < rows.length; i++) {

if ((rows[i][0] || '').toString() === (data.id || '').toString()) {

sh.deleteRow(i + 1);

break;

}

}

}

}


// ======================================================

// 7) RESPONSABLES (CRUD)

// ======================================================

else if (action === 'responsable_add' || action === 'responsable_update' || action === 'responsable_delete') {

const sh = ss.getSheetByName(SHEET_RESPONSABLES);

const colIdent = ensureColumnWithHeader_(sh, 'Identificador');


if (action === 'responsable_add') {

const ident = (data.identificador || '').toString().trim() || generarIdentificador(data.nombre);

const row = [

data.id,

data.nombre,

data.departamento || '',

data.email || '',

data.rol || 'responsable',

new Date().toISOString()

];

while (row.length < colIdent) row.push('');

row[colIdent - 1] = ident;

sh.appendRow(row);

} else if (action === 'responsable_update') {

const rows = sh.getDataRange().getValues();

for (let i = 1; i < rows.length; i++) {

if ((rows[i][0] || '').toString() === (data.id || '').toString()) {

sh.getRange(i + 1, 2).setValue(data.nombre);

sh.getRange(i + 1, 3).setValue(data.departamento || '');

sh.getRange(i + 1, 4).setValue(data.email || '');

sh.getRange(i + 1, 5).setValue(data.rol || 'responsable');

sh.getRange(i + 1, colIdent).setValue((data.identificador || '').toString().trim() || generarIdentificador(data.nombre));

break;

}

}

} else if (action === 'responsable_delete') {

const rows = sh.getDataRange().getValues();

for (let i = 1; i < rows.length; i++) {

if ((rows[i][0] || '').toString() === (data.id || '').toString()) {

sh.deleteRow(i + 1);

break;

}

}

}

}


// ======================================================

// 8) COMENTARIOS (add/delete)

// ======================================================

else if (action === 'comentario_add' || action === 'comentario_delete') {

const sh = ss.getSheetByName(SHEET_COMENTARIOS);


if (action === 'comentario_add') {

sh.appendRow([data.id, data.id_tarea, data.id_responsable, data.comentario, new Date().toISOString()]);

} else if (action === 'comentario_delete') {

const rows = sh.getDataRange().getValues();

for (let i = 1; i < rows.length; i++) {

if ((rows[i][0] || '').toString() === (data.id || '').toString()) {

sh.deleteRow(i + 1);

break;

}

}

}

}


// ======================================================

// 9) APROBACIONES + HISTORIAL (+ bloquear/desbloquear)

// ======================================================

else if (

action === 'tarea_revisar' ||

action === 'tarea_aprobar' ||

action === 'tarea_rechazar' ||

action === 'tarea_bloquear' ||

action === 'tarea_desbloquear'

) {

const shT = ss.getSheetByName(SHEET_TAREAS);

const shH = ss.getSheetByName(SHEET_HISTORIAL);


const rows = shT.getDataRange().getValues();

let nuevoEstado = '';


if (action === 'tarea_revisar') nuevoEstado = 'en_revision';

else if (action === 'tarea_aprobar') nuevoEstado = 'completado';

else if (action === 'tarea_rechazar') nuevoEstado = 'en_curso';

else if (action === 'tarea_bloquear') nuevoEstado = 'bloqueada';

else if (action === 'tarea_desbloquear') nuevoEstado = 'en_curso';


// Seguridad: solo supervisor/director puede bloquear/desbloquear

if (action === 'tarea_bloquear' || action === 'tarea_desbloquear') {

assertPrivileged_(ss, data.id_actor || data.id_supervisor);

}


for (let i = 1; i < rows.length; i++) {

if ((rows[i][0] || '').toString() === (data.id_tarea || '').toString()) {

const estadoAnterior = rows[i][4]; // Col E = Estatus

shT.getRange(i + 1, 5).setValue(nuevoEstado);


shH.appendRow([

Date.now().toString(),

data.id_tarea,

data.id_supervisor || data.id_actor || '',

estadoAnterior,

nuevoEstado,

new Date().toISOString(),

data.observaciones || data.motivo || ''

]);

break;

}

}

}


return ContentService.createTextOutput(JSON.stringify({ result: 'success', message: 'Operación completada' }))

.setMimeType(ContentService.MimeType.JSON);


} catch (error) {

return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: error.toString() }))

.setMimeType(ContentService.MimeType.JSON);

}

}


// ======================================================

// TESTS (opcional)

// ======================================================

function testAttachmentsFolder() {

const folder = DriveApp.getFolderById(DRIVE_ATTACHMENTS_FOLDER_ID);

Logger.log(folder.getName());

const f = folder.createFile('test_upload.txt', 'hola');

ensureFileIsShareable_(f);

Logger.log(f.getUrl());

}