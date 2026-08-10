// Tela de Temperatura — exibe o velocimetro com a temperatura atual do cimento
// Fluxo: SelecionarObra → MenuObra → Temperatura (esta tela)
// Recebe obraId e obraNome via route.params
//
// O valor exibido e a ULTIMA LEITURA GRAVADA da obra, consultada no banco.
// Enquanto o sensor publicava por MQTT, ele chegava sozinho pelo broker; a
// integracao sera refeita quando o hardware estiver disponivel. Quando voltar,
// o sensor passa a gravar na mesma tabela e esta tela nao muda.
//
// Os botoes de simulacao gravam uma leitura de verdade — e o que permite
// demonstrar a tela e alimentar o Historico sem o sensor ligado.

import React, { useState, useEffect, useCallback } from 'react';
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
import { buscarCompras } from '../services/financeiro';
import { totalEntregue } from '../services/caminhoes';
import { useObras } from '../context/ObrasContext';
import { useCaminhoes } from '../context/CaminhoesContext';

// De quanto em quanto tempo a tela reconsulta a ultima leitura
const INTERVALO_CONSULTA_MS = 5000;

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
  const { obraId, obraNome } = route.params;

  // 75 °C (zona NORMAL) e so o valor mostrado ate a primeira consulta voltar
  const [temperatura, setTemperatura] = useState(75);

  // Quando a leitura exibida foi medida. null = a obra ainda nao tem leitura.
  const [medidoEm, setMedidoEm] = useState(null);

  // Fontes dos tres volumes: a obra traz o planejado, as compras trazem o
  // comprado, e os envios trazem o que o sensor mediu na descarga
  const { obras } = useObras();
  const { caminhoes } = useCaminhoes();
  const [compras, setCompras] = useState([]);

  useEffect(() => {
    if (!obraId) return;
    buscarCompras(obraId)
      .then(setCompras)
      .catch((falha) => console.warn('[Temperatura] Compras:', falha.message));
  }, [obraId]);

  // Busca a ultima leitura gravada da obra
  const carregar = useCallback(async () => {
    if (!obraId) {
      console.warn('[Temperatura] Nenhuma obra selecionada!');
      return;
    }

    try {
      const ultima = await buscarUltimaLeitura(obraId);
      if (!ultima) return;

      setTemperatura(ultima.temperatura);
      setMedidoEm(ultima.medidoEm);
    } catch (falha) {
      console.warn('[Temperatura]', falha.message);
    }
  }, [obraId]);

  // Consulta ao abrir e periodicamente: quem grava as leituras e outro
  // processo, entao a tela precisa perguntar de tempos em tempos
  useEffect(() => {
    carregar();
    const intervalo = setInterval(carregar, INTERVALO_CONSULTA_MS);
    return () => clearInterval(intervalo);
  }, [carregar]);

  // Botao de simulacao: grava uma leitura de verdade, para a tela e o Historico
  // se comportarem exatamente como se comportarao com o sensor ligado
  async function simularLeitura(valor) {
    setTemperatura(valor);
    setMedidoEm(new Date().toISOString());
    await salvarLeitura(obraId, valor);
  }

  // Derivados da temperatura atual
  const zonaAtual = obterZona(temperatura);
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
  const porcentagemVolume = volumePlanejado > 0
    ? Math.round((volumeEntregue / volumePlanejado) * 100)
    : 0;

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

        {/* ── QUANDO A LEITURA EXIBIDA FOI FEITA ── */}
        <View style={styles.statusMQTT}>
          <View style={[
            styles.bolinhaStatus,
            { backgroundColor: medidoEm ? '#22C55E' : '#FACC15' }
          ]} />
          <Text style={styles.textoStatus}>
            {medidoEm
              ? `Última leitura ${formatarQuando(medidoEm)}`
              : 'Nenhuma leitura registrada nesta obra'}
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
        {/* Gravam uma leitura de verdade, e nao so mudam o mostrador: assim a
            tela e o Historico se comportam igual ao que farao com o sensor.
            Saem quando o hardware estiver integrado. */}
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
