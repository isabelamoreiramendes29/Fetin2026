// Tela Mapa de Concretagem
// Recebe obraId, obraNome e somenteLeitura via route.params
//
// Para que serve: o concreto de cada caminhao vai para um trecho diferente da
// estrutura, e o corpo de prova daquela carga so e rompido 28 dias depois. Se o
// resultado vier abaixo do fck, e preciso saber QUAL parte da obra recebeu
// aquele concreto.
//
// Quem faz o que (definido pela divisao de responsabilidade da obra):
//   Construtora — cadastra a planta, marca as areas de cada caminhao e lanca
//                 o resultado do laboratorio. E ela quem responde pelo ensaio.
//   Mestre      — apenas consulta o mapa pronto. Entra com somenteLeitura,
//                 e nesse modo a tela nao oferece nenhuma acao de edicao.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import PlantaInterativa from '../components/PlantaInterativa';
import {
  buscarPlanta,
  enviarPlanta,
  salvarRegiao,
  lancarResultado,
  registrarReforco,
  removerRegiao,
  avaliarRegiao,
  situacaoGeral,
} from '../services/planta';

const { width } = Dimensions.get('window');
const LARGURA_PLANTA = width - 32; // 16 de padding de cada lado

// Minimo de vertices para fechar uma area
const MIN_VERTICES = 3;

