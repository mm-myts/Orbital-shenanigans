
const MU = 398600.4418;   // km^3/s^2
const RE = 6371;           // km
 
const C = {
  bg: '#0f1117', bg2: '#1a1a2e', grid: '#2a2a3a',
  text: '#e0e0e0', muted: '#888888',
  blue: '#4a9eff', orange: '#ff7c3a', green: '#3ecf8e',
  red: '#ff4e4e', purple: '#b57aff'
};
 
function linspace(a, b, n) {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(a + (b - a) * i / (n - 1));
  return arr;
}
 
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
 
function hohmannV(t_arr, r1, r2) {
  const a = (r1 + r2) / 2;
  const e = (r2 - r1) / (r1 + r2);
  const T = Math.PI * Math.sqrt(a**3 / MU);
  const M = t_arr.map(t => Math.PI * Math.min(Math.max(t, 0), T) / T);
  const E = keplerE(M, e);
  return E.map(Ei => {
    const r = a * (1 - e * Math.cos(Ei));
    return Math.sqrt(MU * (2/r - 1/a));
  });
}
 
function vTotal(t_arr, r1, r2) {
  const a  = (r1 + r2) / 2;
  const T  = Math.PI * Math.sqrt(a**3 / MU);
  const v1 = Math.sqrt(MU / r1);
  const v2 = Math.sqrt(MU / r2);
  const coast_t = t_arr.filter(t => t >= 0 && t <= T);
  const coast_v = hohmannV(coast_t, r1, r2);
  let ci = 0;
  return t_arr.map(t => {
    if (t < 0)  return v1;
    if (t > T)  return v2;
    return coast_v[ci++];
  });
}
 
function avg(arr) { return arr.reduce((s, x) => s + x, 0) / arr.length; }
 
//  Main
function run() {
  const errEl = document.getElementById('error-msg');
  errEl.style.display = 'none';
 
  const alt1 = parseFloat(document.getElementById('alt1').value);
  const alt2 = parseFloat(document.getElementById('alt2').value);
  const m_dry = parseFloat(document.getElementById('mass').value);
  const ve_ms = parseFloat(document.getElementById('ve').value);
 
  if ([alt1, alt2, m_dry, ve_ms].some(isNaN)) {
    errEl.textContent = 'All four fields are required.';
    errEl.style.display = 'block'; return;
  }
  if (alt2 <= alt1) {
    errEl.textContent = 'Target altitude must be higher than initial.';
    errEl.style.display = 'block'; return;
  }
  if (m_dry <= 0 || ve_ms <= 0) {
    errEl.textContent = 'Mass and exhaust velocity must be positive.';
    errEl.style.display = 'block'; return;
  }
 
  const ve_kms = ve_ms / 1000;   // convert to km/s to match MU units
 
  const r1  = RE + alt1;
  const r2  = RE + alt2;
  const a   = (r1 + r2) / 2;
  const e   = (r2 - r1) / (r1 + r2);
  const T   = Math.PI * Math.sqrt(a**3 / MU);
  const v1  = Math.sqrt(MU / r1);
  const v2  = Math.sqrt(MU / r2);
  const vTp = Math.sqrt(MU * (2/r1 - 1/a));
  const vTa = Math.sqrt(MU * (2/r2 - 1/a));
  const dv1 = vTp - v1;
  const dv2 = v2  - vTa;
 
  // Tsiolkovsky
  // After burn 2: m_dry (empty)
  // Before burn 2: m_dry * e^(dv2/ve)
  const m_before_b2 = m_dry * Math.exp(dv2 / ve_kms);
  const m_fuel2     = m_before_b2 - m_dry;
 
  // Before burn 1: m_before_b2 * e^(dv1/ve)
  const m_wet       = m_before_b2 * Math.exp(dv1 / ve_kms);
  const m_fuel1     = m_wet - m_before_b2;
  const m_fuel_tot  = m_fuel1 + m_fuel2;
 
  // Sidebar stats
  document.getElementById('s-dv1').textContent = `+${dv1.toFixed(4)} km/s`;
  document.getElementById('s-dv2').textContent = `+${dv2.toFixed(4)} km/s`;
  document.getElementById('s-dvt').textContent = `${(dv1+dv2).toFixed(4)} km/s`;
  const Tmin = T / 60;
  document.getElementById('s-tt').textContent  = Tmin > 90
    ? `${(Tmin/60).toFixed(2)} hr` : `${Tmin.toFixed(1)} min`;
  document.getElementById('s-f1').textContent  = `${m_fuel1.toFixed(1)} kg`;
  document.getElementById('s-f2').textContent  = `${m_fuel2.toFixed(1)} kg`;
  document.getElementById('s-ft').textContent  = `${m_fuel_tot.toFixed(1)} kg`;
  document.getElementById('s-mw').textContent  = `${m_wet.toFixed(1)} kg`;
 
  document.getElementById('dv-placeholder').style.display   = 'none';
  document.getElementById('fuel-placeholder').style.display = 'none';
 
  drawVt(r1, r2, T, v1, v2, vTp, vTa, dv1, dv2);
  drawFuel(T, m_wet, m_before_b2, m_dry, m_fuel1, m_fuel2);
}
 
