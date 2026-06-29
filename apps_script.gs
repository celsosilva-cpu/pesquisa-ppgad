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
var ABA_LEITURA   = 'leitura'; // espelho legível de "respostas" (só leitura, por fórmula)
var ABA_PAINEL    = 'painel';  // dashboard de contagens (QUERY, atualiza sozinho)

/* Rótulos da escala 1–7 — casa com exportar_para_spss.md (Passo 3). */
var ESCALA_ROTULOS = ['Nunca', 'Raramente', 'Poucas vezes', 'Às vezes',
                      'Muitas vezes', 'Quase sempre', 'Sempre'];

/* Enunciados na íntegra (cabeçalho da aba "leitura"). FONTE: index.html — se uma
   pergunta mudar lá, atualize aqui. PERGUNTAS_ESCALA segue a ordem de SCALE_COLS
   (GC01..GC10, GOV11..GOV20, DEC21..DEC36); PERGUNTAS_DEMO segue DEMO_COLS. */
var PERGUNTAS_ESCALA = [
  // GC01..GC10 — Gestão do Conhecimento
  'Promovo regularmente espaços para que minha equipe compartilhe conhecimentos, experiências e aprendizados relevantes para a gestão.',
  'Valorizo publicamente os casos em que colegas compartilham novos conhecimentos ou experiências.',
  'Estimulo um ambiente de confiança em que a equipe possa expor dúvidas, pedir ajuda e compartilhar experiências sem receio de julgamento.',
  'Mantenho canais formais e permanentes de comunicação para circulação de orientações, práticas e dúvidas entre a equipe.',
  'Adoto padrões de nomenclatura e classificação da informação (títulos, palavras-chave) para facilitar o registro e a localização de documentos e dados.',
  'Utilizo identificadores únicos nos sistemas e registros da unidade para reduzir duplicidades e facilitar a recuperação das informações.',
  'Organizo atividades estruturadas de aprendizagem com a equipe, com base em situações reais do setor.',
  'Promovo momentos de reflexão coletiva sobre projetos e atividades para desenvolver competências da equipe.',
  'Emprego modelo padronizado para registrar informações relevantes de projetos, incluindo fonte, data e responsáveis.',
  'Após concluir tarefas ou demandas relevantes, registro e compartilho as lições aprendidas em base institucional apropriada.',
  // GOV11..GOV20 — Governança Pública
  'Reforço junto à minha equipe os padrões de integridade e conduta ética esperados na unidade.',
  'Nos processos que coordeno, promovo o envolvimento das partes interessadas nas decisões que afetam a unidade.',
  'Utilizo o planejamento estratégico institucional (PDI) para definir prioridades e orientar decisões de gestão.',
  'Acompanho regularmente metas e indicadores da unidade para verificar o alcance dos objetivos.',
  'Nos processos administrativos, identifico e avalio riscos relevantes para resultados, conformidade e uso de recursos.',
  'Quando necessário, utilizo os canais institucionais adequados para registrar e encaminhar irregularidades.',
  'Antes de tomar decisões relevantes, verifico e formalizo eventuais conflitos de interesse ou impedimentos.',
  'Comunico com clareza e tempestividade os critérios que fundamentam as decisões administrativas da unidade.',
  'Quando há descumprimento de objetivos, prazos ou normas, acompanho a adoção de providências cabíveis.',
  'Presto contas dos resultados da unidade às instâncias competentes e, quando aplicável, aos órgãos de controle.',
  // DEC21..DEC36 — Tomada de Decisão
  'Baseio decisões relevantes em dados sistemáticos, informações verificadas e critérios claramente definidos.',
  'Registro as evidências e fontes utilizadas para sustentar decisões relevantes da unidade.',
  'Antes de concluir uma decisão, verifico se a alternativa escolhida está alinhada aos objetivos da unidade.',
  'Reviso a consistência técnica da decisão antes de formalizá-la, para reduzir erros e escolhas mal fundamentadas.',
  'Tomo decisões no tempo adequado às demandas da unidade, sem postergações desnecessárias.',
  'Comunico decisões relevantes com agilidade suficiente para permitir sua execução oportuna.',
  'Traduzo decisões em encaminhamentos claros para sua execução.',
  'Acompanho se as decisões implementadas produzem os resultados pretendidos pela unidade.',
  'Em situações complexas, identifico padrões relevantes a partir de múltiplos sinais do contexto.',
  'Integro informações dispersas da situação para formar uma compreensão global antes de decidir.',
  'Recorro ao conhecimento construído na prática quando nem todas as informações estão explicitadas.',
  'Utilizo aprendizados implícitos da experiência para lidar com situações novas ou ambíguas.',
  'Em situações semelhantes às já vivenciadas, uso lições da experiência anterior para orientar minha escolha.',
  'Apoio-me em experiências acumuladas para antecipar consequências prováveis das alternativas consideradas.',
  'Distingo quando uma percepção intuitiva decorre de experiência válida e quando é apenas impressão subjetiva.',
  'Avalio se uma situação exige análise detalhada, julgamento intuitivo ou ambos antes de decidir.'
];
var PERGUNTAS_DEMO = [
  'Nome da Instituição Federal de Ensino Superior (IFES)',          // D1
  'Com qual gênero você se identifica?',                            // D2
  'Gênero — outro (texto livre)',                                   // D2_outro
  'Qual é a sua idade?',                                            // D3
  'Qual é o seu grau de instrução mais elevado?',                  // D4
  'Grau de instrução — outro (texto livre)',                        // D4_outro
  'Qual alternativa melhor descreve sua função de gestão atual?',   // D5
  'Qual alternativa melhor descreve sua unidade de atuação?',       // D5a
  'Unidade de atuação — outro (texto livre)',                       // D5a_outro
  'Você possui formação acadêmica em Gestão (graduação ou pós)?',   // D6
  'Há quanto tempo você atua na instituição atual?',               // D7
  'Há quanto tempo exerce ou exerceu cargo de gestão no serviço público?', // D8
  'A qual segmento funcional você pertence?',                       // D9
  'Segmento funcional — outro (texto livre)'                        // D9_outro
];

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

