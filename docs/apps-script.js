/**
 * apps-script.js - Backend para Remesas Pro
 * Copia este código en Google Apps Script (script.google.com)
 * Despliega como Web App (Implementar → Nuevo implementación → Web App)
 */

const SPREADSHEET_ID = 'TU_ID_DE_SPREADSHEET'; // <-- REEMPLAZAR
const API_KEY_SECRET = 'tu-clave-secreta-aqui'; // <-- REEMPLAZAR

// ============ CONFIGURACIÓN DE HOJAS ============
const SHEETS = {
  COMPRAS: 'Compras',
  ENVIOS: 'Envios',
  BANCOS: 'Bancos',
  TASAS: 'Tasas',
  CONFIG: 'Config'
};

function doGet(e) {
  const action = e.parameter.action;
  const key = e.parameter.key;
  
  if (key !== API_KEY_SECRET) {
    return jsonResponse({ success: false, error: 'API Key inválida' }, 403);
  }

  try {
    switch (action) {
      case 'ping':
        return jsonResponse({ success: true, message: 'OK', timestamp: new Date() });
      
      case 'getHistorico':
        const limit = parseInt(e.parameter.limit) || 10;
        return jsonResponse(getHistorico(limit));
      
      case 'getConsolidado':
        return jsonResponse(getConsolidado());
      
      case 'getBancos':
        return jsonResponse(getBancos());
      
      case 'getTasas':
        return jsonResponse(getTasas());
      
      default:
        return jsonResponse({ success: false, error: 'Acción no válida' }, 400);
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() }, 500);
  }
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action || e.parameter.action;
  const key = data.key || e.parameter.key;
  
  if (key !== API_KEY_SECRET) {
    return jsonResponse({ success: false, error: 'API Key inválida' }, 403);
  }

  try {
    switch (action) {
      case 'registrarCompra':
        return jsonResponse(registrarCompra(data));
      
      case 'registrarEnvio':
        return jsonResponse(registrarEnvio(data));
      
      case 'updateTasa':
        return jsonResponse(updateTasa(data));
      
      default:
        return jsonResponse({ success: false, error: 'Acción no válida' }, 400);
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() }, 500);
  }
}

// ============ FUNCIONES DE NEGOCIO ============

function registrarCompra(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEETS.COMPRAS);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.COMPRAS);
    sheet.appendRow([
      'ID', 'Fecha', 'Monto COP', 'Tasa Compra', 'Tasa Venta', 
      'Spread', 'Total USD', 'Comisión %', 'Comisión COP', 
      'Proveedor', 'Banco Origen', 'Banco Destino', 'Observación', 'Timestamp'
    ]);
  }
  
  const id = Utilities.getUuid();
  const spread = data.tasaVenta - data.tasaCompra;
  const totalUsd = data.monto / data.tasaCompra;
  const comisionCOP = data.monto * (data.comisionPct / 100);
  
  sheet.appendRow([
    id,
    data.fecha,
    data.monto,
    data.tasaCompra,
    data.tasaVenta,
    spread,
    totalUsd,
    data.comisionPct,
    comisionCOP,
    data.proveedor,
    data.bancoOrigen,
    data.bancoDestino,
    data.observacion || '',
    new Date()
  ]);
  
  return { success: true, id: id, message: 'Compra registrada' };
}

function registrarEnvio(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEETS.ENVIOS);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.ENVIOS);
    sheet.appendRow([
      'ID', 'Fecha', 'Cliente', 'Monto USD', 'Tasa Envío', 
      'Tasa Compra Ref', 'Total VES', 'Comisión Banco', 'Beneficio',
      'Banco Origen', 'Banco Destino', 'Observación', 'Timestamp'
    ]);
  }
  
  const id = Utilities.getUuid();
  const totalVes = data.montoUsd * data.tasaEnvio;
  const comisionBanco = totalVes * 0.0075;
  const beneficio = data.montoUsd * (data.tasaEnvio - data.tasaCompraRef);
  
  sheet.appendRow([
    id,
    data.fecha,
    data.cliente,
    data.montoUsd,
    data.tasaEnvio,
    data.tasaCompraRef,
    totalVes,
    comisionBanco,
    beneficio,
    data.bancoOrigen,
    data.bancoDestino,
    data.observacion || '',
    new Date()
  ]);
  
  return { success: true, id: id, message: 'Envío registrado' };
}

