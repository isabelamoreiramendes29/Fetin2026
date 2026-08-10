// Tela de rastreamento do caminhao — mapa real com a rota
// Recebe obraId, obraNome e somenteLeitura via route.params
//
// Quem faz o que: a betoneira e da construtora, entao e ela quem inicia,
// pausa e reinicia a viagem. O mestre, no canteiro, apenas acompanha —
// entra com somenteLeitura e recebe a posicao consultando o banco.
//
// Por que a posicao vai para o banco e nao fica na tela: sao aparelhos
// diferentes. E o mesmo desenho que o GPS real vai usar — o caminhao publica
// onde esta, quem acompanha le dali (ver services/rastreamento.js).
//
// O que ainda e simulado e o avanco em si: o modulo GPS/LoRa nao publica
// coordenadas ainda. Quando publicar, ele passa a alimentar a mesma tabela.

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import MapaRota, { comprimentoRota } from '../components/MapaRota';
import { publicarPosicao, buscarPosicoes } from '../services/rastreamento';
import { corDoCaminhao } from '../services/planta';
import { buscarFrota, acharCaminhao } from '../services/frota';

// De quanto em quanto tempo o mestre reconsulta a posicao do caminhao
const INTERVALO_CONSULTA_MS = 3000;

// Passo da simulacao no modo da construtora
const PASSO_MS = 500;
const PASSO_PCT = 2;

const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────
// ROTA — coordenadas reais em Sao Paulo
// Da regiao da Barra Funda ate a Av. Paulista, que e o endereco da Obra 1
// em obrasIniciais (ObrasContext).
//
// Fixa por enquanto: quando as obras vierem do banco com endereco real, esta
// rota passa a ser derivada dele em vez de escrita aqui.
// ─────────────────────────────────────────────────────────────
const ROTA = [
  { latitude: -23.5230, longitude: -46.6690 }, // Depósito
  { latitude: -23.5310, longitude: -46.6655 },
  { latitude: -23.5400, longitude: -46.6600 },
  { latitude: -23.5490, longitude: -46.6560 },
  { latitude: -23.5570, longitude: -46.6540 },
  { latitude: -23.5629, longitude: -46.6544 }, // Obra — Av. Paulista
];

// Distancia real da rota, calculada por haversine. Antes era um 12,5 km
// inventado que nao correspondia a distancia nenhuma.
const DISTANCIA_TOTAL = comprimentoRota(ROTA);

// Velocidade media estimada em transito urbano, usada para o ETA
const VELOCIDADE_MEDIA_KMH = 25;
const TEMPO_TOTAL = (DISTANCIA_TOTAL / VELOCIDADE_MEDIA_KMH) * 60; // minutos

// Status textual + cor + ícone conforme posição do caminhão
function getStatus(pos) {
  if (pos === 0)   return { texto: 'Aguardando saída',   cor: '#FACC15', icone: 'time-outline'       };
  if (pos >= 100)  return { texto: 'Chegou ao destino!', cor: '#22C55E', icone: 'checkmark-circle'   };
  return                  { texto: 'Em trânsito',        cor: '#22C55E', icone: 'navigate-outline'   };
}

