// js/data.js
import { getLocalDateString, getPastSchoolDays } from './helpers.js';

// Claves para LocalStorage
const KEYS = {
    EMPLOYEES: 'school_attendance_employees',
    RECORDS: 'school_attendance_records',
    JUSTIFICATIONS: 'school_attendance_justifications',
    SETTINGS: 'school_attendance_settings'
};

// Datos semilla iniciales (Si LocalStorage está vacío)
const SEED_EMPLOYEES = [
    { id: '1305648956', name: 'Narcisa Lolaida Cedeño Andrade', pin: '8956', role: 'Docente', schedule: { checkIn: '07:30', checkOut: '13:30', tolerance: 10 }, status: 'active' },
    { id: '1724863871', name: 'Johao Fernando Zambrano Cedeño', pin: '3871', role: 'Directivo', schedule: { checkIn: '07:30', checkOut: '13:30', tolerance: 10 }, status: 'active' },
    { id: '1722235676', name: 'Cristhian Alfredo Coveña Cedeño', pin: '5676', role: 'Docente', schedule: { checkIn: '07:30', checkOut: '13:30', tolerance: 10 }, status: 'active' }
];

// Generar historial de asistencia ficticio desde el 1 de mayo de 2026
const generateSeedRecords = () => {
    const records = [];
    const start = new Date('2026-05-01T00:00:00');
    const end = new Date(); // Fecha actual real del sistema
    
    const tempDate = new Date(start.getTime());
    
    while (tempDate <= end) {
        const dayOfWeek = tempDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Lunes a Viernes
            const dateStr = getLocalDateString(tempDate);
            
            SEED_EMPLOYEES.filter(emp => emp.status === 'active').forEach(emp => {
                const [schedHour, schedMin] = emp.schedule.checkIn.split(':').map(Number);
                const [outHour, outMin] = emp.schedule.checkOut.split(':').map(Number);
                
                // Llegada a tiempo (entre 5 y 15 minutos antes de la hora oficial)
                const arrivalOffset = -Math.floor(Math.random() * 10) - 5; // -5 a -14 minutos
                const totalMinutes = schedHour * 60 + schedMin + arrivalOffset;
                const checkHour = Math.floor(totalMinutes / 60);
                const checkMin = totalMinutes % 60;
                const checkSec = Math.floor(Math.random() * 60);
                const checkInTime = `${String(checkHour).padStart(2, '0')}:${String(checkMin).padStart(2, '0')}:${String(checkSec).padStart(2, '0')}`;
                
                // Salida normal/a tiempo (entre 1 y 12 minutos después de la hora oficial)
                const exitOffset = Math.floor(Math.random() * 11) + 1; // 1 a 11 minutos
                const outTotalMinutes = outHour * 60 + outMin + exitOffset;
                const outCheckHour = Math.floor(outTotalMinutes / 60);
                const outCheckMin = outTotalMinutes % 60;
                const outCheckSec = Math.floor(Math.random() * 60);
                const checkOutTime = `${String(outCheckHour).padStart(2, '0')}:${String(outCheckMin).padStart(2, '0')}:${String(outCheckSec).padStart(2, '0')}`;
                
                records.push({
                    id: `${emp.id}_${dateStr}`,
                    employeeId: emp.id,
                    date: dateStr,
                    checkInTime: checkInTime,
                    checkOutTime: checkOutTime,
                    status: 'A tiempo',
                    delay: 0,
                    notes: ''
                });
            });
        }
        tempDate.setDate(tempDate.getDate() + 1);
    }
    
    return records;
};

const SEED_JUSTIFICATIONS = [];

