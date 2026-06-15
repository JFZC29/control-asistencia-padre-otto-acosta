// js/admin.js
import { DataService } from './data.js';
import { 
    formatFriendlyDate, 
    formatTime12h, 
    exportToCSV,
    getLocalDateString,
    getPastSchoolDays
} from './helpers.js';

// Inicializar datos semilla
DataService.init();

// --- SELECTORES DOM ---
const DOM = {
    // Autenticación
    loginContainer: document.getElementById('login-container'),
    adminContainer: document.getElementById('admin-container'),
    loginForm: document.getElementById('login-form'),
    loginUsername: document.getElementById('login-username'),
    loginPassword: document.getElementById('login-password'),
    loginError: document.getElementById('login-error'),
    btnLogoutAdmin: document.getElementById('btn-logout-admin'),
    
    // Navegación
    navItems: document.querySelectorAll('.nav-item'),
    viewTitle: document.getElementById('view-title'),
    viewSubtitle: document.getElementById('view-subtitle'),
    viewSections: document.querySelectorAll('.view-section'),
    
    // Controles Globales
    currentDateTime: document.getElementById('current-date-time'),
    themeBtn: document.getElementById('theme-btn'),
    
    // Dashboard
    metricTotalEmp: document.getElementById('metric-total-emp'),
    metricPresent: document.getElementById('metric-present'),
    metricLate: document.getElementById('metric-late'),
    metricAbsent: document.getElementById('metric-absent'),
    recentActivityList: document.getElementById('recent-activity-list'),
    
    // Personal (Empleados)
    searchEmployees: document.getElementById('search-employees'),
    btnAddEmployee: document.getElementById('btn-add-employee'),
    employeesTbody: document.getElementById('employees-tbody'),
    employeeModal: document.getElementById('employee-modal'),
    employeeModalTitle: document.getElementById('employee-modal-title'),
    formEmployee: document.getElementById('form-employee'),
    empAction: document.getElementById('emp-action'),
    empId: document.getElementById('emp-id'),
    empName: document.getElementById('emp-name'),
    empRole: document.getElementById('emp-role'),
    empPin: document.getElementById('emp-pin'),
    empCheckIn: document.getElementById('emp-check-in'),
    empCheckOut: document.getElementById('emp-check-out'),
    empTolerance: document.getElementById('emp-tolerance'),
    btnCloseEmpModal: document.getElementById('btn-close-emp-modal'),
    btnCancelEmpModal: document.getElementById('btn-cancel-emp-modal'),

    // Historial y Reportes
    filterDateStart: document.getElementById('filter-date-start'),
    filterDateEnd: document.getElementById('filter-date-end'),
    filterRole: document.getElementById('filter-role'),
    filterStatus: document.getElementById('filter-status'),
    recordsTbody: document.getElementById('records-tbody'),
    btnExportRecords: document.getElementById('btn-export-records'),
    
    // Justificaciones
    justEmployeeId: document.getElementById('just-employee-id'),
    justDate: document.getElementById('just-date'),
    justType: document.getElementById('just-type'),
    justReason: document.getElementById('just-reason'),
    formJustification: document.getElementById('form-justification'),
    justificationsTbody: document.getElementById('justifications-tbody'),

    // Configuración
    settingsCheckIn: document.getElementById('settings-check-in'),
    settingsCheckOut: document.getElementById('settings-check-out'),
    settingsTolerance: document.getElementById('settings-tolerance'),
    formSettings: document.getElementById('form-settings'),
    
    // Imprimir
    btnPrintSignatures: document.getElementById('btn-print-signatures')
};

// --- CONFIGURACIÓN Y ESTADOS ---
const SYSTEM_DATE = getLocalDateString();
let weeklyChart = null;

// Manejo del Tema Claro/Oscuro
let currentTheme = localStorage.getItem('school_attendance_theme') || 'light';
document.body.setAttribute('data-theme', currentTheme);

// --- CONTROL DE LOGIN ---
const checkAuth = () => {
    const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';
    if (isLoggedIn) {
        DOM.loginContainer.style.display = 'none';
        DOM.adminContainer.style.display = 'flex';
        initAdminPanel();
    } else {
        DOM.loginContainer.style.display = 'flex';
        DOM.adminContainer.style.display = 'none';
    }
};

