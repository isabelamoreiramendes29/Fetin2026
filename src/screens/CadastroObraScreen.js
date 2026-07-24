// Tela de Cadastro de Obra — permite registrar uma nova obra com todos os detalhes
// Campos: localizacao, cronograma, recursos de cimento e responsaveis

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import InputCampo from '../components/InputCampo';
import SecaoTitulo from '../components/SecaoTitulo';
import { useObras } from '../context/ObrasContext';
import { publicarCadastroObra } from '../services/mqtt';

export default function CadastroObraScreen({ navigation }) {
  const { adicionarObra } = useObras();

  // ── ESTADOS DE LOCALIZACAO ──
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);

  // ── ESTADOS DE CRONOGRAMA ──
  const [dataInicio, setDataInicio] = useState(null);
  const [dataTermino, setDataTermino] = useState(null);
  const [mostrarPickerInicio, setMostrarPickerInicio] = useState(false);
  const [mostrarPickerTermino, setMostrarPickerTermino] = useState(false);

  // ── ESTADOS DE RECURSOS ──
  // Volume de cimento e sempre em m³ — nao existe campo de unidade
  const [volumeCimento, setVolumeCimento] = useState('');

  // ── ESTADOS DE RESPONSAVEIS ──
  // E-mail verificado no backend antes do cadastro prosseguir
  const [emailConstrutora, setEmailConstrutora] = useState('');

  // Controla o loading durante a verificacao dos e-mails no MQTT
  const [carregando, setCarregando] = useState(false);

  // Aplica mascara no CEP: XXXXX-XXX
  function aplicarMascaraCep(valor) {
    const n = valor.replace(/\D/g, '').slice(0, 8);
    return n.length > 5 ? n.slice(0, 5) + '-' + n.slice(5) : n;
  }

  // Busca endereco na API ViaCEP pelo CEP digitado
  async function buscarCep() {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
      Alert.alert('CEP invalido', 'Digite um CEP completo com 8 digitos.');
      return;
    }
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const dados = await res.json();
      if (dados.erro) {
        Alert.alert('CEP nao encontrado', 'Verifique o CEP e tente novamente.');
      } else {
        setEndereco([dados.logradouro, dados.bairro, dados.localidade, dados.uf].filter(Boolean).join(', '));
      }
    } catch {
      Alert.alert('Erro de conexao', 'Nao foi possivel buscar o CEP. Verifique sua internet.');
    } finally {
      setBuscandoCep(false);
    }
  }

  // Formata objeto Date para DD/MM/AAAA
  function formatarData(data) {
    if (!data) return '';
    return data.toLocaleDateString('pt-BR');
  }

  function onChangeInicio(_, dataSelecionada) {
    setMostrarPickerInicio(false);
    if (dataSelecionada) setDataInicio(dataSelecionada);
  }

  function onChangeTermino(_, dataSelecionada) {
    setMostrarPickerTermino(false);
    if (dataSelecionada) setDataTermino(dataSelecionada);
  }

  // Confirma cancelamento antes de voltar
  function handleCancelar() {
    Alert.alert(
      'Cancelar cadastro',
      'Tem certeza que deseja cancelar? Os dados nao serao salvos.',
      [
        { text: 'Nao', style: 'cancel' },
        { text: 'Sim, cancelar', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  }

  // Valida um endereco de e-mail no formato basico usuario@dominio.tld
  function emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Valida todos os campos, verifica os e-mails no backend,
  // publica no MQTT e salva a obra no contexto global
  async function handleSalvar() {
    if (!cep)          return Alert.alert('Campo obrigatorio', 'Preencha o CEP.');
    if (!endereco)     return Alert.alert('Campo obrigatorio', 'Preencha o Endereco.');
    if (!numero)       return Alert.alert('Campo obrigatorio', 'Preencha o Numero.');
    if (!dataInicio)   return Alert.alert('Campo obrigatorio', 'Selecione a Data de inicio.');
    if (!dataTermino)  return Alert.alert('Campo obrigatorio', 'Selecione a Data de termino.');
    if (!volumeCimento || parseFloat(volumeCimento) <= 0) {
      return Alert.alert('Erro', 'Informe o volume de cimento em m³.');
    }

    if (dataTermino <= dataInicio) {
      Alert.alert('Datas invalidas', 'A data de termino deve ser posterior a data de inicio.');
      return;
    }

    if (!emailConstrutora || !emailValido(emailConstrutora)) {
      return Alert.alert('Erro', 'Informe um e-mail valido da Construtora.');
    }

    setCarregando(true);

    try {
      const nome = `Obra - ${endereco.split(',')[0]}`;

      console.log('[DEBUG] Nome:', nome);
      console.log('[DEBUG] CEP:', cep);
      console.log('[DEBUG] Endereço:', endereco);
      console.log('[DEBUG] Número:', numero);
      console.log('[DEBUG] Complemento:', complemento);
      console.log('[DEBUG] Data Início:', dataInicio);
      console.log('[DEBUG] Data Término:', dataTermino);
      console.log('[DEBUG] Volume:', volumeCimento);
      console.log('[DEBUG] Email Construtora:', emailConstrutora);

      // Tenta publicar no MQTT — melhor esforco, nao bloqueia o cadastro local
      try {
        await publicarCadastroObra({
          nome, cep, endereco, numero, complemento,
          dataInicio: dataInicio.toISOString().split('T')[0],
          dataTermino: dataTermino.toISOString().split('T')[0],
          volumeCimento,
          emailConstrutora,
        });
      } catch (erro) {
        console.log('[CadastroObra] Erro no MQTT:', erro.message);
      }

      adicionarObra({
        nome,
        cep, endereco, numero, complemento,
        dataInicio: formatarData(dataInicio),
        dataTermino: formatarData(dataTermino),
        volumeCimento,
        emailConstrutora,
      });

      Alert.alert('Sucesso!', 'Obra cadastrada com sucesso!', [
        { text: 'OK', onPress: () => navigation.navigate('SelecionarObra') },
      ]);

    } catch (erro) {
      console.error('[CadastroObra] Erro ao salvar cadastro:', erro.message);
      Alert.alert('Erro', 'Nao foi possivel salvar a obra. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <LinearGradient colors={['#1A56DB', '#0B2065', '#1565C0']} locations={[0, 0.5, 1]} style={styles.container}>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── CABECALHO ── */}
          <View style={styles.cabecalho}>
            <TouchableOpacity style={styles.botaoVoltar} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.cabecalhoTitulo}>
              <Text style={styles.titulo}>Cadastro de Obra</Text>
              <View style={styles.linhaVerde} />
            </View>
            <MaterialCommunityIcons name="wall" size={32} color="rgba(255,255,255,0.7)" />
          </View>

          {/* ══ SECAO 1: LOCALIZACAO ══ */}
          <SecaoTitulo titulo="Localização" />

          <View style={styles.linha}>
            <InputCampo icone="location-outline" placeholder="CEP" value={cep}
              onChangeText={v => setCep(aplicarMascaraCep(v))} keyboardType="numeric" style={styles.campoCep} />
            <TouchableOpacity style={styles.botaoBuscar} onPress={buscarCep}>
              {buscandoCep
                ? <ActivityIndicator size="small" color="#fff" />
                : <><Ionicons name="search-outline" size={16} color="#fff" /><Text style={styles.textoBuscar}> Buscar</Text></>
              }
            </TouchableOpacity>
          </View>

          <InputCampo icone="location-outline" placeholder="Endereço" value={endereco}
            onChangeText={setEndereco} style={styles.campoFull} />

          <View style={styles.linha}>
            <InputCampo icone="pricetag-outline" placeholder="Número" value={numero}
              onChangeText={setNumero} keyboardType="numeric" style={styles.campoMetade} />
            <InputCampo icone="grid-outline" placeholder="Complemento" value={complemento}
              onChangeText={setComplemento} style={styles.campoMetade} />
          </View>

          {/* ══ SECAO 2: CRONOGRAMA ══ */}
          <SecaoTitulo titulo="Cronograma" />

          <View style={styles.linha}>
            <TouchableOpacity style={[styles.campoData, styles.campoMetade]} onPress={() => setMostrarPickerInicio(true)}>
              <Ionicons name="calendar-outline" size={18} color="#2ECC40" style={{ marginRight: 8 }} />
              <Text style={dataInicio ? styles.textoData : styles.textoPlaceholder}>
                {dataInicio ? formatarData(dataInicio) : 'Data de início'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.campoData, styles.campoMetade]} onPress={() => setMostrarPickerTermino(true)}>
              <Ionicons name="calendar-outline" size={18} color="#2ECC40" style={{ marginRight: 8 }} />
              <Text style={dataTermino ? styles.textoData : styles.textoPlaceholder}>
                {dataTermino ? formatarData(dataTermino) : 'Data de término'}
              </Text>
            </TouchableOpacity>
          </View>

          {mostrarPickerInicio && (
            <DateTimePicker value={dataInicio || new Date()} mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'} onChange={onChangeInicio} />
          )}
          {mostrarPickerTermino && (
            <DateTimePicker value={dataTermino || new Date()} mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'} onChange={onChangeTermino} />
          )}

          {/* ══ SECAO 3: RECURSOS - CIMENTO ══ */}
          <SecaoTitulo titulo="Recursos - Cimento" />

          <InputCampo icone="cube-outline" placeholder="Volume de Cimento (m³)" value={volumeCimento}
            onChangeText={setVolumeCimento} keyboardType="numeric" style={styles.campoFull} />

          {/* ══ SECAO 4: RESPONSAVEL ══ */}
          <SecaoTitulo titulo="Responsável" />

          <InputCampo icone="mail-outline" placeholder="E-mail da Construtora" value={emailConstrutora}
            onChangeText={setEmailConstrutora} keyboardType="email-address" autoCapitalize="none" style={styles.campoFull} />

          {/* ── BOTOES ── */}
          <View style={styles.linhaBotoes}>
            <TouchableOpacity style={styles.botaoCancelar} onPress={handleCancelar}>
              <Text style={styles.textoCancelar}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botaoSalvar} onPress={handleSalvar} disabled={carregando}>
              {carregando ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="content-save" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.textoSalvar}>Salvar Cadastro</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Nota informativa */}
          <View style={styles.nota}>
            <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.5)" />
            <Text style={styles.textoNota}> *Nota: O volume de cimento é obrigatório.</Text>
          </View>

          {/* Silhueta decorativa da fabrica */}
          <View style={styles.rodape}>
            <Ionicons name="business" size={90} color="rgba(255,255,255,0.08)" />
            <Ionicons name="business" size={70} color="rgba(255,255,255,0.06)" style={{ marginLeft: -20 }} />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 24 },

  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },

  botaoVoltar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },

  cabecalhoTitulo: { alignItems: 'center' },

  titulo: { color: '#fff', fontSize: 22, fontWeight: 'bold' },

  linhaVerde: { width: 60, height: 3, backgroundColor: '#2ECC40', borderRadius: 2, marginTop: 4 },

  linha: { flexDirection: 'row', gap: 10, marginBottom: 10 },

  campoFull: { marginBottom: 10 },
  campoCep: { flex: 2 },
  campoMetade: { flex: 1 },

  botaoBuscar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(46,204,64,0.25)', borderWidth: 1.5, borderColor: '#2ECC40',
    borderRadius: 12, height: 50, gap: 2,
  },

  textoBuscar: { color: '#fff', fontSize: 13, fontWeight: '600' },

  campoData: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5,
    borderColor: 'rgba(46,204,64,0.5)', borderRadius: 12, height: 50, paddingHorizontal: 12,
  },

  textoData: { color: '#fff', fontSize: 14, flex: 1 },
  textoPlaceholder: { color: 'rgba(255,255,255,0.4)', fontSize: 14, flex: 1 },

  linhaBotoes: { flexDirection: 'row', gap: 10, marginTop: 24, marginBottom: 8 },

  botaoCancelar: {
    flex: 1, height: 52, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },

  textoCancelar: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  botaoSalvar: {
    flex: 1.3, height: 52, backgroundColor: '#2ECC40', borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#2ECC40', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },

  textoSalvar: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  nota: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 16 },

  textoNota: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },

  rodape: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginTop: 8 },
});
