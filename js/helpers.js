// js/helpers.js

/**
 * Obtener la fecha actual en formato YYYY-MM-DD local
 */
export const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Obtener los últimos N días escolares (excluyendo fines de semana) anteriores a la fecha dada o actual
 */
export const getPastSchoolDays = (count = 5, date = new Date()) => {
    const dates = [];
    const tempDate = new Date(date.getTime());
    let added = 0;
    while (added < count) {
        tempDate.setDate(tempDate.getDate() - 1);
        const day = tempDate.getDay();
        if (day !== 0 && day !== 6) { // Excluir Sáb (6) y Dom (0)
            dates.unshift(getLocalDateString(tempDate));
            added++;
        }
    }
    return dates;
};

/**
 * Formatear una fecha YYYY-MM-DD a un formato amigable como "Lunes, 15 de Junio de 2026"
 */
export const formatFriendlyDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    // Usar Date.UTC para evitar desajustes de zona horaria
    const date = new Date(Date.UTC(year, month - 1, day));
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
    return date.toLocaleDateString('es-ES', options);
};

/**
 * Formatear la hora de formato HH:MM:SS a formato de 12 horas con AM/PM (ej. 07:45 AM)
 */
export const formatTime12h = (timeStr) => {
    if (!timeStr) return '--:--';
    const [hour, min] = timeStr.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${String(hour12).padStart(2, '0')}:${String(min).padStart(2, '0')} ${ampm}`;
};

/**
 * Calcular la diferencia en minutos entre dos horas (HH:MM:SS o HH:MM)
 */
export const getMinutesDifference = (timeStart, timeEnd) => {
    const [h1, m1] = timeStart.split(':').map(Number);
    const [h2, m2] = timeEnd.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
};

/**
 * Determinar el estado de asistencia basándose en la hora de llegada,
 * hora programada y tolerancia (en minutos).
 * Retorna { status: 'A tiempo' | 'Tarde', delay: minutos }
 */
export const evaluateCheckIn = (arrivalTime, scheduleCheckIn, toleranceMinutes) => {
    const diff = getMinutesDifference(scheduleCheckIn, arrivalTime);
    if (diff <= toleranceMinutes) {
        return {
            status: 'A tiempo',
            delay: 0
        };
    } else {
        return {
            status: 'Tarde',
            // El retraso se calcula completo desde la hora de entrada oficial
            delay: diff
        };
    }
};

/**
 * Descargar un arreglo de objetos como archivo CSV con formato UTF-8 (soporte para eñes y tildes)
 */
export const exportToCSV = (filename, headers, dataArray) => {
    let csvContent = '\uFEFF'; // BOM para asegurar que Excel abra el archivo en UTF-8
    csvContent += headers.join(',') + '\n';

    dataArray.forEach(row => {
        const rowContent = row.map(val => {
            // Reemplazar comillas y envolver en comillas dobles si contiene comas o saltos de línea
            let cell = val === null || val === undefined ? '' : String(val);
            cell = cell.replace(/"/g, '""');
            if (cell.includes(',') || cell.includes('\n') || cell.includes('"')) {
                cell = `"${cell}"`;
            }
            return cell;
        }).join(',');
        csvContent += rowContent + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
