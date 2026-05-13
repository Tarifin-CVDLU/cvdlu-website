// CVDLU - Lógica de Reportes y Estadísticas
document.addEventListener('DOMContentLoaded', () => {
    // Menu Móvil (Corregido)
    const mobileMenu = document.getElementById('mobile-menu');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('#nav-menu a');

    if (mobileMenu && navMenu) {
        mobileMenu.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            // Cambiar icono
            const icon = mobileMenu.querySelector('i');
            if (navMenu.classList.contains('active')) {
                icon.classList.replace('fa-bars', 'fa-times');
            } else {
                icon.classList.replace('fa-times', 'fa-bars');
            }
        });

        // Cerrar menú al hacer clic en un enlace
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                const icon = mobileMenu.querySelector('i');
                icon.classList.replace('fa-times', 'fa-bars');
            });
        });
    }

    // Inicializar funciones
    cargarEstadisticas();
    
    // Configurar formularios
    setupForm("form-reporte", "status-reporte", "btn-reporte", true);
    setupForm("form-voluntario", "status-voluntario", "btn-voluntario", false);
});

// URL de tu Google Apps Script (ACTUALIZADA)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXr0tVhBtgi2su-x_2TKKLYNBi0E6J7PRCle3bolFvJKD50moKu-mSXHBGycCKFn-jOQ/exec";

function setupForm(formId, statusId, btnId, isReporte) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const statusDiv = document.getElementById(statusId);
        const btn = document.getElementById(btnId);
        const originalBtnText = btn.innerText;

        statusDiv.innerText = "Procesando...";
        statusDiv.className = "form-status";
        btn.disabled = true;
        btn.innerText = "Enviando...";

        try {
            // Obtener IP por seguridad
            let userIP = "Desconocida";
            try {
                const ipRes = await fetch("https://api.ipify.org?format=json");
                const ipData = await ipRes.json();
                userIP = ipData.ip;
            } catch(e) { console.log("No se pudo obtener la IP"); }

            const formData = new FormData(form);
            const payload = {
                tipo: isReporte ? "Reporte Ciudadano" : "Voluntario",
                nombre: formData.get("nombre") || "Anónimo",
                userIP: userIP,
                userAgent: navigator.userAgent // Información del dispositivo y navegador
            };

            if (isReporte) {
                payload.categoria = formData.get("categoria");
                payload.reporte = formData.get("reporte");
                
                const file = formData.get("archivo");
                if (file && file.size > 0) {
                    if (file.size > 40 * 1024 * 1024) throw new Error("Archivo muy grande (máx 40MB)");
                    
                    const progressContainer = document.getElementById("progress-container");
                    const bus = document.getElementById("progress-bus");
                    const percentText = document.getElementById("progress-percent");
                    if (progressContainer) progressContainer.style.display = "block";

                    const base64 = await toBase64(file);
                    payload.fileData = base64.split(",")[1];
                    payload.fileName = file.name;
                    payload.mimeType = file.type;
                    
                    let p = 0;
                    const interval = setInterval(() => {
                        p += 5;
                        if (p > 95) clearInterval(interval);
                        if (bus) bus.style.left = p + "%";
                        if (percentText) percentText.innerText = p + "%";
                    }, 200);
                }
            } else {
                payload.email = formData.get("email");
                payload.mensaje = formData.get("mensaje");
            }

            await fetch(GOOGLE_SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            statusDiv.className = "form-status success";
            if (isReporte) {
                statusDiv.innerText = "¡Enviado con éxito! Gracias por tu lucha.";
            } else {
                statusDiv.innerHTML = "¡Solicitud enviada con éxito! 🐝✨<br><br>Corre a revisar tu correo para el siguiente paso (¡y échale un ojo a la carpeta de <strong>SPAM</strong> por si las moscas!).";
            }
            form.reset();
            const progressContainer = document.getElementById("progress-container");
            if (progressContainer) progressContainer.style.display = "none";

        } catch (error) {
            statusDiv.className = "form-status error";
            statusDiv.innerText = "Error: " + error.message;
        } finally {
            btn.disabled = false;
            btn.innerText = originalBtnText;
        }
    });
}

