import os

from flask import Flask, jsonify, render_template, request

from models import mybd, Registro
from mqtt import start_mqtt
from clima import buscar_clima_externo
from alerta import calcular_alerta_chuva

app = Flask(__name__)

# Credenciais lidas de variáveis de ambiente (nunca fixas no código-fonte).
# O banco e a tabela já devem existir (rode schema.sql antes de iniciar a aplicação).
DB_USER = os.environ.get('DB_USER', 'root')
DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PORT = os.environ.get('DB_PORT', '3306')
DB_NAME = os.environ.get('DB_NAME', 'monitoramento')

DATABASE_URL = os.environ.get(
    'DATABASE_URL',
    f'mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
)
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql+psycopg2://', 1)
elif DATABASE_URL.startswith('postgresql://'):
    DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+psycopg2://', 1)
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

mybd.init_app(app)

with app.app_context():
    mybd.create_all()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/dados')
def dados():
    """Últimos registros gravados pela caixinha. Use ?limit=N (padrão 50, máx 500)."""
    try:
        limit = min(int(request.args.get('limit', 50)), 500)
    except ValueError:
        limit = 50

    registros = (
        Registro.query.order_by(Registro.registro_tempo.desc()).limit(limit).all()
    )
    return jsonify([r.to_dict() for r in registros])


@app.route('/dados/ultimo')
def ultimo_dado():
    """Leitura mais recente da caixinha (para conferir se a ingestão MQTT está funcionando)."""
    registro = Registro.query.order_by(Registro.registro_tempo.desc()).first()
    if registro is None:
        return jsonify({'erro': 'nenhum registro encontrado'}), 404
    return jsonify(registro.to_dict())


@app.route('/clima')
def clima():
    """Clima atual via API externa (Open-Meteo), para comparar com a caixinha."""
    dados_clima = buscar_clima_externo()
    if dados_clima is None:
        return jsonify({'erro': 'não foi possível obter dados da API externa'}), 502
    return jsonify(dados_clima)


@app.route('/comparativo')
def comparativo():
    """Última leitura da caixinha lado a lado com o clima externo (Open-Meteo)."""
    registro = Registro.query.order_by(Registro.registro_tempo.desc()).first()
    return jsonify({
        'caixinha': registro.to_dict() if registro else None,
        'externo': buscar_clima_externo(),
    })


@app.route('/alerta-chuva')
def alerta_chuva():
    """Chuva iminente: compara a leitura mais antiga e a mais recente dentro da janela
    de tempo (?minutos=, padrão 15) e combina queda de pressão + alta de umidade."""
    try:
        minutos = int(request.args.get('minutos', 15))
    except ValueError:
        minutos = 15

    return jsonify(calcular_alerta_chuva(minutos))


@app.route('/seed-demo')
def seed_demo():
    """Popula o banco com 30 registros simulados para demonstração."""
    from datetime import datetime, timedelta, timezone
    from random import gauss

    existente = Registro.query.first()
    if existente:
        return jsonify({'msg': 'Banco já possui dados', 'total': Registro.query.count()})

    agora = datetime.now(timezone.utc)
    temp, pressao, umidade, co2, p1, p2 = 24.0, 1013.0, 60.0, 420.0, 12.0, 10.0

    for i in range(30):
        tempo = agora - timedelta(minutes=4 * (29 - i))
        progresso = i / 30
        temp += gauss(0, 0.3) - 0.05 * progresso
        pressao += gauss(0, 0.2) - 0.15
        umidade += gauss(0, 0.5) + 0.3
        co2 += gauss(0, 5)
        p1 += gauss(0, 0.5)
        p2 += gauss(0, 0.4)
        umidade = max(30, min(99, umidade))
        co2 = max(350, min(800, co2))
        p1 = max(5, min(50, p1))
        p2 = max(3, min(40, p2))

        mybd.session.add(Registro(
            temperature=round(temp, 2), pressure=round(pressao, 2),
            altitude=760.0, humidity=round(umidade, 2),
            CO2=round(co2, 2), particula1=round(p1, 2),
            particula2=round(p2, 2), registro_tempo=tempo,
        ))

    mybd.session.commit()
    return jsonify({'msg': 'Dados de demonstração inseridos', 'total': 30})


if __name__ == '__main__':
    start_mqtt(app)

    port = int(os.environ.get("PORT", 8080))  # Azure define a porta automaticamente
    app.run(host='0.0.0.0', port=port)  # Ouvir em todas as interfaces e usar a porta fornecida pela Azure