DOM.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = DOM.loginUsername.value.trim();
    const pass = DOM.loginPassword.value;

    // Validación básica admin / admin123
    if (user === 'admin' && pass === 'admin123') {
        DOM.loginError.style.display = 'none';
        sessionStorage.setItem('admin_logged_in', 'true');
        DOM.loginContainer.style.display = 'none';
        DOM.adminContainer.style.display = 'flex';
        initAdminPanel();
    } else {
        DOM.loginError.style.display = 'block';
        DOM.loginPassword.value = '';
    }
});

DOM.btnLogoutAdmin.addEventListener('click', () => {
    if (confirm('¿Desea cerrar la sesión administrativa?')) {
        sessionStorage.removeItem('admin_logged_in');
        window.location.reload();
    }
});

// --- TIEMPO REAL ---
const startClock = () => {
    const updateTime = () => {
        const now = new Date();
        const timeString = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        DOM.currentDateTime.textContent = `${formatFriendlyDate(SYSTEM_DATE)} - ${timeString}`;
    };
    updateTime();
    setInterval(updateTime, 1000);
};

// --- SPA NAVEGACIÓN ---
const initNavigation = () => {
    DOM.navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetView = item.getAttribute('data-view');
            
            DOM.navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            DOM.viewSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === `view-${targetView}`) {
                    section.classList.add('active');
                }
            });

            updateHeaderTitles(targetView);
            loadViewData(targetView);
        });
    });

    DOM.themeBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', currentTheme);
        localStorage.setItem('school_attendance_theme', currentTheme);
        if (weeklyChart) {
            renderWeeklyChart();
        }
    });
};

const updateHeaderTitles = (viewName) => {
    const titles = {
        dashboard: { title: 'Panel de Control', sub: 'Resumen en tiempo real del estado de asistencia' },
        employees: { title: 'Personal Docente y Administrativo', sub: 'Gestione las fichas de información del personal escolar' },
        records: { title: 'Historial de Asistencia', sub: 'Monitoreo detallado de registros y exportación de reportes' },
        justifications: { title: 'Justificaciones y Permisos', sub: 'Administre los justificantes médicos y licencias del personal' }
    };
    
    if (titles[viewName]) {
        DOM.viewTitle.textContent = titles[viewName].title;
        DOM.viewSubtitle.textContent = titles[viewName].sub;
    }
};

const loadViewData = (viewName) => {
    lucide.createIcons();
    switch (viewName) {
        case 'dashboard':
            renderDashboardMetrics();
            renderDashboardActivity();
            renderWeeklyChart();
            break;
        case 'employees':
            renderEmployeesTable();
            break;
        case 'records':
            if (!DOM.filterDateStart.value) DOM.filterDateStart.value = '2026-06-08';
            if (!DOM.filterDateEnd.value) DOM.filterDateEnd.value = SYSTEM_DATE;
            renderRecordsTable();
            break;
        case 'justifications':
            populateEmployeeSelect();
            renderJustificationsTable();
            break;
        case 'settings':
            loadSettingsForm();
            break;
    }
};

// --- PANEL DE CONTROL (DASHBOARD) ---
const renderDashboardMetrics = () => {
    const emps = DataService.getEmployees().filter(e => e.status === 'active');
    const records = DataService.getRecordsByDate(SYSTEM_DATE);
    
    const total = emps.length;
    const present = records.filter(r => r.checkInTime !== null && r.status !== 'Justificado').length;
    const late = records.filter(r => r.status === 'Tarde').length;
    const justified = records.filter(r => r.status === 'Justificado').length;
    const absent = Math.max(0, total - present - justified);

    DOM.metricTotalEmp.textContent = total;
    DOM.metricPresent.textContent = present;
    DOM.metricLate.textContent = late;
    DOM.metricAbsent.textContent = absent;
};

