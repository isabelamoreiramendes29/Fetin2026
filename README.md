# Cemtinel

Monitoramento do concreto da usina até a laje — sensores no caminhão, aplicativo
no celular de quem recebe.

Projeto apresentado na **Fetin 2026**, no Inatel.
Isabela Moreira Mendes · João Gabriel Marcelino Gonçalves · Laura Ribeiro Sêda

---

## O problema

O concreto é um dos maiores gastos de uma obra, e no caminho da fábrica até o
canteiro ninguém o acompanha. Ele esquenta, chega mais duro do que foi pedido, e
alguém joga água para conseguir despejar — o que o deixa mais fraco. Tudo
invisível, porque concreto continua parecendo concreto.

A única conferência que existe é o ensaio de ruptura, aos **28 dias**. Quando o
resultado vem abaixo do projeto, chega tarde e não responde a pergunta que
importa: **qual pedaço da obra recebeu aquela carga?**

## O que o sistema faz

Quatro medidas, em tempo real, durante a viagem:

| Medida | Para quê |
|---|---|
| **Temperatura** | concreto quente perde resistência; o app avisa se sai da faixa |
| **Água da mistura** | detecta variação brusca — assinatura de água adicionada |
| **Volume** | compara pedido, pago e entregue, lado a lado |
| **Posição** | onde o caminhão está |

E o diferencial: o **Mapa de Concretagem**. Você fotografa a planta do pavimento
pelo próprio aplicativo e marca qual área recebeu cada caminhão. Vinte e oito
dias depois lança o resultado do laboratório, e a área que ficou abaixo do
projeto **fica vermelha na planta**.

O nome não é invenção: o mapa de concretagem é um documento que a investigação
técnica já exige quando o concreto reprova — e que quase nunca existe.

## Dois perfis

| | Construtora | Mestre de obra |
|---|---|---|
| Cadastrar obra | — | ✅ |
| Despachar caminhão | ✅ | — |
| Marcar a planta e lançar o laudo | ✅ | consulta |
| Simular no mapa | ✅ | — |
| Ver temperatura, umidade, histórico | ✅ | ✅ |

O perfil vem do cadastro da conta, não do botão escolhido no login.

---

## Estado do projeto

**Parado desde setembro de 2026**, depois da Fetin. Funcionava de ponta a ponta:
sensores publicando, aplicativo recebendo, planta marcada, laudo lançado.

Antes de mexer de novo, leia a seção **Armadilhas** mais abaixo. Ela custou caro
para ser escrita.

---

## Como rodar do zero

### 1 · O aplicativo

```bash
npm install
npx expo start
```

### 2 · O Expo Go CERTO — leia antes de instalar

O projeto é **SDK 54**. O Expo Go da Play Store é sempre o mais novo e **não
funciona** — dá erro de incompatibilidade.

Baixe o APK da versão certa em **https://expo.dev/go**, escolhendo SDK 54 e
Android. Desinstale o da loja antes.

No iPhone não há solução: a Apple não permite instalar versão anterior de um
aplicativo, e a Expo não distribui o IPA antigo.

### 3 · O Supabase

Crie um projeto, copie a URL e a chave **anon** para `src/config/supabaseConfig.js`,
e rode os arquivos de `supabase/` no SQL Editor **nesta ordem**:

```
schema_obras.sql                 ← a base; quase tudo se liga a obras
schema.sql                       ← leituras de temperatura
schema_temperatura_caminhao.sql  ← acrescenta a coluna caminhao
schema_caminhoes.sql             ← precisa de obras
schema_volume.sql
schema_volume_base.sql           ← precisa de volume
schema_viagem_concluida.sql
schema_frota.sql
schema_alertas.sql               ← precisa de obras
schema_planta.sql                ← Mapa de Concretagem + bucket de imagens
schema_financeiro.sql
schema_gps.sql
schema_rastreamento.sql
schema_umidade.sql
```

Opcionais:

- `seed.sql` — dados iniciais
- `seed_historico_demonstracao.sql` — histórico de temperatura para demonstração
- `limpar_para_demonstracao.sql` — apaga tudo e recomeça (**não tem desfazer**)

### 4 · O MQTT

Broker **Mosquitto na rede local**, porta **9001**, por **WebSocket** — o React
Native não abre TCP puro, então a porta 1883 não serve para o aplicativo. O ESP
publica em 1883 normalmente.

Os tópicos estão em [`docs/topicos-mqtt.md`](docs/topicos-mqtt.md). É o contrato
entre sensor e aplicativo: mudou lá, muda no app.

O endereço do broker é **editável dentro do aplicativo**, na tela de
Monitoramento. Foi feito assim porque o IP da rede local muda a cada lugar, e um
APK instalado não tem código para editar.

### 5 · O hardware

```
hardware/gps-esp8266/         firmware do módulo GPS (SoftwareSerial)
hardware/gps-esp8266-uart/    mesma coisa pela UART de hardware
hardware/cemtinel-pecas.scad  maquete do caminhão para impressão 3D
```

O `.scad` abre no OpenSCAD. A peça a gerar é escolhida pela variável `parte`.

---

## Mapa do repositório

