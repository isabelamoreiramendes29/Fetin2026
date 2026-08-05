// Configuracao central de navegacao do aplicativo Cemtinel
// Define todas as telas e como o usuario navega entre elas

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// ── TELAS PRINCIPAIS ──
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import CadastroScreen from '../screens/CadastroScreen';
import SelecionarObraScreen from '../screens/SelecionarObraScreen';
import CadastroObraScreen from '../screens/CadastroObraScreen';
import SelecionarObraConstrutoraScreen from '../screens/SelecionarObraConstrutoraScreen';

// ── MENU DO MESTRE DE OBRA ──
// Renomeada de MenuObraScreen.
import MenuMestreScreen from '../screens/MenuMestreScreen';

// ── TELAS DO MENU DO MESTRE ──
import TemperaturaScreen from '../screens/TemperaturaScreen';
import HistoricoTemperaturaScreen from '../screens/HistoricoTemperaturaScreen';
import FinanceiroScreen from '../screens/FinanceiroScreen';
import LocalizacaoScreen from '../screens/LocalizacaoScreen';

// ── MENU DA CONSTRUTORA ──
import MenuConstrutoraScreen from '../screens/MenuConstrutoraScreen';

// ── TELAS DO MENU DA CONSTRUTORA (placeholders) ──
import EnviarCaminhaoScreen from '../screens/EnviarCaminhaoScreen';
import HistoricoEntregasScreen from '../screens/HistoricoEntregasScreen';
import MonitorarTemperaturaScreen from '../screens/MonitorarTemperaturaScreen';

// ── MAPA DE CONCRETAGEM ──
// Compartilhada pelos dois perfis: a Construtora edita, o Mestre so consulta.
// Quem define isso e o parametro somenteLeitura, enviado pelo menu de origem.
import MapaConcretagemScreen from '../screens/MapaConcretagemScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerShown: false, // cada tela tem seu proprio cabecalho personalizado
        }}
      >
        {/* ── FLUXO DE AUTENTICACAO ── */}
        <Stack.Screen name="Welcome"        component={WelcomeScreen} />
        <Stack.Screen name="Login"          component={LoginScreen} />
        <Stack.Screen name="Cadastro"       component={CadastroScreen} />

        {/* ── SELECAO E CADASTRO DE OBRA ── */}
        <Stack.Screen name="SelecionarObra" component={SelecionarObraScreen} />
        <Stack.Screen name="CadastroObra"   component={CadastroObraScreen} />

        {/* ── MENU PRINCIPAL DO MESTRE DE OBRA ── */}
        {/* Rota renomeada de MenuObra para MenuMestre */}
        <Stack.Screen name="MenuMestre"     component={MenuMestreScreen} />

        {/* ── TELAS DO MENU DO MESTRE ── */}
        <Stack.Screen name="Temperatura"          component={TemperaturaScreen} />
        <Stack.Screen name="HistoricoTemperatura" component={HistoricoTemperaturaScreen} />
        <Stack.Screen name="Financeiro"           component={FinanceiroScreen} />

        {/* Rastreamento do caminhao — compartilhada: a construtora controla a
            viagem, o mestre acompanha via somenteLeitura */}
        <Stack.Screen name="Localizacao"          component={LocalizacaoScreen} />

        {/* ── SELECAO DE OBRA DA CONSTRUTORA ── */}
        <Stack.Screen name="SelecionarObraConstrutora" component={SelecionarObraConstrutoraScreen} />

        {/* ── MENU PRINCIPAL DA CONSTRUTORA ── */}
        <Stack.Screen name="MenuConstrutora" component={MenuConstrutoraScreen} />

        {/* ── TELAS DO MENU DA CONSTRUTORA (placeholders) ── */}
        <Stack.Screen name="EnviarCaminhao"        component={EnviarCaminhaoScreen} />
        <Stack.Screen name="HistoricoEntregas"     component={HistoricoEntregasScreen} />
        <Stack.Screen name="MonitorarTemperatura"  component={MonitorarTemperaturaScreen} />

        {/* ── MAPA DE CONCRETAGEM (Construtora edita, Mestre consulta) ── */}
        <Stack.Screen name="MapaConcretagem" component={MapaConcretagemScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}
