/**
 * apps-script.js - Backend para Remesas Pro
 * 1. Copia TODO este código en el editor de Apps Script
 * 2. NO uses "Ejecutar" o "Depurar" directamente sobre doGet/doPost
 * 3. Despliega como Web App y prueba desde la URL
 */

// ============================================
// CONFIGURACIÓN - REEMPLAZAR ESTOS VALORES
// ============================================
const SPREADSHEET_ID = 'TU_ID_DE_SPREADSHEET'; // Ej: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
const API_KEY_SECRET = 'tu-clave-secreta-aqui'; // Mínimo 10 caracteres

// Nombres de las hojas dentro del Spreadsheet
const SHEETS = {
  COMPRAS: 'Compras',
  ENVIOS: 'Envios',
  BANCOS: 'Bancos',
  TASAS: 'Tasas',
  CONFIG: 'Config'
};

// ============================================
// HANDLERS PRINCIPALES
// ============================================

/**
 * Maneja peticiones GET (obtener datos)
 * NO ejecutar directamente desde el editor. Usa la URL del Web App.
 */
function doGet(e) {
  // PROTECCIÓN: Si se ejecuta desde el editor, e es undefined
  if (!e || !e.parameter) {
    return jsonResponse({
      success: false,
      error: 'Ejecutado desde editor. Prueba desde la URL del Web App con ?action=ping&key=TU_CLAVE'
    });
  }

  const action = e.parameter.action;
  const key = e.parameter.key;

  // Validar API Key
  if (!key || key !== API_KEY_SECRET) {
    return jsonResponse({ success: false, error: 'API Key inválida o faltante' });
  }

  try {
    switch (action) {
      case 'ping':
        return jsonResponse({
          success: true,
          message: 'API funcionando correctamente',
          timestamp: new Date().toISOString(),
          spreadsheet: SPREADSHEET_ID
        });

      case 'getHistorico':
        const limit = parseInt(e.parameter.limit) || 10;
        return jsonResponse({ success: true, data: getHistorico(limit) });

      case 'getConsolidado':
        return jsonResponse({ success: true, data: getConsolidado() });

      case 'getBancos':
        return jsonResponse({ success: true, data: getBancos() });

      case 'getTasas':
        return jsonResponse({ success: true, data: getTasas() });

      default:
        return jsonResponse({ success: false, error: 'Acción GET no válida. Use: ping, getHistorico, getConsolidado, getBancos, getTasas' });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * Maneja peticiones POST (enviar datos)
 * NO ejecutar directamente desde el editor.
 */
function doPost(e) {
  // PROTECCIÓN: Si se ejecuta desde el editor
  if (!e || !e.postData) {
    return jsonResponse({
      success: false,
      error: 'Ejecutado desde editor. Use POST desde la app o herramientas como Postman/curl'
    });
  }

  let data = {};
  let action = '';
  let key = '';

  // Intentar leer desde postData (JSON) o parameter (form-data/URL)
  try {
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
      action = data.action || e.parameter.action;
      key = data.key || e.parameter.key;
    } else if (e.parameter) {
      action = e.parameter.action;
      key = e.parameter.key;
    }
  } catch (parseErr) {
    return jsonResponse({ success: false, error: 'JSON inválido en body: ' + parseErr.toString() });
  }

  // Validar API Key
  if (!key || key !== API_KEY_SECRET) {
    return jsonResponse({ success: false, error: 'API Key inválida o faltante' });
  }

  try {
    switch (action) {
      case 'registrarCompra':
        return jsonResponse({ success: true, ...registrarCompra(data) });

      case 'registrarEnvio':
        return jsonResponse({ success: true, ...registrarEnvio(data) });

      case 'updateTasa':
        return jsonResponse({ success: true, ...updateTasa(data) });

      default:
        return jsonResponse({ success: false, error: 'Acción POST no válida. Use: registrarCompra, registrarEnvio, updateTasa' });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ============================================
// FUNCIONES DE NEGOCIO
// ============================================

function registrarCompra(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEETS.COMPRAS);

  // Crear hoja con headers si no existe
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.COMPRAS);
    sheet.appendRow([
      'ID', 'Fecha', 'Monto COP', 'Tasa Compra', 'Tasa Venta',
      'Spread', 'Total USD', 'Comisión %', 'Comisión COP',
      'Proveedor', 'Banco Origen', 'Banco Destino', 'Observación', 'Timestamp'
    ]);
    // Formato de headers
    sheet.getRange(1, 1, 1, 14).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
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

  return { id: id, message: 'Compra registrada correctamente' };
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
    sheet.getRange(1, 1, 1, 13).setFontWeight('bold').setBackground('#34a853').setFontColor('white');
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

  return { id: id, message: 'Envío registrado correctamente' };
}

function getHistorico(limit) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const resultados = [];

  // Leer Compras
  const comprasSheet = ss.getSheetByName(SHEETS.COMPRAS);
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

  // Leer Envíos
  const enviosSheet = ss.getSheetByName(SHEETS.ENVIOS);
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
  const sheet = ss.getSheetByName(SHEETS.COMPRAS);

  if (!sheet || sheet.getLastRow() <= 1) return [];

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 14).getValues();
  const porFecha = {};

  data.forEach(row => {
    const fecha = row[1];
    if (!porFecha[fecha]) {
      porFecha[fecha] = { fecha: fecha, volumenTotal: 0, margen: 0, count: 0 };
    }
    porFecha[fecha].volumenTotal += (row[6] || 0);
    porFecha[fecha].margen += (row[5] || 0);
    porFecha[fecha].count += 1;
  });

  return Object.values(porFecha).map(d => ({
    ...d,
    margen: d.count ? d.margen / d.count : 0
  }));
}

function getBancos() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEETS.BANCOS);

  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.BANCOS);
    sheet.appendRow(['Nombre', 'Moneda', 'Saldo', 'UltimaActualizacion']);
    const bancosDefault = [
      ['Banesco', 'VES', 0, new Date()],
      ['BDV', 'VES', 0, new Date()],
      ['Mercantil', 'VES', 0, new Date()],
      ['Provincial', 'VES', 0, new Date()],
      ['Nequi', 'COP', 0, new Date()],
      ['Bancolombia', 'COP', 0, new Date()],
      ['Davivienda', 'COP', 0, new Date()],
      ['Bogotá', 'COP', 0, new Date()]
    ];
    bancosDefault.forEach(b => sheet.appendRow(b));
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

  return { message: `Tasa ${tipo} actualizada a ${data.valor}` };
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Retorna respuesta JSON válida para Web Apps
 * NOTA: En Apps Script, TextOutput no soporta setResponseCode.
 * Para errores HTTP, lanzamos excepciones o retornamos JSON con success:false.
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
