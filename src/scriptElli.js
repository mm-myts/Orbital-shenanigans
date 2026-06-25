
const MU = 398600.4418;
const RE = 6371;

const C = {
  bg: '#0f1117', bg2: '#1a1a2e', grid: '#2a2a3a',
  text: '#e0e0e0', muted: '#888888',
  blue: '#4a9eff', orange: '#ff7c3a', green: '#3ecf8e',
  red: '#ff4e4e', purple: '#b57aff', yellow: '#f7c948'
};

function linspace(a, b, n) {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(a + (b - a) * i / (n - 1));
  return arr;
}

function avg(arr) { return arr.reduce((s, x) => s + x, 0) / arr.length; }

// Kepler
function keplerE(M, e) {
  let E = [...M];
  for (let iter = 0; iter < 50; iter++) {
    let maxdE = 0;
    for (let i = 0; i < E.length; i++) {
      const dE = (M[i] - E[i] + e * Math.sin(E[i])) / (1 - e * Math.cos(E[i]));
      E[i] += dE;
      maxdE = Math.max(maxdE, Math.abs(dE));
    }
    if (maxdE < 1e-12) break;
  }
  return E;
}

// Speed along an ellipse
function ellipseV(t_arr, r_peri, r_apo, reverse) {
  const a = (r_peri + r_apo) / 2;
  const e = (r_apo - r_peri) / (r_apo + r_peri);
  const T = Math.PI * Math.sqrt(a**3 / MU);
  const M = t_arr.map(t => {
    const tc = reverse ? T - Math.min(Math.max(t, 0), T)
                       : Math.min(Math.max(t, 0), T);
    return Math.PI * tc / T;
  });
  const E = keplerE(M, e);
  return E.map(Ei => {
    const r = a * (1 - e * Math.cos(Ei));
    return Math.sqrt(MU * (2/r - 1/a));
  });
}

//  Main
function run() {
  const errEl = document.getElementById('error-msg');
  errEl.style.display = 'none';

  const alt1 = parseFloat(document.getElementById('alt1').value);
  const alt2 = parseFloat(document.getElementById('alt2').value);
  const altb = parseFloat(document.getElementById('altb').value);

  if (isNaN(alt1) || isNaN(alt2)) {
    errEl.textContent = 'Enter valid altitudes.';
    errEl.style.display = 'block'; return;
  }
  if (alt2 <= alt1) {
    errEl.textContent = 'Target altitude must be higher than initial.';
    errEl.style.display = 'block'; return;
  }

  const r1 = RE + alt1;   // km
  const r2 = RE + alt2;   // km
  const rb = RE + altb;   // intermediate apoapsis

  //  Transfer ellipse 1
  const a1  = (r1 + rb) / 2;
  const T1  = Math.PI * Math.sqrt(a1**3 / MU);   
  const v1  = Math.sqrt(MU / r1);               
  const vT1p = Math.sqrt(MU * (2/r1 - 1/a1));   
  const vT1a = Math.sqrt(MU * (2/rb - 1/a1));  

  //  Transfer ellipse 2
  const a2   = (r2 + rb) / 2;
  const T2   = Math.PI * Math.sqrt(a2**3 / MU);  
  const v2   = Math.sqrt(MU / r2);               
  const vT2a = Math.sqrt(MU * (2/rb - 1/a2));    
  const vT2p = Math.sqrt(MU * (2/r2 - 1/a2));    

  //  Three burns
  const dv1 = vT1p - v1;         
  const dv2 = vT2a - vT1a;       
  const dv3 = v2   - vT2p;       
  const dvTotal = Math.abs(dv1) + Math.abs(dv2) + Math.abs(dv3);

  //  Hohmann comparison
  const aH   = (r1 + r2) / 2;
  const vHp  = Math.sqrt(MU * (2/r1 - 1/aH));
  const vHa  = Math.sqrt(MU * (2/r2 - 1/aH));
  const dvH  = (vHp - v1) + (v2 - vHa);
  const dvDiff = dvTotal - dvH;

  const Ttotal = T1 + T2;

  // Sidebar
  document.getElementById('s-v1').textContent  = `${v1.toFixed(4)} km/s`;
  document.getElementById('s-v2').textContent  = `${v2.toFixed(4)} km/s`;
  document.getElementById('s-dv1').textContent = `+${dv1.toFixed(4)} km/s`;
  document.getElementById('s-dv2').textContent = `+${dv2.toFixed(4)} km/s`;
  document.getElementById('s-dv3').textContent = `+${dv3.toFixed(4)} km/s`;
  document.getElementById('s-dvt').textContent = `${dvTotal.toFixed(4)} km/s`;
  const Tmin = Ttotal / 60;
  document.getElementById('s-tt').textContent  =
    Tmin > 90 ? `${(Tmin/60).toFixed(2)} hr` : `${Tmin.toFixed(1)} min`;
  const sign = dvDiff >= 0 ? '+' : '';
  document.getElementById('s-hcomp').textContent = `${sign}${dvDiff.toFixed(4)} km/s`;

  document.getElementById('geo-placeholder').style.display = 'none';
  document.getElementById('vt-placeholder').style.display  = 'none';

  drawGeo(r1, r2, rb, a1, a2, alt1, alt2, dv1, dv2, dv3);
  drawVt(r1, r2, rb, T1, T2, v1, v2,
         vT1p, vT1a, vT2a, vT2p, dv1, dv2, dv3);
}