const renderDashboardActivity = () => {
    const records = DataService.getRecordsByDate(SYSTEM_DATE);
    const emps = DataService.getEmployees();
    
    DOM.recentActivityList.innerHTML = '';
    
    if (records.length === 0) {
        DOM.recentActivityList.innerHTML = `
            <div style="text-align: center; padding: 24px; color: var(--text-secondary); font-size: 0.9rem;">
                No hay marcajes registrados el día de hoy.
            </div>
        `;
        return;
    }

    const sortedRecords = [...records].sort((a, b) => {
        const timeA = a.checkInTime || '00:00:00';
        const timeB = b.checkInTime || '00:00:00';
        return timeB.localeCompare(timeA);
    });

    sortedRecords.forEach(rec => {
        const emp = emps.find(e => e.id === rec.employeeId);
        if (!emp) return;

        const initials = emp.name.split(' ').map(n => n[0]).slice(0, 2).join('');
        const item = document.createElement('div');
        
        let statusClass = 'a-tiempo';
        let detailText = `Entrada a las ${formatTime12h(rec.checkInTime)}`;
        
        if (rec.status === 'Tarde') {
            statusClass = 'tarde';
            detailText = `Retraso de ${rec.delay} min (Llegó ${formatTime12h(rec.checkInTime)})`;
        } else if (rec.status === 'Justificado') {
            statusClass = 'salida';
            detailText = `Ausencia Justificada: ${rec.notes}`;
        }

        if (rec.checkOutTime) {
            detailText += ` | Salida a las ${formatTime12h(rec.checkOutTime)}`;
        }

        item.className = `activity-item ${statusClass}`;
        item.innerHTML = `
            <div class="activity-avatar">${initials}</div>
            <div class="activity-details">
                <span class="activity-name">${emp.name}</span>
                <span class="activity-desc">${detailText}</span>
            </div>
            <span class="activity-time">${rec.checkInTime ? formatTime12h(rec.checkInTime) : 'Justificado'}</span>
        `;
        DOM.recentActivityList.appendChild(item);
    });
};

const renderWeeklyChart = () => {
    const ctx = document.getElementById('weeklyAttendanceChart').getContext('2d');
    const records = DataService.getRecords();
    const dates = getPastSchoolDays(5);
    
    const datasets = {
        aTiempo: [],
        tarde: [],
        falta: [],
        justificado: []
    };

    dates.forEach(d => {
        const dailyRecs = records.filter(r => r.date === d);
        datasets.aTiempo.push(dailyRecs.filter(r => r.status === 'A tiempo').length);
        datasets.tarde.push(dailyRecs.filter(r => r.status === 'Tarde').length);
        datasets.falta.push(dailyRecs.filter(r => r.status === 'Falta').length);
        datasets.justificado.push(dailyRecs.filter(r => r.status === 'Justificado').length);
    });

    if (weeklyChart) {
        weeklyChart.destroy();
    }

    const isDark = currentTheme === 'dark';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? '#1e293b' : '#f1f5f9';

    const daysShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dynamicLabels = dates.map(d => {
        const [y, m, day] = d.split('-').map(Number);
        const dateObj = new Date(Date.UTC(y, m - 1, day));
        return `${daysShort[dateObj.getUTCDay()]} ${day}`;
    });

    weeklyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dynamicLabels,
            datasets: [
                { label: 'A tiempo', data: datasets.aTiempo, backgroundColor: '#16a34a', borderRadius: 4 },
                { label: 'Tardes', data: datasets.tarde, backgroundColor: '#ca8a04', borderRadius: 4 },
                { label: 'Justificados', data: datasets.justificado, backgroundColor: '#2563eb', borderRadius: 4 },
                { label: 'Faltas', data: datasets.falta, backgroundColor: '#dc2626', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor, font: { family: 'Plus Jakarta Sans', weight: '600' } }
                }
            },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { color: textColor, font: { family: 'Plus Jakarta Sans' } } },
                y: { stacked: true, grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Plus Jakarta Sans' } } }
            }
        }
    });
};

