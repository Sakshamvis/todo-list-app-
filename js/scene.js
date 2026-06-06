/* Scene evolution engine — milestones, tiers, desk item management */
(function () {
    var MILESTONES = [
        { xp: 1,  id: 'i-mat',        name: 'Desk Mat',            tier: null },
        { xp: 2,  id: 'i-mouse',      name: 'Mouse',               tier: null },
        { xp: 3,  id: 'i-mug',        name: 'Coffee Mug',          tier: null },
        { xp: 5,  id: 'i-keyboard',   name: 'Keyboard',            tier: null },
        { xp: 7,  id: 'i-plant',      name: 'Desk Plant',          tier: null },
        { xp: 9,  id: 'i-tablet',     name: 'Tablet',              tier: null },
        { xp: 11, id: 'i-headphones', name: 'Headphones',          tier: null },
        { xp: 13, id: 'i-tablet',     name: 'Tablet Air',          tier: 'air' },
        { xp: 15, id: 'i-laptop',     name: 'Laptop',              tier: null },
        { xp: 17, id: 'i-monitor',    name: 'Monitor',             tier: null },
        { xp: 19, id: 'i-mouse',      name: 'Pro Mouse',           tier: 'tier-2' },
        { xp: 21, id: 'i-keyboard',   name: 'Mechanical Keyboard', tier: 'tier-2' },
        { xp: 23, id: 'i-plant',      name: 'Lush Plant',          tier: 'tier-2' },
        { xp: 24, id: 'i-tablet',     name: 'Tablet Pro + Pencil', tier: 'pro' },
        { xp: 26, id: ['i-speaker-l','i-speaker-r'], name: 'Speakers', tier: null },
        { xp: 28, id: 'i-monitor',    name: 'Ultrawide Monitor',   tier: 'ultrawide' },
        { xp: 30, id: 'i-laptop',     name: 'Laptop Pro',          tier: 'pro' },
        { xp: 32, id: 'i-rgb',        name: 'RGB Mat Glow',        tier: null },
    ];

    var TIERS = [
        { minXp: 0,  name: 'Bare Desk' },
        { minXp: 1,  name: 'Getting Started' },
        { minXp: 5,  name: 'Student Setup' },
        { minXp: 9,  name: 'Casual Creator' },
        { minXp: 15, name: 'Professional' },
        { minXp: 24, name: 'Power User' },
        { minXp: 30, name: 'Dream Setup' },
        { minXp: 32, name: 'Ultimate Studio' },
    ];

    var TIER_CLASSES = ['visible', 'tier-2', 'air', 'pro', 'ultrawide'];

    var prevUnlockedSet = new Set();
    var toastTimer = null;

    function showToast(name) {
        var el = document.getElementById('unlock-toast');
        var nameEl = document.getElementById('toast-name');
        if (!el || !nameEl) return;
        nameEl.textContent = name;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2500);
    }

    function calculate(state, animate) {
        var xp = state.xp;

        var xpEl = document.getElementById('xp-display');
        if (xpEl) xpEl.textContent = xp + ' XP';

        var tier = TIERS[0];
        for (var i = TIERS.length - 1; i >= 0; i--) {
            if (xp >= TIERS[i].minXp) { tier = TIERS[i]; break; }
        }
        var badge = document.getElementById('tier-badge');
        if (badge) badge.textContent = tier.name;

        var activeItems = {};
        MILESTONES.forEach(function (m) {
            if (xp >= m.xp) {
                var ids = Array.isArray(m.id) ? m.id : [m.id];
                ids.forEach(function (id) {
                    if (!activeItems[id]) activeItems[id] = { tiers: [] };
                    if (m.tier) activeItems[id].tiers.push(m.tier);
                });
            }
        });

        MILESTONES.forEach(function (m) {
            var ids = Array.isArray(m.id) ? m.id : [m.id];
            ids.forEach(function (id) {
                var el = document.getElementById(id);
                if (el) TIER_CLASSES.forEach(function (c) { el.classList.remove(c); });
            });
        });

        var newSet = new Set();
        var rgbActive = false;

        Object.keys(activeItems).forEach(function (id) {
            var info = activeItems[id];
            var el = document.getElementById(id);
            if (!el) return;
            el.classList.add('visible');
            info.tiers.forEach(function (t) { el.classList.add(t); });

            if (id === 'i-rgb') rgbActive = true;

            var key = id + (info.tiers.length ? info.tiers[info.tiers.length - 1] : '');
            newSet.add(key);

            if (animate && !prevUnlockedSet.has(key)) {
                el.classList.add('upgrade');
                setTimeout(function () { el.classList.remove('upgrade'); }, 700);
                if (window.Particles) window.Particles.burstAt(el);
                if (window.DeskAudio) window.DeskAudio.playUnlock();

                var milestone = null;
                for (var j = MILESTONES.length - 1; j >= 0; j--) {
                    var mm = MILESTONES[j];
                    var mids = Array.isArray(mm.id) ? mm.id : [mm.id];
                    if (mids.indexOf(id) !== -1 && (mm.id + (mm.tier || '')) === key) {
                        milestone = mm; break;
                    }
                }
                if (milestone) showToast(milestone.name);
            }
        });

        // RGB mat glow toggle
        var matEl = document.getElementById('i-mat');
        if (matEl) {
            if (rgbActive) matEl.classList.add('rgb-active');
            else matEl.classList.remove('rgb-active');
        }

        prevUnlockedSet = newSet;
        state.unlockedIds = Array.from(newSet);

        var nextM = null, prevM = null;
        for (var k = 0; k < MILESTONES.length; k++) {
            if (xp < MILESTONES[k].xp) { nextM = MILESTONES[k]; break; }
        }
        for (var k2 = MILESTONES.length - 1; k2 >= 0; k2--) {
            if (xp >= MILESTONES[k2].xp) { prevM = MILESTONES[k2]; break; }
        }

        var fill = document.getElementById('progress-fill');
        var label = document.getElementById('progress-label');
        var next = document.getElementById('next-unlock');

        if (nextM) {
            var pxp = prevM ? prevM.xp : 0;
            var range = nextM.xp - pxp;
            var pct = ((xp - pxp) / range) * 100;
            if (fill) fill.style.width = Math.min(pct, 100) + '%';
            if (next) next.textContent = 'Next: ' + nextM.name + ' (' + nextM.xp + ' XP)';
            if (label) label.textContent = xp + ' / ' + nextM.xp + ' XP';
        } else {
            if (fill) fill.style.width = '100%';
            if (next) next.textContent = 'All unlocked!';
            if (label) label.textContent = 'Max level reached!';
        }
    }

    function syncPrev(state) {
        prevUnlockedSet = new Set(state.unlockedIds || []);
    }

    window.Scene = {
        MILESTONES: MILESTONES,
        TIERS: TIERS,
        calculate: calculate,
        syncPrev: syncPrev
    };
})();
