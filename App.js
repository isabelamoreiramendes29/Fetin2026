// Arquivo princaipl do aplicativo
// Ponto de entrada: carrega o sistema de navegacao que controla todas as telas

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { ObrasProvider } from './src/context/ObrasContext';
import { CaminhoesProvider } from './src/context/CaminhoesContext';
import { pedirPermissaoNotificacao } from './src/services/alertas';

export default function App() {
  // Pede a permissao uma vez, na abertura. Negar nao quebra nada: os alertas
  // continuam sendo gravados e aparecem na tela de Alertas — o que se perde
  // e o aviso chegando sem o usuario pedir.
  useEffect(() => {
    pedirPermissaoNotificacao();
  }, []);

  return (
    // ObrasProvider disponibiliza a lista de obras para todas as telas do app
    // CaminhoesProvider disponibiliza os envios de caminhao para todas as telas
    //
    // O financeiro nao tem Provider: as compras vivem no Supabase e a tela le
    // direto de la (ver services/financeiro.js). Guardar em Context so criava
    // uma segunda fonte de verdade, que sumia ao fechar o app.
    <ObrasProvider>
      <CaminhoesProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </CaminhoesProvider>
    </ObrasProvider>
  );
}
