# ********************* ALERTA DE CHUVA IMINENTE *********************
# Combina queda de pressão + alta de umidade nas leituras recentes da caixinha.
# Usado tanto pela rota /alerta-chuva quanto pelo gatilho automático em mqtt.py.

import os
from datetime import timedelta

from models import mybd, Registro

# Limiares ajustáveis por variável de ambiente, sem mexer no código.
ALERTA_QUEDA_PRESSAO = float(os.environ.get('ALERTA_QUEDA_PRESSAO', '1.0'))         # hPa
ALERTA_ALTA_UMIDADE = float(os.environ.get('ALERTA_ALTA_UMIDADE', '5.0'))           # pontos percentuais
ALERTA_UMIDADE_ABSOLUTA = float(os.environ.get('ALERTA_UMIDADE_ABSOLUTA', '90.0'))  # %


def calcular_alerta_chuva(minutos=15, local=None):
    """Compara a leitura mais antiga e a mais recente dentro da janela de tempo
    (relativa à leitura mais recente da própria caixinha, não ao relógio do
    servidor) e avalia se há indício de chuva iminente."""
    query_max = mybd.session.query(mybd.func.max(Registro.registro_tempo))
    if local:
        query_max = query_max.filter(Registro.local == local)
    referencia = query_max.scalar()

    if referencia is None:
        return {
            'alerta': False,
            'motivo': ['nenhum dado registrado ainda'],
            'janela_minutos': minutos,
            'leituras_consideradas': 0,
        }

    limite = referencia - timedelta(minutes=minutos)
    query = (
        Registro.query
        .filter(Registro.registro_tempo >= limite)
        .filter(Registro.registro_tempo <= referencia)
    )
    if local:
        query = query.filter(Registro.local == local)
    registros = query.order_by(Registro.registro_tempo.asc()).all()

    if len(registros) < 2:
        return {
            'alerta': False,
            'motivo': ['dados insuficientes para calcular tendência'],
            'janela_minutos': minutos,
            'leituras_consideradas': len(registros),
        }

    primeira, ultima = registros[0], registros[-1]

    delta_pressao = (
        float(ultima.pressure) - float(primeira.pressure)
        if ultima.pressure is not None and primeira.pressure is not None else None
    )
    delta_umidade = (
        float(ultima.humidity) - float(primeira.humidity)
        if ultima.humidity is not None and primeira.humidity is not None else None
    )

    pressao_caindo = delta_pressao is not None and delta_pressao <= -ALERTA_QUEDA_PRESSAO
    umidade_subindo = delta_umidade is not None and delta_umidade >= ALERTA_ALTA_UMIDADE
    umidade_ja_alta = ultima.humidity is not None and float(ultima.humidity) >= ALERTA_UMIDADE_ABSOLUTA

    alerta = (pressao_caindo and umidade_subindo) or umidade_ja_alta

    motivo = []
    if pressao_caindo:
        motivo.append(f'pressão caiu {abs(delta_pressao):.2f} hPa em {minutos} min')
    if umidade_subindo:
        motivo.append(f'umidade subiu {delta_umidade:.2f} pontos em {minutos} min')
    if umidade_ja_alta:
        motivo.append(f'umidade atual em {float(ultima.humidity):.1f}% (acima de {ALERTA_UMIDADE_ABSOLUTA}%)')
    if not motivo:
        motivo.append('sem indícios de chuva iminente')

    return {
        'alerta': alerta,
        'motivo': motivo,
        'janela_minutos': minutos,
        'leituras_consideradas': len(registros),
        'pressao_atual': float(ultima.pressure) if ultima.pressure is not None else None,
        'umidade_atual': float(ultima.humidity) if ultima.humidity is not None else None,
        'delta_pressao': delta_pressao,
        'delta_umidade': delta_umidade,
        'ultima_leitura': ultima.registro_tempo.isoformat() if ultima.registro_tempo else None,
    }