// Formata ISO para DD/MM/AAAA
function formatarData(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function MapaConcretagemScreen({ navigation, route }) {
  const { obraId, obraNome, somenteLeitura = false } = route.params;

  const [planta, setPlanta]         = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]             = useState(null);
  const [enviando, setEnviando]     = useState(false);

  // fck usado ao cadastrar a planta pela primeira vez (C25 e o mais comum)
  const [fckTexto, setFckTexto] = useState('25');

  // ── ESTADO DA MARCACAO ──
  const [modo, setModo]               = useState('visualizando');
  const [pontosNovos, setPontosNovos] = useState([]);

  // ── MODAIS ──
  const [modalNovaArea, setModalNovaArea] = useState(false);
  const [caminhaoTexto, setCaminhaoTexto] = useState('');
  const [corpoProvaTexto, setCorpoProvaTexto] = useState('');

  const [regiaoAberta, setRegiaoAberta] = useState(null);
  const [mpaTexto, setMpaTexto]         = useState('');
  const [reforcoTexto, setReforcoTexto] = useState('');

  // ── CARREGAMENTO ──
  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      setPlanta(await buscarPlanta(obraId));
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setCarregando(false);
    }
  }, [obraId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // ── CADASTRAR A PLANTA ──
  // origem: 'camera' abre a camera, 'galeria' abre os arquivos do aparelho
  async function escolherImagem(origem) {
    const fck = parseFloat(fckTexto.replace(',', '.'));
    if (!fck || fck <= 0) {
      Alert.alert('fck inválido', 'Informe a resistência esperada do concreto, em MPa.');
      return;
    }

    const permissao = origem === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissao.granted) {
      Alert.alert(
        'Permissão necessária',
        origem === 'camera'
          ? 'Libere o acesso à câmera para fotografar a planta.'
          : 'Libere o acesso às fotos para escolher a planta.'
      );
      return;
    }

    const opcoes = {
      base64: true,     // o upload para o Storage precisa dos bytes
      quality: 0.7,     // planta nao precisa de qualidade maxima; economiza upload
      mediaTypes: ['images'],
    };

    const resultado = origem === 'camera'
      ? await ImagePicker.launchCameraAsync(opcoes)
      : await ImagePicker.launchImageLibraryAsync(opcoes);

    if (resultado.canceled) return;

    setEnviando(true);
    try {
      await enviarPlanta(obraId, resultado.assets[0], fck);
      await carregar();
    } catch (falha) {
      Alert.alert('Erro', falha.message);
    } finally {
      setEnviando(false);
    }
  }

  // Trocar a planta apaga as regioes junto (cascade no banco), entao avisa antes
  function confirmarTrocaPlanta() {
    const quantidade = planta?.regioes.length || 0;

    Alert.alert(
      'Trocar planta',
      quantidade > 0
        ? `As ${quantidade} área(s) já marcadas serão apagadas junto. Continuar?`
        : 'Deseja substituir a planta desta obra?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Trocar', style: 'destructive', onPress: () => escolherImagem('galeria') },
      ]
    );
  }

  // ── MARCACAO DE AREA ──
  function iniciarMarcacao() {
    setPontosNovos([]);
    setModo('marcando');
  }

  function cancelarMarcacao() {
    setPontosNovos([]);
    setModo('visualizando');
  }

  function desfazerUltimoPonto() {
    setPontosNovos((atuais) => atuais.slice(0, -1));
  }

  function concluirArea() {
    if (pontosNovos.length < MIN_VERTICES) return;
    setCaminhaoTexto('');
    setCorpoProvaTexto('');
    setModalNovaArea(true);
  }

  async function confirmarNovaArea() {
    if (!caminhaoTexto.trim()) {
      Alert.alert('Caminhão', 'Informe qual caminhão concretou esta área.');
      return;
    }

    try {
      const nova = await salvarRegiao(planta.id, {
        caminhao: caminhaoTexto.trim(),
        pontos: pontosNovos,
        corpoProva: corpoProvaTexto.trim(),
      });

      setPlanta((atual) => ({ ...atual, regioes: [...atual.regioes, nova] }));
      setModalNovaArea(false);
      cancelarMarcacao();
    } catch (falha) {
      Alert.alert('Erro', falha.message);
    }
  }

  // ── RESULTADO DO LABORATORIO ──
  function abrirRegiao(regiao) {
    setRegiaoAberta(regiao);
    setMpaTexto(regiao.resultadoMpa != null ? String(regiao.resultadoMpa) : '');
    setReforcoTexto(regiao.reforcoDescricao || '');
  }

  // Substitui a regiao na lista em memoria pela versao devolvida pelo banco,
  // para a cor mudar na hora sem precisar recarregar a tela inteira
  function atualizarRegiaoNaTela(atualizada) {
    setPlanta((atual) => ({
      ...atual,
      regioes: atual.regioes.map((r) => (r.id === atualizada.id ? atualizada : r)),
    }));
    setRegiaoAberta(null);
  }

  async function confirmarReforco() {
    if (!reforcoTexto.trim()) {
      Alert.alert('Reforço', 'Descreva o reforço executado nesta área.');
      return;
    }

    try {
      atualizarRegiaoNaTela(await registrarReforco(regiaoAberta.id, reforcoTexto.trim()));
    } catch (falha) {
      Alert.alert('Erro', falha.message);
    }
  }

  async function confirmarResultado() {
    const mpa = parseFloat(mpaTexto.replace(',', '.'));

    if (!mpa || mpa <= 0) {
      Alert.alert('Resultado inválido', 'Informe a resistência medida, em MPa.');
      return;
    }

    try {
      atualizarRegiaoNaTela(await lancarResultado(regiaoAberta.id, mpa));
    } catch (falha) {
      Alert.alert('Erro', falha.message);
    }
  }

  function confirmarRemocao() {
    Alert.alert('Remover área', 'Esta marcação será apagada. Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await removerRegiao(regiaoAberta.id);
            setPlanta((atual) => ({
              ...atual,
              regioes: atual.regioes.filter((r) => r.id !== regiaoAberta.id),
            }));
            setRegiaoAberta(null);
          } catch (falha) {
            Alert.alert('Erro', falha.message);
          }
        },
      },
    ]);
  }

  // ── RESUMO PARA OS CARDS ──
  // Passa por avaliarRegiao para que "reprovada" conte so o que ainda nao
  // recebeu reforco — area tratada nao e mais pendencia
  const regioes = planta?.regioes || [];
  const avaliacoes = planta ? regioes.map((r) => avaliarRegiao(r, planta.fckProjeto)) : [];

  const pendentes  = avaliacoes.filter((a) => a.status === 'pendente').length;
  const reprovadas = avaliacoes.filter((a) => a.status === 'reprovado').length;

  const situacao = planta ? situacaoGeral(regioes, planta.fckProjeto) : null;

  // Avaliacao da regiao aberta no modal, calculada uma vez so
  const avaliacaoAberta = regiaoAberta && planta
    ? avaliarRegiao(regiaoAberta, planta.fckProjeto)
    : null;

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
            <Text style={styles.titulo}>{'Mapa de\nConcretagem'}</Text>
            <View style={styles.linhaDecorada} />
          </View>

          <View style={styles.iconeQuadrado}>
            <MaterialCommunityIcons name="map-marker-radius" size={22} color="#22C55E" />
          </View>
        </View>

        <Text style={styles.nomeObra}>{obraNome}</Text>

        {/* ── CARREGANDO ── */}
        {carregando && (
          <View style={styles.estadoVazio}>
            <ActivityIndicator size="large" color="#22C55E" />
            <Text style={styles.estadoVazioTexto}>Carregando planta...</Text>
          </View>
        )}

        {/* ── ERRO ── */}
        {!carregando && erro && (
          <View style={styles.estadoVazio}>
            <Ionicons name="cloud-offline-outline" size={44} color="rgba(255,255,255,0.35)" />
            <Text style={styles.estadoVazioTitulo}>Não foi possível carregar</Text>
            <Text style={styles.estadoVazioTexto}>{erro}</Text>
          </View>
        )}

        {/* ── SEM PLANTA, MODO CONSULTA ── */}
        {/* O Mestre nao cadastra planta: quem faz isso e a construtora */}
        {!carregando && !erro && !planta && somenteLeitura && (
          <View style={styles.estadoVazio}>
            <MaterialCommunityIcons
              name="floor-plan"
              size={48}
              color="rgba(255,255,255,0.35)"
            />
            <Text style={styles.estadoVazioTitulo}>Mapa ainda não disponível</Text>
            <Text style={styles.estadoVazioTexto}>
              A construtora ainda não cadastrou a planta desta obra.
            </Text>
          </View>
        )}

        {/* ── SEM PLANTA: CADASTRO ── */}
        {!carregando && !erro && !planta && !somenteLeitura && (
          <View style={[styles.card, styles.cardCadastro]}>
            <MaterialCommunityIcons
              name="floor-plan"
              size={48}
              color="rgba(255,255,255,0.35)"
            />
            <Text style={styles.estadoVazioTitulo}>Nenhuma planta cadastrada</Text>
            <Text style={styles.estadoVazioTexto}>
              Fotografe a planta do projeto para começar a marcar onde cada caminhão concretou.
            </Text>

            <Text style={styles.campoLabel}>Resistência esperada (fck)</Text>
            <View style={styles.campoLinha}>
              <TextInput
                style={styles.campoInput}
                value={fckTexto}
                onChangeText={setFckTexto}
                keyboardType="decimal-pad"
                placeholder="25"
                placeholderTextColor="rgba(255,255,255,0.35)"
              />
              <Text style={styles.campoSufixo}>MPa</Text>
            </View>
            <Text style={styles.campoAjuda}>
              É contra este valor que cada resultado do laboratório será comparado.
            </Text>

            {enviando ? (
              <ActivityIndicator size="large" color="#22C55E" style={{ marginTop: 20 }} />
            ) : (
              <View style={styles.botoesOrigem}>
                <TouchableOpacity
                  style={styles.botaoOrigem}
                  onPress={() => escolherImagem('camera')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="camera-outline" size={22} color="#fff" />
                  <Text style={styles.botaoOrigemTexto}>Fotografar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.botaoOrigem}
                  onPress={() => escolherImagem('galeria')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="images-outline" size={22} color="#fff" />
                  <Text style={styles.botaoOrigemTexto}>Galeria</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── COM PLANTA ── */}
        {!carregando && !erro && planta && (
          <>
            {/* Situacao geral — a resposta rapida para "a concretagem esta ok?" */}
            <View style={[styles.situacao, { borderColor: situacao.cor }]}>
              <View style={[styles.situacaoPonto, { backgroundColor: situacao.cor }]} />
              <Text style={[styles.situacaoTexto, { color: situacao.cor }]}>
                {situacao.texto}
              </Text>
            </View>

            {/* Resumo */}
            <View style={styles.resumoLinha}>
              <View style={[styles.card, styles.cardResumo]}>
                <Text style={styles.resumoValor}>{regioes.length}</Text>
                <Text style={styles.resumoLabel}>ÁREAS</Text>
              </View>
              <View style={[styles.card, styles.cardResumo]}>
                <Text style={[styles.resumoValor, { color: '#FACC15' }]}>{pendentes}</Text>
                <Text style={styles.resumoLabel}>PENDENTES</Text>
              </View>
              <View style={[styles.card, styles.cardResumo]}>
                <Text style={[styles.resumoValor, { color: reprovadas > 0 ? '#DC2626' : '#22C55E' }]}>
                  {reprovadas}
                </Text>
                <Text style={styles.resumoLabel}>REPROVADAS</Text>
              </View>
            </View>

            {/* Instrucao do modo de marcacao */}
            {modo === 'marcando' && (
              <View style={styles.aviso}>
                <Ionicons name="information-circle-outline" size={18} color="#22C55E" />
                <Text style={styles.avisoTexto}>
                  Toque nos cantos da área. Mínimo de {MIN_VERTICES} pontos.
                </Text>
              </View>
            )}

            {/* A planta */}
            <View style={styles.plantaContainer}>
              <PlantaInterativa
                urlImagem={planta.urlImagem}
                largura={planta.largura}
                altura={planta.altura}
                regioes={regioes}
                fckProjeto={planta.fckProjeto}
                modo={modo}
                pontosNovos={pontosNovos}
                larguraDisponivel={LARGURA_PLANTA}
                onTocarPlanta={(ponto) => setPontosNovos((atuais) => [...atuais, ponto])}
                onTocarRegiao={abrirRegiao}
              />
            </View>

            {/* Controles — nenhum em modo consulta: o Mestre so olha */}
            {!somenteLeitura && (modo === 'visualizando' ? (
              <View style={styles.controles}>
                <TouchableOpacity
                  style={styles.botaoPrincipal}
                  onPress={iniciarMarcacao}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.botaoPrincipalTexto}>Marcar área</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.botaoSecundario}
                  onPress={confirmarTrocaPlanta}
                  activeOpacity={0.85}
                >
                  <Ionicons name="swap-horizontal-outline" size={20} color="#22C55E" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.controles}>
                <TouchableOpacity
                  style={styles.botaoSecundario}
                  onPress={cancelarMarcacao}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close" size={20} color="#22C55E" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.botaoSecundario, pontosNovos.length === 0 && styles.botaoDesabilitado]}
                  onPress={desfazerUltimoPonto}
                  disabled={pontosNovos.length === 0}
                  activeOpacity={0.85}
                >
                  <Ionicons name="arrow-undo-outline" size={20} color="#22C55E" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.botaoPrincipal,
                    pontosNovos.length < MIN_VERTICES && styles.botaoDesabilitado,
                  ]}
                  onPress={concluirArea}
                  disabled={pontosNovos.length < MIN_VERTICES}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.botaoPrincipalTexto}>
                    Concluir ({pontosNovos.length})
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Legenda */}
            <View style={[styles.card, styles.cardLegenda]}>
              <Text style={styles.cardTitulo}>LEGENDA</Text>
              <View style={styles.legendaLinha}>
                <View style={[styles.legendaCor, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.legendaTexto}>
                  Cor do caminhão — corpo de prova ainda não rompido
                </Text>
              </View>
              <View style={styles.legendaLinha}>
                <View style={[styles.legendaCor, { backgroundColor: '#22C55E' }]} />
                <Text style={styles.legendaTexto}>
                  Aprovado — atingiu {planta.fckProjeto} MPa
                </Text>
              </View>
              <View style={styles.legendaLinha}>
                <View style={[styles.legendaCor, styles.legendaCorTracejada]} />
                <Text style={styles.legendaTexto}>
                  Reforçado — reprovou e recebeu reforço estrutural
                </Text>
              </View>
              <View style={styles.legendaLinha}>
                <View style={[styles.legendaCor, { backgroundColor: '#DC2626' }]} />
                <Text style={styles.legendaTexto}>
                  Reprovado — abaixo de {planta.fckProjeto} MPa, sem tratamento
                </Text>
              </View>
            </View>
          </>
        )}

      </ScrollView>

      {/* ── MODAL: NOVA AREA ── */}
      <Modal
        visible={modalNovaArea}
        transparent
        animationType="fade"
        onRequestClose={() => setModalNovaArea(false)}
      >
        <View style={styles.modalFundo}>
          <View style={styles.modalCaixa}>
            <Text style={styles.modalTitulo}>Nova área</Text>
            <Text style={styles.modalSubtitulo}>
              {pontosNovos.length} pontos marcados
            </Text>

            <Text style={styles.campoLabel}>Caminhão</Text>
            <TextInput
              style={styles.modalInput}
              value={caminhaoTexto}
              onChangeText={setCaminhaoTexto}
              placeholder="Ex: Caminhão X"
              placeholderTextColor="rgba(255,255,255,0.35)"
            />

            <Text style={styles.campoLabel}>Corpo de prova (opcional)</Text>
            <TextInput
              style={styles.modalInput}
              value={corpoProvaTexto}
              onChangeText={setCorpoProvaTexto}
              placeholder="Ex: CP-04"
              placeholderTextColor="rgba(255,255,255,0.35)"
              autoCapitalize="characters"
            />

            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={styles.modalBotaoCancelar}
                onPress={() => setModalNovaArea(false)}
              >
                <Text style={styles.modalBotaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalBotaoConfirmar} onPress={confirmarNovaArea}>
                <Text style={styles.modalBotaoConfirmarTexto}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: DETALHES DA REGIAO ── */}
      <Modal
        visible={regiaoAberta !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRegiaoAberta(null)}
      >
        <View style={styles.modalFundo}>
          {regiaoAberta && (
            <View style={styles.modalCaixa}>
              <ScrollView showsVerticalScrollIndicator={false}>

              <Text style={styles.modalTitulo}>{regiaoAberta.caminhao}</Text>

              <View style={[styles.selo, { backgroundColor: avaliacaoAberta.cor }]}>
                <Text style={styles.seloTexto}>{avaliacaoAberta.rotulo}</Text>
              </View>

              <View style={styles.detalheLinha}>
                <Text style={styles.detalheLabel}>Corpo de prova</Text>
                <Text style={styles.detalheValor}>{regiaoAberta.corpoProva || '—'}</Text>
              </View>

              <View style={styles.detalheLinha}>
                <Text style={styles.detalheLabel}>Concretagem</Text>
                <Text style={styles.detalheValor}>
                  {formatarData(regiaoAberta.dataConcretagem)}
                </Text>
              </View>

              <View style={styles.detalheLinha}>
                <Text style={styles.detalheLabel}>fck do projeto</Text>
                <Text style={styles.detalheValor}>{planta.fckProjeto} MPa</Text>
              </View>

              {regiaoAberta.resultadoMpa != null && (
                <View style={styles.detalheLinha}>
                  <Text style={styles.detalheLabel}>Rompido em</Text>
                  <Text style={styles.detalheValor}>
                    {formatarData(regiaoAberta.dataRompimento)}
                  </Text>
                </View>
              )}

              {/* Historico do reforco — fica visivel para os dois perfis, porque
                  e justamente o rastro que o mapa precisa preservar */}
              {regiaoAberta.dataReforco && (
                <>
                  <View style={styles.detalheLinha}>
                    <Text style={styles.detalheLabel}>Reforçado em</Text>
                    <Text style={styles.detalheValor}>
                      {formatarData(regiaoAberta.dataReforco)}
                    </Text>
                  </View>

                  <View style={styles.detalheBloco}>
                    <Text style={styles.detalheLabel}>Reforço executado</Text>
                    <Text style={styles.detalheTexto}>{regiaoAberta.reforcoDescricao}</Text>
                  </View>
                </>
              )}

              {/* Em modo consulta o resultado e so mais uma linha de leitura;
                  quem lanca e remove e a construtora */}
              {somenteLeitura ? (
                <>
                  <View style={styles.detalheLinha}>
                    <Text style={styles.detalheLabel}>Resistência medida</Text>
                    <Text style={styles.detalheValor}>
                      {regiaoAberta.resultadoMpa != null
                        ? `${regiaoAberta.resultadoMpa} MPa`
                        : '—'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.modalBotaoConfirmarLargo}
                    onPress={() => setRegiaoAberta(null)}
                  >
                    <Text style={styles.modalBotaoConfirmarTexto}>Fechar</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.campoLabel}>Resistência medida</Text>
                  <View style={styles.campoLinha}>
                    <TextInput
                      style={styles.campoInput}
                      value={mpaTexto}
                      onChangeText={setMpaTexto}
                      keyboardType="decimal-pad"
                      placeholder="Ex: 28,5"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                    />
                    <Text style={styles.campoSufixo}>MPa</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.modalBotaoConfirmarLargo}
                    onPress={confirmarResultado}
                  >
                    <Text style={styles.modalBotaoConfirmarTexto}>
                      {regiaoAberta.resultadoMpa != null ? 'Atualizar resultado' : 'Lançar resultado'}
                    </Text>
                  </TouchableOpacity>

                  {/* Reforco estrutural — so aparece depois que o ensaio reprovou.
                      Nao faz sentido registrar tratamento em area aprovada nem em
                      area cujo corpo de prova ainda nem foi rompido. */}
                  {(avaliacaoAberta.status === 'reprovado' ||
                    avaliacaoAberta.status === 'resolvido') && (
                    <>
                      <View style={styles.separadorModal} />

                      <Text style={styles.campoLabel}>Reforço executado</Text>
                      <TextInput
                        style={[styles.modalInput, styles.modalInputAlto]}
                        value={reforcoTexto}
                        onChangeText={setReforcoTexto}
                        placeholder="Ex: encamisamento com fibra de carbono"
                        placeholderTextColor="rgba(255,255,255,0.35)"
                        multiline
                      />

                      <TouchableOpacity
                        style={styles.modalBotaoConfirmarLargo}
                        onPress={confirmarReforco}
                      >
                        <Text style={styles.modalBotaoConfirmarTexto}>
                          {regiaoAberta.dataReforco ? 'Atualizar reforço' : 'Registrar reforço'}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  <View style={styles.modalBotoes}>
                    <TouchableOpacity style={styles.modalBotaoCancelar} onPress={confirmarRemocao}>
                      <Text style={styles.modalBotaoRemoverTexto}>Remover área</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalBotaoCancelar}
                      onPress={() => setRegiaoAberta(null)}
                    >
                      <Text style={styles.modalBotaoCancelarTexto}>Fechar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              </ScrollView>
            </View>
          )}
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
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },

  cardCadastro: {
    marginHorizontal: 16, padding: 24, alignItems: 'center',
  },

  // ── SITUACAO GERAL ──
  situacao: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    borderWidth: 1.5, borderRadius: 12,
    backgroundColor: 'rgba(11, 32, 101, 0.6)',
  },

  situacaoPonto: { width: 10, height: 10, borderRadius: 5 },

  situacaoTexto: { fontSize: 13, fontWeight: 'bold', flex: 1 },

  // ── RESUMO ──
  resumoLinha: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 14,
  },

  cardResumo: { flex: 1, paddingVertical: 14, alignItems: 'center' },

  resumoValor: { color: '#fff', fontSize: 24, fontWeight: 'bold' },

  resumoLabel: {
    color: 'rgba(255,255,255,0.5)', fontSize: 9,
    fontWeight: 'bold', letterSpacing: 1, marginTop: 2,
  },

  // ── AVISO DO MODO MARCACAO ──
  aviso: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10,
    paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 10,
  },

  avisoTexto: { color: '#22C55E', fontSize: 12, flex: 1 },

  // ── PLANTA ──
  plantaContainer: { paddingHorizontal: 16, marginBottom: 14 },

  // ── CONTROLES ──
  controles: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, marginBottom: 16,
  },

  botaoPrincipal: {
    flex: 1, height: 50,
    backgroundColor: '#22C55E', borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },

  botaoPrincipalTexto: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  botaoSecundario: {
    width: 50, height: 50,
    borderWidth: 1.5, borderColor: 'rgba(34, 197, 94, 0.55)',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },

  botaoDesabilitado: { opacity: 0.35 },

  // ── CADASTRO DA PLANTA ──
  campoLabel: {
    color: 'rgba(255,255,255,0.6)', fontSize: 12,
    fontWeight: 'bold', letterSpacing: 0.5,
    alignSelf: 'flex-start', marginTop: 18, marginBottom: 8,
  },

  campoLinha: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    borderWidth: 1.5, borderColor: '#2ECC40', borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 14, height: 52,
  },

  campoInput: { flex: 1, color: '#fff', fontSize: 16 },

  campoSufixo: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 'bold' },

  campoAjuda: {
    color: 'rgba(255,255,255,0.4)', fontSize: 11,
    marginTop: 8, lineHeight: 16,
  },

  botoesOrigem: { flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' },

  botaoOrigem: {
    flex: 1, height: 52, backgroundColor: '#22C55E', borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },

  botaoOrigemTexto: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  // ── LEGENDA ──
  cardLegenda: { marginHorizontal: 16, padding: 16 },

  cardTitulo: {
    color: '#22C55E', fontSize: 11, fontWeight: 'bold',
    letterSpacing: 1.5, textAlign: 'center', marginBottom: 12,
  },

  legendaLinha: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },

  legendaCor: { width: 16, height: 16, borderRadius: 4 },

  // Espelha o tracejado que o poligano reforcado recebe na planta
  legendaCorTracejada: {
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    borderWidth: 1.5, borderColor: '#22C55E', borderStyle: 'dashed',
  },

  legendaTexto: { color: 'rgba(255,255,255,0.7)', fontSize: 12, flex: 1 },

  // ── ESTADOS VAZIOS ──
  estadoVazio: {
    marginHorizontal: 16, marginBottom: 20,
    paddingVertical: 48, paddingHorizontal: 24,
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

  // ── MODAIS ──
  modalFundo: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },

  modalCaixa: {
    width: '100%',
    // Limita a altura porque o painel da regiao cresce quando ha reforco
    maxHeight: '85%',
    backgroundColor: '#0B2065',
    borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.4)',
    borderRadius: 18, padding: 22,
  },

  modalTitulo: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },

  modalSubtitulo: {
    color: 'rgba(255,255,255,0.5)', fontSize: 12,
    textAlign: 'center', marginTop: 4,
  },

  modalInput: {
    borderWidth: 1.5, borderColor: '#2ECC40', borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 14, height: 52, color: '#fff', fontSize: 16,
  },

  modalBotoes: { flexDirection: 'row', gap: 10, marginTop: 20 },

  modalBotaoCancelar: {
    flex: 1, height: 48, borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },

  modalBotaoCancelarTexto: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: 'bold' },

  modalBotaoRemoverTexto: { color: '#F87171', fontSize: 14, fontWeight: 'bold' },

  modalBotaoConfirmar: {
    flex: 1, height: 48, borderRadius: 12, backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center',
  },

  modalBotaoConfirmarLargo: {
    height: 48, borderRadius: 12, backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center', marginTop: 18,
  },

  modalBotaoConfirmarTexto: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  // ── DETALHES DA REGIAO ──
  selo: {
    alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, marginTop: 12, marginBottom: 16,
  },

  seloTexto: { color: '#fff', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 },

  detalheLinha: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },

  detalheLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },

  detalheValor: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Texto longo (descricao do reforco) ocupa a linha inteira, nao a coluna
  detalheBloco: {
    paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },

  detalheTexto: {
    color: '#fff', fontSize: 13, lineHeight: 19, marginTop: 4,
  },

  separadorModal: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 20,
  },

  modalInputAlto: { height: 88, paddingTop: 14, textAlignVertical: 'top' },
});
