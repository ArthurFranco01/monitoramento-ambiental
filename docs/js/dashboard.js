/* ============================================================
   Dashboard Monitoramento Ambiental — versao estatica (demo)
   Dados simulados embutidos para GitHub Pages.
   ============================================================ */

var chartTempUmidade = null;
var chartPressao = null;
var chartQualidadeAr = null;

/* ---- Geracao de dados simulados ---- */

function gerarDadosSimulados() {
    var registros = [];
    var agora = new Date();
    var temp = 24.0;
    var pressao = 1013.0;
    var umidade = 60.0;
    var co2 = 420.0;
    var p1 = 12.0;
    var p2 = 10.0;
    var TOTAL = 30;

    for (var i = 0; i < TOTAL; i++) {
        var tempo = new Date(agora.getTime() - (TOTAL - 1 - i) * 4 * 60 * 1000);
        var progresso = i / TOTAL;

        temp += (Math.random() - 0.5) * 0.6 - 0.05 * progresso;
        pressao += (Math.random() - 0.5) * 0.4 - 0.15;
        umidade += (Math.random() - 0.5) * 1.0 + 0.3;
        co2 += (Math.random() - 0.5) * 10;
        p1 += (Math.random() - 0.5) * 1.0;
        p2 += (Math.random() - 0.5) * 0.8;

        umidade = Math.max(30, Math.min(99, umidade));
        co2 = Math.max(350, Math.min(800, co2));
        p1 = Math.max(5, Math.min(50, p1));
        p2 = Math.max(3, Math.min(40, p2));

        registros.push({
            id: i + 1,
            temperature: Math.round(temp * 100) / 100,
            pressure: Math.round(pressao * 100) / 100,
            altitude: 760.0,
            humidity: Math.round(umidade * 100) / 100,
            CO2: Math.round(co2 * 100) / 100,
            particula1: Math.round(p1 * 100) / 100,
            particula2: Math.round(p2 * 100) / 100,
            registro_tempo: tempo.toISOString()
        });
    }

    return registros;
}

var DADOS_SIMULADOS = gerarDadosSimulados();

/* ---- Formatacao ---- */

function formatarValor(valor) {
    if (valor === null || valor === undefined) return "--";
    return Number(valor).toFixed(2);
}

function formatarHorario(iso) {
    if (!iso) return "--";
    var d = new Date(iso);
    var dia = String(d.getDate()).padStart(2, "0");
    var mes = String(d.getMonth() + 1).padStart(2, "0");
    var ano = d.getFullYear();
    var hora = String(d.getHours()).padStart(2, "0");
    var min = String(d.getMinutes()).padStart(2, "0");
    var seg = String(d.getSeconds()).padStart(2, "0");
    return dia + "/" + mes + "/" + ano + " " + hora + ":" + min + ":" + seg;
}

function formatarLabelGrafico(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    var dia = String(d.getDate()).padStart(2, "0");
    var mes = String(d.getMonth() + 1).padStart(2, "0");
    var hora = String(d.getHours()).padStart(2, "0");
    var min = String(d.getMinutes()).padStart(2, "0");
    return dia + "/" + mes + " " + hora + ":" + min;
}

/* ---- Flash de mudanca nos cards ---- */

function atualizarCard(elementId, novoValor) {
    var el = document.getElementById(elementId);
    var valorFormatado = formatarValor(novoValor);
    if (el.textContent !== valorFormatado) {
        el.textContent = valorFormatado;
        var card = el.closest(".card");
        if (card) {
            card.classList.remove("card-flash");
            void card.offsetWidth;
            card.classList.add("card-flash");
            card.addEventListener("animationend", function handler() {
                card.classList.remove("card-flash");
                card.removeEventListener("animationend", handler);
            });
        }
    }
}

/* ---- Cards de indicadores ---- */

