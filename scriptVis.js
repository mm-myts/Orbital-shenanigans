const MU  = 398600.4418;   // km³/s²
const RE  = 6371;           // km

// Colors
const C = {
  bg:     '#0f1117', bg2: '#1a1a2e', grid: '#2a2a3a',
  text:   '#e0e0e0', muted: '#888888',
  blue:   '#4a9eff', orange: '#ff7c3a', green: '#3ecf8e', red: '#ff4e4e',
  earth:  '#1a6fa8'
};

// ── Kepler ────────────────────────────────────────────────────────────────
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
    if (t < 0)       return v1;
    if (t > T)       return v2;
    return coast_v[ci++];
  });
}

// ── linspace helper ────────────────────────────────────────────────────────
function linspace(a, b, n) {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(a + (b - a) * i / (n - 1));
  return arr;
}

// ── Main ──────────────────────────────────────────────────────────────────
function run() {
  const errEl = document.getElementById('error-msg');
  errEl.style.display = 'none';

  const alt1 = parseFloat(document.getElementById('alt1').value);
  const alt2 = parseFloat(document.getElementById('alt2').value);

  if (isNaN(alt1) || isNaN(alt2)) {
    errEl.textContent = 'Enter valid altitudes.';
    errEl.style.display = 'block'; return;
  }
  if (alt2 <= alt1) {
    errEl.textContent = 'Target altitude must be higher than initial.';
    errEl.style.display = 'block'; return;
  }

  const r1  = RE + alt1;
  const r2  = RE + alt2;
  const a   = (r1 + r2) / 2;
  const e   = (r2 - r1) / (r1 + r2);
  const T   = Math.PI * Math.sqrt(a**3 / MU);   // seconds
  const v1  = Math.sqrt(MU / r1);
  const v2  = Math.sqrt(MU / r2);
  const vTp = Math.sqrt(MU * (2/r1 - 1/a));
  const vTa = Math.sqrt(MU * (2/r2 - 1/a));
  const dv1 = vTp - v1;
  const dv2 = v2  - vTa;

  // Update sidebar stats
  document.getElementById('s-v1').textContent  = v1.toFixed(4)  + ' km/s';
  document.getElementById('s-v2').textContent  = v2.toFixed(4)  + ' km/s';
  document.getElementById('s-dv1').textContent = '+' + dv1.toFixed(4) + ' km/s';
  document.getElementById('s-dv2').textContent = '+' + dv2.toFixed(4) + ' km/s';
  document.getElementById('s-dvt').textContent = (dv1+dv2).toFixed(4) + ' km/s';
  const Tmin = T / 60;
  document.getElementById('s-tt').textContent  =
    Tmin > 90 ? (Tmin/60).toFixed(2) + ' hr' : Tmin.toFixed(1) + ' min';

  // Hide placeholders
  document.getElementById('geo-placeholder').style.display = 'none';
  document.getElementById('vt-placeholder').style.display  = 'none';

  drawGeo(r1, r2, a, e, dv1, dv2, alt1, alt2);
  drawVt(r1, r2, T, v1, v2, vTp, vTa, dv1, dv2);
}

