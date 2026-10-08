import { useEffect, useRef } from 'react';
import * as T from 'three';
import compiled from './generated/shaders.json';
type SceneSpec = {
    kind: 'scene' | 'assets' | 'material' | 'lightSphere';
    selectedTriangle?: boolean;
    distance?: number;
    angle?: number;
    detail?: number;
    flat?: boolean;
    mode?: number;
    roughness?: number;
    metal?: number;
};
export const atlasColors = ['#ff704f', '#ffc066', '#68d7bf', '#829bff'];
export function atlasCanvas() { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d')!; const colors = atlasColors; for (let j = 0; j < 2; j++)
    for (let i = 0; i < 2; i++) {
        x.fillStyle = colors[j * 2 + i];
        x.fillRect(i * 128, j * 128, 128, 128);
        x.fillStyle = '#182238';
        x.font = 'bold 64px Arial';
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText(String(j * 2 + i + 1), i * 128 + 64, j * 128 + 64);
    } return c; }
const strip = (s: string) => s.replace(/^#version[^\n]*\n/, '');
export function SceneView({ spec, caption = 'Трёхмерная сцена' }: {
    spec: SceneSpec;
    caption?: string;
}) {
    const host = useRef<HTMLDivElement>(null);
    const draw = useRef<(s: SceneSpec) => void>(() => { });
    const latest = useRef(spec);
    latest.current = spec;
    useEffect(() => {
        const el = host.current!;
        let renderer: T.WebGLRenderer;
        try {
            renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        }
        catch {
            el.textContent = 'WebGL 2 недоступен. Откройте приложение в браузере с аппаратным ускорением.';
            return;
        }
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.outputColorSpace = T.LinearSRGBColorSpace;
        el.appendChild(renderer.domElement);
        renderer.domElement.setAttribute('aria-label', caption);
        let scene = new T.Scene();
        let camera: T.Camera = new T.PerspectiveCamera();
        const tex = new T.CanvasTexture(atlasCanvas());
        tex.colorSpace = T.SRGBColorSpace;
        tex.magFilter = tex.minFilter = T.NearestFilter;
        const clean = () => { scene.traverse(o => { if (o instanceof T.Mesh || o instanceof T.Line) {
            o.geometry.dispose();
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach(m => m.dispose());
        } }); };
        const rebuild = (s: SceneSpec) => {
            clean();
            scene = new T.Scene();
            el.querySelectorAll('[data-scene-label]').forEach(n => n.remove());
            for (const key of ['positionHash', 'normalHash'])
                delete renderer.domElement.dataset[key];
            scene.background = new T.Color('#10192e');
            const aspect = el.clientWidth / Math.max(1, el.clientHeight);
            camera = new T.PerspectiveCamera(45, aspect, .1, 9);
            camera.position.set(3, 2, s.distance || 7);
            camera.lookAt(0, s.kind === 'scene' ? .1 : 0, 0);
            camera.updateMatrixWorld();
            function label(text: string, point: T.Vector3, offset = 0) { const projected = point.clone().project(camera); const node = document.createElement('span'); node.dataset.sceneLabel = 'true'; node.className = 'scene-label'; node.textContent = text; node.style.left = `calc(${(projected.x * .5 + .5) * 100}% + ${offset}px)`; node.style.top = (.5 - projected.y * .5) * 100 + '%'; el.appendChild(node); }
            function highlight(points: T.Vector3[]) {
                const w = el.clientWidth, h = el.clientHeight;
                const px = points.map(p => { const q = p.clone().project(camera); return [(q.x * .5 + .5) * w, (.5 - q.y * .5) * h]; });
                const cx = px.reduce((t, p) => t + p[0], 0) / 3, cy = px.reduce((t, p) => t + p[1], 0) / 3;
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.dataset.sceneLabel = 'true';
                svg.classList.add('scene-triangle');
                svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
                svg.innerHTML = `<polygon points="${px.map(p => p.join(',')).join(' ')}"/>` + px.map(([x, y], i) => { const d = Math.hypot(x - cx, y - cy) || 1; return `<circle cx="${x}" cy="${y}" r="4.5"/><text x="${x + (x - cx) / d * 17}" y="${y + (y - cy) / d * 17}">${'ABC'[i]}</text>`; }).join('');
                el.appendChild(svg);
            }
            const cubeTriangle = (center: number[]) => [[-.5, -.5, .5], [.5, -.5, .5], [.5, .5, .5]].map(p => new T.Vector3(p[0] + center[0], p[1] + center[1], p[2] + center[2]));
            const a = (s.angle ?? 35) * Math.PI / 180;
            const light = new T.Vector3(Math.sin(a), s.kind === 'lightSphere' ? 0 : .45, Math.cos(a)).normalize();
            function material(mode = s.mode ?? 1, color = [.8, .25, .08]) { const data = new Float32Array(64); const mat = new T.RawShaderMaterial({ glslVersion: T.GLSL3, vertexShader: strip(compiled.sceneVertex), fragmentShader: strip(compiled.sceneFragment), uniforms: { type_SceneFrame: { value: data }, SPIRV_Cross_CombinedalbedoalbedoSampler: { value: tex } }, side: T.DoubleSide }); mat.userData = { data, mode, color }; return mat; }
            function mesh(g: T.BufferGeometry, pos = [0, 0, 0], color?: number[], mode?: number) { const primary = scene.children.length === 0; const m = new T.Mesh(g, material(mode, color)); if (primary) {
                const expanded = g.index ? g.toNonIndexed() : g;
                for (const [name, key] of [['position', 'positionHash'], ['normal', 'normalHash']]) {
                    const attr = expanded.getAttribute(name);
                    if (attr) {
                        const bytes = new Uint8Array(attr.array.buffer, attr.array.byteOffset, attr.array.byteLength);
                        let hash = 2166136261;
                        for (const byte of bytes)
                            hash = Math.imul(hash ^ byte, 16777619);
                        renderer.domElement.dataset[key] = (hash >>> 0).toString(16);
                    }
                }
                if (expanded !== g)
                    expanded.dispose();
            } m.position.set(...pos as [
                number,
                number,
                number
            ]); m.onBeforeRender = (_r, _s, cam) => { const d = m.material.userData.data as Float32Array; const mv = new T.Matrix4().multiplyMatrices(cam.matrixWorldInverse, m.matrixWorld); const clip = new T.Matrix4().multiplyMatrices(cam.projectionMatrix, mv); d.set(clip.elements, 0); d.set(m.matrixWorld.elements, 16); d.set(new T.Matrix4().copy(m.matrixWorld).invert().transpose().elements, 32); d.set([...(m.material.userData.color as number[]), 1], 48); d.set([light.x, light.y, light.z, s.kind === 'lightSphere' ? 0 : .12], 52); d.set([m.material.userData.mode, s.metal ?? 0, s.roughness ?? .5, 0], 56); const eye = new T.Vector3().setFromMatrixPosition(cam.matrixWorld); d.set([eye.x, eye.y, eye.z, 1], 60); m.material.uniformsNeedUpdate = true; }; scene.add(m); return m; }
            if (s.kind === 'scene') {
                mesh(new T.BoxGeometry(1, 1, 1), [-.8, -.2, 0], [1, 1, 1], 2);
                if (s.selectedTriangle)
                    highlight(cubeTriangle([-.8, -.2, 0]));
                mesh(new T.SphereGeometry(.55, 24, 16), [.8, -.15, 0]);
                mesh(new T.BoxGeometry(3.6, .08, 2.8), [0, -.75, 0], [.12, .18, .3]);
                mesh(new T.PlaneGeometry(.6, .55), [0, .75, -.6], [.2, .8, .7], 0);
            }
            else if (s.kind === 'assets') {
                camera.position.set(.8, 1.4, 5.8);
                camera.lookAt(0, -.25, 0);
                camera.updateMatrixWorld();
                const items: [string, T.BufferGeometry, number[], number][] = [
                    ['Куб', new T.BoxGeometry(1, 1, 1), [-2, .7, 0], 1],
                    ['Шар', new T.SphereGeometry(.55, 24, 16), [.3, .7, 0], 1],
                    ['Квад', new T.PlaneGeometry(.6, .55), [2.1, .7, 0], 1],
                    ['Площадка', new T.BoxGeometry(3.6, .08, 2.8), [0, -1.5, 0], .8]
                ];
                for (const [name, g, pos, k] of items) {
                    const lines = new T.LineSegments(new T.WireframeGeometry(g), new T.LineBasicMaterial({ color: '#c1caff' }));
                    lines.position.set(pos[0], pos[1], pos[2]);
                    lines.scale.setScalar(k);
                    scene.add(lines);
                    const triangles = (g.index ? g.index.count : g.getAttribute('position').count) / 3;
                    label(`${name} · ${triangles} треуг.`, name === 'Площадка' ? new T.Vector3(0, pos[1] - .2, 1.6) : new T.Vector3(pos[0], pos[1] - 1.05, .75));
                    g.dispose();
                }
                if (s.selectedTriangle)
                    highlight(cubeTriangle([-2, .7, 0]));
            }
            else {
                let g: T.BufferGeometry = new T.SphereGeometry(1.3, s.detail || 12, Math.max(4, (s.detail || 12) / 2));
                if (s.flat) {
                    g = g.toNonIndexed();
                    g.computeVertexNormals();
                }
                mesh(g);
                if (s.kind === 'lightSphere') {
                    const origin = new T.Vector3(0, 0, 1.32);
                    const marker = mesh(new T.SphereGeometry(.07, 12, 8), [origin.x, origin.y, origin.z], [1, 1, 1], 0);
                    marker.renderOrder = 1;
                    scene.add(new T.ArrowHelper(new T.Vector3(0, 0, 1), origin, 1.1, 0x68d7bf));
                    scene.add(new T.ArrowHelper(light, origin, 1.1, 0xffc066));
                    label('N', origin.clone().add(new T.Vector3(0, 0, 1.1)), -14);
                    label('L', origin.clone().addScaledVector(light, 1.1), 14);
                }
            }
            renderer.setSize(el.clientWidth, el.clientHeight, false);
            renderer.render(scene, camera);
            renderer.domElement.dataset.triangles = String(renderer.info.render.triangles);
            renderer.domElement.dataset.camera = JSON.stringify({ position: camera.position.toArray(), projection: camera.projectionMatrix.elements });
        };
        draw.current = rebuild;
        rebuild(latest.current);
        const resize = new ResizeObserver(() => rebuild(latest.current));
        resize.observe(el);
        return () => { resize.disconnect(); clean(); tex.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); draw.current = () => { }; };
    }, [caption]);
    useEffect(() => draw.current(spec), [spec]);
    return <div className="scene-host" ref={host} role="img" aria-label={caption}/>;
}
