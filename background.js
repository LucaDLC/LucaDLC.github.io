// Background Shader
const vertexShader = `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const fragmentShader = `
    precision highp float;
    uniform float iTime;
    uniform vec3 iResolution;
    uniform vec2 iMouse;
    uniform float bendInfluence;

    const vec3 BLACK = vec3(0.06, 0.09, 0.16); 
    const vec3 BLUE  = vec3(47.0, 75.0, 162.0) / 255.0;
    // Nuovo colore Pink/Magenta (#e945f5)
    const vec3 PINK  = vec3(233.0, 69.0, 245.0) / 255.0;

    mat2 rotate(float r) { return mat2(cos(r), sin(r), -sin(r), cos(r)); }

    // Funzione Wave
    float wave(vec2 uv, float offset, vec2 screenUv, vec2 mouseUv, float bendStrength) {
        float time = iTime * 0.8;
        float amp = sin(offset + time * 0.2) * 0.3;
        float y = sin(uv.x + offset + time * 0.1) * amp;
        
        // Effetto Interazione Mouse
        vec2 d = screenUv - mouseUv;
        float influence = exp(-dot(d, d) * 5.0); 
        y += (mouseUv.y - screenUv.y) * influence * bendStrength * bendInfluence;
        
        return 0.015 / (abs(uv.y - y) + 0.005);
    }

    void main() {
        vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
        uv.y *= -1.0;
        vec2 mouseUv = (2.0 * iMouse - iResolution.xy) / iResolution.y;
        mouseUv.y *= -1.0;
        
        vec3 col = BLACK;

        // Creiamo un gradiente orizzontale che mixa BLUE e PINK
        // gl_FragCoord.x / iResolution.x va da 0.0 (sinistra) a 1.0 (destra)
        vec3 waveColor = mix(BLUE, PINK, gl_FragCoord.x / iResolution.x);

        // WAVE BOTTOM (Onda in basso)
        for (int i = 0; i < 5; i++) {
            float fi = float(i);
            vec2 ruv = uv * rotate(0.4 * log(length(uv) + 1.0));
            col += waveColor * wave(ruv + vec2(0.05 * fi + 2.0, -0.7), 1.5 + 0.2 * fi, uv, mouseUv, -0.5) * 0.2;
        }

        // WAVE MIDDLE (Onda centrale)
        for (int i = 0; i < 5; i++) {
            float fi = float(i);
            vec2 ruv = uv * rotate(0.2 * log(length(uv) + 1.0));
            col += waveColor * wave(ruv + vec2(0.05 * fi + 5.0, 0.0), 2.0 + 0.15 * fi, uv, mouseUv, -0.5) * 0.6;
        }

        // WAVE TOP (Onda in alto)
        for (int i = 0; i < 5; i++) {
            float fi = float(i);
            vec2 ruv = uv * rotate(-0.4 * log(length(uv) + 1.0));
            ruv.x *= -1.0;
            col += waveColor * wave(ruv + vec2(0.05 * fi + 10.0, 0.5), 1.0 + 0.2 * fi, uv, mouseUv, -0.5) * 0.15;
        }

        gl_FragColor = vec4(col, 1.0);
    }
`;

const container = document.getElementById('bg-container');
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const renderer = new THREE.WebGLRenderer({ antialias: true });
container.appendChild(renderer.domElement);

const uniforms = { 
    iTime: { value: 0 }, 
    iResolution: { value: new THREE.Vector3() }, 
    iMouse: { value: new THREE.Vector2(-1000, -1000) }, 
    bendInfluence: { value: 0 } 
};

const material = new THREE.ShaderMaterial({ 
    uniforms, 
    vertexShader: vertexShader, 
    fragmentShader: fragmentShader 
});

scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

function resize() { 
    renderer.setSize(window.innerWidth, window.innerHeight); 
    uniforms.iResolution.value.set(window.innerWidth, window.innerHeight, 1); 
}
window.addEventListener('resize', resize); 
resize();

// Mouse interaction logic
let targetMouse = new THREE.Vector2(-1000, -1000);
let targetInfluence = 0;
let currentInfluence = 0;

window.addEventListener('mousemove', e => {
    targetMouse.set(e.clientX, window.innerHeight - e.clientY);
    targetInfluence = 1.0;
});

window.addEventListener('mouseleave', () => {
    targetInfluence = 0.0;
});

function animate(t) { 
    uniforms.iTime.value = t/1000; 
    
    // Damping for mouse movement
    uniforms.iMouse.value.lerp(targetMouse, 0.05);
    
    // Damping for influence (fade in/out effect)
    currentInfluence += (targetInfluence - currentInfluence) * 0.05;
    uniforms.bendInfluence.value = currentInfluence;
    
    renderer.render(scene, camera); 
    requestAnimationFrame(animate); 
}
requestAnimationFrame(animate);