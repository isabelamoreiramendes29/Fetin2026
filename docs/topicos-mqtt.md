# Tópicos MQTT do Cemtinel

Contrato entre o sensor e o aplicativo. Este é o documento que o app segue —
se algo aqui mudar, o app precisa mudar junto.

O MQTT tem **uma única responsabilidade** no projeto: entregar a leitura do
sensor em tempo real. Cadastro de usuários, obras, frota, envio de caminhão e
financeiro vivem no Supabase.

---

## Conexão

| | |
|---|---|
| Broker | Mosquitto na rede local |
| Endereço | `192.168.66.73` *(confirmar — IP local muda)* |
| Porta | `9001` |
| Protocolo | **WebSocket** |
| Caminho | `/mqtt` |
| QoS | 1 |

> **A porta precisa ser a de WebSocket, não a 1883.** O React Native não fala
> TCP puro. No `mosquitto.conf` isso significa ter um `listener 9001` com
> `protocol websockets`.

---

## Tópicos

```
cemtinel/caminhao/{caminhao}/temperatura
cemtinel/caminhao/{caminhao}/volume
```

Exemplo real:

```
cemtinel/caminhao/4/temperatura
cemtinel/caminhao/4/volume
```

`{caminhao}` é o número do caminhão — o mesmo que estiver cadastrado na tela
**Minha Frota** do app. Ele fica gravado no código do sensor, uma vez:

```c
const char* CAMINHAO = "4";
```

### Por que o caminhão, e não a obra

O sensor é fixo no caminhão e sabe quem ele é. A **obra muda a cada viagem** —
o caminhão 4 vai para a obra 1 hoje e para a obra 3 amanhã. Se a obra estivesse
no tópico, alguém teria que reconfigurar o sensor a cada saída.

Quem faz a ponte é o app: ele sabe quais caminhões foram despachados para cada
obra, e assina só os tópicos desses caminhões. O sensor continua burro, que é o
que se espera dele.

> **A identificação precisa bater.** Se o sensor publica como `4` e a frota tem
> o caminhão cadastrado como `Caminhão 4` ou `04`, o app recebe a leitura mas
> não acha a placa nem o motorista. Combine o número antes.

---

## Mensagens

### Temperatura

Publicada continuamente enquanto o sensor estiver ligado. Em graus Celsius.

O app aceita duas formas — use a que for mais simples de gerar no
microcontrolador:

**Número solto** (recomendado)

```
28.4
```

**JSON**

```json
{ "temperatura": 28.4 }
```

**Faixas que o app usa**, para referência:

| Temperatura | Interpretação | Gera alerta |
|---|---|---|
| abaixo de 10 °C | Frio — hidratação muito lenta | Sim, crítico |
| 10 a 15 °C | Baixa — cura retardada | Sim, atenção |
| 15 a 30 °C | Ideal | Não |
| 30 a 35 °C | Alta — atenção com a pega | Sim, atenção |
| acima de 35 °C | Crítica — risco à resistência | Sim, crítico |

### Volume

Publicada **uma vez por entrega**, quando o caminhão termina de descarregar.
Em metros cúbicos.

```
7.4
```

O app compara esse valor com o que foi comprado no Financeiro. A diferença é o
que interessa: pagar por 8 m³ e receber 7,4 é prejuízo que hoje ninguém
percebe.

---

## Frequência

Temperatura a cada 2 a 5 segundos é suficiente. Mais rápido que isso não
melhora nada na tela e enche o banco à toa — o app grava cada leitura recebida.

---

## Testar sem o sensor

Dá para simular do terminal, com o `mosquitto_pub` instalado:

```
mosquitto_pub -h 192.168.66.73 -t "cemtinel/caminhao/4/temperatura" -m "28.4"
```

Subindo o valor, dá para ver o velocímetro andar e o alerta disparar:

```
mosquitto_pub -h 192.168.66.73 -t "cemtinel/caminhao/4/temperatura" -m "37.0"
```

E o volume da entrega:

```
mosquitto_pub -h 192.168.66.73 -t "cemtinel/caminhao/4/volume" -m "7.4"
```

> O `mosquitto_pub` usa a porta 1883 por padrão, que é a TCP normal. O app usa
> a 9001 porque precisa de WebSocket. **São a mesma fila** — o broker entrega
> nos dois. Não é preciso publicar pela 9001.

---

## Formato antigo

Enquanto a migração não acontece, o app **também** assina o tópico antigo:

```
app/enviar_caminhao/resp
```

Com a mensagem no formato:

```json
{
  "status": "ok",
  "caminhao": {
    "id_obra": 1,
    "temperatura_interna": 28.4
  }
}
```

Isso existe para a integração funcionar com o que já está pronto, sem obrigar
ninguém a mudar tudo no mesmo dia. Quando o novo formato estiver publicando, é
só apagar o `topicoLegado` em `src/config/mqttConfig.js`.

---

## Se não funcionar

O indicador no topo da tela de Temperatura separa os dois problemas possíveis:

| O que aparece | Onde está o problema |
|---|---|
| **Sensor desconectado** | Não chegou ao broker — IP, porta, rede ou WebSocket desabilitado |
| **Sensor conectado** · sem leitura | Chegou ao broker, mas nada publica no tópico assinado |
| **Sensor conectado** · há 3 s | Funcionando |

No terminal do Expo, as linhas que importam começam com `[MQTT]`.
