# 🛡️ Reino Defensor — Tower Defense

Jogo de tower defense no estilo Bloons, feito em JavaScript puro (HTML5 Canvas), sem dependências.

## ▶️ Como jogar

1. Abra o arquivo **`index.html`** no navegador (duplo clique).
2. O mapa já aparece antes de começar — clique numa torre na lista da direita.
3. Passe o mouse no mapa: um quadrado **verde** indica que pode construir, **vermelho** indica local inválido (caminho, decoração ou outra torre).
4. Clique para construir. Clique numa torre já construída para **melhorar** ou **vender**.
5. Clique em **"Iniciar Onda"** quando estiver pronto.

### Controles

| Ação | Como |
|---|---|
| Selecionar torre | Clique no card da torre (ou teclas `1`–`4`) |
| Construir | Clique numa célula livre do mapa |
| Melhorar / vender | Clique numa torre construída |
| Cancelar seleção | `ESC` ou botão direito |
| Iniciar onda | Botão "Iniciar Onda" ou `Espaço` |
| Pausar | Botão ⏸ |
| Velocidade 1x/2x | Botão de velocidade |
| Reiniciar | Botão ↺ |

## 🏰 Torres

| Torre | Custo | Função |
|---|---|---|
| 🏹 Arqueiro | $70 | Rápido, atinge um alvo por vez |
| 💣 Canhão | $130 | Dano em área, cadência lenta |
| ❄️ Gelo | $110 | Dano em área + desacelera inimigos |
| ⚡ Tesla | $200 | Raio em cadeia, atinge até 3 inimigos |

Cada torre pode ser melhorada até o **nível 4**. Cada nível aumenta dano, alcance e cadência (e alguns efeitos especiais).

## 👾 Inimigos

| Inimigo | Característica |
|---|---|
| 🟢 Slime | Padrão |
| 🟡 Veloz | Rápido e frágil |
| 🟣 Tanque | Muito HP, lento |
| 🔴 Chefe | Aparece a cada 5 ondas, enorme e resistente |

Os inimigos ficam mais fortes a cada onda. São **20 ondas** no total.

## ⚙️ Regras

- Você começa com **$350** e **20 vidas**.
- Matar inimigos dá dinheiro e pontos.
- Completar uma onda rende um bônus em dinheiro.
- Se um inimigo chegar ao portão, você perde 1 vida.
- Sem vidas = fim de jogo. Complete as 20 ondas para vencer.

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
- Novos mapas e caminhos
- Save/load do progresso

É só pedir a próxima melhoria!
