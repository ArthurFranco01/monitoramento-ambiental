# Modelagem do banco de dados

## Tabela principal: `registros`

| Campo | Tipo | Descrição | Unidade |
|---|---|---|---|
| id | Integer | Identificador único do registro | - |
| temperature | Float | Temperatura medida | °C |
| pressure | Float | Pressão medida | hPa |
| altitude | Float | Altitude medida | metros |
| humidity | Float | Umidade medida | % (umidade relativa) |
| CO2 | Float | Concentração de CO₂ | ppm |
| particula1 | Float | Primeira medição de partículas | µg/m³ |
| particula2 | Float | Segunda medição de partículas | µg/m³ |
| registro_tempo | DateTime | Data e hora da medição | UTC |

Nomes dos campos preservados exatamente conforme exigido nas diretrizes.

## Chave primária

`id`, inteiro autoincrementado pelo banco.

## Consultas por intervalo de tempo

`registro_tempo` é indexado (`ix_registros_registro_tempo`) para permitir consultas eficientes do tipo:

```sql
SELECT * FROM registros
WHERE registro_tempo BETWEEN :inicio AND :fim
ORDER BY registro_tempo;
```

## Valores ausentes

Todos os campos de sensor (`temperature`, `pressure`, `altitude`, `humidity`, `CO2`, `particula1`, `particula2`) aceitam `NULL`. Se o payload MQTT não trouxer um valor, ele é salvo como `NULL` — nunca como `0` — para não confundir "sem leitura" com "leitura zero". A API e o dashboard devem tratar `NULL` como "sem dado disponível" nesse horário.

Apenas `registro_tempo` é obrigatório: sem timestamp válido, o registro é descartado (ver `mqtt.py`, que já ignora mensagens sem `timestamp` ou com timestamp inválido).

## Registros duplicados

Cada mensagem MQTT recebida gera um novo registro — não há verificação de duplicidade por padrão, pois o mesmo `registro_tempo` pode legitimamente repetir (ex.: reenvio do dispositivo após falha de rede). Se o grupo decidir que duas leituras com o mesmo `registro_tempo` devem contar como uma só, a opção mais simples é adicionar essa verificação na camada de ingestão (`mqtt.py`), consultando se já existe um registro com aquele `registro_tempo` antes de inserir.

## Tabelas adicionais (opcionais, não implementadas ainda)

O documento permite tabelas extras como `dispositivos`, `usuarios`, `alertas`, `limites` e `historico_notificacoes`. Ainda não foram criadas — ficam para quando o grupo definir a lógica de alerta (umidade alta + queda de pressão) e quiser guardar o histórico de quando cada alerta disparou.
