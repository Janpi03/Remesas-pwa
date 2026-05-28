/**
 * useChart.js
 * Composable de gráficos con Canvas API puro (sin librerías externas).
 * Migrado de charts.js: acepta elementos canvas directamente en lugar de IDs.
 * Llamar las funciones dentro de onMounted() para garantizar que el DOM esté listo.
 */

export function useChart() {
  // ─── Utilidad interna ──────────────────────────────────────────────────────
  function _setup(canvas) {
    if (!canvas) return null
    const ctx  = canvas.getContext('2d')
    const dpr  = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width  = rect.width  * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    return { ctx, w: rect.width, h: rect.height }
  }

  function _emptyState(canvas, msg = 'Sin datos') {
    const s = _setup(canvas)
    if (!s) return
    s.ctx.fillStyle = '#a0aec0'
    s.ctx.font = '14px sans-serif'
    s.ctx.textAlign = 'center'
    s.ctx.textBaseline = 'middle'
    s.ctx.fillText(msg, s.w / 2, s.h / 2)
  }

  // ─── Gráfico de barras ─────────────────────────────────────────────────────
  function createBarChart(canvas, data, options = {}) {
    if (!data?.length) return _emptyState(canvas)
    const s = _setup(canvas)
    if (!s) return
    const { ctx, w, h } = s
    const pad = { top: 30, right: 20, bottom: 40, left: 55 }
    const cw  = w - pad.left - pad.right
    const ch  = h - pad.top  - pad.bottom
    const max = Math.max(...data.map(d => d.value)) * 1.1 || 1
    const bw  = (cw / data.length) * 0.65
    const gap = (cw / data.length) * 0.35

    ctx.clearRect(0, 0, w, h)

    // Grid lines
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth   = 1
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + (ch / 5) * i
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke()
      ctx.fillStyle  = '#718096'
      ctx.font       = '11px sans-serif'
      ctx.textAlign  = 'right'
      ctx.fillText(Math.round(max - (max / 5) * i).toLocaleString(), pad.left - 8, y + 4)
    }

    // Bars
    data.forEach((item, i) => {
      const x  = pad.left + i * (bw + gap) + gap / 2
      const bh = (item.value / max) * ch
      const y  = pad.top + ch - bh

      const grad = ctx.createLinearGradient(0, y, 0, y + bh)
      grad.addColorStop(0, item.color  || '#667eea')
      grad.addColorStop(1, item.color2 || '#764ba2')
      ctx.fillStyle = grad
      ctx.beginPath(); ctx.roundRect(x, y, bw, bh, 4); ctx.fill()

      ctx.fillStyle  = '#2d3748'
      ctx.font       = 'bold 11px sans-serif'
      ctx.textAlign  = 'center'
      ctx.fillText(item.value.toLocaleString(), x + bw / 2, y - 7)

      ctx.fillStyle = '#718096'
      ctx.font      = '11px sans-serif'
      ctx.fillText(item.label, x + bw / 2, h - 12)
    })
  }

  // ─── Gráfico de dona ───────────────────────────────────────────────────────
  function createDonutChart(canvas, data, options = {}) {
    if (!data?.length) return _emptyState(canvas)
    const s = _setup(canvas)
    if (!s) return
    const { ctx, w, h } = s
    const cx = w / 2
    const cy = h / 2
    const r  = Math.min(cx, cy) * 0.78
    const ir = r * 0.55

    ctx.clearRect(0, 0, w, h)

    const total = data.reduce((sum, d) => sum + d.value, 0) || 1
    let angle   = -Math.PI / 2

    data.forEach(item => {
      const slice = (item.value / total) * 2 * Math.PI
      ctx.beginPath()
      ctx.arc(cx, cy, r,  angle, angle + slice)
      ctx.arc(cx, cy, ir, angle + slice, angle, true)
      ctx.closePath()
      ctx.fillStyle   = item.color
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth   = 2
      ctx.stroke()
      angle += slice
    })

    ctx.fillStyle      = '#2d3748'
    ctx.font           = 'bold 18px sans-serif'
    ctx.textAlign      = 'center'
    ctx.textBaseline   = 'middle'
    ctx.fillText(options.centerText  || total.toLocaleString(), cx, cy - 9)
    ctx.fillStyle      = '#718096'
    ctx.font           = '12px sans-serif'
    ctx.fillText(options.centerLabel || 'Total', cx, cy + 13)

    // Leyenda lateral
    if (options.legend !== false) {
      const startY = h - data.length * 18 - 4
      data.forEach((item, i) => {
        const ly = startY + i * 18
        ctx.fillStyle = item.color
        ctx.fillRect(w - 110, ly, 12, 12)
        ctx.fillStyle  = '#4a5568'
        ctx.font       = '11px sans-serif'
        ctx.textAlign  = 'left'
        ctx.textBaseline = 'top'
        const lbl = (item.label || '').substring(0, 10)
        ctx.fillText(`${lbl} (${((item.value / total) * 100).toFixed(0)}%)`, w - 94, ly)
      })
    }
  }

  // ─── Gráfico de líneas ─────────────────────────────────────────────────────
  function createLineChart(canvas, data, options = {}) {
    if (!data?.length) return _emptyState(canvas)
    const s = _setup(canvas)
    if (!s) return
    const { ctx, w, h } = s
    const pad = { top: 30, right: 20, bottom: 38, left: 55 }
    const cw  = w - pad.left - pad.right
    const ch  = h - pad.top  - pad.bottom
    const max = Math.max(...data.map(d => d.value)) * 1.15 || 1

    ctx.clearRect(0, 0, w, h)

    // Grid
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth   = 1
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + (ch / 5) * i
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke()
      ctx.fillStyle = '#718096'
      ctx.font      = '11px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(Math.round(max - (max / 5) * i).toLocaleString(), pad.left - 6, y + 4)
    }

    // Puntos calculados
    const pts = data.map((d, i) => ({
      x: pad.left + (data.length > 1 ? (i / (data.length - 1)) * cw : cw / 2),
      y: pad.top  + ch - (d.value / max) * ch
    }))

    // Área rellena
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pad.top + ch)
    pts.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.lineTo(pts[pts.length - 1].x, pad.top + ch)
    ctx.closePath()
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch)
    grad.addColorStop(0, 'rgba(102,126,234,0.22)')
    grad.addColorStop(1, 'rgba(102,126,234,0.00)')
    ctx.fillStyle = grad
    ctx.fill()

    // Línea
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    pts.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.strokeStyle = '#667eea'
    ctx.lineWidth   = 3
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.stroke()

    // Puntos + labels X
    pts.forEach((p, i) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
      ctx.fillStyle   = '#ffffff'; ctx.fill()
      ctx.strokeStyle = '#667eea'; ctx.lineWidth = 2; ctx.stroke()

      ctx.fillStyle    = '#718096'
      ctx.font         = '10px sans-serif'
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(data[i].label, p.x, h - 8)
    })
  }

  return { createBarChart, createDonutChart, createLineChart }
}
