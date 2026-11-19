DROP DATABASE IF EXISTS monitoramento;
CREATE DATABASE monitoramento;
USE monitoramento;

-- Nomes de campos preservados exatamente conforme exigido nas diretrizes.
CREATE TABLE mqtt (
    id             INT PRIMARY KEY AUTO_INCREMENT,
    temperature    DECIMAL(5,2),           -- °C
    pressure       DECIMAL(7,2),           -- hPa
    altitude       DECIMAL(7,2),           -- metros
    humidity       DECIMAL(5,2),           -- % (umidade relativa)
    co2            DECIMAL(7,2),           -- ppm
    particula1     DECIMAL(7,2),           -- µg/m³
    particula2     DECIMAL(7,2),           -- µg/m³
    registro_tempo TIMESTAMP NOT NULL UNIQUE
);

-- ********************* EXEMPLOS DE REGISTROS *********************

INSERT INTO mqtt (temperature, pressure, altitude, humidity, co2, particula1, particula2, registro_tempo) VALUES
(24.60, 1013.25, 760.00, 58.30, 520.00, 12.50, 18.20, '2026-11-16 14:30:00'),
(23.90, 1009.80, 760.00, 91.50, 415.00, 14.10, 10.20, '2026-11-16 15:30:00'),
(21.40, 1005.10, 760.00, 95.00, 420.00, 18.70, 13.40, '2026-11-16 16:30:00');

-- ********************* EXEMPLOS DE CONSULTAS *********************

SELECT * FROM mqtt;

-- Leitura mais recente
SELECT * FROM mqtt
ORDER BY registro_tempo DESC
LIMIT 1;

-- Consulta por intervalo de tempo (usada pela API/dashboard)
SELECT * FROM mqtt
WHERE registro_tempo BETWEEN '2026-11-16 00:00:00' AND '2026-11-16 23:59:59'
ORDER BY registro_tempo;

-- Possíveis condições de alerta (umidade alta, indicando chuva se aproximando)
SELECT * FROM mqtt
WHERE humidity >= 90.0
ORDER BY registro_tempo DESC;
