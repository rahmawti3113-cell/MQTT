// ================================================================
//  PROGRAM : ESP8266 / ESP32  ←→  Multi-Broker MQTT
//  FUNGSI  : Baca Sensor DHT11 & Kendali 4 Relay via MQTT
//            + Variasi 1: Loop urutan ON 1→2→3→4 terus menerus
//            + Variasi 2: Loop urutan ON 4→3→2→1 terus menerus
//            + Stop variasi dengan STOP pada topik variasi1/variasi2
//            + Pindah broker dengan kontrol/broker → BROKER1/BROKER2/BROKER3
// ================================================================

#if defined(ESP8266)
  #include <ESP8266WiFi.h>
#elif defined(ESP32)
  #include <WiFi.h>
#endif

#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include "DHT.h"

// ================================================================
//                        KONFIGURASI WiFi
// ================================================================

const char* WIFI_SSID     = "rahma";
const char* WIFI_PASSWORD = "123456789";

// ================================================================
//                     KONFIGURASI MULTI-BROKER
// ================================================================

#define JUMLAH_BROKER 3

struct BrokerConfig {
  const char* host;
  int         port;
  const char* user;
  const char* pass;
  const char* clientId;
  const char* nama;
};

const BrokerConfig daftarBroker[JUMLAH_BROKER] = {
  {
    "kingfisher.lmq.cloudamqp.com",
    8883,
    "ztmxasef:ztmxasef",
    "AxprRMcQ9pDWkyWqcCZa_q2fuTBWQsGE",
    "ESP_Rahma_001",
    "BROKER1 (CloudAMQP)"
  },
  {
    "pf-26xt4cmufmfw6kr1zpyq.cedalo.cloud",
    8883,
    "Esp",
    "a",
    "EspClient",
    "BROKER2 (Cedalo)"
  },
  {
    "mqtt.ably.io",
    8883,
    "2fHRLg.LixlRg",
    "bhjvIdszO--QR4JqK4eIcdA2aAbwO0vGNN_kJOPucnQ",
    "AblyEsp",
    "BROKER3 (Ably)"
  }
};

int brokerAktif       = 0;
bool mintaGantiBroker = false;
int  brokerTujuan     = 0;

// ================================================================
//                         PIN KONFIGURASI
// ================================================================

#define RELAY1_PIN  23
#define RELAY2_PIN  19
#define RELAY3_PIN  18
#define RELAY4_PIN  5
#define DHT_PIN     4
#define DHT_TYPE    DHT11
#define INTERVAL_MS   5000
#define JEDA_VARIASI  50

// ================================================================
//                       TOPIK MQTT
// ================================================================

const char* TOPIC_SUHU       = "sensor/suhu";
const char* TOPIC_KELEMBABAN = "sensor/kelembaban";
const char* TOPIC_RELAY1     = "kontrol/relay1";
const char* TOPIC_RELAY2     = "kontrol/relay2";
const char* TOPIC_RELAY3     = "kontrol/relay3";
const char* TOPIC_RELAY4     = "kontrol/relay4";
const char* TOPIC_VARIASI1   = "kontrol/variasi1";
const char* TOPIC_VARIASI2   = "kontrol/variasi2";
const char* TOPIC_BROKER     = "kontrol/broker";

// ================================================================
//                     INISIALISASI OBJEK
// ================================================================

WiFiClientSecure espClient;
PubSubClient     mqttClient(espClient);
DHT              dht(DHT_PIN, DHT_TYPE);

unsigned long waktuTerakhirKirim   = 0;
int           modeVariasi          = 0;
int           langkahVariasi       = 0;
unsigned long waktuLangkahTerakhir = 0;

// ================================================================
//                   FUNGSI BANTU RELAY
// ================================================================

void semuaRelayOff() {
  digitalWrite(RELAY1_PIN, HIGH);
  digitalWrite(RELAY2_PIN, HIGH);
  digitalWrite(RELAY3_PIN, HIGH);
  digitalWrite(RELAY4_PIN, HIGH);
  Serial.println("[RELAY] Semua relay → OFF");
}

// ================================================================
//         FUNGSI: JALANKAN SATU LANGKAH VARIASI (NON-BLOCKING)
// ================================================================

