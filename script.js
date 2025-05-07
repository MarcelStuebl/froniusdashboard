// Globale Variablen
let pvData = null;
let powerChart = null;

// DOM-Elemente
const elements = {
    currentDate: document.getElementById('current-date'),
    currentTime: document.getElementById('current-time'),
    jsonTimestamp: document.getElementById('json-timestamp'),
    pvPower: document.getElementById('pv-power'),
    batteryPower: document.getElementById('battery-power'),
    gridPower: document.getElementById('grid-power'),
    loadPower: document.getElementById('load-power'),
    batteryLevel: document.getElementById('battery-level'),
    batteryPercentage: document.getElementById('battery-percentage'),
    batteryMode: document.getElementById('battery-mode'),
    eDay: document.getElementById('e-day'),
    eYear: document.getElementById('e-year'),
    eTotal: document.getElementById('e-total'),
    autonomy: document.getElementById('autonomy'),
    operationMode: document.getElementById('operation-mode'),
    backupMode: document.getElementById('backup-mode'),
    batteryStandby: document.getElementById('battery-standby'),
    selfConsumption: document.getElementById('self-consumption'),
    lastUpdate: document.getElementById('last-update'),
    // Flow-Animationen
    pvFlowAnimation: document.getElementById('pv-flow-animation'),
    gridFlowAnimation: document.getElementById('grid-flow-animation'),
    batteryFlowAnimation: document.getElementById('battery-flow-animation'),
    loadFlowAnimation: document.getElementById('load-flow-animation')
};

// Initialisiere das Dashboard
function initDashboard() {
    updateDateTime();
    loadData();
    initPowerChart();

    // Regelmäßige Updates
    setInterval(updateDateTime, 1000); // Jede Sekunde
    setInterval(loadData, 30 * 60 * 1000); // Alle 30 Minuten (statt 10 Sekunden)
}

// Aktualisiere moderne Uhrzeit und Datum
function updateDateTime() {
    const now = new Date();

    // Formatiere Datum: DD.MM.YYYY
    const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
    elements.currentDate.textContent = now.toLocaleDateString('de-DE', dateOptions);

    // Formatiere Uhrzeit: HH:MM:SS Uhr (modernes Format)
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    elements.currentTime.textContent = `${hours}:${minutes}:${seconds} Uhr`;
}

// Lade Daten von der API
async function loadData() {
    try {
        // In einer realen Anwendung würde hier ein API-Aufruf stehen
        // Für das Beispiel nutzen wir die statischen Daten aus data.json
        const response = await fetch('data.json');
        pvData = await response.json();

        updateDashboard();
    } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
    }
}

// Aktualisiere das Dashboard mit den neuen Daten
function updateDashboard() {
    if (!pvData) return;

    const siteData = pvData.Body.Data.Site;
    const inverterData = pvData.Body.Data.Inverters["1"];
    const timestamp = pvData.Head.Timestamp;

    // JSON Timestamp im Header anzeigen
    const jsonDate = new Date(timestamp);
    const jsonTimeOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    elements.jsonTimestamp.textContent = `Daten von: ${jsonDate.toLocaleString('de-DE', jsonTimeOptions)}`;

    // Leistungswerte aktualisieren (absolute Werte anzeigen)
    elements.pvPower.textContent = Math.abs(siteData.P_PV).toFixed(0);
    elements.batteryPower.textContent = Math.abs(siteData.P_Akku).toFixed(0);
    elements.gridPower.textContent = Math.abs(siteData.P_Grid).toFixed(0);
    elements.loadPower.textContent = Math.abs(siteData.P_Load).toFixed(0);

    // Batteriestatus
    const batteryPercentage = inverterData.SOC;
    elements.batteryPercentage.textContent = batteryPercentage;
    elements.batteryLevel.style.height = `${batteryPercentage}%`;
    elements.batteryMode.textContent = translateBatteryMode(inverterData.Battery_Mode);

    // Farbliche Anpassung des Batteriestands
    if (batteryPercentage < 20) {
        elements.batteryLevel.style.background = 'linear-gradient(to top, #f44336, #ff5722)';
    } else if (batteryPercentage < 50) {
        elements.batteryLevel.style.background = 'linear-gradient(to top, #ff5722, #ff9800)';
    } else {
        elements.batteryLevel.style.background = 'linear-gradient(to top, #4caf50, #8bc34a)';
    }

    // Statistiken
    elements.eDay.textContent = siteData.E_Day;
    elements.eYear.textContent = (siteData.E_Year / 1000).toFixed(2);
    elements.eTotal.textContent = (siteData.E_Total / 1000000).toFixed(2);
    elements.autonomy.textContent = siteData.rel_Autonomy.toFixed(1);

    // Anlagenstatus
    elements.operationMode.textContent = translateOperationMode(siteData.Mode);
    elements.backupMode.textContent = siteData.BackupMode ? 'Ein' : 'Aus';
    elements.batteryStandby.textContent = siteData.BatteryStandby ? 'Ein' : 'Aus';
    elements.selfConsumption.textContent = `${siteData.rel_SelfConsumption.toFixed(1)}%`;

    // Letzte Aktualisierung
    const lastUpdateDate = new Date(timestamp);
    elements.lastUpdate.textContent = lastUpdateDate.toLocaleString('de-DE');

    // Energiefluss-Animation aktualisieren
    updateFlowAnimations(siteData);

    // Chart aktualisieren
    updatePowerChart(siteData);
}

