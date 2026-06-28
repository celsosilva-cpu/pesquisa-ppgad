/**
 * valida_payload.js — validação FIEL do payload do questionário.
 *
 * Extrai o <script> real do index.html, executa as funções de
 * verdade num sandbox (vm) com stubs de navegador, preenche um conjunto
 * completo de respostas e confere o que montarPayloadSubmissao() produz —
 * o mesmo objeto que seria enviado ao Apps Script.
 *
 * Uso:  node tools/valida_payload.js     (sai com código != 0 se algo falhar)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML, 'utf8');

// 1) extrai o ÚLTIMO bloco <script>...</script> (o app)
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (!blocks.length) { console.error('FALHA: nenhum <script> encontrado'); process.exit(1); }
let src = blocks[blocks.length - 1][1];

// 2) remove a chamada final render() (depende do DOM) e expõe internals via bridge
src = src.replace(/\brender\(\);\s*$/, '');
src += `
;globalThis.__test = {
  state: state,
  SECTIONS: SECTIONS,
  SESSION_SEED: SESSION_SEED,
  montarPayloadSubmissao: montarPayloadSubmissao,
  ordemDaSecao: ordemDaSecao,
  setInicio: function (t) { _tempoInicio = t; }
};`;

// 3) sandbox com stubs mínimos (Math/JSON/Date/Array vêm do próprio contexto)
const sandbox = {
  navigator: { userAgent: 'harness-node-test ' + 'x'.repeat(300) }, // > 200 p/ testar o corte
  document: { getElementById: () => null, querySelectorAll: () => [] },
  window: {},
  fetch: () => Promise.resolve({ json: () => Promise.resolve({ ok: true }) }),
  console: console,
  setTimeout: () => 0, clearTimeout: () => {}
};
vm.createContext(sandbox);
try { new vm.Script(src); }            // compila => pega erro de sintaxe
catch (e) { console.error('FALHA na compilação do <script>:', e.message); process.exit(1); }
vm.runInContext(src, sandbox);
const T = sandbox.__test;

// 4) preenche um conjunto COMPLETO de respostas
T.setInicio(Date.now() - 125000); // ~125s atrás

const ans = T.state.answers;
let n = 0;
T.SECTIONS.forEach(sec => sec.questions.forEach(q => {
  if (q.kind === 'scale') { ans[q.id] = (n % 7) + 1; n++; } // valores 1..7
}));
ans.D1 = 'UFPA';
ans.D2 = '__outro__'; ans.D2_outro = 'Agênero';   // caminho "Outro"
ans.D3 = '47';                                     // idade como string
ans.D4 = 'Doutorado';
ans.D5 = 'Gestão acadêmica';                       // dispara D5a
ans.D5a = 'Programa de pós-graduação ou equivalente';
ans.D6 = 'Sim';
ans.D7 = 'De 7 a 10 anos';
ans.D8 = 'De 1 a 3 anos';
ans.D9 = 'Docente';

const p = T.montarPayloadSubmissao();

// 5) asserções
const falhas = [];
const need = (cond, msg) => { if (!cond) falhas.push(msg); };

const gc  = Array.from({ length: 10 }, (_, i) => 'GC' + String(i + 1).padStart(2, '0'));
const gov = Array.from({ length: 10 }, (_, i) => 'GOV' + (i + 11));
const dec = Array.from({ length: 16 }, (_, i) => 'DEC' + (i + 21));
const escalas = [...gc, ...gov, ...dec];

escalas.forEach(k => {
  need(k in p.respostas, 'falta chave de escala: ' + k);
  const v = p.respostas[k];
  need(typeof v === 'number' && v >= 1 && v <= 7, 'escala não numérica 1–7: ' + k + ' = ' + v);
});
need(Object.keys(p.respostas).filter(k => /^GC/.test(k)).every(k => /^GC\d\d$/.test(k)),
     'há chave GC sem padding de 2 dígitos');

['D1', 'D3', 'D4', 'D5', 'D5a', 'D6', 'D7', 'D8', 'D9'].forEach(k =>
  need(k in p.respostas, 'falta demográfico: ' + k));
need(p.respostas.D2 === '__outro__', 'D2 deveria ser sentinela "__outro__"');
need(p.respostas.D2_outro === 'Agênero', 'D2_outro deveria conter o texto livre');

need(p.tipo === 'submissao', 'tipo != submissao');
need(typeof p.submission_id === 'string' && p.submission_id.length > 0, 'submission_id ausente');
need(p.completo === true, 'completo != true');
need(typeof p.semente === 'number' && String(p.semente).length === 8, 'semente não é int de 8 díg.');
need(p.duracao_segundos >= 120 && p.duracao_segundos <= 130, 'duracao_segundos fora de ~125: ' + p.duracao_segundos);
need(p.user_agent.length === 200, 'user_agent não cortado em 200 (len=' + p.user_agent.length + ')');

need(Array.isArray(p.ordem_gc)  && p.ordem_gc.length === 10,  'ordem_gc != 10');
need(Array.isArray(p.ordem_gov) && p.ordem_gov.length === 10, 'ordem_gov != 10');
need(Array.isArray(p.ordem_dec) && p.ordem_dec.length === 16, 'ordem_dec != 16');

// edição #1: ordens devem estar padronizadas (2 díg.) iguais aos nomes de coluna
need(p.ordem_gc.every(id => /^GC\d\d$/.test(id)),  'ordem_gc sem padding (ex.: GC4 em vez de GC04)');
need(p.ordem_gov.every(id => /^GOV\d\d$/.test(id)), 'ordem_gov fora do padrão GOVnn');
need(p.ordem_dec.every(id => /^DEC\d\d$/.test(id)), 'ordem_dec fora do padrão DECnn');

// 6) relatório
console.log('--- valida_payload ---');
console.log('escalas conferidas : ' + escalas.length + ' (10 GC + 10 GOV + 16 DEC)');
console.log('semente            : ' + p.semente + ' (' + String(p.semente).length + ' díg.)');
console.log('duracao_segundos   : ' + p.duracao_segundos);
console.log('user_agent (corte) : ' + p.user_agent.length + ' chars');
console.log('ordem_gc           : ' + p.ordem_gc.join('|'));
console.log('total de chaves em respostas: ' + Object.keys(p.respostas).length);

if (falhas.length) {
  console.error('\nFALHAS (' + falhas.length + '):');
  falhas.forEach(f => console.error('  x ' + f));
  process.exit(1);
}
console.log('\nTODAS AS ASSERÇÕES OK');