void jalankanVariasi() {
  if (modeVariasi == 0) return;

  unsigned long sekarang = millis();
  if (sekarang - waktuLangkahTerakhir < JEDA_VARIASI) return;
  waktuLangkahTerakhir = sekarang;

  if (langkahVariasi == 0) semuaRelayOff();

  if (modeVariasi == 1) {
    switch (langkahVariasi) {
      case 0: digitalWrite(RELAY1_PIN, LOW); Serial.println("[VAR1] Relay 1 → ON"); break;
      case 1: digitalWrite(RELAY2_PIN, LOW); Serial.println("[VAR1] Relay 2 → ON"); break;
      case 2: digitalWrite(RELAY3_PIN, LOW); Serial.println("[VAR1] Relay 3 → ON"); break;
      case 3: digitalWrite(RELAY4_PIN, LOW); Serial.println("[VAR1] Relay 4 → ON"); break;
    }
  } else if (modeVariasi == 2) {
    switch (langkahVariasi) {
      case 0: digitalWrite(RELAY4_PIN, LOW); Serial.println("[VAR2] Relay 4 → ON"); break;
      case 1: digitalWrite(RELAY3_PIN, LOW); Serial.println("[VAR2] Relay 3 → ON"); break;
      case 2: digitalWrite(RELAY2_PIN, LOW); Serial.println("[VAR2] Relay 2 → ON"); break;
      case 3: digitalWrite(RELAY1_PIN, LOW); Serial.println("[VAR2] Relay 1 → ON"); break;
    }
  }

  langkahVariasi++;
  if (langkahVariasi > 3) {
    langkahVariasi = 0;
    Serial.println("[VARIASI] Siklus selesai, ulangi...");
  }
}

// ================================================================
//                  FUNGSI: SUBSCRIBE SEMUA TOPIK
// ================================================================

void subscribeSemuaTopik() {
  mqttClient.subscribe(TOPIC_RELAY1);
  mqttClient.subscribe(TOPIC_RELAY2);
  mqttClient.subscribe(TOPIC_RELAY3);
  mqttClient.subscribe(TOPIC_RELAY4);
  mqttClient.subscribe(TOPIC_VARIASI1);
  mqttClient.subscribe(TOPIC_VARIASI2);
  mqttClient.subscribe(TOPIC_BROKER);
  Serial.println("[MQTT] Subscribe semua topik ✓");
}

// ================================================================
//                     FUNGSI: KONEKSI WiFi
// ================================================================

void setup_wifi() {
  delay(10);
  Serial.print("[WiFi] Menghubungkan ke: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int percobaan = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (++percobaan > 40) {
      Serial.println("\n[WiFi] Gagal! Restart...");
      ESP.restart();
    }
  }

  Serial.println("\n[WiFi] Terhubung!");
  Serial.print("[WiFi] IP: ");
  Serial.println(WiFi.localIP());
  espClient.setInsecure();
}

// ================================================================
//              FUNGSI: CALLBACK PESAN MQTT MASUK
// ================================================================

