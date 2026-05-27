/**
 * charts.js - Gráficos con Canvas API (sin dependencias externas)
 */

const charts = {
  // Crear gráfico de barras
  createBarChart(canvasId, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    const padding = { top: 30, right: 20, bottom: 40, left: 50 };
    
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const maxValue = Math.max(...data.map(d => d.value)) * 1.1;
    const barWidth = (chartWidth / data.length) * 0.7;
    const gap = (chartWidth / data.length) * 0.3;
    
    // Limpiar
    ctx.clearRect(0, 0, width, height);
    
    // Fondo
    ctx.fillStyle = options.bgColor || '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Ejes
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    
    // Líneas horizontales
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const y = padding.top + (chartHeight / steps) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      // Labels Y
      ctx.fillStyle = '#718096';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      const value = Math.round(maxValue - (maxValue / steps) * i);
      ctx.fillText(value.toLocaleString(), padding.left - 8, y + 4);
    }
    
    // Barras
    data.forEach((item, index) => {
      const x = padding.left + (index * (barWidth + gap)) + gap / 2;
      const barHeight = (item.value / maxValue) * chartHeight;
      const y = padding.top + chartHeight - barHeight;
      
      // Gradiente
      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      gradient.addColorStop(0, item.color || '#667eea');
      gradient.addColorStop(1, item.color2 || '#764ba2');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 4);
      ctx.fill();
      
      // Valor encima
      ctx.fillStyle = '#2d3748';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.value.toLocaleString(), x + barWidth / 2, y - 8);
      
      // Label X
      ctx.fillStyle = '#718096';
      ctx.font = '11px sans-serif';
      ctx.fillText(item.label, x + barWidth / 2, height - 15);
    });
    
    return canvas;
  },

  // Gráfico circular (donut)
  createDonutChart(canvasId, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) * 0.8;
    const innerRadius = radius * 0.55;
    
    ctx.clearRect(0, 0, width, height);
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = -Math.PI / 2;
    
    data.forEach(item => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      
      // Slice
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
      ctx.closePath();
      
      ctx.fillStyle = item.color;
      ctx.fill();
      
      // Borde
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      currentAngle += sliceAngle;
    });
    
    // Texto central
    ctx.fillStyle = '#2d3748';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(options.centerText || total.toLocaleString(), centerX, centerY - 8);
    
    ctx.fillStyle = '#718096';
    ctx.font = '12px sans-serif';
    ctx.fillText(options.centerLabel || 'Total', centerX, centerY + 12);
    
    return canvas;
  },

  // Gráfico de líneas (tendencia)
  createLineChart(canvasId, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    const padding = { top: 30, right: 20, bottom: 40, left: 50 };
    
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const maxValue = Math.max(...data.map(d => d.value)) * 1.1;
    const minValue = 0;
    
    ctx.clearRect(0, 0, width, height);
    
    // Grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const y = padding.top + (chartHeight / steps) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
    
    // Línea
    const points = data.map((item, index) => ({
      x: padding.left + (index / (data.length - 1)) * chartWidth,
      y: padding.top + chartHeight - ((item.value / maxValue) * chartHeight)
    }));
    
    // Área bajo la curva
    ctx.beginPath();
    ctx.moveTo(points[0].x, padding.top + chartHeight);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(102, 126, 234, 0.2)');
    gradient.addColorStop(1, 'rgba(102, 126, 234, 0.0)');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Línea principal
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    // Puntos
    points.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#667eea';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Labels
      ctx.fillStyle = '#718096';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(data[i].label, p.x, height - 10);
    });
    
    return canvas;
  },

  // Renderizar dashboard de estadísticas
  async renderDashboard() {
    const stats = await db.getStats();
    
    // Datos para gráficos
    const remesasData = [
      { label: 'Completadas', value: stats.countCompletadas, color: '#48bb78' },
      { label: 'Pendientes', value: stats.countPendientes, color: '#ecc94b' }
    ];
    
    // Simular datos de tendencia mensual (en producción, agrupar por fecha)
    const tendenciaData = [
      { label: 'Ene', value: stats.totalRemesas * 0.15 },
      { label: 'Feb', value: stats.totalRemesas * 0.22 },
      { label: 'Mar', value: stats.totalRemesas * 0.18 },
      { label: 'Abr', value: stats.totalRemesas * 0.25 },
      { label: 'May', value: stats.totalRemesas * 0.20 }
    ];
    
    requestAnimationFrame(() => {
      this.createDonutChart('chartRemesas', remesasData, {
        centerText: (stats.countCompletadas + stats.countPendientes).toString(),
        centerLabel: 'Remesas'
      });
      
      this.createLineChart('chartTendencia', tendenciaData);
    });
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = charts;
}
