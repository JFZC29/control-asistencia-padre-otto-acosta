// js/terminal.js
import { DataService } from './data.js';
import { 
    formatFriendlyDate, 
    formatTime12h, 
    evaluateCheckIn,
    getLocalDateString
} from './helpers.js';

// Inicializar datos semilla
DataService.init();

// --- SELECTORES DOM ---
const DOM = {
    terminalLiveTime: document.getElementById('terminal-live-time'),
    terminalLiveDate: document.getElementById('terminal-live-date'),
    pinDisplay: document.getElementById('pin-display'),
    keyBtns: document.querySelectorAll('.key-btn'),
    terminalToast: document.getElementById('terminal-toast'),
    toastIcon: document.getElementById('toast-icon'),
    toastTitle: document.getElementById('toast-title'),
    toastMessage: document.getElementById('toast-message'),
    toastDetails: document.getElementById('toast-details')
};

// --- CONFIGURACIÓN Y ESTADOS ---
const SYSTEM_DATE = getLocalDateString();
let pinInput = '';

// Inherit theme
const currentTheme = localStorage.getItem('school_attendance_theme') || 'light';
document.body.setAttribute('data-theme', currentTheme);

// --- CONTROLADOR DE VOZ (SPEECH SYNTHESIS) ---
const speak = (text) => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
    }
};

// --- ACTUALIZADOR DE TIEMPO REAL ---
const startClock = () => {
    const updateTime = () => {
        const now = new Date();
        const timeString = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        
        DOM.terminalLiveTime.textContent = timeString;
        DOM.terminalLiveDate.textContent = formatFriendlyDate(SYSTEM_DATE);
    };
    updateTime();
    setInterval(updateTime, 1000);
};

const updatePinDisplay = () => {
    DOM.pinDisplay.textContent = '• '.repeat(pinInput.length) + ' '.repeat(4 - pinInput.length);
    if (pinInput.length > 0) {
        DOM.pinDisplay.classList.add('focus');
    } else {
        DOM.pinDisplay.classList.remove('focus');
    }
};

const showTerminalToast = (type, title, message, details, duration = 4000) => {
    DOM.toastTitle.textContent = title;
    DOM.toastMessage.textContent = message;
    DOM.toastDetails.textContent = details;
    
    DOM.toastIcon.className = `toast-icon ${type}`;
    if (type === 'success') {
        DOM.toastIcon.innerHTML = '<i data-lucide="check-circle-2" style="width: 48px; height: 48px;"></i>';
    } else if (type === 'error') {
        DOM.toastIcon.innerHTML = '<i data-lucide="alert-circle" style="width: 48px; height: 48px;"></i>';
    } else {
        DOM.toastIcon.innerHTML = '<i data-lucide="help-circle" style="width: 48px; height: 48px;"></i>';
    }
    lucide.createIcons();

    DOM.terminalToast.classList.add('active');
    toggleKeypadState(false);

    setTimeout(() => {
        DOM.terminalToast.classList.remove('active');
        toggleKeypadState(true);
        pinInput = '';
        updatePinDisplay();
    }, duration);
};

const toggleKeypadState = (enable) => {
    DOM.keyBtns.forEach(btn => {
        btn.disabled = !enable;
        btn.style.pointerEvents = enable ? 'auto' : 'none';
        btn.style.opacity = enable ? '1' : '0.6';
    });
};