// ── Orbital geometry ──────────────────────────────────────────────────────
function drawGeo(r1, r2, a, e, dv1, dv2, alt1, alt2) {
  const theta = linspace(0, 2*Math.PI, 500);
  const cos_t = theta.map(Math.cos);
  const sin_t = theta.map(Math.sin);

  // Earth
  const ex = cos_t.map(c => RE * c);
  const ey = sin_t.map(s => RE * s);

  // Atmosphere

  const ax2 = cos_t.map(c => RE * 1.04 * c);
  const ay2 = sin_t.map(s => RE * 1.04 * s);

  // Orbits
  const ox1 = cos_t.map(c => r1 * c);
  const oy1 = sin_t.map(s => r1 * s);
  const ox2 = cos_t.map(c => r2 * c);
  const oy2 = sin_t.map(s => r2 * s);

  // Transfer ellipse (half)
  const th_ell = linspace(0, Math.PI, 300);
  const tx = th_ell.map(t => a * Math.cos(t) - a * e);
  const ty = th_ell.map(t => a * Math.sqrt(1 - e**2) * Math.sin(t));

  // Arrow on ellipse midpoint
  const th_arr = Math.PI * 0.52;
  const x_arr  = a * Math.cos(th_arr) - a * e;
  const y_arr  = a * Math.sqrt(1 - e**2) * Math.sin(th_arr);
  const dx = -Math.sin(th_arr) * r2 * 0.04;
  const dy =  Math.cos(th_arr) * Math.sqrt(1 - e**2) * r2 * 0.04;

  const lim    = r2 * 1.18;
  const offset = r2 * 0.04;

  const traces = [
    // Earth fill
    { x: ex, y: ey, fill: 'toself', fillcolor: C.earth,
      line: { color: C.earth, width: 0 }, name: 'Earth',
      hoverinfo: 'skip', showlegend: true },
    // Atmosphere
    { x: ax2, y: ay2, fill: 'toself', fillcolor: 'rgba(26,111,168,0.08)',
      line: { color: 'rgba(26,111,168,0.15)', width: 1 },
      hoverinfo: 'skip', showlegend: false },
    // Initial orbit
    { x: ox1, y: oy1, mode: 'lines', line: { color: C.blue, width: 2 },
      name: `Initial orbit (${alt1} km)`,
      hovertemplate: 'x: %{x:.0f} km<br>y: %{y:.0f} km<extra>Initial orbit</extra>' },
    // Final orbit
    { x: ox2, y: oy2, mode: 'lines', line: { color: C.green, width: 2 },
      name: `Target orbit (${alt2} km)`,
      hovertemplate: 'x: %{x:.0f} km<br>y: %{y:.0f} km<extra>Target orbit</extra>' },
    // Transfer ellipse
    { x: tx, y: ty, mode: 'lines', line: { color: C.orange, width: 2, dash: 'dash' },
      name: 'Transfer ellipse',
      hovertemplate: 'x: %{x:.0f} km<br>y: %{y:.0f} km<extra>Transfer ellipse</extra>' },
    // Burn markers
    { x: [r1, -r2], y: [0, 0], mode: 'markers',
      marker: { color: C.red, size: 10, line: { color: C.bg, width: 2 } },
      name: 'Δv burns',
      text: [`Burn 1 — Δv₁ = +${dv1.toFixed(3)} km/s`, `Burn 2 — Δv₂ = +${dv2.toFixed(3)} km/s`],
      hovertemplate: '<b>%{text}</b><extra></extra>' },
  ];

  const layout = {
    paper_bgcolor: C.bg, plot_bgcolor: C.bg,
    font: { color: C.text, family: "'SF Mono','Fira Code','Consolas',monospace" },
    margin: { l: 55, r: 20, t: 50, b: 50 },
    title: { text: 'Orbital geometry', font: { size: 13, color: C.text }, x: 0.5 },
    showlegend: true,
    legend: { bgcolor: C.bg2, bordercolor: C.grid, borderwidth: 1,
              font: { size: 10, color: C.text } },
    xaxis: { range: [-lim, lim], constrain: 'domain',
             gridcolor: C.grid, gridwidth: 0.5, griddash: 'dot',
             linecolor: C.grid, tickcolor: C.muted,
             tickfont: { color: C.muted, size: 9 },
             title: { text: 'x  (km)', font: { color: C.text, size: 11 } } },
    yaxis: { range: [-lim, lim], scaleanchor: 'x', scaleratio: 1,
             gridcolor: C.grid, gridwidth: 0.5, griddash: 'dot',
             linecolor: C.grid, tickcolor: C.muted,
             tickfont: { color: C.muted, size: 9 },
             title: { text: 'y  (km)', font: { color: C.text, size: 11 } } },
    annotations: [
      // Earth label
      { x: 0, y: 0, text: 'Earth', showarrow: false,
        font: { color: '#a0d4f5', size: 9 } },
      // Δv labels
      { x: r1 + offset, y: offset, text: 'Δv₁', showarrow: false,
        font: { color: C.red, size: 11 }, xanchor: 'left' },
      { x: -r2 - offset, y: offset, text: 'Δv₂', showarrow: false,
        font: { color: C.red, size: 11 }, xanchor: 'right' },
      // Direction arrow
      { x: x_arr + dx, y: y_arr + dy, ax: x_arr, ay: y_arr,
        xref: 'x', yref: 'y', axref: 'x', ayref: 'y',
        showarrow: true, arrowhead: 2, arrowsize: 1.2,
        arrowcolor: C.orange, arrowwidth: 2 },
    ]
  };

  Plotly.react('geo-chart', traces, layout, { responsive: true, displayModeBar: false });
}

