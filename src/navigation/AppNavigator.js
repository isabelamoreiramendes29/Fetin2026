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

// ── MENU DO MESTRE DE OBRA ──
// Substitui o antigo HomeObraScreen (placeholder). Renomeada de MenuObraScreen.
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
import RastrearCaminhoesScreen from '../screens/RastrearCaminhoesScreen';
import HistoricoEntregasScreen from '../screens/HistoricoEntregasScreen';
import MonitorarTemperaturaScreen from '../screens/MonitorarTemperaturaScreen';

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
        <Stack.Screen name="Localizacao"          component={LocalizacaoScreen} />

        {/* ── MENU PRINCIPAL DA CONSTRUTORA ── */}
        <Stack.Screen name="MenuConstrutora" component={MenuConstrutoraScreen} />

        {/* ── TELAS DO MENU DA CONSTRUTORA (placeholders) ── */}
        <Stack.Screen name="EnviarCaminhao"        component={EnviarCaminhaoScreen} />
        <Stack.Screen name="RastrearCaminhoes"     component={RastrearCaminhoesScreen} />
        <Stack.Screen name="HistoricoEntregas"     component={HistoricoEntregasScreen} />
        <Stack.Screen name="MonitorarTemperatura"  component={MonitorarTemperaturaScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}
