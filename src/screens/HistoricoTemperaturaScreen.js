// Tela Historico de Temperaturas — exibe grafico e tabela de medicoes
// Fluxo: MenuObra → HistoricoTemperatura (esta tela)
// Todos os dados sao FICTICIOS para apresentacao (sensor ainda nao integrado)
// Recebe obraId e obraNome via route.params

import React, { useState, useMemo } from 'react';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import GraficoHistorico from '../components/GraficoHistorico';

const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────
// GERACAO DE DADOS FICTICIOS
// Gera 11 medicoes — apenas horario comercial: 08:00 a 18:00
// A cada clique em "Atualizar", os dados sao regenerados com novos valores
// ─────────────────────────────────────────────────────────────
const gerarDadosFicticios = () => {
  const dados = [];
  let tempAtual = 75; // temperatura inicial

  for (let hora = 8; hora <= 18; hora++) {
    // Variacao suave entre -2.5 e +2.5 graus por hora
    const variacao = (Math.random() - 0.5) * 5;
    tempAtual = Math.max(60, Math.min(90, tempAtual + variacao));

    dados.push({
      hora: `${String(hora).padStart(2, '0')}:00`,
      temp: Math.round(tempAtual * 10) / 10,
    });
  }

  return dados;
};

// ─────────────────────────────────────────────────────────────
// STATUS BASEADO NA TEMPERATURA
// Retorna texto, cor e emoji conforme a faixa da medicao
// ─────────────────────────────────────────────────────────────
const getStatus = (temp) => {
  if (temp < 60) return { texto: 'Muito baixa', cor: '#DC2626', emoji: '🔴' };
  if (temp < 70) return { texto: 'Baixa',        cor: '#F97316', emoji: '🟠' };
  if (temp < 80) return { texto: 'Normal',        cor: '#FACC15', emoji: '🟡' };
  if (temp < 90) return { texto: 'Ideal',         cor: '#22C55E', emoji: '🟢' };
  return          { texto: 'Crítica',             cor: '#DC2626', emoji: '🔴' };
};

// Formata Date como DD/MM/AAAA
const formatarData = (date) => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
};

