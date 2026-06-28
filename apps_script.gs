/**
 * ============================================================================
 * Back-end de coleta — Pesquisa PPGAD/UFPA (Celso Cardoso Silva)
 * ----------------------------------------------------------------------------
 * Recebe os POSTs do index.html e grava na Planilha vinculada.
 *
 * Como instalar: ver instalacao.md (criar Planilha → colar este código →
 * publicar como App da Web → copiar a URL /exec → colar em ENDPOINT_URL no HTML).
 *
 * Contrato (o HTML envia Content-Type: text/plain p/ evitar preflight CORS):
 *   tipo "submissao": respostas (GC01..DEC36 + D1..D9) + metadados.
 *   tipo "email":     { email } — vai para aba separada, SEM vínculo (anonimato).
 *
 * As abas e os cabeçalhos são criados automaticamente no primeiro POST.
 * Idempotência: reenvio do mesmo submission_id atualiza a linha (não duplica).
 * ============================================================================
 */

var ABA_RESPOSTAS = 'respostas';
var ABA_EMAILS    = 'emails';

/* Ordem CANÔNICA das colunas de "respostas" — casa 1:1 com os nomes no SPSS.
   Mexer aqui = mexer no exportar_para_spss.md. */
var SCALE_COLS = (function () {
  var c = [];
  for (var i = 1;  i <= 10; i++) c.push('GC'  + ('0' + i).slice(-2)); // GC01..GC10
  for (var i = 11; i <= 20; i++) c.push('GOV' + i);                   // GOV11..GOV20
  for (var i = 21; i <= 36; i++) c.push('DEC' + i);                   // DEC21..DEC36
  return c;
})();

var DEMO_COLS = [
  'D1',
  'D2', 'D2_outro',
  'D3',
  'D4', 'D4_outro',
  'D5',
  'D5a', 'D5a_outro',
  'D6', 'D7', 'D8',
  'D9', 'D9_outro'
];

var META_COLS = [
  'timestamp', 'submission_id', 'completo', 'duracao_segundos', 'semente',
  'ordem_gc', 'ordem_gov', 'ordem_dec', 'user_agent'
];

var RESP_HEADER  = META_COLS.concat(SCALE_COLS).concat(DEMO_COLS); // 59 colunas
var EMAIL_HEADER = ['data', 'email']; // data-only: reforça o anonimato (sem hora p/ correlacionar)

