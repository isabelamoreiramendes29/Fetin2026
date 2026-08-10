// Tela Historico de Entregas — todas as viagens feitas para uma obra
// Fluxo: MenuConstrutora → HistoricoEntregas (esta tela)
// Recebe obraId e obraNome via route.params
//
// Cada linha e uma viagem: qual caminhao, quando saiu, e quanto descarregou.
// O total descarregado e comparado com o volume planejado da obra — a mesma
// conta que a tela de Temperatura mostra, aqui vista pelo lado de quem entrega.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useCaminhoes } from '../context/CaminhoesContext';
import { useObras } from '../context/ObrasContext';
import { buscarFrota, acharCaminhao } from '../services/frota';
import { corDoCaminhao } from '../services/planta';

// Formata a data ISO para "DD/MM às HH:mm"
function formatarDataHora(iso) {
  const data = new Date(iso);
  const dia = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} às ${hora}`;
}

export default function HistoricoEntregasScreen({ navigation, route }) {
  const { obraId, obraNome } = route.params || {};

  const { caminhoes, carregando } = useCaminhoes();
  const { obras } = useObras();

  // A frota traz placa e motorista de cada caminhao
  const [frota, setFrota] = useState([]);

  useEffect(() => {
    buscarFrota()
      .then(setFrota)
      .catch((falha) => console.warn('[HistoricoEntregas] Frota:', falha.message));
  }, []);

  // So as viagens desta obra, das mais recentes para as mais antigas
  const entregas = caminhoes.filter((e) => e.obraId === String(obraId));

  const obra = obras.find((o) => o.id === String(obraId));
  const volumePlanejado = Number(obra?.volumeCimento) || 0;

  const medidas = entregas.filter((e) => e.volumeEntregue !== null);
  const totalEntregue = medidas.reduce((soma, e) => soma + e.volumeEntregue, 0);
  const emTransito = entregas.length - medidas.length;

  const porcentagem = volumePlanejado > 0
    ? Math.min(Math.round((totalEntregue / volumePlanejado) * 100), 100)
    : 0;

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
          <TouchableOpacity
            style={styles.botaoVoltar}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.tituloContainer}>
            <Text style={styles.titulo}>{'Histórico de\nEntregas'}</Text>
            <View style={styles.linhaDecorada} />
          </View>

          <View style={styles.iconeQuadrado}>
            <MaterialCommunityIcons name="clipboard-list-outline" size={22} color="#22C55E" />
          </View>
        </View>

        <Text style={styles.nomeObra}>{obraNome}</Text>

        {/* ── RESUMO ── */}
        {entregas.length > 0 && (
          <>
            <View style={styles.resumoLinha}>
              <View style={[styles.card, styles.cardResumo]}>
                <Text style={styles.resumoValor}>{entregas.length}</Text>
                <Text style={styles.resumoLabel}>VIAGENS</Text>
              </View>
              <View style={[styles.card, styles.cardResumo]}>
                <Text style={[styles.resumoValor, { color: '#22C55E' }]}>
                  {totalEntregue.toFixed(1)}
                </Text>
                <Text style={styles.resumoLabel}>M³ ENTREGUES</Text>
              </View>
              <View style={[styles.card, styles.cardResumo]}>
                <Text style={[styles.resumoValor, { color: emTransito > 0 ? '#FACC15' : '#22C55E' }]}>
                  {emTransito}
                </Text>
                <Text style={styles.resumoLabel}>EM TRÂNSITO</Text>
              </View>
            </View>

            {/* Avanco em direcao ao volume que a obra precisa */}
            {volumePlanejado > 0 && (
              <View style={[styles.card, styles.cardProgresso]}>
                <View style={styles.progressoTopo}>
                  <Text style={styles.progressoLabel}>
                    {totalEntregue.toFixed(1)} de {volumePlanejado.toFixed(1)} m³ planejados
                  </Text>
                  <Text style={styles.progressoPct}>{porcentagem}%</Text>
                </View>
                <View style={styles.barraTrilho}>
                  <View style={[styles.barraPreenchimento, { width: `${porcentagem}%` }]} />
                </View>
              </View>
            )}
          </>
        )}

        {/* ── ESTADOS ── */}
        {carregando && (
          <View style={styles.estadoVazio}>
            <ActivityIndicator size="large" color="#22C55E" />
            <Text style={styles.estadoVazioTexto}>Carregando entregas...</Text>
          </View>
        )}

        {!carregando && entregas.length === 0 && (
          <View style={styles.estadoVazio}>
            <MaterialCommunityIcons
              name="truck-remove-outline"
              size={48}
              color="rgba(255,255,255,0.35)"
            />
            <Text style={styles.estadoVazioTitulo}>Nenhuma entrega ainda</Text>
            <Text style={styles.estadoVazioTexto}>
              As viagens aparecem aqui assim que você despachar um caminhão para esta obra.
            </Text>
          </View>
        )}

        {/* ── LISTA DE ENTREGAS ── */}
        {!carregando && entregas.map((entrega) => {
          const dados = acharCaminhao(frota, entrega.caminhao);
          const descarregou = entrega.volumeEntregue !== null;
          const cor = corDoCaminhao(entrega.caminhao);

          return (
            <View key={entrega.id} style={[styles.card, styles.cardEntrega]}>

              <View style={[styles.identificacao, { backgroundColor: cor }]}>
                <Text style={styles.identificacaoTexto}>{entrega.caminhao}</Text>
              </View>

              <View style={styles.entregaDados}>
                <Text style={styles.entregaPlaca}>
                  {dados?.placa || `Caminhão ${entrega.caminhao}`}
                </Text>
                {!!dados?.motorista && (
                  <Text style={styles.entregaMotorista}>{dados.motorista}</Text>
                )}
                <Text style={styles.entregaData}>{formatarDataHora(entrega.dataEnvio)}</Text>
              </View>

              <View style={styles.entregaVolume}>
                {descarregou ? (
                  <>
                    <Text style={styles.entregaVolumeValor}>{entrega.volumeEntregue}</Text>
                    <Text style={styles.entregaVolumeUnidade}>m³</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="time-outline" size={20} color="#FACC15" />
                    <Text style={styles.entregaPendente}>a caminho</Text>
                  </>
                )}
              </View>

            </View>
          );
        })}

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({

  container: { flex: 1 },

  scrollContent: { flexGrow: 1, paddingTop: 56, paddingBottom: 32 },

  // ── CABECALHO ──
  cabecalho: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, marginBottom: 4,
  },

  botaoVoltar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(26, 86, 219, 0.7)',
    borderWidth: 1.5, borderColor: 'rgba(34, 197, 94, 0.45)',
    alignItems: 'center', justifyContent: 'center',
  },

  tituloContainer: { alignItems: 'center' },

  titulo: {
    fontSize: 22, fontWeight: 'bold', color: '#fff',
    textAlign: 'center', letterSpacing: 0.3,
    marginBottom: 5, lineHeight: 28,
  },

  linhaDecorada: { width: 44, height: 3, backgroundColor: '#22C55E', borderRadius: 2 },

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

  // ── CARDS ──
  card: {
    backgroundColor: 'rgba(11, 32, 101, 0.72)',
    borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.28)',
    borderRadius: 16,
  },

  resumoLinha: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12,
  },

  cardResumo: { flex: 1, paddingVertical: 14, alignItems: 'center' },

  resumoValor: { color: '#fff', fontSize: 22, fontWeight: 'bold' },

  resumoLabel: {
    color: 'rgba(255,255,255,0.5)', fontSize: 8.5,
    fontWeight: 'bold', letterSpacing: 0.8, marginTop: 3,
  },

  // ── BARRA DE PROGRESSO ──
  cardProgresso: {
    marginHorizontal: 16, marginBottom: 16, padding: 16,
  },

  progressoTopo: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },

  progressoLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12.5 },

  progressoPct: { color: '#22C55E', fontSize: 14, fontWeight: 'bold' },

  barraTrilho: {
    height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },

  barraPreenchimento: { height: '100%', backgroundColor: '#22C55E', borderRadius: 4 },

  // ── CARD DA ENTREGA ──
  cardEntrega: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 16, marginBottom: 10,
    paddingVertical: 14, paddingHorizontal: 16,
  },

  identificacao: {
    minWidth: 40, height: 40, borderRadius: 12, paddingHorizontal: 8,
    alignItems: 'center', justifyContent: 'center',
  },

  identificacaoTexto: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  entregaDados: { flex: 1 },

  entregaPlaca: {
    color: '#fff', fontSize: 14.5, fontWeight: '600', letterSpacing: 0.4,
  },

  entregaMotorista: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 1 },

  entregaData: { color: 'rgba(255,255,255,0.4)', fontSize: 11.5, marginTop: 3 },

  entregaVolume: { alignItems: 'center', minWidth: 56 },

  entregaVolumeValor: { color: '#22C55E', fontSize: 19, fontWeight: 'bold' },

  entregaVolumeUnidade: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },

  entregaPendente: { color: '#FACC15', fontSize: 10, marginTop: 3 },

  // ── ESTADOS VAZIOS ──
  estadoVazio: {
    marginHorizontal: 16, paddingVertical: 48, paddingHorizontal: 24,
    alignItems: 'center', justifyContent: 'center',
  },

  estadoVazioTitulo: {
    color: '#fff', fontSize: 15, fontWeight: 'bold',
    textAlign: 'center', marginTop: 14, marginBottom: 6,
  },

  estadoVazioTexto: {
    color: 'rgba(255,255,255,0.5)', fontSize: 13,
    textAlign: 'center', lineHeight: 19, marginTop: 4,
  },
});
