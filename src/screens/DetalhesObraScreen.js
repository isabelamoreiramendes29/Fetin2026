// Tela Detalhes da Obra — tudo que foi cadastrado, e o andamento
// Fluxo: MenuMestre → toque no nome da obra → Detalhes (esta tela)
// Recebe obraId e obraNome via route.params
//
// Existe porque os dados da obra eram escritos e nunca lidos. O cadastro pede
// CEP, endereco, numero, data de inicio, data de termino e volume — e depois
// disso nada aparecia em lugar nenhum. Pedir dado que ninguem consulta e
// pedir a toa.
//
// Alem de mostrar o cadastro, reune o andamento: quanto do prazo passou,
// quanto de concreto ja chegou, e quantas entregas e alertas a obra tem.

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

import { useObras } from '../context/ObrasContext';
import { useCaminhoes } from '../context/CaminhoesContext';
import { buscarCompras } from '../services/financeiro';
import { totalEntregue } from '../services/caminhoes';
import { buscarAlertas } from '../services/alertas';
import { buscarPlanta } from '../services/planta';

// Datas do banco vem como 'AAAA-MM-DD'. Montar Date direto disso interpreta
// como UTC, e no fuso do Brasil isso mostra o dia anterior — por isso a
// separacao na mao.
function partesData(iso) {
  if (!iso) return null;
  const [ano, mes, dia] = String(iso).slice(0, 10).split('-').map(Number);
  return { ano, mes, dia };
}

function formatarData(iso) {
  const p = partesData(iso);
  if (!p) return '—';
  return `${String(p.dia).padStart(2, '0')}/${String(p.mes).padStart(2, '0')}/${p.ano}`;
}

// Data local a meia-noite, para contas de prazo sem surpresa de fuso
function paraDataLocal(iso) {
  const p = partesData(iso);
  return p ? new Date(p.ano, p.mes - 1, p.dia) : null;
}

const DIA_MS = 86400000;

