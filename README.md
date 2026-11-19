# Monitoramento Ambiental

Projeto Integrador (SENAI134, Ciência de Dados) para monitorar condições ambientais em tempo real e **detectar chuva iminente** combinando queda de pressão atmosférica com alta de umidade.

## Como funciona

```
Caixinha (sensores)  --MQTT-->  test.mosquitto.org  --MQTT-->  app.py (Flask)
                                                                    |
                                                                    v
                                                              MySQL (mqtt)
                                                                    |
                                      /dados, /clima, /alerta-chuva (API REST)
                                                                    |
                                                        alerta dispara --> e-mail
```

1. A caixinha (ESP32 + sensores) mede temperatura, pressão, altitude, umidade, CO₂ e material particulado, e publica tudo via **MQTT** num broker público.
2. `mqtt.py` assina o tópico, converte a pressão (a caixinha envia em Pa, o sistema guarda em hPa) e grava cada leitura no **MySQL**.
3. A cada leitura nova, `alerta.py` recalcula a tendência de pressão/umidade da janela recente. Se a pressão está caindo **e** a umidade subindo (ou a umidade já está muito alta), o alerta dispara e `notificacao.py` envia um **e-mail** automaticamente.
4. `app.py` expõe tudo via API REST, incluindo uma comparação com o clima oficial do local (via **Open-Meteo**, sem necessidade de chave).

## Estrutura

| Arquivo | Responsabilidade |
|---|---|
| `app.py` | API Flask e configuração da aplicação |
| `models.py` | Modelo da tabela `mqtt` (SQLAlchemy) |
| `mqtt.py` | Conexão MQTT: recebe, converte e grava as leituras |
| `alerta.py` | Lógica do alerta de chuva (pressão + umidade) |
| `notificacao.py` | Envio do e-mail de alerta (SMTP) |
| `clima.py` | Integração com a API externa Open-Meteo |
| `schema.sql` | Criação do banco e tabela, com dados de exemplo |
| `docs/api.md` | Documentação detalhada das rotas e variáveis de ambiente |
| `docs/modelagem_banco_de_dados.md` | Modelagem da tabela `mqtt` |

## Como rodar

```powershell
pip install -r requirements.txt
```

Crie o banco (ajuste usuário/senha se necessário):

```powershell
mysql -u root -p < schema.sql
```

Configure as variáveis de ambiente necessárias (veja a tabela abaixo) e rode:

```powershell
$env:DB_PASSWORD = "sua_senha_mysql"
python app.py
```

A aplicação sobe em `http://localhost:8080` e já conecta no MQTT automaticamente.

## Variáveis de ambiente

| Variável | Padrão | Para quê |
|---|---|---|
| `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` | `root` / `''` / `localhost` / `3306` / `monitoramento` | Conexão com o MySQL |
| `MQTT_BROKER`, `MQTT_PORT`, `MQTT_TOPIC` | `test.mosquitto.org` / `1883` / `projeto_integrado/SENAI134/Cienciadedados/grupoX` | Broker e tópico da caixinha |
| `CLIMA_LAT`, `CLIMA_LON` | Rua Niterói, 180, São Caetano do Sul, SP | Coordenadas usadas na comparação com o clima externo |
| `ALERTA_QUEDA_PRESSAO`, `ALERTA_ALTA_UMIDADE`, `ALERTA_UMIDADE_ABSOLUTA` | `1.0` hPa / `5.0` pontos / `90.0` % | Limiares do alerta de chuva |
| `EMAIL_REMETENTE`, `EMAIL_SENHA_APP`, `EMAIL_DESTINATARIO` | — | Envio do e-mail de alerta (senha de app do Gmail, não a senha normal) |

Detalhes completos, endpoints e exemplos de uso em [docs/api.md](docs/api.md).

## Rotas principais

| Rota | Descrição |
|---|---|
| `GET /dados` | Últimos registros da caixinha |
| `GET /dados/ultimo` | Leitura mais recente |
| `GET /clima` | Clima atual via Open-Meteo |
| `GET /comparativo` | Caixinha + clima externo lado a lado |
| `GET /alerta-chuva` | Indício de chuva iminente (pressão + umidade) |
