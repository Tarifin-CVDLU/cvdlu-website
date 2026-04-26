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

// Form Submission handling (Visual feedback)
const forms = document.querySelectorAll('form');
forms.forEach(form => {
    form.addEventListener('submit', (e) => {
        // Formspree handles the actual submission, but we can log it
        console.log("Formulario enviado a cvdlu.buzon@gmail.com");
    });
});