//  Orbital geometry 
function drawGeo(r1, r2, rb, a1, a2, alt1, alt2, dv1, dv2, dv3) {
  const theta = linspace(0, 2*Math.PI, 500);

  const circle = r => ({
    x: theta.map(t => r * Math.cos(t)),
    y: theta.map(t => r * Math.sin(t))
  });

  const ellipseArc = (r_peri, r_apo, startAngle, endAngle, n=300) => {
    const a  = (r_peri + r_apo) / 2;
    const e  = (r_apo  - r_peri) / (r_apo + r_peri);
    const th = linspace(startAngle, endAngle, n);
    
    return {
      x: th.map(t => a * Math.cos(t) - a * e),
      y: th.map(t => a * Math.sqrt(1 - e**2) * Math.sin(t))
    };
  };

  const earth = circle(RE);
  const atmo  = circle(RE * 1.04);
  const orb1  = circle(r1);
  const orb2  = circle(r2);
  const orbB  = circle(rb);

  // Transfer ellipse 1
  const ell1  = ellipseArc(r1, rb, 0, Math.PI);

  // Transfer ellipse 2
  const ell2  = ellipseArc(r2, rb, Math.PI, 2*Math.PI);

  // Direction arrows
  const arrowOnEllipse = (r_peri, r_apo, th_frac) => {
    const a = (r_peri + r_apo) / 2;
    const e = (r_apo - r_peri) / (r_apo + r_peri);
    const th = Math.PI * th_frac;
    return {
      x:  a * Math.cos(th) - a * e,
      y:  a * Math.sqrt(1-e**2) * Math.sin(th),
      dx: -Math.sin(th) * rb * 0.03,
      dy:  Math.cos(th) * Math.sqrt(1-e**2) * rb * 0.03
    };
  };

  const arr1 = arrowOnEllipse(r1, rb, 0.48);
  const arr2 = (() => {
    const a = (r2 + rb) / 2;
    const e = (rb - r2) / (rb + r2);
    const th = Math.PI * 1.52;
    return {
      x:  a * Math.cos(th) - a * e,
      y:  a * Math.sqrt(1-e**2) * Math.sin(th),
      dx:  Math.sin(th) * rb * 0.03,
      dy: -Math.cos(th) * Math.sqrt(1-e**2) * rb * 0.03
    };
  })();

  const lim    = rb * 1.12;
  const offset = rb * 0.03;

  const traces = [
    { x: earth.x, y: earth.y, fill:'toself', fillcolor: C.earth || '#1a6fa8',
      line:{ color:'#1a6fa8', width:0 }, name:'Earth', hoverinfo:'skip' },
    { x: atmo.x,  y: atmo.y,  fill:'toself', fillcolor:'rgba(26,111,168,0.08)',
      line:{ color:'rgba(26,111,168,0.15)', width:1 }, hoverinfo:'skip', showlegend:false },
    { x: orb1.x, y: orb1.y, mode:'lines', line:{ color:C.blue,   width:2 },
      name:`Initial orbit (${alt1} km)`,
      hovertemplate:'x: %{x:.0f} km<br>y: %{y:.0f} km<extra>Initial orbit</extra>' },
    { x: orb2.x, y: orb2.y, mode:'lines', line:{ color:C.green,  width:2 },
      name:`Target orbit (${alt2} km)`,
      hovertemplate:'x: %{x:.0f} km<br>y: %{y:.0f} km<extra>Target orbit</extra>' },
    { x: orbB.x, y: orbB.y, mode:'lines', line:{ color:C.purple, width:1.2, dash:'dot' },
      name:`Intermediate apoapsis (r_b)`, opacity:0.5,
      hovertemplate:'x: %{x:.0f} km<br>y: %{y:.0f} km<extra>Intermediate orbit</extra>' },
    { x: ell1.x, y: ell1.y, mode:'lines', line:{ color:C.orange, width:2, dash:'dash' },
      name:'Transfer ellipse 1',
      hovertemplate:'x: %{x:.0f} km<br>y: %{y:.0f} km<extra>Ellipse 1</extra>' },
    { x: ell2.x, y: ell2.y, mode:'lines', line:{ color:C.purple, width:2, dash:'dash' },
      name:'Transfer ellipse 2',
      hovertemplate:'x: %{x:.0f} km<br>y: %{y:.0f} km<extra>Ellipse 2</extra>' },
    // Burn markers
    { x: [r1, -rb, r2], y: [0, 0, 0], mode:'markers',
      marker:{ color:C.red, size:10, line:{ color:C.bg, width:2 } },
      name:'Burns',
      text:[`Burn 1 — Δv₁ = +${dv1.toFixed(3)} km/s`,
            `Burn 2 — Δv₂ = +${dv2.toFixed(3)} km/s`,
            `Burn 3 — Δv₃ = +${dv3.toFixed(3)} km/s`],
      hovertemplate:'<b>%{text}</b><extra></extra>' },
  ];

  const layout = {
    paper_bgcolor: C.bg, plot_bgcolor: C.bg,
    font:{ color:C.text, family:"'SF Mono','Fira Code','Consolas',monospace" },
    margin:{ l:55, r:20, t:50, b:50 },
    title:{ text:'Orbital geometry', font:{ size:13, color:C.text }, x:0.5 },
    showlegend: true,
    legend:{ bgcolor:C.bg2, bordercolor:C.grid, borderwidth:1, font:{ size:10 } },
    xaxis:{ range:[-lim, lim], constrain:'domain',
            gridcolor:C.grid, linecolor:C.grid, griddash:'dot',
            tickfont:{ color:C.muted, size:9 },
            title:{ text:'x  (km)', font:{ color:C.text, size:11 } } },
    yaxis:{ range:[-lim, lim], scaleanchor:'x', scaleratio:1,
            gridcolor:C.grid, linecolor:C.grid, griddash:'dot',
            tickfont:{ color:C.muted, size:9 },
            title:{ text:'y  (km)', font:{ color:C.text, size:11 } } },
    annotations: [
      { x:0, y:0, text:'Earth', showarrow:false, font:{ color:'#a0d4f5', size:9 } },
      { x:r1  + offset, y: offset, text:'Δv₁', showarrow:false,
        font:{ color:C.red, size:11 }, xanchor:'left' },
      { x:-rb - offset, y: offset, text:'Δv₂', showarrow:false,
        font:{ color:C.red, size:11 }, xanchor:'right' },
      { x:r2  + offset, y:-offset, text:'Δv₃', showarrow:false,
        font:{ color:C.red, size:11 }, xanchor:'left' },
      // Arrow on ellipse 1
      { x: arr1.x+arr1.dx, y: arr1.y+arr1.dy, ax: arr1.x, ay: arr1.y,
        xref:'x', yref:'y', axref:'x', ayref:'y',
        showarrow:true, arrowhead:2, arrowsize:1.2, arrowcolor:C.orange, arrowwidth:2 },
      // Arrow on ellipse 2
      { x: arr2.x+arr2.dx, y: arr2.y+arr2.dy, ax: arr2.x, ay: arr2.y,
        xref:'x', yref:'y', axref:'x', ayref:'y',
        showarrow:true, arrowhead:2, arrowsize:1.2, arrowcolor:C.purple, arrowwidth:2 },
    ]
  };

  Plotly.react('geo-chart', traces, layout, { responsive:true, displayModeBar:false });
}

