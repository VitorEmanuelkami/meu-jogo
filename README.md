# 🛡️ Kennedy Defenders — Tower Defense

Jogo de tower defense, feito em JavaScript puro (HTML5 Canvas), sem dependências.

## 🗺️ Menu de fases

Ao abrir o jogo aparece o menu **Kennedy Defenders** com 5 fases. A primeira já começa liberada; as outras são desbloqueadas ao concluir a anterior.

| # | Fase | Ondas | Torres | Limite de torres | Inimigos novos |
|---|---|---|---|---|---|
| 1 | Vale Verde | 10 | 3 básicas | 8 | Slime, Veloz, Tanque |
| 2 | Floresta Sombria | 15 | + Fogo e Gelo | 10 | Enxame, Blindado, Regenerador |
| 3 | Deserto Escaldante | 18 | + Elétrica e Veneno | 12 | Divisor, Comandante |
| 4 | Pântano Venenoso | 20 | + Suporte e Necromante | 14 | Fantasma |
| 5 | Fortaleza Kennedy | 25 | Todas (10) | 16 | Todos + Rei |

Cada fase tem seu próprio número de ondas, dinheiro inicial, vidas e limite de torres. Ao vencer, a próxima fase é desbloqueada e o progresso é salvo no navegador (localStorage). O botão **Próxima fase ▶** na tela de vitória já inicia a fase seguinte.

### 🎨 Aparência de cada fase

| Fase | Cenário |
|---|---|
| Vale Verde | Campo verde com árvores, arbustos e flores coloridas |
| Floresta Sombria | Mata escura com pinheiros, névoa e cogumelos brilhantes |
| Deserto Escaldante | Areia, dunas, cactos, arbustos secos e rochas de arenito |
| Pântano Venenoso | Lama, poças d'água, árvores mortas, juncos e esporos verdes |
| Fortaleza Kennedy | Piso de lajes, colunas com braseiros, barris e brasas flutuantes |

## ▶️ Como jogar

1. Abra o arquivo **`index.html`** no navegador (duplo clique).
2. Escolha a fase **Vale Verde** no menu.
3. O mapa já aparece antes de começar — clique numa torre na lista da direita.
4. Passe o mouse no mapa: um quadrado **verde** indica que pode construir, **vermelho** indica local inválido (caminho, decoração ou outra torre).
5. Clique para construir. Clique numa torre já construída para **melhorar** ou **vender**.
6. Clique em **"Iniciar Onda"** quando estiver pronto.

O HUD mostra **🏰 torres construídas / limite da fase**. Ao atingir o limite, venda uma torre ou melhore as existentes para liberar espaço.

### Controles

| Ação | Como |
|---|---|
| Selecionar torre | Clique no card da torre (ou teclas `1`–`0`; só funciona com a torre liberada na fase) |
| Construir | Clique numa célula livre do mapa |
| Melhorar / vender | Clique numa torre construída |
| Cancelar seleção | `ESC` ou botão direito |
| Iniciar onda | Botão "Iniciar Onda" ou `Espaço` |
| Pausar | Botão ⏸ |
| Velocidade 1x/2x | Botão de velocidade |
| Reiniciar | Botão ↺ |
| Voltar ao menu | Botão ☰ |

## 🏰 Torres

### Torres básicas

| Torre | Custo | Tecla | Fase | Função | Evolução (até Nv. 4) |
|---|---|---|---|---|---|
| 🏹 Arqueiro | $70 | `1` | 1 | Ataque rápido, dano moderado, alvo único | Flechas múltiplas: dispara em vários inimigos |
| 💣 Canhão | $130 | `2` | 1 | Ataque lento, explosões em área | Explosões maiores e mais dano por área |
| 🎯 Precisão | $180 | `3` | 1 | Alcance enorme e dano altíssimo, disparo lento | Dano crítico (chance e multiplicador crescem) |

### Torres elementais

| Torre | Custo | Tecla | Fase | Função | Evolução (até Nv. 4) |
|---|---|---|---|---|---|
| 🔥 Fogo | $100 | `4` | 2 | Área pequena + queimadura (dano ao longo do tempo) | Queimadura mais forte e duradoura, área maior |
| ❄️ Gelo | $110 | `5` | 2 | Área + lentidão, chance de congelar | Congelamento mais frequente, mais lentidão e duração |
| ⚡ Elétrica | $200 | `6` | 3 | Raios saltam entre inimigos (dano em cadeia) | Mais saltos, dano maior e chance de paralisia |
| ☠️ Veneno | $120 | `7` | 3 | Veneno contínuo + aumenta o dano recebido | Veneno mais forte e maior vulnerabilidade |

