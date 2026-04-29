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

        // Enviamos la petición POST usando XMLHttpRequest para tener progreso
        await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', GOOGLE_SCRIPT_URL, true);
            
            xhr.upload.addEventListener("progress", function(e) {
                if (e.lengthComputable && isReporte) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    const bus = document.getElementById('progress-bus');
                    const text = document.getElementById('progress-percent');
                    if (bus) bus.style.left = percentComplete + '%';
                    if (text) text.innerText = percentComplete + '%';
                }
            });

            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.responseText);
                } else {
                    reject(new Error("El servidor rechazó la conexión (Status " + xhr.status + "). Es posible que el archivo sea demasiado pesado o falten permisos."));
                }
            };
            xhr.onerror = function() {
                reject(new Error("Error de conexión. Si estás probando desde un archivo local, Google bloquea el envío. Súbelo a GitHub y pruébalo en la web, o revisa que el video no pese más de 40MB."));
            };

            xhr.send(JSON.stringify(payload));
        });

        statusDiv.className = "form-status success";
        statusDiv.innerText = "¡Enviado con éxito! Gracias por tu participación.";
        form.reset();

    } catch (error) {
        console.error(error);
        statusDiv.className = "form-status error";
        statusDiv.innerText = error.message.includes("Falta configurar") 
            ? "Error: Falta configurar la URL en el script."
            : "Error: " + error.message;
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
