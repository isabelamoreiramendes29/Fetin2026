// Faixas de temperatura do concreto fresco — fonte unica
//
// Antes estavam repetidas em tres lugares: o velocimetro, a tela de
// Temperatura e o Historico. Cada um com seus proprios numeros e nomes, o que
// e uma divergencia esperando para acontecer. Agora os tres leem daqui, e os
// alertas tambem.
//
// Os limites vem da pratica de concretagem: abaixo de 10 °C a hidratacao do
// cimento fica lenta demais; acima de 35 °C a pega acelera e a resistencia
// final cai. Entre 15 e 30 °C esta a faixa confortavel.

// Extremos desenhados no velocimetro
export const TEMP_MIN_ESCALA = 5;
export const TEMP_MAX_ESCALA = 40;

// severidade: o que merece alerta.
//   'critica' — compromete a peca, precisa de acao
//   'atencao' — fora do ideal, vale acompanhar
//   null      — dentro do esperado
export const ZONAS = [
  {
    nome: 'FRIO',
    min: TEMP_MIN_ESCALA,
    max: 10,
    cor: '#DC2626',
    emoji: '🔴',
    rotulo: 'Frio',
    tempSim: 8,
    severidade: 'critica',
    statusTexto: 'Frio demais — hidratação muito lenta',
  },
  {
    nome: 'BAIXA',
    min: 10,
    max: 15,
    cor: '#F97316',
    emoji: '🟠',
    rotulo: 'Baixa',
    tempSim: 13,
    severidade: 'atencao',
    statusTexto: 'Temperatura baixa — cura retardada',
  },
  {
    nome: 'IDEAL',
    min: 15,
    max: 30,
    cor: '#22C55E',
    emoji: '🟢',
    rotulo: 'Ideal',
    tempSim: 22,
    severidade: null,
    statusTexto: 'Temperatura ideal',
  },
  {
    nome: 'ALTA',
    min: 30,
    max: 35,
    cor: '#FACC15',
    emoji: '🟡',
    rotulo: 'Alta',
    tempSim: 32,
    severidade: 'atencao',
    statusTexto: 'Temperatura alta — atenção com a pega',
  },
  {
    nome: 'CRÍTICA',
    min: 35,
    max: TEMP_MAX_ESCALA,
    cor: '#DC2626',
    emoji: '🔴',
    rotulo: 'Crítica',
    tempSim: 38,
    severidade: 'critica',
    statusTexto: 'Acima do limite — risco à resistência',
  },
];

// ─────────────────────────────────────────────────────────────
// ZONA DE UMA TEMPERATURA
// Valores fora da escala caem na primeira ou na ultima zona: 2 °C e tao frio
// quanto 5 °C para efeito de alerta.
// ─────────────────────────────────────────────────────────────
export function avaliarTemperatura(temp) {
  const valor = Number(temp);

  for (const zona of ZONAS) {
    if (valor < zona.max) return zona;
  }

  return ZONAS[ZONAS.length - 1];
}
