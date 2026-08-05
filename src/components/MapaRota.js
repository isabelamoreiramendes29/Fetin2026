// Mapa de rota — mapa real com a rota do caminhao desenhada por cima
//
// Substitui o desenho em SVG que existia antes: aquele era uma ilustracao com
// ruas fixas, sem relacao nenhuma com o endereco da obra. Aqui o mapa e o do
// proprio aparelho (Apple Maps no iOS, Google Maps no Android) e as coordenadas
// sao reais.
//
// O que ainda e simulado e a POSICAO do caminhao: ela vem do parametro
// progresso (0 a 100), interpolada ao longo da rota. Quando o modulo GPS
// comecar a publicar no MQTT, basta trocar quem alimenta esse valor — o
// desenho do mapa nao muda.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

const RAIO_TERRA_KM = 6371;

// Distancia em km entre duas coordenadas (formula de haversine).
// Usada para calcular o comprimento real da rota, em vez de um numero fixo.
function distanciaKm(a, b) {
  const rad = (grau) => (grau * Math.PI) / 180;

  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;

  return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(h));
}

// Comprimento total da rota, somando trecho a trecho
export function comprimentoRota(rota) {
  let total = 0;
  for (let i = 1; i < rota.length; i++) total += distanciaKm(rota[i - 1], rota[i]);
  return total;
}

// Posicao do caminhao em `progresso`% do caminho.
// Interpola entre os dois pontos do trecho correspondente — o mesmo criterio
// que a versao em SVG usava, agora em latitude/longitude.
export function posicaoNaRota(rota, progresso) {
  const t = Math.min(Math.max(progresso, 0), 100) / 100;
  const trechos = rota.length - 1;

  const indice = Math.min(Math.floor(t * trechos), trechos - 1);
  const fracao = t * trechos - indice;

  const de = rota[indice];
  const para = rota[indice + 1];

  return {
    latitude: de.latitude + (para.latitude - de.latitude) * fracao,
    longitude: de.longitude + (para.longitude - de.longitude) * fracao,
  };
}

// Regiao que enquadra a rota inteira, com uma folga nas bordas para os
// marcadores nao ficarem colados no limite da tela
function regiaoDaRota(rota) {
  const lats = rota.map((p) => p.latitude);
  const lons = rota.map((p) => p.longitude);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.6, 0.01),
    longitudeDelta: Math.max((maxLon - minLon) * 1.6, 0.01),
  };
}

export default function MapaRota({
  rota,
  progresso = 0,
  nomeOrigem = 'Origem',
  nomeDestino = 'Destino',
  altura = 280,
}) {
  const regiaoInicial = useMemo(() => regiaoDaRota(rota), [rota]);
  const posicaoCaminhao = posicaoNaRota(rota, progresso);

  const origem = rota[0];
  const destino = rota[rota.length - 1];

  return (
    <View style={[styles.container, { height: altura }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={regiaoInicial}
        // Sem provider explicito: cada plataforma usa o mapa nativo dela
        showsPointsOfInterest={false}
        showsTraffic={false}
        toolbarEnabled={false}
      >

        {/* Traco de fundo, mais grosso, para a rota destacar do mapa */}
        <Polyline coordinates={rota} strokeColor="rgba(34, 197, 94, 0.25)" strokeWidth={11} />
        <Polyline coordinates={rota} strokeColor="#22C55E" strokeWidth={5} />

        <Marker coordinate={origem} title={nomeOrigem} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={[styles.pino, styles.pinoOrigem]}>
            <Ionicons name="business" size={14} color="#fff" />
          </View>
        </Marker>

        <Marker coordinate={destino} title={nomeDestino} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={[styles.pino, styles.pinoDestino]}>
            <Ionicons name="flag" size={14} color="#fff" />
          </View>
        </Marker>

        {/* Caminhao — redesenhado a cada mudanca de progresso */}
        <Marker
          coordinate={posicaoCaminhao}
          title="Caminhão"
          anchor={{ x: 0.5, y: 0.5 }}
          // Sem isso o marcador so reposiciona ao mexer no mapa, no Android
          tracksViewChanges={false}
          key={`caminhao-${Math.round(progresso)}`}
        >
          <View style={styles.pinoCaminhao}>
            <Ionicons name="car" size={16} color="#fff" />
          </View>
        </Marker>

      </MapView>

      {/* Badge de progresso, sobreposto ao mapa */}
      <View style={styles.badge}>
        <Text style={styles.badgeTexto}>{Math.round(progresso)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0D2137',
  },

  pino: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },

  pinoOrigem: { backgroundColor: '#1D4ED8' },

  pinoDestino: { backgroundColor: '#16A34A' },

  pinoCaminhao: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4, elevation: 6,
  },

  badge: {
    position: 'absolute', top: 10, right: 10,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1, borderColor: '#22C55E',
  },

  badgeTexto: { color: '#22C55E', fontSize: 12, fontWeight: 'bold' },
});
