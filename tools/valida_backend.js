/**
 * valida_backend.js — testa o apps_script.gs SEM o Google.
 *
 * Carrega o apps_script.gs num sandbox (vm) com SpreadsheetApp/ContentService/
 * LockService/Utilities/Session "dublados" (mocks em memória), e exercita doPost
 * com payloads iguais aos que o HTML envia. Confere: mapeamento das 59 colunas,
 * "__outro__" -> "Outro", coerção de idade, junção das ordens, corte de
 * user_agent, idempotência por submission_id, aba de e-mails separada/anônima e
 * as validações de shape.
 *
 * Uso:  node tools/valida_backend.js     (sai != 0 se algo falhar)
 *
 * Obs.: valida a LÓGICA do back-end. A rede real e as permissões do Web App só
 * dá para confirmar no smoke test pós-deploy (instalacao.md, passo 6).
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'apps_script.gs'), 'utf8');

/* ---- mocks dos serviços Google (planilha em memória) ---- */
function FakeSheet(name) { this.name = name; this.rows = []; this.frozen = 0; }
FakeSheet.prototype.getLastRow = function () { return this.rows.length; };
FakeSheet.prototype.setFrozenRows = function (n) { this.frozen = n; };
FakeSheet.prototype.appendRow = function (arr) { this.rows.push(arr.slice()); };
FakeSheet.prototype.getRange = function (row, col, numRows, numCols) {
  numRows = numRows || 1; numCols = numCols || 1;
  const sheet = this;
  return {
    setValues: function (vals) {
      for (let r = 0; r < vals.length; r++) {
        const target = row - 1 + r;
        while (sheet.rows.length <= target) sheet.rows.push([]);
        for (let c = 0; c < vals[r].length; c++) sheet.rows[target][col - 1 + c] = vals[r][c];
      }
      return this;
    },
    getValues: function () {
      const out = [];
      for (let r = 0; r < numRows; r++) {
        const rowArr = sheet.rows[row - 1 + r] || [];
        const slice = [];
        for (let c = 0; c < numCols; c++) slice.push(rowArr[col - 1 + c]);
        out.push(slice);
      }
      return out;
    }
  };
};
function FakeSS() { this.sheets = {}; }
FakeSS.prototype.getSheetByName = function (n) { return this.sheets[n] || null; };
FakeSS.prototype.insertSheet = function (n) { return (this.sheets[n] = new FakeSheet(n)); };

const SS = new FakeSS();
const sandbox = {
  SpreadsheetApp: { getActiveSpreadsheet: () => SS },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  ContentService: {
    MimeType: { JSON: 'application/json' },
    createTextOutput: (s) => ({ _text: s, setMimeType() { return this; } })
  },
  Utilities: { formatDate: () => '2026-06-26' },
  Session: { getScriptTimeZone: () => 'America/Belem' },
  console
};
vm.createContext(sandbox);
try { vm.runInContext(src, sandbox); }
catch (e) { console.error('FALHA ao carregar apps_script.gs:', e.message); process.exit(1); }

const post = (obj) => JSON.parse(sandbox.doPost(obj)._text);
const postBody = (o) => post({ postData: { contents: JSON.stringify(o) } });

/* ---- monta payload igual ao do HTML ---- */
const respostas = {};
for (let i = 1; i <= 10; i++) respostas['GC' + String(i).padStart(2, '0')] = (i % 7) + 1;
for (let i = 11; i <= 20; i++) respostas['GOV' + i] = (i % 7) + 1;
for (let i = 21; i <= 36; i++) respostas['DEC' + i] = (i % 7) + 1;
Object.assign(respostas, {
  D1: 'UFPA', D2: '__outro__', D2_outro: 'Agênero', D3: '47', D4: 'Doutorado',
  D5: 'Gestão acadêmica', D5a: 'Programa de pós-graduação ou equivalente',
  D6: 'Sim', D7: 'De 7 a 10 anos', D8: 'De 1 a 3 anos', D9: 'Docente'
});
const payload = {
  tipo: 'submissao', submission_id: 's_teste_1', completo: true,
  duracao_segundos: 125, semente: 12345678,
  ordem_gc: ['GC04', 'GC08', 'GC05', 'GC01', 'GC10', 'GC02', 'GC07', 'GC09', 'GC06', 'GC03'],
  ordem_gov: ['GOV11', 'GOV12'], ordem_dec: ['DEC21', 'DEC22'],
  user_agent: 'x'.repeat(250), respostas
};

/* ---- asserções ---- */
const falhas = [];
const need = (c, m) => { if (!c) falhas.push(m); };

const out1 = postBody(payload);
need(out1.ok === true && out1.criado === true, 'submissão não criou: ' + JSON.stringify(out1));

