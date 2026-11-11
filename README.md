# 🛡️ Kennedy Defenders — Tower Defense

Jogo de tower defense, feito em JavaScript puro (HTML5 Canvas), sem dependências.

## 🎬 Cutscene de abertura

Ao clicar em **▶ JOGAR**, o jogo exibe uma introdução animada em canvas:

1. Uma **nave alienígena** atravessa o céu noturno e para diante do **Colégio Kennedy**.
2. Ela solta um **cristal brilhante**, que cai, **se estilhaça no chão** e abre um **portal gigante**.
3. **Criaturas** começam a sair do portal e marcham em direção ao colégio.
4. **Kennedito**, o guardião do colégio, aparece em uma caixa de diálogo com falas sobre **defender o Colégio Kennedy** (é só clicar em **Continuar ▸**).
5. Ao terminar (ou clicar em **Pular ▸**), a seleção de fases abre normalmente. `ESC` também pula a cena.

A cena tem céu noturno com **nebulosas, estrelas piscando, estrela cadente e lua detalhada**, colinas com árvores, pátio com **cerca, postes de luz, trilha de pedras e vaga-lumes**, colégio com **torre do relógio, janelas acesas, bandeira e escadaria**, nave com **propulsores, antena e feixe de partículas**, cristal facetado com rastro luminoso e um **portal com vórtice, raios e rachaduras no chão**.

O colégio é o lugar que você protege em todas as fases: se as criaturas chegarem ao portão, você perde vidas.

## 🗺️ Menu principal

Ao abrir o jogo aparece uma **tela inicial de verdade**, no estilo dos jogos clássicos: emblema do escudo com anéis girando, título **KENNEDY DEFENDERS**, fundo animado com orbs coloridos e ícones flutuando, além do resumo de progresso (fase disponível / fases concluídas).

| Botão | Ação |
|---|---|
| ▶ JOGAR | Toca a **cutscene de abertura** e depois abre a **seleção de fases** |
| 📖 COMO JOGAR | Modal com as regras rápidas |
| ⭐ CRÉDITOS | Modal com informações do jogo |

Na **seleção de fases**, o botão **← VOLTAR** retorna à tela inicial, o contador **X / 5** mostra o progresso e cada card exibe uma **miniatura do mapa e do tema da fase**, as ondas, o limite de torres, os tipos de torre liberados e o status (disponível, concluída ou bloqueada). A primeira fase já começa liberada; as outras são desbloqueadas ao concluir a anterior. Os modais fecham pelo `✕`, pelo botão interno ou pela tecla `ESC`.

| # | Fase | Ondas | Torres | Limite de torres | Inimigos novos |
|---|---|---|---|---|---|
| 1 | Vale Verde | 10 | 3 básicas | 8 | Slime, Veloz, Tanque |
| 2 | Floresta Sombria | 15 | + Fogo e Gelo | 10 | Enxame, Blindado, Regenerador |
| 3 | Deserto Escaldante | 18 | + Elétrica e Veneno | 12 | Divisor, Comandante |
| 4 | Pântano Venenoso | 20 | + Suporte e Necromante | 14 | Fantasma |
| 5 | Fortaleza Kennedy | 25 | Todas (10) | 18 | Todos + Rei |

Cada fase tem seu próprio número de ondas, dinheiro inicial, vidas, limite de torres e **traçado de caminho**. Ao vencer, a próxima fase é desbloqueada e o progresso é salvo no navegador (localStorage). O botão **Próxima fase ▶** na tela de vitória já inicia a fase seguinte.

### 🎨 Aparência e traçado de cada fase

| Fase | Cenário | Caminho |
|---|---|---|
| Vale Verde | Campo verde com árvores, arbustos e flores coloridas | Zigue-zague suave com curvas |
| Floresta Sombria | Mata escura com pinheiros, névoa e cogumelos brilhantes | Grande "S" sinuoso |
| Deserto Escaldante | Areia, dunas, cactos, arbustos secos e rochas de arenito | Diagonais cortantes em zigue-zague |
| Pântano Venenoso | Lama, poças d'água, árvores mortas, juncos e esporos verdes | Serpentina com muitas voltas |
| Fortaleza Kennedy | Piso de lajes, colunas com braseiros, barris e brasas flutuantes | Grande serpente final |

O mapa é reconstruído ao iniciar cada fase: o caminho, as áreas bloqueadas e as decorações são recalculados para o novo traçado. O portal de entrada e o portão de saída acompanham o início e o fim de cada caminho, com brilho pulsante.

Cada cenário também tem **vida animada**: pólen e borboletas no Vale Verde, névoa e vaga-lumes na Floresta, sol/poeira/ondas de calor no Deserto, bolhas e esporos no Pântano e brasas/braseiros tremulando na Fortaleza.