void callback(char* topic, byte* payload, unsigned int panjang) {
  String pesan = "";
  for (unsigned int i = 0; i < panjang; i++) pesan += (char)payload[i];
  pesan.trim();

  Serial.print("[MQTT] [");
  Serial.print(topic);
  Serial.print("] : ");
  Serial.println(pesan);

  // ── Ganti Broker ──────────────────────────────────────────
  if (String(topic) == TOPIC_BROKER) {
    int targetBroker = -1;
    if      (pesan == "BROKER1") targetBroker = 0;
    else if (pesan == "BROKER2") targetBroker = 1;
    else if (pesan == "BROKER3") targetBroker = 2;

    if (targetBroker == -1) {
      Serial.println("[BROKER] Payload tidak dikenal! Gunakan: BROKER1 / BROKER2 / BROKER3");
      return;
    }
    if (targetBroker == brokerAktif) {
      Serial.print("[BROKER] Sudah terhubung ke ");
      Serial.println(daftarBroker[brokerAktif].nama);
      return;
    }
    mintaGantiBroker = true;
    brokerTujuan     = targetBroker;
    Serial.print("[BROKER] Permintaan pindah ke ");
    Serial.println(daftarBroker[targetBroker].nama);
    return;
  }

  // ── Relay individual ──────────────────────────────────────
  if (String(topic) == TOPIC_RELAY1) {
    if (pesan == "ON")  { digitalWrite(RELAY1_PIN, LOW);  Serial.println("[RELAY] Relay 1 → ON");  }
    if (pesan == "OFF") { digitalWrite(RELAY1_PIN, HIGH); Serial.println("[RELAY] Relay 1 → OFF"); }
  }
  else if (String(topic) == TOPIC_RELAY2) {
    if (pesan == "ON")  { digitalWrite(RELAY2_PIN, LOW);  Serial.println("[RELAY] Relay 2 → ON");  }
    if (pesan == "OFF") { digitalWrite(RELAY2_PIN, HIGH); Serial.println("[RELAY] Relay 2 → OFF"); }
  }
  else if (String(topic) == TOPIC_RELAY3) {
    if (pesan == "ON")  { digitalWrite(RELAY3_PIN, LOW);  Serial.println("[RELAY] Relay 3 → ON");  }
    if (pesan == "OFF") { digitalWrite(RELAY3_PIN, HIGH); Serial.println("[RELAY] Relay 3 → OFF"); }
  }
  else if (String(topic) == TOPIC_RELAY4) {
    if (pesan == "ON")  { digitalWrite(RELAY4_PIN, LOW);  Serial.println("[RELAY] Relay 4 → ON");  }
    if (pesan == "OFF") { digitalWrite(RELAY4_PIN, HIGH); Serial.println("[RELAY] Relay 4 → OFF"); }
  }

  // ── Variasi 1 ─────────────────────────────────────────────
  else if (String(topic) == TOPIC_VARIASI1) {
    if (pesan == "START") {
      modeVariasi          = 1;
      langkahVariasi       = 0;
      waktuLangkahTerakhir = 0;
      Serial.println("[VARIASI 1] Dimulai! Loop 1→2→3→4 terus...");
    }
    else if (pesan == "STOP") {
      modeVariasi    = 0;
      langkahVariasi = 0;
      semuaRelayOff();
      Serial.println("[VARIASI 1] Dihentikan. Semua relay OFF.");
    }
  }

  // ── Variasi 2 ─────────────────────────────────────────────
  else if (String(topic) == TOPIC_VARIASI2) {
    if (pesan == "START") {
      modeVariasi          = 2;
      langkahVariasi       = 0;
      waktuLangkahTerakhir = 0;
      Serial.println("[VARIASI 2] Dimulai! Loop 4→3→2→1 terus...");
    }
    else if (pesan == "STOP") {
      modeVariasi    = 0;
      langkahVariasi = 0;
      semuaRelayOff();
      Serial.println("[VARIASI 2] Dihentikan. Semua relay OFF.");
    }
  }
}

// ================================================================
//            FUNGSI: EKSEKUSI GANTI BROKER (dipanggil di loop)
// ================================================================

void gantiBroker(int indeksBaru) {
  Serial.println("──────────────────────────────────────────");
  Serial.print("[BROKER] Memutus dari ");
  Serial.println(daftarBroker[brokerAktif].nama);

  mqttClient.disconnect();
  delay(500);

  brokerAktif = indeksBaru;
  const BrokerConfig& b = daftarBroker[brokerAktif];

  Serial.print("[BROKER] Menghubungkan ke ");
  Serial.println(b.nama);
  mqttClient.setServer(b.host, b.port);

  int gagal = 0;
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Connecting sebagai '");
    Serial.print(b.clientId);
    Serial.print("' ... ");

    if (mqttClient.connect(b.clientId, b.user, b.pass)) {
      Serial.println("BERHASIL!");
      subscribeSemuaTopik();
    } else {
      Serial.print("GAGAL! Kode: ");
      Serial.print(mqttClient.state());
      Serial.print(" | Coba lagi... (");
      Serial.print(++gagal);
      Serial.println("/5)");
      if (gagal >= 5) {
        Serial.println("[BROKER] 5x gagal, rollback ke broker sebelumnya...");
        int brokerLama = (indeksBaru == 0) ? JUMLAH_BROKER - 1 : indeksBaru - 1;
        brokerAktif = brokerLama;
        mqttClient.setServer(daftarBroker[brokerAktif].host, daftarBroker[brokerAktif].port);
        break;
      }
      delay(3000);
    }
  }
  Serial.println("──────────────────────────────────────────");
}

// ================================================================
//               FUNGSI: RECONNECT KE BROKER AKTIF
// ================================================================

