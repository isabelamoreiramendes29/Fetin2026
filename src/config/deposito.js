// Endereco da central de concreto — de onde os caminhoes saem
//
// ┌─────────────────────────────────────────────────────────────┐
// │ O app geocodifica este texto e usa como ORIGEM da rota no   │
// │ rastreamento. O DESTINO vem do endereco cadastrado na obra, │
// │ dentro do proprio aplicativo — nao daqui.                   │
// └─────────────────────────────────────────────────────────────┘
//
// Fica num arquivo de configuracao, e nao no banco, porque no projeto existe
// uma central so. Se um dia houver varias construtoras com centrais
// diferentes, isto vira um campo no perfil de cada uma.

const deposito = {
  // Endereco completo, como voce escreveria numa busca de mapa.
  // Enderecos simples e completos geocodificam melhor: rua, numero, cidade
  // e estado. CEP sozinho ou rua muito nova costumam falhar.
  endereco: 'Inatel, Av. João de Camargo, 510, Santa Rita do Sapucaí - MG',

  // Nome que aparece no pino do mapa
  nome: 'Inatel',

  // Usado se a geocodificacao falhar — sem rede, endereco nao encontrado.
  // Coordenada aproximada de Santa Rita do Sapucai: com ela a rota ainda
  // desenha, saindo do centro da cidade em vez do ponto exato.
  coordenadaReserva: {
    latitude: -22.2519,
    longitude: -45.7031,
  },
};

export default deposito;
