const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let particles = [];

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

class Particle {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.size = Math.random() * 4 + 1;
        this.speedX = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
    }
    update() { this.x += this.speedX; this.y += this.speedY; if(this.size > 0.1) this.size -= 0.05; }
    draw() { ctx.fillStyle = '#cccccc'; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); }
}

window.addEventListener('mousemove', (e) => { particles.push(new Particle(e.x, e.y)); });

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, i) => { p.update(); p.draw(); if(p.size <= 0.1) particles.splice(i, 1); });
    requestAnimationFrame(animate);
}
animate();

