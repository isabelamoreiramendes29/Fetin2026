// Endereco da central de concreto — de onde os caminhoes saem
//
// ┌─────────────────────────────────────────────────────────────┐
// │ TROQUE PELO ENDERECO REAL DA CENTRAL DE VOCES.              │
// │ O app geocodifica este texto e usa como origem da rota no   │
// │ rastreamento. O destino vem do endereco cadastrado na obra. │
// └─────────────────────────────────────────────────────────────┘
//
// Fica num arquivo de configuracao, e nao no banco, porque no projeto existe
// uma central so. Se um dia houver varias construtoras com centrais
// diferentes, isto vira um campo no perfil de cada uma.

const deposito = {
  // Endereco completo, como voce escreveria numa busca de mapa
  endereco: 'Av. Cel. Francisco Braz, 200, Santa Rita do Sapucaí - MG',

  // Nome que aparece no pino do mapa
  nome: 'Central de Concreto',

  // Usado se a geocodificacao falhar — CEP incompleto, rua nova, sem rede.
  // Sao as coordenadas aproximadas do centro de Santa Rita do Sapucai.
  coordenadaReserva: {
    latitude: -22.2519,
    longitude: -45.7031,
  },
};

export default deposito;