function carregarUltimaLeitura() {
    var dado = DADOS_SIMULADOS[DADOS_SIMULADOS.length - 1];
    atualizarCard("val-temperature", dado.temperature);
    atualizarCard("val-pressure", dado.pressure);
    atualizarCard("val-humidity", dado.humidity);
    atualizarCard("val-co2", dado.CO2);
    atualizarCard("val-particula1", dado.particula1);
    atualizarCard("val-particula2", dado.particula2);
    atualizarCard("val-altitude", dado.altitude);
    document.getElementById("ultima-leitura-tempo").textContent = formatarHorario(dado.registro_tempo);
}

/* ---- Alerta de chuva ---- */

function carregarAlerta() {
    var card = document.getElementById("alerta-card");
    var icon = document.getElementById("alerta-icon");
    var titulo = document.getElementById("alerta-titulo");
    var lista = document.getElementById("alerta-motivos");

    var ultimo = DADOS_SIMULADOS[DADOS_SIMULADOS.length - 1];
    var primeiro = DADOS_SIMULADOS[0];
    var quedaPressao = primeiro.pressure - ultimo.pressure;
    var subiuUmidade = ultimo.humidity - primeiro.humidity;
    var alerta = quedaPressao > 2 && subiuUmidade > 5;

    card.className = "alerta-card";
    lista.innerHTML = "";

    if (alerta) {
        card.classList.add("alerta-ativo");
        icon.textContent = "⚠";
        titulo.textContent = "Alerta: chuva iminente";
    } else {
        card.classList.add("alerta-ok");
        icon.textContent = "✔";
        titulo.textContent = "Sem indícios de chuva";
    }

    var motivos = [
        "Variação de pressão: " + quedaPressao.toFixed(2) + " hPa (limiar: 2.0)",
        "Variação de umidade: +" + subiuUmidade.toFixed(2) + "% (limiar: 5.0)"
    ];

    motivos.forEach(function (m) {
        var li = document.createElement("li");
        li.textContent = m;
        lista.appendChild(li);
    });
}

/* ---- Graficos ---- */

function opcoesBase(tituloY, temEixoDireito, tituloYDireito) {
    var scales = {
        x: {
            ticks: { color: "#80cbc4", maxRotation: 45 },
            grid: { color: "rgba(0,230,118,0.06)" }
        },
        y: {
            position: "left",
            title: { display: true, text: tituloY, color: "#80cbc4" },
            ticks: { color: "#80cbc4" },
            grid: { color: "rgba(0,230,118,0.06)" }
        }
    };

    if (temEixoDireito) {
        scales.y1 = {
            position: "right",
            title: { display: true, text: tituloYDireito, color: "#80cbc4" },
            ticks: { color: "#80cbc4" },
            grid: { drawOnChartArea: false }
        };
    }

    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: "#e0f2f1" } }
        },
        scales: scales
    };
}

