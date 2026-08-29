// Tela de Temperatura — exibe o velocimetro com a temperatura atual do cimento
// Recebe obraId, obraNome e somenteLeitura via route.params
//
// Compartilhada pelos dois perfis: o mestre acompanha o concreto que chegou na
// obra dele, a construtora acompanha o que ela mandou. A diferenca e que so o
// mestre tem os botoes de simulacao, porque quem esta no canteiro e quem mede.
//
// O valor exibido e a ULTIMA LEITURA GRAVADA da obra, consultada no banco.
// Enquanto o sensor publicava por MQTT, ele chegava sozinho pelo broker; a
// integracao sera refeita quando o hardware estiver disponivel. Quando voltar,
// o sensor passa a gravar na mesma tabela e esta tela nao muda.
//
// Os botoes de simulacao gravam uma leitura de verdade — e o que permite
// demonstrar a tela e alimentar o Historico sem o sensor ligado.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import VelocimetroTemperatura from '../components/VelocimetroTemperatura';
import { salvarLeitura, buscarUltimaLeitura } from '../services/historico';
import { resumoUmidade, classificarUmidade } from '../services/umidade';
import { buscarCompras } from '../services/financeiro';
import { totalEntregue } from '../services/caminhoes';
import { useObras } from '../context/ObrasContext';
import { useCaminhoes } from '../context/CaminhoesContext';
import { ZONAS, avaliarTemperatura } from '../config/temperatura';
import { corDoCaminhao } from '../services/planta';
import { inscreverSensor } from '../services/mqtt';
import { registrarLeituraVazao } from '../services/caminhoes';
import { salvarUmidade, verificarAdicaoDeAgua } from '../services/umidade';

// De quanto em quanto tempo a tela reconsulta a ultima leitura
const INTERVALO_CONSULTA_MS = 5000;

// Data em texto → milissegundos, para comparar duas leituras pelo instante.
// Ausente vira 0, ou seja, "mais antigo que qualquer coisa" — e o que faz a
// primeira leitura sempre entrar.
function instanteDe(iso) {
  if (!iso) return 0;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

const { width } = Dimensions.get('window');

// ── CONFIGURACAO DAS ZONAS DE TEMPERATURA ──
// Usada tanto nos botoes de simulacao quanto no texto de status
// As faixas vivem em config/temperatura.js — o velocimetro, o historico e os
// alertas leem do mesmo lugar

// Formata temperatura em array de 2 digitos para o display digital
// Exemplo: 22 → ['2', '2']  |  8 → ['0', '8']
// Dois digitos bastam: a escala do concreto vai ate 40 °C.
function formatarDigitos(temp) {
  return String(Math.round(temp)).padStart(2, '0').split('');
}

// Ha quanto tempo a leitura foi feita. Importa porque um valor de tres horas
// atras nao diz nada sobre o concreto que esta chegando agora.
function formatarQuando(iso) {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

  if (minutos < 1)  return 'agora mesmo';
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24)   return `há ${horas} h`;

  return new Date(iso).toLocaleDateString('pt-BR');
}

