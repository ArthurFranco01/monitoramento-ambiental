# ********************* INTEGRAÇÃO COM API EXTERNA *********************
# Open-Meteo (https://open-meteo.com) não exige cadastro nem API key.
# Troque CLIMA_LAT / CLIMA_LON pelas coordenadas reais de onde a caixinha
# está instalada para comparar as leituras dela com o clima oficial do local.

import os

import requests

CLIMA_LAT = float(os.environ.get('CLIMA_LAT', '-23.6150'))   # padrão: Rua Niterói, 180, São Caetano do Sul, SP
CLIMA_LON = float(os.environ.get('CLIMA_LON', '-46.5699'))
CLIMA_URL = 'https://api.open-meteo.com/v1/forecast'


def buscar_clima_externo():
    """Consulta o clima atual via Open-Meteo. Retorna None se a API falhar."""
    params = {
        'latitude': CLIMA_LAT,
        'longitude': CLIMA_LON,
        'current': 'temperature_2m,relative_humidity_2m,surface_pressure',
        'timezone': 'auto',
    }

    try:
        headers = {'User-Agent': 'MonitoramentoAmbiental/1.0'}
        resposta = requests.get(CLIMA_URL, params=params, timeout=15, headers=headers)
        resposta.raise_for_status()
    except requests.RequestException as e:
        print(f"Erro ao consultar API meteorológica externa: {e}")
        return None

    atual = resposta.json().get('current', {})
    return {
        'temperatura': atual.get('temperature_2m'),
        'umidade': atual.get('relative_humidity_2m'),
        'pressao': atual.get('surface_pressure'),
        'horario': atual.get('time'),
        'fonte': 'Open-Meteo',
    }
