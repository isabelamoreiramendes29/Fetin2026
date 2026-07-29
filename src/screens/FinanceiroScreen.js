// Tela Financeiro — controle de gastos com cimento por obra
// Acesso exclusivo do Mestre. Cadastro manual, salvo no FinanceiroContext e
// publicado no MQTT (topico app/financeiro); backend responde em app/financeiro/resp
// Os cards de resumo exibem os totais vindos do backend (resumo_obra), nao do Context
// Recebe obraId e obraNome via route.params

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useFinanceiro } from '../context/FinanceiroContext';
import { publicarFinanceiro, inscreverFinanceiro } from '../services/mqtt';

// Formata numero para o padrao monetario brasileiro: R$ X.XXX,XX
function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Formata objeto Date para DD/MM
function formatarDataCurta(data) {
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function FinanceiroScreen({ navigation, route }) {
  const { obraId, obraNome } = route.params;
  const { adicionarCompra, getCompras, getTotalGasto, getTotalVolume } = useFinanceiro();

  const compras = getCompras(obraId);
  const totalGasto = getTotalGasto(obraId);
  const totalVolume = getTotalVolume(obraId);

  // ── ESTADOS DO MODAL ──
  const [modalVisivel, setModalVisivel] = useState(false);
  const [data, setData] = useState(new Date());
  const [mostrarPicker, setMostrarPicker] = useState(false);
  const [volume, setVolume] = useState('');
  const [valor, setValor] = useState('');
  const inputValorRef = useRef(null);

  // ── DADOS FINANCEIROS DO BACKEND (fonte dos cards de resumo) ──
  const [totalGastoBackend, setTotalGastoBackend] = useState(0);
  const [totalCimentoBackend, setTotalCimentoBackend] = useState(0);

  // Inscreve no topico de resposta do financeiro (app/financeiro/resp),
  // filtrado pela obra selecionada. Desinscreve ao trocar de obra ou sair da tela.
  useEffect(() => {
    if (!obraId) {
      console.warn('[Financeiro] Nenhuma obra selecionada!');
      return;
    }

    console.log(`[Financeiro] Inscrevendo para obra ${obraId}`);

    const desinscrever = inscreverFinanceiro(obraId, (dadosFinanceiro) => {
      console.log('[Financeiro] ✅ Atualizando com dados do backend:', dadosFinanceiro);
      setTotalGastoBackend(dadosFinanceiro.totalGasto);
      setTotalCimentoBackend(dadosFinanceiro.totalCimentoComprado);
    });

    return () => {
      if (desinscrever) desinscrever();
    };
  }, [obraId]);

  function abrirModal() {
    setData(new Date());
    setVolume('');
    setValor('');
    setModalVisivel(true);
  }

  function fecharModal() {
    Keyboard.dismiss();
    setModalVisivel(false);
  }

  function onChangeData(_, dataSelecionada) {
    setMostrarPicker(false);
    if (dataSelecionada) setData(dataSelecionada);
  }

  async function handleSalvar() {
    Keyboard.dismiss();

    if (!volume || parseFloat(volume) <= 0) {
      return Alert.alert('Campo obrigatório', 'Informe o volume de cimento em m³.');
    }
    if (!valor || parseFloat(valor) <= 0) {
      return Alert.alert('Campo obrigatório', 'Informe o valor da compra em R$.');
    }

    // Salva localmente (Context) — fonte da verdade da tela
    adicionarCompra(obraId, {
      data: data.toISOString(),
      volume: parseFloat(volume),
      valor: parseFloat(valor),
    });

    // Publica no MQTT — melhor esforco, nao bloqueia o salvamento local
    try {
      await publicarFinanceiro({
        obraId,
        valorTotal: totalGasto + parseFloat(valor),
        volumeComprado: totalVolume + parseFloat(volume),
      });
      console.log('[Financeiro] Publicado no MQTT');
    } catch (erro) {
      console.log('[Financeiro] Erro ao publicar MQTT:', erro.message);
    }

    fecharModal();
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
        keyboardShouldPersistTaps="handled"
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
            <Text style={styles.titulo}>Financeiro</Text>
            <View style={styles.linhaDecorada} />
          </View>

          <MaterialCommunityIcons
            name="currency-usd"
            size={32}
            color="rgba(255,255,255,0.65)"
            style={styles.iconeCabecalho}
          />
        </View>

        <Text style={styles.nomeObra}>{obraNome}</Text>

        {/* ── CARDS DE RESUMO ── */}
        <View style={styles.cardsResumo}>
          <View style={styles.cardResumo}>
            <Text style={styles.emojiResumo}>💰</Text>
            <Text style={styles.labelResumo}>Total Gasto</Text>
            <Text style={styles.valorResumo}>R$ {formatarMoeda(totalGastoBackend)}</Text>
          </View>

          <View style={styles.cardResumo}>
            <Text style={styles.emojiResumo}>📦</Text>
            <Text style={styles.labelResumo}>Cimento Comprado</Text>
            <Text style={styles.valorResumo}>{formatarMoeda(totalCimentoBackend)} m³</Text>
          </View>
        </View>

        {/* ── HISTORICO DE COMPRAS ── */}
        <Text style={styles.tituloSecao}>Histórico de Compras</Text>

        {compras.length === 0 ? (
          <View style={styles.vazioContainer}>
            <Ionicons name="receipt-outline" size={36} color="rgba(255,255,255,0.3)" />
            <Text style={styles.vazioTexto}>Nenhuma compra cadastrada ainda</Text>
          </View>
        ) : (
          <View style={styles.listaCompras}>
            {compras.map((compra) => (
              <View key={compra.id} style={styles.cardCompra}>
                <View style={styles.cardCompraData}>
                  <Ionicons name="calendar-outline" size={16} color="#22C55E" />
                  <Text style={styles.cardCompraDataTexto}>{formatarDataCurta(compra.data)}</Text>
                </View>
                <Text style={styles.cardCompraVolume}>{formatarMoeda(compra.volume)} m³</Text>
                <Text style={styles.cardCompraValor}>R$ {formatarMoeda(compra.valor)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── BOTAO ADICIONAR COMPRA ── */}
        <TouchableOpacity style={styles.botaoAdicionar} onPress={abrirModal} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.textoBotaoAdicionar}>Adicionar Compra</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ── MODAL DE CADASTRO ── */}
      <Modal visible={modalVisivel} transparent animationType="fade" onRequestClose={fecharModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalFundo}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitulo}>Adicionar Compra</Text>

              {/* Campo Data */}
              <Text style={styles.modalLabel}>Data</Text>
              <TouchableOpacity style={styles.modalCampoData} onPress={() => setMostrarPicker(true)}>
                <Ionicons name="calendar-outline" size={18} color="#22C55E" style={{ marginRight: 8 }} />
                <Text style={styles.modalCampoDataTexto}>{data.toLocaleDateString('pt-BR')}</Text>
              </TouchableOpacity>
              {mostrarPicker && (
                <DateTimePicker
                  value={data}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={onChangeData}
                />
              )}

              {/* Campo Volume */}
              <Text style={styles.modalLabel}>Volume (m³)</Text>
              <View style={styles.modalCampo}>
                <MaterialCommunityIcons name="cube-outline" size={18} color="#22C55E" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.modalInput}
                  placeholder="0,00"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="numeric"
                  value={volume}
                  onChangeText={setVolume}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => inputValorRef.current?.focus()}
                />
              </View>

              {/* Campo Valor */}
              <Text style={styles.modalLabel}>Valor (R$)</Text>
              <View style={styles.modalCampo}>
                <MaterialCommunityIcons name="currency-usd" size={18} color="#22C55E" style={{ marginRight: 8 }} />
                <TextInput
                  ref={inputValorRef}
                  style={styles.modalInput}
                  placeholder="0,00"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="numeric"
                  value={valor}
                  onChangeText={setValor}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>

              {/* Botoes */}
              <View style={styles.modalBotoes}>
                <TouchableOpacity style={styles.modalBotaoCancelar} onPress={fecharModal}>
                  <Text style={styles.modalTextoCancelar}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBotaoSalvar} onPress={handleSalvar}>
                  <Text style={styles.modalTextoSalvar}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  scrollContent: { flexGrow: 1, paddingTop: 56, paddingBottom: 32, paddingHorizontal: 20 },

  // ── CABECALHO ──
  cabecalho: { width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },

  botaoVoltar: {
    position: 'absolute', top: 0, left: 0, zIndex: 10,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(26, 86, 219, 0.7)', borderWidth: 1.5, borderColor: 'rgba(34, 197, 94, 0.45)',
    alignItems: 'center', justifyContent: 'center',
  },

  iconeCabecalho: { position: 'absolute', top: 2, right: 0, zIndex: 10 },

  tituloContainer: { alignItems: 'center' },

  titulo: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 6, textAlign: 'center', paddingHorizontal: 60 },

  linhaDecorada: { width: 50, height: 3, backgroundColor: '#22C55E', borderRadius: 2 },

  nomeObra: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: 24, letterSpacing: 0.5 },

  // ── CARDS DE RESUMO ──
  cardsResumo: { gap: 14, marginBottom: 28 },

  cardResumo: {
    backgroundColor: 'rgba(11, 32, 101, 0.55)', borderWidth: 1.5, borderColor: '#22C55E',
    borderRadius: 16, paddingVertical: 20, paddingHorizontal: 20, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },

  emojiResumo: { fontSize: 28, marginBottom: 6 },

  labelResumo: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 4 },

  valorResumo: { color: '#22C55E', fontSize: 26, fontWeight: 'bold' },

  // ── HISTORICO ──
  tituloSecao: { color: '#fff', fontSize: 17, fontWeight: '600', marginBottom: 14 },

  vazioContainer: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 32,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, marginBottom: 24,
  },

  vazioTexto: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 10 },

  listaCompras: { marginBottom: 24, gap: 10 },

  cardCompra: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.35)',
    borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16,
  },

  cardCompraData: { flexDirection: 'row', alignItems: 'center', flex: 1 },

  cardCompraDataTexto: { color: '#fff', fontSize: 14, marginLeft: 6 },

  cardCompraVolume: { color: 'rgba(255,255,255,0.75)', fontSize: 14, flex: 1, textAlign: 'center' },

  cardCompraValor: { color: '#22C55E', fontSize: 14, fontWeight: '700', flex: 1, textAlign: 'right' },

  // ── BOTAO ADICIONAR ──
  botaoAdicionar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2ECC40', borderRadius: 14, height: 52,
    shadowColor: '#2ECC40', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },

  textoBotaoAdicionar: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  // ── MODAL ──
  modalFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },

  modalCard: {
    width: '100%', backgroundColor: '#0B2065', borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(34, 197, 94, 0.45)',
    padding: 22,
  },

  modalTitulo: { color: '#fff', fontSize: 19, fontWeight: 'bold', marginBottom: 18, textAlign: 'center' },

  modalLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 6 },

  modalCampo: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5, borderColor: 'rgba(46,204,64,0.5)', borderRadius: 12, height: 48,
    paddingHorizontal: 12, marginBottom: 14,
  },

  modalInput: { flex: 1, color: '#fff', fontSize: 14 },

  modalCampoData: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5, borderColor: 'rgba(46,204,64,0.5)', borderRadius: 12, height: 48,
    paddingHorizontal: 12, marginBottom: 14,
  },

  modalCampoDataTexto: { color: '#fff', fontSize: 14 },

  modalBotoes: { flexDirection: 'row', gap: 10, marginTop: 8 },

  modalBotaoCancelar: {
    flex: 1, height: 48, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },

  modalTextoCancelar: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  modalBotaoSalvar: {
    flex: 1, height: 48, backgroundColor: '#2ECC40', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },

  modalTextoSalvar: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});