const sh = SS.getSheetByName('respostas');
need(!!sh, 'aba respostas não criada');
const H = sandbox.RESP_HEADER;
need(JSON.stringify(sh.rows[0]) === JSON.stringify(H), 'cabeçalho != RESP_HEADER');
need(H.length === 59, 'RESP_HEADER deveria ter 59 colunas, tem ' + H.length);
need(sh.rows.length === 2, 'esperava cabeçalho + 1 dado; linhas=' + sh.rows.length);

const idx = (n) => H.indexOf(n);
const d = sh.rows[1];
const isNum = (v) => typeof v === 'number' && v >= 1 && v <= 7;
need(d[idx('submission_id')] === 's_teste_1', 'submission_id errado');
need(isNum(d[idx('GC01')]) && isNum(d[idx('GOV11')]) && isNum(d[idx('DEC21')]), 'escalas não numéricas 1–7');
need(d[idx('D2')] === 'Outro', 'D2 deveria virar "Outro"');
need(d[idx('D2_outro')] === 'Agênero', 'D2_outro perdeu o texto');
need(d[idx('D3')] === 47, 'D3 não coagido para número (idade)');
need(d[idx('D5a')] === 'Programa de pós-graduação ou equivalente', 'D5a perdido');
need(d[idx('D4_outro')] === '', 'D4_outro deveria ser vazio (não foi "Outro")');
need(d[idx('ordem_gc')] === 'GC04|GC08|GC05|GC01|GC10|GC02|GC07|GC09|GC06|GC03', 'ordem_gc não juntada com |');
need(typeof d[idx('user_agent')] === 'string' && d[idx('user_agent')].length <= 200, 'user_agent não cortado em 200');
need(d[idx('completo')] === true, 'completo != true');
need(d[idx('duracao_segundos')] === 125 && d[idx('semente')] === 12345678, 'duracao/semente errados');

// idempotência: reenviar o mesmo submission_id NÃO duplica
const out2 = postBody(payload);
need(out2.ok === true && out2.atualizado === true, 'reenvio não foi update: ' + JSON.stringify(out2));
need(sh.rows.length === 2, 'reenvio DUPLICOU linha (idempotência falhou): ' + sh.rows.length);

// e-mail em aba separada, anônima, só [data, email]
const outE = postBody({ tipo: 'email', email: 'a@b.com', submission_id_relacionado: null });
need(outE.ok === true, 'email não gravou: ' + JSON.stringify(outE));
const she = SS.getSheetByName('emails');
need(she && JSON.stringify(she.rows[0]) === JSON.stringify(['data', 'email']), 'cabeçalho emails errado');
need(she.rows.length === 2 && she.rows[1][1] === 'a@b.com' && she.rows[1].length === 2,
  'email não isolado em [data,email] (vínculo vazado?)');

// validações
need(postBody({ tipo: 'email', email: 'invalido' }).erro === 'email_invalido', 'email inválido não rejeitado');
need(postBody({ tipo: 'submissao' }).erro === 'sem_respostas', 'sem respostas não rejeitado');
need(postBody({ tipo: 'submissao', respostas: {} }).erro === 'sem_submission_id', 'sem submission_id não rejeitado');
need(postBody({ tipo: 'xpto', respostas: {}, submission_id: 'x' }).erro === 'tipo_desconhecido', 'tipo desconhecido não rejeitado');
need(post({}).erro === 'sem_corpo', 'POST sem corpo não rejeitado');
need(post({ postData: { contents: '{quebrado' } }).ok === false, 'JSON malformado não rejeitado');
need(JSON.parse(sandbox.doGet()._text).ok === true, 'doGet não responde ok');

/* ---- relatório ---- */
console.log('--- valida_backend ---');
console.log('RESP_HEADER         : ' + H.length + ' colunas');
console.log('linha gravada       : submission_id=' + d[idx('submission_id')] +
  ' | GC01=' + d[idx('GC01')] + ' | D1=' + d[idx('D1')] + ' | D2=' + d[idx('D2')] +
  ' (+' + d[idx('D2_outro')] + ') | D3=' + d[idx('D3')]);
console.log('idempotência        : ' + (sh.rows.length - 1) + ' linha após reenvio do mesmo id');
console.log('emails (anônimo)    : header ' + JSON.stringify(she.rows[0]) + ', ' + (she.rows.length - 1) + ' registro');
if (falhas.length) {
  console.error('\nFALHAS (' + falhas.length + '):');
  falhas.forEach((f) => console.error('  x ' + f));
  process.exit(1);
}
console.log('\nTODAS AS ASSERÇÕES OK');