// ── COMPONENTE PRINCIPAL ──
export default function TemperaturaScreen({ navigation, route }) {
  const { obraId, obraNome, somenteLeitura = false } = route.params;

  // 22 °C (meio da zona IDEAL) e so o valor mostrado ate a primeira consulta
  // voltar. Precisa ficar dentro da escala de 5 a 40 °C: o valor antigo era 75,
  // sobra da epoca em que a escala ia ate 100, e abria a tela com o ponteiro
  // cravado em CRITICA antes de qualquer leitura existir.
  const [temperatura, setTemperatura] = useState(22);

  // Quando a leitura exibida foi medida. null = a obra ainda nao tem leitura.
  const [medidoEm, setMedidoEm] = useState(null);

  // Espelho em ref, para a consulta periodica comparar sem virar dependencia
  // dela — se entrasse nas dependencias, o intervalo se recriaria a cada leitura
  const medidoEmRef = useRef(null);
  medidoEmRef.current = medidoEm;

  // Fontes dos tres volumes: a obra traz o planejado, as compras trazem o
  // comprado, e os envios trazem o que o sensor mediu na descarga
  const { obras } = useObras();
  const { caminhoes, recarregar: recarregarCaminhoes } = useCaminhoes();
  const [compras, setCompras] = useState([]);

  useEffect(() => {
    if (!obraId) return;
    buscarCompras(obraId)
      .then(setCompras)
      .catch((falha) => console.warn('[Temperatura] Compras:', falha.message));
  }, [obraId]);

  // ── CAMINHAO EM FOCO ──
  // Temperatura, umidade e volume sao da CARGA, nao da obra: cada betoneira
  // traz um concreto diferente. Uma obra recebe varias ao longo da
  // concretagem, e misturar as leituras numa serie so descreveria nenhuma
  // delas. Por isso a tela mostra um caminhao de cada vez.
  const caminhoesDaObra = [...new Set(
    caminhoes.filter((c) => c.obraId === String(obraId)).map((c) => c.caminhao)
  )];

  // Chave estavel para as dependencias, ja que a lista e recriada a cada render
  const chaveCaminhoes = caminhoesDaObra.join(',');

  const [caminhaoSelecionado, setCaminhaoSelecionado] = useState(null);

  // Escolhe o primeiro assim que a lista chega, para a tela nunca abrir sem
  // caminhao nenhum selecionado
  useEffect(() => {
    setCaminhaoSelecionado((atual) => {
      if (atual && caminhoesDaObra.includes(atual)) return atual;
      return caminhoesDaObra[0] || null;
    });
  }, [chaveCaminhoes]);

  // Busca a ultima temperatura e a ultima umidade do caminhao em foco
  const carregar = useCallback(async () => {
    if (!obraId) {
      console.warn('[Temperatura] Nenhuma obra selecionada!');
      return;
    }

    try {
      const [ultima, resumo] = await Promise.all([
        buscarUltimaLeitura(obraId, caminhaoSelecionado),
        resumoUmidade(obraId, caminhaoSelecionado),
      ]);

      // So aplica se for MAIS RECENTE que o valor exibido. Sem isso, a consulta
      // periodica atropelava a leitura recem-chegada do sensor: no modo somente
      // leitura nada e gravado, entao o banco devolvia um valor antigo e a tela
      // voltava para ele a cada cinco segundos.
      //
      // A comparacao e por INSTANTE, nunca por texto. Os dois lados escrevem a
      // data em formatos diferentes — o MQTT usa new Date().toISOString(), que
      // termina em 'Z', e o Postgres devolve '+00:00'. Como '+' vem antes de 'Z'
      // na tabela de caracteres, comparar como string fazia o valor do banco
      // parecer sempre mais antigo, e a tela congelava na ultima leitura do
      // sensor sem nunca mais aceitar nada.
      if (ultima && instanteDe(ultima.medidoEm) > instanteDe(medidoEmRef.current)) {
        setTemperatura(ultima.temperatura);
        setMedidoEm(ultima.medidoEm);
      }

      if (resumo) {
        setUmidade(resumo);
        statusUmidadeRef.current = resumo.statusSensor;
        mediaBaseRef.current = resumo.mediaBase;
      }
    } catch (falha) {
      console.warn('[Temperatura]', falha.message);
    }
  }, [obraId, caminhaoSelecionado]);

  // Consulta ao abrir e periodicamente. Continua valendo mesmo com o MQTT
  // ligado: se outro aparelho ou o servico de gravacao registrar uma leitura,
  // esta tela a enxerga sem depender do broker.
  useEffect(() => {
    carregar();
    const intervalo = setInterval(carregar, INTERVALO_CONSULTA_MS);
    return () => clearInterval(intervalo);
  }, [carregar]);

  // ── SENSOR AO VIVO ──
  // O broker entrega a leitura no instante em que o sensor publica. Quem grava
  // e o mestre, que esta no canteiro recebendo o concreto; a construtora
  // acompanha em modo consulta e nao escreve, para a mesma leitura nao entrar
  // duas vezes se os dois estiverem com o app aberto.
  const [sensorConectado, setSensorConectado] = useState(false);

  // Sensor de vazao ACUMULA: manda 5, depois 12, depois 27, conforme a
  // descarga avanca. Por isso a leitura atualiza a viagem, em vez de so
  // preencher a que estiver vazia — a primeira versao travava no primeiro
  // valor e descartava todos os seguintes.
  //
  // A viagem que recebe e a mais recente daquele caminhao nesta obra. A lista
  // ja vem ordenada por data decrescente, entao o primeiro que casa e ela.
  const registrarVolumeDoSensor = useCallback(async (caminhao, volume) => {
    // So a viagem ABERTA recebe leitura. Viagem concluida e historico: o
    // caminhao ja descarregou e o numero dela nao muda mais.
    const envio = caminhoes.find(
      (c) => c.obraId === String(obraId)
          && c.caminhao === caminhao
          && !c.concluidoEm
    );

    // Descarte silencioso aqui seria cruel: o valor chegou, nao foi gravado, e
    // ninguem saberia por que. Melhor a tela dizer o que faltou.
    if (!envio) {
      const despachados = [...new Set(
        caminhoes.filter((c) => c.obraId === String(obraId)).map((c) => c.caminhao)
      )];

      console.warn(
        `[Temperatura] Volume de ${volume} m³ do caminhao ${caminhao} chegou sem viagem`
      );

      Alert.alert(
        'Volume sem viagem correspondente',
        `Chegou ${volume} m³ do caminhão ${caminhao}, mas ele não foi despachado para esta obra.\n\n` +
        (despachados.length
          ? `Caminhões desta obra: ${despachados.join(', ')}.`
          : 'Nenhum caminhão foi despachado para esta obra.') +
        '\n\nDespache o caminhão em Enviar Caminhão antes de medir o volume.'
      );
      return;
    }

    try {
      // A leitura e bruta e acumulada: o servico desconta a referencia da
      // viagem para chegar ao que foi entregue nesta descarga
      const atualizado = await registrarLeituraVazao(envio, volume);
      if (atualizado !== envio) await recarregarCaminhoes();
    } catch (falha) {
      console.warn('[Temperatura]', falha.message);
    }
  }, [caminhoes, obraId, recarregarCaminhoes]);

  // ── UMIDADE DA MASSA ──
  // O sensor manda valor e status em mensagens separadas. O status fica
  // guardado para acompanhar o proximo valor, que e quando a linha e gravada.
  //
  // O estado guardado ja e o CLASSIFICADO (ver classificarUmidade): a tela nao
  // mostra o numero cru do sensor como informacao principal, porque 4095 nao
  // significa nada para quem olha. Ela mostra se a massa mudou desde que saiu.
  const [umidade, setUmidade] = useState(() => classificarUmidade({ valorAtual: null }));
  const statusUmidadeRef = useRef(null);

  // Media das primeiras leituras da viagem, vinda da ultima consulta ao banco.
  // Guardada aqui para a leitura que chega pelo MQTT ser classificada na hora,
  // sem esperar a proxima consulta.
  const mediaBaseRef = useRef(null);

  const tratarUmidade = useCallback(async ({ valor, status, caminhao }) => {
    // A tela mostra um caminhao de cada vez, mas grava tudo: leitura de outro
    // caminhao entra no banco e aparece quando ele for selecionado
    const emFoco = !caminhaoSelecionado || caminhao === caminhaoSelecionado;

    if (status !== undefined) {
      if (emFoco) {
        statusUmidadeRef.current = status;
        setUmidade((atual) => ({ ...atual, statusSensor: status }));
      }
      return;
    }

    if (valor === undefined) return;

    if (emFoco) {
      setUmidade({
        ...classificarUmidade({
          mediaBase: mediaBaseRef.current,
          valorAtual: valor,
          temBase: mediaBaseRef.current !== null,
        }),
        valor,
        statusSensor: statusUmidadeRef.current,
        medidoEm: new Date().toISOString(),
      });
    }

    await salvarUmidade(obraId, { valor, status: statusUmidadeRef.current, caminhao });

    // Compara com a media do inicio da viagem: queda acentuada significa agua
    // adicionada. Sem await — a tela nao espera a verificacao para atualizar.
    verificarAdicaoDeAgua(obraId, caminhao, obraNome);
  }, [obraId, obraNome, caminhaoSelecionado]);

  // Os manipuladores mudam a cada render, porque dependem de `caminhoes` — que
  // o Context recarrega justamente quando um volume e gravado. Se eles
  // entrassem nas dependencias do efeito abaixo, cada leitura de volume
  // desconectaria e reconectaria o MQTT, e as mensagens seguintes se perderiam
  // no vaivem. Guardados aqui, o efeito le sempre a versao mais recente sem
  // precisar reassinar.
  const manipuladores = useRef({});

  manipuladores.current = {
    temperatura: ({ temperatura: valor, caminhao }) => {
      // Grava sempre; exibe so o caminhao em foco
      if (!somenteLeitura) {
        salvarLeitura(obraId, valor, { obraNome, caminhao });
      }

      if (caminhaoSelecionado && caminhao !== caminhaoSelecionado) return;

      setTemperatura(valor);
      setMedidoEm(new Date().toISOString());
    },

    // Volume grava nos dois perfis, diferente da temperatura. Temperatura
    // ACRESCENTA uma linha por leitura — dois aparelhos gravando criariam
    // duplicatas. Volume PREENCHE um campo de uma viagem: se os dois gravarem,
    // o segundo escreve o mesmo valor no mesmo lugar.
    //
    // E a construtora e quem mais precisa: a betoneira e dela.
    volume: ({ volume, caminhao }) => registrarVolumeDoSensor(caminhao, volume),

    umidade: tratarUmidade,
  };

  // So a obra e a lista de caminhoes exigem reassinar. Todo o resto passa pela
  // referencia acima.
  useEffect(() => {
    if (!obraId) return;

    const desinscrever = inscreverSensor(obraId, caminhoesDaObra, {
      onTemperatura: (dados) => manipuladores.current.temperatura(dados),
      onVolume:      (dados) => manipuladores.current.volume(dados),
      onUmidade:     (dados) => manipuladores.current.umidade(dados),
      onEstado:      setSensorConectado,
    });

    return () => {
      if (desinscrever) desinscrever();
    };
    // chaveCaminhoes no lugar da lista: array novo a cada render reassinaria sempre
  }, [obraId, chaveCaminhoes]);

  // Botao de simulacao: grava uma leitura de verdade, para a tela e o Historico
  // se comportarem exatamente como se comportarao com o sensor ligado
  async function simularLeitura(valor) {
    setTemperatura(valor);
    setMedidoEm(new Date().toISOString());
    // O nome da obra vai junto para a notificacao dizer de qual obra se trata
    await salvarLeitura(obraId, valor, { obraNome });
  }

  // Derivados da temperatura atual
  const zonaAtual = avaliarTemperatura(temperatura);
  const digitos   = formatarDigitos(temperatura);

  // ── VOLUME DE CIMENTO ──
  // Tres numeros que ate agora nao se falavam. Todos em m³, que e como concreto
  // usinado se compra — antes esta tela dizia "sacos", contradizendo o proprio
  // cadastro da obra, que sempre pediu m³.
  const obra = obras.find((o) => o.id === String(obraId));

  const volumePlanejado = Number(obra?.volumeCimento) || 0;          // cadastro da obra
  const volumeComprado  = compras.reduce((s, c) => s + c.volume, 0); // financeiro
  const volumeEntregue  = totalEntregue(caminhoes, obraId);          // sensor, na descarga

  // A barra mede o avanco em direcao ao que a obra precisa
  const larguraBarra = volumePlanejado > 0
    ? Math.min(volumeEntregue / volumePlanejado, 1)
    : 0;
  // Uma casa decimal enquanto o avanco e pequeno. Com o volume entregue em
  // fracoes de m³ contra uma obra de dezenas, o arredondamento inteiro deixava
  // a porcentagem parada em 0 enquanto o numero ao lado ja se mexia.
  const pctBruta = volumePlanejado > 0
    ? (volumeEntregue / volumePlanejado) * 100
    : 0;

  const porcentagemVolume = pctBruta > 0 && pctBruta < 10
    ? Number(pctBruta.toFixed(1))
    : Math.round(pctBruta);

  // O status compara ENTREGUE com COMPRADO — e a diferenca que custa dinheiro.
  // Pagar por 8 m³ e receber 7,4 e o tipo de perda que passa despercebida.
  const diferenca  = volumeEntregue - volumeComprado;
  const tolerancia = volumeComprado * 0.02;

  let corVolume, statusVolume, iconeVolume, detalhesVolume;

  if (volumeComprado === 0) {
    corVolume      = '#94A3B8';
    statusVolume   = 'Sem compras registradas';
    iconeVolume    = 'help-circle-outline';
    detalhesVolume = 'Registre uma compra na tela Financeiro';
  } else if (volumeEntregue === 0) {
    corVolume      = '#FACC15';
    statusVolume   = 'Nenhuma descarga medida';
    iconeVolume    = 'time-outline';
    detalhesVolume = `${volumeComprado.toFixed(1)} m³ comprados, aguardando entrega`;
  } else if (Math.abs(diferenca) <= tolerancia) {
    corVolume      = '#22C55E';
    statusVolume   = 'Entregas conferem';
    iconeVolume    = 'checkmark-circle';
    detalhesVolume = 'O volume descarregado bate com o comprado';
  } else if (diferenca < 0) {
    corVolume      = '#EF4444';
    statusVolume   = 'Faltou na entrega';
    iconeVolume    = 'trending-down';
    detalhesVolume = `${Math.abs(diferenca).toFixed(1)} m³ a menos do que foi pago`;
  } else {
    corVolume      = '#FACC15';
    statusVolume   = 'Entregue acima do comprado';
    iconeVolume    = 'trending-up';
    detalhesVolume = `${diferenca.toFixed(1)} m³ além do registrado no Financeiro`;
  }

  return (
    <LinearGradient
      colors={['#1A56DB', '#0B2065', '#1565C0']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* ── CABECALHO ── */}
        <View style={styles.cabecalho}>

          {/* Botao de voltar circular — fundo azul + borda verde sutil */}
          <TouchableOpacity
            style={styles.botaoVoltar}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Titulo + linha decorativa verde centralizada */}
          <View style={styles.tituloContainer}>
            <Text style={styles.titulo}>Monitoramento</Text>
            <View style={styles.linhaDecorada} />
          </View>

          {/* Icone de termometro a direita — circulo com borda verde */}
          <View style={styles.iconeCirculo}>
            <Ionicons name="thermometer-outline" size={24} color="#22C55E" />
          </View>

        </View>

        {/* ── NOME DA OBRA ── */}
        <Text style={styles.nomeObra}>{obraNome}</Text>

        {/* ── SELETOR DE CAMINHAO ── */}
        {/* Tudo abaixo daqui e da CARGA daquele caminhao: temperatura, umidade
            e volume. Aparece a partir de um caminhao, mesmo com um so, porque
            deixa explicito de quem sao os numeros na tela. */}
        {caminhoesDaObra.length > 0 && (
          <View style={styles.seletor}>
            {caminhoesDaObra.map((c) => {
              const escolhido = c === caminhaoSelecionado;
              const cor = corDoCaminhao(c);

              return (
                <TouchableOpacity
                  key={c}
                  // Selecionado ganha o fundo na cor do caminhao, nao so uma
                  // borda: sobre fundo escuro, borda colorida quase nao se ve
                  style={[
                    styles.seletorItem,
                    escolhido
                      ? { backgroundColor: cor, borderColor: cor }
                      : { borderColor: 'rgba(255,255,255,0.25)' },
                  ]}
                  onPress={() => setCaminhaoSelecionado(c)}
                  activeOpacity={0.8}
                >
                  {!escolhido && (
                    <View style={[styles.seletorPonto, { backgroundColor: cor }]} />
                  )}
                  {escolhido && (
                    <Ionicons name="checkmark-circle" size={15} color="#fff" />
                  )}
                  <Text
                    style={[
                      styles.seletorTexto,
                      escolhido && { fontWeight: 'bold' },
                    ]}
                  >
                    Caminhão {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {caminhoesDaObra.length === 0 && (
          <Text style={styles.semCaminhao}>
            Nenhum caminhão despachado para esta obra
          </Text>
        )}

        {/* ── ESTADO DO SENSOR E DA ULTIMA LEITURA ── */}
        {/* Duas informacoes diferentes de proposito: o sensor pode estar
            conectado sem ter publicado nada ainda, e pode haver leitura antiga
            no banco com o broker fora do ar. Separadas, dizem onde esta o
            problema quando nada aparece. */}
        <View style={styles.statusMQTT}>
          <View style={[
            styles.bolinhaStatus,
            { backgroundColor: sensorConectado ? '#22C55E' : 'rgba(255,255,255,0.35)' }
          ]} />
          <Text style={styles.textoStatus}>
            {sensorConectado ? 'Sensor conectado' : 'Sensor desconectado'}
            {'  ·  '}
            {medidoEm ? formatarQuando(medidoEm) : 'sem leitura'}
          </Text>
        </View>

        {/* ── CARD PRINCIPAL ── */}
        {/* Contem: velocimetro + display digital + texto de status */}
        <View style={styles.card}>

          {/* Velocimetro SVG com as 5 zonas coloridas */}
          <VelocimetroTemperatura
            temperatura={temperatura}
            corZona={zonaAtual.cor}
          />

          {/* ── DISPLAY DIGITAL (3 quadradinhos) ── */}
          <View style={styles.displayContainer}>
            {digitos.map((digito, index) => (
              <View key={index} style={styles.digitoBox}>
                <Text style={styles.digitoTexto}>{digito}</Text>
              </View>
            ))}
          </View>

          {/* ── TEXTO DE STATUS ── */}
          {/* Cor muda dinamicamente conforme a zona atual */}
          <Text style={[styles.statusTexto, { color: zonaAtual.cor }]}>
            {zonaAtual.statusTexto}
          </Text>

        </View>

        {/* ── BOTOES DE SIMULACAO ── */}
        {/* Só aparecem quando NAO ha sensor conectado. Com o sensor publicando,
            somem sozinhos: quem mede e o sensor, e botao que muda temperatura
            com o dedo poe em duvida todo o resto do sistema.
            Existem como rede de seguranca — se o hardware falhar na
            apresentacao, ainda da para demonstrar a tela.

            E so para o mestre: a medicao acontece no canteiro, e a construtora
            acompanha o resultado sem poder alterar. */}
        {!somenteLeitura && !sensorConectado && (
        <View style={styles.botoesContainer}>
          {ZONAS.map((zona) => (
            <TouchableOpacity
              key={zona.nome}
              style={[
                styles.botaoSim,
                { backgroundColor: zona.cor },
                // Destaca o botao da zona ativa
                temperatura === zona.tempSim && styles.botaoSimAtivo,
              ]}
              onPress={() => simularLeitura(zona.tempSim)}
              activeOpacity={0.75}
            >
              <Text style={styles.botaoSimNome}>{zona.nome}</Text>
              <Text style={styles.botaoSimTemp}>{zona.tempSim}°C</Text>
            </TouchableOpacity>
          ))}
        </View>
        )}

        {/* Deixa explicito que aquilo nao e medicao */}
        {!somenteLeitura && !sensorConectado && (
          <Text style={styles.avisoSimulacao}>
            Simulação — disponível apenas enquanto o sensor está desconectado
          </Text>
        )}

        {/* ── UMIDADE DA MASSA ── */}
        {/* O sensor manda um numero de 0 a 4095, que so significa alguma coisa
            para quem conhece a sonda. Quem le esta tela — mestre de obra,
            cliente, banca — nao conhece.

            Entao a informacao principal e o ESTADO em palavras, e a pergunta
            respondida e "a massa esta como saiu da usina?". O numero cru fica
            no rodape, em letra pequena, para quem quiser conferir.

            O card aparece sempre, mesmo sem leitura: escondido, ele fazia uma
            falha do sensor parecer funcionalidade inexistente. */}
        <View style={styles.cardUmidade}>
          <View style={styles.umidadeLinha}>
            <Ionicons name="water-outline" size={18} color="#3B82F6" />
            <Text style={styles.umidadeTitulo}>UMIDADE DA MASSA</Text>
          </View>

          <View style={styles.umidadeEstadoLinha}>
            <View style={[styles.umidadePonto, { backgroundColor: umidade.cor }]} />
            <Text style={[styles.umidadeEstado, { color: umidade.cor }]}>
              {umidade.rotulo}
            </Text>
          </View>

          <Text style={styles.umidadeExplicacao}>{umidade.explicacao}</Text>

          {/* A barra so existe quando ha referencia: sem as primeiras leituras
              da viagem nao ha com o que comparar, e uma barra sem comparacao
              seria decoracao. */}
          {umidade.variacaoPct !== null && (
            <View style={styles.umidadeBarraBloco}>
              <View style={styles.umidadeTrilho}>
                <LinearGradient
                  colors={['#22C55E', '#FACC15', '#DC2626']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.umidadeTrilhoFundo}
                />
                <View
                  style={[styles.umidadeAgulha, { left: `${umidade.posicao * 100}%` }]}
                />
              </View>

              <View style={styles.umidadeEscala}>
                <Text style={styles.umidadeEscalaTexto}>como saiu</Text>
                <Text style={styles.umidadeEscalaTexto}>mais líquida</Text>
              </View>
            </View>
          )}

          {/* Numeros por ultimo e discretos: servem a quem entende do sensor,
              e nao podem ser a primeira coisa que a tela diz. */}
          <View style={styles.umidadeRodape}>
            {umidade.variacaoPct !== null && (
              <Text style={styles.umidadeRodapeTexto}>
                Variação desde a saída: {umidade.variacaoPct > 0 ? '+' : ''}
                {umidade.variacaoPct.toFixed(0)}%
              </Text>
            )}
            {umidade.valor !== null && (
              <Text style={styles.umidadeRodapeTexto}>
                Leitura do sensor: {Math.round(umidade.valor)}
                {umidade.statusSensor ? ` · ${umidade.statusSensor}` : ''}
              </Text>
            )}
          </View>
        </View>

        {/* ── CARD VOLUME DE CIMENTO ── */}
        <View style={styles.cardVolume}>

          <Text style={styles.cardVolumeTitulo}>VOLUME DE CIMENTO</Text>

          {/* Barra de progresso + porcentagem */}
          <View style={styles.barraRow}>
            <View style={styles.barraTrilho}>
              <View
                style={[
                  styles.barraPreenchimento,
                  { flex: larguraBarra, backgroundColor: corVolume },
                ]}
              />
              <View style={{ flex: 1 - larguraBarra }} />
            </View>
            <Text style={[styles.barraPorcentagem, { color: corVolume }]}>
              {porcentagemVolume > 100 ? 'EXCEDIDO' : `${porcentagemVolume}%`}
            </Text>
          </View>

          {/* Mini-card de status */}
          <View style={[styles.statusVolumeMini, { borderColor: corVolume + '66' }]}>
            <Ionicons name={iconeVolume} size={20} color={corVolume} />
            <View style={styles.statusVolumeTextos}>
              <Text style={[styles.statusVolumeNome, { color: corVolume }]}>{statusVolume}</Text>
              <Text style={styles.statusVolumeDetalhe}>{detalhesVolume}</Text>
            </View>
          </View>

          {/* Os tres volumes lado a lado. Antes aqui havia botoes que mudavam
              um numero inventado; agora cada coluna vem de uma fonte real. */}
          <View style={styles.tresVolumes}>
            <View style={styles.colunaVolume}>
              <Text style={styles.colunaVolumeLabel}>PLANEJADO</Text>
              <Text style={styles.colunaVolumeValor}>{volumePlanejado.toFixed(1)}</Text>
              <Text style={styles.colunaVolumeUnidade}>m³</Text>
            </View>

            <View style={styles.colunaVolume}>
              <Text style={styles.colunaVolumeLabel}>COMPRADO</Text>
              <Text style={styles.colunaVolumeValor}>{volumeComprado.toFixed(1)}</Text>
              <Text style={styles.colunaVolumeUnidade}>m³</Text>
            </View>

            <View style={styles.colunaVolume}>
              <Text style={styles.colunaVolumeLabel}>ENTREGUE</Text>
              <Text style={[styles.colunaVolumeValor, { color: corVolume }]}>
                {volumeEntregue.toFixed(1)}
              </Text>
              <Text style={styles.colunaVolumeUnidade}>m³</Text>
            </View>
          </View>

        </View>

      </ScrollView>
    </LinearGradient>
  );
}

// ── ESTILOS ──
const styles = StyleSheet.create({

  // ── SELETOR DE CAMINHÃO ──
  seletor: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 16, marginBottom: 14,
  },

  seletorItem: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
  },

  seletorPonto: { width: 9, height: 9, borderRadius: 5 },

  seletorTexto: { color: '#fff', fontSize: 13, fontWeight: '600' },

  semCaminhao: {
    color: 'rgba(255,255,255,0.4)', fontSize: 12,
    textAlign: 'center', fontStyle: 'italic', marginBottom: 14,
  },

  // ── UMIDADE ──
  cardUmidade: {
    marginHorizontal: 16, marginBottom: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: 'rgba(11, 32, 101, 0.72)',
    borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.35)',
    borderRadius: 16,
  },

  umidadeLinha: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  umidadeTitulo: {
    color: '#3B82F6', fontSize: 10.5,
    fontWeight: 'bold', letterSpacing: 1.2,
  },

  // ── ESTADO EM PALAVRAS ──
  // E a informacao principal do card, entao tem o maior corpo de texto e a
  // cor do proprio estado
  umidadeEstadoLinha: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginTop: 12,
  },

  umidadePonto: { width: 9, height: 9, borderRadius: 5 },

  umidadeEstado: { fontSize: 17, fontWeight: 'bold' },

  umidadeExplicacao: {
    color: 'rgba(255,255,255,0.62)', fontSize: 13,
    lineHeight: 18, marginTop: 4,
  },

  // ── BARRA DE VARIACAO ──
  umidadeBarraBloco: { marginTop: 16 },

  umidadeTrilho: { height: 10, borderRadius: 5, justifyContent: 'center' },

  umidadeTrilhoFundo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 5, opacity: 0.55,
  },

  // marginLeft negativa = metade da largura, para o centro da agulha cair
  // exatamente na posicao calculada, e nao a borda esquerda dela
  umidadeAgulha: {
    position: 'absolute',
    width: 14, height: 14, marginLeft: -7,
    borderRadius: 7,
    backgroundColor: '#fff',
    borderWidth: 2.5, borderColor: 'rgba(11, 32, 101, 0.9)',
  },

  umidadeEscala: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 7,
  },

  umidadeEscalaTexto: {
    color: 'rgba(255,255,255,0.4)', fontSize: 10.5,
  },

  // ── RODAPE TECNICO ──
  // Onde o numero cru vive agora: disponivel para quem entende, longe de
  // quem nao entende
  umidadeRodape: {
    marginTop: 14, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.09)',
    gap: 3,
  },

  umidadeRodapeTexto: {
    color: 'rgba(255,255,255,0.38)', fontSize: 11,
  },

  avisoSimulacao: {
    color: 'rgba(255,255,255,0.35)', fontSize: 10.5,
    textAlign: 'center', fontStyle: 'italic',
    marginTop: -4, marginBottom: 10, paddingHorizontal: 24,
  },

  // ── TRES VOLUMES (planejado / comprado / entregue) ──
  tresVolumes: {
    flexDirection: 'row',
    marginTop: 14,
  },

  colunaVolume: { flex: 1, alignItems: 'center' },

  colunaVolumeLabel: {
    color: 'rgba(255,255,255,0.45)', fontSize: 9,
    fontWeight: 'bold', letterSpacing: 1, marginBottom: 4,
  },

  colunaVolumeValor: {
    color: '#fff', fontSize: 20, fontWeight: 'bold',
  },

  colunaVolumeUnidade: {
    color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 1,
  },

  // Tela inteira com gradiente
  container: {
    flex: 1,
  },

  // Conteudo interno do ScrollView
  scrollContent: {
    flexGrow: 1,
    paddingTop: 56,
    paddingBottom: 24,
  },

  // ── CABECALHO ──
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 4,
  },

  // Botao voltar — circulo azul com borda verde sutil
  botaoVoltar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(26, 86, 219, 0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Agrupa titulo e linha decorativa
  tituloContainer: {
    alignItems: 'center',
  },

  // Titulo "Temperatura"
  titulo: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 5,
  },

  // Linha verde decorativa abaixo do titulo
  linhaDecorada: {
    width: 44,
    height: 3,
    backgroundColor: '#22C55E',
    borderRadius: 2,
  },

  // Circulo com icone de termometro a direita
  iconeCirculo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(26, 86, 219, 0.5)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Nome da obra selecionada
  nomeObra: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 18,
    letterSpacing: 0.4,
  },

  // ── STATUS DA CONEXAO MQTT ──
  statusMQTT: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginTop: 10,
  },

  bolinhaStatus: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },

  textoStatus: {
    color: 'white',
    fontSize: 14,
  },

  // ── CARD PRINCIPAL ──
  card: {
    width: width * 0.88,
    alignSelf: 'center',
    backgroundColor: 'rgba(11, 32, 101, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.28)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 22,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // ── DISPLAY DIGITAL ──
  // Linha com 3 quadradinhos lado a lado
  displayContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 14,
  },

  // Cada quadradinho individual
  digitoBox: {
    width: 54,
    height: 60,
    backgroundColor: '#080F2E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Numero dentro do quadradinho
  digitoTexto: {
    color: '#fff',
    fontSize: 34,
    fontWeight: 'bold',
    letterSpacing: 2,
  },

  // ── TEXTO DE STATUS ──
  statusTexto: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  // ── BOTOES DE SIMULACAO ──
  // Linha horizontal com 5 botoes, um por zona
  botoesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 28,
  },

  // Cada botao de simulacao
  botaoSim: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 58,
  },

  // Estado ativo — borda branca para indicar zona selecionada
  botaoSimAtivo: {
    borderWidth: 2,
    borderColor: '#fff',
  },

  // Nome da zona (ex: "BAD")
  botaoSimNome: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },

  // Temperatura da zona (ex: "55°C")
  botaoSimTemp: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },


  // ── CARD VOLUME DE CIMENTO ──
  cardVolume: {
    width: width * 0.88,
    alignSelf: 'center',
    backgroundColor: 'rgba(11, 32, 101, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.28)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  cardVolumeTitulo: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
  },

  barraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },

  barraTrilho: {
    flex: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    flexDirection: 'row',
    overflow: 'hidden',
  },

  barraPreenchimento: {
    borderRadius: 8,
  },

  barraPorcentagem: {
    fontSize: 13,
    fontWeight: 'bold',
    minWidth: 66,
    textAlign: 'right',
  },

  statusVolumeMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },

  statusVolumeTextos: {
    flex: 1,
  },

  statusVolumeNome: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },

  statusVolumeDetalhe: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    marginTop: 2,
  },

  botoesVolumeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },

  botaoVolume: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
  },

  botaoVolumeAtivo: {
    backgroundColor: 'rgba(34, 197, 94, 0.35)',
    borderColor: '#22C55E',
    borderWidth: 2,
  },

  botaoVolumeTxt: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
});
