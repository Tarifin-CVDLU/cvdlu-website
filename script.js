// CVDLU - Lógica de Reportes y Estadísticas

// Función para mostrar notificaciones Toast
function mostrarToast(mensaje, tipo = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    
    let icon = 'info-circle';
    if (tipo === 'success') icon = 'check-circle';
    if (tipo === 'error') icon = 'exclamation-circle';
    
    toast.innerHTML = `<i class="fas fa-${icon}"></i> <span>${mensaje}</span>`;
    container.appendChild(toast);
    
    // Animar entrada
    requestAnimationFrame(() => toast.classList.add('show'));
    
    // Remover tras 4 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

document.addEventListener('DOMContentLoaded', () => {
    // Registro de Service Worker (PWA)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.log('Fallo al registrar SW:', err);
        });
    }

    // Lógica para Prompt de Instalación PWA
    let deferredPrompt;
    const pwaBanner = document.getElementById('pwa-install-banner');
    const pwaInstallBtn = document.getElementById('pwa-install-btn');
    const pwaCloseBtn = document.getElementById('pwa-close-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevenir el banner nativo de Chrome
        e.preventDefault();
        // Guardar el evento
        deferredPrompt = e;
        
        // Mostrar nuestro banner si el usuario no lo ha cerrado antes
        if (localStorage.getItem('pwa-prompt-closed') !== 'true' && pwaBanner) {
            pwaBanner.style.display = 'flex';
        }
    });

    if (pwaInstallBtn && pwaCloseBtn) {
        pwaCloseBtn.addEventListener('click', () => {
            pwaBanner.style.display = 'none';
            localStorage.setItem('pwa-prompt-closed', 'true');
        });

        pwaInstallBtn.addEventListener('click', async () => {
            pwaBanner.style.display = 'none';
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`Respuesta al instalar PWA: ${outcome}`);
                deferredPrompt = null;
            }
        });
    }
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

    // Validación de peso de archivo en tiempo real
    const archivoInput = document.getElementById("archivo-reporte");
    const statusReporte = document.getElementById("status-reporte");
    if (archivoInput && statusReporte) {
        archivoInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file && file.size > 40 * 1024 * 1024) {
                mostrarToast("El archivo supera el límite de 40MB.", "error");
                statusReporte.className = "form-status error";
                statusReporte.innerText = "Error: El archivo es muy grande.";
                statusReporte.style.display = "block";
                archivoInput.value = ""; // Limpiar la selección de archivo
            } else {
                statusReporte.style.display = "none";
                statusReporte.innerText = "";
            }
        });
    }
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

        // Limpiar mensajes visuales previos
        if (statusDiv) {
            statusDiv.innerText = "Procesando...";
            statusDiv.className = "form-status";
            statusDiv.style.display = "block";
        }
        
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
            
            // Verificación del Honeypot (Anti-Spam)
            if (formData.get("telefono_falso")) {
                console.warn("Spam detectado");
                throw new Error("Petición inválida.");
            }

            // Generar fecha y hora actual
            const fechaActual = new Date().toLocaleString('es-MX', { 
                timeZone: 'America/Monterrey', 
                dateStyle: 'medium', 
                timeStyle: 'medium' 
            });

            const payload = {
                tipo: isReporte ? "Reporte Ciudadano" : "Voluntario",
                nombre: formData.get("nombre") || "Anónimo",
                userIP: userIP,
                userAgent: getDeviceName(),
                fechaEnvio: fechaActual
            };

            if (isReporte) {
                payload.categoria = formData.get("categoria");
                
                // Recopilar ubicación si existe
                const ubicacion = formData.get("ubicacion") || "No especificada";
                
                // Anexamos la fecha y ubicación al texto del reporte
                payload.reporte = formData.get("reporte") + "\n\n📍 Ubicación: " + ubicacion + "\n🕒 Fecha de envío: " + fechaActual;
                
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

            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8"
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`Error en el servidor (${response.status})`);
            }

            if (statusDiv) statusDiv.style.display = "none"; // Ocultamos texto plano y usamos Toast
            
            if (isReporte) {
                mostrarToast("¡Enviado con éxito! Gracias por tu lucha.", "success");
            } else {
                mostrarToast("¡Solicitud enviada! Revisa tu correo electrónico (incluso en SPAM).", "success");
            }
            
            form.reset();
            const progressContainer = document.getElementById("progress-container");
            if (progressContainer) progressContainer.style.display = "none";

        } catch (error) {
            if (statusDiv) {
                statusDiv.className = "form-status error";
                statusDiv.innerText = "Error: " + error.message;
            }
            mostrarToast("Fallo al enviar: " + error.message, "error");
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
        if (typeof Chart === 'undefined') {
            throw new Error("Chart.js no está cargado");
        }

        const escapeHTML = (str) => {
            return str.replace(/[&<>'"]/g, 
                tag => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    "'": '&#39;',
                    '"': '&quot;'
                }[tag] || tag)
            );
        };

        const response = await fetch(GOOGLE_SCRIPT_URL + "?action=stats");
        const data = await response.json();
        totalSpan.innerText = data.total;
        container.innerHTML = "";
        
        // Mapeo para unificar categorías históricas y estandarizadas
        const unifiedCategories = {};
        const mapCategory = (cat) => {
            const mapping = {
                "Error al pagar con app": "Pago - Falla en app/tarjeta",
                "Pago - Falla en lector de tarjeta": "Pago - Falla en lector de tarjeta",
                "Mala frecuencia camión": "Camión - Frecuencia / Tiempo de espera",
                "Falla de camión / Unidad en mal estado o sucia": "Camión - Unidad en mal estado o sucia",
                "Falla en metro": "Metro - Falla o retraso en el servicio",
                "Falla de metro / Retraso en el servicio": "Metro - Falla o retraso en el servicio",
                "Frecuencia / Tiempo de espera": "Camión - Frecuencia / Tiempo de espera",
                "Mal servicio / Conductor": "Camión - Mal servicio / Conductor",
                "Accesibilidad": "Camión - Accesibilidad", // Histórico
                "Otra falla/problema": "Otros - Falla o problema",
                "Felicitación": "Otros - Felicitación / Agradecimiento"
            };
            return mapping[cat] || cat;
        };

        for (const [cat, cant] of Object.entries(data.categorias)) {
            const unifiedName = mapCategory(cat);
            unifiedCategories[unifiedName] = (unifiedCategories[unifiedName] || 0) + cant;
        }

        // Ordenar por cantidad de mayor a menor
        let sortedCategories = Object.entries(unifiedCategories)
            .filter(([_, cant]) => cant > 0)
            .sort((a, b) => b[1] - a[1]);

        // Agrupar categorías menores si hay demasiadas (más de 6)
        const maxCategoriasVisibles = 6;
        let finalCategories = [];
        let otrosTotal = 0;

        if (sortedCategories.length > maxCategoriasVisibles) {
            finalCategories = sortedCategories.slice(0, maxCategoriasVisibles - 1);
            const sobrantes = sortedCategories.slice(maxCategoriasVisibles - 1);
            for (const [_, cant] of sobrantes) {
                otrosTotal += cant;
            }
            if (otrosTotal > 0) {
                finalCategories.push(["Otros reportes menores", otrosTotal]);
            }
        } else {
            finalCategories = sortedCategories;
        }

        // Estructura HTML de la dona y leyenda
        container.innerHTML = `
            <div class="thermometer-layout">
                <div class="chart-wrapper">
                    <canvas id="chart-termometro"></canvas>
                    <div class="chart-center-text">
                        <span id="center-total">${data.total}</span>
                        <span class="center-label">Reportes</span>
                    </div>
                </div>
                <div id="chart-legend" class="chart-legend"></div>
            </div>
        `;

        // Colores premium y armoniosos para la dona
        const colorPalette = [
            '#FFCC00', // Amarillo Colectivo (CVDLU)
            '#FF8800', // Naranja
            '#FF4444', // Rojo / Coral
            '#00D2FF', // Celeste
            '#00E676', // Verde brillante
            '#B388FF'  // Violeta suave
        ];
        const colorOtros = '#666666'; // Gris neutro para "Otros"

        const labels = finalCategories.map(item => item[0]);
        const values = finalCategories.map(item => item[1]);
        const backgroundColors = finalCategories.map((item, index) => {
            if (item[0] === "Otros reportes menores") return colorOtros;
            return colorPalette[index % colorPalette.length];
        });

        const ctx = document.getElementById('chart-termometro').getContext('2d');
        const myChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: backgroundColors,
                    borderWidth: 2,
                    borderColor: '#111',
                    hoverOffset: 12
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleFont: { family: 'Outfit', size: 14, weight: 'bold' },
                        bodyFont: { family: 'Outfit', size: 13 },
                        padding: 12,
                        cornerRadius: 8,
                        borderColor: 'rgba(255, 204, 0, 0.3)',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return ` ${value} reportes (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        // Crear la leyenda interactiva
        const legendContainer = document.getElementById('chart-legend');
        finalCategories.forEach((item, index) => {
            const label = item[0];
            const cant = item[1];
            const porc = data.total > 0 ? ((cant / data.total) * 100).toFixed(1) : 0;
            const color = backgroundColors[index];

            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <div class="legend-left">
                    <div class="legend-color-dot" style="background-color: ${color};"></div>
                    <span class="legend-text">${escapeHTML(label)}</span>
                </div>
                <div class="legend-right">
                    <span class="legend-count">${cant}</span>
                    <span class="legend-percentage">${porc}%</span>
                </div>
            `;

            // Efecto hover interactivo cruzado (Leyenda -> Gráfico)
            legendItem.addEventListener('mouseenter', () => {
                myChart.setActiveElements([{ datasetIndex: 0, index: index }]);
                myChart.tooltip.setActiveElements([{ datasetIndex: 0, index: index }], { x: 0, y: 0 });
                myChart.update();
                legendItem.classList.add('highlighted');
            });

            legendItem.addEventListener('mouseleave', () => {
                myChart.setActiveElements([]);
                myChart.tooltip.setActiveElements([]);
                myChart.update();
                legendItem.classList.remove('highlighted');
            });

            legendContainer.appendChild(legendItem);
        });

    } catch (e) {
        console.error("Error al cargar estadísticas:", e);
        container.innerHTML = "<p style='color: #666; text-align: center;'>Estadísticas no disponibles por ahora.</p>";
    }
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        // Si no es imagen (ej. video), lo convierte normal
        if (!file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            return;
        }
        
        // Si es imagen, la comprime usando Canvas
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                // Comprime como JPEG al 70% de calidad
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
}

function getDeviceName() {
    const ua = navigator.userAgent;
    let browser = "Desconocido";
    let os = "OS Desconocido";

    // Detectar Navegador
    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("OPR/") || ua.includes("Opera/")) browser = "Opera";
    else if (ua.includes("Edg/")) browser = "Edge";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari")) browser = "Safari";

    // Detectar Sistema Operativo
    if (ua.includes("Win")) os = "Windows";
    else if (ua.includes("Mac")) os = "MacOS";
    else if (ua.includes("X11")) os = "UNIX";
    else if (ua.includes("Linux")) os = "Linux";
    
    // Sobrescribir si es móvil
    if (ua.includes("Android")) os = "Android";
    else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";

    return os + " - " + browser;
}

// PROTECCIÓN BÁSICA DEL SITIO
document.addEventListener('contextmenu', event => event.preventDefault());

// Cierre del modal con Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') cerrarEtapaBtn();
});

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
