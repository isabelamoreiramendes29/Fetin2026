// Context API — estado global dos envios de caminhao
//
// Os envios vem do Supabase (ver services/caminhoes.js), nao mais do MQTT nem
// da memoria. Antes o historico inteiro sumia ao fechar o app.
//
// Recarrega quando o usuario entra ou sai da conta, pelo mesmo motivo do
// ObrasContext: as policies filtram por quem esta perguntando.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  buscarEnvios,
  registrarEnvio,
  removerEnvio as removerEnvioNoBanco,
} from '../services/caminhoes';
import { supabase } from '../services/supabase';

const CaminhoesContext = createContext();

export function CaminhoesProvider({ children }) {
  const [caminhoes, setCaminhoes]   = useState([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);

    try {
      setCaminhoes(await buscarEnvios());
    } catch (falha) {
      console.warn('[CaminhoesContext]', falha.message);
      setCaminhoes([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();

    const { data: assinatura } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') {
        setCaminhoes([]);
        return;
      }
      if (evento === 'SIGNED_IN' || evento === 'TOKEN_REFRESHED') {
        recarregar();
      }
    });

    return () => assinatura.subscription.unsubscribe();
  }, [recarregar]);

  // Registra o despacho de um caminhao para uma obra
  async function adicionarEnvio(caminhao, obra) {
    const novo = await registrarEnvio(obra.id, caminhao);
    setCaminhoes((atuais) => [novo, ...atuais]);
    return novo;
  }

  async function removerEnvio(id) {
    await removerEnvioNoBanco(id);
    setCaminhoes((atuais) => atuais.filter((c) => c.id !== id));
  }

  return (
    <CaminhoesContext.Provider
      value={{ caminhoes, carregando, recarregar, adicionarEnvio, removerEnvio }}
    >
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
