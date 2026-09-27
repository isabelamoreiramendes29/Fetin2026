// Planta interativa — a foto do projeto com as regioes de concretagem por cima
//
// Dois modos:
//   'visualizando' — toca numa regiao e o pai recebe qual foi (onTocarRegiao)
//   'marcando'     — cada toque vira um vertice do poligono em construcao
//
// As coordenadas entram e saem SEMPRE normalizadas (0 a 1). A conversao para
// pixels acontece so aqui dentro, na hora de desenhar. E o que faz a marcacao
// feita num aparelho cair no lugar certo em qualquer outro.

import React from 'react';
import { View, Image, Pressable, StyleSheet } from 'react-native';
import Svg, { Polygon, Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { avaliarRegiao } from '../services/planta';

// Centro aproximado do poligono — usado para posicionar o rotulo do caminhao.
// E a media dos vertices, nao o centroide geometrico: bem mais simples e
// suficiente para poligonos pequenos e razoavelmente regulares.
function centroAproximado(pontos) {
  const soma = pontos.reduce(
    (acumulado, p) => ({ x: acumulado.x + p.x, y: acumulado.y + p.y }),
    { x: 0, y: 0 }
  );
  return { x: soma.x / pontos.length, y: soma.y / pontos.length };
}

// ─────────────────────────────────────────────────────────────
// O PONTO ESTA DENTRO DO POLIGONO?
//
// Lanca um raio horizontal a partir do ponto e conta quantas arestas ele
// cruza: impar esta dentro, par esta fora. Funciona para qualquer poligono,
// inclusive concavo, e nao precisa que os vertices estejam em ordem especial.
//
// Trabalha direto nas coordenadas normalizadas (0..1), entao independe do
// tamanho em que a planta esta sendo exibida.
// ─────────────────────────────────────────────────────────────
function dentroDoPoligono(ponto, vertices) {
  if (!vertices || vertices.length < 3) return false;

  let dentro = false;

  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const { x: xi, y: yi } = vertices[i];
    const { x: xj, y: yj } = vertices[j];

    const cruza =
      yi > ponto.y !== yj > ponto.y &&
      ponto.x < ((xj - xi) * (ponto.y - yi)) / (yj - yi) + xi;

    if (cruza) dentro = !dentro;
  }

  return dentro;
}