// --- GESTIÓN DE PERSONAL (CRUD) ---
const renderEmployeesTable = () => {
    const emps = DataService.getEmployees();
    const searchVal = DOM.searchEmployees.value.toLowerCase().trim();
    
    DOM.employeesTbody.innerHTML = '';

    const filtered = emps.filter(emp => {
        return emp.name.toLowerCase().includes(searchVal) || emp.id.includes(searchVal);
    });

    if (filtered.length === 0) {
        DOM.employeesTbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: var(--text-secondary);">No se encontraron empleados.</td>
            </tr>
        `;
        return;
    }

    filtered.forEach(emp => {
        const tr = document.createElement('tr');
        if (emp.status === 'inactive') {
            tr.style.opacity = '0.5';
        }

        tr.innerHTML = `
            <td style="font-weight: 700;">${emp.id}</td>
            <td style="font-weight: 600;">${emp.name}</td>
            <td>${emp.role}</td>
            <td><i data-lucide="clock" style="width: 14px; height:14px; display:inline; margin-right: 4px; vertical-align:middle;"></i>${emp.schedule.checkIn} - ${emp.schedule.checkOut}</td>
            <td>${emp.schedule.tolerance} min</td>
            <td><code>${emp.pin}</code></td>
            <td>
                <span class="badge ${emp.status === 'active' ? 'activo' : 'inactivo'}">
                    ${emp.status === 'active' ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-edit-emp" data-id="${emp.id}" title="Editar"><i data-lucide="edit-2"></i></button>
                    ${emp.status === 'active' ? 
                        `<button class="btn-icon danger btn-delete-emp" data-id="${emp.id}" title="Desactivar"><i data-lucide="user-minus"></i></button>` : 
                        `<button class="btn-icon btn-activate-emp" data-id="${emp.id}" title="Activar"><i data-lucide="user-check"></i></button>`
                    }
                </div>
            </td>
        `;
        DOM.employeesTbody.appendChild(tr);
    });

    lucide.createIcons();
    setupTableEventHandlers();
};

const setupTableEventHandlers = () => {
    document.querySelectorAll('.btn-edit-emp').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const emp = DataService.getEmployee(id);
            if (emp) {
                DOM.employeeModalTitle.textContent = 'Editar Datos de Personal';
                DOM.empAction.value = 'edit';
                DOM.empId.value = emp.id;
                DOM.empId.readOnly = true;
                
                DOM.empName.value = emp.name;
                DOM.empRole.value = emp.role;
                DOM.empPin.value = emp.pin;
                DOM.empCheckIn.value = emp.schedule.checkIn;
                DOM.empCheckOut.value = emp.schedule.checkOut;
                DOM.empTolerance.value = emp.schedule.tolerance;
                DOM.employeeModal.classList.add('active');
            }
        });
    });

    document.querySelectorAll('.danger.btn-delete-emp').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const emp = DataService.getEmployee(id);
            if (emp && confirm(`¿Está seguro de que desea desactivar a ${emp.name}?`)) {
                DataService.deleteEmployee(id);
                renderEmployeesTable();
            }
        });
    });

    document.querySelectorAll('.btn-activate-emp').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const emp = DataService.getEmployee(id);
            if (emp) {
                emp.status = 'active';
                DataService.saveEmployee(emp);
                renderEmployeesTable();
            }
        });
    });
};

DOM.btnAddEmployee.addEventListener('click', () => {
    DOM.employeeModalTitle.textContent = 'Registrar Nuevo Personal';
    DOM.empAction.value = 'create';
    DOM.empId.readOnly = false;
    DOM.formEmployee.reset();
    
    // Cargar valores por defecto configurados en el panel
    const settings = DataService.getSettings();
    DOM.empCheckIn.value = settings.defaultCheckIn;
    DOM.empCheckOut.value = settings.defaultCheckOut;
    DOM.empTolerance.value = settings.defaultTolerance;
    
    DOM.employeeModal.classList.add('active');
});

const closeEmployeeModal = () => {
    DOM.employeeModal.classList.remove('active');
};

DOM.btnCloseEmpModal.addEventListener('click', closeEmployeeModal);
DOM.btnCancelEmpModal.addEventListener('click', closeEmployeeModal);

DOM.formEmployee.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = DOM.empId.value.trim();
    const name = DOM.empName.value.trim();
    const role = DOM.empRole.value;
    const pin = DOM.empPin.value.trim();
    const checkIn = DOM.empCheckIn.value;
    const checkOut = DOM.empCheckOut.value;
    const tolerance = parseInt(DOM.empTolerance.value, 10);

    if (!/^\d{4}$/.test(pin)) {
        alert('El PIN debe tener 4 dígitos.');
        return;
    }

    if (DOM.empAction.value === 'create' && DataService.getEmployee(id)) {
        alert('Cédula/ID ya registrado.');
        return;
    }

    const employee = { id, name, role, pin, schedule: { checkIn, checkOut, tolerance }, status: 'active' };
    DataService.saveEmployee(employee);
    closeEmployeeModal();
    renderEmployeesTable();
});

DOM.searchEmployees.addEventListener('input', renderEmployeesTable);

// --- HISTORIAL Y REPORTES ---
const renderRecordsTable = () => {
    const records = DataService.getRecords();
    const emps = DataService.getEmployees();
    const startDate = DOM.filterDateStart.value;
    const endDate = DOM.filterDateEnd.value;
    const roleVal = DOM.filterRole.value;
    const statusVal = DOM.filterStatus.value;

    DOM.recordsTbody.innerHTML = '';

    const filtered = records.filter(rec => {
        const emp = emps.find(e => e.id === rec.employeeId);
        if (!emp) return false;
        return (rec.date >= startDate && rec.date <= endDate) &&
               (roleVal === 'All' || emp.role === roleVal) &&
               (statusVal === 'All' || rec.status === statusVal);
    });

    filtered.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.checkInTime || '00:00:00').localeCompare(a.checkInTime || '00:00:00');
    });

    if (filtered.length === 0) {
        DOM.recordsTbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-secondary);">No hay registros.</td></tr>`;
        return;
    }

    filtered.forEach(rec => {
        const emp = emps.find(e => e.id === rec.employeeId);
        const tr = document.createElement('tr');
        let statusBadgeClass = 'a-tiempo';
        if (rec.status === 'Tarde') statusBadgeClass = 'tarde';
        if (rec.status === 'Falta') statusBadgeClass = 'falta';
        if (rec.status === 'Justificado') statusBadgeClass = 'justificado';

        tr.innerHTML = `
            <td style="font-weight: 600;">${rec.date}</td>
            <td style="font-weight: 700;">${emp ? emp.name : 'Desconocido'}</td>
            <td>${emp ? emp.role : '--'}</td>
            <td style="font-weight: 600;">${rec.checkInTime ? formatTime12h(rec.checkInTime) : '--'}</td>
            <td style="font-weight: 600;">${rec.checkOutTime ? formatTime12h(rec.checkOutTime) : '--'}</td>
            <td><span class="badge ${statusBadgeClass}">${rec.status}</span></td>
            <td>${rec.delay > 0 ? `${rec.delay} min` : '--'}</td>
            <td style="font-size: 0.85rem; color: var(--text-secondary); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${rec.notes || ''}">
                ${rec.notes || ''}
            </td>
        `;
        DOM.recordsTbody.appendChild(tr);
    });
};

DOM.filterDateStart.addEventListener('change', renderRecordsTable);
DOM.filterDateEnd.addEventListener('change', renderRecordsTable);
DOM.filterRole.addEventListener('change', renderRecordsTable);
DOM.filterStatus.addEventListener('change', renderRecordsTable);

DOM.btnExportRecords.addEventListener('click', () => {
    const records = DataService.getRecords();
    const emps = DataService.getEmployees();
    const startDate = DOM.filterDateStart.value;
    const endDate = DOM.filterDateEnd.value;
    const roleVal = DOM.filterRole.value;
    const statusVal = DOM.filterStatus.value;

    const filtered = records.filter(rec => {
        const emp = emps.find(e => e.id === rec.employeeId);
        if (!emp) return false;
        return (rec.date >= startDate && rec.date <= endDate) &&
               (roleVal === 'All' || emp.role === roleVal) &&
               (statusVal === 'All' || rec.status === statusVal);
    });

    const csvHeaders = ['Fecha', 'Cédula/ID', 'Nombre Empleado', 'Cargo', 'Hora Entrada', 'Hora Salida', 'Estado', 'Minutos Retraso', 'Notas'];
    const csvRows = filtered.map(rec => {
        const emp = emps.find(e => e.id === rec.employeeId);
        return [
            rec.date, rec.employeeId, emp ? emp.name : 'Desconocido', emp ? emp.role : '',
            rec.checkInTime || '', rec.checkOutTime || '', rec.status, rec.delay, rec.notes || ''
        ];
    });

    exportToCSV(`Reporte_Asistencia_${startDate}_al_${endDate}.csv`, csvHeaders, csvRows);
});

// --- JUSTIFICACIONES ---
const populateEmployeeSelect = () => {
    const emps = DataService.getEmployees().filter(e => e.status === 'active');
    DOM.justEmployeeId.innerHTML = '<option value="" disabled selected>Seleccione un empleado...</option>';
    emps.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        opt.textContent = `${emp.name} (${emp.role})`;
        DOM.justEmployeeId.appendChild(opt);
    });
};

