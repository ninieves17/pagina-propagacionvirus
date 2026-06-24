/**
 * SCRIPTS: SIMULADOR DE PROPAGACIÓN DEL VIRUS ILOVEYOU (MODELO SIR)
 * Lógica matemática de simulación (Euler), controladores de UI, gráficos y storytelling.
 */

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const sliderN = document.getElementById('slider-n');
    const sliderBeta = document.getElementById('slider-beta');
    const sliderGamma = document.getElementById('slider-gamma');
    const sliderI0 = document.getElementById('slider-i0');

    const dispN = document.getElementById('disp-n');
    const dispBeta = document.getElementById('disp-beta');
    const dispGamma = document.getElementById('disp-gamma');
    const dispI0 = document.getElementById('disp-i0');

    const btnStart = document.getElementById('btn-start');
    const btnPause = document.getElementById('btn-pause');
    const btnReset = document.getElementById('btn-reset');
    const simSpeedSelect = document.getElementById('sim-speed');

    const statS = document.getElementById('stat-s');
    const statI = document.getElementById('stat-i');
    const statR = document.getElementById('stat-r');
    const statDay = document.getElementById('stat-day');
    const consoleScreen = document.getElementById('console-screen');

    const threatIndicator = document.getElementById('threat-indicator');
    const criticalOverlay = document.getElementById('critical-alert-overlay');
    const alertPct = document.getElementById('alert-pct');
    const btnCloseAlert = document.getElementById('btn-close-alert');
    const btnExportCsv = document.getElementById('btn-export-csv');

    // Simulation parameters
    let N = parseInt(sliderN.value);
    let beta = parseFloat(sliderBeta.value);
    let gamma = parseFloat(sliderGamma.value);
    let I0 = parseInt(sliderI0.value);

    // Simulation states
    let S = N - I0;
    let I = I0;
    let R = 0;
    let currentDay = 0;
    let isPlaying = false;
    let simIntervalId = null;
    let speedMs = parseInt(simSpeedSelect.value);

    // Historical records for graphs and tables
    const historyData = {
        days: [0],
        s: [S],
        i: [I],
        r: [R]
    };

    // Storytelling events checklist
    const loggedEvents = {
        day0: false,
        day1: false,
        day2: false,
        day3: false,
        day4: false,
        day5: false,
        day7: false,
        day12: false,
        criticalPeak: false
    };

    let chartInstance = null;

    // Initialize components
    initTabs();
    initSliders();
    initChart();
    resetSimulation();
    updateClock();
    setInterval(updateClock, 1000);

    /* ==========================================================================
       TAB SWITCHING
       ========================================================================== */
    function initTabs() {
        const tabButtons = document.querySelectorAll('.terminal-tab-btn');
        const panes = document.querySelectorAll('.terminal-pane');

        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetPaneId = btn.getAttribute('data-tab');

                tabButtons.forEach(b => b.classList.remove('active'));
                panes.forEach(p => p.classList.remove('active'));

                btn.classList.add('active');
                document.getElementById(targetPaneId).classList.add('active');

                // Recalculate dimensions & render MathJax equations if switching views
                if (targetPaneId === 'tab-math' && window.MathJax) {
                    window.MathJax.typesetPromise();
                }

                if (targetPaneId === 'tab-simulator' && chartInstance) {
                    chartInstance.resize();
                }
            });
        });
    }

    /* ==========================================================================
       SLIDERS LOGIC
       ========================================================================== */
    function initSliders() {
        sliderN.addEventListener('input', () => {
            N = parseInt(sliderN.value);
            dispN.innerText = N.toLocaleString();
            resetSimulation();
        });

        sliderBeta.addEventListener('input', () => {
            beta = parseFloat(sliderBeta.value);
            dispBeta.innerText = beta.toFixed(2);
        });

        sliderGamma.addEventListener('input', () => {
            gamma = parseFloat(sliderGamma.value);
            dispGamma.innerText = gamma.toFixed(2);
        });

        sliderI0.addEventListener('input', () => {
            I0 = parseInt(sliderI0.value);
            dispI0.innerText = I0;
            resetSimulation();
        });

        simSpeedSelect.addEventListener('change', () => {
            speedMs = parseInt(simSpeedSelect.value);
            if (isPlaying) {
                pauseSimulation();
                startSimulation();
            }
        });
    }

    /* ==========================================================================
       REAL-TIME CHART (CHART.JS)
       ========================================================================== */
    function initChart() {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded. Skipping chart initialization.');
            return;
        }
        const ctx = document.getElementById('sirChart');
        if (!ctx) return;

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: historyData.days,
                datasets: [
                    {
                        label: 'Vulnerables (S)',
                        data: historyData.s,
                        borderColor: '#00ffff',
                        backgroundColor: 'rgba(0, 255, 255, 0.03)',
                        fill: true,
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        tension: 0.2
                    },
                    {
                        label: 'Infectados (I)',
                        data: historyData.i,
                        borderColor: '#ff3333',
                        backgroundColor: 'rgba(255, 51, 51, 0.05)',
                        fill: true,
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        tension: 0.2
                    },
                    {
                        label: 'Parcheados (R)',
                        data: historyData.r,
                        borderColor: '#39FF14',
                        backgroundColor: 'rgba(57, 255, 20, 0.03)',
                        fill: true,
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        tension: 0.2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#39FF14',
                            font: { family: 'Share Tech Mono', size: 12 }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        titleFont: { family: 'Share Tech Mono' },
                        bodyFont: { family: 'Share Tech Mono' }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(0, 255, 102, 0.05)' },
                        ticks: {
                            color: '#39FF14',
                            font: { family: 'Share Tech Mono' }
                        },
                        title: {
                            display: true,
                            text: 'Tiempo Transcurrido (Días)',
                            color: '#39FF14',
                            font: { family: 'Share Tech Mono' }
                        }
                    },
                    y: {
                        grid: { color: 'rgba(0, 255, 102, 0.05)' },
                        ticks: {
                            color: '#39FF14',
                            font: { family: 'Share Tech Mono' },
                            callback: value => value.toLocaleString()
                        },
                        title: {
                            display: true,
                            text: 'Número de Computadoras',
                            color: '#39FF14',
                            font: { family: 'Share Tech Mono' }
                        }
                    }
                }
            }
        });
    }

    /* ==========================================================================
       SIMULATION LOOP & MATHEMATICS (EULER)
       ========================================================================== */
    function startSimulation() {
        if (isPlaying) return;
        isPlaying = true;

        // Toggle buttons states
        btnStart.disabled = true;
        btnPause.disabled = false;
        disableSliders(true);

        simIntervalId = setInterval(runSimulationStep, speedMs);
        logToConsole('[SIMULATION STARTED] Analizando propagación de ILOVEYOU en la red.', 'system');
    }

    function pauseSimulation() {
        if (!isPlaying) return;
        isPlaying = false;

        btnStart.disabled = false;
        btnPause.disabled = true;
        clearInterval(simIntervalId);
        logToConsole('[SIMULATION PAUSED] Proceso suspendido temporalmente.', 'system');
    }

    function resetSimulation() {
        pauseSimulation();
        btnStart.disabled = false;
        btnPause.disabled = true;
        disableSliders(false);

        // Reset variables
        N = parseInt(sliderN.value);
        beta = parseFloat(sliderBeta.value);
        gamma = parseFloat(sliderGamma.value);
        I0 = parseInt(sliderI0.value);

        S = N - I0;
        I = I0;
        R = 0;
        currentDay = 0;

        // Reset charts and logs arrays
        historyData.days.length = 0;
        historyData.s.length = 0;
        historyData.i.length = 0;
        historyData.r.length = 0;

        historyData.days.push(0);
        historyData.s.push(S);
        historyData.i.push(I);
        historyData.r.push(R);

        // Clear storytelling flags
        Object.keys(loggedEvents).forEach(k => loggedEvents[k] = false);

        // UI Updates
        statS.innerText = S.toLocaleString();
        statI.innerText = I.toLocaleString();
        statR.innerText = R.toLocaleString();
        statDay.innerText = currentDay;
        
        // Reset console screen
        consoleScreen.innerHTML = '';
        logToConsole('[SYSTEM INITIALIZED] Esperando orden de ejecución del simulador...', 'system');

        // Reset threat level
        threatIndicator.className = 'threat-indicator';
        threatIndicator.innerText = 'NIVEL DE AMENAZA: BAJO';

        criticalOverlay.classList.remove('triggered');

        // Clear dynamic table
        clearTable();

        // Push initial row
        appendRowToTable(0, S, I, R);

        if (chartInstance) {
            chartInstance.update();
        }
    }

    /**
     * Discrete model execution via Euler's method
     */
    function runSimulationStep() {
        if (I <= 0) {
            // End simulation if there are no infected nodes left
            pauseSimulation();
            logToConsole(`[SIMULACIÓN CONCLUIDA] El brote del virus se ha extinguido en el día ${currentDay}.`, 'system');
            return;
        }

        currentDay++;

        // Euler calculations
        // S_{t+1} = S_t - (beta * S_t * I_t / N) * dt
        // I_{t+1} = I_t + ((beta * S_t * I_t / N) - gamma * I_t) * dt
        // R_{t+1} = R_t + (gamma * I_t) * dt
        const infections = (beta * S * I) / N;
        const recoveries = gamma * I;

        let nextS = S - infections;
        let nextI = I + infections - recoveries;
        let nextR = R + recoveries;

        // Validation 1: Prevent values from going below zero
        nextS = Math.max(0, nextS);
        nextI = Math.max(0, nextI);
        nextR = Math.max(0, nextR);

        // Validation 2: Ensure strict conservation N = S + I + R
        const totalCalculated = nextS + nextI + nextR;
        if (totalCalculated !== N) {
            const difference = N - totalCalculated;
            // Distribute float drift adjusting recovered or infected
            if (nextI > 0) {
                nextI += difference;
            } else {
                nextR += difference;
            }
        }

        // Final cap verification
        S = Math.max(0, parseFloat(nextS.toFixed(3)));
        I = Math.max(0, parseFloat(nextI.toFixed(3)));
        R = Math.max(0, parseFloat(nextR.toFixed(3)));

        // Push values to history
        historyData.days.push(currentDay);
        historyData.s.push(S);
        historyData.i.push(I);
        historyData.r.push(R);

        // Update Stat counters
        statS.innerText = Math.round(S).toLocaleString();
        statI.innerText = Math.round(I).toLocaleString();
        statR.innerText = Math.round(R).toLocaleString();
        statDay.innerText = currentDay;

        // Process Storytelling events
        triggerStorytellingEvents();

        // Update active chart and table row
        if (chartInstance) {
            chartInstance.update();
        }
        appendRowToTable(currentDay, Math.round(S), Math.round(I), Math.round(R));

        // Console checking every 5 days
        if (currentDay % 5 === 0) {
            const sumVal = Math.round(S) + Math.round(I) + Math.round(R);
            console.log(`[VERIFICACIÓN DÍA ${currentDay}] Suma S+I+R = ${sumVal} | N = ${N}`);
        }
    }

    function disableSliders(state) {
        sliderN.disabled = state;
        sliderI0.disabled = state;
    }

    /* ==========================================================================
       STORYTELLING ACTIONS
       ========================================================================== */
    function triggerStorytellingEvents() {
        const infectionPercentage = (I / N) * 100;

        // Day-based milestones
        if (currentDay === 1 && !loggedEvents.day1) {
            loggedEvents.day1 = true;
            logToConsole('DÍA 1 (4 MAY 2000): Onel de Guzman libera el gusano ILOVEYOU desde Manila, Filipinas, propagándose mediante correos SMTP con asunto "ILOVEYOU".', 'incident');
        }
        if (currentDay === 2 && !loggedEvents.day2) {
            loggedEvents.day2 = true;
            logToConsole('DÍA 2 (5 MAY 2000): La infección se expande velozmente hacia Europa y América. Los usuarios abren el adjunto infectando redes locales corporativas de forma masiva.', 'incident');
        }
        if (currentDay === 3 && !loggedEvents.day3) {
            loggedEvents.day3 = true;
            logToConsole('DÍA 3 (6 MAY 2000): Servidores gubernamentales y agencias de inteligencia de EE. UU. (Pentágono, CIA) y el Parlamento del Reino Unido apagan temporalmente su email.', 'incident');
        }
        if (currentDay === 5 && !loggedEvents.day5) {
            loggedEvents.day5 = true;
            logToConsole('DÍA 5 (8 MAY 2000): Firmas de ciberseguridad descubren el script .vbs e inician la distribución de parches defensivos y reglas de filtrado de adjuntos.', 'incident');
        }
        if (currentDay === 7 && !loggedEvents.day7) {
            loggedEvents.day7 = true;
            logToConsole('DÍA 7 (10 MAY 2000): La tasa de recuperación aumenta a nivel empresarial. Se implementa limpieza automática y filtros perimetrales en los servidores exchange.', 'incident');
        }
        if (currentDay === 12 && !loggedEvents.day12) {
            loggedEvents.day12 = true;
            logToConsole('DÍA 12 (15 MAY 2000): El brote entra en remisión. Las máquinas susceptibles disminuyen drásticamente, consolidando la inmunidad de red mediante parches.', 'incident');
        }

        // Active Infection Percentage Critical threshold Trigger (Storytelling peak)
        if (infectionPercentage >= 35 && !loggedEvents.criticalPeak) {
            loggedEvents.criticalPeak = true;
            
            // Visual emergency alerts
            threatIndicator.className = 'threat-indicator threat-critical';
            threatIndicator.innerText = 'NIVEL DE AMENAZA: CRÍTICO (COMPROMETIDO)';
            
            // Log to terminal bitacora in red
            logToConsole(`⚠️ [ALERTA CRÍTICA] TASA DE INFECCIÓN ACTIVA SUPERÓ EL 35% (${infectionPercentage.toFixed(1)}%). SISTEMAS COMPROMETIDOS GLOBALMENTE.`, 'alert');
            
            // Trigger emergency popups
            alertPct.innerText = infectionPercentage.toFixed(1) + '%';
            criticalOverlay.classList.add('triggered');
        }
    }

    function logToConsole(message, type = 'system') {
        const line = document.createElement('p');
        line.className = `console-line line-${type}`;
        line.innerText = `[t=${currentDay}d] ${message}`;
        
        consoleScreen.appendChild(line);
        // Scroll screen
        consoleScreen.scrollTop = consoleScreen.scrollHeight;
    }

    /* ==========================================================================
       DYNAMIC DATA TABLE
       ========================================================================== */
    function clearTable() {
        const tbody = document.querySelector('#simulation-table tbody');
        if (tbody) tbody.innerHTML = '';
    }

    function appendRowToTable(day, sVal, iVal, rVal) {
        const tbody = document.querySelector('#simulation-table tbody');
        if (!tbody) return;

        // If day 0, remove placeholder row if present
        if (day === 0) {
            tbody.innerHTML = '';
        }

        const total = sVal + iVal + rVal;
        const rate = ((iVal / N) * 100).toFixed(1) + '%';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>Día ${day}</td>
            <td class="text-cyan">${sVal.toLocaleString()}</td>
            <td class="text-red">${iVal.toLocaleString()}</td>
            <td class="text-green">${rVal.toLocaleString()}</td>
            <td>${total.toLocaleString()}</td>
            <td class="text-yellow">${rate}</td>
        `;
        tbody.appendChild(row);
    }

    /* ==========================================================================
       EXPORT TO CSV FUNCTIONALITY
       ========================================================================== */
    btnExportCsv.addEventListener('click', () => {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Dia,Susceptibles(S),Infectados(I),Recuperados(R),Total(S+I+R),TasaInfeccion\n";

        const totalSteps = historyData.days.length;
        for (let idx = 0; idx < totalSteps; idx++) {
            const d = historyData.days[idx];
            const sVal = Math.round(historyData.s[idx]);
            const iVal = Math.round(historyData.i[idx]);
            const rVal = Math.round(historyData.r[idx]);
            const sumVal = sVal + iVal + rVal;
            const infRate = ((iVal / N) * 100).toFixed(2);
            
            csvContent += `${d},${sVal},${iVal},${rVal},${sumVal},${infRate}%\n`;
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `SIR_ILOVEYOU_simulation_N${N}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    /* ==========================================================================
       BUTTON EVENT LISTENERS
       ========================================================================== */
    btnStart.addEventListener('click', startSimulation);
    btnPause.addEventListener('click', pauseSimulation);
    btnReset.addEventListener('click', resetSimulation);
    
    btnCloseAlert.addEventListener('click', () => {
        criticalOverlay.classList.remove('triggered');
        logToConsole('[OVERLAY DIMISSED] Alarma de red desactivada por el operador, analizando mitigación...', 'system');
    });

    /* ==========================================================================
       UTILITIES (CLOCK)
       ========================================================================== */
    function updateClock() {
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        const secs = String(now.getSeconds()).padStart(2, '0');
        document.getElementById('terminal-clock').innerText = `${hrs}:${mins}:${secs} UTC`;
    }
});