### Torres estratégicas e especiais

| Torre | Custo | Tecla | Fase | Função | Evolução (até Nv. 4) |
|---|---|---|---|---|---|
| 🛡️ Suporte | $160 | `8` | 4 | Não causa dano; fortalece dano, alcance e cadência das torres próximas | Bônus maiores e área de efeito ampliada |
| 💀 Necromante | $190 | `9` | 4 | Invoca esqueletos que bloqueiam e atacam inimigos; amaldiçoa (aumenta dano recebido). Recarga de 30s, que diminui a cada nível | Mais esqueletos, mais vida/dano e recarga reduzida (30s → 15s) |
| ⏳ Temporal | $170 | `0` | 5 | Lentidão em área e aceleração das torres próximas | Campo maior, lentidão e aceleração mais fortes |

Cada torre pode ser melhorada até o **nível 4**. Os níveis aumentam dano, alcance e cadência, além dos efeitos especiais de cada tipo (queimadura, veneno, congelamento, cadeia, invocações, auras etc.). As teclas seguem a ordem global (`1`–`0`), mas só funcionam para torres já liberadas na fase atual.

## 👾 Inimigos

| Inimigo | Fase | Característica |
|---|---|---|
| 🟢 Slime | 1 | Padrão |
| 🟡 Veloz | 1 | Rápido e frágil |
| 🟣 Tanque | 1 | Muito HP, lento |
| 🔺 Enxame | 2 | Minúsculos e velocíssimos; aparecem em grupos |
| 🛡️ Blindado | 2 | Armadura que reduz o dano de cada golpe direto (fogo/veneno ignoram) |
| 💚 Regenerador | 2 | Recupera HP continuamente enquanto está vivo |
| 🟪 Divisor | 3 | Ao morrer, se divide em dois filhotes |
| 🟠 Comandante | 3 | Acelera os inimigos próximos com sua aura |
| 👻 Fantasma | 4 | Flutua (ignora esqueletos) e é imune a lentidão, congelamento, veneno e queimadura |
| 🔴 Chefe | 1+ | Chefe comum, enorme, resistente e com armadura |
| 🦖 Senhor da Guerra | 2+ | Chefe mais forte, com chifres, armadura e regeneração; aparece na onda 10 e nas finais das fases 3–4 |
| 👑 Rei | 4+ | Chefe final: muito HP, armadura alta, regeneração e escolta de dois chefes |

Os inimigos ficam mais fortes a cada onda: **+20% de HP** e **+1,4% de velocidade** por onda (acumulativo). Além disso, cada fase aplica um multiplicador extra de HP (**1,15× na fase 2**, **1,3× na 3**, **1,5× na 4** e **1,7× na 5**). Os tipos novos aparecem gradualmente dentro de cada fase (enxames na onda 4, blindados na 5, regeneradores na 6, divisores na 7, comandantes na 8 e fantasmas na 9).

## ⚙️ Regras

- Cada fase tem seu **dinheiro inicial** e suas **vidas** (fase 1: $300 e 20 vidas).
- Você pode construir apenas até o **limite de torres da fase** (8 na fase 1, até 16 na fase 5).
- Matar inimigos dá dinheiro e pontos, mas os valores foram reduzidos — cada onda rende também um bônus menor.
- Se um inimigo chegar ao portão, você perde 1 vida.
- Sem vidas = fim de jogo. Complete todas as ondas da fase para vencer e desbloquear a próxima.
- O progresso de fases desbloqueadas fica salvo no navegador.

## 📁 Estrutura do projeto

```
meu-jogo/
├── index.html   → interface (HUD, painel de torres, controles)
├── styles.css   → visual da interface
├── game.js      → todo o jogo (mapa, torres, inimigos, ondas, efeitos)
└── README.md
```

O `game.js` é dividido internamente em:
- configuração de torres/inimigos e caminho;
- geração do mapa e fundo desenhado no canvas;
- desenho de torres, inimigos, projéteis, partículas e efeitos;
- regras (dano, alcance, ondas, economia);
- interface e loop principal.

## 🚀 Próximos passos possíveis

- Torres com modos de mira (mais próximo / mais forte / primeiro)
- Habilidades ativas (bombas, congelar tudo, etc.)
- Power-ups e itens entre ondas
- Modo infinito com ranking
- Efeitos sonoros
- Mapas e caminhos diferentes por fase
- Tela para resetar o progresso salvo

É só pedir a próxima melhoria!
