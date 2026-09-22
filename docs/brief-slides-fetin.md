# Brief para slides — Cemtinel na Fetin 2026

Documento para o Claude Design gerar a apresentação. Contém o conteúdo de cada
slide, o que a apresentadora fala e a direção visual.

---

## Contexto

**O que é:** Cemtinel, um aplicativo que monitora o concreto desde a usina de
concretagem até a estrutura pronta. Feito em React Native.

**Onde vai ser apresentado:** Fetin 2026, feira científica, 24 de setembro de 2026.

**Quem apresenta:** uma estudante, sozinha, com o celular na mão.

**Quem assiste:** banca com jurados de engenharia civil e de computação, mais
visitantes leigos passando pela bancada.

**Duração:** 5 minutos, 9 slides, cerca de 33 segundos por slide.

**Idioma:** português do Brasil.

---

## Regras importantes para estes slides

1. **Texto curtíssimo no slide.** No máximo uma frase por slide, mais um número
   grande quando houver. O texto longo está nas notas do apresentador, não na
   tela. Slide cheio de parágrafo faz a plateia ler em vez de ouvir.

2. **Um slide, uma ideia.** Nada de slide com três bullets que dizem coisas
   diferentes.

3. **O slide 6 é o clímax.** É onde a apresentação ganha ou perde. Dê a ele o
   tratamento visual mais forte de todos.

4. **Nada de ícone genérico de tecnologia** (engrenagem, nuvem, cadeado, gráfico
   de barras solto). O assunto é concreto e obra: o vocabulário visual vem daí.

---

## Direção visual

**Paleta** — concreto curado com acento de óxido de vergalhão:

| Papel | Claro | Escuro |
|---|---|---|
| Fundo | `#EBEEEC` | `#15181A` |
| Texto | `#14181A` | `#E7EBE9` |
| Secundário | `#5C6469` | `#99A2A7` |
| Acento (óxido) | `#9E3327` | `#E27C6A` |
| Técnico (azul de planta) | `#1F6FB2` | `#74AEE0` |
| Aprovado | `#2F6B45` | `#6FBF8E` |

O vermelho de óxido **não é decoração**: é a cor que uma área reprovada assume na
planta do prédio, que é o ponto alto da apresentação. Use com moderação nos
slides iniciais para que ele tenha peso quando aparecer no slide 6.

**Tipografia:**
- Títulos: **Archivo** (600/700) — grotesca, cara de documentação técnica
- Corpo e números grandes: **Archivo** também, peso menor
- Dados, tempos e unidades: **IBM Plex Mono**

Evitar Inter, Space Grotesk, Playfair e Montserrat.

**Formato:** 16:9. Margens generosas. Números grandes ocupando espaço de verdade,
não escondidos em cantinho.

---

## Os slides

### Slide 1 — Capa

**Na tela:**
> # Cemtinel
> Do caminhão até a estrutura

**Fala:** apresenta o nome e emenda direto no slide 2. Não gastar tempo aqui.

**Visual:** capa sóbria. Se usar imagem, um caminhão betoneira ou textura de
concreto fresco, bem discreta atrás do texto.

---

### Slide 2 — A viagem

**Na tela:**
> ## 2h30
> é o tempo que o concreto tem entre a mistura e a fôrma

**Fala:** "Um caminhão betoneira sai da usina agora, com oito metros cúbicos de
concreto e um relógio correndo. Concreto é produto perecível: depois dessa janela
ele começa a endurecer no caminho. E durante a viagem inteira, ninguém olha para
ele."

**Visual:** o número **2h30** dominando o slide, em Plex Mono. Se couber, uma
linha do tempo horizontal simples: usina → estrada → obra.

---

### Slide 3 — Duas coisas dão errado

**Na tela:** duas colunas, uma frase cada.

> **Calor**
> Perde água antes da hora
>
> **Água adicionada**
> Fica mais fácil de bombear — e mais fraco

**Fala:** "A primeira é o calor: concreto quente perde água antes da hora e fica
mais fraco do que foi projetado. A segunda é mais séria e é comum — alguém joga
água no caminhão para o concreto ficar fluido e o trabalho andar. Só que essa
água muda a proporção entre água e cimento, que é justamente o que define a
resistência. O concreto fica mais fácil de trabalhar e mais fraco ao mesmo tempo.
E os dois problemas são invisíveis: o concreto continua parecendo concreto."

**Visual:** divisão em dois. O lado da água adicionada pode carregar um toque do
acento, porque é o problema mais grave.

---

### Slide 4 — O vão de 28 dias

**Na tela:**
> ## O problema acontece no minuto 40.
> ## A resposta chega no dia 28.

**Fala:** "Existe controle: moldam-se corpos de prova e o laboratório rompe eles
para medir a resistência. Aos 28 dias. Mas o problema aconteceu no minuto
quarenta da viagem, e a resposta chega quase um mês depois — quando já tem dois
pavimentos em cima daquela laje. E vem uma pergunta pior ainda: o laudo diz que
aquela carga falhou, mas qual parte do prédio recebeu aquela carga? Na maioria
das obras, ninguém sabe responder."

