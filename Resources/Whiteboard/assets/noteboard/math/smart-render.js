/* Canvas typesetting and linked graph for native smart ink objects.
   Includes:
   - LaTeX-style clean round tick numbers (no decimal clutter)
   - Dynamic auto-crop & framing for positive/negative coefficients
   - Interactive crop handles (top, bottom, left, right) matching NoteBoard graph frame
*/
(function(root, factory) {
  const M = typeof module === 'object' && module.exports ? require('./smart-expression.js') : root.NBSmartMath;
  const api = factory(M);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NBSmartRender = api;
})(typeof window !== 'undefined' ? window : globalThis, function(M) {
  'use strict';

  // Format clean math number (LaTeX-style: proper minus sign, no trailing decimal clutter)
  function fmtMath(n) {
    if (Math.abs(n) < 1e-9) return '0';
    const sign = n < 0 ? '−' : '';
    const abs = Math.abs(n);
    if (abs >= 1e5 || (abs < 0.001 && abs > 0)) {
      return sign + abs.toExponential(1).replace('e+', '·10^').replace('e-', '·10^-');
    }
    // Round to at most 2 decimal places, remove trailing zeros
    return sign + Number(abs.toFixed(2)).toString();
  }

  // Nice Ticks algorithm (Paul Heckbert / standard graphing engine)
  function niceTicks(min, max, maxTicks = 6) {
    const span = max - min;
    if (span <= 0 || !Number.isFinite(span)) return { step: 1, ticks: [min] };
    const rawStep = span / maxTicks;
    const power = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const frac = rawStep / power;
    let niceFrac = 1;
    if (frac > 1.5 && frac <= 3.5) niceFrac = 2;
    else if (frac > 3.5 && frac <= 7.5) niceFrac = 5;
    else if (frac > 7.5) niceFrac = 10;
    const step = niceFrac * power;
    const start = Math.ceil(min / step) * step;
    const ticks = [];
    for (let v = start; v <= max + step * 0.001; v += step) {
      const cleanV = Math.abs(v) < step * 1e-4 ? 0 : Number(v.toFixed(6));
      ticks.push(cleanV);
    }
    return { step, ticks };
  }

  const fmt = n => Number(n.toPrecision(7)).toString();

  function draw(canvas, raw) {
    const s = M.clean(raw);
    if (!s) throw Error('Công thức tương tác không hợp lệ.');
    const p = M.parse(s.expression);
    const params = new Map(s.params.map(v => [v.key, v]));
    const c = canvas.getContext('2d');
    const hits = [];

    const text = (value, size, key, isParam = false) => {
      c.font = 'italic ' + size + 'px Cambria, Georgia, serif';
      const w = c.measureText(value).width;
      return {
        w: w + (isParam ? 12 : 0),
        above: size * 0.85,
        below: size * 0.22,
        paint(x, y) {
          if (isParam) {
            c.save();
            c.fillStyle = 'rgba(22,138,128,0.12)';
            c.strokeStyle = '#168a80';
            c.lineWidth = 1.5;
            const pad = 4, bx = x - 2, by = y - size * 0.82, bw = w + pad * 2 + 4, bh = size * 1.05, br = 5;
            c.beginPath();
            if (c.roundRect) c.roundRect(bx, by, bw, bh, br);
            else c.rect(bx, by, bw, bh);
            c.fill();
            c.stroke();
            c.restore();
          }
          c.font = 'italic ' + size + 'px Cambria, Georgia, serif';
          c.fillStyle = isParam ? '#0e5f58' : '#111111';
          c.fillText(value, x + (isParam ? 4 : 0), y);
          if (key) {
            hits.push({ key, text: value, x: x - (isParam ? 2 : 0), y: y - size * 0.88, w: Math.max(w + (isParam ? 12 : 0), 16), h: size * 1.15, isParam });
          }
        }
      };
    };

    function row(parts, gap = 2) {
      const w = parts.reduce((n, b) => n + b.w, 0) + gap * (parts.length - 1);
      return {
        w,
        above: Math.max(...parts.map(b => b.above)),
        below: Math.max(...parts.map(b => b.below)),
        paint(x, y) {
          for (const b of parts) {
            b.paint(x, y);
            x += b.w + gap;
          }
        }
      };
    }

    function layout(n, size) {
      const key = M.keyOf(n), bound = params.get(key);
      if (bound) return text(fmtMath(bound.value), size, key, true);
      if (n.type === 'num' || n.type === 'var' || n.type === 'const') {
        return text(n.type === 'const' ? 'π' : n.type === 'num' ? n.text : n.name, size, key, n.type === 'num');
      }
      if (n.type === 'unary') return row([text(n.op === '-' ? '−' : '+', size), layout(n.a, size)]);
      if (n.type === 'fn') return row([text(n.name === 'sqrt' ? '√' : n.name, size), text('(', size), layout(n.a, size), text(')', size)]);

      let a = layout(n.a, n.op === '/' ? size * 0.88 : size);
      if (n.op === '^' && n.a.type === 'binary') a = row([text('(', size), a, text(')', size)]);
      const b = layout(n.b, size * (n.op === '^' ? 0.65 : n.op === '/' ? 0.88 : 1));

      if (n.op === '^') {
        return {
          w: a.w + b.w + 2,
          above: Math.max(a.above, size * 0.6 + b.above),
          below: a.below,
          paint(x, y) {
            a.paint(x, y);
            b.paint(x + a.w + 2, y - size * 0.6);
          }
        };
      }
      if (n.op === '/') {
        const w = Math.max(a.w, b.w) + 12, above = a.above + a.below + size * 0.3, below = b.above + b.below + size * 0.15;
        return {
          w, above, below,
          paint(x, y) {
            a.paint(x + (w - a.w) / 2, y - size * 0.3 - a.below);
            b.paint(x + (w - b.w) / 2, y + size * 0.15 + b.above);
            c.lineWidth = 2;
            c.beginPath();
            c.moveTo(x + 2, y - size * 0.08);
            c.lineTo(x + w - 2, y - size * 0.08);
            c.stroke();
          }
        };
      }
      const wrap = node => node.type === 'binary' && ['+', '-'].includes(node.op);
      const left = wrap(n.a) && n.op === '*' ? row([text('(', size), a, text(')', size)]) : a;
      const right = wrap(n.b) && ['*', '-'].includes(n.op) ? row([text('(', size), b, text(')', size)]) : b;
      return row([left, text(n.op === '*' ? '·' : n.op === '-' ? '−' : n.op, size), right], size * 0.12);
    }

    let size = 46;
    let formula = row([layout(p.lhs, size), ...(p.rhs ? [text(' = ', size), layout(p.rhs, size)] : [])]);
    if (formula.w > 1020) {
      size *= 1020 / formula.w;
      formula = row([layout(p.lhs, size), ...(p.rhs ? [text(' = ', size), layout(p.rhs, size)] : [])]);
    }
    const formulaHeight = Math.ceil(formula.above + formula.below + 45);
    const paramHeight = s.params.length ? Math.ceil(s.params.length / 4) * 32 + 12 : 0;
    const top = formulaHeight + paramHeight;

    const nextWidth=s.graph.enabled?1100:Math.ceil(Math.max(240,formula.w+60,Math.min(s.params.length,4)*265+30));
    const nextHeight=top+(s.graph.enabled?470:16);
    if(canvas.width!==nextWidth)canvas.width=nextWidth;
    if(canvas.height!==nextHeight)canvas.height=nextHeight;
    c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';c.setLineDash([]);c.clearRect(0,0,canvas.width,canvas.height);

    c.fillStyle = '#111111';
    c.strokeStyle = '#111111';
    c.textBaseline = 'alphabetic';
    formula.paint(30, 22 + formula.above);

    const paramHits = [];
    s.params.forEach((v, i) => {
      const x = 30 + (i % 4) * 265, y = formulaHeight + 27 + Math.floor(i / 4) * 32;
      c.font = '22px Cambria, Georgia, serif';
      const label = v.name + ' = ' + fmtMath(v.value) + (v.unit ? ' ' + v.unit : '');
      c.fillText(label, x, y);
      paramHits.push({ key: v.key, text: v.name, x, y: y - 24, w: 250, h: 31 });
    });
    hits.push(...paramHits);

    let error = '', range = null, graphRect = null;
    if (s.graph.enabled) {
      const gx = 75, gy = top + 28, gw = 965, gh = 380;
      graphRect = { x: gx, y: gy, w: gw, h: gh };

      try {
        const spec = M.graphSpec(s);
        const minX = s.graph.min, maxX = s.graph.max;
        const numSamples = 601;
        const points = Array.from({ length: numSamples }, (_, i) => {
          const x = minX + (maxX - minX) * i / (numSamples - 1);
          let y;
          try { y = spec.fn(x); } catch { y = NaN; }
          return { x, y };
        });

        const validYs = points.map(p => p.y).filter(Number.isFinite).filter(y => Math.abs(y) < 1e7);
        if (!validYs.length) throw Error('Không có giá trị hữu hạn trong khoảng đang chọn.');

        validYs.sort((a, b) => a - b);
        const dataYMin = validYs[Math.floor(validYs.length * 0.02)];
        const dataYMax = validYs[Math.min(validYs.length - 1, Math.floor(validYs.length * 0.98))];

        // Intelligent Auto-Crop / Auto-Range:
        // Adapts dynamically so curves (including flipped a > 0 vs a < 0) are NEVER cut off!
        let ymin = s.graph.ymin, ymax = s.graph.ymax;
        const isAutoFit = s.graph.autoFit === true;

        if (isAutoFit || ymin === null || ymax === null || ymax <= ymin) {
          if (ymin === null && ymax === null && !isAutoFit) {
            ymin = -20;
            ymax = 20;
          } else {
            if (dataYMin >= -0.001) {
              // Parabola or function opening upwards (>= 0): show vertex at 0 with 15% bottom margin
              ymin = -0.15 * Math.max(1, dataYMax);
              ymax = dataYMax * 1.15;
            } else if (dataYMax <= 0.001) {
              // Parabola or function opening downwards (<= 0): show vertex at 0 with 15% top margin
              ymax = -0.15 * Math.min(-1, dataYMin);
              ymin = dataYMin * 1.15;
            } else {
              // Curve crossing zero
              const pad = (dataYMax - dataYMin) * 0.15 || 1;
              ymin = dataYMin - pad;
              ymax = dataYMax + pad;
            }
            // Clamp initial auto-fit to [-20, 20] so it does not start excessively large
            if (ymax > 20) ymax = 20;
            if (ymin < -20) ymin = -20;
            if (ymax <= ymin) { ymin = -20; ymax = 20; }
          }
          if (s.graph.autoFit !== true) {
            s.graph.ymin = Number(ymin.toFixed(4));
            s.graph.ymax = Number(ymax.toFixed(4));
            s.graph.autoFit = false;
          }
        }
        range = { ymin, ymax, min: minX, max: maxX };

        const sx = x => gx + (x - minX) / (maxX - minX) * gw;
        const sy = y => gy + gh - (y - ymin) / (ymax - ymin) * gh;

        // Compute Nice LaTeX-style ticks for both axes
        const xTicks = niceTicks(minX, maxX, 8);
        const yTicks = niceTicks(ymin, ymax, 6);

        // Draw background grid lines at nice tick positions
        c.lineWidth = 1;
        c.strokeStyle = '#e6ecee';
        c.beginPath();
        for (const tx of xTicks.ticks) {
          const px = sx(tx);
          if (px >= gx && px <= gx + gw) {
            c.moveTo(px, gy);
            c.lineTo(px, gy + gh);
          }
        }
        for (const ty of yTicks.ticks) {
          const py = sy(ty);
          if (py >= gy && py <= gy + gh) {
            c.moveTo(gx, py);
            c.lineTo(gx + gw, py);
          }
        }
        c.stroke();

        // Draw graph border
        c.strokeStyle = '#5a6872';
        c.lineWidth = 1.5;
        c.strokeRect(gx, gy, gw, gh);

        // Draw coordinate axes Ox and Oy
        c.strokeStyle = '#2b363d';
        c.lineWidth = 1.8;
        c.beginPath();
        // Ox axis
        const axisY = (ymin < 0 && ymax > 0) ? sy(0) : (ymin >= 0 ? gy + gh : gy);
        c.moveTo(gx, axisY);
        c.lineTo(gx + gw, axisY);
        // Oy axis
        const axisX = (minX < 0 && maxX > 0) ? sx(0) : (minX >= 0 ? gx : gx + gw);
        c.moveTo(axisX, gy + gh);
        c.lineTo(axisX, gy);
        c.stroke();

        // Draw arrowheads on axes
        c.fillStyle = '#2b363d';
        // Ox arrow
        c.beginPath();
        c.moveTo(gx + gw, axisY);
        c.lineTo(gx + gw - 8, axisY - 4);
        c.lineTo(gx + gw - 8, axisY + 4);
        c.fill();
        // Oy arrow
        c.beginPath();
        c.moveTo(axisX, gy);
        c.lineTo(axisX - 4, gy + 8);
        c.lineTo(axisX + 4, gy + 8);
        c.fill();

        // Draw axis labels
        c.font = 'italic 18px Cambria, Georgia, serif';
        const xVarLabel = spec.variable || 'x';
        const yVarLabel = spec.output || 'y';
        c.fillText(xVarLabel, gx + gw - 4, axisY + 18);
        c.fillText(yVarLabel, axisX + 8, gy + 12);
        // Draw origin label 'O'
        c.font = 'italic 15px Cambria, Georgia, serif';
        c.fillText('O', axisX - 14, (axisY + 16 <= gy + gh ? axisY + 16 : axisY - 6));

        // Draw tick numbers (clean LaTeX style)
        c.font = '15px Segoe UI, sans-serif';
        c.fillStyle = '#41515b';
        // X tick labels
        for (const tx of xTicks.ticks) {
          if (Math.abs(tx) < 1e-9 && (minX < 0 && maxX > 0)) continue; // skip 0 at center to avoid overlap
          const px = sx(tx);
          if (px >= gx + 15 && px <= gx + gw - 15) {
            const label = fmtMath(tx);
            const lw = c.measureText(label).width;
            c.fillText(label, px - lw / 2, gy + gh + 20);
          }
        }
        // Y tick labels
        for (const ty of yTicks.ticks) {
          if (Math.abs(ty) < 1e-9) continue;
          const py = sy(ty);
          if (py >= gy + 12 && py <= gy + gh - 8) {
            const label = fmtMath(ty);
            const lw = c.measureText(label).width;
            c.fillText(label, gx - lw - 8, py + 5);
          }
        }

        // Draw curve with adaptive sampling and asymptote breaking
        c.save();
        c.beginPath();
        c.rect(gx, gy, gw, gh);
        c.clip();
        c.beginPath();
        let previous = null;
        for (const q of points) {
          const pt = Number.isFinite(q.y) ? { x: sx(q.x), y: sy(q.y) } : null;
          if (!pt || Math.abs(pt.y) > 1e7) {
            previous = null;
            continue;
          }
          if (!previous || Math.abs(pt.y - previous.y) > gh * 1.5) {
            c.moveTo(pt.x, pt.y);
          } else {
            c.lineTo(pt.x, pt.y);
          }
          previous = pt;
        }
        c.strokeStyle = '#1b69a7';
        c.lineWidth = 3;
        c.stroke();
        c.restore();

        // Title above graph
        c.fillStyle = '#163f42';
        c.font = '20px Cambria, Georgia, serif';
        c.fillText(spec.output + (spec.implicit ? ' = vế trái − vế phải' : '') + ' theo ' + spec.variable, gx, gy - 9);

        // Interactive Crop Handles (matching NoteBoard graph frame)
        // Draw subtle pill handles at the 4 edges
        const drawHandle = (hx, hy, hw, hh, label, hitType) => {
          c.save();
          c.fillStyle = 'rgba(255,255,255,0.92)';
          c.strokeStyle = '#168a80';
          c.lineWidth = 1.2;
          c.beginPath();
          if (c.roundRect) c.roundRect(hx, hy, hw, hh, 4);
          else c.rect(hx, hy, hw, hh);
          c.fill();
          c.stroke();
          c.fillStyle = '#164e52';
          c.font = 'bold 11px Segoe UI, sans-serif';
          const tw = c.measureText(label).width;
          c.fillText(label, hx + (hw - tw) / 2, hy + hh - 4);
          c.restore();
          hits.push({ key: hitType, x: hx - 4, y: hy - 4, w: hw + 8, h: hh + 8, isGraphHandle: true });
        };

        // Top handle
        drawHandle(gx + gw / 2 - 35, gy - 8, 70, 16, '↕ ' + fmtMath(ymax), 'handleTop');
        // Bottom handle
        drawHandle(gx + gw / 2 - 35, gy + gh - 8, 70, 16, '↕ ' + fmtMath(ymin), 'handleBottom');
        // Left handle
        drawHandle(gx - 8, gy + gh / 2 - 12, 16, 24, '‹', 'handleLeft');
        // Right handle
        drawHandle(gx + gw - 8, gy + gh / 2 - 12, 16, 24, '›', 'handleRight');

        // Add whole graph area hit target for Pan / Zoom
        hits.push({ key: 'graphArea', x: gx, y: gy, w: gw, h: gh, isGraphArea: true });

      } catch (e) {
        error = e.message;
        c.fillStyle = '#9a421f';
        c.font = '22px Segoe UI, sans-serif';
        c.fillText(error.slice(0, 85), 30, gy + 70);
      }
    }

    return {
      hits,
      parsed: p,
      scene: s,
      error,
      range,
      graphRect,
      width: canvas.width,
      height: canvas.height
    };
  }

  return { draw, format: fmtMath, niceTicks };
});