// ── COMPONENTE PRINCIPAL ──
export default function LocalizacaoScreen({ navigation, route }) {
  const { obraId, obraNome = 'Obra 1', somenteLeitura = false } = route.params || {};

  // Uma entrada por caminhao a caminho desta obra
  const [posicoes, setPosicoes]     = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [simulando, setSimulando]   = useState(false);

  // O intervalo precisa ler o progresso mais recente sem se recriar a cada
  // avanco — daí a copia em ref
  const posicoesRef = useRef(posicoes);
  useEffect(() => { posicoesRef.current = posicoes; }, [posicoes]);

  // ── CARREGAR AS POSICOES ──
  const carregar = useCallback(async () => {
    if (!obraId) return;

    try {
      const lista = await buscarPosicoes(obraId);
      setPosicoes(lista);
      // Seleciona o primeiro caminhao automaticamente, para a construtora nao
      // precisar escolher antes de poder fazer qualquer coisa
      setSelecionado((atual) => atual ?? lista[0]?.caminhao ?? null);
    } catch (falha) {
      console.warn('[Localizacao]', falha.message);
    }
  }, [obraId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // A frota traz placa, motorista e capacidade. Carregada uma vez: ela muda
  // muito menos que a posicao dos caminhoes.
  const [frota, setFrota] = useState([]);

  useEffect(() => {
    buscarFrota()
      .then(setFrota)
      .catch((falha) => console.warn('[Localizacao] Frota:', falha.message));
  }, []);

  // ── MODO CONSULTA (mestre): reconsulta o banco periodicamente ──
  useEffect(() => {
    if (!somenteLeitura || !obraId) return;

    const intervalo = setInterval(carregar, INTERVALO_CONSULTA_MS);
    return () => clearInterval(intervalo);
  }, [somenteLeitura, obraId, carregar]);

  // Atualiza a posicao do caminhao selecionado na tela e publica no banco,
  // para o mestre enxergar do aparelho dele
  const moverSelecionado = useCallback((progresso, emMovimento) => {
    setPosicoes((atuais) =>
      atuais.map((p) =>
        p.caminhao === selecionado ? { ...p, progresso, emMovimento } : p
      )
    );
    publicarPosicao(obraId, selecionado, progresso, emMovimento);
  }, [obraId, selecionado]);

  // ── MODO CONTROLE (construtora): avanca a simulacao do caminhao escolhido ──
  useEffect(() => {
    if (somenteLeitura || !simulando || !selecionado) return;

    const intervalo = setInterval(() => {
      const atual = posicoesRef.current.find((p) => p.caminhao === selecionado);
      if (!atual) return;

      const proximo = Math.min(atual.progresso + PASSO_PCT, 100);
      const chegou = proximo >= 100;

      moverSelecionado(proximo, !chegou);
      if (chegou) setSimulando(false);
    }, PASSO_MS);

    return () => clearInterval(intervalo);
  }, [somenteLeitura, simulando, selecionado, moverSelecionado]);

  // Trocar de caminhao pausa a simulacao: seria confuso o botao continuar
  // dizendo "Pausar" enquanto move um caminhao que nao esta mais selecionado
  function escolherCaminhao(caminhao) {
    setSimulando(false);
    setSelecionado(caminhao);
  }

  // ── DERIVADOS ──
  // A construtora acompanha o caminhao que esta dirigindo; o mestre, no
  // canteiro, se interessa pelo proximo a chegar
  const emFoco = somenteLeitura
    ? posicoes.reduce(
        (maisAdiantado, p) => (!maisAdiantado || p.progresso > maisAdiantado.progresso ? p : maisAdiantado),
        null
      )
    : posicoes.find((p) => p.caminhao === selecionado);

  const progressoEmFoco   = emFoco?.progresso ?? 0;
  const status            = getStatus(progressoEmFoco);
  const distanciaRestante = (DISTANCIA_TOTAL * (100 - progressoEmFoco) / 100).toFixed(1);
  const tempoRestante     = Math.round(TEMPO_TOTAL * (100 - progressoEmFoco) / 100);

  // Dados cadastrais do caminhao em foco. Antes placa e motorista eram fixos
  // no codigo (ABC-1234 e João Silva), iguais para qualquer viagem.
  const dadosCaminhao = emFoco ? acharCaminhao(frota, emFoco.caminhao) : null;

  // Grid de informações do card
  const infoItems = [
    { icone: 'car-outline',         label: somenteLeitura ? 'PRÓXIMO' : 'CAMINHÃO',
                                    valor: emFoco ? `Caminhão ${emFoco.caminhao}` : '—'      },
    { icone: 'card-outline',        label: 'PLACA',
                                    valor: dadosCaminhao?.placa || '—'                       },
    { icone: 'person-outline',      label: 'MOTORISTA',
                                    valor: dadosCaminhao?.motorista || '—'                   },
    { icone: 'flag-outline',        label: 'DESTINO',     valor: obraNome                     },
    { icone: 'speedometer-outline', label: 'DISTÂNCIA',   valor: `${distanciaRestante} km`    },
    { icone: 'time-outline',        label: 'ETA',         valor: `${tempoRestante} min`       },
  ];

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

        {/* ── CABEÇALHO ── */}
        <View style={styles.cabecalho}>

          {/* Botão voltar circular */}
          <TouchableOpacity
            style={styles.botaoVoltar}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Título + linha decorativa */}
          <View style={styles.tituloContainer}>
            <Text style={styles.titulo}>{somenteLeitura ? 'GPS' : 'Rastrear'}</Text>
            <View style={styles.linhaDecorada} />
          </View>

          {/* Ícone de navegação — quadrado com borda */}
          <View style={styles.iconeQuadrado}>
            <Ionicons name="navigate-outline" size={22} color="#22C55E" />
          </View>

        </View>

        {/* Nome da obra */}
        <Text style={styles.nomeObra}>{obraNome}</Text>

        {/* ── MAPA ── */}
        <View style={[styles.card, styles.cardMapa]}>
          <MapaRota
            rota={ROTA}
            caminhoes={posicoes}
            destaque={somenteLeitura ? null : selecionado}
            nomeOrigem="Depósito Central"
            nomeDestino={obraNome}
            altura={280}
          />
        </View>

        {posicoes.length === 0 && (
          <View style={styles.avisoVazio}>
            <Ionicons name="information-circle-outline" size={18} color="rgba(255,255,255,0.5)" />
            <Text style={styles.avisoVazioTexto}>
              {somenteLeitura
                ? 'Nenhum caminhão a caminho desta obra.'
                : 'Nenhum caminhão despachado ainda. Use "Enviar Caminhão" no menu.'}
            </Text>
          </View>
        )}

        {/* ── SELETOR DE CAMINHAO ── */}
        {/* So a construtora, e so quando ha mais de um: com um caminhao so,
            o seletor seria um botao que nao decide nada */}
        {!somenteLeitura && posicoes.length > 1 && (
          <View style={styles.seletor}>
            {posicoes.map((p) => (
              <TouchableOpacity
                key={p.caminhao}
                style={[
                  styles.seletorItem,
                  p.caminhao === selecionado && {
                    borderColor: corDoCaminhao(p.caminhao),
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  },
                ]}
                onPress={() => escolherCaminhao(p.caminhao)}
                activeOpacity={0.8}
              >
                <View style={[styles.seletorPonto, { backgroundColor: corDoCaminhao(p.caminhao) }]} />
                <Text style={styles.seletorTexto}>{p.caminhao}</Text>
                <Text style={styles.seletorPct}>{Math.round(p.progresso)}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── CARD DE INFORMAÇÕES ── */}
        <View style={[styles.card, styles.cardInfo]}>

          {/* Status dinâmico */}
          <View style={styles.statusRow}>
            <Ionicons name={status.icone} size={18} color={status.cor} />
            <Text style={[styles.statusTxt, { color: status.cor }]}>
              {'  '}{status.texto}
            </Text>
          </View>

          <View style={styles.separador} />

          {/* Grid 2 colunas com as 6 informações */}
          <View style={styles.infoGrid}>
            {infoItems.map((item) => (
              <View key={item.label} style={styles.infoItem}>
                <Ionicons name={item.icone} size={14} color="rgba(255,255,255,0.45)" />
                <View style={styles.infoTextos}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValor} numberOfLines={1}>{item.valor}</Text>
                </View>
              </View>
            ))}
          </View>

        </View>

        {/* ── BOTÕES DE CONTROLE ── */}
        {/* So a construtora: a betoneira e dela. O mestre acompanha e nao
            controla, entao para ele estes botoes nem sao desenhados. */}
        {/* Os controles agem sobre o caminhao selecionado, nao sobre a obra */}
        {!somenteLeitura && emFoco && (
        <View style={styles.botoesControle}>

          {/* ▶️ Iniciar */}
          <TouchableOpacity
            style={[styles.botaoControle, styles.botaoIniciar]}
            onPress={() => {
              if (progressoEmFoco >= 100) return;
              setSimulando(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={15} color="#fff" />
            <Text style={styles.botaoControleTxt}>  Iniciar</Text>
          </TouchableOpacity>

          {/* ⏸️ Pausar */}
          <TouchableOpacity
            style={[styles.botaoControle, styles.botaoPausar]}
            onPress={() => {
              setSimulando(false);
              moverSelecionado(progressoEmFoco, false);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="pause" size={15} color="#fff" />
            <Text style={styles.botaoControleTxt}>  Pausar</Text>
          </TouchableOpacity>

          {/* 🔄 Resetar */}
          <TouchableOpacity
            style={[styles.botaoControle, styles.botaoResetar]}
            onPress={() => {
              setSimulando(false);
              moverSelecionado(0, false);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={15} color="#fff" />
            <Text style={styles.botaoControleTxt}>  Resetar</Text>
          </TouchableOpacity>

        </View>
        )}

        <Text style={styles.notaDemonstracao}>
          {somenteLeitura
            ? '* Posição enviada pela construtora — LoRa em integração'
            : '* Trajeto simulado — LoRa em integração'}
        </Text>

      </ScrollView>
    </LinearGradient>
  );
}

// ── ESTILOS ──
const styles = StyleSheet.create({

  container: { flex: 1 },

  scrollContent: {
    flexGrow: 1,
    paddingTop: 56,
    paddingBottom: 24,
  },

  // ── CABEÇALHO ──
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 4,
  },

  botaoVoltar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(26, 86, 219, 0.7)',
    borderWidth: 1.5, borderColor: 'rgba(34, 197, 94, 0.45)',
    alignItems: 'center', justifyContent: 'center',
  },

  tituloContainer: { alignItems: 'center' },

  titulo: {
    fontSize: 36, fontWeight: 'bold', color: '#fff',
    letterSpacing: 2, marginBottom: 5,
  },

  linhaDecorada: {
    width: 44, height: 3, backgroundColor: '#22C55E', borderRadius: 2,
  },

  iconeQuadrado: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: 'rgba(26, 86, 219, 0.5)',
    borderWidth: 1.5, borderColor: 'rgba(34, 197, 94, 0.45)',
    alignItems: 'center', justifyContent: 'center',
  },

  nomeObra: {
    color: 'rgba(255,255,255,0.55)', fontSize: 13,
    textAlign: 'center', marginBottom: 16, letterSpacing: 0.4,
  },

  // ── BASE CARD ──
  card: {
    backgroundColor: 'rgba(11, 32, 101, 0.72)',
    borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.28)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },

  // ── CARD MAPA ──
  cardMapa: {
    marginHorizontal: 16,
    marginBottom: 14,
    overflow: 'hidden',   // garante que o mapa respeita borderRadius
    padding: 0,
  },

  // ── CARD INFO ──
  cardInfo: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 16,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  statusTxt: {
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },

  separador: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 10,
  },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  infoItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    paddingRight: 8,
    gap: 6,
  },

  infoTextos: { flex: 1 },

  infoLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginBottom: 1,
  },

  infoValor: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // ── AVISO DE LISTA VAZIA ──
  avisoVazio: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 14,
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
  },

  avisoVazioTexto: { color: 'rgba(255,255,255,0.6)', fontSize: 12.5, flex: 1 },

  // ── SELETOR DE CAMINHÃO ──
  seletor: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, marginBottom: 14,
  },

  seletorItem: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingVertical: 9, paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
  },

  seletorPonto: { width: 9, height: 9, borderRadius: 5 },

  seletorTexto: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  seletorPct: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },

  // ── BOTÕES DE CONTROLE ──
  botoesControle: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 24,
  },

  botaoControle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },

  botaoIniciar: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: '#22C55E',
  },

  botaoPausar: {
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    borderColor: '#FACC15',
  },

  botaoResetar: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3B82F6',
  },

  botaoControleTxt: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },


  notaDemonstracao: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11, textAlign: 'center',
    fontStyle: 'italic', marginBottom: 4,
  },
});
