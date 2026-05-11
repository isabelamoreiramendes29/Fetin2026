// Configuracao central de navegacao do aplicativo Cemtinel
// Define todas as telas e como o usuario navega entre elas

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Importacao de todas as telas
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import CadastroScreen from '../screens/CadastroScreen';
import SelecionarObraScreen from '../screens/SelecionarObraScreen';
import HomeObraScreen from '../screens/HomeObraScreen';
import CadastroObraScreen from '../screens/CadastroObraScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerShown: false, // cada tela tem seu proprio cabecalho
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Cadastro" component={CadastroScreen} />
        <Stack.Screen name="SelecionarObra" component={SelecionarObraScreen} />
        <Stack.Screen name="HomeObra" component={HomeObraScreen} />
        <Stack.Screen name="CadastroObra" component={CadastroObraScreen} />

        {/* Novas telas serao adicionadas aqui */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
