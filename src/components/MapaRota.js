// Mapa de rota — mapa real com os caminhoes a caminho da obra
//
// Substitui o desenho em SVG que existia antes: aquele era uma ilustracao com
// ruas fixas, sem relacao nenhuma com o endereco da obra. Aqui o mapa e o do
// proprio aparelho (Apple Maps no iOS, Google Maps no Android) e as coordenadas
// sao reais.
//
// Mostra VARIOS caminhoes: uma concretagem usa mais de uma betoneira, e essa e
// a premissa do Mapa de Concretagem, onde cada area registra qual caminhao a
// concretou.
//
// O que ainda e simulado e a posicao: ela vem do progresso (0 a 100) de cada
// caminhao, interpolado ao longo da rota. Quando o modulo GPS comecar a
// publicar, basta trocar quem alimenta esses valores.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
// Reaproveita a cor que o Mapa de Concretagem usa: o mesmo caminhao recebe a
// mesma cor nas duas telas, o que ajuda a ligar "quem estava vindo" com "quem
// concretou qual area"
import { corDoCaminhao } from '../services/planta';

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

// Posicao em `progresso`% do caminho, interpolada entre os dois pontos do
// trecho correspondente
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

// Regiao que enquadra a rota inteira, com folga nas bordas
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
  caminhoes = [],
  nomeOrigem = 'Origem',
  nomeDestino = 'Destino',
  destaque = null,
  altura = 280,
}) {
  const regiaoInicial = useMemo(() => regiaoDaRota(rota), [rota]);

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

        {caminhoes.map((item) => {
          const cor = corDoCaminhao(item.caminhao);
          const selecionado = destaque === item.caminhao;

          return (
            <Marker
              // O progresso entra na key de proposito: no Android, com
              // tracksViewChanges desligado, o marcador so reposicionaria ao
              // mexer no mapa. Mudar a key forca o redesenho a cada avanco.
              key={`${item.caminhao}-${Math.round(item.progresso)}`}
              coordinate={posicaoNaRota(rota, item.progresso)}
              title={`Caminhão ${item.caminhao}`}
              description={`${Math.round(item.progresso)}% do trajeto`}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View
                style={[
                  styles.pinoCaminhao,
                  { backgroundColor: cor },
                  selecionado && styles.pinoSelecionado,
                ]}
              >
                <Text style={styles.pinoTexto}>{item.caminhao}</Text>
              </View>
            </Marker>
          );
        })}

      </MapView>

      {/* Progresso de cada caminhao, sobreposto ao mapa */}
      {caminhoes.length > 0 && (
        <View style={styles.painel}>
          {caminhoes.map((item) => (
            <View key={item.caminhao} style={styles.painelLinha}>
              <View style={[styles.painelPonto, { backgroundColor: corDoCaminhao(item.caminhao) }]} />
              <Text style={styles.painelTexto}>
                {item.caminhao} · {Math.round(item.progresso)}%
              </Text>
            </View>
          ))}
        </View>
      )}
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
    minWidth: 32, height: 32, borderRadius: 16,
    paddingHorizontal: 6,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4, elevation: 6,
  },

  // Quem a construtora esta dirigindo agora ganha um anel mais grosso
  pinoSelecionado: { borderWidth: 4, borderColor: '#FACC15' },

  pinoTexto: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  painel: {
    position: 'absolute', top: 10, right: 10,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.62)',
    gap: 4,
  },

  painelLinha: { flexDirection: 'row', alignItems: 'center', gap: 7 },

  painelPonto: { width: 8, height: 8, borderRadius: 4 },

  painelTexto: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