function carregarGraficos() {
    var registros = DADOS_SIMULADOS;

    var labels = registros.map(function (r) {
        return formatarLabelGrafico(r.registro_tempo);
    });

    chartTempUmidade = new Chart(document.getElementById("grafico-temp-umidade"), {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Temperatura (°C)",
                    data: registros.map(function (r) { return r.temperature; }),
                    borderColor: "#ff5252",
                    backgroundColor: "rgba(255,82,82,0.1)",
                    tension: 0.3,
                    pointRadius: 2,
                    yAxisID: "y"
                },
                {
                    label: "Umidade (%)",
                    data: registros.map(function (r) { return r.humidity; }),
                    borderColor: "#00e676",
                    backgroundColor: "rgba(0,230,118,0.1)",
                    tension: 0.3,
                    pointRadius: 2,
                    yAxisID: "y1"
                }
            ]
        },
        options: opcoesBase("°C", true, "%")
    });

    chartPressao = new Chart(document.getElementById("grafico-pressao"), {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Pressão (hPa)",
                    data: registros.map(function (r) { return r.pressure; }),
                    borderColor: "#00bcd4",
                    backgroundColor: "rgba(0,188,212,0.1)",
                    tension: 0.3,
                    pointRadius: 2
                }
            ]
        },
        options: opcoesBase("hPa", false)
    });

    chartQualidadeAr = new Chart(document.getElementById("grafico-qualidade-ar"), {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "CO₂ (ppm)",
                    data: registros.map(function (r) { return r.CO2; }),
                    borderColor: "#ffab40",
                    backgroundColor: "rgba(255,171,64,0.1)",
                    tension: 0.3,
                    pointRadius: 2,
                    yAxisID: "y"
                },
                {
                    label: "Partícula 1 (µg/m³)",
                    data: registros.map(function (r) { return r.particula1; }),
                    borderColor: "#e040fb",
                    backgroundColor: "rgba(224,64,251,0.1)",
                    tension: 0.3,
                    pointRadius: 2,
                    yAxisID: "y1"
                },
                {
                    label: "Partícula 2 (µg/m³)",
                    data: registros.map(function (r) { return r.particula2; }),
                    borderColor: "#40c4ff",
                    backgroundColor: "rgba(64,196,255,0.1)",
                    tension: 0.3,
                    pointRadius: 2,
                    yAxisID: "y1"
                }
            ]
        },
        options: opcoesBase("ppm", true, "µg/m³")
    });
}

/* ---- Comparativo ---- */

function calcularDelta(valorCaixinha, valorExterno, deltaEl) {
    if (valorCaixinha === null || valorCaixinha === undefined ||
        valorExterno === null || valorExterno === undefined) {
        deltaEl.textContent = "--";
        deltaEl.className = "comparativo-delta delta-indisponivel";
        return;
    }

    var diff = Number(valorCaixinha) - Number(valorExterno);
    var abs = Math.abs(diff).toFixed(2);

    if (Math.abs(diff) < 0.1) {
        deltaEl.textContent = "= igual";
        deltaEl.className = "comparativo-delta delta-igual";
    } else if (diff > 0) {
        deltaEl.textContent = "↑ " + abs + " acima";
        deltaEl.className = "comparativo-delta delta-acima";
    } else {
        deltaEl.textContent = "↓ " + abs + " abaixo";
        deltaEl.className = "comparativo-delta delta-abaixo";
    }
}

function carregarComparativo() {
    var ultimo = DADOS_SIMULADOS[DADOS_SIMULADOS.length - 1];

    var externo = {
        temperatura: ultimo.temperature + (Math.random() - 0.5) * 3,
        umidade: ultimo.humidity - (Math.random() * 8 + 2),
        pressao: ultimo.pressure + (Math.random() - 0.5) * 1.5,
        fonte: "Open-Meteo"
    };

    document.getElementById("comp-temp-caixinha").textContent = formatarValor(ultimo.temperature);
    document.getElementById("comp-umid-caixinha").textContent = formatarValor(ultimo.humidity);
    document.getElementById("comp-press-caixinha").textContent = formatarValor(ultimo.pressure);

    document.getElementById("comp-temp-externo").textContent = formatarValor(externo.temperatura);
    document.getElementById("comp-umid-externo").textContent = formatarValor(externo.umidade);
    document.getElementById("comp-press-externo").textContent = formatarValor(externo.pressao);

    document.getElementById("comparativo-fonte").textContent = "Fonte: " + externo.fonte + " — " + formatarHorario(new Date().toISOString());

    calcularDelta(ultimo.temperature, externo.temperatura, document.getElementById("comp-temp-delta"));
    calcularDelta(ultimo.humidity, externo.umidade, document.getElementById("comp-umid-delta"));
    calcularDelta(ultimo.pressure, externo.pressao, document.getElementById("comp-press-delta"));
}

/* ---- Tabela ---- */

