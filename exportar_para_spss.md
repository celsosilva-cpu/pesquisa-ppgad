# Da Planilha ao SPSS — exportar, rotular e analisar

Roteiro para levar a aba `respostas` ao SPSS, definir rótulos/medidas uma única
vez, salvar `.sav` e rodar o alfa de Cronbach por subescala. No fim, como tratar
`ordem_gc/gov/dec` se quiser analisar efeito de ordem.

> **LGPD:** o `.xlsx` e o `.sav` contêm os dados — ficam **fora do git** (o
> `.gitignore` já bloqueia) e em pasta protegida. A aba `emails` **não** entra na
> análise.

---

## Mapa das colunas (como o back-end grava)

| Faixa | Colunas | Conteúdo |
|---|---|---|
| **A–I** | `timestamp, submission_id, completo, duracao_segundos, semente, ordem_gc, ordem_gov, ordem_dec, user_agent` | metadados |
| **J–S** | `GC01 … GC10` | Gestão do Conhecimento (escala 1–7) |
| **T–AC** | `GOV11 … GOV20` | Governança Pública (escala 1–7) |
| **AD–AS** | `DEC21 … DEC36` | Tomada de Decisão (escala 1–7) |
| **AT–BG** | `D1, D2, D2_outro, D3, D4, D4_outro, D5, D5a, D5a_outro, D6, D7, D8, D9, D9_outro` | perfil |

Opções "Outro" chegam como o texto `Outro` na coluna principal e o texto livre na
coluna `_outro` ao lado.

---

## Passo 1 — Isolar a aba `respostas` e exportar

1. Na Planilha, **apague as linhas de teste** (smoke test) da aba `respostas`.
2. Clique com o botão direito na aba `respostas` → **Copiar para → Novo arquivo**.
   (Isola as respostas; evita carregar a aba `emails` junto — bom para LGPD.)
3. No novo arquivo: **Arquivo → Fazer download → Microsoft Excel (.xlsx)**.
   Salve em pasta segura, ex.: `dados/respostas.xlsx` (já ignorada pelo git).

## Passo 2 — Importar no SPSS

1. **Arquivo → Importar dados → Excel…** → selecione `respostas.xlsx`.
2. Marque **"Ler nomes das variáveis da primeira linha"**.
3. Em "Porcentagem de valores…", deixe o padrão; confira que as colunas de escala
   vieram como **numéricas**. Se alguma escala vier como texto, veja a nota abaixo.*
4. **OK**. Salve já como `.sav` (passo 6) para não repetir a importação.

> *Se uma coluna de escala vier como string (acontece se houver célula vazia ou
> texto perdido), use **Transformar → Recodificar / ou** ajuste o tipo em
> *Visualização de Variável* para Numérico antes de seguir.

## Passo 3 — Rótulos de valor das escalas (uma vez só, replicar nas 36)

1. *Visualização de Variável* → linha do **`GC01`** → coluna **Valores** → "…".
2. Cadastre os 7 pares e **Adicionar** cada um:

   | Valor | Rótulo |
   |---|---|
   | 1 | Nunca |
   | 2 | Raramente |
   | 3 | Poucas vezes |
   | 4 | Às vezes |
   | 5 | Muitas vezes |
   | 6 | Quase sempre |
   | 7 | Sempre |

3. **OK**. Agora **copie** a célula *Valores* de `GC01` (Ctrl+C) e **cole**
   (Ctrl+V) selecionando as células *Valores* de `GC02` até `DEC36` de uma vez.
   Todas as 36 escalas herdam os mesmos rótulos.

> Os itens são todos redigidos no sentido positivo ("Promovo…", "Valorizo…",
> "Baseio decisões…"), então **não há item reverso** para inverter antes do alfa.

## Passo 4 — Nível de medida (com uma correção ao plano inicial)