export default function DetalhesObraScreen({ navigation, route }) {
  const { obraId } = route.params;

  const { obras } = useObras();
  const { caminhoes } = useCaminhoes();

  const [compras, setCompras]       = useState([]);
  const [alertas, setAlertas]       = useState([]);
  const [areas, setAreas]           = useState(0);
  const [carregando, setCarregando] = useState(true);

  const obra = obras.find((o) => o.id === String(obraId));

  const carregar = useCallback(async () => {
    setCarregando(true);

    // Cada consulta e independente: uma falhar nao pode esconder as outras
    const [resCompras, resAlertas, resPlanta] = await Promise.allSettled([
      buscarCompras(obraId),
      buscarAlertas(obraId),
      buscarPlanta(obraId),
    ]);

    if (resCompras.status === 'fulfilled') setCompras(resCompras.value);
    if (resAlertas.status === 'fulfilled') setAlertas(resAlertas.value);
    if (resPlanta.status === 'fulfilled' && resPlanta.value) {
      setAreas(resPlanta.value.regioes.length);
    }

    setCarregando(false);
  }, [obraId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // ── VOLUMES ──
  const volumePlanejado = Number(obra?.volumeCimento) || 0;
  const volumeComprado  = compras.reduce((s, c) => s + c.volume, 0);
  const volumeEntregue  = totalEntregue(caminhoes, obraId);

  const pctVolume = volumePlanejado > 0
    ? Math.min(Math.round((volumeEntregue / volumePlanejado) * 100), 100)
    : 0;

  // ── PRAZO ──
  const inicio  = paraDataLocal(obra?.dataInicio);
  const termino = paraDataLocal(obra?.dataTermino);
  const hoje    = new Date();
  hoje.setHours(0, 0, 0, 0);

  let pctPrazo = 0;
  let textoPrazo = 'Prazo não informado';
  let corPrazo = 'rgba(255,255,255,0.5)';

  if (inicio && termino) {
    const totalDias = Math.max(Math.round((termino - inicio) / DIA_MS), 1);
    const corridos  = Math.round((hoje - inicio) / DIA_MS);
    const restantes = Math.round((termino - hoje) / DIA_MS);

    pctPrazo = Math.min(Math.max(Math.round((corridos / totalDias) * 100), 0), 100);

    if (restantes < 0) {
      textoPrazo = `Prazo vencido há ${Math.abs(restantes)} dia(s)`;
      corPrazo = '#DC2626';
    } else if (corridos < 0) {
      textoPrazo = `Começa em ${Math.abs(corridos)} dia(s)`;
      corPrazo = 'rgba(255,255,255,0.6)';
    } else {
      textoPrazo = `Faltam ${restantes} de ${totalDias} dias`;
      corPrazo = restantes <= 30 ? '#FACC15' : '#22C55E';
    }
  }

  const enderecoCompleto = obra
    ? [obra.endereco, obra.numero, obra.complemento, obra.cep].filter(Boolean).join(', ')
    : '';

  const criticos = alertas.filter((a) => a.severidade === 'critica').length;

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
            <Text style={styles.titulo}>Dados da Obra</Text>
            <View style={styles.linhaDecorada} />
          </View>

          <View style={styles.iconeQuadrado}>
            <MaterialCommunityIcons name="office-building-outline" size={22} color="#22C55E" />
          </View>
        </View>

        {!obra ? (
          <View style={styles.estadoVazio}>
            <Ionicons name="alert-circle-outline" size={44} color="rgba(255,255,255,0.35)" />
            <Text style={styles.estadoVazioTexto}>Obra não encontrada.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.nomeObra}>{obra.nome}</Text>

            {/* ── ENDERECO ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>ENDEREÇO</Text>

              <View style={styles.linha}>
                <Ionicons name="location-outline" size={17} color="#22C55E" />
                <Text style={styles.linhaTexto}>{enderecoCompleto || 'Não informado'}</Text>
              </View>

              <View style={styles.linha}>
                <Ionicons name="mail-outline" size={17} color="#22C55E" />
                <Text style={styles.linhaTexto}>
                  {obra.emailConstrutora || 'Construtora não informada'}
                </Text>
              </View>
            </View>

            {/* ── PRAZO ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>PRAZO</Text>

              <View style={styles.duasDatas}>
                <View style={styles.dataColuna}>
                  <Text style={styles.dataLabel}>INÍCIO</Text>
                  <Text style={styles.dataValor}>{formatarData(obra.dataInicio)}</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.3)" />
                <View style={styles.dataColuna}>
                  <Text style={styles.dataLabel}>TÉRMINO</Text>
                  <Text style={styles.dataValor}>{formatarData(obra.dataTermino)}</Text>
                </View>
              </View>

              <View style={styles.barraTrilho}>
                <View style={[styles.barraPreenchimento, { width: `${pctPrazo}%`, backgroundColor: corPrazo }]} />
              </View>

              <Text style={[styles.barraLegenda, { color: corPrazo }]}>{textoPrazo}</Text>
            </View>

            {/* ── CONCRETO ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>CONCRETO</Text>

              <View style={styles.tresColunas}>
                <View style={styles.coluna}>
                  <Text style={styles.colunaLabel}>PLANEJADO</Text>
                  <Text style={styles.colunaValor}>{volumePlanejado.toFixed(1)}</Text>
                </View>
                <View style={styles.coluna}>
                  <Text style={styles.colunaLabel}>COMPRADO</Text>
                  <Text style={styles.colunaValor}>{volumeComprado.toFixed(1)}</Text>
                </View>
                <View style={styles.coluna}>
                  <Text style={styles.colunaLabel}>ENTREGUE</Text>
                  <Text style={[styles.colunaValor, { color: '#22C55E' }]}>
                    {volumeEntregue.toFixed(1)}
                  </Text>
                </View>
              </View>

              <Text style={styles.unidade}>metros cúbicos</Text>

              <View style={styles.barraTrilho}>
                <View style={[styles.barraPreenchimento, { width: `${pctVolume}%`, backgroundColor: '#22C55E' }]} />
              </View>

              <Text style={styles.barraLegenda}>
                {pctVolume}% do volume planejado já foi entregue
              </Text>
            </View>

            {/* ── ANDAMENTO ── */}
            <View style={styles.contadores}>
              <TouchableOpacity
                style={styles.contador}
                onPress={() => navigation.navigate('MapaConcretagem', {
                  obraId, obraNome: obra.nome, somenteLeitura: true,
                })}
                activeOpacity={0.85}
              >
                <Text style={styles.contadorValor}>{areas}</Text>
                <Text style={styles.contadorLabel}>ÁREAS</Text>
              </TouchableOpacity>

              <View style={styles.contador}>
                <Text style={styles.contadorValor}>
                  {caminhoes.filter((c) => c.obraId === String(obraId)).length}
                </Text>
                <Text style={styles.contadorLabel}>ENTREGAS</Text>
              </View>

              <TouchableOpacity
                style={styles.contador}
                onPress={() => navigation.navigate('Alertas', { obraId, obraNome: obra.nome })}
                activeOpacity={0.85}
              >
                <Text style={[styles.contadorValor, criticos > 0 && { color: '#DC2626' }]}>
                  {alertas.length}
                </Text>
                <Text style={styles.contadorLabel}>ALERTAS</Text>
              </TouchableOpacity>
            </View>

            {carregando && (
              <ActivityIndicator size="small" color="#22C55E" style={{ marginTop: 16 }} />
            )}
          </>
        )}

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
    paddingHorizontal: 24, marginBottom: 6,
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
    letterSpacing: 0.3, marginBottom: 5,
  },

  linhaDecorada: { width: 44, height: 3, backgroundColor: '#22C55E', borderRadius: 2 },

  iconeQuadrado: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: 'rgba(26, 86, 219, 0.5)',
    borderWidth: 1.5, borderColor: 'rgba(34, 197, 94, 0.45)',
    alignItems: 'center', justifyContent: 'center',
  },

  nomeObra: {
    color: '#fff', fontSize: 19, fontWeight: 'bold',
    textAlign: 'center', marginTop: 8, marginBottom: 20,
    paddingHorizontal: 24,
  },

  // ── CARDS ──
  card: {
    backgroundColor: 'rgba(11, 32, 101, 0.72)',
    borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.28)',
    borderRadius: 16,
    marginHorizontal: 16, marginBottom: 14,
    padding: 16,
  },

  cardTitulo: {
    color: '#22C55E', fontSize: 10.5, fontWeight: 'bold',
    letterSpacing: 1.3, marginBottom: 14,
  },

  linha: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },

  linhaTexto: { color: '#fff', fontSize: 13.5, lineHeight: 19, flex: 1 },

  // ── PRAZO ──
  duasDatas: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },

  dataColuna: { alignItems: 'center', flex: 1 },

  dataLabel: {
    color: 'rgba(255,255,255,0.45)', fontSize: 9,
    fontWeight: 'bold', letterSpacing: 1, marginBottom: 4,
  },

  dataValor: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // ── VOLUMES ──
  tresColunas: { flexDirection: 'row' },

  coluna: { flex: 1, alignItems: 'center' },

  colunaLabel: {
    color: 'rgba(255,255,255,0.45)', fontSize: 9,
    fontWeight: 'bold', letterSpacing: 0.9, marginBottom: 4,
  },

  colunaValor: { color: '#fff', fontSize: 20, fontWeight: 'bold' },

  unidade: {
    color: 'rgba(255,255,255,0.35)', fontSize: 10,
    textAlign: 'center', marginTop: 3, marginBottom: 14,
  },

  // ── BARRA ──
  barraTrilho: {
    height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },

  barraPreenchimento: { height: '100%', borderRadius: 4 },

  barraLegenda: {
    color: 'rgba(255,255,255,0.55)', fontSize: 12,
    textAlign: 'center', marginTop: 9,
  },

  // ── CONTADORES ──
  contadores: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16,
  },

  contador: {
    flex: 1, alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: 'rgba(11, 32, 101, 0.72)',
    borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.28)',
    borderRadius: 16,
  },

  contadorValor: { color: '#fff', fontSize: 22, fontWeight: 'bold' },

  contadorLabel: {
    color: 'rgba(255,255,255,0.5)', fontSize: 8.5,
    fontWeight: 'bold', letterSpacing: 0.9, marginTop: 3,
  },

  // ── ESTADO VAZIO ──
  estadoVazio: {
    marginHorizontal: 16, paddingVertical: 48,
    alignItems: 'center', justifyContent: 'center',
  },

  estadoVazioTexto: {
    color: 'rgba(255,255,255,0.5)', fontSize: 13,
    textAlign: 'center', marginTop: 12,
  },
});