/* ---------------------------------------------------------------------------
 * Entradas HTTP
 * ------------------------------------------------------------------------- */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // serializa escritas concorrentes (idempotência segura)
  } catch (err) {
    return _json({ ok: false, erro: 'lock_timeout' });
  }
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return _json({ ok: false, erro: 'sem_corpo' });
    }
    var payload = JSON.parse(e.postData.contents);
    if (!payload || typeof payload !== 'object') {
      return _json({ ok: false, erro: 'payload_invalido' });
    }
    if (payload.tipo === 'submissao') return _gravarSubmissao(payload);
    if (payload.tipo === 'email')     return _gravarEmail(payload);
    return _json({ ok: false, erro: 'tipo_desconhecido' });
  } catch (err) {
    return _json({ ok: false, erro: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* GET no navegador só confirma que o serviço está no ar (não grava nada).
   Útil para o smoke test inicial: abra a URL /exec e veja o JSON. */
function doGet() {
  return _json({ ok: true, servico: 'coleta PPGAD/UFPA', status: 'no ar' });
}

/* ---------------------------------------------------------------------------
 * Gravação
 * ------------------------------------------------------------------------- */

function _gravarSubmissao(payload) {
  // Validação mínima de shape — barra lixo/bot sem campos essenciais.
  if (!payload.respostas || typeof payload.respostas !== 'object') {
    return _json({ ok: false, erro: 'sem_respostas' });
  }
  if (!payload.submission_id) {
    return _json({ ok: false, erro: 'sem_submission_id' });
  }

  var sh = _aba(ABA_RESPOSTAS, RESP_HEADER);
  var linha = _montarLinhaResp(payload);

  // Idempotência: se já existe linha com este submission_id, sobrescreve.
  var idCol = RESP_HEADER.indexOf('submission_id') + 1;
  var existente = _acharLinha(sh, idCol, payload.submission_id);
  if (existente > 0) {
    sh.getRange(existente, 1, 1, linha.length).setValues([linha]);
    return _json({ ok: true, atualizado: true, submission_id: payload.submission_id });
  }
  sh.appendRow(linha);
  return _json({ ok: true, criado: true, submission_id: payload.submission_id });
}

function _montarLinhaResp(payload) {
  var r = payload.respostas || {};
  var linha = [];
  for (var i = 0; i < RESP_HEADER.length; i++) {
    var col = RESP_HEADER[i];
    switch (col) {
      case 'timestamp':        linha.push(new Date()); break;
      case 'submission_id':    linha.push(String(payload.submission_id || '')); break;
      case 'completo':         linha.push(payload.completo === true); break;
      case 'duracao_segundos': linha.push(_num(payload.duracao_segundos)); break;
      case 'semente':          linha.push(_num(payload.semente)); break;
      case 'ordem_gc':         linha.push(_ordem(payload.ordem_gc)); break;
      case 'ordem_gov':        linha.push(_ordem(payload.ordem_gov)); break;
      case 'ordem_dec':        linha.push(_ordem(payload.ordem_dec)); break;
      case 'user_agent':       linha.push(String(payload.user_agent || '').slice(0, 200)); break;
      default:                 linha.push(_valorResposta(col, r));
    }
  }
  return linha;
}

/* Resolve o valor de uma coluna de resposta (escala 1–7 ou demográfico). */
function _valorResposta(col, r) {
  // Coluna "_outro": texto livre que acompanha uma opção "Outro".
  if (col.slice(-6) === '_outro') {
    return r[col] != null ? String(r[col]) : '';
  }
  var v = r[col];
  if (v == null) return ''; // não respondido (ex.: D5a quando D5 != "Gestão acadêmica")

  // Sentinela do HTML: opção "Outro" selecionada → grava "Outro" na coluna principal.
  if (v === '__outro__') return 'Outro';

  // Escalas: número 1–7.
  if (SCALE_COLS.indexOf(col) >= 0) {
    var n = Number(v);
    return isNaN(n) ? '' : n;
  }
  // D3 (idade): número quando possível.
  if (col === 'D3') {
    var idade = Number(v);
    return isNaN(idade) ? String(v) : idade;
  }
  return String(v);
}

function _gravarEmail(payload) {
  var email = String(payload.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return _json({ ok: false, erro: 'email_invalido' });
  }
  var sh = _aba(ABA_EMAILS, EMAIL_HEADER);
  // INTENCIONAL: nada de submission_id aqui. Anonimato por separação (decisão travada).
  // Guardamos só a DATA (sem hora) para não permitir correlação por horário com "respostas".
  var hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  sh.appendRow([hoje, email]);
  return _json({ ok: true });
}

/* ---------------------------------------------------------------------------
 * Utilitários
 * ------------------------------------------------------------------------- */

function _aba(nome, header) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(nome);
  if (!sh) sh = ss.insertSheet(nome);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, header.length).setValues([header]);
    sh.setFrozenRows(1);
  }
  return sh;
}

/* Procura um valor numa coluna; devolve o número da linha (>=2) ou -1. */
function _acharLinha(sh, col, valor) {
  var ult = sh.getLastRow();
  if (ult < 2) return -1;
  var vals = sh.getRange(2, col, ult - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]) === String(valor)) return i + 2;
  }
  return -1;
}

function _ordem(arr) { return Array.isArray(arr) ? arr.join('|') : ''; }
function _num(v) { var n = Number(v); return (v === null || v === '' || isNaN(n)) ? '' : n; }

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
