// Context API — gerencia o estado global dos caminhoes enviados pela Construtora
// Etapa 1: apenas local (sem MQTT ainda). Qualquer tela pode acessar via useCaminhoes()

import React, { createContext, useContext, useState } from 'react';

// Cria o contexto vazio
const CaminhoesContext = createContext();

// Provider — envolve o app inteiro e disponibiliza os dados para todas as telas
export function CaminhoesProvider({ children }) {
  const [caminhoes, setCaminhoes] = useState([]);

  // Registra o envio de um caminhao (X ou Y) para uma obra
  function adicionarEnvio(caminhao, obra) {
    const novoEnvio = {
      id: Date.now().toString(),
      caminhao,               // 'X' ou 'Y'
      obraId: obra.id,
      obraNome: obra.nome,
      dataEnvio: new Date().toISOString(),
      status: 'Em trânsito',
    };
    setCaminhoes(prev => [...prev, novoEnvio]);
    console.log('[Caminhoes] Novo envio:', novoEnvio);
  }

  // Remove um envio pelo id
  function removerEnvio(id) {
    setCaminhoes(prev => prev.filter(c => c.id !== id));
  }

  return (
    <CaminhoesContext.Provider value={{ caminhoes, adicionarEnvio, removerEnvio }}>
      {children}
    </CaminhoesContext.Provider>
  );
}

// Hook personalizado — facilita o uso do contexto nas telas
// Uso: const { caminhoes, adicionarEnvio } = useCaminhoes();
export function useCaminhoes() {
  const context = useContext(CaminhoesContext);
  if (!context) {
    throw new Error('useCaminhoes deve ser usado dentro de CaminhoesProvider');
  }
  return context;
}