// ── COMPONENTE PRINCIPAL ──
export default function HistoricoTemperaturaScreen({ navigation, route }) {
  const { obraId, obraNome } = route.params;

  // Chave que, ao mudar, forca o useMemo a regenerar os dados
  const [chaveAtualizar, setChaveAtualizar] = useState(0);

  // Dados gerados apenas quando chaveAtualizar muda
  const dados = useMemo(() => gerarDadosFicticios(), [chaveAtualizar]);

  // ── DERIVADOS DOS DADOS ──
  const ultimaMedicao = dados[dados.length - 1]; // medicao das 18:00
  const statusUltima  = getStatus(ultimaMedicao.temp);

  const minDia   = Math.min(...dados.map((d) => d.temp));
  const maxDia   = Math.max(...dados.map((d) => d.temp));
  const mediaDia = parseFloat(
    (dados.reduce((soma, d) => soma + d.temp, 0) / dados.length).toFixed(1)
  );

  const hoje = new Date();

  // Mini-stats para os 3 cards laterais
  const miniStats = [
    { label: 'MÍNIMA', valor: minDia.toFixed(1),    cor: '#3B82F6', icone: 'arrow-down-outline' },
    { label: 'MÁXIMA', valor: maxDia.toFixed(1),    cor: '#EF4444', icone: 'arrow-up-outline'   },
    { label: 'MÉDIA',  valor: mediaDia.toFixed(1),  cor: '#22C55E', icone: 'analytics-outline'  },
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

        {/* ── CABECALHO ── */}
        <View style={styles.cabecalho}>

          {/* Botao de voltar circular */}
          <TouchableOpacity
            style={styles.botaoVoltar}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Titulo em duas linhas + linha decorativa verde */}
          <View style={styles.tituloContainer}>
            <Text style={styles.titulo}>{'Histórico de\nTemperaturas'}</Text>
            <View style={styles.linhaDecorada} />
          </View>

          {/* Icone de grafico em quadrado com borda */}
          <View style={styles.iconeQuadrado}>
            <MaterialCommunityIcons name="chart-line-variant" size={22} color="#22C55E" />
          </View>

        </View>

        {/* ── NOME DA OBRA ── */}
        <Text style={styles.nomeObra}>{obraNome}</Text>

        {/* ── ROW: ULTIMA MEDICAO + MINI STATS ── */}
        <View style={styles.rowUltimaStats}>

          {/* Card grande da ultima medicao */}
          <View style={[styles.card, styles.cardUltima]}>
            <Text style={styles.cardLabel}>ÚLTIMA MEDIÇÃO</Text>
            <Text style={[styles.tempGrande, { color: statusUltima.cor }]}>
              {ultimaMedicao.temp}°C
            </Text>
            <View style={styles.dataRow}>
              <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.5)" />
              <Text style={styles.dataTexto}> {formatarData(hoje)}</Text>
            </View>
            <View style={styles.dataRow}>
              <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.5)" />
              <Text style={styles.dataTexto}> {ultimaMedicao.hora}</Text>
            </View>
          </View>

          {/* Coluna com 3 mini-cards de estatistica */}
          <View style={styles.statsColuna}>
            {miniStats.map((s) => (
              <View key={s.label} style={[styles.card, styles.cardStat]}>
                <Ionicons name={s.icone} size={16} color={s.cor} />
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={[styles.statValor, { color: s.cor }]}>{s.valor}°</Text>
              </View>
            ))}
          </View>

        </View>

        {/* ── CARD GRAFICO ── */}
        <View style={[styles.card, styles.cardGrafico]}>
          <GraficoHistorico dados={dados} />
        </View>

        {/* ── CARD HISTORICO DETALHADO ── */}
        <View style={[styles.card, styles.cardTabela]}>

          <Text style={styles.cardTitulo}>HISTÓRICO DETALHADO</Text>

          {/* Cabecalho fixo da tabela */}
          <View style={styles.tabelaHeader}>
            <Text style={[styles.tabelaHeaderTxt, { flex: 0.9 }]}>HORÁRIO</Text>
            <Text style={[styles.tabelaHeaderTxt, { flex: 1 }]}>TEMP</Text>
            <Text style={[styles.tabelaHeaderTxt, { flex: 1.6 }]}>STATUS</Text>
          </View>

          {/* Linhas da tabela rolavel (mais recentes primeiro: 18:00 → 08:00) */}
          <ScrollView
            style={styles.tabelaScroll}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
          >
            {[...dados].reverse().map((item, i) => {
              const s = getStatus(item.temp);
              return (
                <View
                  key={item.hora}
                  style={[
                    styles.tabelaLinha,
                    i % 2 === 0 ? styles.tabelaPar : styles.tabelaImpar,
                  ]}
                >
                  <Text style={[styles.tabelaTxt, { flex: 0.9 }]}>{item.hora}</Text>
                  <Text style={[styles.tabelaTxt, styles.tabelaTxtTemp, { flex: 1, color: s.cor }]}>
                    {item.temp}°C
                  </Text>
                  <Text style={[styles.tabelaTxt, { flex: 1.6 }]}>
                    {s.emoji}  {s.texto}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

        </View>

        {/* ── BOTAO ATUALIZAR DADOS ── */}
        {/* Ao clicar: regenera todos os dados, simulando uma nova busca ao sensor */}
        <TouchableOpacity
          style={styles.botaoAtualizar}
          onPress={() => setChaveAtualizar((c) => c + 1)}
          activeOpacity={0.8}
        >
          <Text style={styles.botaoAtualizarTexto}>🔄  Atualizar dados</Text>
        </TouchableOpacity>

        {/* Nota de demonstracao */}
        <Text style={styles.notaDemonstracao}>
          * Dados de demonstração — sensor em integração
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

  // ── CABECALHO ──
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
    fontSize: 24, fontWeight: 'bold', color: '#fff',
    textAlign: 'center', letterSpacing: 0.3,
    marginBottom: 5, lineHeight: 30,
  },

  linhaDecorada: {
    width: 44, height: 3, backgroundColor: '#22C55E', borderRadius: 2,
  },

  // Quadrado com icone de grafico (diferente do circulo das outras telas)
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

  // ── BASE PARA TODOS OS CARDS ──
  card: {
    backgroundColor: 'rgba(11, 32, 101, 0.72)',
    borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.28)',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },

  // ── ROW ULTIMA MEDICAO + STATS ──
  rowUltimaStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 14,
    alignItems: 'stretch',
  },

  cardUltima: {
    flex: 1.2, padding: 14,
    alignItems: 'center', justifyContent: 'center',
  },

  cardLabel: {
    color: 'rgba(255,255,255,0.5)', fontSize: 9,
    fontWeight: 'bold', letterSpacing: 1.2, marginBottom: 6,
  },

  tempGrande: { fontSize: 32, fontWeight: 'bold', marginBottom: 8 },

  dataRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },

  dataTexto: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },

  statsColuna: { flex: 1, gap: 10, justifyContent: 'space-between' },

  cardStat: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 8,
    alignItems: 'center', justifyContent: 'center',
  },

  statLabel: {
    color: 'rgba(255,255,255,0.5)', fontSize: 8,
    fontWeight: 'bold', letterSpacing: 0.8, marginTop: 2,
  },

  statValor: { fontSize: 20, fontWeight: 'bold', marginTop: 1 },

  // ── CARD GRAFICO ──
  cardGrafico: {
    marginHorizontal: 16, marginBottom: 14,
    paddingVertical: 16, paddingHorizontal: 4,
    alignItems: 'center',
  },

  // ── CARD TABELA ──
  cardTabela: {
    marginHorizontal: 16, marginBottom: 14, padding: 14,
  },

  cardTitulo: {
    color: '#22C55E', fontSize: 11, fontWeight: 'bold',
    letterSpacing: 1.5, textAlign: 'center', marginBottom: 10,
  },

  tabelaHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 6,
    paddingVertical: 8, paddingHorizontal: 10, marginBottom: 2,
  },

  tabelaHeaderTxt: {
    color: '#22C55E', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5,
  },

  tabelaScroll: { height: 240 }, // 11 linhas x ~36px = ~396px — altura fixa para rolar

  tabelaLinha: {
    flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 4,
  },

  tabelaPar:   { backgroundColor: 'rgba(255,255,255,0.04)' },
  tabelaImpar: { backgroundColor: 'rgba(255,255,255,0.09)' },

  tabelaTxt: { color: '#fff', fontSize: 12 },

  tabelaTxtTemp: { fontWeight: 'bold' },

  // ── BOTAO ATUALIZAR ──
  botaoAtualizar: {
    alignSelf: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
    borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.55)',
    borderRadius: 20,
    paddingHorizontal: 28, paddingVertical: 11, marginBottom: 24,
  },

  botaoAtualizarTexto: {
    color: '#22C55E', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5,
  },


  notaDemonstracao: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11, textAlign: 'center',
    fontStyle: 'italic', marginBottom: 4,
  },
});
