// Context API — gerencia o estado global das obras do usuario
// Qualquer tela do app pode acessar e modificar a lista de obras usando useObras()

import React, { createContext, useContext, useState } from 'react';

// Cria o contexto vazio
const ObrasContext = createContext();

// Dados iniciais de exemplo — sera substituido por dados reais do backend futuramente
const obrasIniciais = [
  {
    id: '1',
    nome: 'Obra 1',
    cep: '01310-100',
    endereco: 'Av. Paulista, Bela Vista, São Paulo, SP',
    numero: '1000',
    complemento: 'Bloco A',
    dataInicio: '01/01/2025',
    dataTermino: '31/12/2025',
    volumeCimento: '500',
    unidadeCimento: 'Sacos',
    contratante: 'Construtora Exemplo',
    responsavelTecnico: 'Eng. João Silva',
  },
];

// Provider — envolve o app inteiro e disponibiliza os dados para todas as telas
export function ObrasProvider({ children }) {
  const [obras, setObras] = useState(obrasIniciais);

  // Adiciona uma nova obra na lista
  function adicionarObra(novaObra) {
    const obra = {
      id: String(Date.now()), // gera um id unico baseado no tempo
      ...novaObra,
    };
    setObras(prev => [...prev, obra]);
  }

  // Remove uma obra pelo id
  function removerObra(id) {
    setObras(prev => prev.filter(obra => obra.id !== id));
  }

  return (
    <ObrasContext.Provider value={{ obras, adicionarObra, removerObra }}>
      {children}
    </ObrasContext.Provider>
  );
}

// Hook personalizado — facilita o uso do contexto nas telas
// Uso: const { obras, adicionarObra } = useObras();
export function useObras() {
  return useContext(ObrasContext);
}
