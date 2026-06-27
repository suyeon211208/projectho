document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('spaceCanvas');
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    const PARTICLE_COUNT = 5000;

    let rotationX = 0;
    let rotationY = 0;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    class Particle {
        constructor(index) {
            this.index = index;
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.origX = 0; this.origY = 0; this.origZ = 0;
            this.tx = this.x; this.ty = this.y;
            this.sz = Math.random() * 1.5 + 0.5;
            this.a = Math.random() * 0.6 + 0.3;
            this.ease = Math.random() * 0.05 + 0.015;
            this.group = this.index % 6; // 0:Mercury~5:Saturn
        }

        update(cx, cy) {
            const cosX = Math.cos(rotationX);
            const sinX = Math.sin(rotationX);
            const cosY = Math.cos(rotationY);
            const sinY = Math.sin(rotationY);

            let rx = this.origX * cosY + this.origZ * sinY;
            let rz = -this.origX * sinY + this.origZ * cosY;
            let ry = this.origY * cosX - rz * sinX;

            this.tx = cx + rx;
            this.ty = cy + ry;

            this.x += (this.tx - this.x) * this.ease;
            this.y += (this.ty - this.y) * this.ease;
        }

        draw(sectionId) {
            if (sectionId === 'mercury') {
                ctx.fillStyle = Math.random() > 0.5 ? `rgba(100, 150, 255, ${this.a})` : `rgba(180, 160, 130, ${this.a})`;
            } else if (sectionId === 'venus') {
                const rand = Math.random();
                ctx.fillStyle = rand < 0.4 ? `rgba(255, 250, 240, ${this.a})` : (rand < 0.8 ? `rgba(210, 180, 140, ${this.a})` : `rgba(139, 69, 19, ${this.a})`);
            } else if (sectionId === 'earth') {
                const rand = Math.random();
                ctx.fillStyle = rand < 0.5 ? `rgba(0, 100, 200, ${this.a})` : (rand < 0.8 ? `rgba(34, 139, 34, ${this.a})` : `rgba(255, 255, 255, ${this.a})`);
            } else if (sectionId === 'mars') {
                const rand = Math.random();
                ctx.fillStyle = rand < 0.4 ? `rgba(220, 85, 57, ${this.a})` : (rand < 0.7 ? `rgba(160, 82, 45, ${this.a})` : `rgba(80, 40, 30, ${this.a})`);
            } else if (sectionId === 'jupiter') {
                const relY = (this.ty - (height/2));
                if (Math.abs(relY) < 30) ctx.fillStyle = `rgba(200, 160, 120, ${this.a})`;
                else if (Math.abs(relY) < 70) ctx.fillStyle = `rgba(160, 100, 60, ${this.a})`;
                else ctx.fillStyle = `rgba(230, 210, 180, ${this.a})`;
            } else if (sectionId === 'saturn') {
                const isRing = Math.random() > 0.7;
                ctx.fillStyle = isRing ? `rgba(220, 220, 230, ${this.a})` : `rgba(210, 180, 140, ${this.a})`;
            } else {
                ctx.fillStyle = `rgba(255, 255, 255, ${this.a})`;
            }

            ctx.beginPath();
            ctx.arc(this.x, this.y, this.sz, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function resize() { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; }
    window.addEventListener('resize', resize);
    resize();

    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle(i));

    window.addEventListener('mousedown', (e) => { isDragging = true; lastMouseX = e.clientX; lastMouseY = e.clientY; });
    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            rotationY += (e.clientX - lastMouseX) * 0.005;
            rotationX -= (e.clientY - lastMouseY) * 0.005;
            lastMouseX = e.clientX; lastMouseY = e.clientY;
        }
    });
    window.addEventListener('mouseup', () => isDragging = false);

    let currentSectionId = 'hero';
    let cx = width / 2, cy = height / 2;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                currentSectionId = entry.target.id;
                const idx = parseInt(entry.target.dataset.index);
                cx = (idx === 0) ? width / 2 : ((idx % 2 === 0) ? width * 0.25 : width * 0.75);
                cy = height / 2;

                particles.forEach((p, i) => {
                    const angle = Math.random() * Math.PI * 2;
                    const phi = Math.random() * Math.PI;

                    if (currentSectionId === 'hero') {
                        // [행성계 배치]: 궤도 거리와 크기 비례 적용
                        const orbitRadius = 100 + (p.group * 85);
                        const orbitAngle = (i / PARTICLE_COUNT) * Math.PI * 20;
                        const sizes = [15, 25, 25, 20, 50, 40];
                        const r = sizes[p.group];
                        
                        if (p.group === 5) { // Saturn: 고리+구체 혼합
                            const isRing = Math.random() > 0.4;
                            if (isRing) {
                                const ringR = orbitRadius + (Math.random() - 0.5) * 60;
                                p.origX = Math.cos(angle) * ringR;
                                p.origY = (Math.random() - 0.5) * 15;
                                p.origZ = Math.sin(angle) * ringR;
                            } else {
                                p.origX = (Math.cos(orbitAngle) * orbitRadius) + r * Math.sin(phi) * Math.cos(angle);
                                p.origY = r * Math.sin(phi) * Math.sin(angle);
                                p.origZ = (Math.sin(orbitAngle) * orbitRadius) + r * Math.cos(phi);
                            }
                        } else {
                            p.origX = (Math.cos(orbitAngle) * orbitRadius) + r * Math.sin(phi) * Math.cos(angle);
                            p.origY = r * Math.sin(phi) * Math.sin(angle);
                            p.origZ = (Math.sin(orbitAngle) * orbitRadius) + r * Math.cos(phi);
                        }
                    } 
                    else if (currentSectionId === 'saturn') {
                        const isRing = Math.random() > 0.4;
                        if (isRing) {
                            const r = 90 + Math.random() * 60;
                            p.origX = Math.cos(angle) * r;
                            p.origY = (Math.random() - 0.5) * 15;
                            p.origZ = Math.sin(angle) * r;
                        } else {
                            const r = 50;
                            p.origX = r * Math.sin(phi) * Math.cos(angle);
                            p.origY = r * Math.sin(phi) * Math.sin(angle);
                            p.origZ = r * Math.cos(phi);
                        }
                    } 
                    else if (currentSectionId === 'mars') {
                        const r = 130;
                        p.origX = r * Math.sin(phi) * Math.cos(angle) * 1.5;
                        p.origY = r * Math.sin(phi) * Math.sin(angle) * 0.6;
                        p.origZ = r * Math.cos(phi);
                    } 
                    else {
                        const r = 110;
                        p.origX = r * Math.sin(phi) * Math.cos(angle);
                        p.origY = r * Math.sin(phi) * Math.sin(angle);
                        p.origZ = r * Math.cos(phi);
                    }
                });
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.section').forEach(s => observer.observe(s));

    function animate() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, width, height);
        particles.forEach(p => {
            p.update(cx, cy);
            p.draw(currentSectionId);
        });
        requestAnimationFrame(animate);
    }
    animate();
});