// Initialisiere das Leistungsverteilungs-Diagramm
function initPowerChart() {
    const ctx = document.getElementById('power-chart').getContext('2d');

    powerChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['PV', 'Batterie', 'Netz', 'Verbrauch'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: [
                    'rgba(255, 193, 7, 0.8)',  // PV (Gelb)
                    'rgba(255, 152, 0, 0.8)',  // Batterie (Orange)
                    'rgba(76, 175, 80, 0.8)',  // Netz (Grün)
                    'rgba(244, 67, 54, 0.8)'   // Verbrauch (Rot)
                ],
                borderColor: [
                    'rgba(255, 193, 7, 1)',
                    'rgba(255, 152, 0, 1)',
                    'rgba(76, 175, 80, 1)',
                    'rgba(244, 67, 54, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${Math.abs(context.raw)} W`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return `${value} W`;
                        }
                    }
                }
            }
        }
    });
}

// Aktualisiere das Leistungsverteilungs-Diagramm
function updatePowerChart(siteData) {
    if (!powerChart) return;

    powerChart.data.datasets[0].data = [
        Math.abs(siteData.P_PV),
        Math.abs(siteData.P_Akku),
        Math.abs(siteData.P_Grid),
        Math.abs(siteData.P_Load)
    ];

    powerChart.update();
}

// Aktualisiere die Energiefluss-Animationen
function updateFlowAnimations(siteData) {
    // PV-Fluss (immer positiv vom PV zum System)
    if (siteData.P_PV > 0) {
        elements.pvFlowAnimation.style.display = 'block';
        elements.pvFlowAnimation.style.animationDirection = 'normal';
    } else {
        elements.pvFlowAnimation.style.display = 'none';
    }

    // Netz-Fluss (positiv = Einspeisung, negativ = Bezug)
    if (siteData.P_Grid !== 0) {
        elements.gridFlowAnimation.style.display = 'block';
        elements.gridFlowAnimation.style.animationDirection = siteData.P_Grid > 0 ? 'normal' : 'reverse';
    } else {
        elements.gridFlowAnimation.style.display = 'none';
    }

    // Batterie-Fluss (positiv = Entladen, negativ = Laden)
    if (siteData.P_Akku !== 0) {
        elements.batteryFlowAnimation.style.display = 'block';
        elements.batteryFlowAnimation.style.animationDirection = siteData.P_Akku > 0 ? 'normal' : 'reverse';
    } else {
        elements.batteryFlowAnimation.style.display = 'none';
    }

    // Verbrauchs-Fluss (immer negativ, vom System zum Verbrauch)
    if (siteData.P_Load < 0) {
        elements.loadFlowAnimation.style.display = 'block';
        elements.loadFlowAnimation.style.animationDirection = 'normal';
    } else {
        elements.loadFlowAnimation.style.display = 'none';
    }
}

// Übersetze Betriebsmodus
function translateOperationMode(mode) {
    const modes = {
        'bidirectional': 'Bidirektional',
        'meter': 'Zählergesteuert',
        'storage': 'Speicher',
        'manual': 'Manuell'
    };

    return modes[mode] || mode;
}

// Übersetze Batteriemodus
function translateBatteryMode(mode) {
    const modes = {
        'normal': 'Normal',
        'charging': 'Ladend',
        'discharging': 'Entladend',
        'standby': 'Standby',
        'offline': 'Offline'
    };

    return modes[mode] || mode;
}

// Starte das Dashboard
document.addEventListener('DOMContentLoaded', initDashboard);