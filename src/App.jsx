import React, { useEffect, useMemo, useRef, useState } from 'react'

// tiny router
function useHashRoute() {
  const [route, setRoute] = useState(() => (location.hash.replace(/^#/, '') || '/'));
  useEffect(() => {
    const onHash = () => setRoute(location.hash.replace(/^#/, '') || '/');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route;
}
const navigate = (to) => {
  const next = to.startsWith('#') ? to : `#${to}`;
  if (location.hash !== next) {
    location.hash = next;
  } else {
    // force a route update even if the hash is the same
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
};

// micro UI
function MicroButton({ children, onClick, title, active = false }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={
        "group inline-flex items-center justify-center select-none " +
        "h-7 px-2 text-[10px] font-mono uppercase tracking-wide " +
        "border border-black/60 shadow-[inset_0_1px_0_#fff,inset_0_-1px_0_#999,1px_1px_0_#000] " +
        (active
          ? "bg-[linear-gradient(#cfe7ff,#9ec4ff)] text-black"
          : "bg-[linear-gradient(#f9f9f9,#d9d9d9)] text-black hover:bg-[linear-gradient(#ffffff,#dfe7ff)]")
      }
      style={{ imageRendering: "pixelated" }}
    >
      <span className="border border-white/70 px-2 py-[1px] bg-white/40 shadow-inner group-active:translate-y-[1px]">
        {children}
      </span>
    </button>
  );
}

function NavBar({ motionOn, setMotionOn }) {
  const items = [
    { id: "home", label: "Home", to: "/" },
    { id: "atrium", label: "Atrium", to: "/atrium" },
  ];
  return (
    <div className="sticky top-0 z-50 w-full bg-slate-50/80 backdrop-blur border-b border-black/20">
      <div className="mx-auto max-w-6xl px-4 py-1 flex flex-wrap gap-2 items-center">
        {items.map((s) => (
          <a key={s.id} href={`#${s.to}`} className="no-underline">
            <MicroButton title={s.label}>{s.label}</MicroButton>
          </a>
        ))}
        <div className="ml-auto flex gap-2 items-center">
          <MicroButton title="Toggle animation" onClick={() => setMotionOn((v) => !v)} active={motionOn}>
            {motionOn ? "Motion ON" : "Motion OFF"}
          </MicroButton>
        </div>
      </div>
    </div>
  );
}

function Frame({ id, title, children, footer }) {
  return (
    <div
      id={id}
      className={
        "relative rounded-2xl border border-black/40 " +
        "bg-white " +
        "shadow-[0_2px_0_#000,0_4px_0_#777,0_8px_16px_rgba(0,0,0,.15)] overflow-hidden"
      }
    >
      <div className="p-2 border-b border-dotted border-black/40 bg-white/70 rounded-t-2xl">
        <div className="text-sm font-semibold tracking-wide font-sans text-gray-700">{title}</div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
      {footer && (
        <div className="p-3 border-t border-dotted border-black/40 bg-white/60 text-sm sm:text-base">
          <strong className="font-bold">{footer.main}</strong>
          <span className="mx-2">—</span>
          <em>{footer.sub}</em>
        </div>
      )}
    </div>
  );
}

// utils
function noise2D(x, y) {
  const s = Math.sin(x * 12.9898 + y * 4.1414) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}
function mandelbrotIter(x0, y0, maxIter) {
  let x = 0, y = 0, x2 = 0, y2 = 0, iter = 0;
  while (x2 + y2 <= 4 && iter < maxIter) { y = 2 * x * y + y0; x = x2 - y2 + x0; x2 = x * x; y2 = y * y; iter++; }
  return iter;
}
function hslToRgb(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => { const k = (n + h * 12) % 12; return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); };
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}

// Mandelbrot (rotated 90° CW, slow auto-zoom)
function MandelbrotPillar({ running }) {
  const ref = useRef(null);
  const stateRef = useRef({ cx: -0.5, cy: 0.0, scale: 3.2, dragging: false, lastX: 0, lastY: 0, interactCooldown: 0 });
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const off = document.createElement("canvas");
    const octx = off.getContext("2d", { willReadFrequently: true });

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.clientWidth | 0;
      const H = (canvas.clientHeight | 0) || 360;
      canvas.width = W * dpr; canvas.height = H * dpr;
      off.width = W; off.height = H;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); const ro = new ResizeObserver(resize); ro.observe(canvas);
    let raf;

    function renderFractal(targetCtx) {
      const W = off.width, H = off.height;
      const { cx, cy, scale } = stateRef.current;
      const maxIter = 140;
      const img = targetCtx.createImageData(W, H);
      const data = img.data;
      for (let py = 0; py < H; py++) {
        const y0 = cy + (py / H - 0.5) * scale;
        for (let px = 0; px < W; px++) {
          const x0 = cx + (px / W - 0.5) * scale * (W / H);
          let x = 0, y = 0, iter = 0; let x2 = 0, y2 = 0;
          while (x2 + y2 <= 4 && iter < maxIter) { y = 2 * x * y + y0; x = x2 - y2 + x0; x2 = x * x; y2 = y * y; iter++; }
          const idx = (py * W + px) * 4;
          if (iter === maxIter) { data[idx]=0; data[idx+1]=0; data[idx+2]=0; data[idx+3]=255; }
          else {
            const mu = iter - Math.log(Math.log(Math.sqrt(x2 + y2))) / Math.log(2);
            const v = Math.max(0, Math.min(1, mu / maxIter));
            const g = Math.round(255 * (1 - v)); // white outer, darker near boundary
            data[idx]=g; data[idx+1]=g; data[idx+2]=g; data[idx+3]=255;
          }
        }
      }
      targetCtx.putImageData(img, 0, 0);
    }

    function draw() {
      const W = off.width, H = off.height;
      octx.clearRect(0, 0, W, H);
      renderFractal(octx);
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.translate(W / 2, H / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(off, 0, 0, W, H, -W / 2, -H / 2, W, H);
      ctx.restore();
    }

    const loop = () => {
      const s = stateRef.current;
      if (s.interactCooldown > 0) s.interactCooldown -= 1; else s.scale *= 0.9997;
      draw();
      raf = requestAnimationFrame(loop);
    };
    loop();

    function onDown(e){ const s=stateRef.current; s.dragging=true; s.lastX=e.offsetX; s.lastY=e.offsetY; s.interactCooldown=240; }
    function onUp(){ stateRef.current.dragging=false; }
    function onMove(e){ const s=stateRef.current; if(!s.dragging) return; const W=off.width,H=off.height; const dx=e.offsetX-s.lastX, dy=e.offsetY-s.lastY; s.lastX=e.offsetX; s.lastY=e.offsetY; s.cx += (dx/W)*s.scale*(W/H); s.cy += (dy/H)*s.scale; }
    function onWheel(e){ const s=stateRef.current; const W=off.width,H=off.height; const sgn=e.deltaY>0?1:-1; const factor=Math.pow(1.1, sgn); const mx=e.offsetX/W-0.5; const my=e.offsetY/H-0.5; const cx=s.cx+mx*s.scale*(W/H); const cy=s.cy+my*s.scale; s.scale*=factor; const cx2=s.cx+mx*s.scale*(W/H); const cy2=s.cy+my*s.scale; s.cx+=cx-cx2; s.cy+=cy-cy2; s.interactCooldown=240; e.preventDefault(); }

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("wheel", onWheel, { passive:false });

    return () => { cancelAnimationFrame(raf); ro.disconnect(); canvas.removeEventListener("mousedown", onDown); window.removeEventListener("mouseup", onUp); canvas.removeEventListener("mousemove", onMove); canvas.removeEventListener("wheel", onWheel); };
  }, [running]);

  return <canvas className="rounded-md border border-black/30 bg-[#ffffff] w-full h-[360px]" ref={ref}/>;
}

// Geyser: differential-equation vector field with arrows + spray
function WaterPillar({ running = true }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.clientWidth | 0;
      const H = canvas.clientHeight | 0;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(); const ro = new ResizeObserver(resize); ro.observe(canvas);

    const field = (x,y,t) => {
      const W=canvas.clientWidth|0,H=canvas.clientHeight|0;
      const nx=(x/W)*2-1, ny=(y/H)*2-1;
      // Smooth curl-like field using layered sines; slow temporal evolution
      const f1 = Math.sin(1.6*nx + 0.8*t) * Math.cos(1.3*ny - 0.6*t);
      const f2 = Math.sin(1.1*ny - 0.5*t) * Math.cos(1.4*nx + 0.7*t);
      const curlX =  0.6*f1 - 0.4*f2 + 0.25*ny;
      const curlY = -0.4*f1 + 0.6*f2 - 0.25*nx;
      return [curlX, curlY];
    };

    const N = 300; const P = new Array(N).fill(0).map(()=>({x:0,y:0,life:0}));
    const respawn = (p) => { const W=canvas.clientWidth|0,H=canvas.clientHeight|0; p.x=Math.random()*W; p.y=Math.random()*H; p.life=120+Math.random()*200; };
    P.forEach(respawn);
    let t=0, raf;
    function drawBackground(initial=false){
      const W=canvas.clientWidth|0,H=canvas.clientHeight|0;
      if(initial){
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0,0,W,H);
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.06)"; // light trail on white
        ctx.fillRect(0,0,W,H);
      }
    }
    drawBackground(true);

    function drawFlowLines(){
      const W=canvas.clientWidth|0,H=canvas.clientHeight|0;
      const cols=10, rows=8, steps=16, stepLen=6; // sparse, smooth ribbons
      ctx.save();
      ctx.globalAlpha=0.35;
      ctx.lineWidth=1.25;
      ctx.strokeStyle="rgba(0,0,0,0.35)";
      for(let r=0;r<rows;r++){
        for(let c=0;c<cols;c++){
          let x=(c+0.5)*(W/cols), y=(r+0.5)*(H/rows);
          ctx.beginPath(); ctx.moveTo(x,y);
          for(let k=0;k<steps;k++){
            const [vx,vy]=field(x,y,t*0.006);
            const ang=Math.atan2(vy,vx);
            x+=Math.cos(ang)*stepLen; y+=Math.sin(ang)*stepLen;
            ctx.lineTo(x,y);
          }
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    function drawParticles(){
      const W=canvas.clientWidth|0,H=canvas.clientHeight|0;
      ctx.save();
      ctx.globalCompositeOperation="lighter";
      for(const p of P){
        const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,2.0);
        g.addColorStop(0,"rgba(0,0,0,0.55)");
        g.addColorStop(0.7,"rgba(0,0,0,0.25)");
        g.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=g;
        ctx.beginPath(); ctx.arc(p.x,p.y,1.4,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }

    function stepParticles(){
      const dt=0.85;
      for(const p of P){
        const [vx1,vy1]=field(p.x,p.y,t*0.006);
        const midx=p.x+0.5*dt*vx1*3, midy=p.y+0.5*dt*vy1*3;
        const [vx2,vy2]=field(midx,midy,t*0.006+0.5*dt);
        p.x+=dt*vx2*3; p.y+=dt*vy2*3; p.life-=1;
        const W=canvas.clientWidth|0,H=canvas.clientHeight|0;
        if(p.x<-20) p.x=W+20; if(p.x>W+20) p.x=-20;
        if(p.y<-20) p.y=H+20; if(p.y>H+20) p.y=-20;
        if(p.life<=0) respawn(p);
      }
    }

    function loop(){ if(running) t++; stepParticles(); drawBackground(false); drawFlowLines(); drawParticles(); raf=requestAnimationFrame(loop); }
    loop();

    return ()=>{ cancelAnimationFrame(raf); ro.disconnect(); };
  }, [running]);

  return <canvas ref={ref} data-testid="water-field-canvas" className="w-full h-[360px] rounded-md border border-black/30 bg-[#ffffff]"/>;
}

// Rule 30
function CellularPillar({ running }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return; const ctx = canvas.getContext("2d");
    let raf, ticks=0; let W=0,H=0; const cell=4; const base=24; const gutter=8; let cols=0,rows=0; let grid=[]; const rule=new Uint8Array([0,1,1,1,1,0,0,0]); let steps=0;
    function sizeCanvas(){ const dpr=window.devicePixelRatio||1; const cssW=canvas.clientWidth|0; const cssH=(canvas.clientHeight|0)||360; canvas.width=cssW*dpr; canvas.height=cssH*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); W=cssW; H=cssH; }
    function resetSim(){
      // After 90° CW rotation, horizontal span = H and vertical span = W
      cols = Math.max(1, Math.floor((H - 2*gutter) / cell));
      rows = Math.max(1, Math.floor((W - base) / cell));
      grid = new Array(rows).fill(0).map(() => new Uint8Array(cols));
      steps = 0;
      grid[0][(cols>>1)] = 1; // centered initial condition
      drawBackground();
      drawRow(0);
    }
    function drawBackground(){
      ctx.save();
      ctx.translate(W, 0); // rotate 90° clockwise
      ctx.rotate(Math.PI/2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, H, W); // cover full canvas in rotated space
      ctx.restore();
    }
    function drawRow(y){
      // In rotated space, vertical span corresponds to original W
      const yPix = W - base - (y+1)*cell; if (yPix + cell < 0) return;
      ctx.save();
      ctx.translate(W, 0);
      ctx.rotate(Math.PI/2);
      ctx.fillStyle = "#0a0a0a";
      const row = grid[y];
      for (let x=0; x<cols; x++) {
        if (row[x]) ctx.fillRect(gutter + x*cell, yPix, cell, cell);
      }
      ctx.restore();
    }
    function stepMany(){ const target=Math.min(rows-1, steps+4); while(steps<target){ const prev=grid[steps]; const next=grid[steps+1]; for(let x=0;x<cols;x++){ const l=prev[(x-1+cols)%cols], c=prev[x], r=prev[(x+1)%cols]; next[x]=rule[(l<<2)|(c<<1)|r]; } steps++; drawRow(steps); } }
    function loop(){ if(ticks===0){ sizeCanvas(); resetSim(); } if(running && steps<rows-1 && ticks%8===0) stepMany(); raf=requestAnimationFrame(loop); ticks++; }
    const ro=new ResizeObserver(()=>{ sizeCanvas(); resetSim(); }); sizeCanvas(); resetSim(); ro.observe(canvas); loop();
    return ()=>{ cancelAnimationFrame(raf); ro.disconnect(); };
  }, [running]);
  return <canvas ref={ref} data-testid="cellular-canvas" className="rounded-md border border-black/30 bg-[#ffffff] w-full h-[360px]"/>;
}

// Footer art
function FooterArt() {
  const base =
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.BASE_URL
      ? import.meta.env.BASE_URL
      : '';
  const url = `${base}assets/sanctum_art.png`;
  return (
    <img
      data-testid="footer-art"
      src={url}
      alt="Atrium illustration"
      className="w-full max-h-[460px] object-contain rounded-2xl border border-black/30 bg-black/5 shadow-[0_2px_0_#000,0_4px_10px_rgba(0,0,0,.15)]"
    />
  );
}

// Error boundary for friendly fallback
class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error){ return { hasError: true, error }; }
  componentDidCatch(error, info){ console.error('UI error:', error, info); }
  render(){ if (this.state.hasError) { return (
    <div className="mx-auto max-w-3xl p-4 text-sm font-mono bg-red-50 border border-red-200 rounded-md">
      <div className="font-bold mb-1">Something went wrong rendering this page.</div>
      <div className="opacity-70">{String(this.state.error)}</div>
      <div className="mt-2">
        <a href="#/" className="underline">Go Home</a>
      </div>
    </div>
  ); } return this.props.children; }
}
// Simple particle aura for project cards
function Particles({ count = 60 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return; const ctx = canvas.getContext('2d');
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const { clientWidth: W, clientHeight: H } = canvas.parentElement;
      canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    ro.observe(canvas.parentElement);

    const P = new Array(count).fill(0).map(() => ({
      x: Math.random(), y: Math.random(),
      r: 1 + Math.random() * 2.2,
      s: 0.4 + Math.random() * 1.2,
      h: Math.floor(Math.random() * 360)
    }));
    let t = 0, raf;
    function loop() {
      const { width: W, height: H } = canvas;
      ctx.clearRect(0,0,W,H);
      ctx.globalAlpha = 0.8;
      for (const p of P) {
        const x = p.x * (W / (window.devicePixelRatio||1));
        const y = p.y * (H / (window.devicePixelRatio||1));
        ctx.fillStyle = `hsla(${(p.h + t*0.3)%360}, 80%, 60%, 0.6)`;
        ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI*2); ctx.fill();
        // drift
        p.x += (Math.sin(t*0.01 + x*0.002) + 0.3) * 0.0007 * p.s;
        p.y += (Math.cos(t*0.012 + y*0.002) - 0.1) * 0.0007 * p.s;
        if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;
      }
      t++; raf = requestAnimationFrame(loop);
    }
    loop();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [count]);
  return <canvas ref={ref} className="absolute inset-0 pointer-events-none"/>;
}