/* ---------------------------------------------------------------------------
 * Aba "leitura" — espelho LEGÍVEL de "respostas" (versão "normal"; a "respostas"
 * segue sendo a base canônica para SPSS, com os números 1–7).
 *
 * É montada por FÓRMULA: a aba se atualiza sozinha a cada nova submissão e nunca
 * vira uma segunda fonte de verdade. Traduz as escalas 1–7 para rótulo, mostra
 * "completo" como Sim/Não, duração em minutos, e omite o ruído técnico
 * (semente, ordem_*, user_agent).
 *
 * USO: rode UMA vez. Ou recarregue a planilha e use o menu "Coleta PPGAD →
 * Configurar aba leitura", ou aqui no editor selecione a função
 * configurarAbaLeitura e clique Executar (autorize na 1ª vez). Pode rodar de
 * novo a qualquer momento: recria a aba do zero (idempotente).
 *
 * Os separadores de argumento usam ";" (locale pt-BR desta planilha). Neste
 * ambiente o setFormula() interpreta no locale da planilha — não em US/vírgula.
 * Se um dia a planilha for recriada em locale US, troque SEP para ",".
 * ------------------------------------------------------------------------- */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Coleta PPGAD')
    .addItem('Configurar aba "leitura"', 'configurarAbaLeitura')
    .addItem('Configurar aba "painel"', 'configurarAbaPainel')
    .addToUi();
}

