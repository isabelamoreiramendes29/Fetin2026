// ============================================================
// CEMTINEL — rastreador GPS  (versão UART de hardware)
// ESP8266 (NodeMCU) + módulo GPS NEO-6M v2
//
// Esta versão usa os pinos TX e RX da própria placa, sem SoftwareSerial.
// Existe também hardware/gps-esp8266/ com a versão em D5/D6, que preserva o
// monitor serial — se um dia quiser voltar, é só abrir aquela.
//
// ┌──────────────────────────────────────────────────────────────┐
// │ ANTES DE GRAVAR, TIRE O JUMPER DO RX.                        │
// │                                                              │
// │ O GPS fica segurando a mesma linha que o USB usa para        │
// │ gravar. Com ele ligado, o upload falha — normalmente com     │
// │ "espcomm_sync failed" ou travando em "Connecting...".        │
// │ Grave, depois recoloque o jumper.                            │
// └──────────────────────────────────────────────────────────────┘
//
// COMO DIAGNOSTICAR SEM O MONITOR SERIAL
//   O UART está ocupado pelo GPS, então Serial.println não serve para nada.
//   Em troca, duas coisas:
//
//   1. O LED DA PLACA conta o que está acontecendo:
//        apagado          → sem Wi-Fi
//        pisca devagar    → Wi-Fi ok, GPS ainda sem fix
//        pisca rápido     → tudo funcionando, publicando posição
//
//   2. Um tópico de diagnóstico no MQTT. No computador do broker:
//        mosquitto_sub -h localhost -t "cemtinel/caminhao/+/#" -v
//
// BIBLIOTECAS
//   - TinyGPSPlus   de MIKAL HART  ← a original, não a "TinyGPSPlus-ESP32"
//   - PubSubClient  (Nick O'Leary)
//
// PLACA (Ferramentas > Placa)
//   NodeMCU 1.0 (ESP-12E Module)
//
// LIGAÇÃO
//   GPS VCC  →  3V3
//   GPS GND  →  GND
//   GPS TX   →  RX   (o ESP escuta aqui)   ← TIRE ESTE PARA GRAVAR
//   GPS RX   →  TX
// ============================================================

#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <TinyGPSPlus.h>


// ============================================================
// CONFIGURE AQUI
// ============================================================
const char*    SSID     = "SUA_REDE";
const char*    SENHA    = "SUA_SENHA";

// IP do computador onde roda o Mosquitto.
// PORTA 1883 (TCP), não 9001 — a 9001 é WebSocket, usada só pelo aplicativo.
const char*    BROKER   = "10.176.18.220";
const uint16_t PORTA    = 1883;

// Precisa bater com a identificação cadastrada em Minha Frota
const char*    CAMINHAO = "4";

const unsigned long INTERVALO        = 5000;   // publicar posição a cada 5 s
const unsigned long INTERVALO_STATUS = 5000;   // publicar diagnóstico


// ============================================================
TinyGPSPlus   gps;
WiFiClient    wifi;
PubSubClient  mqtt(wifi);

char topicoPosicao[64];
char topicoStatus[64];

unsigned long ultimoEnvio  = 0;
unsigned long ultimoStatus = 0;
unsigned long ultimoPisca  = 0;
bool          ledAceso     = false;


// O LED da NodeMCU é invertido: LOW acende, HIGH apaga.
void acenderLed(bool aceso) {
  digitalWrite(LED_BUILTIN, aceso ? LOW : HIGH);
}


// Pisca sem travar o loop. `periodo` em ms; 0 deixa apagado.
void piscar(unsigned long periodo) {
  if (periodo == 0) {
    acenderLed(false);
    return;
  }
  if (millis() - ultimoPisca >= periodo) {
    ultimoPisca = millis();
    ledAceso = !ledAceso;
    acenderLed(ledAceso);
  }
}


void conectarWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, SENHA);

  // Enquanto não conecta, o LED fica apagado — é o primeiro sinal de que
  // alguma coisa está errada na rede, e não no GPS.
  while (WiFi.status() != WL_CONNECTED) {
    acenderLed(false);
    delay(400);
  }
}


void conectarMqtt() {
  if (mqtt.connected()) return;

  // ID único: dois clientes com o mesmo ID derrubam um ao outro
  String id = "cemtinel-gps-" + String(CAMINHAO) + "-" + String(random(0xffff), HEX);
  mqtt.connect(id.c_str());
}


// Publica o que estaria no monitor serial, já que ele não está disponível.
// É por aqui que você descobre se o problema é fiação ou falta de sinal:
//   sentencas = 0  →  nada chega do módulo. Fiação ou baud.
//   sentencas > 0 e sat = 0  →  fiação certa, falta céu.
void publicarStatus() {
  char carga[160];
  snprintf(carga, sizeof(carga),
           "{\"wifi\":%d,\"mqtt\":%d,\"fix\":%d,\"sat\":%d,\"sentencas\":%lu}",
           WiFi.status() == WL_CONNECTED ? 1 : 0,
           mqtt.connected() ? 1 : 0,
           gps.location.isValid() ? 1 : 0,
           (int) gps.satellites.value(),
           gps.charsProcessed());

  mqtt.publish(topicoStatus, carga);
}


void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  acenderLed(false);

  // 9600 é o baud de fábrica do NEO-6M. Aqui o Serial pertence ao GPS:
  // qualquer Serial.print sujaria a linha que o módulo usa para falar.
  Serial.begin(9600);

  snprintf(topicoPosicao, sizeof(topicoPosicao), "cemtinel/caminhao/%s/posicao", CAMINHAO);
  snprintf(topicoStatus,  sizeof(topicoStatus),  "cemtinel/caminhao/%s/status",  CAMINHAO);

  conectarWifi();
  mqtt.setServer(BROKER, PORTA);
}


void loop() {
  // Alimenta o parser com tudo que o GPS falou desde a última volta.
  // Precisa rodar SEMPRE, senão o buffer estoura e perde sentença.
  while (Serial.available() > 0) {
    gps.encode(Serial.read());
  }

  if (WiFi.status() != WL_CONNECTED) conectarWifi();
  conectarMqtt();
  mqtt.loop();

  // ── O LED CONTA O ESTADO ──
  if (WiFi.status() != WL_CONNECTED)      piscar(0);      // apagado
  else if (!gps.location.isValid())       piscar(500);    // devagar
  else                                    piscar(120);    // rápido

  // ── DIAGNÓSTICO ──
  if (millis() - ultimoStatus >= INTERVALO_STATUS) {
    ultimoStatus = millis();
    publicarStatus();
  }

  // ── POSIÇÃO ──
  if (millis() - ultimoEnvio < INTERVALO) return;
  ultimoEnvio = millis();

  // Sem fix é o normal dentro de prédio. A antena precisa de céu.
  if (!gps.location.isValid()) return;

  char carga[96];
  snprintf(carga, sizeof(carga),
           "{\"lat\":%.6f,\"lon\":%.6f,\"sat\":%d}",
           gps.location.lat(), gps.location.lng(), (int) gps.satellites.value());

  mqtt.publish(topicoPosicao, carga);
}
