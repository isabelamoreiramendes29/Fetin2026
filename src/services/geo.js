// Geocodificacao — endereco em texto vira coordenada no mapa
//
// Existe porque a rota do rastreamento era fixa: dois pontos escritos no
// codigo, em Sao Paulo, independentes do endereco cadastrado na obra. Uma obra
// em Santa Rita do Sapucai aparecia na Avenida Paulista.
//
// Usa o geocodificador do proprio sistema operacional, pelo expo-location.
// Nao precisa de chave nem de servico externo.

import * as Location from 'expo-location';

// Geocodificar custa rede e e lento. O endereco de uma obra nao muda, entao a
// resposta fica guardada enquanto o app estiver aberto.
const cache = new Map();

// ─────────────────────────────────────────────────────────────
// PERMISSAO DE LOCALIZACAO
//
// No Android, Location.geocodeAsync EXIGE permissao de localizacao — mesmo
// que o app nao queira saber onde o usuario esta, so traduzir um endereco em
// coordenada. Sem a permissao a chamada falha, a rota fica nula, e a tela de
// Localizacao nao desenha mapa nenhum: some inteira, sem explicacao.
//
// Foi exatamente isso que aconteceu na vespera da Fetin. O pedido fica aqui,
// no caminho de quem precisa dele, e nao no arranque do app: assim ele so
// aparece quando o usuario abre a tela do mapa, que e quando faz sentido.
//
// Pedimos uma vez por sessao. Negar nao quebra nada alem do mapa.
// ─────────────────────────────────────────────────────────────
let permissaoPedida = false;
let permissaoConcedida = false;

async function garantirPermissao() {
  if (permissaoPedida) return permissaoConcedida;
  permissaoPedida = true;

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    permissaoConcedida = status === 'granted';

    if (!permissaoConcedida) {
      console.warn('[Geo] Permissao de localizacao negada — o mapa nao vai desenhar.');
    }
  } catch (falha) {
    console.warn('[Geo] Falha ao pedir permissao:', falha.message);
    permissaoConcedida = false;
  }

  return permissaoConcedida;
}

// ─────────────────────────────────────────────────────────────
// ENDERECO → COORDENADA
// Retorna { latitude, longitude } ou null quando nao encontra.
//
// Nao encontrar e comum e nao e erro: CEP incompleto, numero inexistente,
// rua nova. Quem chama precisa lidar com o null.
// ─────────────────────────────────────────────────────────────
export async function coordenadaDe(endereco) {
  const texto = String(endereco || '').trim();
  if (!texto) return null;

  if (cache.has(texto)) return cache.get(texto);

  // Sem permissao nem adianta tentar: a chamada falha e o erro nao diz o motivo
  if (!(await garantirPermissao())) return null;

  try {
    const resultados = await Location.geocodeAsync(texto);

    if (!resultados || resultados.length === 0) {
      console.warn('[Geo] Endereco nao encontrado:', texto);
      cache.set(texto, null);
      return null;
    }

    const { latitude, longitude } = resultados[0];
    const coordenada = { latitude, longitude };

    console.log(`[Geo] ${texto} → ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    cache.set(texto, coordenada);

    return coordenada;
  } catch (falha) {
    console.warn('[Geo] Falha ao geocodificar:', falha.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// ENDERECO DE UMA OBRA, EM TEXTO
// Monta a partir dos campos do cadastro, na ordem que o geocodificador
// entende melhor: rua e numero primeiro, CEP por ultimo.
// ─────────────────────────────────────────────────────────────
export function enderecoDaObra(obra) {
  if (!obra) return '';

  const rua = [obra.endereco, obra.numero].filter(Boolean).join(', ');
  return [rua, obra.cep].filter(Boolean).join(' - ');
}

// ─────────────────────────────────────────────────────────────
// PONTOS INTERMEDIARIOS ENTRE DUAS COORDENADAS
//
// Sem servico de rotas, o traco entre origem e destino e uma reta. Os pontos
// intermediarios existem so para o caminhao se mover em passos suaves ao longo
// dela — nao representam ruas de verdade.
//
// Vale dizer isso na apresentacao: o trajeto e simplificado. Rota real exigiria
// a API de direcoes do Google, que e paga.
// ─────────────────────────────────────────────────────────────
export function tracarRota(origem, destino, pontos = 6) {
  if (!origem || !destino) return null;

  const rota = [];

  for (let i = 0; i < pontos; i++) {
    const t = i / (pontos - 1);
    rota.push({
      latitude: origem.latitude + (destino.latitude - origem.latitude) * t,
      longitude: origem.longitude + (destino.longitude - origem.longitude) * t,
    });
  }

  return rota;
}
