// Tela Alertas — o que o app detectou sozinho
// Fluxo: MenuMestre → Alertas (esta tela)
// Recebe obraId e obraNome via route.params
//
// Existe porque monitoramento que nao avisa e apenas registro. Ate agora era
// preciso abrir a tela de temperatura e olhar para descobrir que o concreto
// chegou fora da faixa — e mestre de obra nao fica com o celular na mao.
//
// A notificacao alcanca quem esta com o app aberto; esta tela alcanca quem
// nao estava, e guarda a prova de que o problema foi detectado e quando.

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

import { buscarAlertas, marcarTodosLidos } from '../services/alertas';

// "há 8 min", "há 3 h", ou a data quando passa de um dia
function formatarQuando(iso) {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

  if (minutos < 1)  return 'agora mesmo';
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24)   return `há ${horas} h`;

  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} às ` +
         `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const ESTILO_SEVERIDADE = {
  critica: { cor: '#DC2626', icone: 'alert-circle', rotulo: 'CRÍTICO' },
  atencao: { cor: '#FACC15', icone: 'warning',      rotulo: 'ATENÇÃO' },
};

export default function AlertasScreen({ navigation, route }) {
  const { obraId, obraNome } = route.params;

  const [alertas, setAlertas]       = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]             = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const lista = await buscarAlertas(obraId);
      setAlertas(lista);

      // Abrir a tela ja conta como ter visto — nao faz sentido exigir um
      // segundo toque so para zerar o contador
      if (lista.some((a) => !a.lido)) {
        await marcarTodosLidos(obraId);
      }
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setCarregando(false);
    }
  }, [obraId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

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
            <Text style={styles.titulo}>Alertas</Text>
            <View style={styles.linhaDecorada} />
          </View>

          <View style={styles.iconeQuadrado}>
            <MaterialCommunityIcons name="bell-alert-outline" size={22} color="#22C55E" />
          </View>
        </View>

        <Text style={styles.nomeObra}>{obraNome}</Text>

        {/* ── RESUMO ── */}
        {!carregando && !erro && alertas.length > 0 && (
          <Text style={styles.resumo}>
            {alertas.length} {alertas.length === 1 ? 'registro' : 'registros'}
            {criticos > 0 && ` · ${criticos} ${criticos === 1 ? 'crítico' : 'críticos'}`}
          </Text>
        )}

        {/* ── ESTADOS ── */}
        {carregando && (
          <View style={styles.estadoVazio}>
            <ActivityIndicator size="large" color="#22C55E" />
            <Text style={styles.estadoVazioTexto}>Carregando alertas...</Text>
          </View>
        )}

        {!carregando && erro && (
          <View style={styles.estadoVazio}>
            <Ionicons name="cloud-offline-outline" size={44} color="rgba(255,255,255,0.35)" />
            <Text style={styles.estadoVazioTexto}>{erro}</Text>
          </View>
        )}

        {/* Nenhum alerta e boa noticia, e a tela precisa dizer isso — lista
            vazia sem explicacao parece coisa quebrada */}
        {!carregando && !erro && alertas.length === 0 && (
          <View style={styles.estadoVazio}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#22C55E" />
            <Text style={styles.estadoVazioTitulo}>Nenhum alerta</Text>
            <Text style={styles.estadoVazioTexto}>
              Todas as leituras desta obra ficaram dentro da faixa esperada.
            </Text>
          </View>
        )}

        {/* ── LISTA ── */}
        {!carregando && !erro && alertas.map((alerta) => {
          const estilo = ESTILO_SEVERIDADE[alerta.severidade] || ESTILO_SEVERIDADE.atencao;

          return (
            <View key={alerta.id} style={[styles.cardAlerta, { borderLeftColor: estilo.cor }]}>
              <Ionicons name={estilo.icone} size={22} color={estilo.cor} />

              <View style={styles.alertaTextos}>
                <Text style={[styles.alertaSeveridade, { color: estilo.cor }]}>
                  {estilo.rotulo}
                </Text>
                <Text style={styles.alertaMensagem}>{alerta.mensagem}</Text>
                <Text style={styles.alertaQuando}>{formatarQuando(alerta.criadoEm)}</Text>
              </View>
            </View>
          );
        })}

        {/* ── NOTA SOBRE O ALCANCE ── */}
        {/* Melhor a tela dizer o limite do que alguem descobrir na banca */}
        {!carregando && !erro && (
          <View style={styles.nota}>
            <Ionicons name="information-circle-outline" size={17} color="rgba(255,255,255,0.5)" />
            <Text style={styles.notaTexto}>
              A notificação no celular chega enquanto o app está aberto ou em segundo plano.
              Os alertas ficam registrados aqui de qualquer forma.
            </Text>
          </View>
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
    fontSize: 24, fontWeight: 'bold', color: '#fff',
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
    color: 'rgba(255,255,255,0.55)', fontSize: 13,
    textAlign: 'center', marginBottom: 6, letterSpacing: 0.4,
  },

  resumo: {
    color: 'rgba(255,255,255,0.45)', fontSize: 12,
    textAlign: 'center', marginBottom: 16,
  },

  // ── CARD DO ALERTA ──
  cardAlerta: {
    flexDirection: 'row', gap: 12,
    marginHorizontal: 16, marginBottom: 10,
    paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: 'rgba(11, 32, 101, 0.72)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderLeftWidth: 4,
    borderRadius: 14,
  },

  alertaTextos: { flex: 1 },

  alertaSeveridade: {
    fontSize: 9.5, fontWeight: 'bold', letterSpacing: 1.2, marginBottom: 4,
  },

  alertaMensagem: { color: '#fff', fontSize: 14, lineHeight: 19 },

  alertaQuando: { color: 'rgba(255,255,255,0.4)', fontSize: 11.5, marginTop: 5 },

  // ── NOTA ──
  nota: {
    flexDirection: 'row', gap: 9,
    marginHorizontal: 16, marginTop: 8,
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },

  notaTexto: {
    color: 'rgba(255,255,255,0.5)', fontSize: 11.5, lineHeight: 17, flex: 1,
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
