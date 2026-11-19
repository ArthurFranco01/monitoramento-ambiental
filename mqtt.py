# ********************* CONEXÃO SENSORES *********************************

import json
import os
from datetime import datetime, timezone

import paho.mqtt.client as mqtt
from sqlalchemy.exc import IntegrityError

from models import mybd, Registro
from alerta import calcular_alerta_chuva
from notificacao import enviar_alerta_email

mqtt_data = {}
app = None  # definido em start_mqtt(), evita import circular com app.py
alerta_ativo = False  # evita reenviar e-mail a cada leitura enquanto o alerta persiste

# Configuráveis por variável de ambiente, caso a caixinha real use outro broker/tópico.
# Troque "grupoX" pelo identificador real do grupo (o broker é público!).
MQTT_BROKER = os.environ.get('MQTT_BROKER', 'test.mosquitto.org')
MQTT_PORT = int(os.environ.get('MQTT_PORT', '1883'))
MQTT_TOPIC = os.environ.get('MQTT_TOPIC', 'projeto_integrado/SENAI134/Cienciadedados/grupoX')


def on_connect(client, userdata, flags, rc):
    # client: A instância do cliente MQTT.
    # userdata: Dados do usuário definidos quando o cliente foi configurado (geralmente None).
    # flags: Dicionário contendo sinalizadores de resposta do broker.
    # rc: Código de resultado da conexão (0 significa sucesso; valores diferentes de zero indicam erros).
    print("Connected with result code " + str(rc))

    if rc == 0:
        client.subscribe(MQTT_TOPIC)


def on_message(client, userdata, msg):
    global mqtt_data, alerta_ativo
    # Decodifica a mensagem recebida de bytes para string
    payload = msg.payload.decode('utf-8')

    # Converte a string JSON em um dicionário Python
    mqtt_data = json.loads(payload)

    # Imprime a mensagem recebida
    print(f"Received message: {mqtt_data}")

    # Adiciona o contexto da aplicação para a manipulação do banco de dados
    with app.app_context():
        try:
            temperature = mqtt_data.get('temperature')
            pressure_pa = mqtt_data.get('pressure')
            # Caixinha envia pressão em Pa; coluna/documentação usam hPa (1 hPa = 100 Pa).
            pressure = pressure_pa / 100 if pressure_pa is not None else None
            altitude = mqtt_data.get('altitude')
            humidity = mqtt_data.get('humidity')
            CO2 = mqtt_data.get('CO2')
            particula1 = mqtt_data.get('particula1')
            particula2 = mqtt_data.get('particula2')
            timestamp_unix = mqtt_data.get('timestamp')

            if timestamp_unix is None:
                print("Timestamp não encontrado no payload")
                return

            # Converte timestamp Unix para datetime
            try:
                registro_tempo = datetime.fromtimestamp(int(timestamp_unix), tz=timezone.utc)
            except (ValueError, TypeError) as e:
                print(f"Erro ao converter timestamp: {str(e)}")
                return

            # Cria o objeto Registro com os dados
            new_data = Registro(
                temperature=temperature,
                pressure=pressure,
                altitude=altitude,
                humidity=humidity,
                CO2=CO2,
                particula1=particula1,
                particula2=particula2,
                registro_tempo=registro_tempo
            )

            # Adiciona o novo registro ao banco de dados
            mybd.session.add(new_data)
            mybd.session.commit()
            print("Dados inseridos no banco de dados com sucesso")

            # Dispara o e-mail só na transição de "sem alerta" para "alerta"
            # (não a cada leitura enquanto a condição persistir).
            resultado = calcular_alerta_chuva()
            if resultado['alerta'] and not alerta_ativo:
                enviar_alerta_email(resultado)
            alerta_ativo = resultado['alerta']

        except IntegrityError:
            # registro_tempo é UNIQUE: mensagem repetida (ex. reenvio após falha de rede)
            mybd.session.rollback()
            print("Registro com esse registro_tempo já existe, ignorando duplicata")

        except Exception as e:
            print(f"Erro ao processar os dados do MQTT: {str(e)}")
            mybd.session.rollback()


mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message


def start_mqtt(flask_app):
    global app
    app = flask_app
    mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
    mqtt_client.loop_start()