## ▶️ Como jogar

1. Abra o arquivo **`index.html`** no navegador (duplo clique).
2. Clique em **▶ JOGAR** e escolha a fase **Vale Verde** no menu.
3. O mapa já aparece antes de começar — clique numa torre na lista da direita.
4. Passe o mouse no mapa: um quadrado **verde** indica que pode construir, **vermelho** indica local inválido (caminho, decoração ou outra torre).
5. Clique para construir. Clique numa torre já construída para **melhorar** ou **vender**.
6. Clique em **"Iniciar Onda"** quando estiver pronto.

O HUD mostra **🏰 torres construídas / limite da fase**, além de dinheiro, vidas, onda e pontos. Ele é **tematizado por fase** (a cor de destaque muda em cada cenário), tem visual vibrante com brilhos animados, alerta pulsante quando as vidas ficam baixas e traz uma **barra de progresso** que avança conforme as ondas são concluídas. Ao atingir o limite de torres, venda uma torre ou melhore as existentes para liberar espaço.

### ⏭ Pular onda e velocidade

Durante uma onda, o botão **⏭ Pular** (ou a tecla `S`) encerra a onda na hora e **paga o bônus da onda imediatamente**, mas todos os inimigos que ainda não nasceram entram **junto com a próxima onda** — os que já estão no mapa continuam. A próxima começa na hora, acumulando as duas composições. O botão fica desabilitado na última onda.

O botão de velocidade alterna entre **1x → 2x → 3x → 5x → 1x**, acelerando todo o jogo (inclusive a simulação das ondas). A velocidade volta para 1x ao reiniciar a fase.

O botão **AUTO** inicia automaticamente a próxima onda após 2,5 segundos, para manter o ritmo sem precisar clicar a cada round.

### Controles

| Ação | Como |
|---|---|
| Selecionar torre | Clique no card da torre (ou teclas `1`–`0`; só funciona com a torre liberada na fase) |
| Construir | Clique numa célula livre do mapa |
| Melhorar / vender | Clique numa torre construída |
| Cancelar seleção | `ESC` ou botão direito |
| Iniciar onda | Botão "Iniciar Onda" ou `Espaço` |
| Pausar | Botão ⏸ |
| Pular onda | Botão ⏭ Pular ou tecla `S` |
| Velocidade 1x/2x/3x/5x | Botão de velocidade |
| Auto-iniciar ondas | Botão AUTO (liga/desliga) |
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
| 👑 Rei | 4+ | Chefe final: muito HP, armadura alta e regeneração; na fase 4 vem com **1 chefe de escolta**, na fase 5 com **2** |

Os inimigos comuns ficam mais fortes a cada onda: **+30% de HP** e **+2% de velocidade** por onda (acumulativo). Os **chefes crescem mais devagar (+22% de HP por onda)** para não virarem sacos de vida no fim das fases. Além disso, cada fase aplica um multiplicador extra de HP (**1,12× na fase 1**, **1,3× na 2**, **1,5× na 3**, **1,75× na 4** e **2,0× na 5**).

A **regeneração** (Regenerador, Senhor da Guerra e Rei) agora só funciona **fora de combate**: cada golpe recebido pausa a cura por 1,4s (chefes comuns), 1,8s (Senhor da Guerra) ou 2,2s (Rei). A cruz verde no inimigo só brilha quando ele está realmente se curando. Os tipos novos aparecem gradualmente dentro de cada fase (enxames na onda 4, blindados na 5, regeneradores na 6, divisores na 7, comandantes na 8 e fantasmas na 9).

## ⚙️ Regras

- Cada fase tem seu **dinheiro inicial** e suas **vidas** (fase 1: $270 e 16 vidas; a fase 5 começa com $400 e 14 vidas).
- Você pode construir apenas até o **limite de torres da fase** (8 na fase 1, até 18 na fase 5).
- Matar inimigos rende **pouco dinheiro** (e pontos); o grosso da economia vem do **bônus de fim de onda**, que é maior.
- Pular uma onda paga esse bônus na hora, mas os inimigos restantes entram junto com a próxima (as ondas se acumulam).
- Se um inimigo chegar ao portão, você perde 1 vida.
- A dificuldade geral é elevada: inimigos mais resistentes/rápidos, ondas mais cheias e vidas mais escassas. A fase 5 foi suavizada (mais dinheiro, 14 vidas, 18 torres e multiplicador de HP 1,8×) para dar mais margem na batalha final.
- O bônus de fim de onda é calculado como **$25 + $13 × número da onda** (cresce mais rápido a cada round).
- Sem vidas = fim de jogo. Complete todas as ondas da fase para vencer e desbloquear a próxima.
- O progresso de fases desbloqueadas fica salvo no navegador.
