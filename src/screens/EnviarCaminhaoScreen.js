// Tela Enviar Caminhao — a Construtora escolhe um dos 2 caminhoes de teste
// (4 ou 5) e a obra de destino. Etapa 1: interface + persistencia local via
// CaminhoesContext (sem MQTT ainda).

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

import { useObras } from '../context/ObrasContext';
import { useCaminhoes } from '../context/CaminhoesContext';
import { publicarEnvioCaminhao } from '../services/mqtt';

const { width } = Dimensions.get('window');

// Caminhoes disponiveis para teste — fixos, sem cadastro dinamico ainda
const CAMINHOES = ['4', '5'];

// Formata a data ISO do envio para "DD/MM/AAAA HH:mm"
function formatarDataHora(isoString) {
  const data = new Date(isoString);
  const dataParte = data.toLocaleDateString('pt-BR');
  const horaParte = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dataParte} ${horaParte}`;
}

export default function EnviarCaminhaoScreen({ navigation }) {
  const { obras } = useObras();
  const { caminhoes, adicionarEnvio } = useCaminhoes();

  const [caminhaoSelecionado, setCaminhaoSelecionado] = useState(null);
  const [obraSelecionada, setObraSelecionada] = useState(null);

  // Valida selecao, publica no MQTT, registra o envio no contexto e limpa o formulario
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
      await publicarEnvioCaminhao({
        caminhao: caminhaoSelecionado,
        obraId: obra.id,
        obraNome: obra.nome,
      });

      adicionarEnvio(caminhaoSelecionado, obra);
      Alert.alert('Sucesso', `Caminhão ${caminhaoSelecionado} enviado para ${obra.nome}!`);

      setCaminhaoSelecionado(null);
      setObraSelecionada(null);

    } catch (erro) {
      console.error('[EnviarCaminhao] Erro:', erro.message);
      Alert.alert('Aviso', 'Enviado localmente, mas houve erro ao publicar no servidor.');

      // Salva local mesmo com erro no MQTT
      adicionarEnvio(caminhaoSelecionado, obra);
      setCaminhaoSelecionado(null);
      setObraSelecionada(null);
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

          <View style={styles.caminhoesRow}>
            {CAMINHOES.map((letra) => {
              const selecionado = caminhaoSelecionado === letra;
              return (
                <TouchableOpacity
                  key={letra}
                  style={[styles.botaoCaminhao, selecionado && styles.botaoCaminhaoSelecionado]}
                  onPress={() => setCaminhaoSelecionado(letra)}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="truck" size={26} color="#fff" />
                  <Text style={styles.botaoCaminhaoTexto}>Caminhão {letra}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
            caminhoes.slice().reverse().map((envio) => (
              <View key={envio.id} style={styles.cardEnvio}>
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

                <View style={styles.statusBadge}>
                  <View style={styles.statusBolinha} />
                  <Text style={styles.statusTexto}>{envio.status}</Text>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>
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
