// ============================================================
// CEMTINEL — rastreador GPS
// ESP8266 (NodeMCU) + módulo GPS NEO-6M v2
//
// Publica a posição do caminhão por MQTT, no tópico
//     cemtinel/caminhao/{N}/posicao
// com carga JSON:
//     {"lat":-22.251900,"lon":-45.703600,"sat":7}
//
// BIBLIOTECAS (Sketch > Incluir Biblioteca > Gerenciar Bibliotecas)
//   - TinyGPSPlus   de MIKAL HART  ← a original, não a "TinyGPSPlus-ESP32"
//   - PubSubClient  (Nick O'Leary)
//   SoftwareSerial já vem no core do ESP8266.
//
// PLACA (Ferramentas > Placa)
//   NodeMCU 1.0 (ESP-12E Module), ou a que corresponder à sua.
//
// LIGAÇÃO
//   GPS VCC  →  3V3 do NodeMCU
//   GPS GND  →  GND
//   GPS TX   →  D5  (GPIO14)   o ESP escuta aqui
//   GPS RX   →  D6  (GPIO12)   quase nunca usado; o GPS só fala
//
//   Os fios TX/RX vão CRUZADOS: quem fala de um lado escuta do outro.
//   Trocar os dois é o erro mais comum — se não chegar nada, comece por aí.
// ============================================================

#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <SoftwareSerial.h>
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

// De quanto em quanto tempo publicar (ms). 5 s é bastante para um caminhão.
const unsigned long INTERVALO = 5000;


// ============================================================
// Numero do GPIO em vez de D5/D6 de proposito: as constantes D5/D6 so existem
// nas variantes NodeMCU/Wemos. Selecionando "Generic ESP8266 Module" elas nao
// existem e o compilador reclama de "'D5' was not declared in this scope".
// GPIO funciona em qualquer placa.
//
//   GPIO14 = pino marcado D5 na serigrafia
//   GPIO12 = pino marcado D6 na serigrafia
const uint8_t PINO_RX = 14;   // o ESP ESCUTA aqui  → ligar no TX do GPS
const uint8_t PINO_TX = 12;   // o ESP FALA aqui    → ligar no RX do GPS

TinyGPSPlus     gps;
SoftwareSerial  gpsSerial(PINO_RX, PINO_TX);
WiFiClient      wifi;
PubSubClient    mqtt(wifi);

char          topico[64];
unsigned long ultimoEnvio = 0;


void conectarWifi() {
  Serial.printf("\n[WiFi] Conectando em %s", SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, SENHA);

  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.printf("\n[WiFi] OK — IP %s\n", WiFi.localIP().toString().c_str());
}


void conectarMqtt() {
  while (!mqtt.connected()) {
    // ID único: dois clientes com o mesmo ID derrubam um ao outro
    String id = "cemtinel-gps-" + String(CAMINHAO) + "-" + String(random(0xffff), HEX);

    Serial.printf("[MQTT] Conectando em %s:%u ... ", BROKER, PORTA);

    if (mqtt.connect(id.c_str())) {
      Serial.println("OK");
    } else {
      // rc=-2 quase sempre é IP errado ou o Mosquitto sem allow_anonymous
      Serial.printf("falhou (rc=%d). Tentando de novo em 3 s\n", mqtt.state());
      delay(3000);
    }
  }
}


void setup() {
  Serial.begin(115200);
  gpsSerial.begin(9600);           // NEO-6M sai de fábrica em 9600

  snprintf(topico, sizeof(topico), "cemtinel/caminhao/%s/posicao", CAMINHAO);

  conectarWifi();
  mqtt.setServer(BROKER, PORTA);

  Serial.printf("[Cemtinel] Publicando em %s\n", topico);
  Serial.println("[Cemtinel] Aguardando fix do GPS — pode levar minutos.");
}


void loop() {
  // Alimenta o parser com tudo que o GPS falou desde a última volta.
  // Isso precisa rodar SEMPRE, senão o buffer estoura e perde sentença.
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  if (!mqtt.connected()) conectarMqtt();
  mqtt.loop();

  if (millis() - ultimoEnvio < INTERVALO) return;
  ultimoEnvio = millis();

  // ── SEM FIX ──
  // Dentro de prédio isso é o normal. A antena precisa de céu.
  if (!gps.location.isValid()) {
    Serial.printf("[GPS] Sem fix. Satélites vistos: %d | sentenças: %lu\n",
                  gps.satellites.value(), gps.charsProcessed());

    // charsProcessed em 0 depois de 10 s significa que NADA chega do módulo:
    // é fiação trocada ou baud errado, não falta de sinal.
    if (millis() > 10000 && gps.charsProcessed() < 10) {
      Serial.println("[GPS] Nao chega nada do modulo. Confira TX/RX cruzados e o 9600.");
    }
    return;
  }

  // ── COM FIX ──
  char carga[96];
  snprintf(carga, sizeof(carga),
           "{\"lat\":%.6f,\"lon\":%.6f,\"sat\":%d}",
           gps.location.lat(), gps.location.lng(), gps.satellites.value());

  if (mqtt.publish(topico, carga)) {
    Serial.printf("[MQTT] %s  %s\n", topico, carga);
  } else {
    Serial.println("[MQTT] Falha ao publicar");
  }
}