A ideia original era "escalas = ordinal, D1–D9 = nominal". Quase — mas **D3, D4,
D7 e D8 não são nominais**. Ajuste recomendado (rationale na última coluna):

| Variável(is) | Medida | Por quê |
|---|---|---|
| `GC01…DEC36` | **Ordinal** | Likert de frequência. *(Para Cronbach/AFE muitos tratam como Escala; o cálculo do alfa funciona igual nos dois.)* |
| `D1` instituição | Nominal | categorias sem ordem |
| `D2` gênero | Nominal | idem |
| `D3` idade | **Escala** | número contínuo — não é categoria |
| `D4` grau de instrução | **Ordinal** | médio < graduação < especialização < mestrado < doutorado < pós-doc |
| `D5` função / `D5a` unidade | Nominal | categorias sem ordem |
| `D6` formação em gestão | Nominal | Sim/Não |
| `D7` tempo na instituição | **Ordinal** | faixas de tempo são ordenadas |
| `D8` tempo em gestão | **Ordinal** | idem |
| `D9` segmento | Nominal | categorias sem ordem |
| `duracao_segundos`, `semente` | Escala | numéricos |
| `submission_id`, `user_agent`, `timestamp`, `completo` | Nominal | metadados (fora da análise) |

Defina em *Visualização de Variável* → coluna **Medida**.

## Passo 5 — (opcional) Recodificar demográficos de texto para número

Os demográficos chegam como **texto** ("UFPA", "Doutorado"). Para frequências e
cruzamentos, string já serve. Se algum procedimento exigir numérico:

- **Nominais** (D1, D2, D5, D5a, D6, D9): *Transformar → Recodificação
  automática*. Gera códigos + rótulos automaticamente.
- **⚠️ Ordinais** (D4, D7, D8): **não** use recodificação automática — ela ordena
  alfabeticamente e embaralha a ordem real (ex.: "De 1 a 3 anos" viria antes de
  "Menos de 1 ano"). Use *Transformar → Recodificar em variáveis diferentes* e
  mapeie à mão preservando a ordem (1=Menos de 1 ano, 2=De 1 a 3…, 5=Mais de 10).

## Passo 6 — Salvar `.sav`

**Arquivo → Salvar como → SPSS Statistics (*.sav)**, ex.: `dados/respostas.sav`.
A partir daí abra sempre o `.sav` (rótulos e medidas já embutidos).

---

## Alfa de Cronbach por subescala

Para **cada** construto, separadamente:

1. **Analisar → Escala → Análise de confiabilidade**.
2. Mova os itens da subescala:
   - **GC:** `GC01`…`GC10` (10 itens)
   - **GOV:** `GOV11`…`GOV20` (10 itens)
   - **DEC:** `DEC21`…`DEC36` (16 itens)
3. Modelo: **Alfa**.
4. **Estatísticas…** → marque *Escala se item for excluído* e *Correlações
   inter-itens*. **Continuar → OK**.

Leitura rápida: α ≥ .70 aceitável, ≥ .80 bom. A coluna *Alfa se item excluído*
mostra se algum item destoante está derrubando a confiabilidade. A subescala
**DEC (16 itens)** pode ser multidimensional no seu modelo teórico; se você
trabalha com facetas internas, rode o alfa de cada faceta **além** do alfa global
dos 16 — definindo os agrupamentos pelo seu referencial (sem rotulá-los no
instrumento, conforme combinado).

---

## (Opcional) Efeito de ordem com `ordem_gc/gov/dec`

Cada respondente viu os itens de cada seção numa ordem diferente (a coluna guarda,
ex.: `GC04|GC08|GC05|…`). Para checar se a **posição** de apresentação influenciou
a resposta:

1. Para cada respondente e cada item, a **posição** é o índice do item dentro da
   string de ordem (1ª posição = 1, etc.). Ex.: se `ordem_gc` começa com `GC04`,
   então `GC04` foi mostrado em 1º na seção GC.