//  v(t)
function drawVt(r1, r2, T, v1, v2, vTp, vTa, dv1, dv2) {
  const pre_dur  = T * 0.12;
  const post_dur = T * 0.12;
  const t_pre    = linspace(-pre_dur, 0, 200);
  const t_coast  = linspace(0, T, 800);
  const t_post   = linspace(T, T + post_dur, 200);
  const t_all    = [...t_pre, ...t_coast, ...t_post];
  const t_min    = t_all.map(t => t / 60);
  const v_all    = vTotal(t_all, r1, r2);
 
  const mPre   = t_all.map(t => t < 0);
  const mCoast = t_all.map(t => t >= 0 && t <= T);
  const mPost  = t_all.map(t => t > T);
 
  const seg = m => ({
    t: t_min.filter((_, i) => m[i]),
    v: v_all.filter((_, i) => m[i]),
  });
 
  const pre   = seg(mPre);
  const coast = seg(mCoast);
  const post  = seg(mPost);
 
  const t0   = 0;
  const tT   = T / 60;
  const span = tT - t0;
  const tEnd = t_min[t_min.length - 1];
 
  const traces = [
    { x: pre.t,   y: pre.v,   mode: 'lines', line: { color: C.blue,   width: 2.2 },
      name: 'Initial orbit',
      hovertemplate: 't: %{x:.1f} min<br>v: %{y:.4f} km/s<extra>Initial orbit</extra>' },
    { x: coast.t, y: coast.v, mode: 'lines', line: { color: C.orange, width: 2.2 },
      name: 'Transfer ellipse',
      hovertemplate: 't: %{x:.1f} min<br>v: %{y:.4f} km/s<extra>Transfer ellipse</extra>' },
    { x: post.t,  y: post.v,  mode: 'lines', line: { color: C.green,  width: 2.2 },
      name: 'Final orbit',
      hovertemplate: 't: %{x:.1f} min<br>v: %{y:.4f} km/s<extra>Final orbit</extra>' },
    { x: [t0, t0, tT, tT], y: [v1, vTp, vTa, v2],
      mode: 'markers', marker: { color: C.red, size: 7 },
      name: 'Δv burn',
      text: [`Before Δv₁: ${v1.toFixed(4)} km/s`, `After Δv₁: ${vTp.toFixed(4)} km/s`,
             `Before Δv₂: ${vTa.toFixed(4)} km/s`, `After Δv₂: ${v2.toFixed(4)} km/s`],
      hovertemplate: '<b>%{text}</b><extra></extra>' },
  ];
 
  const layout = {
    paper_bgcolor: C.bg, plot_bgcolor: C.bg,
    font: { color: C.text, family: "'SF Mono','Fira Code','Consolas',monospace" },
    margin: { l: 65, r: 20, t: 50, b: 50 },
    title: { text: 'v(t)', font: { size: 13, color: C.text }, x: 0.5 },
    showlegend: true,
    legend: { bgcolor: C.bg2, bordercolor: C.grid, borderwidth: 1, font: { size: 10 } },
    xaxis: { range: [t_min[0], tEnd * 1.13],
             gridcolor: C.grid, linecolor: C.grid,
             tickfont: { color: C.muted, size: 9 },
             title: { text: 'Time  (minutes)', font: { color: C.text, size: 11 } } },
    yaxis: { range: [0, vTp * 1.25],
             gridcolor: C.grid, linecolor: C.grid,
             tickfont: { color: C.muted, size: 9 },
             title: { text: 'Speed  (km/s)', font: { color: C.text, size: 11 } } },
    shapes: [
      { type: 'line', x0: t0,  x1: t0,  y0: 0, y1: vTp*1.25,
        line: { color: C.red, width: 0.8, dash: 'dot' }, opacity: 0.5 },
      { type: 'line', x0: tT,  x1: tT,  y0: 0, y1: vTp*1.25,
        line: { color: C.red, width: 0.8, dash: 'dot' }, opacity: 0.5 },
      { type: 'line', x0: t_min[0], x1: tEnd*1.13, y0: v1, y1: v1,
        line: { color: C.blue,  width: 0.7, dash: 'dash' }, opacity: 0.4 },
      { type: 'line', x0: t_min[0], x1: tEnd*1.13, y0: v2, y1: v2,
        line: { color: C.green, width: 0.7, dash: 'dash' }, opacity: 0.4 },
    ],
    annotations: [
      { x: t0, y: vTp, ax: t0, ay: v1,
        xref:'x', yref:'y', axref:'x', ayref:'y',
        showarrow:true, arrowhead:2, arrowsize:1.2, arrowcolor:C.red, arrowwidth:2 },
      { x: tT, y: v2, ax: tT, ay: vTa,
        xref:'x', yref:'y', axref:'x', ayref:'y',
        showarrow:true, arrowhead:2, arrowsize:1.2, arrowcolor:C.red, arrowwidth:2 },
      { x: t0 + span*0.013, y: (v1+vTp)/2,
        text: `Δv₁ = +${dv1.toFixed(3)} km/s`, showarrow:false,
        font:{ color:C.red, size:10 }, xanchor:'left' },
      { x: tT + span*0.013, y: (vTa+v2)/2,
        text: `Δv₂ = +${dv2.toFixed(3)} km/s`, showarrow:false,
        font:{ color:C.red, size:10 }, xanchor:'left' },
      { x: tEnd*1.002, y: v1, text: `v₁ = ${v1.toFixed(3)} km/s`,
        showarrow:false, font:{ color:C.blue, size:9 }, xanchor:'left' },
      { x: tEnd*1.002, y: v2, text: `v₂ = ${v2.toFixed(3)} km/s`,
        showarrow:false, font:{ color:C.green, size:9 }, xanchor:'left' },
      { x: avg(pre.t),   y: v1 + 0.18,           text:'Initial orbit<br>(circular)',
        showarrow:false, font:{ color:C.blue,   size:9 } },
      { x: avg(coast.t), y: (vTp+vTa)/2 + 0.22, text:'Transfer ellipse<br>(vis-viva coast)',
        showarrow:false, font:{ color:C.orange, size:9 } },
      { x: avg(post.t),  y: v2 + 0.18,           text:'Final orbit<br>(circular)',
        showarrow:false, font:{ color:C.green,  size:9 } },
    ]
  };
 
  Plotly.react('dv-chart', traces, layout, { responsive:true, displayModeBar:false });
}
 