async function cargarEstadisticas() {
    const container = document.getElementById("thermometer-container");
    const totalSpan = document.getElementById("total-reportes");
    if (!container || !totalSpan) return;

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL + "?action=stats");
        const data = await response.json();
        totalSpan.innerText = data.total;
        container.innerHTML = "";
        for (const [cat, cant] of Object.entries(data.categorias)) {
            const porc = data.total > 0 ? (cant / data.total) * 100 : 0;
            container.innerHTML += `
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.95rem; color: var(--primary-color); font-weight: 600;">
                        <span>${cat}</span>
                        <span style="font-weight: 800;">${cant}</span>
                    </div>
                    <div style="background: #333; height: 12px; border-radius: 6px; overflow: hidden;">
                        <div style="background: var(--primary-color); width: ${porc}%; height: 100%; transition: width 1s ease-out;"></div>
                    </div>
                </div>
            `;
        }
    } catch (e) {
        container.innerHTML = "<p style='color: #666; text-align: center;'>Estadísticas no disponibles por ahora.</p>";
    }
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// PROTECCIÓN BÁSICA DEL SITIO
document.addEventListener('contextmenu', event => event.preventDefault()); // Bloquea clic derecho
document.addEventListener('keydown', e => {
    // Bloquea Ctrl+U (Ver código), Ctrl+S (Guardar), Ctrl+Shift+I (Inspeccionar)
    if (e.ctrlKey && (e.key === 'u' || e.key === 's' || e.key === 'i' || e.key === 'J')) {
        e.preventDefault();
    }
    if (e.key === 'F12') e.preventDefault();
});
document.addEventListener('dragstart', e => e.preventDefault()); // Bloquea arrastrar imágenes

// =============================================
//  MEDIDOR DE PROGRESO — INICIATIVA CIUDADANA
// =============================================
const ETAPAS_INFO = {
    1: {
        img: 'iniciativa_etapa2_entrega.jpg',
        caption: 'Etapa 1 · 5 Feb 2026 — Entrega de la iniciativa con 1,000 firmas ciudadanas al Congreso de Nuevo León'
    },
    2: {
        img: 'iniciativa_etapa4_reunion.jpg',
        caption: 'Etapa 2 · 9 Feb 2026 — Reunión con la Diputada Aile Tamez, Presidenta de la Comisión de Movilidad'
    },
    3: {
        img: 'iniciativa_etapa3_estatus.jpg',
        caption: 'Etapa 3 · ACTUAL — Iniciativa turnada a la Comisión de Movilidad. En espera de la Junta de Gobierno'
    },
    4: {
        img: 'iniciativa_etapa3_estatus.jpg',
        caption: 'Etapa 4 · PRÓXIMO — Junta de Gobierno: presentación y evaluación de la iniciativa ciudadana'
    },
    5: {
        img: 'iniciativa_etapa5_ciudadanos.jpg',
        caption: 'Etapa 5 · META FINAL — Presentación al Pleno del Congreso. ¡Comparte, firma y exige transporte digno!'
    }
};

function abrirEtapa(num) {
    const modal  = document.getElementById('etapa-modal');
    const img    = document.getElementById('modal-img');
    const titulo = document.getElementById('modal-titulo');
    const info   = ETAPAS_INFO[num];
    if (!modal || !info) return;

    img.src          = info.img;
    img.alt          = info.caption;
    titulo.innerText = info.caption;

    modal.classList.add('abierto');
    document.body.style.overflow = 'hidden';
}

function cerrarEtapaBtn() {
    const modal = document.getElementById('etapa-modal');
    if (!modal) return;
    modal.classList.remove('abierto');
    document.body.style.overflow = '';
}

function cerrarEtapa(e) {
    // Solo cierra si se hizo clic en el fondo del modal (no en su contenido)
    if (e.target === document.getElementById('etapa-modal')) {
        cerrarEtapaBtn();
    }
}

// Cerrar con tecla Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') cerrarEtapaBtn();
});

