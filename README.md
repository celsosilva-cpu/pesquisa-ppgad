# Pesquisa PPGAD/UFPA — Coleta

Infraestrutura de coleta da dissertação de **Celso Cardoso Silva** (PPGAD/UFPA):
relação entre **Gestão do Conhecimento**, **Governança Pública** e **Tomada de
Decisão** em IFES do Pará (UNIFESSPA, UFOPA, UFPA). Público: gestores (direção,
chefia, coordenação).

## Conteúdo

| Arquivo | O que é |
|---|---|
| `pesquisa_prototipo.html` | Questionário (single-file, sem dependências). É o que vai ao ar. |
| `apps_script.gs` | Back-end Google Apps Script: recebe submissões/e-mails e grava na Planilha. |
| `instalacao.md` | Como conectar HTML ↔ Apps Script ↔ Planilha (7 passos). |
| `exportar_para_spss.md` | Da Planilha ao `.sav`: rótulos, medida, alfa de Cronbach. |
| `protocolo_preteste.md` | Roteiro de pré-teste cronometrado (3–5 gestores). |
| `tools/valida_payload.js` | Teste local do payload do questionário (Node). |

## Fluxo de dados

```
Respondente → pesquisa_prototipo.html → (POST text/plain) → Apps Script → Planilha Google
                                                                              ├─ aba "respostas" (dados, anônimos)
                                                                              └─ aba "emails" (opcional, SEM vínculo)
```

## Privacidade

Dados de respondentes **nunca** entram no git (ver `.gitignore`). A análise é
agregada; a aba de e-mails não tem vínculo com as respostas. Base ética:
CNS 510/2016 + LGPD; guarda dos dados por 5 anos.
