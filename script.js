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
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby3EjWgoeTJ00l_0B94haeMNpXpUVdyA7xDxsVBkOgA7TU0Z4ylqt8seWT3Ia8jvwBPvQ/exec";

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

        let progressInterval = null; // Referencia al interval para poder limpiarlo
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
                userAgent: navigator.userAgent
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
                    progressInterval = setInterval(() => {
                        p += 5;
                        if (p > 95) clearInterval(progressInterval);
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
            if (progressInterval) clearInterval(progressInterval);
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
        // Mostrar cada problema específico (sin agrupar)
        for (const [cat, cant] of Object.entries(data.categorias)) {
            // Limpiar el prefijo "Camión - ", "Metro - ", etc. para mostrar solo el problema
            const nombre = cat.replace(/^(Camión|Metro|ECOVÍA|Pago) - /, '');
            const porc = data.total > 0 ? (cant / data.total) * 100 : 0;
            container.innerHTML += `
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.95rem; color: var(--primary-color); font-weight: 600;">
                        <span>${nombre}</span>
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
document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('keydown', e => {
    if (e.ctrlKey && (e.key === 'u' || e.key === 's' || e.key === 'i' || e.key === 'J')) {
        e.preventDefault();
    }
    if (e.key === 'F12') e.preventDefault();
    // Cierre del modal con Escape (fusionado para evitar listeners duplicados)
    if (e.key === 'Escape') cerrarEtapaBtn();
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
        img: null,
        caption: 'Etapa 4 · Junta de Gobierno — Seguimos esperando la fecha de la siguiente junta. ¡Tu firma suma! 🐝',
        mensaje: '⏳ Seguimos esperando la fecha de la siguiente Junta de Gobierno.\n\nEn cuanto tengamos confirmación, lo publicaremos en nuestras redes sociales. ¡Mantente pendiente y sigue sumando tu firma!'
    },
    5: {
        img: null,
        caption: 'Etapa 5 · META FINAL — Presentación al Pleno del Congreso. ¡Comparte, firma y exige transporte digno!',
        mensaje: '🏛️ Pleno en el Congreso (Meta Final)\n\nUna vez que la iniciativa sea aprobada por la Junta de Gobierno y la Comisión de Movilidad, pasará al Pleno del Congreso para ser votada por todos los diputados.\n\n¡Esta es nuestra meta final y para lograrla necesitamos la presión de todos! ¡Comparte y firma!'
    }
};

function abrirEtapa(num) {
    const modal  = document.getElementById('etapa-modal');
    const img    = document.getElementById('modal-img');
    const titulo = document.getElementById('modal-titulo');
    const msgEl  = document.getElementById('modal-mensaje');
    const info   = ETAPAS_INFO[num];
    if (!modal || !info) return;

    if (info.img) {
        img.src     = info.img;
        img.alt     = info.caption;
        img.style.display = 'block';
        if (msgEl) msgEl.style.display = 'none';
    } else {
        img.style.display = 'none';
        if (msgEl) {
            msgEl.innerText  = info.mensaje || info.caption;
            msgEl.style.display = 'block';
        }
    }
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

// NOTA: El cierre con Escape está integrado en el listener keydown de protección del sitio (arriba).

function scrollCarousel(id, direction) {
    const container = document.getElementById(id);
    if (!container) return;
    const scrollAmount = 350 + 30; // card width + gap
    container.scrollBy({
        left: direction * scrollAmount,
        behavior: 'smooth'
    });
}