// ── v(t) graph ────────────────────────────────────────────────────────────
function drawVt(r1, r2, T, v1, v2, vTp, vTa, dv1, dv2) {
  const pre_dur  = T * 0.12;
  const post_dur = T * 0.12;

  const t_pre   = linspace(-pre_dur, 0, 200);
  const t_coast = linspace(0, T, 800);
  const t_post  = linspace(T, T + post_dur, 200);
  const t_all   = [...t_pre, ...t_coast, ...t_post];
  const t_min   = t_all.map(t => t / 60);
  const v_all   = vTotal(t_all, r1, r2);

  const mask = {
    pre:   t_all.map(t => t < 0),
    coast: t_all.map(t => t >= 0 && t <= T),
    post:  t_all.map(t => t > T),
  };

  const seg = name => ({
    t: t_min.filter((_, i) => mask[name][i]),
    v: v_all.filter((_, i) => mask[name][i]),
  });

  const pre   = seg('pre');
  const coast = seg('coast');
  const post  = seg('post');

  const t0_min = 0;
  const tT_min = T / 60;
  const span   = tT_min - t0_min;

  const t_end = t_min[t_min.length - 1];

  const avg = arr => arr.reduce((s, x) => s + x, 0) / arr.length;

  const traces = [
    // Pre
    { x: pre.t, y: pre.v, mode: 'lines', line: { color: C.blue, width: 2.2 },
      name: 'Initial circular orbit',
      hovertemplate: 't: %{x:.1f} min<br>v: %{y:.4f} km/s<extra>Initial orbit</extra>' },
    // Coast
    { x: coast.t, y: coast.v, mode: 'lines', line: { color: C.orange, width: 2.2 },
      name: 'Transfer ellipse (Kepler)',
      hovertemplate: 't: %{x:.1f} min<br>v: %{y:.4f} km/s<extra>Transfer ellipse</extra>' },
    // Post
    { x: post.t, y: post.v, mode: 'lines', line: { color: C.green, width: 2.2 },
      name: 'Final circular orbit',
      hovertemplate: 't: %{x:.1f} min<br>v: %{y:.4f} km/s<extra>Final orbit</extra>' },
    // Burn dots
    { x: [t0_min, t0_min, tT_min, tT_min], y: [v1, vTp, vTa, v2],
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
    legend: { bgcolor: C.bg2, bordercolor: C.grid, borderwidth: 1,
              font: { size: 10, color: C.text } },
    xaxis: { range: [t_min[0], t_end * 1.13],
             gridcolor: C.grid, gridwidth: 0.6,
             linecolor: C.grid, tickcolor: C.muted,
             tickfont: { color: C.muted, size: 9 },
             title: { text: 'Time  (minutes)', font: { color: C.text, size: 11 } } },
    yaxis: { range: [0, vTp * 1.25],
             gridcolor: C.grid, gridwidth: 0.6,
             linecolor: C.grid, tickcolor: C.muted,
             tickfont: { color: C.muted, size: 9 },
             title: { text: 'Speed  (km/s)', font: { color: C.text, size: 11 } } },
    shapes: [
      // Burn vertical lines
      { type: 'line', x0: t0_min, x1: t0_min, y0: 0, y1: vTp * 1.25,
        line: { color: C.red, width: 0.8, dash: 'dot' }, opacity: 0.5 },
      { type: 'line', x0: tT_min, x1: tT_min, y0: 0, y1: vTp * 1.25,
        line: { color: C.red, width: 0.8, dash: 'dot' }, opacity: 0.5 },
      // v1 reference
      { type: 'line', x0: t_min[0], x1: t_end * 1.13, y0: v1, y1: v1,
        line: { color: C.blue, width: 0.7, dash: 'dash' }, opacity: 0.4 },
      // v2 reference
      { type: 'line', x0: t_min[0], x1: t_end * 1.13, y0: v2, y1: v2,
        line: { color: C.green, width: 0.7, dash: 'dash' }, opacity: 0.4 },
    ],
    annotations: [
      // Burn arrows
      { x: t0_min, y: vTp, ax: t0_min, ay: v1,
        xref: 'x', yref: 'y', axref: 'x', ayref: 'y',
        showarrow: true, arrowhead: 2, arrowsize: 1.2,
        arrowcolor: C.red, arrowwidth: 2 },
      { x: tT_min, y: v2, ax: tT_min, ay: vTa,
        xref: 'x', yref: 'y', axref: 'x', ayref: 'y',
        showarrow: true, arrowhead: 2, arrowsize: 1.2,
        arrowcolor: C.red, arrowwidth: 2 },
      // Δv labels
      { x: t0_min + span * 0.013, y: (v1 + vTp) / 2,
        text: `Δv₁ = +${dv1.toFixed(3)} km/s`, showarrow: false,
        font: { color: C.red, size: 10 }, xanchor: 'left' },
      { x: tT_min + span * 0.013, y: (vTa + v2) / 2,
        text: `Δv₂ = +${dv2.toFixed(3)} km/s`, showarrow: false,
        font: { color: C.red, size: 10 }, xanchor: 'left' },
      // v reference labels
      { x: t_end * 1.002, y: v1, text: `v₁ = ${v1.toFixed(3)} km/s`,
        showarrow: false, font: { color: C.blue, size: 9 }, xanchor: 'left' },
      { x: t_end * 1.002, y: v2, text: `v₂ = ${v2.toFixed(3)} km/s`,
        showarrow: false, font: { color: C.green, size: 9 }, xanchor: 'left' },
      // Phase labels
      { x: avg(pre.t),   y: v1 + 0.18, text: 'Initial orbit<br>(circular)',
        showarrow: false, font: { color: C.blue, size: 9 } },
      { x: avg(coast.t), y: (vTp + vTa) / 2 + 0.22, text: 'Transfer ellipse<br>(vis-viva coast)',
        showarrow: false, font: { color: C.orange, size: 9 } },
      { x: avg(post.t),  y: v2 + 0.18, text: 'Final orbit<br>(circular)',
        showarrow: false, font: { color: C.green, size: 9 } },
    ]
  };

  Plotly.react('vt-chart', traces, layout, { responsive: true, displayModeBar: false });
}

// Allow Enter key to trigger compute
document.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });

// Auto-run on load with defaults
window.addEventListener('load', run);