const renderJustificationsTable = () => {
    const justs = DataService.getJustifications();
    const emps = DataService.getEmployees();
    DOM.justificationsTbody.innerHTML = '';
    
    if (justs.length === 0) {
        DOM.justificationsTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No hay permisos.</td></tr>`;
        return;
    }

    const sorted = [...justs].sort((a, b) => b.date.localeCompare(a.date));
    sorted.forEach(j => {
        const emp = emps.find(e => e.id === j.employeeId);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${j.date}</td>
            <td style="font-weight: 700;">${emp ? emp.name : 'Desconocido'}</td>
            <td><span class="badge justificado">${j.type}</span></td>
            <td>${j.reason}</td>
        `;
        DOM.justificationsTbody.appendChild(tr);
    });
};

DOM.formJustification.addEventListener('submit', (e) => {
    e.preventDefault();
    const employeeId = DOM.justEmployeeId.value;
    const date = DOM.justDate.value;
    const type = DOM.justType.value;
    const reason = DOM.justReason.value.trim();

    DataService.saveJustification({ employeeId, date, type, reason });
    DOM.formJustification.reset();
    renderJustificationsTable();
    alert('Permiso registrado.');
});

// --- CONFIGURACIÓN DE JORNADA ---
const loadSettingsForm = () => {
    const settings = DataService.getSettings();
    DOM.settingsCheckIn.value = settings.defaultCheckIn;
    DOM.settingsCheckOut.value = settings.defaultCheckOut;
    DOM.settingsTolerance.value = settings.defaultTolerance;
};

