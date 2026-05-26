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

// ── MENU DA OBRA ──
// Substitui o antigo HomeObraScreen (placeholder)
import MenuObraScreen from '../screens/MenuObraScreen';

// ── TELAS DO MENU DA OBRA ──
import GraficoTemperaturaScreen from '../screens/GraficoTemperaturaScreen';
import HistoricoTemperaturaScreen from '../screens/HistoricoTemperaturaScreen';
import FinanceiroScreen from '../screens/FinanceiroScreen';
import LocalizacaoScreen from '../screens/LocalizacaoScreen';

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

        {/* ── MENU PRINCIPAL DA OBRA ── */}
        {/* Rota renomeada de HomeObra para MenuObra */}
        <Stack.Screen name="MenuObra"       component={MenuObraScreen} />

        {/* ── TELAS DO MENU ── */}
        <Stack.Screen name="GraficoTemperatura"   component={GraficoTemperaturaScreen} />
        <Stack.Screen name="HistoricoTemperatura" component={HistoricoTemperaturaScreen} />
        <Stack.Screen name="Financeiro"           component={FinanceiroScreen} />
        <Stack.Screen name="Localizacao"          component={LocalizacaoScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}
