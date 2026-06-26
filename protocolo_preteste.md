# Protocolo de pré-teste — questionário PPGAD/UFPA

Objetivo: antes de ir a campo, confirmar que o instrumento é **claro**, que o
**tempo real** bate com o anunciado e que o **envio funciona** ponta a ponta.

## Quem e como
- **3 a 5 gestores** do perfil-alvo (direção/chefia/coordenação). Se possível,
  pessoas que **não** estarão na amostra final — pré-teste não vira dado.
- Cada um responde **sozinho**, no próprio dispositivo (misture **1 celular** e
  **1 desktop** no grupo — o layout muda).
- Peça para **pensar em voz alta** enquanto responde (o que está entendendo, onde
  hesita). Você observa e anota; **não** ajude nem explique itens — a dúvida é dado.

## Antes de começar
- Rode o pré-teste **depois** do deploy (Fase D) e **antes** de divulgar.
- As respostas do pré-teste caem na planilha → **apague-as** antes do campo
  (ou use uma planilha/implantação de teste separada).
- Tenha cronômetro e a tabela de anotação (abaixo) aberta.

## Durante — o que observar
- **Travas e releituras:** em quais itens a pessoa para, relê, franze a testa.
- **Ambiguidade:** itens que ela interpreta diferente do pretendido.
- **Termos:** alguma palavra técnica/jargão que não entendeu.
- **Escala 1–7:** hesitou entre pontos? Achou pontos demais/de menos?
- **Definições (ⓘ) e transições:** olhou? ajudaram ou passaram batido?
- **Técnico:** algo travou, botão que não respondeu, erro no envio, layout
  quebrado no celular.

## Cronometragem
- Marque do clique **"Começar"** até o **envio**. Anote o tempo de cada um.
- O sistema também grava `duracao_segundos` — compare com seu cronômetro
  (deve bater; se divergir muito, investigue).

## Depois — perguntas (retrospectiva, ~3 min)
1. Algum item ficou **confuso ou ambíguo**? Qual e por quê?
2. Algum **termo** que você não entendeu?
3. A **escala** fez sentido? Faltou ou sobrou ponto?
4. No **perfil**, faltou alguma opção que se aplicasse a você?
5. O **tempo** pareceu adequado, longo ou curto?
6. **Travou** ou pareceu quebrado em algum momento?
7. Respondendo de forma **anônima**, você se sentiu à vontade para ser sincero?

## Tabela de anotação (uma linha por pessoa)

| # | Disp. | Tempo real | `duracao` grav. | Itens c/ trava | Sugestões/dúvidas | Falha técnica? |
|---|-------|-----------|-----------------|----------------|-------------------|----------------|
| 1 |       |           |                 |                |                   |                |
| 2 |       |           |                 |                |                   |                |
| 3 |       |           |                 |                |                   |                |

## Como decidir os ajustes
- **Redação de item:** se **≥ 2 pessoas** travaram ou interpretaram o mesmo item
  de forma divergente → revisar a frase. Trava de uma só → anotar e observar.
- **Falha técnica:** qualquer uma → corrigir **antes** do campo (bloqueante).
- **Tempo anunciado ("7 a 10 minutos"):** calcule a **mediana** e o **maior**
  tempo. Regra prática:
  - se a mediana cair **dentro** de 7–10 e o máximo não passar muito de 10 →
    mantenha;
  - se a mediana ou o máximo **estourarem** → reajuste o texto para uma faixa que
    contenha a mediana e chegue perto do tempo mais alto, **arredondando para
    cima**. (Subestimar o tempo aumenta o abandono; melhor prometer um pouco mais.)
  - Ex.: tempos 6, 8, 9, 12, 14 → mediana 9, máx 14 → anuncie algo como
    **"cerca de 10–12 minutos"**.

> Registre as conclusões (itens revisados, novo tempo, correções técnicas) num
> commit — fica o histórico da decisão antes do campo.
