# Pesquisa PPGAD/UFPA — Coleta

Infraestrutura de coleta da dissertação de **Celso Cardoso Silva** (PPGAD/UFPA):
relação entre **Gestão do Conhecimento**, **Governança Pública** e **Tomada de
Decisão** em IFES do Pará (UNIFESSPA, UFOPA, UFPA). Público: gestores (direção,
chefia, coordenação).

## Conteúdo

| Arquivo | O que é |
|---|---|
| `index.html` | Questionário (single-file, sem dependências). É o que vai ao ar (GitHub Pages). |
| `apps_script.gs` | Back-end Google Apps Script: recebe submissões/e-mails e grava na Planilha. |
| `instalacao.md` | Como conectar HTML ↔ Apps Script ↔ Planilha (7 passos). |
| `exportar_para_spss.md` | Da Planilha ao `.sav`: rótulos, medida, alfa de Cronbach. |
| `protocolo_preteste.md` | Roteiro de pré-teste cronometrado (3–5 gestores). |
| `tools/valida_payload.js` | Teste local do payload do questionário (Node). |

## Fluxo de dados

```
Respondente → index.html → (POST text/plain) → Apps Script → Planilha Google
                                                                              ├─ aba "respostas" (dados, anônimos)
                                                                              └─ aba "emails" (opcional, SEM vínculo)
```

## Links de distribuição (por IES)

O questionário aceita o parâmetro `?ies=` na URL: ele pré-seleciona a instituição
(D1) e **oculta** essa pergunta, amarrando o link a uma IES. Sem o parâmetro (ou
com valor inválido), o questionário funciona normalmente e D1 aparece.

- `…/pesquisa-ppgad/?ies=UNIFESSPA`
- `…/pesquisa-ppgad/?ies=UFOPA`
- `…/pesquisa-ppgad/?ies=UFPA`

## Privacidade

Dados de respondentes **nunca** entram no git (ver `.gitignore`). A análise é
agregada; a aba de e-mails não tem vínculo com as respostas. Base ética:
CNS 510/2016 + LGPD; guarda dos dados por 5 anos.