// Inicialización del servicio
export const DataService = {
    init() {
        const CURRENT_VERSION = 'v5';
        
        // Control de versiones de base de datos local para forzar actualización inmediata
        if (localStorage.getItem('school_attendance_db_version') !== CURRENT_VERSION) {
            localStorage.removeItem(KEYS.EMPLOYEES);
            localStorage.removeItem(KEYS.RECORDS);
            localStorage.removeItem(KEYS.JUSTIFICATIONS);
            localStorage.setItem('school_attendance_db_version', CURRENT_VERSION);
        }

        if (!localStorage.getItem(KEYS.EMPLOYEES)) {
            localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(SEED_EMPLOYEES));
        }
        if (!localStorage.getItem(KEYS.RECORDS)) {
            const seedRecs = generateSeedRecords();
            localStorage.setItem(KEYS.RECORDS, JSON.stringify(seedRecs));
        }
        if (!localStorage.getItem(KEYS.JUSTIFICATIONS)) {
            localStorage.setItem(KEYS.JUSTIFICATIONS, JSON.stringify(SEED_JUSTIFICATIONS));
        }
        if (!localStorage.getItem(KEYS.SETTINGS)) {
            const defaultSettings = {
                defaultCheckIn: '07:30',
                defaultCheckOut: '13:30',
                defaultTolerance: 10
            };
            localStorage.setItem(KEYS.SETTINGS, JSON.stringify(defaultSettings));
        }
    },

    // --- CONFIGURACIÓN ---
    getSettings() {
        return JSON.parse(localStorage.getItem(KEYS.SETTINGS)) || {
            defaultCheckIn: '07:30',
            defaultCheckOut: '13:30',
            defaultTolerance: 10
        };
    },

    saveSettings(settings) {
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
        return settings;
    },

    // --- EMPLEADOS ---
    getEmployees() {
        return JSON.parse(localStorage.getItem(KEYS.EMPLOYEES)) || [];
    },

    getEmployee(id) {
        return this.getEmployees().find(emp => emp.id === id);
    },

    getEmployeeByPin(pin) {
        return this.getEmployees().find(emp => emp.pin === pin && emp.status === 'active');
    },

    saveEmployee(employee) {
        const emps = this.getEmployees();
        const index = emps.findIndex(e => e.id === employee.id);
        if (index > -1) {
            emps[index] = employee;
        } else {
            emps.push(employee);
        }
        localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(emps));
        return employee;
    },

    deleteEmployee(id) {
        // En lugar de borrar físicamente, cambiamos estado a inactivo para mantener integridad del historial
        const emps = this.getEmployees();
        const emp = emps.find(e => e.id === id);
        if (emp) {
            emp.status = 'inactive';
            localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(emps));
        }
    },

    // --- REGISTROS DE ASISTENCIA ---
    getRecords() {
        return JSON.parse(localStorage.getItem(KEYS.RECORDS)) || [];
    },

    getRecordsByDate(date) {
        return this.getRecords().filter(rec => rec.date === date);
    },

    saveRecord(record) {
        const records = this.getRecords();
        const index = records.findIndex(r => r.id === record.id);
        if (index > -1) {
            records[index] = record;
        } else {
            records.push(record);
        }
        localStorage.setItem(KEYS.RECORDS, JSON.stringify(records));
        return record;
    },

    // --- JUSTIFICACIONES ---
    getJustifications() {
        return JSON.parse(localStorage.getItem(KEYS.JUSTIFICATIONS)) || [];
    },

    saveJustification(justification) {
        const justs = this.getJustifications();
        const index = justs.findIndex(j => j.id === justification.id);
        if (index > -1) {
            justs[index] = justification;
        } else {
            justification.id = 'JUST_' + Date.now();
            justs.push(justification);
        }
        localStorage.setItem(KEYS.JUSTIFICATIONS, JSON.stringify(justs));

        // Actualizar automáticamente el registro de asistencia del empleado para esa fecha
        const records = this.getRecords();
        const recordId = `${justification.employeeId}_${justification.date}`;
        const recordIndex = records.findIndex(r => r.id === recordId);

        const updatedRecord = {
            id: recordId,
            employeeId: justification.employeeId,
            date: justification.date,
            checkInTime: null,
            checkOutTime: null,
            status: 'Justificado',
            delay: 0,
            notes: justification.type + ': ' + justification.reason
        };

        if (recordIndex > -1) {
            records[recordIndex] = updatedRecord;
        } else {
            records.push(updatedRecord);
        }
        localStorage.setItem(KEYS.RECORDS, JSON.stringify(records));

        return justification;
    }
};
