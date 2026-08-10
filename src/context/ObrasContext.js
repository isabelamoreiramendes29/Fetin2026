// Context API — estado global das obras
//
// As obras vem do Supabase (ver services/obras.js), nao mais do MQTT. O
// Context continua existindo porque varias telas precisam da mesma lista:
// SelecionarObra, SelecionarObraConstrutora e o cadastro. Sem ele, cada uma
// faria a propria consulta e elas poderiam divergir.
//
// A lista se recarrega sozinha quando o usuario entra ou sai da conta. Isso e
// necessario porque as policies do banco filtram por quem esta perguntando:
// antes do login nao ha o que carregar, e depois de trocar de conta a lista
// anterior nao vale mais.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { buscarObras, criarObra, removerObra as removerObraNoBanco } from '../services/obras';
import { supabase } from '../services/supabase';

const ObrasContext = createContext();

export function ObrasProvider({ children }) {
  const [obras, setObras]           = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]             = useState(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      setObras(await buscarObras());
    } catch (falha) {
      console.warn('[ObrasContext]', falha.message);
      setErro(falha.message);
      setObras([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  // Recarrega ao entrar e limpa ao sair. O onAuthStateChange dispara tambem na
  // abertura do app, quando a sessao guardada no aparelho e restaurada.
  useEffect(() => {
    recarregar();

    const { data: assinatura } = supabase.auth.onAuthStateChange((evento) => {
      console.log('[ObrasContext] Sessao mudou:', evento);

      if (evento === 'SIGNED_OUT') {
        setObras([]);
        return;
      }

      if (evento === 'SIGNED_IN' || evento === 'TOKEN_REFRESHED') {
        recarregar();
      }
    });

    return () => assinatura.subscription.unsubscribe();
  }, [recarregar]);

  // Cadastra no banco e insere no topo da lista, sem precisar reconsultar
  async function adicionarObra(dados) {
    const nova = await criarObra(dados);
    setObras((atuais) => [nova, ...atuais]);
    return nova;
  }

  async function removerObra(id) {
    await removerObraNoBanco(id);
    setObras((atuais) => atuais.filter((obra) => obra.id !== id));
  }

  return (
    <ObrasContext.Provider
      value={{ obras, carregando, erro, recarregar, adicionarObra, removerObra }}
    >
      {children}
    </ObrasContext.Provider>
  );
}

// Hook personalizado — facilita o uso do contexto nas telas
// Uso: const { obras, adicionarObra } = useObras();
export function useObras() {
  return useContext(ObrasContext);
}
