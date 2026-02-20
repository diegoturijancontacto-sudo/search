/**
 * NUEVA ESTRUCTURA COMPLETA:
 * 
 * HOJA 1: Proyectos (Creados por el Director)
 * - id_proyecto (PK)
 * - nombre
 * - descripcion
 * - fecha_creacion
 * - estado (activo/completado)
 * 
 * HOJA 2: Subproyectos (CON FECHAS)
 * - id_subproyecto (PK)
 * - id_proyecto (FK)
 * - nombre
 * - descripcion
 * - fecha_inicio
 * - fecha_fin_estimada
 * - fecha_creacion
 * 
 * HOJA 3: Tareas
 * - id_tarea (PK)
 * - id_subproyecto (FK)
 * - id_responsable (FK)
 * - prioridad (alta/media/baja)
 * - estatus (pendiente/en_curso/en_revision/completado)
 * - detalles
 * - adjuntos (URLs separadas por comas)
 * - fecha_creacion
 * - fecha_limite
 * 
 * HOJA 4: Responsables (Usuarios)
 * - id_responsable (PK)
 * - nombre
 * - departamento
 * - email
 * - rol (director/supervisor/responsable)
 * - fecha_registro
 * 
 * HOJA 5: Comentarios (por tarea)
 * - id_comentario (PK)
 * - id_tarea (FK)
 * - id_responsable (FK)
 * - comentario
 * - fecha
 * 
 * HOJA 6: Historial de Aprobaciones
 * - id_aprobacion (PK)
 * - id_tarea (FK)
 * - id_supervisor (FK)
 * - estado_anterior
 * - estado_nuevo
 * - fecha
 * - observaciones
 */

