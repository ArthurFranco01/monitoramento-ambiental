var chartTempUmidade = null;
var chartPressao = null;
var chartQualidadeAr = null;

var INTERVALO_POLLING = 30000;
var pollingAtivo = true;
var timerPolling = null;
var timerContador = null;
var segundosDesdeUpdate = 0;

document.addEventListener("DOMContentLoaded", function () {
    carregarUltimaLeitura();
    carregarAlerta();
    carregarGraficos();
    carregarComparativo();
    carregarTabela();
    iniciarPolling();

    document.getElementById("btn-polling").addEventListener("click", togglePolling);
});

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
    fetch("/dados/ultimo")
        .then(function (resp) {
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            return resp.json();
        })
        .then(function (dado) {
            atualizarCard("val-temperature", dado.temperature);
            atualizarCard("val-pressure", dado.pressure);
            atualizarCard("val-humidity", dado.humidity);
            atualizarCard("val-co2", dado.CO2);
            atualizarCard("val-particula1", dado.particula1);
            atualizarCard("val-particula2", dado.particula2);
            atualizarCard("val-altitude", dado.altitude);
            document.getElementById("ultima-leitura-tempo").textContent = formatarHorario(dado.registro_tempo);
        })
        .catch(function () {
            var campos = ["temperature", "pressure", "humidity", "co2", "particula1", "particula2", "altitude"];
            campos.forEach(function (c) {
                document.getElementById("val-" + c).textContent = "Erro";
            });
            document.getElementById("ultima-leitura-tempo").textContent = "Falha ao carregar dados";
        });
}

/* ---- Alerta de chuva ---- */

