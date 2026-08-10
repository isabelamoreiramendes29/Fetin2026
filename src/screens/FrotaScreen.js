// Tela Minha Frota — a Construtora cadastra e mantem os caminhoes dela
// Fluxo: MenuConstrutora → Frota (esta tela)
//
// Existe porque o caminhao era so um texto: a tela de envio tinha '4' e '5'
// escritos no codigo, e o rastreamento mostrava placa e motorista fixos,
// iguais para qualquer viagem. Com a frota cadastrada, cada viagem passa a
// mostrar os dados do caminhao que esta nela.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import {
  buscarFrota,
  criarCaminhao,
  atualizarCaminhao,
  removerCaminhao,
} from '../services/frota';
import { corDoCaminhao } from '../services/planta';

export default function FrotaScreen({ navigation }) {
  const [frota, setFrota]           = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]             = useState(null);
  const [salvando, setSalvando]     = useState(false);

  // Modal: null = fechado | 'novo' = cadastro | objeto = edicao daquele caminhao
  const [emEdicao, setEmEdicao] = useState(null);

  const [identificacao, setIdentificacao] = useState('');
  const [placa, setPlaca]                 = useState('');
  const [motorista, setMotorista]         = useState('');
  const [capacidade, setCapacidade]       = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      setFrota(await buscarFrota());
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function abrirNovo() {
    setIdentificacao('');
    setPlaca('');
    setMotorista('');
    setCapacidade('');
    setEmEdicao('novo');
  }

  function abrirEdicao(caminhao) {
    setIdentificacao(caminhao.identificacao);
    setPlaca(caminhao.placa);
    setMotorista(caminhao.motorista);
    setCapacidade(caminhao.capacidadeM3 ? String(caminhao.capacidadeM3) : '');
    setEmEdicao(caminhao);
  }

  async function salvar() {
    if (emEdicao === 'novo' && !identificacao.trim()) {
      Alert.alert('Identificação', 'Informe como este caminhão é chamado. Ex: 4, ou Betoneira 1.');
      return;
    }
    if (salvando) return;

    setSalvando(true);
    try {
      if (emEdicao === 'novo') {
        const novo = await criarCaminhao({
          identificacao,
          placa,
          motorista,
          capacidadeM3: capacidade,
        });
        setFrota((atuais) => [...atuais, novo].sort(
          (a, b) => a.identificacao.localeCompare(b.identificacao)
        ));
      } else {
        const atualizado = await atualizarCaminhao(emEdicao.id, {
          placa,
          motorista,
          capacidadeM3: capacidade,
        });
        setFrota((atuais) => atuais.map((c) => (c.id === atualizado.id ? atualizado : c)));
      }

      setEmEdicao(null);
    } catch (falha) {
      Alert.alert('Erro', falha.message);
    } finally {
      setSalvando(false);
    }
  }

  function confirmarRemocao(caminhao) {
    Alert.alert(
      'Remover caminhão',
      `Remover o caminhão ${caminhao.identificacao} da frota?\n\nAs viagens e as áreas que ele já concretou continuam registradas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await removerCaminhao(caminhao.id);
              setFrota((atuais) => atuais.filter((c) => c.id !== caminhao.id));
            } catch (falha) {
              Alert.alert('Erro', falha.message);
            }
          },
        },
      ]
    );
  }

  const capacidadeTotal = frota.reduce((soma, c) => soma + (c.capacidadeM3 || 0), 0);

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
            <Text style={styles.titulo}>Minha Frota</Text>
            <View style={styles.linhaDecorada} />
          </View>

          <View style={styles.iconeQuadrado}>
            <MaterialCommunityIcons name="truck-outline" size={22} color="#22C55E" />
          </View>
        </View>

        {/* ── RESUMO ── */}
        {frota.length > 0 && (
          <View style={styles.resumo}>
            <Text style={styles.resumoTexto}>
              {frota.length} {frota.length === 1 ? 'caminhão' : 'caminhões'}
              {capacidadeTotal > 0 && ` · ${capacidadeTotal} m³ por viagem`}
            </Text>
          </View>
        )}

        {/* ── ESTADOS ── */}
        {carregando && (
          <View style={styles.estadoVazio}>
            <ActivityIndicator size="large" color="#22C55E" />
            <Text style={styles.estadoVazioTexto}>Carregando frota...</Text>
          </View>
        )}

        {!carregando && erro && (
          <View style={styles.estadoVazio}>
            <Ionicons name="cloud-offline-outline" size={44} color="rgba(255,255,255,0.35)" />
            <Text style={styles.estadoVazioTexto}>{erro}</Text>
          </View>
        )}

        {!carregando && !erro && frota.length === 0 && (
          <View style={styles.estadoVazio}>
            <MaterialCommunityIcons name="truck-outline" size={48} color="rgba(255,255,255,0.35)" />
            <Text style={styles.estadoVazioTitulo}>Nenhum caminhão cadastrado</Text>
            <Text style={styles.estadoVazioTexto}>
              Cadastre as betoneiras da sua frota para poder despachá-las para as obras.
            </Text>
          </View>
        )}

        {/* ── LISTA ── */}
        {!carregando && !erro && frota.map((caminhao) => (
          <TouchableOpacity
            key={caminhao.id}
            style={styles.cardCaminhao}
            onPress={() => abrirEdicao(caminhao)}
            onLongPress={() => confirmarRemocao(caminhao)}
            delayLongPress={500}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.identificacaoBadge,
                { backgroundColor: corDoCaminhao(caminhao.identificacao) },
              ]}
            >
              <Text style={styles.identificacaoTexto}>{caminhao.identificacao}</Text>
            </View>

            <View style={styles.caminhaoDados}>
              <Text style={styles.caminhaoPlaca}>
                {caminhao.placa || 'Sem placa cadastrada'}
              </Text>
              <Text style={styles.caminhaoMotorista}>
                {caminhao.motorista || 'Sem motorista'}
                {caminhao.capacidadeM3 ? ` · ${caminhao.capacidadeM3} m³` : ''}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.35)" />
          </TouchableOpacity>
        ))}

        {!carregando && !erro && frota.length > 0 && (
          <Text style={styles.dica}>Toque para editar · segure para remover</Text>
        )}

        {/* ── ADICIONAR ── */}
        {!carregando && !erro && (
          <TouchableOpacity style={styles.botaoAdicionar} onPress={abrirNovo} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.botaoAdicionarTexto}>Cadastrar caminhão</Text>
          </TouchableOpacity>
        )}

      </ScrollView>

      {/* ── MODAL ── */}
      <Modal
        visible={emEdicao !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEmEdicao(null)}
      >
        <View style={styles.modalFundo}>
          <View style={styles.modalCaixa}>
            <ScrollView showsVerticalScrollIndicator={false}>

              <Text style={styles.modalTitulo}>
                {emEdicao === 'novo' ? 'Novo caminhão' : `Caminhão ${identificacao}`}
              </Text>

              {/* A identificacao so e editavel no cadastro: e por ela que as
                  viagens e as areas de concretagem apontam para este caminhao */}
              {emEdicao === 'novo' && (
                <>
                  <Text style={styles.campoLabel}>Identificação</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={identificacao}
                    onChangeText={setIdentificacao}
                    placeholder="Ex: 4"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                  />
                  <Text style={styles.campoAjuda}>
                    Como o caminhão é chamado no dia a dia. Não pode ser alterado depois.
                  </Text>
                </>
              )}

              <Text style={styles.campoLabel}>Placa</Text>
              <TextInput
                style={styles.modalInput}
                value={placa}
                onChangeText={setPlaca}
                placeholder="Ex: ABC1D23"
                placeholderTextColor="rgba(255,255,255,0.35)"
                autoCapitalize="characters"
              />

              <Text style={styles.campoLabel}>Motorista</Text>
              <TextInput
                style={styles.modalInput}
                value={motorista}
                onChangeText={setMotorista}
                placeholder="Nome do motorista"
                placeholderTextColor="rgba(255,255,255,0.35)"
                autoCapitalize="words"
              />

              <Text style={styles.campoLabel}>Capacidade</Text>
              <View style={styles.campoLinha}>
                <TextInput
                  style={styles.campoInput}
                  value={capacidade}
                  onChangeText={setCapacidade}
                  placeholder="8"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.campoSufixo}>m³</Text>
              </View>

              <View style={styles.modalBotoes}>
                <TouchableOpacity
                  style={styles.modalBotaoCancelar}
                  onPress={() => setEmEdicao(null)}
                >
                  <Text style={styles.modalBotaoCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBotaoConfirmar, salvando && styles.botaoSalvando]}
                  onPress={salvar}
                  disabled={salvando}
                >
                  <Text style={styles.modalBotaoConfirmarTexto}>
                    {salvando ? 'Salvando...' : 'Salvar'}
                  </Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>

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

  resumo: { alignItems: 'center', marginBottom: 18 },

  resumoTexto: {
    color: 'rgba(255,255,255,0.55)', fontSize: 13, letterSpacing: 0.3,
  },

  // ── CARD DO CAMINHAO ──
  cardCaminhao: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 16, marginBottom: 10,
    paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: 'rgba(11, 32, 101, 0.72)',
    borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.28)',
    borderRadius: 16,
  },

  identificacaoBadge: {
    minWidth: 42, height: 42, borderRadius: 12,
    paddingHorizontal: 8,
    alignItems: 'center', justifyContent: 'center',
  },

  identificacaoTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  caminhaoDados: { flex: 1 },

  caminhaoPlaca: {
    color: '#fff', fontSize: 15, fontWeight: '600',
    letterSpacing: 0.5, marginBottom: 2,
  },

  caminhaoMotorista: { color: 'rgba(255,255,255,0.5)', fontSize: 12.5 },

  dica: {
    color: 'rgba(255,255,255,0.3)', fontSize: 11,
    textAlign: 'center', fontStyle: 'italic', marginTop: 4, marginBottom: 8,
  },

  // ── BOTAO ADICIONAR ──
  botaoAdicionar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 14,
    height: 52, backgroundColor: '#22C55E', borderRadius: 14,
  },

  botaoAdicionarTexto: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

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

  // ── MODAL ──
  modalFundo: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },

  modalCaixa: {
    width: '100%', maxHeight: '85%',
    backgroundColor: '#0B2065',
    borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.4)',
    borderRadius: 18, padding: 22,
  },

  modalTitulo: {
    color: '#fff', fontSize: 20, fontWeight: 'bold',
    textAlign: 'center', marginBottom: 4,
  },

  campoLabel: {
    color: 'rgba(255,255,255,0.6)', fontSize: 12,
    fontWeight: 'bold', letterSpacing: 0.5,
    marginTop: 18, marginBottom: 8,
  },

  campoAjuda: {
    color: 'rgba(255,255,255,0.4)', fontSize: 11,
    marginTop: 6, lineHeight: 16,
  },

  modalInput: {
    borderWidth: 1.5, borderColor: '#2ECC40', borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 14, height: 52, color: '#fff', fontSize: 16,
  },

  campoLinha: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#2ECC40', borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 14, height: 52,
  },

  campoInput: { flex: 1, color: '#fff', fontSize: 16 },

  campoSufixo: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 'bold' },

  modalBotoes: { flexDirection: 'row', gap: 10, marginTop: 24 },

  modalBotaoCancelar: {
    flex: 1, height: 48, borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },

  modalBotaoCancelarTexto: {
    color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: 'bold',
  },

  modalBotaoConfirmar: {
    flex: 1, height: 48, borderRadius: 12, backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center',
  },

  botaoSalvando: { backgroundColor: '#27AE60', opacity: 0.8 },

  modalBotaoConfirmarTexto: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
