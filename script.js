// Visitor Counter Simulation
function updateCounter() {
    let count = localStorage.getItem('visitorCount');
    if (!count) {
        count = 1248; // Starting number
    }
    count = parseInt(count) + 1;
    localStorage.setItem('visitorCount', count);
    
    const counterElement = document.getElementById('visitor-count');
    if (counterElement) {
        counterElement.innerText = count.toLocaleString();
    }
}

// Scroll Reveal
function reveal() {
    var reveals = document.querySelectorAll("section");
    for (var i = 0; i < reveals.length; i++) {
        var windowHeight = window.innerHeight;
        var elementTop = reveals[i].getBoundingClientRect().top;
        var elementVisible = 100;
        if (elementTop < windowHeight - elementVisible) {
            reveals[i].style.opacity = "1";
            reveals[i].style.transform = "translateY(0)";
        }
    }
}

// Initialize styles for reveal
document.querySelectorAll("section").forEach(sec => {
    sec.style.opacity = "0";
    sec.style.transform = "translateY(20px)";
    sec.style.transition = "1s all ease";
});

window.addEventListener("scroll", reveal);
window.addEventListener("load", () => {
    reveal();
    updateCounter();
});

// Google Apps Script URL (El usuario debe reemplazar esto)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzDGG2N3SWUu3mgHNXHf3e8Pvd2GEBVIQwER6QrLeN0R8GNkuQVMndq8cgm6y1neX7IFQ/exec";

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

async function handleFormSubmit(e, isReporte) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const statusDiv = form.querySelector('.form-status');
    const originalBtnText = btn.innerText;

    btn.innerText = "Enviando...";
    btn.disabled = true;
    statusDiv.className = "form-status loading";
    statusDiv.innerText = isReporte ? "Subiendo reporte... por favor espera." : "Enviando...";

    try {
        let payload = {
            tipo: isReporte ? "Reporte Ciudadano" : "Voluntario",
            nombre: form.querySelector('input[name="nombre"]').value
        };

        if (isReporte) {
            payload.categoria = form.querySelector('select[name="categoria"]').value;
            payload.reporte = form.querySelector('textarea[name="reporte"]').value;
            const fileInput = form.querySelector('input[name="archivo"]');
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                payload.fileName = file.name;
                payload.mimeType = file.type;
                statusDiv.innerText = "Procesando archivo... por favor no cierres la ventana.";
                
                // Mostrar contenedor de progreso
                const progressContainer = document.getElementById('progress-container');
                if (progressContainer) {
                    progressContainer.style.display = 'block';
                    document.getElementById('progress-bus').style.left = '0%';
                    document.getElementById('progress-percent').innerText = '0%';
                }
                
                payload.fileData = await getBase64(file);
            }
        } else {
            payload.email = form.querySelector('input[name="email"]').value;
            payload.mensaje = form.querySelector('textarea[name="mensaje"]').value;
        }

        if (GOOGLE_SCRIPT_URL === "URL_DE_TU_SCRIPT_AQUI") {
            throw new Error("Falta configurar la URL de Google Script");
        }

        // Animación simulada del camioncito mientras enviamos
        const bus = document.getElementById('progress-bus');
        const text = document.getElementById('progress-percent');
        let progress = 0;
        let progressInterval;
        
        if (isReporte && bus && text) {
            progressInterval = setInterval(() => {
                progress += Math.floor(Math.random() * 15) + 5;
                if (progress > 90) progress = 90;
                bus.style.left = progress + '%';
                text.innerText = progress + '%';
            }, 600);
        }

        // Usamos fetch en modo no-cors para evitar los bloqueos estrictos de seguridad del navegador
        await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "text/plain"
            },
            body: JSON.stringify(payload)
        });

        if (progressInterval) clearInterval(progressInterval);
        if (isReporte && bus && text) {
            bus.style.left = '100%';
            text.innerText = '100%';
        }

        statusDiv.className = "form-status success";
        statusDiv.innerText = "¡Enviado con éxito! Gracias por tu participación.";
        form.reset();

    } catch (error) {
        if (typeof progressInterval !== 'undefined') clearInterval(progressInterval);
        console.error(error);
        statusDiv.className = "form-status error";
        statusDiv.innerText = error.message.includes("Falta configurar") 
            ? "Error: Falta configurar la URL en el script."
            : "Error de conexión. Verifica tu internet e inténtalo de nuevo.";
    } finally {
        btn.innerText = originalBtnText;
        btn.disabled = false;
        
        const progressContainer = document.getElementById('progress-container');
        if (progressContainer) progressContainer.style.display = 'none';
        
        setTimeout(() => {
            if(statusDiv.className.includes("success")) statusDiv.style.display = 'none';
        }, 8000);
    }
}

const formReporte = document.getElementById('form-reporte');
if (formReporte) {
    formReporte.addEventListener('submit', (e) => handleFormSubmit(e, true));
}

const formVoluntario = document.getElementById('form-voluntario');
if (formVoluntario) {
    formVoluntario.addEventListener('submit', (e) => handleFormSubmit(e, false));
}

// Cargar Estadísticas (Termómetro)
async function cargarEstadisticas() {
    if (GOOGLE_SCRIPT_URL === "URL_DE_TU_SCRIPT_AQUI") return;
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL + "?action=stats");
        const data = await response.json();
        
        document.getElementById('total-reportes').innerText = data.total;
        
        const container = document.getElementById('thermometer-container');
        if (data.total === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Aún no hay reportes registrados.</p>';
            return;
        }
        
        container.innerHTML = '';
        
        // Ordenar por cantidad de mayor a menor
        const categoriasOrdenadas = Object.keys(data.categorias).sort((a, b) => data.categorias[b] - data.categorias[a]);
        
        // Encontrar el máximo para escalar las barras
        const maxCount = data.categorias[categoriasOrdenadas[0]];
        
        categoriasOrdenadas.forEach(cat => {
            const count = data.categorias[cat];
            if (count > 0) {
                const percent = (count / maxCount) * 100;
                
                const item = document.createElement('div');
                item.className = 'thermometer-item';
                item.innerHTML = `
                    <div class="thermometer-label">
                        <span>${cat}</span>
                        <span style="font-weight: bold; color: var(--primary-color);">${count}</span>
                    </div>
                    <div class="thermometer-bar-container">
                        <div class="thermometer-bar-fill" style="width: 0%;"></div>
                    </div>
                `;
                container.appendChild(item);
                
                // Animar barra
                setTimeout(() => {
                    item.querySelector('.thermometer-bar-fill').style.width = percent + '%';
                }, 100);
            }
        });
        
    } catch (e) {
        console.log("No se pudieron cargar las estadísticas:", e);
        const container = document.getElementById('thermometer-container');
        if(container) container.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Estadísticas no disponibles en este momento.</p>';
    }
}

// Inicializar estadísticas
document.addEventListener('DOMContentLoaded', cargarEstadisticas);

