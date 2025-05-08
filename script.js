// Globale Variablen für Chart und Daten
let powerChart = null;
let lastData = null;

// DOM Content Loaded Event - Startpunkt
document.addEventListener('DOMContentLoaded', function() {
    // Uhr sofort starten
    updateClock();

    // Daten laden
    fetchData();

    // Chart initialisieren
    initPowerChart();
});

// Regelmäßig Uhr aktualisieren (jede Sekunde)
function updateClock() {
    const now = new Date();

    // Formatiere Datum: DD.MM.YYYY
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}.${month}.${year}`;

    // Formatiere Uhrzeit: HH:MM:SS Uhr
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}:${seconds} Uhr`;

    // Werte in HTML setzen
    document.getElementById('current-date').textContent = dateStr;
    document.getElementById('current-time').textContent = timeStr;

    // Nächsten Tick in 1 Sekunde planen
    setTimeout(updateClock, 1000);
}

// Daten von der API laden
function fetchData() {
    fetch('data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Netzwerkfehler beim Laden der Daten');
            }
            return response.json();
        })
        .then(data => {
            // Daten speichern und Dashboard aktualisieren
            lastData = data;
            updateDashboard(data);

            // Nächsten Datenabruf in 30 Sekunden planen
            setTimeout(fetchData, 30000);
        })
        .catch(error => {
            // Bei einem Fehler trotzdem weitermachen
            setTimeout(fetchData, 30000);
        });
}

// Dashboard mit den neuen Daten aktualisieren
function updateDashboard(data) {
    if (!data || !data.Body || !data.Body.Data) return;

    const siteData = data.Body.Data.Site;
    const inverterData = data.Body.Data.Inverters["1"];
    const timestamp = data.Head.Timestamp;

    // JSON Timestamp anzeigen
    if (timestamp) {
        const jsonDate = new Date(timestamp);
        const options = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        document.getElementById('json-timestamp').textContent = jsonDate.toLocaleString('de-DE', options);
    }

    // Power-Werte aktualisieren
    document.getElementById('pv-power').textContent = Math.abs(siteData.P_PV).toFixed(0);
    document.getElementById('battery-power').textContent = Math.abs(siteData.P_Akku).toFixed(0);
    document.getElementById('grid-power').textContent = Math.abs(siteData.P_Grid).toFixed(0);
    document.getElementById('load-power').textContent = Math.abs(siteData.P_Load).toFixed(0);

    // Batteriestatus
    const batteryPercentage = inverterData.SOC;
    document.getElementById('battery-percentage').textContent = batteryPercentage;

    const batteryLevel = document.getElementById('battery-level');
    batteryLevel.style.height = `${batteryPercentage}%`;

    // Batterie-Farbe anpassen
    if (batteryPercentage < 20) {
        batteryLevel.style.background = 'linear-gradient(to top, #f44336, #ff5722)';
    } else if (batteryPercentage < 50) {
        batteryLevel.style.background = 'linear-gradient(to top, #ff5722, #ff9800)';
    } else {
        batteryLevel.style.background = 'linear-gradient(to top, #4caf50, #8bc34a)';
    }

    // Batterie-Modus
    document.getElementById('battery-mode').textContent = translateBatteryMode(inverterData.Battery_Mode);

    // Statistik-Werte
    document.getElementById('e-day').textContent = siteData.E_Day;
    document.getElementById('e-year').textContent = (siteData.E_Year / 1000).toFixed(2);
    document.getElementById('e-total').textContent = (siteData.E_Total / 1000000).toFixed(2);
    document.getElementById('autonomy').textContent = siteData.rel_Autonomy.toFixed(1);

    // Anlagenstatus
    document.getElementById('operation-mode').textContent = translateOperationMode(siteData.Mode);
    document.getElementById('backup-mode').textContent = siteData.BackupMode ? 'Ein' : 'Aus';
    document.getElementById('battery-standby').textContent = siteData.BatteryStandby ? 'Ein' : 'Aus';
    document.getElementById('self-consumption').textContent = `${siteData.rel_SelfConsumption.toFixed(1)}%`;

    // Letztes Update
    const lastUpdateDate = new Date(timestamp);
    document.getElementById('last-update').textContent = lastUpdateDate.toLocaleString('de-DE');

    // Energiefluss aktualisieren
    updateFlowAnimations(siteData);

    // Chart aktualisieren
    if (powerChart) {
        updatePowerChart(siteData);
    }
}

// Power Chart initialisieren
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

// Power Chart aktualisieren
function updatePowerChart(siteData) {
    powerChart.data.datasets[0].data = [
        Math.abs(siteData.P_PV),
        Math.abs(siteData.P_Akku),
        Math.abs(siteData.P_Grid),
        Math.abs(siteData.P_Load)
    ];

    powerChart.update();
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

// Aktualisiere die Energiefluss-Animationen
function updateFlowAnimations(siteData) {
    // PV-Fluss
    const pvFlow = document.getElementById('pv-flow-animation');
    if (siteData.P_PV > 0) {
        pvFlow.style.display = 'block';
        pvFlow.style.animationDirection = 'normal';
    } else {
        pvFlow.style.display = 'none';
    }

    // Netz-Fluss
    const gridFlow = document.getElementById('grid-flow-animation');
    if (siteData.P_Grid !== 0) {
        gridFlow.style.display = 'block';
        gridFlow.style.animationDirection = siteData.P_Grid > 0 ? 'normal' : 'reverse';
    } else {
        gridFlow.style.display = 'none';
    }

    // Batterie-Fluss
    const batteryFlow = document.getElementById('battery-flow-animation');
    if (siteData.P_Akku !== 0) {
        batteryFlow.style.display = 'block';
        batteryFlow.style.animationDirection = siteData.P_Akku > 0 ? 'normal' : 'reverse';
    } else {
        batteryFlow.style.display = 'none';
    }

    // Verbrauchs-Fluss
    const loadFlow = document.getElementById('load-flow-animation');
    if (siteData.P_Load < 0) {
        loadFlow.style.display = 'block';
        loadFlow.style.animationDirection = 'normal';
    } else {
        loadFlow.style.display = 'none';
    }
}