export default function PlantaInterativa({
  urlImagem,
  largura,
  altura,
  regioes = [],
  fckProjeto,
  modo = 'visualizando',
  pontosNovos = [],
  larguraDisponivel,
  onTocarPlanta,
  onTocarRegiao,
}) {
  // Altura proporcional a largura disponivel, preservando o formato da foto
  const larguraExibida = larguraDisponivel;
  const alturaExibida = larguraDisponivel * (altura / largura);

  const marcando = modo === 'marcando';

  // Normalizado (0..1) → pixels na tela
  const paraPixels = (ponto) => ({
    x: ponto.x * larguraExibida,
    y: ponto.y * alturaExibida,
  });

  // Formato que o react-native-svg espera: "x1,y1 x2,y2 ..."
  const paraSvg = (pontos) =>
    pontos
      .map((p) => {
        const pixel = paraPixels(p);
        return `${pixel.x},${pixel.y}`;
      })
      .join(' ');

  // Onde o dedo encostou, em coordenada normalizada.
  // O clamp protege de toques na borda que escapariam de 0..1.
  function pontoDoToque(evento) {
    const { locationX, locationY } = evento.nativeEvent;

    return {
      x: Math.min(Math.max(locationX / larguraExibida, 0), 1),
      y: Math.min(Math.max(locationY / alturaExibida, 0), 1),
    };
  }

  // Modo de marcacao: cada toque vira um vertice.
  function handleToque(evento) {
    onTocarPlanta?.(pontoDoToque(evento));
  }

  // Modo de consulta: descobre em qual regiao o dedo caiu.
  //
  // Antes quem respondia ao toque era o proprio <Polygon> do react-native-svg,
  // pelo onPress dele. No Android com a nova arquitetura esse toque
  // simplesmente nao chega — a regiao ficava desenhada mas surda, e como o
  // detalhe da area so abre por aqui, era impossivel lancar o resultado do
  // laboratorio pelo aplicativo.
  //
  // Agora quem ouve e um Pressable comum por cima da planta, e a decisao de
  // qual regiao foi tocada e feita em JavaScript. Nao depende do suporte a
  // toque do SVG.
  function handleToqueConsulta(evento) {
    const ponto = pontoDoToque(evento);

    // De tras para frente: as ultimas regioes sao desenhadas por cima, entao
    // quando duas se sobrepoem ganha a que esta visivelmente na frente.
    for (let i = regioes.length - 1; i >= 0; i--) {
      if (dentroDoPoligono(ponto, regioes[i].pontos)) {
        onTocarRegiao?.(regioes[i]);
        return;
      }
    }
  }

  return (
    <View style={{ width: larguraExibida, height: alturaExibida }}>

      <Image
        source={{ uri: urlImagem }}
        style={[styles.imagem, { width: larguraExibida, height: alturaExibida }]}
        resizeMode="contain"
      />

      <Svg
        width={larguraExibida}
        height={alturaExibida}
        style={StyleSheet.absoluteFill}
        // O SVG e so desenho: nenhum toque passa por ele em modo nenhum.
        // Quem ouve e o Pressable logo abaixo, no fim deste componente.
        pointerEvents="none"
      >

        {/* ── REGIOES JA SALVAS ── */}
        {regioes.map((regiao) => {
          const { cor } = avaliarRegiao(regiao, fckProjeto);
          const centro = paraPixels(centroAproximado(regiao.pontos));

          return (
            <React.Fragment key={regiao.id}>
              <Polygon
                points={paraSvg(regiao.pontos)}
                fill={cor}
                fillOpacity={0.35}
                stroke={cor}
                strokeWidth={2.5}
                // Sem onPress: quem responde ao toque e a camada de baixo,
                // em JavaScript (ver handleToqueConsulta).
              />
              <SvgText
                x={centro.x}
                y={centro.y}
                fill="#fff"
                fontSize={13}
                fontWeight="bold"
                textAnchor="middle"
                alignmentBaseline="middle"
                // O rotulo nao intercepta toque: quem responde e o poligono
                pointerEvents="none"
              >
                {regiao.caminhao}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* ── POLIGONO EM CONSTRUCAO ── */}
        {/* Com 3+ vertices ja mostra a area preenchida, para o usuario
            enxergar o formato antes de confirmar */}
        {pontosNovos.length >= 3 && (
          <Polygon
            points={paraSvg(pontosNovos)}
            fill="#22C55E"
            fillOpacity={0.25}
            stroke="#22C55E"
            strokeWidth={2}
            strokeDasharray="6,4"
          />
        )}

        {/* Com 2 vertices ainda e so uma linha */}
        {pontosNovos.length === 2 && (
          <Polyline
            points={paraSvg(pontosNovos)}
            fill="none"
            stroke="#22C55E"
            strokeWidth={2}
            strokeDasharray="6,4"
          />
        )}

        {/* Vertices marcados, para o usuario ver onde tocou */}
        {pontosNovos.map((ponto, indice) => {
          const pixel = paraPixels(ponto);
          return (
            <Circle
              key={indice}
              cx={pixel.x}
              cy={pixel.y}
              r={6}
              fill="#22C55E"
              stroke="#fff"
              strokeWidth={2}
            />
          );
        })}

      </Svg>

      {/* ── CAMADA DE TOQUE ── */}
      {/* Sempre presente, por cima de tudo. O que muda com o modo e o que ela
          faz com o toque: virar vertice, ou abrir a regiao tocada. Um
          Pressable comum e confiavel nas duas plataformas, o que o toque em
          forma de SVG nao e. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={marcando ? handleToque : handleToqueConsulta}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  imagem: {
    position: 'absolute',
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
});
