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
        const currentColor = ctx.strokeStyle;
        createDraggableItem(drawingCanvas.toDataURL(), currentColor);
        ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        setRandomStrokeColor();
    });

    function isCanvasBlank(canvas) {
        const context = canvas.getContext('2d');
        const pixelBuffer = new Uint32Array(
            context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
        );
        return !pixelBuffer.some(color => color !== 0);
    }

    // --- アイテムとエフェクト処理 ---
    let activeItem = null;
    let offsetX, offsetY;
    let audioContext;

    const effects = [
        { name: 'rotate-cw', type: 'animation' }, { name: 'rotate-ccw', type: 'animation' },
        { name: 'spin-fast', type: 'animation' }, { name: 'rotate-y', type: 'animation' },
        { name: 'rotate-x', type: 'animation' }, { name: 'rotate-180', type: 'animation' },
        { name: 'bow', type: 'animation' }, { name: 'swing', type: 'animation' },
        { name: 'scale-up-2', type: 'animation' }, { name: 'scale-up-1.5', type: 'animation' },
        { name: 'scale-down-0.5', type: 'animation' }, { name: 'scale-down-0.1', type: 'animation' },
        { name: 'pulse', type: 'animation' }, { name: 'stretch-x', type: 'animation' },
        { name: 'stretch-y', type: 'animation' }, { name: 'inflate', type: 'animation' },
        { name: 'jump', type: 'animation' }, { name: 'high-jump', type: 'animation' },
        { name: 'slide-right', type: 'animation' }, { name: 'slide-left', type: 'animation' },
        { name: 'draw-circle', type: 'animation' }, { name: 'bounce-down', type: 'animation' },
        { name: 'float', type: 'animation' }, { name: 'warp', type: 'animation' },
        { name: 'blink-3', type: 'animation' }, { name: 'blink-slow', type: 'animation' },
        { name: 'fade-out-in', type: 'animation' }, { name: 'outline', type: 'animation' },
        { name: 'blur', type: 'animation' }, { name: 'add-shadow', type: 'animation' },
        { name: 'sepia', type: 'animation' }, { name: 'grayscale', type: 'animation' },
        { name: 'particles-sparkle', type: 'special' }, { name: 'particles-heart', type: 'special' },
        { name: 'split-2', type: 'special' }, { name: 'split-3', type: 'special' },
        { name: 'color-red', type: 'color' }, { name: 'color-blue', type: 'color' },
        { name: 'color-yellow', type: 'color' }, { name: 'color-green', type: 'color' },
        { name: 'color-orange', type: 'color' }, { name: 'color-pink', type: 'color' },
        { name: 'color-purple', type: 'color' }, { name: 'color-cyan', type: 'color' },
        { name: 'color-gold', type: 'color' }, { name: 'color-rainbow', type: 'animation' },
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
        o.frequency.setValueAtTime(freq[Math.floor(Math.random() * freq.length)], audioContext.currentTime);
        g.gain.setValueAtTime(0.3, audioContext.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.8);
        o.connect(g); g.connect(audioContext.destination);
        o.start(audioContext.currentTime); o.stop(audioContext.currentTime + 0.8);
    }

    function createParticles(item, type = 'sparkle') {
        const rect = item.getBoundingClientRect();
        const originX = rect.left + rect.width / 2, originY = rect.top + rect.height / 2;
        for (let i = 0; i < 15; i++) {
            const p = document.createElement('div');
            p.classList.add('particle', type);
            p.style.left = `${originX}px`; p.style.top = `${originY}px`;
            const angle = Math.random() * 360, distance = Math.random() * 80 + 20;
            p.style.setProperty('--tx', `${Math.cos(angle * Math.PI / 180) * distance}px`);
            p.style.setProperty('--ty', `${Math.sin(angle * Math.PI / 180) * distance}px`);
            p.style.animation = `particle-anim 1s ease-out forwards`;
            app.appendChild(p);
            setTimeout(() => p.remove(), 1000);
        }
    }
    
    function createSplit(item, count) {
        const rect = item.getBoundingClientRect();
        item.style.opacity = 0;
        for (let i = 0; i < count; i++) {
            const clone = document.createElement('div');
            clone.className = item.className.replace('user-item', 'split-clone');
            clone.style.left = `${rect.left}px`;
            clone.style.top = `${rect.top}px`;
            clone.style.webkitMaskImage = item.style.webkitMaskImage;
            clone.style.maskImage = item.style.maskImage;
            clone.style.backgroundColor = window.getComputedStyle(item).backgroundColor;

            const angle = (360 / count) * i;
            const distance = 60;
            clone.style.setProperty('--tx', `${Math.cos(angle * Math.PI / 180) * distance}px`);
            clone.style.setProperty('--ty', `${Math.sin(angle * Math.PI / 180) * distance}px`);
            clone.style.animation = `split-anim 0.8s ease-out forwards`;
            app.appendChild(clone);
            setTimeout(() => clone.remove(), 800);
        }
        setTimeout(() => item.style.opacity = 1, 800);
    }

    function applyEffect(item) {
        const randomEffect = effects[Math.floor(Math.random() * effects.length)];
        playRandomSound();
        const classesToRemove = effects.map(e => e.name);
        item.classList.remove(...classesToRemove);
        void item.offsetWidth;

        if (randomEffect.type === 'special') {
            if (randomEffect.name === 'particles-sparkle') createParticles(item, 'sparkle');
            if (randomEffect.name === 'particles-heart') createParticles(item, 'heart');
            if (randomEffect.name === 'split-2') createSplit(item, 2);
            if (randomEffect.name === 'split-3') createSplit(item, 3);
        } else if (randomEffect.type === 'animation' || randomEffect.type === 'color') {
            item.classList.add(randomEffect.name);
            const listener = () => {
                if(randomEffect.type !== 'color') {
                    item.classList.remove(randomEffect.name);
                }
            };
            item.addEventListener('animationend', listener, { once: true });
            if (randomEffect.type === 'color') {
                setTimeout(() => item.classList.remove(randomEffect.name), 1000);
            }
        }
    }

    function createDraggableItem(imageURL, color) {
        const item = document.createElement('div');
        item.classList.add('user-item');
        item.style.backgroundColor = color;
        item.style.webkitMaskImage = `url(${imageURL})`;
        item.style.maskImage = `url(${imageURL})`;
        const appRect = app.getBoundingClientRect();
        const x = Math.random() * (appRect.width - 200);
        const y = Math.random() * (appRect.height - 200);
        item.style.left = `${x}px`;
        item.style.top = `${y}px`;
        app.appendChild(item);
    }

    // --- ドラッグ処理 ---
    function startDrag(e) {
        if (e.target.classList.contains('user-item')) {
            e.preventDefault();
            activeItem = e.target;
            initAudio();
            if (audioContext && audioContext.state === 'suspended') audioContext.resume();
            activeItem.classList.add('dragging');
            const pointer = e.touches ? e.touches[0] : e;
            const rect = activeItem.getBoundingClientRect();
            offsetX = pointer.clientX - rect.left;
            offsetY = pointer.clientY - rect.top;
        }
    }

    function drag(e) {
        if (activeItem) {
            e.preventDefault();
            const pointer = e.touches ? e.touches[0] : e;
            if (pointer.clientX === undefined || pointer.clientY === undefined) return;
            let x = pointer.clientX - offsetX;
            let y = pointer.clientY - offsetY;
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

    app.addEventListener('mousedown', startDrag);
    app.addEventListener('mousemove', drag);
    app.addEventListener('mouseup', endDrag);
    app.addEventListener('mouseleave', endDrag);
    app.addEventListener('touchstart', startDrag, { passive: false });
    app.addEventListener('touchmove', drag, { passive: false });
    app.addEventListener('touchend', endDrag);
    app.addEventListener('touchcancel', endDrag);
});