**Visual:** este é o slide mais importante depois do 6. Uma linha do tempo em que
o "minuto 40" fica perto do começo e o "dia 28" lá no fim, com um vão vazio e
enorme entre os dois. O vão é o argumento — deixe ele visualmente grande.

---

### Slide 5 — Durante a viagem

**Na tela:**
> ## O app avisa agora, não em 28 dias

**Fala:** "Sensores dentro do balão da betoneira medem temperatura e umidade e
publicam em tempo real. Se a temperatura sai da faixa, o app avisa. Se a umidade
dá um salto — que é a assinatura de alguém adicionando água — o app avisa. Não
daqui a 28 dias: agora, com o caminhão ainda na estrada, enquanto ainda dá para
decidir alguma coisa. Porque monitoramento que não avisa ninguém não é
monitoramento, é só arquivo."

**Visual:** captura de tela real do app (tela de Monitoramento, com o velocímetro
de temperatura), em mockup de celular. Ao lado, um alerta destacado.

---

### Slide 6 — O Mapa de Concretagem · CLÍMAX

**Na tela:**
> ## Qual laje recebeu o concreto que falhou?

Abaixo, a planta com as áreas coloridas — e uma delas vermelha.

**Fala:** "A concreteira fotografa a planta do projeto pelo próprio aplicativo e
desenha em cima: esta laje foi o caminhão 4, esta viga foi o caminhão 7. Cada
área fica com a cor do caminhão. Vinte e oito dias depois chega o laudo, ela
digita o resultado em MPa — e a área que recebeu concreto abaixo do projeto fica
vermelha na planta. Não numa tabela, não num relatório anexo: no desenho do
prédio, no lugar exato. O engenheiro deixa de perguntar 'qual carga falhou' e
passa a ver 'esta laje falhou'."

**Visual:** o slide de maior impacto da apresentação. Mostrar a planta com
polígonos coloridos sobrepostos, um deles em vermelho de óxido, bem destacado. Se
o formato permitir animação ou dois estados, mostrar a área mudando de cor.
Menos texto possível — a imagem carrega o slide.

---

### Slide 7 — Como funciona

**Na tela:** três blocos curtos, uma linha cada.

> **React Native** — Android e iOS, mesmo código
> **MQTT** — sensores publicam em tempo real
> **Supabase** — Postgres com regra de acesso no banco

**Fala:** "O app é React Native. Os sensores publicam por MQTT, um protocolo leve
feito para dispositivo pequeno em rede instável — o app assina só os tópicos dos
caminhões daquela obra, então o filtro acontece no servidor. Cadastro, obras e
resultados ficam no Supabase, com Row-Level Security: cada obra só enxerga os
próprios dados, e essa regra vale no banco, não no aplicativo. Se alguém burlar o
app, o banco continua recusando."

**Visual:** diagrama simples do fluxo — sensor → broker MQTT → app → banco. Linha
fina, sem sombra nem gradiente. Estilo desenho técnico, no azul de planta.

---

### Slide 8 — Limites e próximo passo

**Na tela:**
> ## O app não substitui o ensaio. Ele diz onde olhar.

**Fala:** "Sendo honesta sobre os limites: o sensor de umidade é de solo, não é
certificado para concreto — ele detecta variação, não mede a relação água/cimento
em número. E o protótipo tem um sensor e um caminhão. O próximo passo é
encapsular o sensor para o ambiente do balão, que é abrasivo, e calibrar contra
adições de água medidas."

**Visual:** slide sóbrio, quase só tipografia. Assumir limitação com calma
transmite domínio; não decorar.

---

### Slide 9 — Fechamento

**Na tela:**
> ## Concreto não dá para desfazer.
> Cemtinel

**Fala:** "O concreto de um prédio é a coisa mais definitiva que existe numa
obra: depois que cura, não dá para desfazer. Hoje ele viaja sem ninguém olhando e
a informação chega tarde demais para virar decisão. O Cemtinel não inventa um
ensaio novo — ele pega a informação que já existe e entrega na hora certa e no
lugar certo, enquanto ainda dá para fazer alguma coisa a respeito. Obrigada."

**Visual:** volta ao tratamento da capa, fechando o círculo.

---

## Números que aparecem na apresentação

| Valor | O que é |
|---|---|
| **2h30** | janela entre a mistura e a descarga (NBR 7212) |
| **28 dias** | idade de referência do ensaio de ruptura |
| **25 MPa** | fck comum em estrutura residencial |
| **15–30 °C** | faixa ideal configurada no app; acima de 35 °C é crítica |

---

## Glossário, caso o gerador precise

- **Concreteira / usina:** empresa que produz o concreto e entrega na obra
- **fck:** resistência característica que o concreto precisa atingir, em MPa
- **MPa (megapascal):** unidade de resistência à compressão
- **Corpo de prova:** cilindro de concreto moldado na entrega e rompido no
  laboratório para medir a resistência
- **Balão:** o tambor giratório do caminhão betoneira
- **Relação água/cimento:** proporção que define a resistência final; mais água,
  menos resistência