function carregarTabela() {
    var tbody = document.getElementById("tabela-body");
    var registros = DADOS_SIMULADOS.slice().reverse().slice(0, 20);
    tbody.innerHTML = "";

    registros.forEach(function (r) {
        var tr = document.createElement("tr");
        tr.innerHTML =
            "<td>" + formatarHorario(r.registro_tempo) + "</td>" +
            "<td>" + formatarValor(r.temperature) + "</td>" +
            "<td>" + formatarValor(r.pressure) + "</td>" +
            "<td>" + formatarValor(r.altitude) + "</td>" +
            "<td>" + formatarValor(r.humidity) + "</td>" +
            "<td>" + formatarValor(r.CO2) + "</td>" +
            "<td>" + formatarValor(r.particula1) + "</td>" +
            "<td>" + formatarValor(r.particula2) + "</td>";
        tbody.appendChild(tr);
    });
}

/* ---- Simulacao de novo dado (botao play) ---- */

function simularNovoRegistro() {
    var ultimo = DADOS_SIMULADOS[DADOS_SIMULADOS.length - 1];
    var agora = new Date();

    var novo = {
        id: ultimo.id + 1,
        temperature: Math.round((ultimo.temperature + (Math.random() - 0.5) * 0.4) * 100) / 100,
        pressure: Math.round((ultimo.pressure + (Math.random() - 0.5) * 0.3 - 0.05) * 100) / 100,
        altitude: 760.0,
        humidity: Math.max(30, Math.min(99, Math.round((ultimo.humidity + (Math.random() - 0.5) * 0.8 + 0.1) * 100) / 100)),
        CO2: Math.max(350, Math.min(800, Math.round((ultimo.CO2 + (Math.random() - 0.5) * 6) * 100) / 100)),
        particula1: Math.max(5, Math.min(50, Math.round((ultimo.particula1 + (Math.random() - 0.5) * 0.6) * 100) / 100)),
        particula2: Math.max(3, Math.min(40, Math.round((ultimo.particula2 + (Math.random() - 0.5) * 0.4) * 100) / 100)),
        registro_tempo: agora.toISOString()
    };

    DADOS_SIMULADOS.push(novo);
    if (DADOS_SIMULADOS.length > 50) DADOS_SIMULADOS.shift();

    carregarUltimaLeitura();
    carregarAlerta();
    carregarComparativo();
    carregarTabela();

    if (chartTempUmidade) {
        var labels = DADOS_SIMULADOS.map(function (r) { return formatarLabelGrafico(r.registro_tempo); });
        chartTempUmidade.data.labels = labels;
        chartTempUmidade.data.datasets[0].data = DADOS_SIMULADOS.map(function (r) { return r.temperature; });
        chartTempUmidade.data.datasets[1].data = DADOS_SIMULADOS.map(function (r) { return r.humidity; });
        chartTempUmidade.update();
    }

    if (chartPressao) {
        chartPressao.data.labels = DADOS_SIMULADOS.map(function (r) { return formatarLabelGrafico(r.registro_tempo); });
        chartPressao.data.datasets[0].data = DADOS_SIMULADOS.map(function (r) { return r.pressure; });
        chartPressao.update();
    }

    if (chartQualidadeAr) {
        chartQualidadeAr.data.labels = DADOS_SIMULADOS.map(function (r) { return formatarLabelGrafico(r.registro_tempo); });
        chartQualidadeAr.data.datasets[0].data = DADOS_SIMULADOS.map(function (r) { return r.CO2; });
        chartQualidadeAr.data.datasets[1].data = DADOS_SIMULADOS.map(function (r) { return r.particula1; });
        chartQualidadeAr.data.datasets[2].data = DADOS_SIMULADOS.map(function (r) { return r.particula2; });
        chartQualidadeAr.update();
    }

    document.getElementById("status-texto").textContent = "Simulado agora — " + formatarHorario(agora.toISOString());
}

/* ---- Inicializacao ---- */

document.addEventListener("DOMContentLoaded", function () {
    carregarUltimaLeitura();
    carregarAlerta();
    carregarGraficos();
    carregarComparativo();
    carregarTabela();

    document.getElementById("btn-polling").addEventListener("click", simularNovoRegistro);
});