function carregarAlerta() {
    var card = document.getElementById("alerta-card");
    var icon = document.getElementById("alerta-icon");
    var titulo = document.getElementById("alerta-titulo");
    var lista = document.getElementById("alerta-motivos");

    fetch("/alerta-chuva")
        .then(function (resp) {
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            return resp.json();
        })
        .then(function (dados) {
            card.className = "alerta-card";
            lista.innerHTML = "";

            if (dados.alerta) {
                card.classList.add("alerta-ativo");
                icon.textContent = "⚠";
                titulo.textContent = "Alerta: chuva iminente";
            } else {
                card.classList.add("alerta-ok");
                icon.textContent = "✔";
                titulo.textContent = "Sem indícios de chuva";
            }

            dados.motivo.forEach(function (m) {
                var li = document.createElement("li");
                li.textContent = m;
                lista.appendChild(li);
            });
        })
        .catch(function () {
            card.className = "alerta-card alerta-erro";
            icon.textContent = "❗";
            titulo.textContent = "Erro ao verificar alerta";
            lista.innerHTML = "<li>Não foi possível consultar o status de alerta.</li>";
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
    fetch("/dados?limit=50")
        .then(function (resp) {
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            return resp.json();
        })
        .then(function (registros) {
            registros.reverse();

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
        })
        .catch(function () {
            var containers = document.querySelectorAll(".grafico-container");
            containers.forEach(function (c) {
                c.innerHTML = '<div class="grafico-erro">Erro ao carregar gráficos</div>';
            });
        });
}

function atualizarGraficos() {
    fetch("/dados?limit=50")
        .then(function (resp) {
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            return resp.json();
        })
        .then(function (registros) {
            registros.reverse();

            var labels = registros.map(function (r) {
                return formatarLabelGrafico(r.registro_tempo);
            });

            if (chartTempUmidade) {
                chartTempUmidade.data.labels = labels;
                chartTempUmidade.data.datasets[0].data = registros.map(function (r) { return r.temperature; });
                chartTempUmidade.data.datasets[1].data = registros.map(function (r) { return r.humidity; });
                chartTempUmidade.update();
            }

            if (chartPressao) {
                chartPressao.data.labels = labels;
                chartPressao.data.datasets[0].data = registros.map(function (r) { return r.pressure; });
                chartPressao.update();
            }

            if (chartQualidadeAr) {
                chartQualidadeAr.data.labels = labels;
                chartQualidadeAr.data.datasets[0].data = registros.map(function (r) { return r.CO2; });
                chartQualidadeAr.data.datasets[1].data = registros.map(function (r) { return r.particula1; });
                chartQualidadeAr.data.datasets[2].data = registros.map(function (r) { return r.particula2; });
                chartQualidadeAr.update();
            }
        })
        .catch(function () {
            // Falha silenciosa — mantem dados anteriores, tenta de novo no proximo ciclo
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

function buscarClimaExterno() {
    var url = "https://api.open-meteo.com/v1/forecast?latitude=-23.6150&longitude=-46.5699&current=temperature_2m,relative_humidity_2m,surface_pressure&timezone=auto";
    return fetch(url)
        .then(function (resp) {
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            return resp.json();
        })
        .then(function (dados) {
            var atual = dados.current || {};
            return {
                temperatura: atual.temperature_2m,
                umidade: atual.relative_humidity_2m,
                pressao: atual.surface_pressure,
                horario: atual.time,
                fonte: "Open-Meteo"
            };
        })
        .catch(function () { return null; });
}

function carregarComparativo() {
    var promessaCaixinha = fetch("/dados/ultimo")
        .then(function (resp) {
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            return resp.json();
        })
        .catch(function () { return null; });

    var promessaExterno = buscarClimaExterno();

    Promise.all([promessaCaixinha, promessaExterno]).then(function (resultados) {
        var cx = resultados[0];
        var ext = resultados[1];

        if (cx) {
            document.getElementById("comp-temp-caixinha").textContent = formatarValor(cx.temperature);
            document.getElementById("comp-umid-caixinha").textContent = formatarValor(cx.humidity);
            document.getElementById("comp-press-caixinha").textContent = formatarValor(cx.pressure);
        } else {
            document.getElementById("comp-temp-caixinha").textContent = "Sem dados";
            document.getElementById("comp-umid-caixinha").textContent = "Sem dados";
            document.getElementById("comp-press-caixinha").textContent = "Sem dados";
        }

        if (ext) {
            document.getElementById("comp-temp-externo").textContent = formatarValor(ext.temperatura);
            document.getElementById("comp-umid-externo").textContent = formatarValor(ext.umidade);
            document.getElementById("comp-press-externo").textContent = formatarValor(ext.pressao);

            var fonteTexto = "Fonte: " + (ext.fonte || "Open-Meteo");
            if (ext.horario) {
                fonteTexto += " — " + formatarHorario(ext.horario);
            }
            document.getElementById("comparativo-fonte").textContent = fonteTexto;
        } else {
            document.getElementById("comp-temp-externo").textContent = "Indisponível";
            document.getElementById("comp-umid-externo").textContent = "Indisponível";
            document.getElementById("comp-press-externo").textContent = "Indisponível";
            document.getElementById("comparativo-fonte").textContent = "Fonte externa indisponível";
        }

        var cxTemp = cx ? cx.temperature : null;
        var cxHum = cx ? cx.humidity : null;
        var cxPress = cx ? cx.pressure : null;
        var extTemp = ext ? ext.temperatura : null;
        var extHum = ext ? ext.umidade : null;
        var extPress = ext ? ext.pressao : null;

        calcularDelta(cxTemp, extTemp, document.getElementById("comp-temp-delta"));
        calcularDelta(cxHum, extHum, document.getElementById("comp-umid-delta"));
        calcularDelta(cxPress, extPress, document.getElementById("comp-press-delta"));
    });
}

/* ---- Tabela ---- */

function carregarTabela() {
    var tbody = document.getElementById("tabela-body");

    fetch("/dados?limit=20")
        .then(function (resp) {
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            return resp.json();
        })
        .then(function (registros) {
            tbody.innerHTML = "";

            if (registros.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="msg-carregando">Nenhum registro encontrado.</td></tr>';
                return;
            }

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
        })
        .catch(function () {
            // Falha silenciosa no polling — mantem tabela anterior
        });
}

/* ---- Polling ---- */

function atualizarContador() {
    segundosDesdeUpdate++;
    document.getElementById("status-texto").textContent = "Atualizado há " + segundosDesdeUpdate + "s";
}

function executarPolling() {
    segundosDesdeUpdate = 0;
    document.getElementById("status-texto").textContent = "Atualizado agora";
    carregarUltimaLeitura();
    carregarAlerta();
    atualizarGraficos();
    carregarComparativo();
    carregarTabela();
}

function iniciarPolling() {
    pollingAtivo = true;
    timerPolling = setInterval(executarPolling, INTERVALO_POLLING);
    timerContador = setInterval(atualizarContador, 1000);
}

function pararPolling() {
    pollingAtivo = false;
    if (timerPolling) { clearInterval(timerPolling); timerPolling = null; }
    if (timerContador) { clearInterval(timerContador); timerContador = null; }
    document.getElementById("status-texto").textContent = "Atualização pausada";
}

function togglePolling() {
    var btn = document.getElementById("btn-polling");
    if (pollingAtivo) {
        pararPolling();
        btn.textContent = "▶";
        btn.title = "Retomar atualização";
    } else {
        executarPolling();
        iniciarPolling();
        btn.textContent = "⏸";
        btn.title = "Pausar atualização";
    }
}
