/* App controller — state, tasks, events, swipe, undo, dark mode, timestamps */
(function () {
    'use strict';

    /* ── State ── */
    var STORAGE_KEY = 'desk_eco_v3';

    function loadState() {
        var raw = localStorage.getItem(STORAGE_KEY);
        var s = raw ? JSON.parse(raw) : { xp: 0, tasks: [], unlockedIds: [] };

        // Migrate from v2 (string tasks → objects)
        var old = localStorage.getItem('desk_eco_v2');
        if (!raw && old) {
            s = JSON.parse(old);
            s.tasks = s.tasks.map(function (t) {
                return typeof t === 'string' ? { text: t, createdAt: Date.now() } : t;
            });
        }

        // Ensure all tasks are objects
        s.tasks = (s.tasks || []).map(function (t) {
            return typeof t === 'string' ? { text: t, createdAt: Date.now() } : t;
        });

        return s;
    }

    var state = loadState();

    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    /* ── DOM refs ── */
    var taskForm     = document.getElementById('task-form');
    var taskInput    = document.getElementById('task-input');
    var taskListEl   = document.getElementById('task-list');
    var emptyMsg     = document.getElementById('empty-msg');
    var taskCountEl  = document.getElementById('task-count');
    var xpDisplay    = document.getElementById('xp-display');
    var themeToggle  = document.getElementById('theme-toggle');
    var soundToggle  = document.getElementById('sound-toggle');
    var resetBtn     = document.getElementById('reset-btn');
    var undoToast    = document.getElementById('undo-toast');
    var undoMsgEl    = document.getElementById('undo-msg');
    var undoBtn      = document.getElementById('undo-btn');
    var dismissHint  = document.getElementById('dismiss-hint');

    /* ── Helpers ── */
    function escapeHtml(text) {
        var d = document.createElement('div');
        d.innerText = text;
        return d.innerHTML;
    }

    function relativeTime(ts) {
        var diff = Math.floor((Date.now() - ts) / 1000);
        if (diff < 60) return 'now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h';
        if (diff < 604800) return Math.floor(diff / 86400) + 'd';
        return Math.floor(diff / 604800) + 'w';
    }

    /* ── Render tasks ── */
    function renderTasks() {
        taskListEl.innerHTML = '';

        if (taskCountEl) {
            taskCountEl.textContent = state.tasks.length > 0
                ? state.tasks.length + ' task' + (state.tasks.length !== 1 ? 's' : '')
                : '';
        }

        if (state.tasks.length === 0) {
            emptyMsg.style.display = 'block';
            return;
        }
        emptyMsg.style.display = 'none';

        state.tasks.forEach(function (task, i) {
            var li = document.createElement('li');
            li.className = 'task-item';
            li.innerHTML =
                '<div class="swipe-actions">' +
                    '<div class="swipe-complete-bg">\u2713 Done</div>' +
                    '<div class="swipe-delete-bg">Delete \u2717</div>' +
                '</div>' +
                '<div class="task-content" data-idx="' + i + '">' +
                    '<div class="task-left">' +
                        '<div class="complete-btn" data-idx="' + i + '"></div>' +
                        '<span class="task-text" data-idx="' + i + '">' + escapeHtml(task.text) + '</span>' +
                    '</div>' +
                    '<span class="task-time">' + relativeTime(task.createdAt) + '</span>' +
                    '<button class="delete-btn" data-del="' + i + '">\u2715</button>' +
                '</div>';
            taskListEl.appendChild(li);
        });
    }

    /* ── Undo system ── */
    var undoData = null;
    var undoTimer = null;

    function showUndo(msg, data) {
        undoData = data;
        if (undoMsgEl) undoMsgEl.textContent = msg;
        undoToast.classList.add('show');
        clearTimeout(undoTimer);
        undoTimer = setTimeout(function () {
            undoToast.classList.remove('show');
            undoData = null;
        }, 4000);
    }

    function performUndo() {
        if (!undoData) return;
        if (undoData.type === 'complete') {
            state.tasks.splice(undoData.index, 0, undoData.task);
            state.xp = Math.max(0, state.xp - 1);
        } else if (undoData.type === 'delete') {
            state.tasks.splice(undoData.index, 0, undoData.task);
        }
        undoData = null;
        clearTimeout(undoTimer);
        undoToast.classList.remove('show');
        save();
        renderTasks();
        Scene.calculate(state, false);
    }

    if (undoBtn) undoBtn.addEventListener('click', performUndo);

    /* ── Task actions ── */
    function completeTask(idx) {
        var task = state.tasks[idx];
        if (!task) return;

        var item = taskListEl.children[idx];
        if (item) {
            var btn = item.querySelector('.complete-btn');
            if (btn) Particles.burstAt(btn);
            if (DeskAudio) DeskAudio.playComplete();

            item.classList.add('completing');
            item.addEventListener('animationend', function () {
                state.tasks.splice(idx, 1);
                state.xp += 1;
                save();
                renderTasks();
                Scene.calculate(state, true);
                animateXp();
                showUndo('Task completed', { type: 'complete', index: idx, task: task });
            }, { once: true });
        }
    }

    function deleteTask(idx) {
        var task = state.tasks[idx];
        if (!task) return;
        var item = taskListEl.children[idx];
        if (item) {
            item.style.transition = 'all 0.3s ease';
            item.style.opacity = '0';
            item.style.transform = 'translateX(30px)';
            setTimeout(function () {
                state.tasks.splice(idx, 1);
                save();
                renderTasks();
                showUndo('Task deleted', { type: 'delete', index: idx, task: task });
            }, 300);
        }
    }

    /* ── Inline editing ── */
    function startEdit(idx, spanEl) {
        var task = state.tasks[idx];
        if (!task) return;

        var input = document.createElement('input');
        input.className = 'task-text-editing';
        input.value = task.text;
        input.type = 'text';
        spanEl.replaceWith(input);
        input.focus();
        input.select();

        function finish() {
            var newText = input.value.trim();
            if (newText && newText !== task.text) {
                state.tasks[idx].text = newText;
                save();
            }
            renderTasks();
        }

        input.addEventListener('blur', finish, { once: true });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            if (e.key === 'Escape') { input.value = task.text; input.blur(); }
        });
    }

    /* ── Event delegation on task list ── */
    taskListEl.addEventListener('click', function (e) {
        var completeBtn = e.target.closest('.complete-btn');
        var deleteBtn = e.target.closest('.delete-btn');
        var textEl = e.target.closest('.task-text');

        if (completeBtn) {
            completeTask(parseInt(completeBtn.dataset.idx));
        } else if (deleteBtn) {
            deleteTask(parseInt(deleteBtn.dataset.del));
        }
    });

    /* Double-click to edit */
    taskListEl.addEventListener('dblclick', function (e) {
        var textEl = e.target.closest('.task-text');
        if (textEl) startEdit(parseInt(textEl.dataset.idx), textEl);
    });

    /* ── Swipe gestures (touch) ── */
    var swipeState = null;
    var SWIPE_THRESHOLD = 80;

    taskListEl.addEventListener('touchstart', function (e) {
        var content = e.target.closest('.task-content');
        if (!content) return;
        var touch = e.touches[0];
        swipeState = {
            el: content,
            startX: touch.clientX,
            startY: touch.clientY,
            idx: parseInt(content.dataset.idx),
            moved: false,
            locked: false
        };
    }, { passive: true });

    taskListEl.addEventListener('touchmove', function (e) {
        if (!swipeState) return;
        var touch = e.touches[0];
        var dx = touch.clientX - swipeState.startX;
        var dy = touch.clientY - swipeState.startY;

        if (!swipeState.locked) {
            if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
                swipeState = null;
                return;
            }
            if (Math.abs(dx) > 10) swipeState.locked = true;
        }

        if (swipeState.locked) {
            e.preventDefault();
            swipeState.moved = true;
            swipeState.el.classList.add('swiping');
            swipeState.el.style.transform = 'translateX(' + dx + 'px)';
            swipeState.dx = dx;
        }
    }, { passive: false });

    taskListEl.addEventListener('touchend', function () {
        if (!swipeState || !swipeState.moved) { swipeState = null; return; }

        var el = swipeState.el;
        var dx = swipeState.dx || 0;
        var idx = swipeState.idx;

        el.classList.remove('swiping');
        el.style.transform = '';

        if (dx < -SWIPE_THRESHOLD) {
            completeTask(idx);
            if (navigator.vibrate) navigator.vibrate(10);
        } else if (dx > SWIPE_THRESHOLD) {
            deleteTask(idx);
            if (navigator.vibrate) navigator.vibrate(10);
        }

        swipeState = null;
    });

    /* ── Add task ── */
    taskForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = taskInput.value.trim();
        if (!text) return;
        state.tasks.push({ text: text, createdAt: Date.now() });
        save();
        renderTasks();
        taskInput.value = '';
        taskInput.focus();
    });

    /* ── Animated XP counter ── */
    function animateXp() {
        if (!xpDisplay) return;
        xpDisplay.classList.remove('bump');
        void xpDisplay.offsetWidth;
        xpDisplay.classList.add('bump');
    }

    /* ── Dark mode ── */
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('desk_theme', theme);
        if (themeToggle) themeToggle.textContent = theme === 'dark' ? '\u263E' : '\u2600';
    }

    function initTheme() {
        var saved = localStorage.getItem('desk_theme');
        if (saved) { applyTheme(saved); return; }
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            applyTheme('dark');
        } else {
            applyTheme('light');
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            var current = document.documentElement.getAttribute('data-theme');
            applyTheme(current === 'dark' ? 'light' : 'dark');
        });
    }

    /* ── Sound toggle ── */
    function updateSoundIcon() {
        if (soundToggle) soundToggle.textContent = DeskAudio.isMuted() ? '\uD83D\uDD07' : '\uD83D\uDD0A';
    }

    if (soundToggle) {
        soundToggle.addEventListener('click', function () {
            DeskAudio.toggleMute();
            updateSoundIcon();
        });
    }

    /* ── Reset ── */
    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            if (!confirm('Reset all progress? This cannot be undone.')) return;
            state = { xp: 0, tasks: [], unlockedIds: [] };
            save();
            renderTasks();
            Scene.calculate(state, false);
            Scene.syncPrev(state);
        });
    }

    /* ── iOS install hint ── */
    (function () {
        var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
        var isStandalone = window.navigator.standalone === true;
        var dismissed = localStorage.getItem('install_hint_dismissed');
        var hint = document.getElementById('install-hint');

        if (isIos && !isStandalone && !dismissed && hint) {
            setTimeout(function () { hint.classList.add('show'); }, 2500);
        }

        if (dismissHint) {
            dismissHint.addEventListener('click', function () {
                if (hint) hint.classList.remove('show');
                localStorage.setItem('install_hint_dismissed', '1');
            });
        }
    })();

    /* ── Service Worker registration ── */
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(function () {});
    }

    /* ── Init ── */
    initTheme();
    updateSoundIcon();
    Particles.init();
    renderTasks();
    Scene.calculate(state, false);
    Scene.syncPrev(state);

    /* Refresh relative times every minute */
    setInterval(function () {
        var timeEls = document.querySelectorAll('.task-time');
        state.tasks.forEach(function (task, i) {
            if (timeEls[i]) timeEls[i].textContent = relativeTime(task.createdAt);
        });
    }, 60000);
})();
