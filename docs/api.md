# API

## Rotas

| Rota | Método | Descrição |
|---|---|---|
| `/` | GET | Status da aplicação. |
| `/dados` | GET | Últimos registros da caixinha, mais recente primeiro. Aceita `?limit=N` (padrão 50, máx 500). |
| `/dados/ultimo` | GET | Leitura mais recente da caixinha. `404` se a tabela estiver vazia. |
| `/clima` | GET | Clima atual no local configurado, via API externa (Open-Meteo). `502` se a API externa falhar. |
| `/comparativo` | GET | Última leitura da caixinha + clima externo, lado a lado. |
| `/alerta-chuva` | GET | Avalia indício de chuva iminente (pressão caindo + umidade subindo). Aceita `?minutos=N` (padrão 15). |

## Integração com API externa (Open-Meteo)

`clima.py` consulta a [Open-Meteo](https://open-meteo.com) para obter temperatura, umidade e pressão do local da caixinha, sem precisar de cadastro ou API key.

Coordenadas padrão: Rua Niterói, 180, São Caetano do Sul, SP, configuradas em `CLIMA_LAT` / `CLIMA_LON`. Se precisar apontar para outro local, sobrescreva via variável de ambiente:

```powershell
$env:CLIMA_LAT = "-22.9068"
$env:CLIMA_LON = "-43.1729"
```

## Alerta de chuva por e-mail

Quando `/alerta-chuva` (recalculado a cada leitura nova em `mqtt.py`) passa de "sem alerta" para "alerta", um e-mail é enviado automaticamente (só uma vez por transição, não a cada leitura). Lógica em `alerta.py`, envio em `notificacao.py`.

Requer uma conta de e-mail com SMTP habilitado. Com Gmail, use uma [senha de app](https://myaccount.google.com/apppasswords) (não a senha normal da conta):

```powershell
$env:EMAIL_REMETENTE = "seuemail@gmail.com"
$env:EMAIL_SENHA_APP = "xxxx xxxx xxxx xxxx"
$env:EMAIL_DESTINATARIO = "destino@exemplo.com"
```

Se essas variáveis não estiverem configuradas, o alerta continua funcionando normalmente — só o envio de e-mail é pulado (com um aviso no log).

Limiares do alerta (`alerta.py`), todos ajustáveis por variável de ambiente:

```powershell
$env:ALERTA_QUEDA_PRESSAO = "1.0"      # hPa de queda na janela para considerar "caindo"
$env:ALERTA_ALTA_UMIDADE = "5.0"       # pontos percentuais de alta na janela
$env:ALERTA_UMIDADE_ABSOLUTA = "90.0"  # umidade atual acima disso já alerta sozinho
```

## Variáveis de ambiente (MQTT)

Para o teste com a caixinha, confirme que o tópico e o broker batem com o que o dispositivo físico está configurado para enviar. Por padrão a aplicação usa `test.mosquitto.org:1883`, tópico `projeto_integrado/SENAI134/Cienciadedados/grupoX` (troque `grupoX` pelo identificador real do grupo — o broker é público). Para mudar sem editar código:

```powershell
$env:MQTT_BROKER = "test.mosquitto.org"
$env:MQTT_PORT = "1883"
$env:MQTT_TOPIC = "projeto_integrado/SENAI134/Cienciadedados/grupoX"
```

## Checklist antes do teste físico com a caixinha

- [ ] Tópico MQTT da caixinha é exatamente igual ao configurado em `MQTT_TOPIC`.
- [ ] Payload enviado pela caixinha é JSON com as mesmas chaves esperadas em `mqtt.py` (`temperature`, `pressure`, `altitude`, `humidity`, `CO2`, `particula1`, `particula2`, `timestamp` em Unix time).
- [ ] Banco de dados criado (`schema.sql` executado) e acessível pelas credenciais em `DB_*`.
- [ ] Aplicação rodando (`python app.py`) e logando `Connected with result code 0` no terminal.
- [ ] Após a caixinha publicar, `GET /dados/ultimo` retorna a leitura recém-chegada (não um registro antigo).

## Exemplos (curl)

```bash
curl http://localhost:8080/dados?limit=10
curl http://localhost:8080/dados/ultimo
curl http://localhost:8080/clima
curl http://localhost:8080/comparativo
```
