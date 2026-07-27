// Tela de Temperatura — exibe o velocimetro com a temperatura atual do cimento
// Fluxo: SelecionarObra → MenuObra → Temperatura (esta tela)
// Recebe obraId e obraNome via route.params

import React, { useState, useEffect } from 'react';
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
import { inscreverTemperatura } from '../services/mqtt';

const { width } = Dimensions.get('window');

// ── CONFIGURACAO DAS ZONAS DE TEMPERATURA ──
// Usada tanto nos botoes de simulacao quanto no texto de status
const ZONAS = [
  {
    nome: 'BAD',
    tempSim: 55,              // temperatura de simulacao
    cor: '#DC2626',           // vermelho
    statusTexto: 'Temperatura muito baixa',
  },
  {
    nome: 'LOW',
    tempSim: 65,
    cor: '#F97316',           // laranja
    statusTexto: 'Temperatura baixa',
  },
  {
    nome: 'NORMAL',
    tempSim: 75,
    cor: '#FACC15',           // amarelo
    statusTexto: 'Temperatura normal',
  },
  {
    nome: 'GOOD',
    tempSim: 85,
    cor: '#84CC16',           // verde claro
    statusTexto: 'Temperatura ideal',
  },
  {
    nome: 'MAX',
    tempSim: 95,
    cor: '#22C55E',           // verde escuro
    statusTexto: 'Temperatura critica alta',
  },
];

// Retorna a zona correspondente a temperatura atual
function obterZona(temp) {
  if (temp < 60) return ZONAS[0]; // BAD
  if (temp < 70) return ZONAS[1]; // LOW
  if (temp < 80) return ZONAS[2]; // NORMAL
  if (temp < 90) return ZONAS[3]; // GOOD
  return ZONAS[4];                // MAX
}

// Formata temperatura em array de 3 digitos para o display digital
// Exemplo: 78 → ['0', '7', '8']  |  100 → ['1', '0', '0']
function formatarDigitos(temp) {
  return String(Math.round(temp)).padStart(3, '0').split('');
}

// ── COMPONENTE PRINCIPAL ──
export default function TemperaturaScreen({ navigation, route }) {
  const { obraId, obraNome } = route.params;

  // Temperatura inicial simulada em 75°C (zona NORMAL)
  const [temperatura, setTemperatura] = useState(75);

  // Indica se ja chegou alguma leitura real via MQTT
  const [conectado, setConectado] = useState(false);

  // Inscreve no topico de temperatura ao montar a tela, desinscreve ao desmontar
  // Filtra pela obra atual — so atualiza quando obra_id bate com obraId
  useEffect(() => {
    if (!obraId) {
      console.warn('[Temperatura] Nenhuma obra selecionada!');
      return;
    }

    console.log(`🔵 [Temperatura] Inscrevendo para obra ${obraId}`);

    const desinscrever = inscreverTemperatura(obraId, (novaTemperatura) => {
      console.log(`🌡️🌡️🌡️ [Temperatura] CALLBACK CHAMADO com valor: ${novaTemperatura}`);
      setTemperatura(novaTemperatura);
      setConectado(true);
      console.log(`✅ [Temperatura] setTemperatura executado`);
    });

    return () => {
      if (desinscrever) desinscrever();
      setConectado(false);
    };
  }, [obraId]);

  // Volume de cimento
  const volumePlanejado = 100;
  const unidadeCimento  = 'sacos';
  const [volumeMedido, setVolumeMedido] = useState(85);

  // Derivados da temperatura atual
  const zonaAtual = obterZona(temperatura);
  const digitos   = formatarDigitos(temperatura);

  // ── DERIVADOS DO VOLUME ──
  const diffVolume        = volumeMedido - volumePlanejado;
  const porcentagemVolume = Math.round((volumeMedido / volumePlanejado) * 100);
  const larguraBarra      = Math.min(volumeMedido / volumePlanejado, 1);
  let corVolume, statusVolume, iconeVolume, detalhesVolume;
  if (Math.abs(diffVolume) <= volumePlanejado * 0.02) {
    corVolume      = '#22C55E';
    statusVolume   = 'No planejado';
    iconeVolume    = 'checkmark-circle';
    detalhesVolume = 'Volume dentro do esperado';
  } else if (diffVolume < 0) {
    corVolume      = '#FACC15';
    statusVolume   = 'Abaixo do planejado';
    iconeVolume    = 'trending-down';
    detalhesVolume = `${Math.abs(diffVolume)} ${unidadeCimento} a menos que o planejado`;
  } else {
    corVolume      = '#EF4444';
    statusVolume   = 'EXCEDIDO';
    iconeVolume    = 'trending-up';
    detalhesVolume = `${diffVolume} ${unidadeCimento} a mais que o planejado`;
  }

  console.log(`🎨 [Temperatura] Renderizando com valor: ${temperatura} | zona: ${zonaAtual.nome} | cor: ${zonaAtual.cor}`);

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
            <Text style={styles.titulo}>Temperatura</Text>
            <View style={styles.linhaDecorada} />
          </View>

          {/* Icone de termometro a direita — circulo com borda verde */}
          <View style={styles.iconeCirculo}>
            <Ionicons name="thermometer-outline" size={24} color="#22C55E" />
          </View>

        </View>

        {/* ── NOME DA OBRA ── */}
        <Text style={styles.nomeObra}>{obraNome}</Text>

        {/* ── STATUS DA CONEXAO MQTT ── */}
        <View style={styles.statusMQTT}>
          <View style={[
            styles.bolinhaStatus,
            { backgroundColor: conectado ? '#22C55E' : '#EF4444' }
          ]} />
          <Text style={styles.textoStatus}>
            {conectado ? 'Recebendo dados em tempo real' : 'Aguardando dados do sensor'}
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
        {/* Temporarios — serao removidos quando o MQTT for integrado na proxima etapa */}
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
              onPress={() => setTemperatura(zona.tempSim)}
              activeOpacity={0.75}
            >
              <Text style={styles.botaoSimNome}>{zona.nome}</Text>
              <Text style={styles.botaoSimTemp}>{zona.tempSim}°C</Text>
            </TouchableOpacity>
          ))}
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

          {/* Botoes de simulacao de volume */}
          <View style={styles.botoesVolumeContainer}>
            {[
              { label: '-15 sacos', valor: 85  },
              { label: '= 100 sacos', valor: 100 },
              { label: '+10 sacos', valor: 110 },
            ].map((btn) => (
              <TouchableOpacity
                key={btn.label}
                style={[
                  styles.botaoVolume,
                  volumeMedido === btn.valor && styles.botaoVolumeAtivo,
                ]}
                onPress={() => setVolumeMedido(btn.valor)}
                activeOpacity={0.75}
              >
                <Text style={styles.botaoVolumeTxt}>{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

        </View>

        {/* ── SILHUETA DECORATIVA DA FABRICA (rodape) ── */}
        <View style={styles.rodape}>
          <Ionicons name="business" size={90} color="rgba(255,255,255,0.08)" />
          <Ionicons name="business" size={70} color="rgba(255,255,255,0.06)" style={{ marginLeft: -20 }} />
        </View>

      </ScrollView>
    </LinearGradient>
  );
}

// ── ESTILOS ──
const styles = StyleSheet.create({

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

  // Silhueta decorativa da fabrica
  rodape: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 4,
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
