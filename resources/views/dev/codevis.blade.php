<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Codebase Visualizer — Homsjogja</title>
<script src="https://d3js.org/d3.v7.min.js"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0f1117; --surface: #1a1d27; --border: #2a2d3e;
    --text: #e2e8f0; --muted: #64748b; --accent: #6366f1;
    --model: #10b981; --service: #3b82f6; --controller: #f59e0b;
    --controller-admin: #f97316; --page: #8b5cf6; --page-admin: #a855f7;
    --component: #06b6d4; --ui: #0891b2; --hook: #ec4899;
    --route: #ef4444; --action: #84cc16; --event: #f43f5e;
    --request: #fb923c; --middleware: #a78bfa; --repository: #34d399;
    --lib: #60a5fa; --util: #94a3b8; --type: #c084fc; --other: #475569;
  }

  body { background: var(--bg); color: var(--text); font-family: 'Inter', system-ui, sans-serif; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }

  /* ── Header ── */
  header { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: var(--surface); border-bottom: 1px solid var(--border); flex-shrink: 0; }
  header h1 { font-size: 14px; font-weight: 600; color: var(--text); }
  .badge { font-size: 11px; padding: 2px 8px; border-radius: 99px; background: var(--border); color: var(--muted); }
  .badge.live { background: #052e16; color: #4ade80; }
  .spacer { flex: 1; }
  .btn { font-size: 12px; padding: 5px 12px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer; transition: background .15s; }
  .btn:hover { background: var(--border); }
  .btn.active { background: var(--accent); border-color: var(--accent); color: #fff; }
  #refresh-indicator { font-size: 11px; color: var(--muted); }

  /* ── Layout ── */
  .layout { display: flex; flex: 1; overflow: hidden; }

  /* ── Sidebar ── */
  .sidebar { width: 260px; flex-shrink: 0; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
  .sidebar-header { padding: 10px 12px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; }
  .sidebar-header input { flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 5px 8px; font-size: 12px; color: var(--text); outline: none; }
  .sidebar-header input:focus { border-color: var(--accent); }
  .tree { flex: 1; overflow-y: auto; padding: 6px 0; font-size: 12px; }
  .tree-node { display: flex; align-items: center; gap: 5px; padding: 3px 8px; cursor: pointer; border-radius: 4px; margin: 1px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tree-node:hover { background: var(--border); }
  .tree-node.selected { background: #1e1b4b; color: #a5b4fc; }
  .tree-node .icon { flex-shrink: 0; font-size: 11px; }
  .tree-node .label { overflow: hidden; text-overflow: ellipsis; }
  .tree-node .count { margin-left: auto; font-size: 10px; color: var(--muted); flex-shrink: 0; }

  /* ── Main canvas ── */
  .canvas-wrap { flex: 1; position: relative; overflow: hidden; }
  #graph-svg { width: 100%; height: 100%; }

  /* ── Tooltip ── */
  #tooltip { position: fixed; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; font-size: 12px; pointer-events: none; opacity: 0; transition: opacity .15s; max-width: 280px; z-index: 100; box-shadow: 0 8px 24px rgba(0,0,0,.4); }
  #tooltip .tt-name { font-weight: 600; font-size: 13px; margin-bottom: 4px; }
  #tooltip .tt-path { color: var(--muted); font-size: 11px; word-break: break-all; margin-bottom: 6px; }
  #tooltip .tt-row { display: flex; justify-content: space-between; gap: 16px; font-size: 11px; color: var(--muted); }
  #tooltip .tt-row span:last-child { color: var(--text); }

  /* ── Info panel ── */
  .info-panel { position: absolute; right: 12px; top: 12px; width: 240px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px; font-size: 12px; display: none; }
  .info-panel.visible { display: block; }
  .info-panel h3 { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
  .info-panel .ip-path { color: var(--muted); font-size: 11px; word-break: break-all; margin-bottom: 10px; }
  .info-panel .ip-section { margin-bottom: 8px; }
  .info-panel .ip-label { color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
  .info-panel .ip-item { padding: 3px 0; border-bottom: 1px solid var(--border); color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .info-panel .close-btn { position: absolute; top: 10px; right: 10px; background: none; border: none; color: var(--muted); cursor: pointer; font-size: 14px; }

  /* ── Legend ── */
  .legend { position: absolute; left: 12px; bottom: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 11px; display: flex; flex-wrap: wrap; gap: 6px 14px; max-width: 480px; }
  .legend-item { display: flex; align-items: center; gap: 5px; }
  .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

  /* ── Controls ── */
  .controls { position: absolute; left: 12px; top: 12px; display: flex; flex-direction: column; gap: 6px; }
  .ctrl-btn { width: 30px; height: 30px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; }
  .ctrl-btn:hover { background: var(--border); }

  /* ── Stats bar ── */
  .stats-bar { display: flex; gap: 16px; padding: 6px 16px; background: var(--surface); border-top: 1px solid var(--border); font-size: 11px; color: var(--muted); flex-shrink: 0; }
  .stats-bar span { color: var(--text); }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }

  /* ── D3 nodes & edges ── */
  .node circle { stroke-width: 1.5px; cursor: pointer; transition: r .15s; }
  .node circle:hover { stroke-width: 3px; }
  .node.highlighted circle { stroke-width: 3px; filter: drop-shadow(0 0 6px currentColor); }
  .node.dimmed circle { opacity: .15; }
  .node.dimmed text { opacity: .1; }
  .node text { font-size: 9px; fill: var(--text); pointer-events: none; }
  .link { stroke-opacity: .35; fill: none; }
  .link.highlighted { stroke-opacity: .9; stroke-width: 2px; }
  .link.dimmed { stroke-opacity: .05; }
</style>
</head>
<body>

<header>
  <h1>⬡ Codebase Visualizer</h1>
  <span class="badge live" id="live-badge">● LIVE</span>
  <span class="badge" id="scanned-at">—</span>
  <div class="spacer"></div>
  <span id="refresh-indicator"></span>
  <button class="btn active" id="btn-graph" onclick="setView('graph')">Graph</button>
  <button class="btn" id="btn-tree" onclick="setView('tree-only')">Tree</button>
  <button class="btn" id="btn-filter-all" onclick="setFilter('all')">All</button>
  <button class="btn" id="btn-filter-php" onclick="setFilter('php')">PHP</button>
  <button class="btn" id="btn-filter-ts" onclick="setFilter('ts')">TS/TSX</button>
  <button class="btn" onclick="resetZoom()">Reset Zoom</button>
  <button class="btn" onclick="loadData()">↺ Refresh</button>
</header>

<div class="layout">
  <div class="sidebar">
    <div class="sidebar-header">
      <input type="text" id="tree-search" placeholder="Search files…" oninput="filterTree(this.value)">
    </div>
    <div class="tree" id="tree-container"></div>
  </div>

  <div class="canvas-wrap">
    <svg id="graph-svg"></svg>

    <div class="controls">
      <button class="ctrl-btn" onclick="zoom.scaleBy(d3.select('#graph-svg'), 1.3)" title="Zoom in">+</button>
      <button class="ctrl-btn" onclick="zoom.scaleBy(d3.select('#graph-svg'), 0.77)" title="Zoom out">−</button>
    </div>

    <div class="info-panel" id="info-panel">
      <button class="close-btn" onclick="closeInfo()">✕</button>
      <h3 id="ip-name"></h3>
      <div class="ip-path" id="ip-path"></div>
      <div class="ip-section">
        <div class="ip-label">Imports from</div>
        <div id="ip-imports"></div>
      </div>
      <div class="ip-section">
        <div class="ip-label">Imported by</div>
        <div id="ip-importedby"></div>
      </div>
    </div>

    <div class="legend" id="legend"></div>
  </div>
</div>

<div class="stats-bar">
  <div>Nodes: <span id="stat-nodes">—</span></div>
  <div>Edges: <span id="stat-edges">—</span></div>
  <div>Files: <span id="stat-files">—</span></div>
  <div>Selected: <span id="stat-selected">—</span></div>
</div>

<div id="tooltip"></div>

<script>
const API = '/dev/codevis/api';
const REFRESH_MS = 5000;

const GROUP_COLORS = {
  'model':              '#10b981',
  'service':            '#3b82f6',
  'controller':         '#f59e0b',
  'controller-admin':   '#f97316',
  'controller-auth':    '#fbbf24',
  'controller-staff':   '#fcd34d',
  'controller-settings':'#fde68a',
  'page':               '#8b5cf6',
  'page-admin':         '#a855f7',
  'component':          '#06b6d4',
  'ui':                 '#0891b2',
  'hook':               '#ec4899',
  'route':              '#ef4444',
  'action':             '#84cc16',
  'event':              '#f43f5e',
  'request':            '#fb923c',
  'middleware':         '#a78bfa',
  'repository':         '#34d399',
  'lib':                '#60a5fa',
  'util':               '#94a3b8',
  'type':               '#c084fc',
  'other':              '#475569',
};

const EDGE_COLORS = {
  'uses-service':  '#3b82f6',
  'uses-model':    '#10b981',
  'component-of':  '#06b6d4',
  'imports':       '#475569',
};

let data = null;
let simulation = null;
let zoom = null;
let currentView = 'graph';
let currentFilter = 'all';
let selectedNode = null;
let refreshTimer = null;

// ── D3 setup ──────────────────────────────────────────────────────────────
const svg = d3.select('#graph-svg');
const g = svg.append('g');

zoom = d3.zoom().scaleExtent([0.05, 4]).on('zoom', e => g.attr('transform', e.transform));
svg.call(zoom);

const tooltip = document.getElementById('tooltip');

function resetZoom() {
  const { width, height } = svg.node().getBoundingClientRect();
  svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.4));
}

// ── Data loading ──────────────────────────────────────────────────────────
async function loadData() {
  document.getElementById('refresh-indicator').textContent = 'Loading…';
  try {
    const res = await fetch(API);
    data = await res.json();
    document.getElementById('scanned-at').textContent = new Date(data.scanned_at).toLocaleTimeString();
    document.getElementById('refresh-indicator').textContent = '';
    renderTree(data.tree);
    renderGraph(data.graph);
    updateStats();
  } catch (e) {
    document.getElementById('refresh-indicator').textContent = '⚠ Error';
    console.error(e);
  }
}

function startAutoRefresh() {
  clearInterval(refreshTimer);
  refreshTimer = setInterval(loadData, REFRESH_MS);
}

// ── Tree ──────────────────────────────────────────────────────────────────
function renderTree(tree, query = '') {
  const container = document.getElementById('tree-container');
  container.innerHTML = '';
  tree.forEach(node => renderTreeNode(node, container, 0, query));
}

function renderTreeNode(node, parent, depth, query) {
  if (node.type === 'directory') {
    const children = node.children || [];
    const fileCount = countFiles(node);
    if (query && !nodeMatchesQuery(node, query)) return;

    const el = document.createElement('div');
    el.className = 'tree-node';
    el.style.paddingLeft = (8 + depth * 14) + 'px';
    el.innerHTML = `<span class="icon">📁</span><span class="label">${node.name}</span><span class="count">${fileCount}</span>`;
    parent.appendChild(el);

    let expanded = depth < 2;
    const childWrap = document.createElement('div');
    childWrap.style.display = expanded ? 'block' : 'none';
    parent.appendChild(childWrap);

    el.onclick = (e) => {
      e.stopPropagation();
      expanded = !expanded;
      childWrap.style.display = expanded ? 'block' : 'none';
      el.querySelector('.icon').textContent = expanded ? '📂' : '📁';
    };
    if (expanded) el.querySelector('.icon').textContent = '📂';

    children.forEach(child => renderTreeNode(child, childWrap, depth + 1, query));
  } else {
    if (query && !node.name.toLowerCase().includes(query.toLowerCase())) return;
    const icon = extIcon(node.ext);
    const el = document.createElement('div');
    el.className = 'tree-node';
    el.style.paddingLeft = (8 + depth * 14) + 'px';
    el.dataset.nodeId = node.id;
    el.innerHTML = `<span class="icon">${icon}</span><span class="label">${node.name}</span>`;
    el.onclick = (e) => { e.stopPropagation(); highlightNode(node.id); };
    parent.appendChild(el);
  }
}

function countFiles(node) {
  if (node.type === 'file') return 1;
  return (node.children || []).reduce((s, c) => s + countFiles(c), 0);
}

function nodeMatchesQuery(node, q) {
  if (node.name.toLowerCase().includes(q.toLowerCase())) return true;
  return (node.children || []).some(c => nodeMatchesQuery(c, q));
}

function extIcon(ext) {
  return { php: '🐘', ts: '🔷', tsx: '⚛', js: '🟨', jsx: '⚛' }[ext] || '📄';
}

function filterTree(q) {
  if (data) renderTree(data.tree, q);
}

// ── Graph ─────────────────────────────────────────────────────────────────
function renderGraph({ nodes, edges }) {
  g.selectAll('*').remove();
  if (simulation) simulation.stop();

  let filteredNodes = nodes;
  let filteredEdges = edges;

  if (currentFilter === 'php') {
    filteredNodes = nodes.filter(n => n.ext === 'php');
  } else if (currentFilter === 'ts') {
    filteredNodes = nodes.filter(n => ['ts', 'tsx', 'js', 'jsx'].includes(n.ext));
  }

  const nodeIds = new Set(filteredNodes.map(n => n.id));
  filteredEdges = filteredEdges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

  document.getElementById('stat-nodes').textContent = filteredNodes.length;
  document.getElementById('stat-edges').textContent = filteredEdges.length;

  // Build adjacency for info panel
  window._adj = {};
  filteredEdges.forEach(e => {
    const s = typeof e.source === 'object' ? e.source.id : e.source;
    const t = typeof e.target === 'object' ? e.target.id : e.target;
    (_adj[s] = _adj[s] || { out: [], in: [] }).out.push(t);
    (_adj[t] = _adj[t] || { out: [], in: [] }).in.push(s);
  });

  // Defs: arrowhead
  const defs = g.append('defs');
  defs.append('marker').attr('id', 'arrow').attr('viewBox', '0 -4 8 8').attr('refX', 14).attr('refY', 0)
    .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
    .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', '#475569');

  // Links
  const link = g.append('g').selectAll('line')
    .data(filteredEdges).join('line')
    .attr('class', 'link')
    .attr('stroke', d => EDGE_COLORS[d.type] || '#475569')
    .attr('stroke-width', 1)
    .attr('marker-end', 'url(#arrow)');

  // Nodes
  const node = g.append('g').selectAll('g')
    .data(filteredNodes).join('g')
    .attr('class', 'node')
    .call(d3.drag()
      .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }))
    .on('click', (e, d) => { e.stopPropagation(); highlightNode(d.id); })
    .on('mouseover', (e, d) => showTooltip(e, d))
    .on('mousemove', (e) => moveTooltip(e))
    .on('mouseout', hideTooltip);

  node.append('circle')
    .attr('r', d => nodeRadius(d, filteredEdges))
    .attr('fill', d => GROUP_COLORS[d.group] || '#475569')
    .attr('stroke', d => d3.color(GROUP_COLORS[d.group] || '#475569').brighter(0.5));

  node.append('text')
    .attr('dy', d => nodeRadius(d, filteredEdges) + 10)
    .attr('text-anchor', 'middle')
    .text(d => d.name.length > 20 ? d.name.slice(0, 18) + '…' : d.name);

  svg.on('click', () => clearHighlight());

  // Simulation
  simulation = d3.forceSimulation(filteredNodes)
    .force('link', d3.forceLink(filteredEdges).id(d => d.id).distance(80).strength(0.4))
    .force('charge', d3.forceManyBody().strength(-180))
    .force('center', d3.forceCenter(0, 0))
    .force('collision', d3.forceCollide(d => nodeRadius(d, filteredEdges) + 8))
    .on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

  renderLegend();
  setTimeout(resetZoom, 600);
}

function nodeRadius(d, edges) {
  const deg = edges.filter(e => {
    const s = typeof e.source === 'object' ? e.source.id : e.source;
    const t = typeof e.target === 'object' ? e.target.id : e.target;
    return s === d.id || t === d.id;
  }).length;
  return Math.max(5, Math.min(18, 5 + deg * 0.8));
}

// ── Highlight ─────────────────────────────────────────────────────────────
function highlightNode(id) {
  selectedNode = id;
  document.getElementById('stat-selected').textContent = id.split('/').pop();

  const adj = window._adj || {};
  const connected = new Set([id, ...(adj[id]?.out || []), ...(adj[id]?.in || [])]);

  g.selectAll('.node')
    .classed('highlighted', d => d.id === id)
    .classed('dimmed', d => !connected.has(d.id));

  g.selectAll('.link')
    .classed('highlighted', d => {
      const s = typeof d.source === 'object' ? d.source.id : d.source;
      const t = typeof d.target === 'object' ? d.target.id : d.target;
      return s === id || t === id;
    })
    .classed('dimmed', d => {
      const s = typeof d.source === 'object' ? d.source.id : d.source;
      const t = typeof d.target === 'object' ? d.target.id : d.target;
      return s !== id && t !== id;
    });

  // Highlight tree
  document.querySelectorAll('.tree-node').forEach(el => {
    el.classList.toggle('selected', el.dataset.nodeId === id);
  });

  showInfoPanel(id);
}

function clearHighlight() {
  selectedNode = null;
  document.getElementById('stat-selected').textContent = '—';
  g.selectAll('.node').classed('highlighted', false).classed('dimmed', false);
  g.selectAll('.link').classed('highlighted', false).classed('dimmed', false);
  document.querySelectorAll('.tree-node').forEach(el => el.classList.remove('selected'));
  closeInfo();
}

// ── Info panel ────────────────────────────────────────────────────────────
function showInfoPanel(id) {
  const panel = document.getElementById('info-panel');
  const adj = window._adj?.[id] || { out: [], in: [] };
  const node = data?.graph?.nodes?.find(n => n.id === id);

  document.getElementById('ip-name').textContent = node?.name || id.split('/').pop();
  document.getElementById('ip-path').textContent = id;

  const importsEl = document.getElementById('ip-imports');
  importsEl.innerHTML = adj.out.length
    ? adj.out.slice(0, 8).map(t => `<div class="ip-item" title="${t}">${t.split('/').pop()}</div>`).join('')
    : '<div style="color:var(--muted)">none</div>';

  const importedByEl = document.getElementById('ip-importedby');
  importedByEl.innerHTML = adj.in.length
    ? adj.in.slice(0, 8).map(s => `<div class="ip-item" title="${s}">${s.split('/').pop()}</div>`).join('')
    : '<div style="color:var(--muted)">none</div>';

  panel.classList.add('visible');
}

function closeInfo() {
  document.getElementById('info-panel').classList.remove('visible');
}

// ── Tooltip ───────────────────────────────────────────────────────────────
function showTooltip(e, d) {
  const adj = window._adj?.[d.id] || { out: [], in: [] };
  tooltip.innerHTML = `
    <div class="tt-name">${d.name}</div>
    <div class="tt-path">${d.path}</div>
    <div class="tt-row"><span>Group</span><span>${d.group}</span></div>
    <div class="tt-row"><span>Imports</span><span>${adj.out.length}</span></div>
    <div class="tt-row"><span>Imported by</span><span>${adj.in.length}</span></div>
    <div class="tt-row"><span>Size</span><span>${(d.size / 1024).toFixed(1)} KB</span></div>
  `;
  tooltip.style.opacity = 1;
  moveTooltip(e);
}

function moveTooltip(e) {
  tooltip.style.left = (e.clientX + 14) + 'px';
  tooltip.style.top = (e.clientY - 10) + 'px';
}

function hideTooltip() { tooltip.style.opacity = 0; }

// ── Legend ────────────────────────────────────────────────────────────────
function renderLegend() {
  const legend = document.getElementById('legend');
  legend.innerHTML = Object.entries(GROUP_COLORS).map(([g, c]) =>
    `<div class="legend-item"><div class="legend-dot" style="background:${c}"></div>${g}</div>`
  ).join('');
}

// ── View / Filter ─────────────────────────────────────────────────────────
function setView(v) {
  currentView = v;
  document.getElementById('btn-graph').classList.toggle('active', v === 'graph');
  document.getElementById('btn-tree').classList.toggle('active', v === 'tree-only');
  document.querySelector('.canvas-wrap').style.display = v === 'tree-only' ? 'none' : '';
  document.querySelector('.sidebar').style.width = v === 'tree-only' ? '100%' : '260px';
}

function setFilter(f) {
  currentFilter = f;
  ['all', 'php', 'ts'].forEach(x => document.getElementById('btn-filter-' + x)?.classList.toggle('active', x === f));
  if (data) renderGraph(data.graph);
}

function updateStats() {
  if (!data) return;
  const total = countAllFiles(data.tree);
  document.getElementById('stat-files').textContent = total;
}

function countAllFiles(tree) {
  return tree.reduce((s, n) => {
    if (n.type === 'file') return s + 1;
    return s + countAllFiles(n.children || []);
  }, 0);
}

// ── Init ──────────────────────────────────────────────────────────────────
loadData().then(() => startAutoRefresh());
</script>
</body>
</html>
