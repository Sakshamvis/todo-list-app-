/* Synthesized sound effects via Web Audio API — no external files needed */
(function () {
    let actx = null;
    let muted = localStorage.getItem('desk_muted') === '1';

    function ensure() {
        if (!actx) {
            try { actx = new (window.AudioContext || window.webkitAudioContext)(); }
            catch (e) { return null; }
        }
        if (actx.state === 'suspended') actx.resume();
        return actx;
    }

    function tone(freq, duration, type, gainVal, delay) {
        const c = ensure();
        if (!c || muted) return;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(gainVal || 0.15, c.currentTime + (delay || 0));
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + (delay || 0) + duration);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(c.currentTime + (delay || 0));
        osc.stop(c.currentTime + (delay || 0) + duration);
    }

    window.DeskAudio = {
        playComplete: function () {
            tone(880, 0.15, 'sine', 0.12);
            tone(1100, 0.12, 'sine', 0.08, 0.08);
        },

        playUnlock: function () {
            tone(660, 0.12, 'triangle', 0.1);
            tone(880, 0.12, 'triangle', 0.1, 0.1);
            tone(1100, 0.15, 'triangle', 0.08, 0.2);
        },

        isMuted: function () { return muted; },

        toggleMute: function () {
            muted = !muted;
            localStorage.setItem('desk_muted', muted ? '1' : '0');
            return muted;
        }
    };
})();