DOM.formSettings.addEventListener('submit', (e) => {
    e.preventDefault();
    const settings = {
        defaultCheckIn: DOM.settingsCheckIn.value,
        defaultCheckOut: DOM.settingsCheckOut.value,
        defaultTolerance: parseInt(DOM.settingsTolerance.value, 10)
    };
    DataService.saveSettings(settings);
    alert('Configuración de jornada general guardada exitosamente.');
});

// --- IMPRIMIR PLANILLA DE FIRMAS ---
const printSignatureSheet = () => {
    const records = DataService.getRecords();
    const emps = DataService.getEmployees();
    const startDate = DOM.filterDateStart.value;
    const endDate = DOM.filterDateEnd.value;
    const roleVal = DOM.filterRole.value;
    const statusVal = DOM.filterStatus.value;

    const filtered = records.filter(rec => {
        const emp = emps.find(e => e.id === rec.employeeId);
        if (!emp) return false;
        return (rec.date >= startDate && rec.date <= endDate) &&
               (roleVal === 'All' || emp.role === roleVal) &&
               (statusVal === 'All' || rec.status === statusVal);
    });

    filtered.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const empA = emps.find(e => e.id === a.employeeId)?.name || '';
        const empB = emps.find(e => e.id === b.employeeId)?.name || '';
        return empA.localeCompare(empB);
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Por favor permita las ventanas emergentes (pop-ups) para generar la planilla de firmas.');
        return;
    }

    let rowsHTML = '';
    filtered.forEach(rec => {
        const emp = emps.find(e => e.id === rec.employeeId);
        rowsHTML += `
            <tr>
                <td>${rec.date}</td>
                <td>${emp ? emp.name : 'Desconocido'}</td>
                <td>${emp ? emp.role : '--'}</td>
                <td>${rec.checkInTime ? formatTime12h(rec.checkInTime) : '--'}</td>
                <td>${rec.checkOutTime ? formatTime12h(rec.checkOutTime) : '--'}</td>
                <td>${rec.status}</td>
                <td style="width: 160px; height: 35px; border: 1px solid #000; vertical-align: bottom; text-align: center;">
                    <div style="border-top: 1px dotted #888; width: 140px; margin: 0 auto 2px auto;"></div>
                </td>
            </tr>
        `;
    });

    const dateRangeText = startDate === endDate ? `Fecha: ${startDate}` : `Período: ${startDate} al ${endDate}`;

    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Planilla de Firmas de Asistencia</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    color: #000;
                    margin: 30px;
                    font-size: 10pt;
                }
                .school-title {
                    font-size: 14pt;
                    font-weight: bold;
                    color: #d32f2f;
                }
                .school-subtitle {
                    font-size: 9pt;
                    font-weight: bold;
                    margin-top: 2px;
                    text-transform: uppercase;
                    color: #555;
                    letter-spacing: 0.5px;
                }
                .sheet-title {
                    font-size: 12pt;
                    font-weight: bold;
                    text-align: center;
                    margin: 15px 0 10px 0;
                    text-transform: uppercase;
                    border-bottom: 2px solid #d32f2f;
                    padding-bottom: 6px;
                }
                .date-range {
                    font-size: 9.5pt;
                    font-weight: bold;
                    text-align: right;
                    margin-bottom: 12px;
                }
                .data-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                .data-table th {
                    border: 1px solid #000;
                    background-color: #f2f2f2;
                    padding: 8px;
                    font-size: 8.5pt;
                    font-weight: bold;
                    text-transform: uppercase;
                }
                .data-table td {
                    border: 1px solid #000;
                    padding: 8px;
                    font-size: 8.5pt;
                }
                .footer-signatures {
                    margin-top: 60px;
                    width: 100%;
                    display: flex;
                    justify-content: space-around;
                    font-size: 9.5pt;
                }
                .sig-box {
                    text-align: center;
                    width: 220px;
                }
                .sig-line {
                    border-top: 1px solid #000;
                    margin-top: 40px;
                    padding-top: 5px;
                    font-weight: bold;
                }
                .header-print {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    margin-bottom: 12px;
                    border-bottom: 3px solid #d32f2f;
                    padding-bottom: 12px;
                }
                .header-print img {
                    height: 65px;
                    width: auto;
                }
                @media print {
                    body { margin: 15px; }
                }
            </style>
        </head>
        <body>
            <div class="header-print">
                <img src="${window.location.href.split('admin.html')[0]}logo.png" alt="Logo Padre Otto Acosta" onerror="this.style.display='none'">
                <div>
                    <div class="school-title">ESCUELA DE EDUCACIÓN BÁSICA FISCOMISIONAL PADRE OTTO ACOSTA</div>
                    <div class="school-subtitle">Fe y Alegría Ecuador · Control de Asistencia del Personal</div>
                </div>
            </div>
            <div class="sheet-title">Planilla de Control y Firmas de Asistencia de Personal</div>
            <div class="date-range">${dateRangeText}</div>
            
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Colaborador</th>
                        <th>Cargo/Rol</th>
                        <th>Entrada</th>
                        <th>Salida</th>
                        <th>Estado</th>
                        <th>Firma del Colaborador</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHTML || '<tr><td colspan="7" style="text-align:center; padding: 20px;">No hay registros de asistencia para los filtros seleccionados.</td></tr>'}
                </tbody>
            </table>

            <div class="footer-signatures">
                <div class="sig-box">
                    <div class="sig-line">Dirección de la Institución</div>
                </div>
                <div class="sig-box">
                    <div class="sig-line">Responsable de Recursos Humanos</div>
                </div>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
};

DOM.btnPrintSignatures.addEventListener('click', printSignatureSheet);

// --- INICIALIZACIÓN ---
const initAdminPanel = () => {
    startClock();
    initNavigation();
    loadViewData('dashboard');
};

checkAuth();
lucide.createIcons();
