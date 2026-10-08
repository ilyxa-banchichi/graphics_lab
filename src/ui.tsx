import { useEffect, useState } from 'react';
export const fmt = (x: number, d = 2) => x.toFixed(d).replace('.', ',');
export function Range({ label, value, onChange, min = 0, max = 1, step = 0.01, unit = '', precision = 2 }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    precision?: number;
}) { return <label className="range"><span>{label}<output>{fmt(value, precision)}{unit}</output></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}/></label>; }
export function Choices<T extends string>({ label, value, options, onChange }: {
    label: string;
    value: T;
    options: readonly (readonly [
        T,
        string
    ])[];
    onChange: (value: T) => void;
}) { return <div className="choice-field"><span className="field-label">{label}</span><div className="choice-buttons" role="group" aria-label={label}>{options.map(([id, text]) => <button key={id} aria-pressed={value === id} onClick={() => onChange(id)}>{text}</button>)}</div></div>; }
export function Toggle({ label, value, onChange }: {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
}) { return <label className="checkbox"><input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)}/>{label}</label>; }
export function Readout({ label, children }: {
    label: string;
    children: React.ReactNode;
}) { return <div className="readout"><span>{label}</span><strong>{children}</strong></div>; }
export function useTime(period = 8) { const [time, setTime] = useState(0), [playing, setPlaying] = useState(false); useEffect(() => { if (!playing)
    return; let last = performance.now(), raf = 0; const tick = (now: number) => { const dt = Math.min((now - last) / 1000, .1); last = now; setTime(t => (t + dt) % period); raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, [playing, period]); return { time, playing, setPlaying, setTime: (v: number) => { setPlaying(false); setTime(v); } }; }
export function Playback({ clock, max = 8 }: {
    clock: ReturnType<typeof useTime>;
    max?: number;
}) { return <><Range label="Время" value={clock.time} max={max} unit=" с" onChange={clock.setTime}/><div className="playback"><button className="primary-button" onClick={() => clock.setPlaying(!clock.playing)}>{clock.playing ? 'Пауза' : 'Запустить'}</button><button className="secondary-button" onClick={() => clock.setTime((clock.time + .1) % max)}>+0,1 с</button></div></>; }
export function vec(v: number[]) { return '(' + v.map(x => fmt(Math.abs(x) < .00001 ? 0 : x)).join('; ') + ')'; }
