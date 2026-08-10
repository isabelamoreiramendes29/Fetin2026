// Tela Previsao de Resistencia — estima o MPa de uma peca antes dos 28 dias
// Fluxo: MenuMestre → PrevisaoResistencia (esta tela)
// Recebe obraId e obraNome via route.params
//
// Como funciona: cada area do Mapa de Concretagem tem uma data de concretagem.
// Integrando a curva de temperatura da obra a partir dessa data, sai a
// maturidade daquela peca. As areas ja rompidas dao pares de
// (maturidade, resistencia real) — e desses pares sai a curva de calibracao.
//
// Com a curva pronta, a maturidade de uma area ainda nao rompida vira uma
// estimativa de resistencia. Isso responde "esta laje ja pode ser desformada?"
// medindo, em vez de esperar o calendario.
//
// A tela nunca mostra estimativa sem mostrar tambem o quanto a calibracao vale.

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

import { buscarPlanta, corDoCaminhao } from '../services/planta';
import { buscarLeiturasBrutas } from '../services/historico';
import {
  calcularMaturidade,
  ajustarCurva,
  estimarResistencia,
  maturidadePara,
  avaliarConfianca,
  formatarMaturidade,
} from '../services/maturidade';

function formatarData(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function PrevisaoResistenciaScreen({ navigation, route }) {
  const { obraId, obraNome } = route.params;

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]             = useState(null);
  const [planta, setPlanta]         = useState(null);
  const [areas, setAreas]           = useState([]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const dadosPlanta = await buscarPlanta(obraId);

      if (!dadosPlanta) {
        setPlanta(null);
        setAreas([]);
        return;
      }

      setPlanta(dadosPlanta);

      // Para cada area, integra a temperatura da obra desde a concretagem dela.
      // Area ja rompida para no dia do rompimento; area pendente vai ate agora.
      const comMaturidade = await Promise.all(
        dadosPlanta.regioes.map(async (regiao) => {
          const leituras = await buscarLeiturasBrutas(
            obraId,
            regiao.dataConcretagem,
            regiao.dataRompimento || null
          );

          return {
            ...regiao,
            maturidade: calcularMaturidade(leituras),
            leituras: leituras.length,
          };
        })
      );

      setAreas(comMaturidade);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setCarregando(false);
    }
  }, [obraId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // ── CALIBRACAO ──
  // So as areas rompidas entram: sao elas que trazem resistencia medida
  const ensaios = areas
    .filter((a) => a.resultadoMpa !== null && a.maturidade > 0)
    .map((a) => ({ maturidade: a.maturidade, resistencia: a.resultadoMpa, caminhao: a.caminhao }));

  const curva = ajustarCurva(ensaios);
  const confianca = avaliarConfianca(curva);

  const pendentes = areas.filter((a) => a.resultadoMpa === null);

  // Maturidade necessaria para atingir o fck do projeto
  const maturidadeAlvo = planta ? maturidadePara(planta.fckProjeto, curva) : null;

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
            <Text style={styles.titulo}>{'Previsão de\nResistência'}</Text>
            <View style={styles.linhaDecorada} />
          </View>

          <View style={styles.iconeQuadrado}>
            <MaterialCommunityIcons name="chart-bell-curve" size={22} color="#22C55E" />
          </View>
        </View>

        <Text style={styles.nomeObra}>{obraNome}</Text>

        {/* ── ESTADOS ── */}
        {carregando && (
          <View style={styles.estadoVazio}>
            <ActivityIndicator size="large" color="#22C55E" />
            <Text style={styles.estadoVazioTexto}>Calculando maturidade...</Text>
          </View>
        )}

        {!carregando && erro && (
          <View style={styles.estadoVazio}>
            <Ionicons name="cloud-offline-outline" size={44} color="rgba(255,255,255,0.35)" />
            <Text style={styles.estadoVazioTexto}>{erro}</Text>
          </View>
        )}

        {!carregando && !erro && !planta && (
          <View style={styles.estadoVazio}>
            <MaterialCommunityIcons name="floor-plan" size={48} color="rgba(255,255,255,0.35)" />
            <Text style={styles.estadoVazioTitulo}>Sem áreas para analisar</Text>
            <Text style={styles.estadoVazioTexto}>
              A previsão usa as áreas marcadas no Mapa de Concretagem. A construtora ainda não
              cadastrou a planta desta obra.
            </Text>
          </View>
        )}

        {!carregando && !erro && planta && (
          <>
            {/* ── COMO A CALIBRACAO ESTA ── */}
            <View style={[styles.card, styles.cardCalibracao]}>
              <View style={styles.calibracaoTopo}>
                <View style={[styles.pontoConfianca, { backgroundColor: confianca.cor }]} />
                <Text style={[styles.calibracaoTitulo, { color: confianca.cor }]}>
                  {confianca.texto}
                </Text>
              </View>
              <Text style={styles.calibracaoDetalhe}>{confianca.detalhe}</Text>

              {curva && (
                <>
                  <View style={styles.separador} />
                  <View style={styles.formulaLinha}>
                    <Text style={styles.formulaLabel}>CURVA AJUSTADA</Text>
                    <Text style={styles.formula}>
                      S = {curva.a.toFixed(1)} + {curva.b.toFixed(1)} · ln(M)
                    </Text>
                  </View>
                  {maturidadeAlvo && (
                    <Text style={styles.calibracaoDetalhe}>
                      Para atingir os {planta.fckProjeto} MPa do projeto, é preciso acumular{' '}
                      {formatarMaturidade(maturidadeAlvo)}.
                    </Text>
                  )}
                </>
              )}
            </View>

            {/* ── ENSAIOS QUE CALIBRARAM ── */}
            {ensaios.length > 0 && (
              <View style={[styles.card, styles.cardLista]}>
                <Text style={styles.cardTitulo}>ENSAIOS DE CALIBRAÇÃO</Text>

                {ensaios.map((ensaio, indice) => (
                  <View key={indice} style={styles.linhaEnsaio}>
                    <View
                      style={[
                        styles.pontoCaminhao,
                        { backgroundColor: corDoCaminhao(ensaio.caminhao) },
                      ]}
                    />
                    <Text style={styles.linhaEnsaioCaminhao}>{ensaio.caminhao}</Text>
                    <Text style={styles.linhaEnsaioMaturidade}>
                      {formatarMaturidade(ensaio.maturidade)}
                    </Text>
                    <Text style={styles.linhaEnsaioMpa}>{ensaio.resistencia} MPa</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── ESTIMATIVAS ── */}
            <View style={[styles.card, styles.cardLista]}>
              <Text style={styles.cardTitulo}>ÁREAS AGUARDANDO ROMPIMENTO</Text>

              {pendentes.length === 0 ? (
                <Text style={styles.vazioLista}>
                  Todas as áreas já tiveram o corpo de prova rompido.
                </Text>
              ) : (
                pendentes.map((area) => {
                  const estimada = estimarResistencia(area.maturidade, curva);
                  const atingiu = estimada !== null && estimada >= planta.fckProjeto;

                  return (
                    <View key={area.id} style={styles.cardArea}>
                      <View style={styles.areaTopo}>
                        <View
                          style={[
                            styles.pontoCaminhao,
                            { backgroundColor: corDoCaminhao(area.caminhao) },
                          ]}
                        />
                        <Text style={styles.areaCaminhao}>{area.caminhao}</Text>
                        <Text style={styles.areaData}>
                          concretada {formatarData(area.dataConcretagem)}
                        </Text>
                      </View>

                      <View style={styles.areaNumeros}>
                        <View style={styles.areaColuna}>
                          <Text style={styles.areaLabel}>MATURIDADE</Text>
                          <Text style={styles.areaValor}>
                            {formatarMaturidade(area.maturidade)}
                          </Text>
                          <Text style={styles.areaSub}>{area.leituras} leituras</Text>
                        </View>

                        <View style={styles.areaColuna}>
                          <Text style={styles.areaLabel}>ESTIMATIVA</Text>
                          {estimada === null ? (
                            <Text style={[styles.areaValor, { color: 'rgba(255,255,255,0.35)' }]}>
                              —
                            </Text>
                          ) : (
                            <>
                              <Text
                                style={[
                                  styles.areaValor,
                                  { color: atingiu ? '#22C55E' : '#FACC15' },
                                ]}
                              >
                                {estimada.toFixed(1)}
                              </Text>
                              <Text style={styles.areaSub}>
                                de {planta.fckProjeto} MPa
                              </Text>
                            </>
                          )}
                        </View>
                      </View>

                      {estimada !== null && (
                        <Text
                          style={[
                            styles.areaVeredito,
                            { color: atingiu ? '#22C55E' : 'rgba(255,255,255,0.5)' },
                          ]}
                        >
                          {atingiu
                            ? 'Estimativa já atingiu o fck do projeto'
                            : 'Ainda abaixo do fck — continuar curando'}
                        </Text>
                      )}
                    </View>
                  );
                })
              )}
            </View>

            {/* ── AVISO PERMANENTE ── */}
            {/* Uma estimativa dessas nao substitui ensaio, e a tela precisa
                dizer isso sem depender de quem esta apresentando lembrar */}
            <View style={styles.aviso}>
              <Ionicons name="alert-circle-outline" size={18} color="#FACC15" />
              <Text style={styles.avisoTexto}>
                Estimativa pelo método da maturidade (ASTM C1074). A curva vale apenas para o
                traço que a calibrou e não substitui o ensaio de ruptura.
              </Text>
            </View>
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
    textAlign: 'center', letterSpacing: 0.3, marginBottom: 5, lineHeight: 28,
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
    marginHorizontal: 16, marginBottom: 14,
  },

  cardCalibracao: { padding: 18 },

  calibracaoTopo: { flexDirection: 'row', alignItems: 'center', gap: 9 },

  pontoConfianca: { width: 10, height: 10, borderRadius: 5 },

  calibracaoTitulo: { fontSize: 15, fontWeight: 'bold' },

  calibracaoDetalhe: {
    color: 'rgba(255,255,255,0.6)', fontSize: 12.5,
    lineHeight: 18, marginTop: 8,
  },

  separador: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 14,
  },

  formulaLinha: { alignItems: 'center' },

  formulaLabel: {
    color: 'rgba(255,255,255,0.45)', fontSize: 9,
    fontWeight: 'bold', letterSpacing: 1, marginBottom: 6,
  },

  formula: {
    color: '#22C55E', fontSize: 16, fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },

  // ── LISTAS ──
  cardLista: { padding: 16 },

  cardTitulo: {
    color: '#22C55E', fontSize: 10.5, fontWeight: 'bold',
    letterSpacing: 1.3, textAlign: 'center', marginBottom: 12,
  },

  vazioLista: {
    color: 'rgba(255,255,255,0.45)', fontSize: 12.5,
    textAlign: 'center', paddingVertical: 10,
  },

  linhaEnsaio: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },

  pontoCaminhao: { width: 10, height: 10, borderRadius: 5 },

  linhaEnsaioCaminhao: { color: '#fff', fontSize: 13, fontWeight: '600', width: 44 },

  linhaEnsaioMaturidade: {
    color: 'rgba(255,255,255,0.55)', fontSize: 12.5, flex: 1,
  },

  linhaEnsaioMpa: { color: '#22C55E', fontSize: 13, fontWeight: 'bold' },

  // ── AREA PENDENTE ──
  cardArea: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, padding: 14, marginBottom: 10,
  },

  areaTopo: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },

  areaCaminhao: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  areaData: { color: 'rgba(255,255,255,0.4)', fontSize: 11.5, flex: 1 },

  areaNumeros: { flexDirection: 'row' },

  areaColuna: { flex: 1, alignItems: 'center' },

  areaLabel: {
    color: 'rgba(255,255,255,0.45)', fontSize: 9,
    fontWeight: 'bold', letterSpacing: 0.9, marginBottom: 4,
  },

  areaValor: { color: '#fff', fontSize: 19, fontWeight: 'bold' },

  areaSub: { color: 'rgba(255,255,255,0.4)', fontSize: 10.5, marginTop: 2 },

  areaVeredito: {
    fontSize: 11.5, textAlign: 'center', marginTop: 12,
  },

  // ── AVISO ──
  aviso: {
    flexDirection: 'row', gap: 9,
    marginHorizontal: 16, marginTop: 4,
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    borderRadius: 12,
  },

  avisoTexto: {
    color: 'rgba(255,255,255,0.65)', fontSize: 11.5,
    lineHeight: 17, flex: 1,
  },

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