//  Fuel consumed 
function drawFuel(T, m_wet, m_before_b2, m_dry, m_fuel1, m_fuel2) {
  const pre_dur  = T * 0.12;
  const post_dur = T * 0.12;
 
  const t0   = 0;
  const tT   = T / 60;
  const tEnd = (T + post_dur) / 60;
  const tStart = -pre_dur / 60;
 
  // Piecewise fuel consumed:
  // before burn 1: 0
  // after burn 1 → before burn 2: m_fuel1
  // after burn 2: m_fuel1 + m_fuel2
  const t_points = [tStart, t0, t0, tT, tT, tEnd];
  const f_points = [0,       0,  m_fuel1, m_fuel1, m_fuel1+m_fuel2, m_fuel1+m_fuel2];
 
  // Separate segments by color
  const seg_pre   = { t: [tStart, t0],  f: [0, 0] };
  const seg_coast = { t: [t0, tT],      f: [m_fuel1, m_fuel1] };
  const seg_post  = { t: [tT, tEnd],    f: [m_fuel1+m_fuel2, m_fuel1+m_fuel2] };
 
  const yMax = (m_fuel1 + m_fuel2) * 1.3;
  const span = tT - t0;
 
  const traces = [
    { x: seg_pre.t,   y: seg_pre.f,   mode:'lines', line:{ color:C.blue,   width:2.2 },
      name:'Initial orbit', hovertemplate:'t: %{x:.1f} min<br>fuel used: %{y:.1f} kg<extra>Initial orbit</extra>' },
    { x: seg_coast.t, y: seg_coast.f, mode:'lines', line:{ color:C.orange, width:2.2 },
      name:'Transfer ellipse', hovertemplate:'t: %{x:.1f} min<br>fuel used: %{y:.1f} kg<extra>Transfer ellipse</extra>' },
    { x: seg_post.t,  y: seg_post.f,  mode:'lines', line:{ color:C.green,  width:2.2 },
      name:'Final orbit', hovertemplate:'t: %{x:.1f} min<br>fuel used: %{y:.1f} kg<extra>Final orbit</extra>' },
    // Jump markers
    { x: [t0, t0, tT, tT],
      y: [0, m_fuel1, m_fuel1, m_fuel1+m_fuel2],
      mode:'markers', marker:{ color:C.red, size:7 },
      name:'Burn',
      text:[ `Before burn 1: 0 kg consumed`,
             `After burn 1: ${m_fuel1.toFixed(1)} kg consumed`,
             `Before burn 2: ${m_fuel1.toFixed(1)} kg consumed`,
             `After burn 2: ${(m_fuel1+m_fuel2).toFixed(1)} kg consumed` ],
      hovertemplate:'<b>%{text}</b><extra></extra>' },
  ];
 
  const layout = {
    paper_bgcolor: C.bg, plot_bgcolor: C.bg,
    font: { color:C.text, family:"'SF Mono','Fira Code','Consolas',monospace" },
    margin: { l:70, r:20, t:50, b:50 },
    title: { text:'Fuel consumed', font:{ size:13, color:C.text }, x:0.5 },
    showlegend: true,
    legend: { bgcolor:C.bg2, bordercolor:C.grid, borderwidth:1, font:{ size:10 } },
    xaxis: { range:[tStart, tEnd*1.13],
             gridcolor:C.grid, linecolor:C.grid,
             tickfont:{ color:C.muted, size:9 },
             title:{ text:'Time  (minutes)', font:{ color:C.text, size:11 } } },
    yaxis: { range:[0, yMax],
             gridcolor:C.grid, linecolor:C.grid,
             tickfont:{ color:C.muted, size:9 },
             title:{ text:'Fuel consumed  (kg)', font:{ color:C.text, size:11 } } },
    shapes: [
      // Burn vertical lines
      { type:'line', x0:t0, x1:t0, y0:0, y1:yMax,
        line:{ color:C.red, width:0.8, dash:'dot' }, opacity:0.5 },
      { type:'line', x0:tT, x1:tT, y0:0, y1:yMax,
        line:{ color:C.red, width:0.8, dash:'dot' }, opacity:0.5 },
      // Jump vertical connectors
      { type:'line', x0:t0, x1:t0, y0:0,      y1:m_fuel1,
        line:{ color:C.red, width:2 } },
      { type:'line', x0:tT, x1:tT, y0:m_fuel1, y1:m_fuel1+m_fuel2,
        line:{ color:C.red, width:2 } },
      // Total reference line
      { type:'line', x0:tStart, x1:tEnd*1.13, y0:m_fuel1+m_fuel2, y1:m_fuel1+m_fuel2,
        line:{ color:C.purple, width:0.7, dash:'dash' }, opacity:0.4 },
    ],
    annotations: [
      // Burn arrows
      { x:t0, y:m_fuel1,          ax:t0, ay:0,
        xref:'x', yref:'y', axref:'x', ayref:'y',
        showarrow:true, arrowhead:2, arrowsize:1.2, arrowcolor:C.red, arrowwidth:2 },
      { x:tT, y:m_fuel1+m_fuel2,  ax:tT, ay:m_fuel1,
        xref:'x', yref:'y', axref:'x', ayref:'y',
        showarrow:true, arrowhead:2, arrowsize:1.2, arrowcolor:C.red, arrowwidth:2 },
      // Burn labels
      { x:t0 + span*0.013, y:m_fuel1/2,
        text:`−${m_fuel1.toFixed(1)} kg`, showarrow:false,
        font:{ color:C.red, size:10 }, xanchor:'left' },
      { x:tT + span*0.013, y:m_fuel1 + m_fuel2/2,
        text:`−${m_fuel2.toFixed(1)} kg`, showarrow:false,
        font:{ color:C.red, size:10 }, xanchor:'left' },
      // Total label
      { x:tEnd*1.002, y:m_fuel1+m_fuel2,
        text:`${(m_fuel1+m_fuel2).toFixed(1)} kg total`,
        showarrow:false, font:{ color:C.purple, size:9 }, xanchor:'left' },
      // Phase labels
      { x:(tStart+t0)/2, y:yMax*0.08, text:'Initial orbit',
        showarrow:false, font:{ color:C.blue,   size:9 } },
      { x:(t0+tT)/2,     y:yMax*0.08, text:'Transfer ellipse',
        showarrow:false, font:{ color:C.orange, size:9 } },
      { x:(tT+tEnd)/2,   y:yMax*0.08, text:'Final orbit',
        showarrow:false, font:{ color:C.green,  size:9 } },
    ]
  };
 
  Plotly.react('fuel-chart', traces, layout, { responsive:true, displayModeBar:false });
}
 
document.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
window.addEventListener('load', run);