void reconnect() {
  int gagal = 0;
  const BrokerConfig& b = daftarBroker[brokerAktif];

  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Reconnect ke ");
    Serial.print(b.nama);
    Serial.print(" ... ");

    if (mqttClient.connect(b.clientId, b.user, b.pass)) {
      Serial.println("BERHASIL!");
      subscribeSemuaTopik();
      gagal = 0;
    } else {
      Serial.print("GAGAL! Kode: ");
      Serial.print(mqttClient.state());
      Serial.println(" | Coba lagi 5 detik...");
      if (++gagal >= 5) {
        Serial.println("[MQTT] 5x gagal, restart ESP...");
        ESP.restart();
      }
      delay(5000);
    }
  }
}

// ================================================================
//                           SETUP
// ================================================================

void setup() {
  Serial.begin(115200);
  delay(100);

  Serial.println("\n==============================================");
  Serial.println("  ESP + Multi-Broker + DHT11 + 4 Relay");
  Serial.println("==============================================");
  for (int i = 0; i < JUMLAH_BROKER; i++) {
    Serial.print("    ["); Serial.print(i + 1); Serial.print("] ");
    Serial.println(daftarBroker[i].nama);
  }
  Serial.println("==============================================\n");

  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  pinMode(RELAY3_PIN, OUTPUT);
  pinMode(RELAY4_PIN, OUTPUT);
  semuaRelayOff();

  dht.begin();
  Serial.println("[DHT] Sensor DHT11 siap");

  setup_wifi();

  const BrokerConfig& b = daftarBroker[brokerAktif];
  mqttClient.setServer(b.host, b.port);
  mqttClient.setCallback(callback);
  mqttClient.setKeepAlive(60);
  mqttClient.setBufferSize(512, 512);

  Serial.print("[MQTT] Broker awal: ");
  Serial.println(b.nama);
}

// ================================================================
//                         LOOP UTAMA
// ================================================================

void loop() {
  if (mintaGantiBroker) {
    mintaGantiBroker = false;
    gantiBroker(brokerTujuan);
  }

  if (!mqttClient.connected()) reconnect();
  mqttClient.loop();

  jalankanVariasi();

  unsigned long sekarang = millis();
  if (sekarang - waktuTerakhirKirim >= INTERVAL_MS) {
    waktuTerakhirKirim = sekarang;

    float kelembaban = dht.readHumidity();
    float suhu       = dht.readTemperature();

    if (isnan(kelembaban) || isnan(suhu)) {
      Serial.println("[DHT] ⚠ Gagal membaca sensor!");
      return;
    }

    char bufSuhu[8], bufLembab[8];
    dtostrf(suhu,       4, 1, bufSuhu);
    dtostrf(kelembaban, 4, 1, bufLembab);

    bool okSuhu   = mqttClient.publish(TOPIC_SUHU,       bufSuhu);
    bool okLembab = mqttClient.publish(TOPIC_KELEMBABAN, bufLembab);

    Serial.print("[DHT] Suhu: "); Serial.print(bufSuhu);
    Serial.print(" °C | Kelembaban: "); Serial.print(bufLembab);
    Serial.print(" % | Suhu: ");   Serial.print(okSuhu   ? "OK" : "GAGAL");
    Serial.print(" | Lembab: ");   Serial.println(okLembab ? "OK" : "GAGAL");

    Serial.print("[BROKER AKTIF] ");
    Serial.println(daftarBroker[brokerAktif].nama);
  }
}

// ================================================================
//  CARA PAKAI DI MQTTX
// ================================================================
//
//  ── GANTI BROKER ──────────────────────────────────────────
//    Topik : kontrol/broker
//    Pesan : BROKER1 / BROKER2 / BROKER3
//
//  ── VARIASI ───────────────────────────────────────────────
//    Topik : kontrol/variasi1   Pesan : START  (loop 1→2→3→4)
//    Topik : kontrol/variasi1   Pesan : STOP   (hentikan + OFF)
//    Topik : kontrol/variasi2   Pesan : START  (loop 4→3→2→1)
//    Topik : kontrol/variasi2   Pesan : STOP   (hentikan + OFF)
//
//  ── RELAY INDIVIDUAL ──────────────────────────────────────
//    Topik : kontrol/relay1  (ganti 1-4)
//    Pesan : ON  atau  OFF
// ================================================================
