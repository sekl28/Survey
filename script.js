/* ==========================================================================
   THE LIQUID LIGHTBOX - FULL JAVASCRIPT
   Analysis: This file contains the complete, structured JavaScript for the
   entire experience, including the fluid simulation, object interaction,
   state management, and content animations.
========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // --- PART 4: FLUID SIMULATION ENGINE ---
    function initializeFluidSimulation() {
        const canvas = document.getElementById('fluid-canvas');
        // Basic fallback for unsupported contexts
        if (!canvas.getContext) return; 
        const gl = canvas.getContext('webgl');
        if (!gl) {
            console.warn("WebGL not supported. Fluid simulation disabled.");
            return;
        }

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const vertexShaderSource = `
            attribute vec2 a_position;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;
        const fragmentShaderSource = `
            precision highp float;
            uniform float u_time;
            uniform vec2 u_mouse;
            uniform vec2 u_resolution;

            void main() {
                vec2 uv = gl_FragCoord.xy / u_resolution.xy;
                float t = u_time * 0.1;
                
                vec2 mouse_norm = u_mouse / u_resolution.xy;
                float dist = distance(uv, mouse_norm);
                
                float color_wave = sin(uv.x * 10.0 + t) + cos(uv.y * 10.0 + t);
                float mouse_effect = 1.0 - smoothstep(0.0, 0.1, dist);
                
                float r = 0.05 + 0.05 * sin(color_wave * 2.0 + t);
                float g = 0.05 + 0.05 * cos(uv.y * 5.0 - t);
                float b = 0.15 + 0.1 * sin(dist * 10.0 - t);
                
                gl_FragColor = vec4(r + mouse_effect * 0.5, g + mouse_effect * 0.3, b + mouse_effect * 1.0, 1.0);
            }
        `;

        function compileShader(type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Shader compile error: ' + gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        }
        
        function createProgram(vertexShader, fragmentShader) {
            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                console.error('Program link error: ' + gl.getProgramInfoLog(program));
                return null;
            }
            return program;
        }

        const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
        const program = createProgram(vertexShader, fragmentShader);
        
        const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
        const timeUniformLocation = gl.getUniformLocation(program, "u_time");
        const mouseUniformLocation = gl.getUniformLocation(program, "u_mouse");
        const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        
        let mousePos = { x: window.innerWidth/2, y: window.innerHeight/2 };
        window.addEventListener('mousemove', e => {
            mousePos.x = e.clientX;
            mousePos.y = window.innerHeight - e.clientY; // Y is inverted in WebGL
        });

        function render(time) {
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.useProgram(program);
            gl.enableVertexAttribArray(positionAttributeLocation);
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

            gl.uniform1f(timeUniformLocation, time * 0.001);
            gl.uniform2f(mouseUniformLocation, mousePos.x, mousePos.y);
            gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
            
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);
    }

    // --- PART 5: DRAGGABLE & ROTATABLE INTERACTION ---
    function initializeLightboxInteraction() {
        const lightboxes = document.querySelectorAll('.lightbox.is-interactive');
        const cursor = document.querySelector('.custom-cursor');
        let highestZ = 10;

        lightboxes.forEach((lightbox, index) => {
            gsap.set(lightbox, {
                x: (Math.random() - 0.5) * (window.innerWidth * 0.4),
                y: (Math.random() - 0.5) * (window.innerHeight * 0.2),
                rotationY: (Math.random() - 0.5) * 40,
                rotationX: (Math.random() - 0.5) * 20
            });

            const header = lightbox.querySelector('.lightbox-header');
            let isDragging = false;
            let startX, startY, startMouseX, startMouseY;

            function onMouseDown(e) {
                isDragging = true;
                highestZ++;
                gsap.set(lightbox, { zIndex: highestZ });
                startX = gsap.getProperty(lightbox, "x");
                startY = gsap.getProperty(lightbox, "y");
                startMouseX = e.clientX || e.touches[0].clientX;
                startMouseY = e.clientY || e.touches[0].clientY;
                gsap.to(lightbox, { scale: 1.05, duration: 0.3 });
                cursor.classList.add('is-interacting');
                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
            }

            function onMouseMove(e) {
                if (!isDragging) return;
                const newX = startX + (e.clientX - startMouseX);
                const newY = startY + (e.clientY - startMouseY);
                const rotY = gsap.utils.clamp(-45, 45, (e.clientX - startMouseX) * 0.1);
                gsap.to(lightbox, { x: newX, y: newY, rotationY: rotY, duration: 0.8, ease: 'power3.out' });
            }

            function onMouseUp() {
                isDragging = false;
                gsap.to(lightbox, { scale: 1, duration: 0.3 });
                cursor.classList.remove('is-interacting');
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            }
            
            header.addEventListener('mousedown', onMouseDown);
            lightbox.addEventListener('mousedown', () => {
                if (!isDragging) {
                    highestZ++;
                    gsap.set(lightbox, { zIndex: highestZ });
                    if (!lightbox.classList.contains('is-focused')) {
                        lightboxes.forEach(lb => lb.classList.remove('is-focused'));
                        lightbox.classList.add('is-focused');
                    }
                }
            });
        });
    }
    
    // --- PART 6: STATE & "CAMERA" LOGIC ---
    function initializeCameraAndState() {
        const lightboxes = document.querySelectorAll('.lightbox.is-interactive');
        const backButton = document.querySelector('.back-button');
        const instructions = document.querySelector('.instructions');
        let isZoomed = false;

        function focusOnView(viewId) {
            isZoomed = true;
            const targetLightbox = document.getElementById(`lightbox-${viewId}`);
            lightboxes.forEach(lb => {
                if (lb.dataset.viewId === viewId) {
                    gsap.to(lb, { x: 0, y: 0, rotationY: 0, rotationX: 0, z: 200, scale: 1.1, duration: 0.8, ease: 'power2.inOut' });
                    lb.classList.add('is-focused');
                } else {
                    gsap.to(lb, { z: -1000, opacity: 0.5, scale: 0.8, duration: 0.8, ease: 'power2.inOut' });
                }
            });
            backButton.classList.add('is-visible');
            gsap.to(instructions, { opacity: 0, duration: 0.4 });
        }

        function resetView() {
            isZoomed = false;
            lightboxes.forEach((lb, index) => {
                gsap.to(lb, {
                    x: (Math.random() - 0.5) * (window.innerWidth * 0.4),
                    y: (Math.random() - 0.5) * (window.innerHeight * 0.2),
                    rotationY: (Math.random() - 0.5) * 40,
                    rotationX: (Math.random() - 0.5) * 20,
                    z: 0, opacity: 1, scale: 1,
                    duration: 0.8, ease: 'power2.inOut'
                });
                lb.classList.remove('is-focused');
            });
            backButton.classList.remove('is-visible');
            gsap.to(instructions, { opacity: 1, duration: 0.4, delay: 0.5 });
        }

        lightboxes.forEach(lightbox => {
            lightbox.addEventListener('dblclick', () => { if (!isZoomed) focusOnView(lightbox.dataset.viewId); });
        });
        backButton.addEventListener('click', () => { if (isZoomed) resetView(); });
    }

    // --- PART 7: CONTENT LOADING & ANIMATIONS ---
    function initializeContentAnimations() {
        const loadingScreen = document.querySelector('.loading-screen');
        const lightboxes = document.querySelectorAll('.lightbox');
        const instructions = document.querySelector('.instructions');
        
        function revealScene() {
            gsap.to(loadingScreen, { opacity: 0, duration: 1, onComplete: () => loadingScreen.style.display = 'none' });
            gsap.fromTo(lightboxes, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 1.5, ease: 'power3.out', stagger: 0.1, delay: 0.5 });
            gsap.to(instructions, { opacity: 1, duration: 1, delay: 2 });
        }

        window.addEventListener('load', () => setTimeout(revealScene, 500));
    }

    // --- PART 8: FINAL POLISH & MOBILE ADAPTATION ---
    function initializeMobileAdaptation() {
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            // On mobile, simplify by removing the complex 3D drag.
            // A real-world scenario might add gyroscope controls here.
            document.querySelector('.instructions').textContent = "Double Tap to Focus";
            document.querySelector('.custom-cursor').style.display = 'none'; // Hide custom cursor
            document.body.style.cursor = 'default';
        }
    }

    // --- RUN ALL INITIALIZERS ---
    try {
        initializeFluidSimulation();
        initializeLightboxInteraction();
        initializeCameraAndState();
        initializeContentAnimations();
        initializeMobileAdaptation();
    } catch (e) {
        console.error("An error occurred during initialization:", e);
        // Fallback for critical errors
        document.body.innerHTML = '<div style="color:white;padding:2rem;">An error occurred. Please refresh.</div>';
    }
});
</script>