function configurarAbaLeitura() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(ABA_RESPOSTAS)) {
    throw new Error('A aba "' + ABA_RESPOSTAS + '" ainda não existe — ' +
                    'envie ao menos 1 resposta antes de configurar a leitura.');
  }
  var sh = ss.getSheetByName(ABA_LEITURA);
  if (sh) sh.clear(); else sh = ss.insertSheet(ABA_LEITURA);

  var Q = "'" + ABA_RESPOSTAS + "'"; // nome da aba citado em fórmula (com aspas)
  var S = ';'; // separador de argumentos no locale pt-BR (US seria ',')

  // Cabeçalhos: 4 fixos + as perguntas na íntegra ("CÓDIGO — enunciado").
  if (PERGUNTAS_ESCALA.length !== SCALE_COLS.length ||
      PERGUNTAS_DEMO.length !== DEMO_COLS.length) {
    throw new Error('Listas de perguntas fora de sincronia com as colunas (veja apps_script.gs).');
  }
  sh.getRange('A1:D1').setValues([['Data/hora', 'ID', 'Completo?', 'Duração (min)']]);
  var cabE = SCALE_COLS.map(function (c, i) { return c + ' — ' + PERGUNTAS_ESCALA[i]; });
  sh.getRange(1, 5, 1, cabE.length).setValues([cabE]);  // E1..AN1 (escalas)
  var cabD = DEMO_COLS.map(function (c, i) { return c + ' — ' + PERGUNTAS_DEMO[i]; });
  sh.getRange(1, 41, 1, cabD.length).setValues([cabD]); // AO1..BB1 (demográficos)

  // Linha 2: fórmulas que "derramam" para baixo/lados e se auto-atualizam.
  var temResp = '=ARRAYFORMULA(IF(' + Q + '!B2:B=""' + S + '""' + S; // prefixo: só linhas com submission_id
  sh.getRange('A2').setFormula(temResp + Q + '!A2:A))');
  sh.getRange('B2').setFormula(temResp + Q + '!B2:B))');
  sh.getRange('C2').setFormula(temResp + 'IF(' + Q + '!C2:C' + S + '"Sim"' + S + '"Não")))');
  sh.getRange('D2').setFormula(temResp + 'ROUND(' + Q + '!D2:D/60' + S + '1)))');

  var rot = ESCALA_ROTULOS.map(function (s) { return '"' + s + '"'; }).join(S);
  // IFERROR: célula vazia ou não-numérica (ex.: "-") passa adiante sem quebrar o CHOOSE.
  sh.getRange('E2').setFormula(
    '=MAP(' + Q + '!J2:AS' + S + 'LAMBDA(v' + S + 'IFERROR(CHOOSE(v' + S + rot + ')' + S + 'v)))'
  );

  sh.getRange('AO2').setFormula('=ARRAYFORMULA(IF(' + Q + '!AT2:BG=""' + S + '""' + S + Q + '!AT2:BG))');

  // Cabeçalho: negrito, com quebra de texto (perguntas longas) e largura das colunas.
  sh.getRange('A1:BB1').setFontWeight('bold').setWrap(true).setVerticalAlignment('top');
  sh.setRowHeight(1, 96);
  sh.setColumnWidth(2, 150);                                   // ID
  for (var k = 5; k <= 54; k++) sh.setColumnWidth(k, 200);     // E..BB: perguntas
  sh.setFrozenColumns(2);                                      // trava Data/hora + ID ao rolar
  sh.setFrozenRows(1);
  SpreadsheetApp.flush();
}

/* ---------------------------------------------------------------------------
 * Aba "painel" — dashboard de contagens gerais, montado por código.
 *
 * KPIs (total de respostas, % completas, duração mediana) + uma tabela de
 * frequência por dimensão (D1 IES, D9 segmento, D5 função, D4 grau, D2 gênero,
 * D6 formação), via QUERY group by — atualiza sozinho a cada nova resposta e
 * descobre categorias novas (inclusive "Outro") automaticamente.
 *
 * Lê de "respostas" (base canônica). Os blocos ficam lado a lado, em colunas
 * separadas, para não colidirem ao "derramar". Para o filtro INTERATIVO (clicar
 * e fatiar), use Tabela Dinâmica + Segmentadores — ver exportar_para_spss.md.
 *
 * USO: igual à leitura — menu "Coleta PPGAD → Configurar aba painel" (ou rode
 * configurarAbaPainel no editor). Idempotente: recria a aba do zero.
 * ------------------------------------------------------------------------- */

