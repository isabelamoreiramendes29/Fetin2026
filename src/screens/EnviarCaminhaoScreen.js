// Tela Enviar Caminhao — a Construtora escolhe um dos caminhoes e a obra de
// destino. O envio e gravado no Supabase (ver services/caminhoes.js) e ja cria
// a posicao inicial do caminhao, para ele aparecer na tela de rastreamento.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

import { useObras } from '../context/ObrasContext';
import { useCaminhoes } from '../context/CaminhoesContext';
import { buscarFrota } from '../services/frota';
import { registrarVolumeEntregue, concluirViagem } from '../services/caminhoes';

const { width } = Dimensions.get('window');

// Formata a data ISO do envio para "DD/MM/AAAA HH:mm"
function formatarDataHora(isoString) {
  const data = new Date(isoString);
  const dataParte = data.toLocaleDateString('pt-BR');
  const horaParte = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dataParte} ${horaParte}`;
}

export default function EnviarCaminhaoScreen({ navigation }) {
  const { obras } = useObras();
  const { caminhoes, adicionarEnvio, recarregar } = useCaminhoes();

  const [caminhaoSelecionado, setCaminhaoSelecionado] = useState(null);
  const [obraSelecionada, setObraSelecionada] = useState(null);

  // A frota cadastrada substitui a lista fixa de '4' e '5' que existia aqui
  const [frota, setFrota] = useState([]);

  const carregarFrota = useCallback(async () => {
    try {
      setFrota(await buscarFrota());
    } catch (falha) {
      console.warn('[EnviarCaminhao]', falha.message);
    }
  }, []);

  useEffect(() => {
    // Recarrega ao voltar da tela de frota, para um caminhao recem-cadastrado
    // ja aparecer aqui
    const remover = navigation.addListener('focus', carregarFrota);
    return remover;
  }, [navigation, carregarFrota]);

  // ── VOLUME DESCARREGADO ──
  // O valor vem do sensor do caminhao. Enquanto o hardware nao esta integrado,
  // e informado aqui — o caminho ate o banco e o mesmo nos dois casos.
  const [envioEmMedicao, setEnvioEmMedicao] = useState(null);
  const [volumeTexto, setVolumeTexto]       = useState('');
  const [salvandoVolume, setSalvandoVolume] = useState(false);

  function abrirVolume(envio) {
    setEnvioEmMedicao(envio);
    setVolumeTexto(envio.volumeEntregue !== null ? String(envio.volumeEntregue) : '');
  }

  // Encerrar a viagem libera o caminhao para sair de novo, e congela o numero
  // dela: leituras posteriores do sensor deixam de alimenta-la
  function confirmarConclusao() {
    const envio = envioEmMedicao;

    Alert.alert(
      'Concluir entrega',
      `Encerrar a viagem do caminhão ${envio.caminhao}?\n\n` +
      'O volume deixa de ser atualizado pelo sensor, e o caminhão fica livre para uma nova viagem.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Concluir',
          onPress: async () => {
            try {
              await concluirViagem(envio.id);
              await recarregar();
              setEnvioEmMedicao(null);
            } catch (falha) {
              Alert.alert('Erro', falha.message);
            }
          },
        },
      ]
    );
  }

  async function confirmarVolume() {
    const volume = parseFloat(volumeTexto.replace(',', '.'));

    if (!volume || volume <= 0) {
      Alert.alert('Volume inválido', 'Informe quantos m³ o caminhão descarregou.');
      return;
    }
    if (salvandoVolume) return;

    setSalvandoVolume(true);
    try {
      await registrarVolumeEntregue(envioEmMedicao.id, volume);
      await recarregar();
      setEnvioEmMedicao(null);
    } catch (falha) {
      Alert.alert('Erro', falha.message);
    } finally {
      setSalvandoVolume(false);
    }
  }

  // Valida a selecao, registra o envio no banco e limpa o formulario
  async function handleEnviar() {
    if (!caminhaoSelecionado) {
      Alert.alert('Erro', 'Selecione um caminhão.');
      return;
    }
    if (!obraSelecionada) {
      Alert.alert('Erro', 'Selecione uma obra.');
      return;
    }

    const obra = obras.find(o => o.id === obraSelecionada);
    if (!obra) {
      Alert.alert('Erro', 'Obra não encontrada.');
      return;
    }

    try {
      await adicionarEnvio(caminhaoSelecionado, obra);

      Alert.alert('Sucesso', `Caminhão ${caminhaoSelecionado} enviado para ${obra.nome}!`);

      setCaminhaoSelecionado(null);
      setObraSelecionada(null);

    } catch (erro) {
      console.error('[EnviarCaminhao] Erro:', erro.message);
      Alert.alert('Erro', erro.message);
    }
  }

  return (
    <LinearGradient
      colors={['#1A56DB', '#0B2065', '#1565C0']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

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
            <Text style={styles.titulo}>ENVIAR CAMINHÃO</Text>
            <View style={styles.linhaDecorada} />
          </View>

          <MaterialCommunityIcons
            name="truck"
            size={38}
            color="rgba(255,255,255,0.65)"
            style={styles.iconeCabecalho}
          />
        </View>

        {/* ── SELECAO DE CAMINHAO ── */}
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Selecione o Caminhão</Text>

          {frota.length === 0 ? (
            <TouchableOpacity
              style={styles.frotaVazia}
              onPress={() => navigation.navigate('Frota')}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons
                name="truck-outline"
                size={32}
                color="rgba(255,255,255,0.4)"
              />
              <Text style={styles.frotaVaziaTexto}>
                Nenhum caminhão na frota.{'\n'}Toque para cadastrar.
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.caminhoesRow}>
              {frota.map((caminhao) => {
                const selecionado = caminhaoSelecionado === caminhao.identificacao;
                return (
                  <TouchableOpacity
                    key={caminhao.id}
                    style={[styles.botaoCaminhao, selecionado && styles.botaoCaminhaoSelecionado]}
                    onPress={() => setCaminhaoSelecionado(caminhao.identificacao)}
                    activeOpacity={0.85}
                  >
                    <MaterialCommunityIcons name="truck" size={26} color="#fff" />
                    <Text style={styles.botaoCaminhaoTexto}>
                      Caminhão {caminhao.identificacao}
                    </Text>
                    {/* Placa e capacidade ajudam a escolher a betoneira certa
                        quando a frota cresce */}
                    {!!caminhao.placa && (
                      <Text style={styles.botaoCaminhaoDetalhe}>{caminhao.placa}</Text>
                    )}
                    {!!caminhao.capacidadeM3 && (
                      <Text style={styles.botaoCaminhaoDetalhe}>
                        {caminhao.capacidadeM3} m³
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ── SELECAO DE OBRA ── */}
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Selecione a Obra de Destino</Text>

          {obras.length === 0 ? (
            <View style={styles.pickerVazio}>
              <Text style={styles.pickerVazioTexto}>Nenhuma obra disponível</Text>
            </View>
          ) : (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={obraSelecionada}
                onValueChange={(valor) => setObraSelecionada(valor)}
                style={styles.picker}
                dropdownIconColor="#22C55E"
              >
                <Picker.Item label="Selecione uma obra..." value={null} color="#888" />
                {obras.map((obra) => (
                  <Picker.Item key={obra.id} label={obra.nome} value={obra.id} />
                ))}
              </Picker>
            </View>
          )}
        </View>

        {/* ── BOTAO ENVIAR ── */}
        <TouchableOpacity style={styles.botaoEnviar} onPress={handleEnviar} activeOpacity={0.85}>
          <Ionicons name="send-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.botaoEnviarTexto}>Enviar Caminhão</Text>
        </TouchableOpacity>

        {/* ── CAMINHOES ENVIADOS ── */}
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Caminhões Enviados</Text>

          {caminhoes.length === 0 ? (
            <Text style={styles.listaVaziaTexto}>Nenhum caminhão enviado ainda.</Text>
          ) : (
            caminhoes.map((envio) => {
              const concluida = !!envio.concluidoEm;
              const descarregou = envio.volumeEntregue !== null;

              return (
                <TouchableOpacity
                  key={envio.id}
                  style={styles.cardEnvio}
                  onPress={() => abrirVolume(envio)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardEnvioLinha}>
                    <MaterialCommunityIcons name="truck" size={20} color="#22C55E" />
                    <Text style={styles.cardEnvioTexto}>Caminhão {envio.caminhao}</Text>
                  </View>

                  <View style={styles.cardEnvioLinha}>
                    <Ionicons name="business-outline" size={17} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.cardEnvioSubtexto}>{envio.obraNome}</Text>
                  </View>

                  <View style={styles.cardEnvioLinha}>
                    <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.5)" />
                    <Text style={styles.cardEnvioSubtexto}>{formatarDataHora(envio.dataEnvio)}</Text>
                  </View>

                  {/* O status vem do volume: enquanto o sensor nao mediu a
                      descarga, a viagem ainda esta em curso */}
                  <View
                    style={[
                      styles.statusBadge,
                      concluida && { backgroundColor: 'rgba(148,163,184,0.18)' },
                      !concluida && descarregou && { backgroundColor: 'rgba(34,197,94,0.2)' },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusBolinha,
                        { backgroundColor: concluida ? '#94A3B8' : (descarregou ? '#22C55E' : '#FACC15') },
                      ]}
                    />
                    <Text style={styles.statusTexto}>
                      {concluida
                        ? `Entregue · ${envio.volumeEntregue ?? 0} m³`
                        : descarregou
                          ? `Descarregando · ${envio.volumeEntregue} m³`
                          : 'Em trânsito · toque para medir'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

      </ScrollView>

      {/* ── MODAL: VOLUME DESCARREGADO ── */}
      <Modal
        visible={envioEmMedicao !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEnvioEmMedicao(null)}
      >
        <View style={styles.modalFundo}>
          {envioEmMedicao && (
            <View style={styles.modalCaixa}>
              <Text style={styles.modalTitulo}>Caminhão {envioEmMedicao.caminhao}</Text>
              <Text style={styles.modalSubtitulo}>{envioEmMedicao.obraNome}</Text>

              <Text style={styles.modalLabel}>Volume descarregado</Text>
              <View style={styles.modalCampo}>
                <TextInput
                  style={styles.modalInput}
                  value={volumeTexto}
                  onChangeText={setVolumeTexto}
                  placeholder="Ex: 7,4"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <Text style={styles.modalSufixo}>m³</Text>
              </View>
              <Text style={styles.modalAjuda}>
                Virá do sensor do caminhão quando o hardware estiver integrado.
              </Text>

              {!envioEmMedicao.concluidoEm && (
                <TouchableOpacity
                  style={styles.modalBotaoConcluir}
                  onPress={confirmarConclusao}
                >
                  <Ionicons name="checkmark-done" size={18} color="#22C55E" />
                  <Text style={styles.modalBotaoConcluirTexto}>Concluir entrega</Text>
                </TouchableOpacity>
              )}

              <View style={styles.modalBotoes}>
                <TouchableOpacity
                  style={styles.modalBotaoCancelar}
                  onPress={() => setEnvioEmMedicao(null)}
                >
                  <Text style={styles.modalBotaoCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBotaoConfirmar, salvandoVolume && { opacity: 0.7 }]}
                  onPress={confirmarVolume}
                  disabled={salvandoVolume}
                >
                  <Text style={styles.modalBotaoConfirmarTexto}>
                    {salvandoVolume ? 'Salvando...' : 'Registrar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingTop: 56,
    paddingBottom: 24,
  },

  // ── CABECALHO ──
  cabecalho: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },

  botaoVoltar: {
    position: 'absolute',
    top: 0,
    left: 24,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(26, 86, 219, 0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconeCabecalho: {
    position: 'absolute',
    top: 0,
    right: 24,
    zIndex: 10,
  },

  tituloContainer: {
    alignItems: 'center',
  },

  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
    textAlign: 'center',
    paddingHorizontal: 60,
  },

  linhaDecorada: {
    width: 50,
    height: 3,
    backgroundColor: '#22C55E',
    borderRadius: 2,
  },

  // ── SECOES ──
  secao: {
    width: width * 0.88,
    alignSelf: 'center',
    marginBottom: 22,
  },

  secaoTitulo: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },

  // ── SELECAO DE CAMINHAO ──
  caminhoesRow: {
    flexDirection: 'row',
    gap: 12,
  },

  botaoCaminhao: {
    flex: 1,
    height: 84,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(46,204,64,0.5)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  botaoCaminhaoSelecionado: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },

  botaoCaminhaoTexto: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // ── PICKER DE OBRA ──
  pickerContainer: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5,
    borderColor: '#2ECC40',
    borderRadius: 12,
    overflow: 'hidden',
  },

  picker: {
    color: '#fff',
  },

  pickerVazio: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pickerVazioTexto: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },

  // ── BOTAO ENVIAR ──
  botaoEnviar: {
    width: width * 0.88,
    alignSelf: 'center',
    height: 54,
    backgroundColor: '#2ECC40',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#2ECC40',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  botaoEnviarTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // ── MODAL DE VOLUME ──
  modalFundo: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },

  modalCaixa: {
    width: '100%',
    backgroundColor: '#0B2065',
    borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.4)',
    borderRadius: 18, padding: 22,
  },

  modalTitulo: {
    color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center',
  },

  modalSubtitulo: {
    color: 'rgba(255,255,255,0.5)', fontSize: 12.5,
    textAlign: 'center', marginTop: 3,
  },

  modalLabel: {
    color: 'rgba(255,255,255,0.6)', fontSize: 12,
    fontWeight: 'bold', letterSpacing: 0.5,
    marginTop: 22, marginBottom: 8,
  },

  modalCampo: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#2ECC40', borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 14, height: 52,
  },

  modalInput: { flex: 1, color: '#fff', fontSize: 16 },

  modalSufixo: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 'bold' },

  modalAjuda: {
    color: 'rgba(255,255,255,0.4)', fontSize: 11,
    marginTop: 8, lineHeight: 16,
  },

  modalBotaoConcluir: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, borderRadius: 12, marginTop: 20,
    borderWidth: 1.5, borderColor: 'rgba(34,197,94,0.55)',
  },

  modalBotaoConcluirTexto: { color: '#22C55E', fontSize: 14, fontWeight: 'bold' },

  modalBotoes: { flexDirection: 'row', gap: 10, marginTop: 12 },

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

  modalBotaoConfirmarTexto: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  // ── FROTA VAZIA ──
  frotaVazia: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 28, paddingHorizontal: 20,
    borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 16,
  },

  frotaVaziaTexto: {
    color: 'rgba(255,255,255,0.5)', fontSize: 13,
    textAlign: 'center', lineHeight: 19, marginTop: 10,
  },

  botaoCaminhaoDetalhe: {
    color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2,
  },

  // ── LISTA DE CAMINHOES ENVIADOS ──
  listaVaziaTexto: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },

  cardEnvio: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(46,204,64,0.4)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },

  cardEnvioLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },

  cardEnvioTexto: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  cardEnvioSubtexto: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
    gap: 6,
  },

  statusBolinha: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },

  statusTexto: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '700',
  },

});
