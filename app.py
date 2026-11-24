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


if __name__ == '__main__':
    with app.app_context():
        mybd.create_all()

    start_mqtt(app)

    port = int(os.environ.get("PORT", 8080))  # Azure define a porta automaticamente
    app.run(host='0.0.0.0', port=port)  # Ouvir em todas as interfaces e usar a porta fornecida pela Azure
