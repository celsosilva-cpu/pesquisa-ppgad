# Instalação — conectar HTML ↔ Apps Script ↔ Planilha

Tempo: ~15 minutos, uma vez só. No fim, o `pesquisa_prototipo.html` grava as
respostas direto numa Planilha Google sua.

> As abas (`respostas`, `emails`) e seus cabeçalhos são criados **automaticamente**
> no primeiro envio. Você não precisa montá-las à mão.

---

## Passo 1 — Criar a Planilha

1. Em https://sheets.new (logado na sua conta UFRA/Google), crie uma planilha em branco.
2. Dê um nome, ex.: **`Coleta PPGAD — respostas`**.
3. Deixe-a aberta.

## Passo 2 — Abrir o editor de Apps Script

1. Na planilha: menu **Extensões → Apps Script**.
2. Apague todo o conteúdo do arquivo `Código.gs` que aparece.
3. Abra o `apps_script.gs` deste projeto, copie **tudo** e cole no editor.
4. Clique no disquete (**Salvar projeto**). Dê um nome ao projeto, ex.: `coleta-ppgad`.

## Passo 3 — (opcional) Conferir que compila

1. No editor, selecione a função **`doGet`** na barra superior e clique **Executar**.
2. Vai pedir autorização: **Revisar permissões → escolher sua conta →**
   na tela "Google não verificou este app", clique **Avançado → Acessar coleta-ppgad
   (não seguro) → Permitir**. (É seu próprio script; o aviso é padrão.)
3. Se rodar sem erro, está pronto para publicar.

## Passo 4 — Publicar como App da Web

1. Canto superior direito: **Implantar → Nova implantação**.
2. Em "Selecionar tipo" (engrenagem), escolha **App da Web**.
3. Configure exatamente assim:
   - **Descrição:** `coleta v1` (qualquer texto)
   - **Executar como:** **Eu (seu e-mail)**
   - **Quem pode acessar:** **Qualquer pessoa**  ← *atenção: não é "qualquer pessoa
     com conta Google"; precisa aceitar respondentes anônimos*
4. **Implantar** → autorize se pedir.
5. Copie a **URL do app da Web** (termina em **`/exec`**). É ela que vamos usar.

> **Teste rápido da URL:** cole a URL `/exec` no navegador. Deve aparecer
> `{"ok":true,"servico":"coleta PPGAD/UFPA","status":"no ar"}`. Se aparecer isso,
> o serviço está no ar.

## Passo 5 — Colar a URL no questionário

1. Abra `pesquisa_prototipo.html` num editor de texto.
2. Vá à **linha 440**:
   ```js
   const ENDPOINT_URL = "";
   ```
3. Cole a URL entre as aspas:
   ```js
   const ENDPOINT_URL = "https://script.google.com/macros/s/AKfy.../exec";
   ```
4. Salve **mantendo a codificação UTF-8** (no VS Code, canto inferior direito deve
   dizer "UTF-8"; nunca "UTF-8 with BOM" nem "Windows-1252"). Acentos têm que
   continuar certos.

## Passo 6 — Smoke test (envio real)

1. Abra o `pesquisa_prototipo.html` (duplo clique abre no navegador).
2. Responda rápido até o fim e finalize.
3. Na Planilha, a aba **`respostas`** deve ganhar **1 linha** com:
   - colunas de escala (`GC01`…`DEC36`) com **números 1–7**;
   - `semente` (8 dígitos), `duracao_segundos`, `ordem_gc/gov/dec` (ex.: `GC03|GC07|...`),
     `user_agent`, e os demográficos `D1`…`D9`.
4. (Opcional) Na tela final, informe um e-mail e clique "Receber resultados".
   A aba **`emails`** deve ganhar 1 linha **só com data + e-mail** (sem nada que ligue
   à resposta — isso é proposital).
5. **Apague as linhas de teste** das duas abas antes de ir a campo.

## Passo 7 — Versionar e seguir

Depois que o teste passar, esta versão do HTML (já com a URL) entra no git:
```
git -C "C:/Users/CelsoCardosoSilva/pesquisa-ppgad" add pesquisa_prototipo.html
git -C "C:/Users/CelsoCardosoSilva/pesquisa-ppgad" commit -m "feat: conectar HTML ao Apps Script (ENDPOINT_URL)"
```

---

## Quando você EDITAR o `apps_script.gs` depois

Editar o código **não** atualiza o app publicado sozinho. Para manter a **mesma URL**:

1. **Implantar → Gerenciar implantações**.
2. No lápis (**Editar**), em "Versão" escolha **Nova versão** → **Implantar**.

(Se em vez disso você fizer "Nova implantação", ganha uma **URL nova** e teria que
trocar o `ENDPOINT_URL` de novo.)

---

## Solução de problemas

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Tela final diz "registradas" mas nada na planilha | `ENDPOINT_URL` vazia ou errada | Confira o passo 5; teste a URL `/exec` no navegador (passo 4). |
| Erro/CORS no console do navegador | App publicado como "qualquer pessoa **com conta Google**" | Reedite a implantação → "Quem pode acessar: **Qualquer pessoa**". |
| `{"ok":false,"erro":"email_invalido"}` | E-mail digitado sem formato válido | Esperado; só aceita `algo@dominio.x`. |
| Mudei o `.gs` e nada muda | App ainda na versão antiga | "Gerenciar implantações" → Editar → **Nova versão**. |
| Acentos quebrados na tela | HTML salvo fora de UTF-8 | Reabra e salve como **UTF-8 (sem BOM)**. |

---

## Observações importantes

- **Salvamento parcial não está implementado.** O selo "Respostas salvas" no
  questionário é **local** (só no navegador do respondente). Se alguém abandonar no
  meio, nada chega à planilha — só submissões finalizadas são gravadas. Se quiser
  capturar parciais no futuro, é preciso mexer também no HTML (me avise).
- **LGPD / CNS 510:** a planilha é privada da sua conta. Não compartilhe com edição
  ampla, e **nunca** exporte respostas para dentro do repositório git (o `.gitignore`
  já bloqueia `.xlsx/.csv/.sav`, mas o cuidado é seu também).

---

## Apêndice (opcional) — mini-painel de acompanhamento

Se quiser um contador rápido, crie uma aba `painel` e cole estas fórmulas
(ajuste se renomear abas). Não atrapalham a coleta:

```
=CONT.VALORES(respostas!B2:B)                          (total de respostas)
=CONT.SE(respostas!AT2:AT;"UNIFESSPA")                 (D1 = coluna AT)
=CONT.SE(respostas!AT2:AT;"UFOPA")
=CONT.SE(respostas!AT2:AT;"UFPA")
=MÉDIA(respostas!D2:D)                                 (duração média, em segundos)
```
> Layout das colunas: **A–I** metadados (B = `submission_id`, D = `duracao_segundos`),
> **J–AS** as 36 escalas (J = `GC01`), e os demográficos a partir de **AT** (`D1`).
> Confira a letra na sua planilha antes de confiar nos contadores.
