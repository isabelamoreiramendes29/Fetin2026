// Arquivo princaipl do aplicativo
// Ponto de entrada: carrega o sistema de navegacao que controla todas as telas

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { ObrasProvider } from './src/context/ObrasContext';
import { CaminhoesProvider } from './src/context/CaminhoesContext';
import { FinanceiroProvider } from './src/context/FinanceiroContext';

export default function App() {
  return (
    // ObrasProvider disponibiliza a lista de obras para todas as telas do app
    // CaminhoesProvider disponibiliza os envios de caminhao para todas as telas
    // FinanceiroProvider disponibiliza as compras de cimento por obra (Mestre)
    <ObrasProvider>
      <CaminhoesProvider>
        <FinanceiroProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </FinanceiroProvider>
      </CaminhoesProvider>
    </ObrasProvider>
  );
}
