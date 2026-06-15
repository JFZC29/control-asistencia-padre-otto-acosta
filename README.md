# Sistema de Control de Asistencia — Padre Otto Acosta

Sistema web de registro y control de asistencia del personal docente de la **Escuela de Educación Básica Fiscomisional Padre Otto Acosta** — Fe y Alegría Ecuador.

## 🚀 Características

- 📟 **Terminal de Marcaje** — Registro de entrada/salida mediante PIN de 4 dígitos
- 🛡️ **Panel Administrativo** — Dashboard con métricas, gestión de personal, historial y reportes
- 🖨️ **Planilla de Firmas** — Impresión de registros con espacio para firma de cada colaborador
- 📊 **Gráficos semanales** — Visualización de puntualidad con Chart.js
- 🌙 **Modo Oscuro/Claro** — Toggle integrado
- 🔊 **Retroalimentación de voz** — Síntesis de voz en español al registrar asistencia
- 💾 **Sin base de datos** — Persistencia 100% en LocalStorage del navegador

## 📋 Personal Registrado

| Nombre | Cargo | PIN |
|--------|-------|-----|
| Narcisa Lolaida Cedeño Andrade | Docente | 8956 |
| Johao Fernando Zambrano Cedeño | Directivo | 3871 |
| Cristhian Alfredo Coveña Cedeño | Docente | 5676 |

## ▶️ Cómo ejecutar

Requiere Python instalado:

```bash
python -m http.server 3000
```

Luego abre en tu navegador:
- **Terminal:** http://localhost:3000/index.html
- **Admin:** http://localhost:3000/admin.html

**Credenciales admin:** `admin` / `admin123`

## 🗂️ Estructura

```
├── index.html       # Terminal de marcaje
├── admin.html       # Panel administrativo
├── logo.png         # Logo oficial institucional
├── css/
│   └── styles.css   # Estilos del sistema
└── js/
    ├── data.js      # Persistencia y datos semilla
    ├── helpers.js   # Utilidades y exportación CSV
    ├── terminal.js  # Lógica de la terminal
    └── admin.js     # Lógica del panel admin
```

## 🏫 Institución

**Escuela de Educación Básica Fiscomisional Padre Otto Acosta**  
Fe y Alegría Ecuador
