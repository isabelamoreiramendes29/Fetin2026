// Context API — gerencia o controle financeiro (compras de cimento) por obra
// Apenas o Mestre acessa. Dados salvos localmente em memoria (sem MQTT)

import React, { createContext, useContext, useState } from 'react';

// Cria o contexto vazio
const FinanceiroContext = createContext();

// Provider — envolve o app inteiro e disponibiliza os dados para todas as telas
export function FinanceiroProvider({ children }) {
  // Compras agrupadas por obraId: { [obraId]: [compra, compra, ...] }
  const [comprasPorObra, setComprasPorObra] = useState({});

  // Adiciona uma nova compra de cimento na obra informada
  function adicionarCompra(obraId, compra) {
    const novaCompra = {
      ...compra,
      id: Date.now().toString(),
    };
    setComprasPorObra(prev => ({
      ...prev,
      [obraId]: [...(prev[obraId] || []), novaCompra],
    }));
  }

  // Retorna a lista de compras da obra informada
  function getCompras(obraId) {
    return comprasPorObra[obraId] || [];
  }

  // Soma o valor total gasto na obra informada
  function getTotalGasto(obraId) {
    return getCompras(obraId).reduce((acc, c) => acc + parseFloat(c.valor || 0), 0);
  }

  // Soma o volume total de cimento comprado na obra informada
  function getTotalVolume(obraId) {
    return getCompras(obraId).reduce((acc, c) => acc + parseFloat(c.volume || 0), 0);
  }

  return (
    <FinanceiroContext.Provider value={{
      adicionarCompra,
      getCompras,
      getTotalGasto,
      getTotalVolume,
    }}>
      {children}
    </FinanceiroContext.Provider>
  );
}

// Hook personalizado — facilita o uso do contexto nas telas
// Uso: const { adicionarCompra, getCompras } = useFinanceiro();
export function useFinanceiro() {
  const context = useContext(FinanceiroContext);
  if (!context) throw new Error('useFinanceiro deve ser usado dentro de FinanceiroProvider');
  return context;
}