const handlePinSubmit = () => {
    if (pinInput.length < 4) {
        speak("El PIN debe ser de cuatro dígitos.");
        showTerminalToast('error', 'PIN Incompleto', 'Por favor ingrese los 4 dígitos de su código personal.', 'Intente nuevamente', 2500);
        return;
    }

    const emp = DataService.getEmployeeByPin(pinInput);
    if (!emp) {
        speak("Acceso denegado. Código de PIN incorrecto.");
        showTerminalToast('error', 'Código Incorrecto', 'El PIN ingresado no coincide con ningún miembro activo del personal.', 'Verifique e intente de nuevo', 3000);
        return;
    }

    const today = SYSTEM_DATE;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const friendlyTime = formatTime12h(timeStr);

    const records = DataService.getRecords();
    const recordId = `${emp.id}_${today}`;
    const existingRecord = records.find(r => r.id === recordId);

    if (!existingRecord) {
        // Si está marcando después de su hora de salida oficial establecida
        if (timeStr > emp.schedule.checkOut) {
            // Se asume que es una salida y olvidó marcar la entrada por la mañana
            const newRecord = {
                id: recordId,
                employeeId: emp.id,
                date: today,
                checkInTime: null,
                checkOutTime: timeStr,
                status: 'A tiempo', // No se marca como Tarde
                delay: 0,
                notes: 'Marcó salida directamente (olvidó marcar entrada)'
            };
            DataService.saveRecord(newRecord);

            speak(`Hasta luego, ${emp.name}. Salida registrada.`);
            showTerminalToast(
                'success',
                '¡Salida Registrada!',
                `Hasta luego, ${emp.name}`,
                `Salida: ${friendlyTime} | Omitió entrada`,
                4000
            );
            return;
        }

        // --- ENTRADA ---
        const evaluation = evaluateCheckIn(timeStr, emp.schedule.checkIn, emp.schedule.tolerance);
        const newRecord = {
            id: recordId,
            employeeId: emp.id,
            date: today,
            checkInTime: timeStr,
            checkOutTime: null,
            status: evaluation.status,
            delay: evaluation.delay,
            notes: evaluation.status === 'Tarde' ? `Llegada tarde por ${evaluation.delay} minutos` : ''
        };

        DataService.saveRecord(newRecord);

        const stateMsg = evaluation.status === 'Tarde' 
            ? `Retraso de ${evaluation.delay} minutos` 
            : 'A tiempo';
            
        const voiceText = evaluation.status === 'Tarde'
            ? `Buenos días, ${emp.name}. Entrada registrada con retraso.`
            : `Buenos días, ${emp.name}. Entrada registrada correctamente.`;

        speak(voiceText);
        showTerminalToast(
            evaluation.status === 'Tarde' ? 'warning' : 'success',
            '¡Entrada Registrada!',
            `Buenos días, ${emp.name}`,
            `Entrada: ${friendlyTime} | Estado: ${evaluation.status} (${stateMsg})`,
            4000
        );
    } else if (existingRecord.checkInTime && !existingRecord.checkOutTime) {
        // --- SALIDA ---
        existingRecord.checkOutTime = timeStr;
        DataService.saveRecord(existingRecord);

        speak(`Hasta luego, ${emp.name}. Salida registrada.`);
        showTerminalToast(
            'success',
            '¡Salida Registrada!',
            `Hasta luego, ${emp.name}`,
            `Salida: ${friendlyTime} | ¡Que tenga un excelente día!`,
            4000
        );
    } else if (existingRecord.status === 'Justificado') {
        speak(`${emp.name} se encuentra de permiso justificado el día de hoy.`);
        showTerminalToast(
            'success',
            'Permiso Justificado',
            `${emp.name}`,
            `Estado de hoy: JUSTIFICADO (${existingRecord.notes})`,
            4000
        );
    } else {
        speak(`${emp.name} ya registró su entrada y salida de hoy.`);
        showTerminalToast(
            'warning',
            'Registro Completo',
            `${emp.name}`,
            `Entrada: ${formatTime12h(existingRecord.checkInTime)} | Salida: ${formatTime12h(existingRecord.checkOutTime)}`,
            4000
        );
    }
};

// Eventos de teclado PIN
DOM.keyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        
        if (key === 'clear') {
            pinInput = '';
            updatePinDisplay();
        } else if (key === 'enter') {
            handlePinSubmit();
        } else {
            if (pinInput.length < 4) {
                pinInput += key;
                updatePinDisplay();
            }
        }
    });
});

// Teclado físico
document.addEventListener('keydown', (e) => {
    if (DOM.terminalToast.classList.contains('active')) return;

    if (e.key >= '0' && e.key <= '9') {
        if (pinInput.length < 4) {
            pinInput += e.key;
            updatePinDisplay();
        }
    } else if (e.key === 'Backspace' || e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        pinInput = '';
        updatePinDisplay();
    } else if (e.key === 'Enter') {
        handlePinSubmit();
    }
});

// Inicializar
startClock();
updatePinDisplay();
lucide.createIcons();
speak("Terminal activa.");
