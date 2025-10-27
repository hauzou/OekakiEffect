document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    const drawingCanvas = document.getElementById('drawingCanvas');
    const ctx = drawingCanvas.getContext('2d');
    const clearButton = document.getElementById('clearButton');
    const doneButton = document.getElementById('doneButton');

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    // --- お絵かき処理 ---
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    function setRandomStrokeColor() {
        ctx.strokeStyle = `hsl(${Math.random() * 360}, 100%, 50%)`;
    }
    setRandomStrokeColor(); // 初期色を設定

    function getPos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        const touch = evt.touches ? evt.touches[0] : evt;
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }

    function startLine(e) {
        if (e.touches) e.preventDefault();
        isDrawing = true;
        const pos = getPos(drawingCanvas, e);
        [lastX, lastY] = [pos.x, pos.y];
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
    }

    function drawLine(e) {
        if (!isDrawing) return;
        if (e.touches) e.preventDefault();
        const pos = getPos(drawingCanvas, e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        [lastX, lastY] = [pos.x, pos.y];
    }

    function stopLine() {
        isDrawing = false;
    }

    drawingCanvas.addEventListener('mousedown', startLine);
    drawingCanvas.addEventListener('mousemove', drawLine);
    drawingCanvas.addEventListener('mouseup', stopLine);
    drawingCanvas.addEventListener('mouseout', stopLine);
    drawingCanvas.addEventListener('touchstart', startLine, { passive: false });
    drawingCanvas.addEventListener('touchmove', drawLine, { passive: false });
    drawingCanvas.addEventListener('touchend', stopLine);

    clearButton.addEventListener('click', () => {
        ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        setRandomStrokeColor();
    });

    doneButton.addEventListener('click', () => {
        if (isCanvasBlank(drawingCanvas)) {
            alert('何か描いてから「できた！」ボタンを押してね。');
            return;
        }
        createDraggableItem(drawingCanvas.toDataURL());
        ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        setRandomStrokeColor();
    });

    function isCanvasBlank(canvas) {
        return !ctx.getImageData(0, 0, canvas.width, canvas.height).data.some(channel => channel !== 0);
    }

    // --- アイテムとエフェクト処理 ---
    let activeItem = null;
    let offsetX, offsetY;
    let audioContext;

    const effects = [
        { name: 'rotate-cw', type: 'animation' }, { name: 'rotate-y', type: 'animation' },
        { name: 'scale-up-2', type: 'animation' }, { name: 'pulse', type: 'animation' },
        { name: 'jump', type: 'animation' }, { name: 'swing', type: 'animation' },
        { name: 'fade-out-in', type: 'animation' }, { name: 'blur', type: 'animation' },
        { name: 'particles-sparkle', type: 'special' },
    ];

    function initAudio() {
        if (!audioContext) {
            try { audioContext = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { console.error('Web Audio API is not supported'); }
        }
    }

    function playRandomSound() {
        if (!audioContext) return;
        const o = audioContext.createOscillator(), g = audioContext.createGain();
        const freq = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
        o.type = 'sine';
        o.frequency.setValueAtTime(freq[Math.floor(Math.random() * freq.length)], audioCtx.currentTime);
        g.gain.setValueAtTime(0.3, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(audioCtx.currentTime); o.stop(audioCtx.currentTime + 0.8);
    }

    function createParticles(item) {
        const rect = item.getBoundingClientRect();
        const originX = rect.left + rect.width / 2, originY = rect.top + rect.height / 2;
        for (let i = 0; i < 15; i++) {
            const p = document.createElement('div');
            p.classList.add('particle');
            p.style.left = `${originX}px`; p.style.top = `${originY}px`;
            const angle = Math.random() * 360, distance = Math.random() * 80 + 20;
            p.style.setProperty('--tx', `${Math.cos(angle * Math.PI / 180) * distance}px`);
            p.style.setProperty('--ty', `${Math.sin(angle * Math.PI / 180) * distance}px`);
            p.style.animation = `particle-anim 1s ease-out forwards`;
            app.appendChild(p);
            setTimeout(() => p.remove(), 1000);
        }
    }

    function applyEffect(item) {
        const randomEffect = effects[Math.floor(Math.random() * effects.length)];
        playRandomSound();
        const classesToRemove = effects.filter(e => e.type === 'animation').map(e => e.name);
        item.classList.remove(...classesToRemove);
        void item.offsetWidth;
        if (randomEffect.type === 'special') {
            if (randomEffect.name === 'particles-sparkle') createParticles(item);
        } else if (randomEffect.type === 'animation') {
            item.classList.add(randomEffect.name);
            item.addEventListener('animationend', () => item.classList.remove(randomEffect.name), { once: true });
        }
    }

    function createDraggableItem(imageURL) {
        const item = document.createElement('div');
        item.classList.add('user-item');
        item.style.backgroundImage = `url(${imageURL})`;
        
        const appRect = app.getBoundingClientRect();
        const x = Math.random() * (appRect.width - 200);
        const y = Math.random() * (appRect.height - 200);
        item.style.left = `${x}px`;
        item.style.top = `${y}px`;

        app.appendChild(item);
    }

    // --- ドラッグ処理（マウスとタッチを完全に分離） ---

    function startDrag(e) {
        if (e.target.classList.contains('user-item')) {
            activeItem = e.target;
            initAudio();
            if (audioContext && audioContext.state === 'suspended') audioContext.resume();
            activeItem.classList.add('dragging');
            const touch = e.touches ? e.touches[0] : e;
            const rect = activeItem.getBoundingClientRect();
            offsetX = touch.clientX - rect.left;
            offsetY = touch.clientY - rect.top;
        }
    }

    function drag(e) {
        if (activeItem) {
            const touch = e.touches ? e.touches[0] : e;
            let x = touch.clientX - offsetX;
            let y = touch.clientY - offsetY;
            const itemSize = activeItem.offsetWidth;
            x = Math.max(0, Math.min(x, window.innerWidth - itemSize));
            y = Math.max(0, Math.min(y, window.innerHeight - itemSize));
            activeItem.style.left = `${x}px`;
            activeItem.style.top = `${y}px`;
        }
    }

    function endDrag() {
        if (activeItem) {
            activeItem.classList.remove('dragging');
            applyEffect(activeItem);
            activeItem = null;
        }
    }

    // マウスイベント
    app.addEventListener('mousedown', startDrag);
    app.addEventListener('mousemove', drag);
    app.addEventListener('mouseup', endDrag);
    app.addEventListener('mouseleave', endDrag);

    // タッチイベント
    app.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startDrag(e);
    }, { passive: false });
    app.addEventListener('touchmove', (e) => {
        e.preventDefault();
        drag(e);
    }, { passive: false });
    app.addEventListener('touchend', endDrag);
    app.addEventListener('touchcancel', endDrag);
});
