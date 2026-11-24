from flask_sqlalchemy import SQLAlchemy

mybd = SQLAlchemy()


class Registro(mybd.Model):
    """Leitura dos sensores. Unidades e política de dados em docs/modelagem_banco_de_dados.md"""

    __tablename__ = 'mqtt'

    id = mybd.Column(mybd.Integer, primary_key=True, autoincrement=True)
    local = mybd.Column(mybd.String(100), nullable=True)
    temperature = mybd.Column(mybd.Numeric(5, 2), nullable=True)                  # °C
    pressure = mybd.Column(mybd.Numeric(8, 2), nullable=True)                     # Pa
    altitude = mybd.Column(mybd.Numeric(7, 2), nullable=True)                     # metros
    humidity = mybd.Column(mybd.Numeric(5, 2), nullable=True)                     # % (umidade relativa)
    CO2 = mybd.Column('co2', mybd.Numeric(7, 2), nullable=True)                   # ppm
    particula1 = mybd.Column(mybd.Numeric(7, 2), nullable=True)                   # µg/m³
    particula2 = mybd.Column(mybd.Numeric(7, 2), nullable=True)                   # µg/m³
    registro_tempo = mybd.Column(mybd.DateTime, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'local': self.local,
            'temperature': float(self.temperature) if self.temperature is not None else None,
            'pressure': float(self.pressure) if self.pressure is not None else None,
            'altitude': float(self.altitude) if self.altitude is not None else None,
            'humidity': float(self.humidity) if self.humidity is not None else None,
            'CO2': float(self.CO2) if self.CO2 is not None else None,
            'particula1': float(self.particula1) if self.particula1 is not None else None,
            'particula2': float(self.particula2) if self.particula2 is not None else None,
            'registro_tempo': self.registro_tempo.isoformat() if self.registro_tempo else None,
        }
