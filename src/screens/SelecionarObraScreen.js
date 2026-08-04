// Tela de Selecionar Obra — aparece logo apos o login
// O usuario escolhe qual obra quer monitorar ou cadastra uma nova

import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Hook do contexto global de obras
import { useObras } from '../context/ObrasContext';

// Componente reutilizavel de card
import CardObra from '../components/CardObra';
import BotaoSair from '../components/BotaoSair';

const { width } = Dimensions.get('window');

export default function SelecionarObraScreen({ navigation }) {
  // Acessa a lista de obras do contexto global
  const { obras } = useObras();

  // Card especial que fica sempre ao final da lista
  const cardAdicionar = { id: 'adicionar', nome: 'Adicionar', adicionar: true };

  // Junta as obras reais com o card de adicionar no final
  const listaCompleta = [...obras, cardAdicionar];

  // Define o que acontece ao clicar em cada card
  function handlePressCard(item) {
    if (item.adicionar) {
      // Vai para a tela de cadastro de obra
      navigation.navigate('CadastroObra');
    } else {
      // Vai para o menu da obra selecionada, passando os dados como parametro
      navigation.navigate('MenuMestre', { obraId: item.id, obraNome: item.nome });
    }
  }

  return (
    <LinearGradient
      colors={['#1A56DB', '#0B2065', '#1565C0']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >

      {/* ── CABECALHO ── */}
      {/* Sem botao de voltar de proposito: esta e a primeira tela depois do
          login, e voltar levaria de volta ao Login com a sessao ainda aberta.
          Para encerrar a sessao existe o botao de sair, a direita. */}
      <View style={styles.cabecalho}>
        <View style={styles.cabecalhoEsquerda}>

          {/* Titulo e linha decorativa */}
          <View>
            <Text style={styles.titulo}>Selecionar Obra</Text>
            <View style={styles.linhaDecorada} />
          </View>
        </View>

        <BotaoSair navigation={navigation} />
      </View>

      {/* ── LISTA DE OBRAS ── */}
      <FlatList
        data={listaCompleta}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <CardObra
            nome={item.nome}
            adicionar={item.adicionar}
            onPress={() => handlePressCard(item)}
          />
        )}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
      />

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Tela inteira com gradiente
  container: {
    flex: 1,
    paddingTop: 56,
  },

  // Linha do cabecalho (titulo + icone)
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 28,
  },

  // Lado esquerdo do cabecalho (titulo)
  cabecalhoEsquerda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  // Titulo "Selecionar Obra"
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },

  // Linha verde decorativa abaixo do titulo
  linhaDecorada: {
    width: 60,
    height: 3,
    backgroundColor: '#2ECC40',
    borderRadius: 2,
  },

  // Padding interno da lista
  lista: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },

});
