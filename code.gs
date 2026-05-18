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
* - Finanzas (Ingresos y Egresos)
* - RegistrosObra (Ficha técnica de obras)
* - Comisiones (NUEVA HOJA)
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
* ESTRUCTURA REGISTROS OBRA (Ficha técnica) - ACTUALIZADA con medidas y Tags:
* A ID
* B Nombre Obra
* C Ubicación (dirección, ciudad, coordenadas)
* D Estatus (Consolidación | Bodega | Vendida)
* E Tipo de Obra
* F Superficie (m²)
* G Precio Lista
* H Precio Venta
* I Fecha Registro
* J Fecha Adquisición
* K Fecha Venta
* L Cliente
* M Documentos (JSON) - escrituras, planos, permisos
* N Observaciones
* O Adjuntos (JSON) - fotos, videos, documentos adicionales
* P ID Responsable (quien registró/administra)
* Q Autor
* R Asignación interna (formato obra-XXX)
* S Provenance
* T Clave
* U Ancho (m)
* V Alto (m)
* W Largo (m)
* X Tags (JSON) - etiquetas personalizadas
*
* ESTRUCTURA COMISIONES:
* A ID
* B Provenance
* C Porcentaje
* D Fecha Registro
*/
const SHEET_PROYECTOS = 'Proyectos';
const SHEET_SUBPROYECTOS = 'Subproyectos';
const SHEET_TAREAS = 'Tareas';
const SHEET_RESPONSABLES = 'Responsables';
const SHEET_COMENTARIOS = 'Comentarios';
const SHEET_HISTORIAL = 'HistorialAprobaciones';
const SHEET_FINANZAS = 'Finanzas';
const SHEET_REGISTROS_OBRA = 'RegistrosObra';
const SHEET_COMISIONES = 'Comisiones';
// Carpeta en Drive donde se guardan archivos
const DRIVE_ATTACHMENTS_FOLDER_ID = '1IKdpJc0ezb6ZwtUzXJm6I91WZIO3s7FS';
// Índices de columnas (1-based) en hoja Tareas
const COL_TAREA_ADJUNTOS = 8; // H
const COL_TAREA_ENTREGABLES = 12; // L
const COL_TAREA_ASIGNACION = 11; // K
// Índices de columnas (1-based) en hoja RegistrosObra (ACTUALIZADO con medidas y Tags)
const COL_REGISTROS_NOMBRE = 2; // B
const COL_REGISTROS_UBICACION = 3; // C
const COL_REGISTROS_ESTATUS = 4; // D
const COL_REGISTROS_TIPO = 5; // E
const COL_REGISTROS_SUPERFICIE = 6; // F
const COL_REGISTROS_PRECIO_LISTA = 7; // G
const COL_REGISTROS_PRECIO_VENTA = 8; // H
const COL_REGISTROS_FECHA_REGISTRO = 9; // I
const COL_REGISTROS_FECHA_ADQUISICION = 10; // J
const COL_REGISTROS_FECHA_VENTA = 11; // K
const COL_REGISTROS_CLIENTE = 12; // L
const COL_REGISTROS_DOCUMENTOS = 13; // M (JSON)
const COL_REGISTROS_OBSERVACIONES = 14; // N
const COL_REGISTROS_ADJUNTOS = 15; // O (JSON)
const COL_REGISTROS_ID_RESPONSABLE = 16; // P
const COL_REGISTROS_AUTOR = 17; // Q
const COL_REGISTROS_ASIGNACION = 18; // R
const COL_REGISTROS_PROVENANCE = 19; // S
const COL_REGISTROS_CLAVE = 20; // T
const COL_REGISTROS_ANCHO = 21; // U - NUEVO
const COL_REGISTROS_ALTO = 22; // V - NUEVO
const COL_REGISTROS_LARGO = 23; // W - NUEVO
const COL_REGISTROS_TAGS = 24; // X - NUEVO (JSON para etiquetas personalizadas)
// Índices de columnas (1-based) en hoja Comisiones
const COL_COMISION_ID = 1; // A
const COL_COMISION_PROVENANCE = 2; // B
const COL_COMISION_PORCENTAJE = 3; // C
const COL_COMISION_FECHA_REGISTRO = 4; // D
// ======================================================
// INIT / VALIDACIÓN DE ESQUEMA
// ======================================================
function ensureSchema_() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
getOrCreateSheet_(ss, SHEET_PROYECTOS, ['ID', 'Nombre', 'Descripción', 'Fecha Creación', 'Estado', 'asignacion']);
getOrCreateSheet_(ss, SHEET_SUBPROYECTOS, ['ID', 'ID Proyecto', 'Nombre', 'Descripción', 'Fecha Inicio', 'Fecha Fin Estimada', 'Fecha Creación', 'asignacion']);
// Tareas
getOrCreateSheet_(ss, SHEET_TAREAS, [
'ID', 'ID Subproyecto', 'ID Responsable', 'Prioridad', 'Estatus',
'Detalles', 'Descripción', 'Adjuntos', 'Fecha Creación', 'Fecha Límite', 'asignacion',
'Entregables'
]);
getOrCreateSheet_(ss, SHEET_RESPONSABLES, ['ID', 'Nombre', 'Departamento', 'Email', 'Rol', 'Fecha Registro', 'Identificador']);
getOrCreateSheet_(ss, SHEET_COMENTARIOS, ['ID', 'ID Tarea', 'ID Responsable', 'Comentario', 'Fecha']);
getOrCreateSheet_(ss, SHEET_HISTORIAL, ['ID', 'ID Tarea', 'ID Supervisor', 'Estado Anterior', 'Estado Nuevo', 'Fecha', 'Observaciones']);
getOrCreateSheet_(ss, SHEET_FINANZAS, ['ID', 'Tipo', 'Monto', 'Concepto', 'Fecha', 'Categoria', 'ID Proyecto', 'ID Responsable', 'Fecha Registro']);
// RegistrosObra (ACTUALIZADO con medidas y Tags)
getOrCreateSheet_(ss, SHEET_REGISTROS_OBRA, [
'ID', 'Nombre Obra', 'Ubicación', 'Estatus', 'Tipo de Obra', 'Superficie (m²)',
'Precio Lista', 'Precio Venta', 'Fecha Registro', 'Fecha Adquisición', 'Fecha Venta',
'Cliente', 'Documentos', 'Observaciones', 'Adjuntos', 'ID Responsable',
'Autor', 'Asignación', 'Provenance', 'Clave',
'Ancho (m)', 'Alto (m)', 'Largo (m)', 'Tags'
]);
// Comisiones (NUEVA HOJA)
getOrCreateSheet_(ss, SHEET_COMISIONES, ['ID', 'Provenance', 'Porcentaje', 'Fecha Registro']);
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
// Forzar columnas asignacion como TEXTO
forceTextColumn_(ss.getSheetByName(SHEET_PROYECTOS), 6);
forceTextColumn_(ss.getSheetByName(SHEET_SUBPROYECTOS), 8);
forceTextColumn_(ss.getSheetByName(SHEET_TAREAS), COL_TAREA_ASIGNACION);
// Forzar columna Asignación en RegistrosObra como TEXTO (ahora es R)
forceTextColumn_(ss.getSheetByName(SHEET_REGISTROS_OBRA), COL_REGISTROS_ASIGNACION);
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
// Asegurar que existan todas las cabeceras
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
function generateObraAsignacion_(ss) {
const sh = ss.getSheetByName(SHEET_REGISTROS_OBRA);
const rows = sh.getDataRange().getValues();
let maxNum = 0;
for (let i = 1; i < rows.length; i++) {
const asignacion = normalizeAsignacion_(rows[i][COL_REGISTROS_ASIGNACION - 1]);
const match = asignacion.match(/^obra-(\d+)$/);
if (match) {
maxNum = Math.max(maxNum, parseInt(match[1], 10));
}
}
return `obra-${maxNum + 1}`;
}
// Funciones para manejar Tags (JSON) en RegistrosObra
function parseTagsCell_(cellValue) {
const raw = (cellValue || '').toString().trim();
if (!raw) return [];
try {
const parsed = JSON.parse(raw);
return Array.isArray(parsed) ? parsed : [];
} catch (_) {
return [];
}
}
function stringifyTagsCell_(tags) {
return JSON.stringify(tags || []);
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
return (rows[i][4] || '').toString();
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
const tareaResponsableId = (tarea.values[2] || '').toString();
if (isPrivileged_(ss, actorId)) return;
if (!actorId || actorId.toString() !== tareaResponsableId.toString()) {
throw new Error('No autorizado: solo el responsable (o supervisor/director) puede subir entregables.');
}
}
function assertCanUploadAdjunto_(ss, tareaId, actorId) {
return assertCanUploadEntregable_(ss, tareaId, actorId);
}
// ======================================================
// ADJUNTOS: JSON en celda (Tareas!H)
// ======================================================
function parseAdjuntosCell_(cellValue) {
const raw = (cellValue || '').toString().trim();
if (!raw) return [];
if (raw.startsWith('[') || raw.startsWith('{')) {
try {
const parsed = JSON.parse(raw);
return Array.isArray(parsed) ? parsed : [];
} catch (_) { }
}
return raw.split(',').map(s => s.trim()).filter(Boolean)
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
// FUNCIONES PARA REGISTROS OBRA
// ======================================================
function parseDocumentosObra_(cellValue) {
const raw = (cellValue || '').toString().trim();
if (!raw) return [];
try {
const parsed = JSON.parse(raw);
return Array.isArray(parsed) ? parsed : [];
} catch (_) {
return [];
}
}
function stringifyDocumentosObra_(documentos) {
return JSON.stringify(documentos || []);
}
function parseAdjuntosObra_(cellValue) {
const raw = (cellValue || '').toString().trim();
if (!raw) return [];
try {
const parsed = JSON.parse(raw);
return Array.isArray(parsed) ? parsed : [];
} catch (_) {
return [];
}
}
function stringifyAdjuntosObra_(adjuntos) {
return JSON.stringify(adjuntos || []);
}
function getRegistroObraById_(ss, obraId) {
const sh = ss.getSheetByName(SHEET_REGISTROS_OBRA);
const rows = sh.getDataRange().getValues();
for (let i = 1; i < rows.length; i++) {
if ((rows[i][0] || '').toString() === obraId.toString()) {
return { rowIndex: i + 1, values: rows[i], sh: sh };
}
}
return null;
}
// ======================================================
// DRIVE
// ======================================================
function getAttachmentsFolder_() {
if (!DRIVE_ATTACHMENTS_FOLDER_ID) throw new Error('Falta DRIVE_ATTACHMENTS_FOLDER_ID');
return DriveApp.getFolderById(DRIVE_ATTACHMENTS_FOLDER_ID);
}
function ensureFileIsShareable_(file) {
try {
file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
} catch (e) {
console.warn('No se pudo cambiar sharing: ' + e);
}
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
for (let i = 1; i < rows.length; i++) maxA = Math.max(maxA, toIntSafe(rows[i][5]));
return (maxA + 1).toString();
}
function getProyectoAsignacionById_(ss, proyectoId) {
const sh = ss.getSheetByName(SHEET_PROYECTOS);
const rows = sh.getDataRange().getValues();
for (let i = 1; i < rows.length; i++) {
if (rows[i][0]?.toString() === proyectoId.toString()) return normalizeAsignacion_(rows[i][5]);
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
const asign = normalizeAsignacion_(rows[i][7]);
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
if (rows[i][0]?.toString() === subproyectoId.toString()) return normalizeAsignacion_(rows[i][7]);
}
return '';
}
function getNextTareaAsignacion_(ss, subproyectoId, responsableId) {
const subAsign = normalizeAsignacion_(getSubproyectoAsignacionById_(ss, subproyectoId));
if (!subAsign) return '';
const sh = ss.getSheetByName(SHEET_TAREAS);
const rows = sh.getDataRange().getValues();
let maxT = 0;
for (let i = 1; i < rows.length; i++) {
if ((rows[i][1] || '').toString() === subproyectoId.toString()) {
const asign = normalizeAsignacion_(rows[i][10]);
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
entregables: parseEntregablesCell_(r[11])
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
const shF = ss.getSheetByName(SHEET_FINANZAS);
const finanzasData = shF.getDataRange().getValues();
const finanzas = finanzasData.slice(1).map(r => ({
id: (r[0] || '').toString(),
tipo: r[1] || '',
monto: parseFloat(r[2]) || 0,
concepto: r[3] || '',
fecha: r[4] ? new Date(r[4]).toISOString().split('T')[0] : '',
categoria: r[5] || '',
id_proyecto: (r[6] || '').toString(),
id_responsable: (r[7] || '').toString(),
fecha_registro: r[8] || ''
}));
// RegistrosObra (ACTUALIZADO con medidas y Tags)
const shO = ss.getSheetByName(SHEET_REGISTROS_OBRA);
const registrosData = shO.getDataRange().getValues();
const registrosObra = registrosData.slice(1).map(r => ({
id: (r[0] || '').toString(),
nombre_obra: r[1] || '',
ubicacion: r[2] || '',
estatus: r[3] || 'Consolidación',
tipo_obra: r[4] || '',
superficie: parseFloat(r[5]) || 0,
precio_lista: parseFloat(r[6]) || 0,
precio_venta: parseFloat(r[7]) || 0,
fecha_registro: r[8] ? new Date(r[8]).toISOString().split('T')[0] : '',
fecha_adquisicion: r[9] ? new Date(r[9]).toISOString().split('T')[0] : '',
fecha_venta: r[10] ? new Date(r[10]).toISOString().split('T')[0] : '',
cliente: r[11] || '',
documentos: parseDocumentosObra_(r[12]),
observaciones: r[13] || '',
adjuntos: parseAdjuntosObra_(r[14]),
id_responsable: (r[15] || '').toString(),
autor: r[16] || '',
asignacion: normalizeAsignacion_(r[17]),
provenance: r[18] || '',
clave: r[19] || '',
ancho: parseFloat(r[20]) || 0,
alto: parseFloat(r[21]) || 0,
largo: parseFloat(r[22]) || 0,
tags: parseTagsCell_(r[23]) // NUEVO: incluir tags en la respuesta
}));
// Comisiones
const shCo = ss.getSheetByName(SHEET_COMISIONES);
const comisionesData = shCo.getDataRange().getValues();
const comisiones = comisionesData.slice(1).map(r => ({
id: (r[0] || '').toString(),
provenance: (r[1] || '').toString(),
porcentaje: parseFloat(r[2]) || 0,
fecha_registro: r[3] || ''
}));
return ContentService
.createTextOutput(JSON.stringify({
proyectos,
subproyectos,
tareas,
responsables,
comentarios,
historial,
finanzas,
registrosObra,
comisiones
}))
.setMimeType(ContentService.MimeType.JSON);
} catch (error) {
return ContentService.createTextOutput(JSON.stringify({
error: error.toString(),
proyectos: [],
subproyectos: [],
tareas: [],
responsables: [],
comentarios: [],
historial: [],
finanzas: [],
registrosObra: [],
comisiones: []
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
// ENTREGABLES ESTRUCTURADOS (CRUD) => Tareas!L
// ======================================================
if (action === 'tarea_entregables_set') {
const idTarea = (data.id_tarea || '').toString().trim();
const actorId = (data.id_actor || '').toString().trim();
const entregables = Array.isArray(data.entregables) ? data.entregables : [];
if (!idTarea) throw new Error('Falta data.id_tarea');
if (!actorId) throw new Error('Falta data.id_actor');
assertPrivileged_(ss, actorId);
entregables.forEach(en => validateMedioEntrega_((en.medio_entrega || '').toString()));
const tarea = getTareaById_(ss, idTarea);
if (!tarea) throw new Error('Tarea no encontrada');
tarea.sh.getRange(tarea.rowIndex, COL_TAREA_ENTREGABLES).setValue(stringifyEntregablesCell_(entregables));
return ContentService.createTextOutput(JSON.stringify({ result: 'success' })).setMimeType(ContentService.MimeType.JSON);
}
else if (action === 'tarea_entregable_add') {
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
return ContentService.createTextOutput(JSON.stringify({ result: 'success', entregable: newEnt })).setMimeType(ContentService.MimeType.JSON);
}
else if (action === 'tarea_entregable_update') {
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
return ContentService.createTextOutput(JSON.stringify({ result: 'success' })).setMimeType(ContentService.MimeType.JSON);
}
else if (action === 'tarea_entregable_delete') {
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
return ContentService.createTextOutput(JSON.stringify({ result: 'success' })).setMimeType(ContentService.MimeType.JSON);
}
// ======================================================
// SUBIR ARCHIVO (Adjunto o Entregable) => Tareas!H
// ======================================================
else if (action === 'tarea_upload_adjunto') {
const idTarea = (data.id_tarea || '').toString().trim();
const actorId = (data.id_actor || '').toString().trim();
const kind = (data.kind || 'adjunto').toString().trim();
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
return ContentService.createTextOutput(JSON.stringify({ result: 'success', fileId, url: fileUrl })).setMimeType(ContentService.MimeType.JSON);
}
// ======================================================
// ELIMINAR ARCHIVO (Drive->Papelera + quitar de Tareas!H)
// ======================================================
else if (action === 'tarea_adjunto_eliminar') {
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
return ContentService.createTextOutput(JSON.stringify({ result: 'success' })).setMimeType(ContentService.MimeType.JSON);
}
// ======================================================
// PROYECTOS (CRUD)
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
// SUBPROYECTOS (CRUD)
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
''
]);
const lastRow = sh.getLastRow();
sh.getRange(lastRow, 8).setNumberFormat('@STRING@');
sh.getRange(lastRow, 8).setValue(String(asignacion || ''));
} else if (action === 'subproyecto_update') {
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
} else if (action === 'subproyecto_delete') {
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
// TAREAS (CRUD normal)
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
'',
new Date().toISOString(),
data.fecha_limite || '',
''
]);
const lastRow = sh.getLastRow();
sh.getRange(lastRow, COL_TAREA_ASIGNACION).setNumberFormat('@STRING@');
sh.getRange(lastRow, COL_TAREA_ASIGNACION).setValue(String(asignacion || ''));
const lastCol = sh.getLastColumn();
if (lastCol >= COL_TAREA_ENTREGABLES) {
sh.getRange(lastRow, COL_TAREA_ENTREGABLES).setValue('[]');
}
} else if (action === 'tarea_update') {
const rows = sh.getDataRange().getValues();
for (let i = 1; i < rows.length; i++) {
if ((rows[i][0] || '').toString() === (data.id || '').toString()) {
sh.getRange(i + 1, 2).setValue(data.id_subproyecto);
sh.getRange(i + 1, 3).setValue(data.id_responsable);
sh.getRange(i + 1, 4).setValue(data.prioridad || 'media');
sh.getRange(i + 1, 5).setValue(data.estatus || 'pendiente');
sh.getRange(i + 1, 6).setValue(data.detalles || '');
sh.getRange(i + 1, 7).setValue(data.descripcion || '');
if (Array.isArray(data.adjuntos)) {
sh.getRange(i + 1, COL_TAREA_ADJUNTOS).setValue(stringifyAdjuntosCell_(data.adjuntos));
} else if (typeof data.adjuntos === 'string') {
sh.getRange(i + 1, COL_TAREA_ADJUNTOS).setValue(data.adjuntos);
}
sh.getRange(i + 1, 10).setValue(data.fecha_limite || '');
const prevAsign = normalizeAsignacion_(rows[i][10]);
const ini = getResponsableInicialesById_(ss, data.id_responsable);
const m = prevAsign.match(/^(\d+\.\d+\.\d+)([A-Z]*)$/);
const newAsign = m ? `${m[1]}${ini}` : getNextTareaAsignacion_(ss, data.id_subproyecto, data.id_responsable);
sh.getRange(i + 1, COL_TAREA_ASIGNACION).setNumberFormat('@STRING@');
sh.getRange(i + 1, COL_TAREA_ASIGNACION).setValue(String(newAsign || ''));
break;
}
}
} else if (action === 'tarea_delete') {
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
// RESPONSABLES (CRUD)
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
// COMENTARIOS (add/delete)
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
// APROBACIONES + HISTORIAL (+ bloquear/desbloquear)
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
if (action === 'tarea_bloquear' || action === 'tarea_desbloquear') {
assertPrivileged_(ss, data.id_actor || data.id_supervisor);
}
for (let i = 1; i < rows.length; i++) {
if ((rows[i][0] || '').toString() === (data.id_tarea || '').toString()) {
const estadoAnterior = rows[i][4];
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
// ======================================================
// FINANZAS / INGRESOS Y EGRESOS (CRUD)
// ======================================================
else if (action === 'finanza_add' || action === 'finanza_update' || action === 'finanza_delete') {
const sh = ss.getSheetByName(SHEET_FINANZAS);
if (action === 'finanza_add') {
sh.appendRow([
data.id || ('fin_' + Date.now().toString()),
data.tipo || 'egreso',
data.monto || 0,
data.concepto || '',
data.fecha || new Date().toISOString().split('T')[0],
data.categoria || '',
data.id_proyecto || '',
data.id_responsable || '',
new Date().toISOString()
]);
} else if (action === 'finanza_update') {
const rows = sh.getDataRange().getValues();
for (let i = 1; i < rows.length; i++) {
if ((rows[i][0] || '').toString() === (data.id || '').toString()) {
if (data.tipo !== undefined) sh.getRange(i + 1, 2).setValue(data.tipo);
if (data.monto !== undefined) sh.getRange(i + 1, 3).setValue(data.monto);
if (data.concepto !== undefined) sh.getRange(i + 1, 4).setValue(data.concepto);
if (data.fecha !== undefined) sh.getRange(i + 1, 5).setValue(data.fecha);
if (data.categoria !== undefined) sh.getRange(i + 1, 6).setValue(data.categoria);
if (data.id_proyecto !== undefined) sh.getRange(i + 1, 7).setValue(data.id_proyecto);
if (data.id_responsable !== undefined) sh.getRange(i + 1, 8).setValue(data.id_responsable);
break;
}
}
} else if (action === 'finanza_delete') {
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
// REGISTROS OBRA / FICHA TÉCNICA (CRUD) + autor/provenance/clave + MEDIDAS + TAGS
// ======================================================
else if (action === 'registro_obra_add' || action === 'registro_obra_update' || action === 'registro_obra_delete') {
const sh = ss.getSheetByName(SHEET_REGISTROS_OBRA);
if (action === 'registro_obra_add') {
const asignacion = generateObraAsignacion_(ss);
const fechaRegistro = data.fecha_registro || new Date().toISOString().split('T')[0];
const tagsValue = Array.isArray(data.tags)
? stringifyTagsCell_(data.tags)
: (typeof data.tags === 'string' ? data.tags : '[]');
sh.appendRow([
data.id,
data.nombre_obra || '',
data.ubicacion || '',
data.estatus || 'Consolidación',
data.tipo_obra || '',
data.superficie || 0,
data.precio_lista || 0,
data.precio_venta || 0,
fechaRegistro,
data.fecha_adquisicion || '',
data.fecha_venta || '',
data.cliente || '',
'[]', // Documentos (JSON)
data.observaciones || '',
'[]', // Adjuntos (JSON)
data.id_responsable || '',
data.autor || '',
'', // Asignación (se setea abajo)
data.provenance || '',
data.clave || '',
data.ancho || 0, // NUEVO
data.alto || 0, // NUEVO
data.largo || 0, // NUEVO
tagsValue // Tags (JSON)
]);
const lastRow = sh.getLastRow();
sh.getRange(lastRow, COL_REGISTROS_ASIGNACION).setNumberFormat('@STRING@');
sh.getRange(lastRow, COL_REGISTROS_ASIGNACION).setValue(String(asignacion));
// Inicializar JSON vacíos si no existen
if (sh.getLastColumn() >= COL_REGISTROS_DOCUMENTOS) {
sh.getRange(lastRow, COL_REGISTROS_DOCUMENTOS).setValue('[]');
}
if (sh.getLastColumn() >= COL_REGISTROS_ADJUNTOS) {
sh.getRange(lastRow, COL_REGISTROS_ADJUNTOS).setValue('[]');
}
if (sh.getLastColumn() >= COL_REGISTROS_TAGS) {
sh.getRange(lastRow, COL_REGISTROS_TAGS).setValue('[]');
}
} else if (action === 'registro_obra_update') {
const rows = sh.getDataRange().getValues();
for (let i = 1; i < rows.length; i++) {
if ((rows[i][0] || '').toString() === (data.id || '').toString()) {
if (data.nombre_obra !== undefined) sh.getRange(i + 1, COL_REGISTROS_NOMBRE).setValue(data.nombre_obra);
if (data.ubicacion !== undefined) sh.getRange(i + 1, COL_REGISTROS_UBICACION).setValue(data.ubicacion);
if (data.estatus !== undefined) sh.getRange(i + 1, COL_REGISTROS_ESTATUS).setValue(data.estatus);
if (data.tipo_obra !== undefined) sh.getRange(i + 1, COL_REGISTROS_TIPO).setValue(data.tipo_obra);
if (data.superficie !== undefined) sh.getRange(i + 1, COL_REGISTROS_SUPERFICIE).setValue(data.superficie);
if (data.precio_lista !== undefined) sh.getRange(i + 1, COL_REGISTROS_PRECIO_LISTA).setValue(data.precio_lista);
if (data.precio_venta !== undefined) sh.getRange(i + 1, COL_REGISTROS_PRECIO_VENTA).setValue(data.precio_venta);
if (data.fecha_registro !== undefined) sh.getRange(i + 1, COL_REGISTROS_FECHA_REGISTRO).setValue(data.fecha_registro);
if (data.fecha_adquisicion !== undefined) sh.getRange(i + 1, COL_REGISTROS_FECHA_ADQUISICION).setValue(data.fecha_adquisicion);
if (data.fecha_venta !== undefined) sh.getRange(i + 1, COL_REGISTROS_FECHA_VENTA).setValue(data.fecha_venta);
if (data.cliente !== undefined) sh.getRange(i + 1, COL_REGISTROS_CLIENTE).setValue(data.cliente);
if (data.observaciones !== undefined) sh.getRange(i + 1, COL_REGISTROS_OBSERVACIONES).setValue(data.observaciones);
if (data.id_responsable !== undefined) sh.getRange(i + 1, COL_REGISTROS_ID_RESPONSABLE).setValue(data.id_responsable);
if (data.autor !== undefined) sh.getRange(i + 1, COL_REGISTROS_AUTOR).setValue(data.autor);
if (data.asignacion !== undefined) {
sh.getRange(i + 1, COL_REGISTROS_ASIGNACION).setNumberFormat('@STRING@');
sh.getRange(i + 1, COL_REGISTROS_ASIGNACION).setValue(String(data.asignacion));
}
if (data.provenance !== undefined) sh.getRange(i + 1, COL_REGISTROS_PROVENANCE).setValue(data.provenance);
if (data.clave !== undefined) sh.getRange(i + 1, COL_REGISTROS_CLAVE).setValue(data.clave);
if (data.ancho !== undefined) sh.getRange(i + 1, COL_REGISTROS_ANCHO).setValue(data.ancho);
if (data.alto !== undefined) sh.getRange(i + 1, COL_REGISTROS_ALTO).setValue(data.alto);
if (data.largo !== undefined) sh.getRange(i + 1, COL_REGISTROS_LARGO).setValue(data.largo);
// NUEVO: Manejo de Tags (JSON)
if (data.tags !== undefined) {
if (Array.isArray(data.tags)) {
sh.getRange(i + 1, COL_REGISTROS_TAGS).setValue(stringifyTagsCell_(data.tags));
} else if (typeof data.tags === 'string') {
sh.getRange(i + 1, COL_REGISTROS_TAGS).setValue(data.tags);
}
}
// Manejo de JSON (Documentos)
if (data.documentos !== undefined) {
if (Array.isArray(data.documentos)) {
sh.getRange(i + 1, COL_REGISTROS_DOCUMENTOS).setValue(stringifyDocumentosObra_(data.documentos));
} else if (typeof data.documentos === 'string') {
sh.getRange(i + 1, COL_REGISTROS_DOCUMENTOS).setValue(data.documentos);
}
}
// Manejo de JSON (Adjuntos)
if (data.adjuntos !== undefined) {
if (Array.isArray(data.adjuntos)) {
sh.getRange(i + 1, COL_REGISTROS_ADJUNTOS).setValue(stringifyAdjuntosObra_(data.adjuntos));
} else if (typeof data.adjuntos === 'string') {
sh.getRange(i + 1, COL_REGISTROS_ADJUNTOS).setValue(data.adjuntos);
}
}
break;
}
}
} else if (action === 'registro_obra_delete') {
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
// REGISTROS OBRA - DOCUMENTOS (CRUD sobre JSON)
// ======================================================
else if (action === 'registro_obra_documentos_set') {
const idObra = (data.id_obra || '').toString().trim();
const actorId = (data.id_actor || '').toString().trim();
const documentos = Array.isArray(data.documentos) ? data.documentos : [];
if (!idObra) throw new Error('Falta data.id_obra');
if (!actorId) throw new Error('Falta data.id_actor');
assertPrivileged_(ss, actorId);
const obra = getRegistroObraById_(ss, idObra);
if (!obra) throw new Error('Registro de obra no encontrado');
obra.sh.getRange(obra.rowIndex, COL_REGISTROS_DOCUMENTOS).setValue(stringifyDocumentosObra_(documentos));
return ContentService.createTextOutput(JSON.stringify({ result: 'success' })).setMimeType(ContentService.MimeType.JSON);
}
else if (action === 'registro_obra_documento_add') {
const idObra = (data.id_obra || '').toString().trim();
const actorId = (data.id_actor || '').toString().trim();
const documento = data.documento || {};
if (!idObra) throw new Error('Falta data.id_obra');
if (!actorId) throw new Error('Falta data.id_actor');
assertPrivileged_(ss, actorId);
const obra = getRegistroObraById_(ss, idObra);
if (!obra) throw new Error('Registro de obra no encontrado');
const prev = parseDocumentosObra_(obra.sh.getRange(obra.rowIndex, COL_REGISTROS_DOCUMENTOS).getValue());
const newDoc = {
id: documento.id || ('doc_' + Date.now().toString()),
tipo: (documento.tipo || '').toString(),
nombre: (documento.nombre || '').toString(),
url: (documento.url || '').toString(),
fecha: (documento.fecha || new Date().toISOString().split('T')[0]),
uploadedBy: actorId
};
prev.push(newDoc);
obra.sh.getRange(obra.rowIndex, COL_REGISTROS_DOCUMENTOS).setValue(stringifyDocumentosObra_(prev));
return ContentService.createTextOutput(JSON.stringify({ result: 'success', documento: newDoc })).setMimeType(ContentService.MimeType.JSON);
}
else if (action === 'registro_obra_documento_delete') {
const idObra = (data.id_obra || '').toString().trim();
const actorId = (data.id_actor || '').toString().trim();
const documentoId = (data.documentoId || '').toString().trim();
if (!idObra) throw new Error('Falta data.id_obra');
if (!actorId) throw new Error('Falta data.id_actor');
if (!documentoId) throw new Error('Falta data.documentoId');
assertPrivileged_(ss, actorId);
const obra = getRegistroObraById_(ss, idObra);
if (!obra) throw new Error('Registro de obra no encontrado');
const prev = parseDocumentosObra_(obra.sh.getRange(obra.rowIndex, COL_REGISTROS_DOCUMENTOS).getValue());
const next = prev.filter(doc => (doc.id || '') !== documentoId);
obra.sh.getRange(obra.rowIndex, COL_REGISTROS_DOCUMENTOS).setValue(stringifyDocumentosObra_(next));
return ContentService.createTextOutput(JSON.stringify({ result: 'success' })).setMimeType(ContentService.MimeType.JSON);
}
// ======================================================
// REGISTROS OBRA - ADJUNTOS ARCHIVOS (Drive)
// ======================================================
else if (action === 'registro_obra_upload_adjunto') {
const idObra = (data.id_obra || '').toString().trim();
const actorId = (data.id_actor || '').toString().trim();
if (!idObra) throw new Error('Falta data.id_obra');
if (!actorId) throw new Error('Falta data.id_actor');
if (!data.base64) throw new Error('Falta data.base64');
// Verificar permisos (solo supervisor/director o responsable asignado)
const obra = getRegistroObraById_(ss, idObra);
if (!obra) throw new Error('Registro de obra no encontrado');
const obraResponsableId = (obra.values[COL_REGISTROS_ID_RESPONSABLE - 1] || '').toString();
if (!isPrivileged_(ss, actorId) && actorId !== obraResponsableId) {
throw new Error('No autorizado: solo el responsable o supervisor puede subir adjuntos');
}
const folder = getAttachmentsFolder_();
const filename = (data.filename || 'adjunto_obra').toString();
const mimeType = (data.mimeType || 'application/octet-stream').toString();
const base64 = (data.base64 || '').toString();
const bytes = Utilities.base64Decode(base64);
const blob = Utilities.newBlob(bytes, mimeType, filename);
const finalName = `obra_${idObra}__${filename}`;
const file = folder.createFile(blob).setName(finalName);
ensureFileIsShareable_(file);
const fileUrl = file.getUrl();
const fileId = file.getId();
const prevRaw = obra.sh.getRange(obra.rowIndex, COL_REGISTROS_ADJUNTOS).getValue();
const prevAdj = parseAdjuntosObra_(prevRaw);
prevAdj.push({
id: fileId,
name: filename,
url: fileUrl,
kind: 'adjunto_obra',
uploadedBy: actorId,
createdAt: new Date().toISOString(),
mimeType: mimeType
});
obra.sh.getRange(obra.rowIndex, COL_REGISTROS_ADJUNTOS).setValue(stringifyAdjuntosObra_(prevAdj));
return ContentService.createTextOutput(JSON.stringify({ result: 'success', fileId, url: fileUrl })).setMimeType(ContentService.MimeType.JSON);
}
else if (action === 'registro_obra_adjunto_eliminar') {
const idObra = (data.id_obra || '').toString().trim();
const fileId = (data.fileId || '').toString().trim();
const actorId = (data.id_actor || '').toString().trim();
if (!idObra) throw new Error('Falta data.id_obra');
if (!fileId) throw new Error('Falta data.fileId');
if (!actorId) throw new Error('Falta data.id_actor');
assertPrivileged_(ss, actorId);
try {
DriveApp.getFileById(fileId).setTrashed(true);
} catch (e) {
// continuar
}
const obra = getRegistroObraById_(ss, idObra);
if (obra) {
const prevRaw = obra.sh.getRange(obra.rowIndex, COL_REGISTROS_ADJUNTOS).getValue();
const prevAdj = parseAdjuntosObra_(prevRaw);
const nextAdj = prevAdj.filter(a => (a.id || '') !== fileId);
obra.sh.getRange(obra.rowIndex, COL_REGISTROS_ADJUNTOS).setValue(stringifyAdjuntosObra_(nextAdj));
}
return ContentService.createTextOutput(JSON.stringify({ result: 'success' })).setMimeType(ContentService.MimeType.JSON);
}
// ======================================================
// REGISTROS OBRA - TAGS (CRUD sobre JSON)
// ======================================================
else if (action === 'registro_obra_tags_set') {
const idObra = (data.id_obra || '').toString().trim();
const actorId = (data.id_actor || '').toString().trim();
const tags = Array.isArray(data.tags) ? data.tags : [];
if (!idObra) throw new Error('Falta data.id_obra');
if (!actorId) throw new Error('Falta data.id_actor');
assertPrivileged_(ss, actorId);
const obra = getRegistroObraById_(ss, idObra);
if (!obra) throw new Error('Registro de obra no encontrado');
obra.sh.getRange(obra.rowIndex, COL_REGISTROS_TAGS).setValue(stringifyTagsCell_(tags));
return ContentService.createTextOutput(JSON.stringify({ result: 'success' })).setMimeType(ContentService.MimeType.JSON);
}
else if (action === 'registro_obra_tag_add') {
const idObra = (data.id_obra || '').toString().trim();
const actorId = (data.id_actor || '').toString().trim();
const tag = data.tag || '';
if (!idObra) throw new Error('Falta data.id_obra');
if (!actorId) throw new Error('Falta data.id_actor');
if (!tag) throw new Error('Falta data.tag');
assertPrivileged_(ss, actorId);
const obra = getRegistroObraById_(ss, idObra);
if (!obra) throw new Error('Registro de obra no encontrado');
const prev = parseTagsCell_(obra.sh.getRange(obra.rowIndex, COL_REGISTROS_TAGS).getValue());
// Evitar duplicados
if (!prev.includes(tag)) {
prev.push(tag);
obra.sh.getRange(obra.rowIndex, COL_REGISTROS_TAGS).setValue(stringifyTagsCell_(prev));
}
return ContentService.createTextOutput(JSON.stringify({ result: 'success', tags: prev })).setMimeType(ContentService.MimeType.JSON);
}
else if (action === 'registro_obra_tag_remove') {
const idObra = (data.id_obra || '').toString().trim();
const actorId = (data.id_actor || '').toString().trim();
const tag = data.tag || '';
if (!idObra) throw new Error('Falta data.id_obra');
if (!actorId) throw new Error('Falta data.id_actor');
if (!tag) throw new Error('Falta data.tag');
assertPrivileged_(ss, actorId);
const obra = getRegistroObraById_(ss, idObra);
if (!obra) throw new Error('Registro de obra no encontrado');
const prev = parseTagsCell_(obra.sh.getRange(obra.rowIndex, COL_REGISTROS_TAGS).getValue());
const next = prev.filter(t => t !== tag);
obra.sh.getRange(obra.rowIndex, COL_REGISTROS_TAGS).setValue(stringifyTagsCell_(next));
return ContentService.createTextOutput(JSON.stringify({ result: 'success', tags: next })).setMimeType(ContentService.MimeType.JSON);
}
// ======================================================
// COMISIONES (CRUD)
// ======================================================
else if (action === 'comision_add' || action === 'comision_update' || action === 'comision_delete') {
const sh = ss.getSheetByName(SHEET_COMISIONES);
if (action === 'comision_add') {
const id = (data.id || ('com_' + Date.now().toString())).toString();
const provenance = (data.provenance || '').toString();
const porcentaje = (data.porcentaje !== undefined) ? data.porcentaje : 0;
const fechaRegistro = new Date().toISOString();
sh.appendRow([id, provenance, porcentaje, fechaRegistro]);
}
else if (action === 'comision_update') {
const id = (data.id || '').toString();
if (!id) throw new Error('Falta data.id');
const rows = sh.getDataRange().getValues();
for (let i = 1; i < rows.length; i++) {
if ((rows[i][0] || '').toString() === id) {
if (data.provenance !== undefined) sh.getRange(i + 1, COL_COMISION_PROVENANCE).setValue(String(data.provenance));
if (data.porcentaje !== undefined) sh.getRange(i + 1, COL_COMISION_PORCENTAJE).setValue(data.porcentaje);
break;
}
}
}
else if (action === 'comision_delete') {
const id = (data.id || '').toString();
if (!id) throw new Error('Falta data.id');
const rows = sh.getDataRange().getValues();
for (let i = 1; i < rows.length; i++) {
if ((rows[i][0] || '').toString() === id) {
sh.deleteRow(i + 1);
break;
}
}
}
return ContentService.createTextOutput(JSON.stringify({ result: 'success' })).setMimeType(ContentService.MimeType.JSON);
}
return ContentService.createTextOutput(JSON.stringify({ result: 'success', message: 'Operación completada' })).setMimeType(ContentService.MimeType.JSON);
} catch (error) {
return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
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
function crearHojaComisiones() {
const ss = SpreadsheetApp.openById('<ID-HOJA>');
let hojaComision = ss.getSheetByName('Comisiones');
if (!hojaComision) {
hojaComision = ss.insertSheet('Comisiones');
hojaComision.appendRow(['Nombre', 'Cantidad', 'Fecha']);
} else {
Logger.log('La hoja ya existe.');
}
return hojaComision;
}