// Background: tasteful modern starfield/nebula (Hubble‑inspired)
function StarfieldCosmos({ density = 0.9 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return; const ctx = canvas.getContext('2d', { alpha: true });
    let raf, t = 0; let W = 0, H = 0;

    // Create stars with subtle twinkle
    let STARS = [];
    const makeStars = () => {
      const count = Math.floor((W * H) / (12000) * density); // scales with area
      STARS = new Array(count).fill(0).map(() => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.4 + 0.4,           // radius
        b: 0.5 + Math.random() * 0.5,           // base brightness
        p: Math.random() * Math.PI * 2,         // phase
        c: Math.random() < 0.1 ? [190, 210, 255] : [230, 235, 255] // occasional cool blue stars
      }));
    };

    // Soft nebula backdrop pre-rendered to an offscreen canvas
    const nebula = document.createElement('canvas');
    const nctx = nebula.getContext('2d');
    const drawNebula = () => {
      nebula.width = W; nebula.height = H; nctx.clearRect(0, 0, W, H);
      // Large, desaturated radial washes — deep blue to violet with hints of teal
      const blobs = Math.max(3, Math.floor((W + H) / 900));
      for (let i = 0; i < blobs; i++) {
        const cx = Math.random() * W, cy = Math.random() * H;
        const r = Math.random() * (Math.min(W, H) * 0.6) + Math.min(W, H) * 0.25;
        const g = nctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        const hue = 210 + Math.random() * 60; // 210–270
        const sat = 25 + Math.random() * 15;  // soft saturation
        const a0 = 0.045 + Math.random() * 0.035;
        const a1 = 0;
        g.addColorStop(0, `hsla(${hue}, ${sat}%, 62%, ${a0})`);
        g.addColorStop(1, `hsla(${hue+10|0}, ${sat-10|0}%, 10%, ${a1})`);
        nctx.fillStyle = g; nctx.beginPath(); nctx.arc(cx, cy, r, 0, Math.PI * 2); nctx.fill();
      }
      // Very faint dust
      nctx.fillStyle = 'rgba(255,255,255,0.02)';
      for (let i = 0; i < (W * H) / 22000; i++) { nctx.fillRect(Math.random()*W, Math.random()*H, 1, 1); }
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      // Fill parent box; prefer its scrollHeight to cover tall content
      const parent = canvas.parentElement; const rect = parent.getBoundingClientRect();
      W = Math.max(1, parent.clientWidth | 0); H = Math.max(1, parent.scrollHeight | 0);
      canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeStars(); drawNebula();
    };
    resize(); const ro = new ResizeObserver(resize); ro.observe(canvas.parentElement);

    const draw = () => {
      // gentle cosmic tint
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(nebula, 0, 0);
      // Stars
      ctx.globalCompositeOperation = 'lighter';
      for (const s of STARS) {
        const tw = s.b * (0.85 + 0.15 * Math.sin(t * 0.006 + s.p));
        const rg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3.2);
        rg.addColorStop(0, `rgba(${s.c[0]},${s.c[1]},${s.c[2]},${0.9 * tw})`);
        rg.addColorStop(0.6, `rgba(${s.c[0]},${s.c[1]},${s.c[2]},${0.35 * tw})`);
        rg.addColorStop(1, `rgba(${s.c[0]},${s.c[1]},${s.c[2]},0)`);
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 2.6, 0, Math.PI * 2); ctx.fill();
      }
    };

    const loop = () => { t++; draw(); raf = requestAnimationFrame(loop); };
    loop();

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [density]);

  return <canvas ref={ref} className="absolute inset-0 -z-10 pointer-events-none" />;
}