2. O caminho prático é **gerar colunas de posição** (`pos_GC01`…`pos_DEC36`) antes
   de importar — fazer isso direto no SPSS é trabalhoso. Dá para expandir num
   script simples (posso montar um, na pasta `tools/`, que lê a planilha exportada
   e cria as colunas de posição) ou numa coluna auxiliar no próprio Sheets.
3. Com as posições, um teste de robustez típico: correlacionar `pos_item` com o
   escore do item, ou comparar itens vistos no início vs. no fim. Em geral é só
   uma **verificação** — espera-se efeito nulo; se aparecer, vira ressalva
   metodológica.

> A coluna `semente` permite reconstruir a ordem de forma determinística
> (Mulberry32), mas como `ordem_*` já guarda a ordem explícita, você **não**
> precisa da semente para a análise — ela é só lastro de reprodutibilidade.

---

### Checklist final antes de analisar
- [ ] linhas de teste removidas
- [ ] 36 escalas numéricas com rótulos 1–7
- [ ] medidas ajustadas (D3 escala; D4/D7/D8 ordinais)
- [ ] `.sav` salvo fora do git
- [ ] α de GC, GOV e DEC calculados

---

## Abas auxiliares na Planilha (`leitura` e `painel`)

Além da `respostas` (base canônica, com as escalas em número 1–7 — **é dela que sai
o SPSS**), o `apps_script.gs` cria duas abas **por fórmula**, que se atualizam
sozinhas a cada nova resposta. Não viram segunda fonte de verdade: leem da
`respostas`.

Como criar/atualizar: na Planilha, menu **Coleta PPGAD → “Configurar aba leitura”**
e **“Configurar aba painel”** (ou rode `configurarAbaLeitura` /
`configurarAbaPainel` no editor do Apps Script). Pode rodar quantas vezes quiser —
cada execução recria a aba do zero. Não exige re-deploy do Web App.

- **`leitura`** — espelho legível: escalas 1–7 traduzidas para rótulo
  (Nunca…Sempre), `completo` como Sim/Não, duração em minutos, sem o ruído técnico
  (semente, ordem_*, user_agent). O cabeçalho traz as **perguntas na íntegra**
  (`GC01 — enunciado…`), o que duplica os textos do `index.html` nas listas
  `PERGUNTAS_ESCALA`/`PERGUNTAS_DEMO` do `apps_script.gs` — se mudar uma pergunta
  no questionário, atualize lá também. É a versão "normal" para leitura humana;
  **não** use para o SPSS (lá os números são necessários).
- **`painel`** — dashboard de contagens: KPIs (total, % completas, duração mediana)
  e frequência por IES (D1), segmento (D9), função (D5), grau (D4), gênero (D2) e
  formação em gestão (D6), via `QUERY`, com gráficos de barras. Descobre categorias
  novas (inclusive "Outro") sozinho.

> As fórmulas são gravadas em inglês/vírgula no código, mas o `setFormula()` deste
> ambiente interpreta no **locale pt-BR** da planilha; por isso o código usa `;`
> como separador. Se a planilha for recriada em locale US, troque o `SEP`/`S`
> para `,` nas funções de configuração.

### Filtros interativos (Tabela Dinâmica + Segmentadores)

Para "fatiar clicando" (ex.: IES × segmento), o nativo do Sheets:

1. Aba `respostas` → **Inserir → Tabela dinâmica** (em nova planilha ou na `painel`).
2. **Linhas → `D1`**; **Valores → `submission_id`** resumido por **CONTAR.VAL**
   (contagem). Para cruzar, ponha outra dimensão em **Colunas** (ex.: `D9`).
3. Com a tabela dinâmica selecionada: **Inserir → Segmentador** → escolha o campo
   (`D1`, `D9`, `D5`…). Cada segmentador filtra a tabela ao clicar; vários podem
   ficar ativos ao mesmo tempo.