```
src/
  screens/       18 telas
  components/    velocímetro, planta interativa, mapa da rota, gráfico
  services/      supabase, mqtt, historico, planta, umidade, caminhoes, geo…
  config/        temperatura (as faixas), deposito (origem da rota), supabase
  context/       obras e caminhões, compartilhados entre telas

supabase/        um arquivo .sql por assunto
hardware/        firmware e a maquete 3D
docs/            material da apresentação
```

### Em `docs/`

| Arquivo | O que é |
|---|---|
| `topicos-mqtt.md` | **o contrato sensor ↔ app** |
| `esquematico.*` | como o sistema funciona, em 6 passos |
| `bancada.*` | como montar a demonstração |
| `planta-demonstracao.*` | planta em A4 para imprimir e fotografar |
| `slide-fetin.*` | o slide da apresentação (HTML gera PDF e PNG) |
| `demonstracao-cemtinel.gif` | animação do caminhão |
| `cemtinel-demonstracao*.mp4` | vídeo da bancada ao lado da animação |
| `brief-slides-fetin.md` | **desatualizado** — descreve um pitch de agosto que não existe mais |

---

## Armadilhas

Cada uma destas custou horas. Todas têm sintoma silencioso.

### O Expo Go da loja não serve

Já dito acima, mas repetido porque é o primeiro tropeço de quem clona o projeto.
SDK 54, APK em expo.dev/go.

### O Supabase pausa sozinho

Projeto gratuito hiberna depois de cerca de uma semana sem uso, e acordar leva
minutos. Quando isso acontece, **o login trava e nada mais funciona** — obras,
planta, histórico, tudo junto.

Se algum dia o login não entrar, **cheque isso primeiro**. Quase sempre é isso.

### MQTT não precisa de internet. Supabase precisa

Distinção que confunde na hora errada:

- **Sensores (MQTT)** → rede local basta. Um celular como roteador, mesmo sem
  crédito, funciona.
- **Login, obras, planta, laudo (Supabase)** → precisa de internet, uma vez.

Fazendo o login antes, dá para trocar de rede que a sessão continua.

### `geocodeAsync` exige permissão de localização no Android

Mesmo só traduzindo endereço em coordenada, sem querer saber onde o usuário
está. Sem a permissão a chamada falha, a rota fica nula, e **a tela de
Localização não desenha mapa nenhum** — some inteira, sem erro visível.

Resolvido em `src/services/geo.js`, que pede a permissão antes de geocodificar.

### `onPress` em elemento SVG não funciona no Android

Com a nova arquitetura do React Native, o toque em `<Polygon>` do
`react-native-svg` não chega. As áreas do Mapa de Concretagem apareciam
desenhadas e coloridas, mas surdas — e sem abrir a área não havia como lançar o
laudo.

Resolvido em `src/components/PlantaInterativa.js`: quem ouve é um `Pressable`
comum, e a detecção de qual área foi tocada é feita em JavaScript, por ray
casting.

### O gráfico do histórico muda de agrupamento sozinho

`agruparLeituras` usa faixas de 30 s, 5 min ou 1 hora, conforme o intervalo
total das leituras. Se as leituras cobrem mais de 2 horas, ele agrupa por hora —
e uma demonstração de 20 minutos vira um ponto só.

Por isso o `seed_historico_demonstracao.sql` precisa ser rodado **perto da
apresentação**: para a janela terminar no "agora".

### O build do EAS quebra por versão de Node

O EAS roda yarn, que ignora o `package-lock.json` e resolve tudo do zero. Isso
trazia um `@supabase/supabase-js` que exige Node 22, enquanto o EAS entregava
Node 20.

Resolvido fixando `"node": "22.11.0"` nos três perfis do `eas.json` e prendendo
o supabase-js em `2.112.0` no `package.json`. **Não solte essas duas versões sem
testar o build.**

---

## O que o sistema não faz

Ditos por honestidade, e porque são os próximos passos:

- **O sensor de umidade é de solo, não certificado para concreto.** Ele detecta
  *variação* contra a linha de base da viagem, e não mede a relação água/cimento
  em número. Afirmar o contrário não se sustenta diante de uma banca de civil.
- **O sensor de vazão mede água, não concreto.** Na bancada a água faz o papel
  do concreto. Num sistema real o volume viria da dosagem na usina ou de
  contagem de rotação do tambor.
- **A rota no mapa é uma reta** entre origem e destino. Rota real exigiria uma
  API de direções paga.
- **O Mapa de Concretagem é 2D, por pavimento**, e a marcação é manual. Não é
  modelo BIM, e o sistema não confere se a área marcada corresponde ao que foi
  realmente concretado.
- **O protótipo tem um sensor e um caminhão.** A estrutura suporta vários, mas
  foi testada com um.

## Se for retomar

O que faria mais diferença, em ordem:

1. **Calibrar a umidade** contra adições de água medidas, com o mesmo traço e a
   mesma sonda. É o que separa o protótipo de um produto.
2. **Encapsular os sensores** para o ambiente do tambor, que é abrasivo.
3. **Rodar um piloto** com uma concreteira de verdade.

---

## Segurança

A chave **anon** do Supabase está no código e **isso é correto** — ela é pública
por design, e o acesso é limitado pelas políticas de Row-Level Security, que
valem no banco e não no aplicativo.

**Nunca** comite a chave `service_role` nem a senha do banco. Elas dão acesso
total e ignoram o RLS.