// Autoplay once when first visible; click toggles pause/play. No re-autoplay on revisit.
function AutoPlayVideo({ file, className = "" }) {
  const vref = useRef(null);
  const hasAutoPlayed = useRef(false);
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '';
  const src = `${base}assets/${encodeURIComponent(file)}`;

  useEffect(() => {
    const v = vref.current; if (!v) return;
    v.muted = true; // allow autoplay on most browsers
    v.playsInline = true;

    const onPlaying = () => { hasAutoPlayed.current = true; };
    const onEnded = () => { /* stop at end; do not loop; clicking will restart */ };
    v.addEventListener('playing', onPlaying);
    v.addEventListener('ended', onEnded);

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !hasAutoPlayed.current) {
          v.play().catch(() => {});
        }
      });
    }, { threshold: 0.5 });
    io.observe(v);

    return () => { io.disconnect(); v.removeEventListener('playing', onPlaying); v.removeEventListener('ended', onEnded); };
  }, []);

  const onClick = () => {
    const v = vref.current; if (!v) return;
    if (v.ended) {
      v.currentTime = 0;
      v.play().catch(() => {});
      return;
    }
    if (v.paused) { v.play().catch(() => {}); } else { v.pause(); }
  };

  return (
    <video ref={vref} className={className} preload="metadata" muted playsInline onClick={onClick}>
      <source src={src} type="video/mp4" />
    </video>
  );
}

