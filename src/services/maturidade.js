// Maturidade do concreto — estimativa de resistencia antes dos 28 dias
//
// A resistencia do concreto nao depende so do tempo, mas de tempo somado a
// temperatura: uma laje curando a 30 °C ganha resistencia mais rapido que a
// mesma laje a 15 °C. O metodo da maturidade (ASTM C1074) transforma essa
// combinacao num unico numero.
//
// O app tem as duas pontas necessarias sem precisar de dado novo:
//   - o historico de temperatura da a curva de cada obra
//   - o Mapa de Concretagem da o resultado em MPa dos corpos de prova rompidos
//
// Cruzando os dois, sai uma curva de calibracao. A partir dela, da para estimar
// a resistencia de uma peca que ainda nao foi rompida, so pela temperatura dela.
//
// LIMITACAO IMPORTANTE: a curva vale para o traco de concreto que a calibrou.
// Concreto diferente, curva diferente. E poucos ensaios dao um ajuste fragil —
// por isso avaliarConfianca existe e a tela mostra o que ela diz.

// Temperatura de referencia da funcao de Nurse-Saul. Abaixo dela, considera-se
// que a hidratacao do cimento praticamente nao avanca.
const TEMPERATURA_DATUM = -10;

// Abaixo disto o ajuste e chute com aparencia de conta
const MINIMO_ENSAIOS_UTIL = 3;

// ─────────────────────────────────────────────────────────────
// MATURIDADE ACUMULADA, EM °C·HORA
//
// Integra a curva de temperatura pela regra do trapezio: entre duas leituras,
// usa a media das duas como temperatura do intervalo. E o que a norma chama de
// funcao de Nurse-Saul:
//
//     M = Σ (T − T₀) × Δt
//
// `leituras` precisa vir em ordem cronologica, no formato
// [{ temperatura, medidoEm }].
// ─────────────────────────────────────────────────────────────
export function calcularMaturidade(leituras) {
  if (!leituras || leituras.length < 2) return 0;

  let maturidade = 0;

  for (let i = 1; i < leituras.length; i++) {
    const anterior = leituras[i - 1];
    const atual = leituras[i];

    const horas =
      (new Date(atual.medidoEm).getTime() - new Date(anterior.medidoEm).getTime()) / 3600000;

    // Leituras fora de ordem ou duplicadas nao contribuem
    if (!(horas > 0)) continue;

    const temperaturaMedia =
      (Number(anterior.temperatura) + Number(atual.temperatura)) / 2;

    // Abaixo do datum nao acumula: hidratacao parada nao "desfaz" maturidade
    const acimaDoDatum = Math.max(temperaturaMedia - TEMPERATURA_DATUM, 0);

    maturidade += acimaDoDatum * horas;
  }

  return maturidade;
}

// ─────────────────────────────────────────────────────────────
// AJUSTE DA CURVA DE CALIBRACAO
//
// A relacao entre maturidade e resistencia e classicamente logaritmica:
//
//     S = a + b · ln(M)
//
// Fazendo x = ln(M), isso vira uma reta, e o ajuste e minimos quadrados comum.
//
// `pares` = [{ maturidade, resistencia }]. Retorna null quando nao ha pontos
// suficientes — e melhor a tela dizer "sem calibracao" do que exibir uma
// previsao inventada.
// ─────────────────────────────────────────────────────────────
export function ajustarCurva(pares) {
  const validos = (pares || []).filter(
    (p) => p.maturidade > 0 && Number.isFinite(p.resistencia)
  );

  if (validos.length < 2) return null;

  const xs = validos.map((p) => Math.log(p.maturidade));
  const ys = validos.map((p) => p.resistencia);
  const n = xs.length;

  const mediaX = xs.reduce((s, v) => s + v, 0) / n;
  const mediaY = ys.reduce((s, v) => s + v, 0) / n;

  let covariancia = 0;
  let varianciaX = 0;

  for (let i = 0; i < n; i++) {
    covariancia += (xs[i] - mediaX) * (ys[i] - mediaY);
    varianciaX += (xs[i] - mediaX) ** 2;
  }

  // Todos os ensaios com a mesma maturidade: nao ha reta a tracar
  if (varianciaX === 0) return null;

  const b = covariancia / varianciaX;
  const a = mediaY - b * mediaX;

  // R² — quanto da variacao dos ensaios a curva explica. Vai para a tela
  // porque um ajuste ruim precisa aparecer, nao ser escondido.
  let somaResiduos = 0;
  let somaTotal = 0;

  for (let i = 0; i < n; i++) {
    const previsto = a + b * xs[i];
    somaResiduos += (ys[i] - previsto) ** 2;
    somaTotal += (ys[i] - mediaY) ** 2;
  }

  const r2 = somaTotal === 0 ? 0 : 1 - somaResiduos / somaTotal;

  return { a, b, n, r2 };
}

// ─────────────────────────────────────────────────────────────
// RESISTENCIA ESTIMADA PARA UMA MATURIDADE
// Retorna null quando nao ha curva ou a maturidade ainda e zero.
// ─────────────────────────────────────────────────────────────
export function estimarResistencia(maturidade, curva) {
  if (!curva || !(maturidade > 0)) return null;

  const estimada = curva.a + curva.b * Math.log(maturidade);

  // Resistencia negativa nao existe; acontece com maturidade muito baixa
  return Math.max(estimada, 0);
}

// ─────────────────────────────────────────────────────────────
// MATURIDADE NECESSARIA PARA ATINGIR UMA RESISTENCIA
// Inverte a curva. Serve para responder "quanto falta para desformar".
// ─────────────────────────────────────────────────────────────
export function maturidadePara(resistenciaAlvo, curva) {
  if (!curva || curva.b === 0) return null;
  return Math.exp((resistenciaAlvo - curva.a) / curva.b);
}

// ─────────────────────────────────────────────────────────────
// CONFIANCA DA CALIBRACAO
//
// Existe para a tela nunca apresentar uma estimativa sem dizer o quanto ela
// vale. Tres ensaios com R² alto e uma coisa; dois ensaios espalhados e outra.
// ─────────────────────────────────────────────────────────────
export function avaliarConfianca(curva) {
  if (!curva) {
    return {
      nivel: 'sem-calibracao',
      cor: '#94A3B8',
      texto: 'Sem calibração',
      detalhe: 'São necessários pelo menos 2 corpos de prova rompidos.',
    };
  }

  if (curva.n < MINIMO_ENSAIOS_UTIL) {
    return {
      nivel: 'fraca',
      cor: '#EF4444',
      texto: 'Calibração fraca',
      detalhe: `Apenas ${curva.n} ensaios. A estimativa é indicativa, não serve para decisão.`,
    };
  }

  if (curva.r2 < 0.7) {
    return {
      nivel: 'dispersa',
      cor: '#FACC15',
      texto: 'Ensaios dispersos',
      detalhe: `${curva.n} ensaios, mas com R² de ${curva.r2.toFixed(2)}. Pode haver traços diferentes na mesma curva.`,
    };
  }

  return {
    nivel: 'boa',
    cor: '#22C55E',
    texto: 'Calibração consistente',
    detalhe: `${curva.n} ensaios, R² de ${curva.r2.toFixed(2)}.`,
  };
}

// Formata a maturidade para leitura: °C·h vira °C·dia quando fica grande
export function formatarMaturidade(maturidade) {
  if (maturidade >= 1000) return `${(maturidade / 24).toFixed(0)} °C·dia`;
  return `${maturidade.toFixed(0)} °C·h`;
}