function configurarAbaPainel() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(ABA_RESPOSTAS)) {
    throw new Error('A aba "' + ABA_RESPOSTAS + '" ainda não existe — ' +
                    'envie ao menos 1 resposta antes de configurar o painel.');
  }
  var sh = ss.getSheetByName(ABA_PAINEL);
  if (sh) sh.clear(); else sh = ss.insertSheet(ABA_PAINEL);
  sh.getRange('A1:Q8').breakApart(); // desfaz mesclagens de execução anterior

  var Q = "'" + ABA_RESPOSTAS + "'";
  var S = ';'; // separador de argumentos no locale pt-BR (US seria ',')

  // Banner do título (mesclado em toda a largura).
  sh.getRange('A1:Q1').merge();
  sh.getRange('A1').setValue('Painel — Coleta PPGAD (atualiza sozinho)')
    .setFontWeight('bold').setFontSize(14)
    .setBackground('#0b5394').setFontColor('#ffffff')
    .setVerticalAlignment('middle');
  sh.setRowHeight(1, 32);

  // KPIs
  sh.getRange('A3').setValue('Total de respostas');
  sh.getRange('B3').setFormula('=COUNTA(' + Q + '!B2:B)');
  sh.getRange('A4').setValue('% completas');
  sh.getRange('B4')
    .setFormula('=IFERROR(COUNTIF(' + Q + '!C2:C' + S + 'TRUE)/COUNTA(' + Q + '!B2:B)' + S + '0)')
    .setNumberFormat('0%');
  sh.getRange('A5').setValue('Duração mediana (min)');
  sh.getRange('B5').setFormula('=IFERROR(ROUND(MEDIAN(' + Q + '!D2:D)/60' + S + '1)' + S + '"")');
  sh.getRange('A3:B5').setBackground('#f3f6fb');
  sh.getRange('A3:A5').setFontWeight('bold');
  sh.getRange('B3:B5').setFontWeight('bold').setFontSize(12).setFontColor('#0b5394')
    .setHorizontalAlignment('left');

  // Tabelas de frequência. Como o range começa em A, as letras do QUERY = letras
  // reais da planilha. [destino, colN, colNaResp, rótulo, títuloDaSeção]
  var dims = [
    ['A', 'B', 'AT', 'IES',                'Por IES — D1'],
    ['D', 'E', 'BF', 'Segmento',           'Por segmento — D9'],
    ['G', 'H', 'AZ', 'Função de gestão',   'Por função de gestão — D5'],
    ['J', 'K', 'AX', 'Grau de instrução',  'Por grau de instrução — D4'],
    ['M', 'N', 'AU', 'Gênero',             'Por gênero — D2'],
    ['P', 'Q', 'BC', 'Formação em Gestão', 'Por formação em Gestão — D6']
  ];
  for (var i = 0; i < dims.length; i++) {
    var dest = dims[i][0], ncol = dims[i][1], col = dims[i][2],
        rotulo = dims[i][3], titulo = dims[i][4];

    sh.getRange(dest + '7:' + ncol + '7').merge();
    sh.getRange(dest + '7').setValue(titulo).setFontWeight('bold').setBackground('#cfe2f3');

    var q = 'select ' + col + ', count(' + col + ') ' +
            'where ' + col + " is not null and " + col + " <> '' " +
            'group by ' + col + ' order by count(' + col + ') desc ' +
            "label " + col + " '" + rotulo + "', count(" + col + ") 'n'";
    sh.getRange(dest + '8').setFormula(
      '=IFERROR(QUERY(' + Q + '!A2:BG' + S + '"' + q + '"' + S + '0)' + S + '"sem dados")'
    );

    sh.getRange(dest + '8:' + ncol + '8').setFontWeight('bold').setBackground('#e8eef7');
    sh.getRange(ncol + '8:' + ncol).setHorizontalAlignment('right');
  }

  // Larguras: rótulos largos, "n" estreitos, respiro entre os blocos.
  [1, 4, 7, 10, 13, 16].forEach(function (c) { sh.setColumnWidth(c, 185); });
  [2, 5, 8, 11, 14, 17].forEach(function (c) { sh.setColumnWidth(c, 52); });
  [3, 6, 9, 12, 15].forEach(function (c) { sh.setColumnWidth(c, 28); });

  sh.setFrozenRows(1);
  SpreadsheetApp.flush(); // garante que os QUERY já preencheram antes de medir/plotar

  // Gráficos de barras (um por dimensão), em grid 3x2 abaixo das tabelas.
  sh.getCharts().forEach(function (c) { sh.removeChart(c); }); // limpa execução anterior
  var col3 = [1, 7, 13], rowBase = [13, 28];
  for (var j = 0; j < dims.length; j++) {
    var d2 = dims[j][0], n2 = dims[j][1], tit = dims[j][4];
    // mede quantas linhas (cabeçalho + categorias) o QUERY produziu nesta coluna.
    var colVals = sh.getRange(d2 + '8:' + d2 + '50').getValues();
    var nrows = 0;
    while (nrows < colVals.length && colVals[nrows][0] !== '' && colVals[nrows][0] != null) nrows++;
    if (nrows < 2) continue; // ainda sem categorias para plotar
    var chart = sh.newChart()
      .asColumnChart()
      .addRange(sh.getRange(d2 + '8:' + n2 + (8 + nrows - 1)))
      .setNumHeaders(1)
      .setPosition(rowBase[Math.floor(j / 3)], col3[j % 3], 5, 5)
      .setOption('title', tit)
      .setOption('legend', { position: 'none' })
      .setOption('width', 330)
      .setOption('height', 200)
      .build();
    sh.insertChart(chart);
  }
}