// Mouse‑scrubbed square video (no autoplay)
function ScrubVideo({ file, className = "" }) {
  const vref = useRef(null);
  const wrapRef = useRef(null);
  const [dur, setDur] = useState(0);
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '';
  const src = `${base}assets/${encodeURIComponent(file)}`;

  // Track metadata to know duration
  useEffect(() => {
    const v = vref.current; if (!v) return;
    const onMeta = () => setDur(v.duration || 0);
    v.addEventListener('loadedmetadata', onMeta);
    return () => v.removeEventListener('loadedmetadata', onMeta);
  }, []);

  // rAF guard to avoid spamming currentTime on fast mousemove
  const rafRef = useRef(null);
  const pendingT = useRef(null);
  useEffect(() => {
    const v = vref.current; if (!v) return;
    const tick = () => {
      rafRef.current = null;
      if (pendingT.current == null) return;
      const t = pendingT.current; pendingT.current = null;
      try { v.pause(); } catch {}
      if (dur > 0) {
        v.currentTime = Math.min(Math.max(t, 0), dur - 0.001);
      }
    };
    const loop = () => { if (rafRef.current == null && pendingT.current != null) { rafRef.current = requestAnimationFrame(tick); } };
    const id = setInterval(loop, 16);
    return () => { clearInterval(id); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [dur]);

  const onMouseMove = (e) => {
    const box = wrapRef.current?.getBoundingClientRect(); if (!box) return;
    const rel = (e.clientX - box.left) / Math.max(1, box.width);
    const clamped = Math.min(1, Math.max(0, rel));
    pendingT.current = clamped * (dur || 0);
  };

  return (
    <div ref={wrapRef} onMouseMove={onMouseMove} className={`relative aspect-square w-full overflow-hidden rounded-md border border-black/20 bg-black ${className}`}>
      <video
        ref={vref}
        className="absolute inset-0 w-full h-full object-cover"
        preload="metadata"
        playsInline
        // no autoplay; paused; scrubbed by mouse
      >
        <source src={src} type="video/mp4" />
      </video>
      <div className="absolute bottom-1 left-1 right-1 text-[11px] text-white/90 bg-black/30 px-2 py-1 rounded-sm pointer-events-none">
        Move cursor left ↔ right to scrub
      </div>
    </div>
  );
}
// Scroll‑scrubbed video (frames advance with scroll while hovered). No autoplay.
function ScrollScrubVideo({ file, className = "" }) {
  const vref = useRef(null);
  const wrapRef = useRef(null);
  const [dur, setDur] = useState(0);
  const [hover, setHover] = useState(false);
  const fps = 24;                         // visual frame rate for stepping
  const totalFramesRef = useRef(0);       // computed from duration * fps
  const frameIdxRef = useRef(0);          // current frame index (integer)
  const targetIdxRef = useRef(0);         // target frame index from input
  const steppingRef = useRef(false);      // is the stepper loop running?
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '';
  const src = `${base}assets/${encodeURIComponent(file)}`;

  // Load duration and compute total frames for discrete stepping
  useEffect(() => {
    const v = vref.current; if (!v) return;
    const onMeta = () => {
      const d = v.duration || 0;
      setDur(d);
      const total = Math.max(1, Math.floor(d * fps));
      totalFramesRef.current = total;
      frameIdxRef.current = Math.min(frameIdxRef.current, total - 1);
      targetIdxRef.current = frameIdxRef.current;
      // ensure we start at first frame position
      try { v.pause(); } catch {}
      if (total > 0) v.currentTime = frameIdxRef.current / fps;
    };
    v.addEventListener('loadedmetadata', onMeta);
    return () => v.removeEventListener('loadedmetadata', onMeta);
  }, []);

  // Stepper loop: move one frame toward target on each animation frame
  useEffect(() => {
    const v = vref.current; if (!v) return;
    let raf = null;
    const step = () => {
      const total = totalFramesRef.current;
      let cur = frameIdxRef.current;
      const tgt = targetIdxRef.current;
      if (cur !== tgt) {
        cur += (tgt > cur ? 1 : -1);
        frameIdxRef.current = cur;
        const t = Math.min(dur, Math.max(0, cur / fps));
        try { v.pause(); } catch {}
        v.currentTime = t;
        raf = requestAnimationFrame(step);
      } else {
        steppingRef.current = false;
        raf = null;
      }
    };
    const ensureRunning = () => {
      if (!steppingRef.current) {
        steppingRef.current = true;
        raf = requestAnimationFrame(step);
      }
    };
    // Expose to wheel handler via closure
    (ScrollScrubVideo.__ensureRunningMap || (ScrollScrubVideo.__ensureRunningMap = new WeakMap())).set(v, ensureRunning);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [dur]);

  // Wheel -> adjust target frame index slowly; stepper animates one-by-one
  useEffect(() => {
    const el = wrapRef.current; const v = vref.current; if (!el || !v) return;
    const getEnsure = () => (ScrollScrubVideo.__ensureRunningMap && ScrollScrubVideo.__ensureRunningMap.get(v));
    const onWheel = (e) => {
      if (!hover) return;
      e.preventDefault();
      if (!dur) return;
      const total = totalFramesRef.current || Math.max(1, Math.floor(dur * fps));
      // Map wheel delta to a small frame delta. Typical notches ~ +/−100.
      const framesPerNotch = 1.2; // tune: ~1–2 frames per notch
      const deltaFrames = Math.round((-e.deltaY / 100) * framesPerNotch);
      const next = Math.min(total - 1, Math.max(0, targetIdxRef.current + deltaFrames));
      targetIdxRef.current = next;
      const ensure = getEnsure(); if (ensure) ensure();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => { el.removeEventListener('wheel', onWheel); };
  }, [dur, hover]);

  return (
    <div
      ref={wrapRef}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`relative w-full aspect-square overflow-hidden rounded-md border border-black/20 bg-black shadow-sm ${className}`}
    >
      <video
        ref={vref}
        className="absolute inset-0 w-full h-full object-cover"
        preload="metadata"
        playsInline
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}

// Glassy card with warm ambient glow + big fireflies (no parallax) and hover lift shadow
function AmbientGlowCard({ children, variant = "rainbow" }) {
  const wrapRef = useRef(null);
  const fireRef = useRef(null);

  // Ensure the warm glow keyframes exist once
  useEffect(() => {
    const id = 'warm-glow-keys';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = `
      @keyframes warmGlowShift {
        0% { transform: translate3d(-10%, -6%, 0) scale(1.05); filter: hue-rotate(0deg) saturate(1); }
        50% { transform: translate3d(8%, 6%, 0) scale(1.02); filter: hue-rotate(10deg) saturate(1.08); }
        100% { transform: translate3d(-10%, -6%, 0) scale(1.05); filter: hue-rotate(0deg) saturate(1); }
      }`;
      document.head.appendChild(style);
    }
  }, []);

  const bgGradient = variant === "warm"
    ? `radial-gradient(60% 80% at 20% 20%, rgba(255,199,150,0.22) 0%, rgba(255,199,150,0.08) 38%, rgba(0,0,0,0) 62%),
       radial-gradient(70% 70% at 80% 70%, rgba(255,160,120,0.20) 0%, rgba(255,160,120,0.06) 42%, rgba(0,0,0,0) 66%),
       radial-gradient(65% 65% at 40% 85%, rgba(255,190,140,0.18) 0%, rgba(255,190,140,0.05) 40%, rgba(0,0,0,0) 65%)`
    : `
      radial-gradient(60% 80% at 15% 20%, hsla(20, 90%, 70%, 0.20) 0%, hsla(20, 90%, 70%, 0.06) 35%, rgba(0,0,0,0) 60%),
      radial-gradient(65% 75% at 85% 65%, hsla(200, 85%, 70%, 0.20) 0%, hsla(200, 85%, 70%, 0.06) 40%, rgba(0,0,0,0) 65%),
      radial-gradient(70% 70% at 40% 85%, hsla(300, 75%, 72%, 0.18) 0%, hsla(300, 75%, 72%, 0.05) 40%, rgba(0,0,0,0) 65%)
    `;

  // Bigger, fainter, more numerous embers; complementary rainbow pairs; dynamic turning
  useEffect(() => {
    const canvas = fireRef.current, wrap = wrapRef.current; if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const W = wrap.clientWidth | 0, H = wrap.clientHeight | 0;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    ro.observe(wrap);

    const COUNT = 40;
    const F = new Array(COUNT).fill(0).map(() => {
      const baseHue = variant === "warm" ? (22 + Math.random() * 18) : (Math.random() * 360);
      const isPair = variant === "warm" ? (Math.random() < 0.35) : (Math.random() < 0.55);
      return {
        x: Math.random(), y: Math.random(),
        r: 96 + Math.random() * 160,
        sp: 0.18 + Math.random() * 0.32,
        a: Math.random() * Math.PI * 2,
        turn: 0.012 + Math.random() * 0.028,
        hue: baseHue,
        hue2: isPair ? ((variant === "warm" ? baseHue + 8 + Math.random() * 12 : baseHue + 180) % 360)
                      : ((variant === "warm" ? baseHue + 16 + Math.random() * 10 : baseHue + 40 + Math.random() * 40) % 360),
        alpha: variant === "warm" ? (0.18 + Math.random() * 0.10) : (0.16 + Math.random() * 0.12)
      };
    });

    let t = 0, raf;
    const loop = () => {
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.width / dpr, H = canvas.height / dpr;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      for (const f of F) {
        const px = f.x * W, py = f.y * H;
        const flick = 0.9 + 0.1 * Math.sin(0.003 * t + px * 0.001 + py * 0.0013);
        const a0 = f.alpha * flick;

        // First glow (base hue)
        let g = ctx.createRadialGradient(px, py, 0, px, py, f.r);
        g.addColorStop(0, `hsla(${f.hue}, 95%, 62%, ${a0})`);
        g.addColorStop(0.4, `hsla(${f.hue}, 90%, 55%, ${a0 * 0.55})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, f.r, 0, Math.PI * 2); ctx.fill();

        // Second glow (complementary / near‑complement) slightly larger for interaction
        const r2 = f.r * 1.18;
        g = ctx.createRadialGradient(px, py, 0, px, py, r2);
        g.addColorStop(0, `hsla(${f.hue2}, 90%, 60%, ${a0 * 0.8})`);
        g.addColorStop(0.5, `hsla(${f.hue2}, 85%, 52%, ${a0 * 0.38})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, r2, 0, Math.PI * 2); ctx.fill();

        // dynamic heading changes with smooth noise — energetic turning & shifting
        const n = noise2D(px * 0.002 + t * 0.002, py * 0.002 - t * 0.0016);
        f.a += f.turn * 0.6 + n * 0.14;
        const v = f.sp * 2.4;
        f.x += Math.cos(f.a) * v * 0.0019;
        f.y += Math.sin(f.a) * v * 0.0019;

        // wrap with padding for large orbs
        if (f.x < -0.28) f.x = 1.28; if (f.x > 1.28) f.x = -0.28;
        if (f.y < -0.28) f.y = 1.28; if (f.y > 1.28) f.y = -0.28;
      }

      t++;
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [variant]);

  return (
    <div
      ref={wrapRef}
      className="relative rounded-xl p-[1px] overflow-hidden transform-gpu transition-all duration-300 shadow-[0_6px_24px_rgba(0,0,0,0.10)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.22)] hover:-translate-y-0.5"
    >
      {/* Ambient warm glow background layer */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: bgGradient,
          animation: 'warmGlowShift 28s ease-in-out infinite',
          filter: 'blur(32px)'
        }}
      />

      {/* Under-glass fireflies layer */}
      <canvas ref={fireRef} className="absolute inset-0 pointer-events-none" />

      {/* Subtle inner border to suggest glass edge */}
      <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08), inset 0 1px 8px rgba(255,255,255,0.35)' }} />

      {/* Glass content */}
      <div className="relative rounded-xl bg-white/40 backdrop-blur-md border border-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.12)] p-4">
        {children}
      </div>
    </div>
  );
}

// ProblemMap — an illustrative network of interconnections among crises
function ProblemMap() {
  // Node schema
  const nodes = [
    { id: 'cling',  label: 'Clinging &\nDualistic Fixation', x: 50, y: 50, r: 34, hue: 12,  author: 'Nāgārjuna',                      source: 'Mūlamadhyamakakārikā', desc: 'Root cognitive habit that splits subject/object and drives grasping.' },
    { id: 'double', label: 'Post‑Copernican\nDouble Bind',     x: 18, y: 18, r: 26, hue: 230, author: 'Richard Tarnas',               source: 'Passion of the Western Mind', desc: 'Modernity’s split between human meaning and an indifferent cosmos.' },
    { id: 'techno', label: 'Techno‑feudalism',                  x: 82, y: 22, r: 24, hue: 260, author: 'Yanis Varoufakis',            source: 'Technofeudalism (2023)', desc: 'Platform enclosure and rent extraction across digital/real economies.' },
    { id: 'dsi',    label: 'Digital\nSuperintelligence',        x: 84, y: 78, r: 26, hue: 200, author: 'Ray Kurzweil (and others)',   source: 'The Singularity Is Near', desc: 'Runaway capability growth with alignment and control risks.' },
    { id: 'debt',   label: 'Multi‑scale\nTechnical Debt',        x: 52, y: 88, r: 24, hue: 40,  author: 'Ward Cunningham',            source: 'Technical Debt Metaphor (1992)', desc: 'Compounded shortcuts in code, orgs, and infra that slow adaptation.' },
    { id: 'arrest', label: 'Systematic\nArrested Development',   x: 18, y: 82, r: 26, hue: 150, author: 'Ken Wilber; Bill Plotkin',   source: 'SES; Nature and the Human Soul', desc: 'Individual and cultural plateaus that block maturation and wisdom.' },
    { id: 'eco',    label: 'Ecocide',                           x: 50, y: 18, r: 26, hue: 100, author: 'Joanna Macy',                 source: 'World as Lover, World as Self', desc: 'Systemic overshoot and degradation of living systems.' },
  ];

  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null); // { x, y, title, sub }
  const tooltipStyle = useMemo(() => {
    if (!hover || !wrapRef.current) return undefined;
    const rect = wrapRef.current.getBoundingClientRect();
    const left = hover.x - rect.left + 12;
    const top = hover.y - rect.top + 12;
    return { left, top };
  }, [hover]);

  // Spread nodes: center the "cling" node and arrange others on a ring
  const positioned = useMemo(() => {
    const center = nodes.find(n => n.id === 'cling');
    const others = nodes.filter(n => n.id !== 'cling');
    const R = 34; // percent of viewBox
    const cx = 50, cy = 50;
    const placed = [{ ...center, px: cx, py: cy }];
    const N = others.length;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      placed.push({ ...others[i], px: cx + R * Math.cos(t), py: cy + R * Math.sin(t) });
    }
    const map = Object.fromEntries(placed.map(p => [p.id, p]));
    return { list: placed, map };
  }, [nodes]);

  // Edges show conceptual influence/feedbacks
  const edges = [
    ['cling','double'], ['cling','techno'], ['cling','dsi'], ['cling','debt'], ['cling','arrest'], ['cling','eco'],
    ['double','techno'], ['double','dsi'],
    ['techno','eco'],
    ['debt','dsi'],
    ['arrest','techno'], ['arrest','dsi'], ['arrest','debt'],
    ['debt','eco'], ['arrest','eco']
  ];

  // Utility to get node by id
  const byId = positioned.map;

  // Helper: SVG curved link between two nodes (use positioned px/py)
  function linkPath(a, b) {
    const dx = b.px - a.px, dy = b.py - a.py;
    const mx = (a.px + b.px) / 2, my = (a.py + b.py) / 2;
    const k = 0.12; const ox = -dy * k, oy = dx * k;
    const cx = mx + ox, cy = my + oy;
    return `M ${a.px},${a.py} Q ${cx},${cy} ${b.px},${b.py}`;
  }

  return (
    <div ref={wrapRef} className="w-full h-[52vh] sm:h-[60vh] rounded-xl border border-black/10 bg-white/70 p-3 shadow-sm relative">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          {/* soft node glow */}
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" result="b"/>
            <feMerge>
              <feMergeNode in="b"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          {/* gradient stroke for edges */}
          {edges.map(([s,t], i) => {
            const a = byId[s], b = byId[t];
            return (
              <linearGradient key={`g${i}`} id={`g${i}`} x1={`${a.px}%`} y1={`${a.py}%`} x2={`${b.px}%`} y2={`${b.py}%`}>
                <stop offset="0%" stopColor={`hsl(${a.hue},70%,45%)`} stopOpacity="0.85"/>
                <stop offset="100%" stopColor={`hsl(${b.hue},70%,45%)`} stopOpacity="0.85"/>
              </linearGradient>
            );
          })}
        </defs>

        {/* edges */}
        <g strokeWidth="0.7" fill="none" opacity="0.85">
          {edges.map(([s,t], i) => {
            const a = byId[s], b = byId[t];
            return (
              <path key={i} d={linkPath(a,b)} stroke={`url(#g${i})`} />
            );
          })}
        </g>

        {/* nodes */}
        <g filter="url(#softGlow)">
          {positioned.list.map((n) => (
            <g
              key={n.id}
              transform={`translate(${n.px} ${n.py})`}
              className="group cursor-pointer"
              onMouseEnter={(e) => setHover({ x: e.clientX, y: e.clientY, title: n.label.replace(/\n/g, ' '), sub: n.desc, meta: (n.author && n.source) ? `${n.author} — ${n.source}` : '' })}
              onMouseMove={(e) => setHover((h) => h ? { ...h, x: e.clientX, y: e.clientY } : h)}
              onMouseLeave={() => setHover(null)}
            >
              <circle
                r={n.r/12}
                fill={`hsl(${n.hue}, 90%, 65%)`}
                stroke="rgba(0,0,0,0.25)"
                strokeWidth="0.25"
                className="transition-all duration-200 group-hover:scale-[1.08]"
              />
              <circle r={n.r/12 + 1.5} fill={`hsla(${n.hue}, 95%, 70%, 0.18)`} />
              <text
                textAnchor="middle"
                fontSize="2.4"
                fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
                fill="#0a0a0a"
              >
                {n.label.split(/\n/g).map((line, i) => (
                  i === 0
                    ? <tspan key={i} x="0" y={n.r/12 + 4}>{line}</tspan>
                    : <tspan key={i} x="0" dy="3">{line}</tspan>
                ))}
              </text>
            </g>
          ))}
        </g>
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 px-2 py-1 text-[11px] leading-tight rounded-md bg-black text-white shadow-lg"
          style={tooltipStyle}
        >
          <div className="font-semibold">{hover.title}</div>
          {hover.sub && <div className="opacity-80">{hover.sub}</div>}
          {hover.meta ? <div className="opacity-60 mt-[2px]">{hover.meta}</div> : null}
        </div>
      )}
    </div>
  );
}