function doGet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // ============================================
    // OBTENER PROYECTOS (HOJA 1)
    // ============================================
    const proyectosSheet = ss.getSheets()[0];
    const proyectosData = proyectosSheet.getDataRange().getValues();
    
    const proyectos = proyectosData.slice(1).map(row => ({
      id: row[0]?.toString() || '',
      nombre: row[1] || '',
      descripcion: row[2] || '',
      fecha_creacion: row[3] || '',
      estado: row[4] || 'activo' // activo/completado
    }));
    
    // ============================================
    // OBTENER SUBPROYECTOS (HOJA 2) - CON FECHAS
    // ============================================
    const subproyectosSheet = ss.getSheets()[1];
    const subproyectosData = subproyectosSheet.getDataRange().getValues();
    
    const subproyectos = subproyectosData.slice(1).map(row => ({
      id: row[0]?.toString() || '',
      id_proyecto: row[1]?.toString() || '',
      nombre: row[2] || '',
      descripcion: row[3] || '',
      fecha_inicio: row[4] ? new Date(row[4]).toISOString().split('T')[0] : '', // NUEVA
      fecha_fin_estimada: row[5] ? new Date(row[5]).toISOString().split('T')[0] : '', // NUEVA
      fecha_creacion: row[6] || ''
    }));
    
    // ============================================
    // OBTENER TAREAS (HOJA 3)
    // ============================================
    const tareasSheet = ss.getSheets()[2];
    const tareasData = tareasSheet.getDataRange().getValues();
    
    const tareas = tareasData.slice(1).map(row => ({
      id: row[0]?.toString() || '',
      id_subproyecto: row[1]?.toString() || '',
      id_responsable: row[2]?.toString() || '',
      prioridad: row[3] || 'media',
      estatus: row[4] || 'pendiente',
      detalles: row[5] || '',
      adjuntos: row[6] ? row[6].split(',').filter(a => a) : [],
      fecha_creacion: row[7] ? new Date(row[7]).toISOString().split('T')[0] : '',
      fecha_limite: row[8] ? new Date(row[8]).toISOString().split('T')[0] : ''
    }));
    
    // ============================================
    // OBTENER RESPONSABLES (HOJA 4)
    // ============================================
    let responsables = [];
    try {
      const responsablesSheet = ss.getSheetByName('Responsables');
      if (!responsablesSheet) {
        const newSheet = ss.insertSheet('Responsables');
        newSheet.appendRow(['ID', 'Nombre', 'Departamento', 'Email', 'Rol', 'Fecha Registro']);
      }
      
      const responsablesSheet2 = ss.getSheetByName('Responsables');
      const responsablesData = responsablesSheet2.getDataRange().getValues();
      responsables = responsablesData.slice(1).map(row => ({
        id: row[0]?.toString() || '',
        nombre: row[1] || '',
        departamento: row[2] || '',
        email: row[3] || '',
        rol: row[4] || 'responsable',
        fecha_registro: row[5] || ''
      }));
    } catch (e) {
      console.log('Error cargando responsables:', e);
    }
    
    // ============================================
    // OBTENER COMENTARIOS (HOJA 5)
    // ============================================
    let comentarios = [];
    try {
      const comentariosSheet = ss.getSheetByName('Comentarios');
      if (!comentariosSheet) {
        const newSheet = ss.insertSheet('Comentarios');
        newSheet.appendRow(['ID', 'ID Tarea', 'ID Responsable', 'Comentario', 'Fecha']);
      }
      
      const comentariosSheet2 = ss.getSheetByName('Comentarios');
      const comentariosData = comentariosSheet2.getDataRange().getValues();
      comentarios = comentariosData.slice(1).map(row => ({
        id: row[0]?.toString() || '',
        id_tarea: row[1]?.toString() || '',
        id_responsable: row[2]?.toString() || '',
        comentario: row[3] || '',
        fecha: row[4] || ''
      }));
    } catch (e) {
      console.log('Error cargando comentarios:', e);
    }
    
    // ============================================
    // OBTENER HISTORIAL DE APROBACIONES (HOJA 6)
    // ============================================
    let historialAprobaciones = [];
    try {
      const historialSheet = ss.getSheetByName('HistorialAprobaciones');
      if (!historialSheet) {
        const newSheet = ss.insertSheet('HistorialAprobaciones');
        newSheet.appendRow(['ID', 'ID Tarea', 'ID Supervisor', 'Estado Anterior', 'Estado Nuevo', 'Fecha', 'Observaciones']);
      }
      
      const historialSheet2 = ss.getSheetByName('HistorialAprobaciones');
      const historialData = historialSheet2.getDataRange().getValues();
      historialAprobaciones = historialData.slice(1).map(row => ({
        id: row[0]?.toString() || '',
        id_tarea: row[1]?.toString() || '',
        id_supervisor: row[2]?.toString() || '',
        estado_anterior: row[3] || '',
        estado_nuevo: row[4] || '',
        fecha: row[5] || '',
        observaciones: row[6] || ''
      }));
    } catch (e) {
      console.log('Error cargando historial:', e);
    }
    
    // ============================================
    // DEVOLVER TODOS LOS DATOS
    // ============================================
    return ContentService.createTextOutput(JSON.stringify({
      proyectos: proyectos,
      subproyectos: subproyectos,
      tareas: tareas,
      responsables: responsables,
      comentarios: comentarios,
      historial: historialAprobaciones
    })).setMimeType(ContentService.MimeType.JSON);
    
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

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const data = body.data;
    
    // ============================================
    // ACCIONES DE PROYECTOS
    // ============================================
    if (action === 'proyecto_add' || action === 'proyecto_update' || action === 'proyecto_delete') {
      const sheet = ss.getSheets()[0];
      
      if (action === 'proyecto_add') {
        sheet.appendRow([
          data.id,
          data.nombre,
          data.descripcion || '',
          new Date().toISOString(),
          data.estado || 'activo'
        ]);
      } 
      else if (action === 'proyecto_update') {
        const rows = sheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0].toString() === data.id.toString()) {
            sheet.getRange(i + 1, 2).setValue(data.nombre);
            sheet.getRange(i + 1, 3).setValue(data.descripcion || '');
            sheet.getRange(i + 1, 5).setValue(data.estado || 'activo');
            break;
          }
        }
      }
      else if (action === 'proyecto_delete') {
        const rows = sheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0].toString() === data.id.toString()) {
            sheet.deleteRow(i + 1);
            break;
          }
        }
      }
    }
    
    // ============================================
    // ACCIONES DE SUBPROYECTOS - CON FECHAS
    // ============================================
    else if (action === 'subproyecto_add' || action === 'subproyecto_update' || action === 'subproyecto_delete') {
      const sheet = ss.getSheets()[1];
      
      if (action === 'subproyecto_add') {
        sheet.appendRow([
          data.id,
          data.id_proyecto,
          data.nombre,
          data.descripcion || '',
          data.fecha_inicio || '', // NUEVA
          data.fecha_fin_estimada || '', // NUEVA
          new Date().toISOString()
        ]);
      }
      else if (action === 'subproyecto_update') {
        const rows = sheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0].toString() === data.id.toString()) {
            sheet.getRange(i + 1, 2).setValue(data.id_proyecto);
            sheet.getRange(i + 1, 3).setValue(data.nombre);
            sheet.getRange(i + 1, 4).setValue(data.descripcion || '');
            sheet.getRange(i + 1, 5).setValue(data.fecha_inicio || ''); // NUEVA
            sheet.getRange(i + 1, 6).setValue(data.fecha_fin_estimada || ''); // NUEVA
            break;
          }
        }
      }
      else if (action === 'subproyecto_delete') {
        const rows = sheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0].toString() === data.id.toString()) {
            sheet.deleteRow(i + 1);
            break;
          }
        }
      }
    }
    
    // ============================================
    // ACCIONES DE TAREAS
    // ============================================
    else if (action === 'tarea_add' || action === 'tarea_update' || action === 'tarea_delete') {
      const sheet = ss.getSheets()[2];
      
      if (action === 'tarea_add') {
        sheet.appendRow([
          data.id,
          data.id_subproyecto,
          data.id_responsable,
          data.prioridad || 'media',
          data.estatus || 'pendiente',
          data.detalles || '',
          data.adjuntos ? data.adjuntos.join(',') : '',
          new Date().toISOString(),
          data.fecha_limite || ''
        ]);
      }
      else if (action === 'tarea_update') {
        const rows = sheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0].toString() === data.id.toString()) {
            sheet.getRange(i + 1, 2).setValue(data.id_subproyecto);
            sheet.getRange(i + 1, 3).setValue(data.id_responsable);
            sheet.getRange(i + 1, 4).setValue(data.prioridad || 'media');
            sheet.getRange(i + 1, 5).setValue(data.estatus || 'pendiente');
            sheet.getRange(i + 1, 6).setValue(data.detalles || '');
            sheet.getRange(i + 1, 7).setValue(data.adjuntos ? data.adjuntos.join(',') : '');
            sheet.getRange(i + 1, 9).setValue(data.fecha_limite || '');
            break;
          }
        }
      }
      else if (action === 'tarea_delete') {
        const rows = sheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0].toString() === data.id.toString()) {
            sheet.deleteRow(i + 1);
            break;
          }
        }
      }
    }
    
    // ============================================
    // ACCIONES DE RESPONSABLES
    // ============================================
    else if (action === 'responsable_add' || action === 'responsable_update' || action === 'responsable_delete') {
      let responsablesSheet = ss.getSheetByName('Responsables');
      if (!responsablesSheet) {
        responsablesSheet = ss.insertSheet('Responsables');
        responsablesSheet.appendRow(['ID', 'Nombre', 'Departamento', 'Email', 'Rol', 'Fecha Registro']);
      }
      
      if (action === 'responsable_add') {
        responsablesSheet.appendRow([
          data.id,
          data.nombre,
          data.departamento || '',
          data.email || '',
          data.rol || 'responsable',
          new Date().toISOString()
        ]);
      }
      else if (action === 'responsable_update') {
        const rows = responsablesSheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0].toString() === data.id.toString()) {
            responsablesSheet.getRange(i + 1, 2).setValue(data.nombre);
            responsablesSheet.getRange(i + 1, 3).setValue(data.departamento || '');
            responsablesSheet.getRange(i + 1, 4).setValue(data.email || '');
            responsablesSheet.getRange(i + 1, 5).setValue(data.rol || 'responsable');
            break;
          }
        }
      }
      else if (action === 'responsable_delete') {
        const rows = responsablesSheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0].toString() === data.id.toString()) {
            responsablesSheet.deleteRow(i + 1);
            break;
          }
        }
      }
    }
    
    // ============================================
    // ACCIONES DE COMENTARIOS
    // ============================================
    else if (action === 'comentario_add' || action === 'comentario_delete') {
      let comentariosSheet = ss.getSheetByName('Comentarios');
      if (!comentariosSheet) {
        comentariosSheet = ss.insertSheet('Comentarios');
        comentariosSheet.appendRow(['ID', 'ID Tarea', 'ID Responsable', 'Comentario', 'Fecha']);
      }
      
      if (action === 'comentario_add') {
        comentariosSheet.appendRow([
          data.id,
          data.id_tarea,
          data.id_responsable,
          data.comentario,
          new Date().toISOString()
        ]);
      }
      else if (action === 'comentario_delete') {
        const rows = comentariosSheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0].toString() === data.id.toString()) {
            comentariosSheet.deleteRow(i + 1);
            break;
          }
        }
      }
    }
    
    // ============================================
    // ACCIONES DE APROBACIÓN (CAMBIO DE ESTADO CON REVISIÓN)
    // ============================================
    else if (action === 'tarea_revisar' || action === 'tarea_aprobar' || action === 'tarea_rechazar') {
      const tareasSheet = ss.getSheets()[2];
      const rows = tareasSheet.getDataRange().getValues();
      
      let nuevoEstado = '';
      if (action === 'tarea_revisar') nuevoEstado = 'en_revision';
      else if (action === 'tarea_aprobar') nuevoEstado = 'completado';
      else if (action === 'tarea_rechazar') nuevoEstado = 'en_curso';
      
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0].toString() === data.id_tarea.toString()) {
          const estadoAnterior = rows[i][4];
          
          tareasSheet.getRange(i + 1, 5).setValue(nuevoEstado);
          
          // Registrar en historial
          let historialSheet = ss.getSheetByName('HistorialAprobaciones');
          if (!historialSheet) {
            historialSheet = ss.insertSheet('HistorialAprobaciones');
            historialSheet.appendRow(['ID', 'ID Tarea', 'ID Supervisor', 'Estado Anterior', 'Estado Nuevo', 'Fecha', 'Observaciones']);
          }
          
          historialSheet.appendRow([
            Date.now().toString(),
            data.id_tarea,
            data.id_supervisor,
            estadoAnterior,
            nuevoEstado,
            new Date().toISOString(),
            data.observaciones || ''
          ]);
          
          break;
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      result: 'success',
      message: 'Operación completada'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      result: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