function getHistorico(limit) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const comprasSheet = ss.getSheetByName(SHEETS.COMPRAS);
  const enviosSheet = ss.getSheetByName(SHEETS.ENVIOS);
  
  let resultados = [];
  
  if (comprasSheet && comprasSheet.getLastRow() > 1) {
    const data = comprasSheet.getRange(2, 1, comprasSheet.getLastRow() - 1, 14).getValues();
    data.reverse().slice(0, limit).forEach(row => {
      resultados.push({
        id: row[0],
        fecha: row[1],
        tipo: 'COMPRA',
        entidad: row[9],
        monto: row[2],
        bancoOrigen: row[10],
        bancoDestino: row[11],
        timestamp: row[13]
      });
    });
  }
  
  if (enviosSheet && enviosSheet.getLastRow() > 1) {
    const data = enviosSheet.getRange(2, 1, enviosSheet.getLastRow() - 1, 13).getValues();
    data.reverse().slice(0, limit).forEach(row => {
      resultados.push({
        id: row[0],
        fecha: row[1],
        tipo: 'ENVIO',
        entidad: row[2],
        monto: row[3],
        bancoOrigen: row[9],
        bancoDestino: row[10],
        timestamp: row[12]
      });
    });
  }
  
  return resultados.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
}

function getConsolidado() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const comprasSheet = ss.getSheetByName(SHEETS.COMPRAS);
  
  if (!comprasSheet || comprasSheet.getLastRow() <= 1) {
    return [];
  }
  
  const data = comprasSheet.getRange(2, 1, comprasSheet.getLastRow() - 1, 14).getValues();
  
  // Agrupar por fecha
  const porFecha = {};
  data.forEach(row => {
    const fecha = row[1];
    if (!porFecha[fecha]) {
      porFecha[fecha] = { fecha: fecha, volumenTotal: 0, margen: 0, count: 0 };
    }
    porFecha[fecha].volumenTotal += row[6] || 0; // Total USD
    porFecha[fecha].margen += (row[5] || 0); // Spread
    porFecha[fecha].count += 1;
  });
  
  return Object.values(porFecha).map(d => ({
    ...d,
    margen: d.margen / d.count // Promedio
  }));
}

function getBancos() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEETS.BANCOS);
  
  if (!sheet) {
    // Crear hoja de bancos por defecto
    sheet = ss.insertSheet(SHEETS.BANCOS);
    sheet.appendRow(['Nombre', 'Moneda', 'Saldo', 'UltimaActualizacion']);
    sheet.appendRow(['Banesco', 'VES', 0, new Date()]);
    sheet.appendRow(['BDV', 'VES', 0, new Date()]);
    sheet.appendRow(['Mercantil', 'VES', 0, new Date()]);
    sheet.appendRow(['Provincial', 'VES', 0, new Date()]);
    sheet.appendRow(['Nequi', 'COP', 0, new Date()]);
    sheet.appendRow(['Bancolombia', 'COP', 0, new Date()]);
  }
  
  if (sheet.getLastRow() <= 1) return [];
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
  return data.map(row => ({
    nombre: row[0],
    moneda: row[1],
    saldo: row[2],
    ultimaActualizacion: row[3]
  }));
}

function getTasas() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEETS.TASAS);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.TASAS);
    sheet.appendRow(['Tipo', 'Valor', 'FechaActualizacion']);
    sheet.appendRow(['BCV', 57.50, new Date()]);
    sheet.appendRow(['PARALELO', 58.20, new Date()]);
  }
  
  if (sheet.getLastRow() <= 1) return { bcv: '--', paralelo: '--' };
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  const result = { bcv: '--', paralelo: '--' };
  
  data.forEach(row => {
    if (row[0] === 'BCV') result.bcv = row[1];
    if (row[0] === 'PARALELO') result.paralelo = row[1];
  });
  
  return result;
}

function updateTasa(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEETS.TASAS);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.TASAS);
    sheet.appendRow(['Tipo', 'Valor', 'FechaActualizacion']);
  }
  
  // Buscar y actualizar o agregar
  const tipo = data.tipo.toUpperCase();
  const valores = sheet.getRange(2, 1, sheet.getLastRow(), 1).getValues();
  let encontrado = false;
  
  for (let i = 0; i < valores.length; i++) {
    if (valores[i][0] === tipo) {
      sheet.getRange(i + 2, 2).setValue(data.valor);
      sheet.getRange(i + 2, 3).setValue(new Date());
      encontrado = true;
      break;
    }
  }
  
  if (!encontrado) {
    sheet.appendRow([tipo, data.valor, new Date()]);
  }
  
  return { success: true, message: `Tasa ${tipo} actualizada` };
}

// ============ UTILIDADES ============

function jsonResponse(data, statusCode = 200) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setResponseCode(statusCode);
}