//  v(t) 
function drawVt(r1, r2, rb, T1, T2, v1, v2,
                vT1p, vT1a, vT2a, vT2p, dv1, dv2, dv3) {

  const pre_dur  = T1 * 0.10;
  const post_dur = T2 * 0.10;
  const N = 600;

  // Time segments (seconds, t=0 at burn 1)
  const t_pre    = linspace(-pre_dur, 0,       200);
  const t_coast1 = linspace(0,        T1,      N);
  const t_coast2 = linspace(T1,       T1+T2,   N);
  const t_post   = linspace(T1+T2,    T1+T2+post_dur, 200);

  // Speeds
  const v_pre    = t_pre.map(() => v1);
  const v_coast1 = ellipseV(t_coast1.map(t => t),           r1, rb, false);
  const v_coast2 = ellipseV(t_coast2.map(t => t - T1),      r2, rb, true); 
  const v_post   = t_post.map(() => v2);

  const t_all = [...t_pre, ...t_coast1, ...t_coast2, ...t_post];
  const v_all = [...v_pre, ...v_coast1, ...v_coast2, ...v_post];
  const t_min = t_all.map(t => t / 60);

  const t0  = 0;
  const tB2 = T1 / 60;
  const tB3 = (T1 + T2) / 60;
  const tEnd = t_min[t_min.length - 1];
  const tStart = t_min[0];

  // Segment masks
  const seg = (lo, hi) => {
    const ts = [], vs = [];
    t_all.forEach((t, i) => { if (t >= lo && t <= hi) { ts.push(t/60); vs.push(v_all[i]); } });
    return { t: ts, v: vs };
  };

  const sPre    = seg(-pre_dur, 0);
  const sCoast1 = seg(0,  T1);
  const sCoast2 = seg(T1, T1+T2);
  const sPost   = seg(T1+T2, T1+T2+post_dur);

  const vMax = Math.max(vT1p, vT2a) * 1.25;
  const span1 = tB2 - t0;
  const span2 = tB3 - tB2;

  const traces = [
    { x: sPre.t,    y: sPre.v,    mode:'lines', line:{ color:C.blue,   width:2.2 },
      name:'Initial orbit',
      hovertemplate:'t: %{x:.1f} min<br>v: %{y:.4f} km/s<extra>Initial orbit</extra>' },
    { x: sCoast1.t, y: sCoast1.v, mode:'lines', line:{ color:C.orange, width:2.2 },
      name:'Transfer ellipse 1',
      hovertemplate:'t: %{x:.1f} min<br>v: %{y:.4f} km/s<extra>Ellipse 1</extra>' },
    { x: sCoast2.t, y: sCoast2.v, mode:'lines', line:{ color:C.purple, width:2.2 },
      name:'Transfer ellipse 2',
      hovertemplate:'t: %{x:.1f} min<br>v: %{y:.4f} km/s<extra>Ellipse 2</extra>' },
    { x: sPost.t,   y: sPost.v,   mode:'lines', line:{ color:C.green,  width:2.2 },
      name:'Final orbit',
      hovertemplate:'t: %{x:.1f} min<br>v: %{y:.4f} km/s<extra>Final orbit</extra>' },
    // Burn dots
    { x: [t0, t0, tB2, tB2, tB3, tB3],
      y: [v1, vT1p, vT1a, vT2a, vT2p, v2],
      mode:'markers', marker:{ color:C.red, size:7 },
      name:'Burns',
      text:[`Before Δv₁: ${v1.toFixed(4)} km/s`,
            `After  Δv₁: ${vT1p.toFixed(4)} km/s`,
            `Before Δv₂: ${vT1a.toFixed(4)} km/s`,
            `After  Δv₂: ${vT2a.toFixed(4)} km/s`,
            `Before Δv₃: ${vT2p.toFixed(4)} km/s`,
            `After  Δv₃: ${v2.toFixed(4)} km/s`],
      hovertemplate:'<b>%{text}</b><extra></extra>' },
  ];

  const layout = {
    paper_bgcolor: C.bg, plot_bgcolor: C.bg,
    font:{ color:C.text, family:"'SF Mono','Fira Code','Consolas',monospace" },
    margin:{ l:65, r:20, t:50, b:50 },
    title:{ text:'v(t)', font:{ size:13, color:C.text }, x:0.5 },
    showlegend: true,
    legend:{ bgcolor:C.bg2, bordercolor:C.grid, borderwidth:1, font:{ size:10 } },
    xaxis:{ range:[tStart, tEnd * 1.10],
            gridcolor:C.grid, linecolor:C.grid,
            tickfont:{ color:C.muted, size:9 },
            title:{ text:'Time  (minutes)', font:{ color:C.text, size:11 } } },
    yaxis:{ range:[0, vMax],
            gridcolor:C.grid, linecolor:C.grid,
            tickfont:{ color:C.muted, size:9 },
            title:{ text:'Speed  (km/s)', font:{ color:C.text, size:11 } } },
    shapes: [
      // Burn vertical lines
      ...[t0, tB2, tB3].map(t => ({
        type:'line', x0:t, x1:t, y0:0, y1:vMax,
        line:{ color:C.red, width:0.8, dash:'dot' }, opacity:0.5
      })),
      // Reference lines
      { type:'line', x0:tStart, x1:tEnd*1.10, y0:v1, y1:v1,
        line:{ color:C.blue,  width:0.7, dash:'dash' }, opacity:0.4 },
      { type:'line', x0:tStart, x1:tEnd*1.10, y0:v2, y1:v2,
        line:{ color:C.green, width:0.7, dash:'dash' }, opacity:0.4 },
    ],
    annotations: [
      // Burn arrows
      { x:t0,  y:vT1p, ax:t0,  ay:v1,
        xref:'x', yref:'y', axref:'x', ayref:'y',
        showarrow:true, arrowhead:2, arrowsize:1.2, arrowcolor:C.red, arrowwidth:2 },
      { x:tB2, y:vT2a, ax:tB2, ay:vT1a,
        xref:'x', yref:'y', axref:'x', ayref:'y',
        showarrow:true, arrowhead:2, arrowsize:1.2, arrowcolor:C.red, arrowwidth:2 },
      { x:tB3, y:v2,   ax:tB3, ay:vT2p,
        xref:'x', yref:'y', axref:'x', ayref:'y',
        showarrow:true, arrowhead:2, arrowsize:1.2, arrowcolor:C.red, arrowwidth:2 },
      // Δv labels
      { x:t0  + span1*0.02, y:(v1+vT1p)/2,
        text:`Δv₁ = +${dv1.toFixed(3)} km/s`, showarrow:false,
        font:{ color:C.red, size:10 }, xanchor:'left' },
      { x:tB2 + span2*0.02, y:(vT1a+vT2a)/2,
        text:`Δv₂ = +${dv2.toFixed(3)} km/s`, showarrow:false,
        font:{ color:C.red, size:10 }, xanchor:'left' },
      { x:tB3 + span2*0.02, y:(vT2p+v2)/2,
        text:`Δv₃ = +${dv3.toFixed(3)} km/s`, showarrow:false,
        font:{ color:C.red, size:10 }, xanchor:'left' },
      // v reference labels
      { x:tEnd*1.002, y:v1, text:`v₁ = ${v1.toFixed(3)} km/s`,
        showarrow:false, font:{ color:C.blue,  size:9 }, xanchor:'left' },
      { x:tEnd*1.002, y:v2, text:`v₂ = ${v2.toFixed(3)} km/s`,
        showarrow:false, font:{ color:C.green, size:9 }, xanchor:'left' },
      // Phase labels
      { x:avg(sPre.t),    y:v1    + vMax*0.04, text:'Initial orbit',
        showarrow:false, font:{ color:C.blue,   size:9 } },
      { x:avg(sCoast1.t), y:vMax  * 0.55,      text:'Ellipse 1',
        showarrow:false, font:{ color:C.orange, size:9 } },
      { x:avg(sCoast2.t), y:vMax  * 0.55,      text:'Ellipse 2',
        showarrow:false, font:{ color:C.purple, size:9 } },
      { x:avg(sPost.t),   y:v2    + vMax*0.04, text:'Final orbit',
        showarrow:false, font:{ color:C.green,  size:9 } },
    ]
  };

  Plotly.react('vt-chart', traces, layout, { responsive:true, displayModeBar:false });
}

document.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
window.addEventListener('load', run);