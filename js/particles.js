/* Particle system — confetti bursts on task complete & item unlock */
(function () {
    let canvas, ctx, particles = [], rafId = null;

    function init() {
        canvas = document.getElementById('particles-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);
    }

    function resize() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function spawn(x, y, count, colors) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
            const speed = 2 + Math.random() * 4;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 1,
                decay: 0.014 + Math.random() * 0.014,
                size: 3 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                shape: Math.random() > 0.5 ? 'c' : 'r',
                rot: Math.random() * Math.PI * 2,
                rotV: (Math.random() - 0.5) * 0.2,
            });
        }
        if (!rafId) tick();
    }

    function tick() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles = particles.filter(p => p.life > 0);
        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08;
            p.life -= p.decay;
            p.rot += p.rotV;
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            if (p.shape === 'c') {
                ctx.beginPath();
                ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            }
            ctx.restore();
        }
        rafId = particles.length > 0 ? requestAnimationFrame(tick) : null;
    }

    const COLORS = ['#e8835a', '#c7596e', '#e8a83e', '#5cb85c', '#5a8ee8', '#ffd700'];

    window.Particles = {
        init: init,
        burstAt: function (el) {
            if (!canvas) return;
            const r = el.getBoundingClientRect();
            spawn(r.left + r.width / 2, r.top + r.height / 2, 28, COLORS);
        },
        confettiBurst: function () {
            if (!canvas) return;
            for (let i = 0; i < 4; i++) {
                spawn(Math.random() * window.innerWidth, -10, 15, COLORS);
            }
        }
    };
})();