// Pages
function HomePage() {
  // Quick-scroll buttons (new order)
  const navSections = [
    { id: "projects", label: "Projects" },
    { id: "futurology", label: "Futurology" },
    { id: "why", label: "Why" },
    { id: "courses", label: "Courses" },
    { id: "inspirations", label: "Inspirations" },
    { id: "who", label: "Who am I" },
    { id: "acknowledgements", label: "Acknowledgements" },
  ];

  function handleNav(e, id) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.location.hash = "#" + id;
  }

  // Asset hooks for images placed under public/assets
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '';
  const courseMap = base + 'assets/course_map.png';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[0.12em] font-serif italic">Futurology &amp; Design</h1>
      </div>

      {/* Sticky quick-scroll navigation */}
      <div className="sticky top-12 z-40">
        <nav className="flex flex-wrap justify-center gap-2 mt-8 mb-10">
          {navSections.map((s) => (
            <button
              key={s.id}
              className="px-4 py-1.5 rounded-md bg-white/80 border border-black/10 text-sm font-sans tracking-wide hover:bg-slate-100 transition shadow-sm"
              onClick={(e) => handleNav(e, s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* 1) Concentration Overview */}
        <Frame id="futurology" title="Concentration Overview">
          <div className="text-sm leading-relaxed space-y-4 bg-black text-white rounded-xl p-4">
            {(
              <div className="w-full flex justify-center">
                <AutoPlayVideo file="futurology island questions animated.mp4" className="w-full max-w-2xl h-auto rounded-md bg-white" />
              </div>
            )}
            <p></p>
            <p>
              During the crises of the 1960s, Brown students articulated three guiding questions that culminated in the creation of the open curriculum. Reengaging those questions today, I have developed a concentration integrating wisdom traditions, complexity science, and systems design to generate futures responsive to contemporary meta-systemic issues. I see this concentration as part of an evolving story of taking responsibility for one’s education and experimentally facing the future from first principles.
            </p>
            <div className="mt-3 flex items-center justify-center">
              <a href="#/atrium" className="no-underline">
                <MicroButton title="Enter the Atrium">Enter the Atrium →</MicroButton>
              </a>
            </div>
          </div>
        </Frame>

        {/* 2) Projects */}
        <Frame id="projects" title="Projects">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Curriculum redesign */}
            <AmbientGlowCard variant="warm">
              <h3 className="font-semibold mb-2">Curriculum redesign</h3>
              <ul className="list-disc ml-6 space-y-2 text-sm">
                <li>Prototype a new integrative curriculum at Brown.</li>
                <li>Weave wisdom traditions, complexity science, and design studio.</li>
                <li>Artifacts: syllabi, maps, pilots, and reflection frameworks.</li>
              </ul>
              {/* Video + DOCX preview blocks remain exactly as they were */}
              <div className="mt-4">
                <div className="text-xs font-sans mb-1 opacity-70">Prototype video</div>
                <div className="aspect-video w-full rounded-md overflow-hidden border border-black/20 shadow-sm bg-black">
                  <iframe
                    data-testid="curriculum-video"
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/WBSoeA0onA8"
                    title="Spring 2025 presentation"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              </div>
              <div className="mt-4">
                {(() => {
                  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '';
                  const filename = 'Dec19_Cal_Into_the_Labyrinth  (1).docx';
                  const localPath = `${base}assets/${encodeURIComponent(filename)}`;
                  const origin = (typeof window !== 'undefined') ? window.location.origin : '';
                  const absolute = origin ? `${origin}${localPath}` : localPath;
                  const isLocalHost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
                  const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(absolute)}`;
                  const gviewUrl = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(absolute)}`;

                  if (isLocalHost) {
                    // Online viewers can’t fetch from local dev server – show helpful actions instead
                    return (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[13px]">
                        <div className="font-medium mb-2">Preview unavailable in local dev</div>
                        <p className="mb-2 opacity-80">Online viewers (Office/Google) can’t open files from your localhost. Use the download link below, or deploy to GitHub Pages and the inline preview will work.</p>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={localPath}
                            download
                            className="inline-flex items-center px-3 py-1.5 rounded-md bg-white border border-black/10 text-[12px] hover:bg-slate-100 shadow-sm no-underline"
                          >
                            Download DOCX
                          </a>
                          <a
                            href="#/atrium"
                            className="inline-flex items-center px-3 py-1.5 rounded-md bg-white border border-black/10 text-[12px] hover:bg-slate-100 shadow-sm no-underline"
                          >
                            Continue exploring the Atrium →
                          </a>
                        </div>
                      </div>
                    );
                  }

                  // Public URL: offer Office & Google viewers + inline preview
                  return (
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <a
                          href={officeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1.5 rounded-md bg-white/90 border border-black/10 text-[12px] hover:bg-slate-100 shadow-sm no-underline"
                        >
                          Open in Office Viewer
                        </a>
                        <a
                          href={gviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1.5 rounded-md bg-white/90 border border-black/10 text-[12px] hover:bg-slate-100 shadow-sm no-underline"
                        >
                          Open in Google Viewer
                        </a>
                        <a
                          href={localPath}
                          download
                          className="inline-flex items-center px-3 py-1.5 rounded-md bg-white/90 border border-black/10 text-[12px] hover:bg-slate-100 shadow-sm no-underline"
                        >
                          Download DOCX
                        </a>
                        <span className="text-[11px] opacity-60">Both viewers support animated GIFs when the file is publicly accessible.</span>
                      </div>
                      <details className="rounded-md border border-black/10 bg-white/70 overflow-hidden">
                        <summary className="cursor-pointer px-3 py-2 text-[12px]">Inline preview (Office Viewer)</summary>
                        <div className="aspect-[4/3] w-full">
                          <iframe
                            data-testid="curriculum-docx-iframe"
                            className="w-full h-full"
                            src={officeUrl}
                            title="Into the Labyrinth (DOCX Preview)"
                            frameBorder="0"
                          />
                        </div>
                      </details>
                    </div>
                  );
                })()}
              </div>
            </AmbientGlowCard>

            {/* Wisdom animation engine */}
            <AmbientGlowCard>
              <h3 className="font-semibold mb-2">Wisdom animation engine</h3>
              <ul className="list-disc ml-6 space-y-2 text-sm">
                <li>Generative visual system for contemplative pedagogy.</li>
                <li>Interactive micro-simulations and narrative beats.</li>
                <li>Outputs: loops, scenes, and live lecture overlays.</li>
              </ul>
              <div className="mt-4">
                <div className="text-xs font-sans mb-1 opacity-70">Pre-alpha prototype</div>
                {/* Autoplay once; square crop; centered */}
                <div className="w-full max-w-lg mx-auto">
                  <AutoPlayVideo
                    file="Animation of laptop system.mp4"
                    className="w-full aspect-square rounded-md border border-black/20 bg-black shadow-sm object-cover"
                  />
                </div>
              </div>
            </AmbientGlowCard>
          </div>
        </Frame>

        {/* 3) Why */}
        <Frame id="why" title="Why?">
          <div className="text-sm leading-relaxed space-y-4">
            <p>
            </p>
            <p>
              These are the web of challenges which my practice of futurism revolves around:
            </p>
            <div className="space-y-5">
              <ul className="list-disc ml-8 space-y-2">
              </ul>
              {/* Illustrative network connecting the above themes */}
              <figure className="w-full max-w-[640px] mx-auto">
                <div className="w-full">
                  <ProblemMap />
                </div>
                <figcaption className="mt-8 sm:mt-10 text-center text-[11px] leading-relaxed text-gray-700 max-w-[720px] mx-auto">
                  Center: patterns of grasping/duality shape perception and motivation; this conditions modernity’s double bind, which channels into techno‑economic forms that drive SI development and extraction. Compounding complexity (technical debt) and developmental plateaus reduce steering capacity, feeding back into ecological breakdown.{` `}
                  <a
                    href={base + 'assets/' + encodeURIComponent('metacrisis map.jpeg')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-1 underline-offset-2 text-blue-700 hover:text-blue-900"
                  >
                    See the detailed metacrisis map →
                  </a>
                </figcaption>
              </figure>
            </div>
            <p className="mt-4">
            </p>
          </div>
        </Frame>

        {/* 4) Courses (new section) */}
        <Frame id="courses" title="Courses">
          <div className="text-sm leading-relaxed">
            {(() => {
              const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '';
              const src = base + 'assets/' + encodeURIComponent('Course map.png');
              return (
                <div className="">
                  <img
                    src={src}
                    alt="Course map"
                    className="w-3/4 h-auto mx-auto rounded-md border border-black/0 object-contain bg-white"
                  />
                </div>
              );
            })()}
          </div>
        </Frame>

        {/* 5) Inspirations */}
        <Frame id="inspirations" title="Inspirations">
          <div className="text-sm leading-relaxed space-y-4">
            <p>
              The futurist genealogies I wish to explore are that of the contemplative scholar-practitioners and the futurist designers who have steered their communities, and even myself, away from dark futures. I admire design futurists like Rudolf Steiner, Buckminster Fuller, Douglas Englebart, and Jaron Lanier, as well as scholar-practitioners like Carl Jung, Thomas Berry, Francisco Varela, and William Irwin Thompson because they aligned the question of consciousness with the question of our systems of life with the question of our planetary destiny. Aligning our subjective experience (1st), with our actions/relationships (2nd), with our objective knowledge/shared planetary condition (3rd) allows our critiques to become new worlds through the full range of human faculties. I hope that this is the future of futurism.
            </p>
            <h4 className="font-bold">Contemplative Scholar-Practitioners Key Concepts:</h4>
            <div className="space-y-3">
              <ul className="list-disc ml-8 space-y-2">
                <li>Evolution of Consciousness (Pierre Teilhard de Chardin, Ken Wilber, Bernard Stiegler)</li>
                <li>Polycrisis & Metacrisis (Joanna Macy, Daniel Schmachtenberger)</li>
                <li>Tender Empiricism/Goethean Observation (Johann Wolfgang von Goethe)</li>
                <li>Active Imagination, Inner Alchemy, & Synchronicity (Carl Jung)</li>
                <li>Self-organization & Enactive Autopoiesis (Francisco Varela)</li>
                <li>Individual as Institution (William Irwin Thompson)</li>
                <li>Mythopoetic/Archaic Revival (Terence McKenna)</li>
                <li>Realization & Purification (Buddhist Textual Traditions)</li>
              </ul>
            </div>
            <h4 className="font-bold">Contemplative Design Futurists Key Concepts:</h4>
            <div className="space-y-3">
              <ul className="list-disc ml-8 space-y-2">
                <li>Redesigning Cultural Myths (Richard Tarnas)</li>
                <li>Ecological Design (Vandana Shiva)</li>
                <li>Media Ecology (Marshall McLuhan)</li>
                <li>Scale-Invariance, Computational Irreducibility, Emergence (Stephen Wolfram)</li>
                <li>Process-Theoretic View (Alfred North Whitehead)</li>
                <li>Intertwingularity (Ted Nelson)</li>
                <li>Comprehensive Anticipatory Design Science, Spaceship Earth & Ephemeralization (Buckminster Fuller)</li>
                <li>Spiritual Science (Rudolf Steiner)</li>
              </ul>
            </div>
            <div className="mt-6">
              {(() => {
                const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '';
                const src = base + 'assets/' + encodeURIComponent('face gallery.png');
                return (
                  <img
                    src={src}
                    alt="Face gallery"
                    className="w-full h-auto rounded-md border border-black/20 object-contain bg-white"
                  />
                );
              })()}
            </div>
          </div>
        </Frame>

        {/* 6) Who am I (near bottom, before acknowledgements) */}
        <Frame id="who" title="Who am I?">
          <div className="text-sm leading-relaxed space-y-4">
            <p>
              I am a multimedia artist, futurist, and designer. My work over the past 10 years has explored the evolution of consciousness in the context of AI human interaction.
            </p>
            <div className="mt-2 italic text-xs opacity-70">{'{selfie}'}</div>
          </div>
        </Frame>

        {/* 7) Acknowledgements (last) */}
        <Frame id="acknowledgements" title="Acknowledgements">
          <div className="space-y-4">
            <ul className="list-disc ml-8 space-y-2">
              <li>The inventors and stewards of Brown’s Open Curriculum</li>
              <li>The team at the CRC — especially Dean Peggy Chang</li>
              <li>Collaborators, companions and guides: Rose Roston, Gabe Toth, Oscar Petrov, Joseph O’Brien, Kelly Xiu, Reid Cooper, Harold Roth, Missy Lahren, Bill Waytena</li>
              <li>The land of Providence, Rhode Island</li>
              <li>The Drikung Kagyu lineage of Tibetan Buddhism, and my teacher Chökyi Nyima Rinpoche</li>
            </ul>
          </div>
        </Frame>
      </div>
    </div>
  );
}

function AtriumPage({ motionOn }) {
  const [bgUrl, setBgUrl] = useState(null);
  useEffect(() => {
    const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '';
    const candidates = [
      'Hubble_ultra_deep_field_high_rez_edit1.jpg',
      'Hubble_ultra_deep_field_high_rez_edit1.JPG',
      'hubble_ultra_deep_field_high_rez_edit1.jpg',
    ];
    let cancelled = false;
    const tryLoad = (i = 0) => {
      if (i >= candidates.length || cancelled) return;
      const url = `${base}assets/${candidates[i]}`;
      const img = new Image();
      img.onload = () => { if (!cancelled) setBgUrl(url); };
      img.onerror = () => { tryLoad(i + 1); };
      img.src = url;
    };
    tryLoad();
    return () => { cancelled = true; };
  }, []);
  return (
    <section className="relative w-full min-h-screen">
      {bgUrl ? (
        <>
          <div
            className="absolute inset-0 z-0 bg-center bg-cover"
            style={{ backgroundImage: `url(${bgUrl})` }}
          />
        </>
      ) : (
        <div className="absolute inset-0 z-0" style={{ background: '#ffffff' }} />
      )}

      {/* Centered content on top */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Frame title="Rule 30 (ECA 30)" footer={{ main: "How did we get here?", sub: "What is the history of ideas" }}>
            <CellularPillar running={motionOn} />
          </Frame>
          <Frame title="Geyser" footer={{ main: "What are we doing here?", sub: "how do our systems work today" }}>
            <WaterPillar running={motionOn} />
          </Frame>
          <Frame title="Mandelbrot Set" footer={{ main: "Where are we going?", sub: "What will become of humanity and what do we do about it" }}>
            <MandelbrotPillar running={motionOn} />
          </Frame>
        </div>
        <div className="mt-6 text-center text-sm opacity-80">
          ♡
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [motionOn, setMotionOn] = useState(true);
  const route = useHashRoute();
  useEffect(() => { if (!location.hash) navigate('#/'); }, []);
  return (
    <div className="bg-[#fcfcfc] text-black min-h-screen">
      <NavBar motionOn={motionOn} setMotionOn={setMotionOn} />
      <ErrorBoundary key={route}>
        {route === "/atrium" ? <AtriumPage motionOn={motionOn} /> : <HomePage />}
      </ErrorBoundary>
    </div>
  );
}
