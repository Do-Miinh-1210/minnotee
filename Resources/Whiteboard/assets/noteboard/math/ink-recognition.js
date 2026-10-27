/* Enhanced Math Ink Recognition Engine for Vietnamese Teachers & Students.
   Features:
   - Stroke pair clustering (equals '=', cursive 'x', plus '+')
   - Vietnamese cursive handwriting support (cursive y with loop, looped 2, cursive x)
   - Equation midline tracking & robust baseline/superscript distinction
   - Mathematical syntax grammar prior
*/
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NBInkRecognition = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  'use strict';

  const box = pts => ({
    x0: Math.min(...pts.map(p => p.x)),
    y0: Math.min(...pts.map(p => p.y)),
    x1: Math.max(...pts.map(p => p.x)),
    y1: Math.max(...pts.map(p => p.y))
  });
  const width = b => Math.max(1, b.x1 - b.x0);
  const height = b => Math.max(1, b.y1 - b.y0);
  const cx = b => (b.x0 + b.x1) / 2;
  const cy = b => (b.y0 + b.y1) / 2;
  const line = s => s.split(' ').map(p => { const [x, y] = p.split(',').map(Number); return { x, y }; });
  const ellipse = (x, y, rx, ry, start = 0, end = 2 * Math.PI) => Array.from({ length: 33 }, (_, i) => ({
    x: x + rx * Math.cos(start + (end - start) * i / 32),
    y: y + ry * Math.sin(start + (end - start) * i / 32)
  }));

  const templates = [];
  function add(label, ...paths) {
    templates.push({ label, paths: paths.map(p => typeof p === 'string' ? line(p) : p) });
  }

  // 0-9
  add('0', ellipse(10, 16, 9, 15));
  add('1', '5,6 12,0 12,32', '4,32 20,32');
  add('1', '10,0 10,32');
  // 2: standard and Vietnamese cursive with bottom loop
  add('2', '1,6 5,1 12,0 19,4 19,10 15,16 1,31 21,31');
  add('2', '0,3 8,0 17,2 20,7 17,14 4,24 0,30 21,30');
  add('2', '1,8 5,2 12,0 18,3 19,9 15,16 7,24 2,28 3,31 7,31 14,29 22,27'); // Vietnamese cursive 2 with loop
  // 3
  add('3', '1,3 9,0 18,2 20,7 17,13 10,16 17,17 21,23 18,29 10,32 1,29');
  // 4
  add('4', '17,0 1,21 23,21', '17,0 17,32');
  add('4', '0,0 0,19 22,19', '18,0 18,32');
  add('4', '16,0 3,19 23,19 16,0 16,32'); // 1-stroke 4
  // 5
  add('5', '21,0 3,0 2,15 11,12 19,15 22,21 20,28 12,32 2,29');
  // 6
  add('6', '19,1 11,0 4,9 1,21 4,29 12,32 20,28 22,21 17,15 9,14 2,20');
  // 7
  add('7', '0,0 22,0 5,32');
  add('7', '0,0 22,0 5,32', '4,15 18,15');
  // 8
  add('8', ellipse(11, 8, 9, 8), ellipse(11, 24, 10, 8));
  add('8', '11,16 2,9 4,2 13,0 21,6 17,14 5,21 1,28 10,32 20,28 21,22 11,16');
  // 9
  add('9', '20,13 12,18 3,15 0,7 7,0 15,0 21,6 21,19 17,28 9,32');

  // Operators
  add('+', '0,16 24,16', '12,4 12,28');
  add('-', '0,16 24,16');
  add('=', '0,10 24,10', '0,22 24,22');
  add('/', '0,32 23,0');
  add('(', '15,0 7,5 2,15 4,25 14,32');
  add(')', '0,0 8,5 13,15 11,25 1,32');
  add('.', '0,0 1,1');

  // Variables & Letters
  // x: print, two arcs )(, and butterfly cursive
  add('x', '0,3 20,27', '19,3 0,27');
  add('x', '0,2 5,3 12,19 19,27', '20,1 0,29');
  add('x', '0,0 10,16 0,32', '20,0 10,16 20,32');
  add('x', '2,0 9,16 1,32 10,16 18,0 11,16 20,32');

  // y: standard print & Vietnamese cursive with descender loop
  add('y', '0,0 9,16 20,0', '20,0 9,29 2,34');
  add('y', '0,0 3,15 12,18 20,0 14,29 7,35 0,33');
  add('y', '0,0 0,16 6,22 14,22 18,16 18,0 18,34 14,40 8,38 18,26'); // Cursive y with loop

  add('z', '1,2 22,2 1,27 23,27');
  add('t', '10,0 8,26 12,31 19,28', '0,11 21,11');
  add('a', ellipse(10, 19, 9, 11), '19,8 19,30 23,31');
  add('b', '1,0 1,31', '1,16 10,10 19,14 21,23 16,30 7,31 1,26');
  add('c', ellipse(12, 19, 11, 12, 0.7, 5.5).reverse());
  add('d', ellipse(10, 20, 9, 11), '19,0 19,31');
  add('e', '1,19 21,19 19,12 12,8 5,11 1,20 5,28 13,31 22,27');
  add('f', '21,2 15,0 10,5 6,32', '0,13 19,13');
  add('g', ellipse(10, 15, 9, 10), '19,5 19,34 12,40 3,37');
  add('h', '1,0 1,32', '1,19 10,12 18,14 21,32');
  add('i', '9,10 9,31', '9,0 9,1');
  add('k', '1,0 1,32', '20,10 1,21 22,32');
  add('l', '8,0 6,27 10,32 17,29');
  add('m', '0,31 0,9 2,21 6,11 11,10 13,16 13,31', '13,20 18,10 23,12 25,31');
  add('n', '0,31 0,9 1,21 8,11 15,10 20,15 21,31');
  add('o', ellipse(11, 20, 10, 11));
  add('p', '1,42 1,10', '1,15 10,8 19,12 21,20 16,28 6,29 1,24');
  add('r', '1,31 1,9 2,20 9,10 17,11');
  add('s', '21,11 14,7 5,9 1,14 6,19 16,22 21,27 15,31 4,29');
  add('u', '0,9 0,25 5,31 13,30 20,20 20,9 20,31');
  add('v', '0,9 10,31 22,9');
  add('w', '0,9 5,31 12,17 18,31 25,9');

  add('A', '0,32 12,0 24,32', '5,20 20,20');
  add('R', '1,32 1,0 15,0 22,6 20,13 1,16', '10,16 24,32');
  add('I', '2,0 18,0', '10,0 10,32', '2,32 18,32');
  add('I', '10,0 10,32');
  add('U', '1,0 1,20 7,31 15,31 21,20 21,0');
  add('U', '0,0 0,22 5,30 16,30 21,22 21,0', '21,0 21,32');
  add('V', '0,0 11,32 22,0');
  add('T', '0,0 24,0', '12,0 12,32');
  add('F', '1,0 1,32', '1,0 22,0', '1,15 16,15');
  add('P', '1,32 1,0', '1,0 15,0 21,6 20,15 1,16');
  add('C', ellipse(12, 16, 11, 15, 0.7, 5.5).reverse());
  add('ω', '0,14 4,30 10,24 12,18 14,24 20,30 24,14');
  add('π', '0,10 26,10', '6,10 5,32', '20,10 18,28 23,32');
  add('θ', ellipse(11, 16, 10, 16), '1,16 21,16');

  function sample(paths) {
    const b = box(paths.flat()), w = Math.max(1, width(b)), h = Math.max(1, height(b)), points = [];
    for (const path of paths) {
      if (path.length === 1) points.push({ x: (path[0].x - b.x0) / w, y: (path[0].y - b.y0) / h });
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], z = path[i], dx = (z.x - a.x) / w, dy = (z.y - a.y) / h;
        const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 18));
        for (let j = 0; j < n; j++) points.push({ x: (a.x - b.x0) / w + dx * j / n, y: (a.y - b.y0) / h + dy * j / n });
      }
    }
    return { points: points.length ? points : [{ x: 0, y: 0 }], aspect: w / h, strokes: paths.length, b };
  }

  for (const t of templates) t.feature = sample(t.paths);

  function directed(a, b) {
    let sum = 0;
    for (const p of a) {
      let d = Infinity;
      for (const q of b) d = Math.min(d, (p.x - q.x) ** 2 + (p.y - q.y) ** 2);
      sum += Math.sqrt(d);
    }
    return sum / a.length;
  }

  function classify(paths) {
    const f = sample(paths);
    if (height(f.b) < 3 && width(f.b) < 3) return [{ label: '.', score: 0 }];
    const aspect = width(f.b) / height(f.b);
    if (aspect > 3.0 && height(f.b) < 18) return [{ label: '-', score: 0 }, { label: '=', score: 0.1 }];

    const ranked = templates.map(t => {
      let score = (directed(f.points, t.feature.points) + directed(t.feature.points, f.points)) / 2;
      score += 0.055 * Math.min(3, Math.abs(Math.log(f.aspect / t.feature.aspect)));
      score += 0.012 * Math.abs(f.strokes - t.feature.strokes);
      if (t.user) score *= 0.9; // nét mẫu học từ chính người viết được ưu tiên nhẹ
      return { label: t.label, score };
    }).sort((a, b) => a.score - b.score);

    const unique = [];
    for (const t of ranked) if (!unique.some(u => u.label === t.label)) unique.push(t);
    return unique.slice(0, 4);
  }

  /* Dau '+': mot net ngang va mot net doc cat nhau (net that thang co hop bao rong 0 nen cho sai so vai diem) */
  function plusPair(a, b) {
    const aspA = width(a.b) / height(a.b), aspB = width(b.b) / height(b.b);
    if (!((aspA > 1.8 && aspB < 0.55) || (aspA < 0.55 && aspB > 1.8))) return false;
    const tol = 3 + 0.08 * Math.max(width(a.b), height(a.b), width(b.b), height(b.b));
    const xOver = Math.min(a.b.x1, b.b.x1) - Math.max(a.b.x0, b.b.x0);
    const yOver = Math.min(a.b.y1, b.b.y1) - Math.max(a.b.y0, b.b.y0);
    return xOver > -tol && yOver > -tol;
  }

  function clusterStrokes(strokes) {
    const items = strokes.map(s => ({ paths: [s.pts], b: box(s.pts) }));
    const symbols = [];
    const used = new Set();

    // 1. Detect equals sign '=': two horizontal parallel bars
    for (let i = 0; i < items.length; i++) {
      if (used.has(i)) continue;
      const a = items[i];
      const aspectA = width(a.b) / height(a.b);
      if (aspectA < 1.8 && height(a.b) > 22) continue;

      for (let j = i + 1; j < items.length; j++) {
        if (used.has(j)) continue;
        const b = items[j];
        const aspectB = width(b.b) / height(b.b);
        if (aspectB < 1.8 && height(b.b) > 22) continue;

        const overX = Math.min(a.b.x1, b.b.x1) - Math.max(a.b.x0, b.b.x0);
        const minW = Math.min(width(a.b), width(b.b));
        const vGap = Math.abs(cy(a.b) - cy(b.b));
        const avgW = (width(a.b) + width(b.b)) / 2;

        if (overX / minW > 0.55 && vGap > 4 && vGap < avgW * 0.95) {
          used.add(i); used.add(j);
          const combinedPaths = [...a.paths, ...b.paths];
          symbols.push({
            label: '=',
            exact: true,
            paths: combinedPaths,
            b: box(combinedPaths.flat()),
            alternatives: ['=']
          });
          break;
        }
      }
    }

    // 2. Detect cursive X or crossed X: two strokes
    for (let i = 0; i < items.length; i++) {
      if (used.has(i)) continue;
      const a = items[i];
      for (let j = i + 1; j < items.length; j++) {
        if (used.has(j)) continue;
        const b = items[j];
        if (plusPair(a, b)) continue;                 // ngang + doc la dau cong, khong phai chu x
        const hA = height(a.b), hB = height(b.b);
        const avgH = (hA + hB) / 2;
        const cyDiff = Math.abs(cy(a.b) - cy(b.b));
        const xDist = Math.abs(cx(a.b) - cx(b.b));
        const xOverlap = Math.min(a.b.x1, b.b.x1) - Math.max(a.b.x0, b.b.x0);

        const isCross = (xOverlap > 0 && cyDiff < avgH * 0.45);
        const isTwoArcs = (xDist < avgH * 1.15 && cyDiff < avgH * 0.35 && Math.abs(hA - hB) < avgH * 0.55);

        if (isCross || isTwoArcs) {
          used.add(i); used.add(j);
          const combinedPaths = [...a.paths, ...b.paths];
          symbols.push({
            label: 'x',
            exact: true,
            paths: combinedPaths,
            b: box(combinedPaths.flat()),
            alternatives: ['x', 'X']
          });
          break;
        }
      }
    }

    // 3. Detect '+' sign: horizontal and vertical crossing
    for (let i = 0; i < items.length; i++) {
      if (used.has(i)) continue;
      const a = items[i];
      for (let j = i + 1; j < items.length; j++) {
        if (used.has(j)) continue;
        const b = items[j];
        {
          if (plusPair(a, b)) {
            used.add(i); used.add(j);
            const combinedPaths = [...a.paths, ...b.paths];
            symbols.push({
              label: '+',
              exact: true,
              paths: combinedPaths,
              b: box(combinedPaths.flat()),
              alternatives: ['+']
            });
            break;
          }
        }
      }
    }

    // 4. Remaining single strokes
    for (let i = 0; i < items.length; i++) {
      if (used.has(i)) continue;
      const item = items[i];
      const alts = classify(item.paths);
      symbols.push({
        label: alts[0].label,
        exact: false,
        paths: item.paths,
        b: item.b,
        alternatives: alts.map(a => a.label)
      });
    }

    // Sort left-to-right
    symbols.sort((a, b) => a.b.x0 - b.b.x0);
    return symbols;
  }

  function recognise(strokes) {
    if (!Array.isArray(strokes) || !strokes.length) throw Error('Khoanh từ 1 đến 300 nét viết.');
    if (strokes.length > 300) throw Error('Vùng nhận diện quá lớn.');
    let count = 0;
    const cleanStrokes = strokes.map(s => {
      if (!Array.isArray(s.pts) || !s.pts.length) throw Error('Nét viết không hợp lệ.');
      count += s.pts.length;
      if (count > 30000) throw Error('Vùng nhận diện quá lớn.');
      const pts = s.pts.map(p => ({ x: Number(p.x), y: Number(p.y) }));
      return { pts };
    });

    // Check fraction bars first
    function parseList(list, depth = 0) {
      if (depth > 6) throw Error('Phân số lồng quá sâu.');
      // Find a potential fraction bar
      for (const bar of list.filter(s => width(s.b) > height(s.b) * 4 && width(s.b) > 18).sort((a, b) => width(b.b) - width(a.b))) {
        // Must not be an equals sign
        const candidates = list.filter(s => s !== bar && cx(s.b) >= bar.b.x0 - 5 && cx(s.b) <= bar.b.x1 + 5);
        const above = candidates.filter(s => s.b.y1 < cy(bar.b) - 2 && cy(bar.b) - s.b.y1 < width(bar.b) * 1.8);
        const below = candidates.filter(s => s.b.y0 > cy(bar.b) + 2 && s.b.y0 - cy(bar.b) < width(bar.b) * 1.8);
        if (above.length && below.length) {
          const used = new Set([bar, ...above, ...below]);
          const left = list.filter(s => !used.has(s) && cx(s.b) < bar.b.x0);
          const right = list.filter(s => !used.has(s) && cx(s.b) >= bar.b.x0);
          return parseList(left, depth + 1) + '((' + parseList(above, depth + 1) + ')/(' + parseList(below, depth + 1) + '))' + parseList(right, depth + 1);
        }
      }

      const symbols = clusterStrokes(list);
      let out = '';
      let raised = false;
      let lastBase = null;

      for (let i = 0; i < symbols.length; i++) {
        const s = symbols[i];
        let val = s.label;

        // Disambiguate context with math syntax knowledge
        if (val === 'z' && (out.endsWith('=') || out.endsWith('+') || out.endsWith('-') || out === '')) {
          if (s.alternatives.includes('2')) val = '2';
        }
        if (val === 'o' && /[=+*/^(\d]$/.test(out)) val = '0';
        if (val === '0' && /[a-zα-ω]$/u.test(out)) val = 'o';
        // Physics context: single stroke before '=' is 'I' rather than '1'
        if ((val === '1' || val === 'i' || val === 'l') && out === '' && (i < symbols.length - 1 && symbols[i + 1].label === '=')) {
          val = 'I';
        }
        // Physics uppercase variables in fractions/equations
        if (val === 'u' && (out.includes('=') || out.endsWith('/') || out.endsWith('('))) val = 'U';
        if (val === 'r' && (out.includes('=') || out.endsWith('/') || out.endsWith('('))) val = 'R';

        const isOp = (val === '=' || val === '+' || val === '-' || val === '/' || val === '*');
        let isSuperscript = false;

        if (!isOp && lastBase && !s.exact) {
          const baseCy = cy(lastBase.b);
          const baseH = height(lastBase.b);
          const isHigher = cy(s.b) < baseCy - baseH * 0.22;
          const bottomAboveLowerHalf = s.b.y1 < baseCy + baseH * 0.25;
          const isSmaller = height(s.b) <= baseH * 0.85;
          const isRightOfBase = s.b.x0 >= cx(lastBase.b);

          if (isHigher && bottomAboveLowerHalf && isSmaller && isRightOfBase) {
            isSuperscript = true;
          }
        }

        if (isSuperscript && !raised) {
          out += '^(';
          raised = true;
        } else if (!isSuperscript && raised) {
          out += ')';
          raised = false;
        }

        out += val;
        if (val === '=') {
          lastBase = null;
        } else if (!isSuperscript && !isOp) {
          lastBase = s;
        }
      }

      if (raised) out += ')';
      return out;
    }

    const items = cleanStrokes.map(s => ({ paths: [s.pts], b: box(s.pts), pts: s.pts }));
    let rawExpr = parseList(items);

    // Clean up math expression: e.g. ^(2) -> ^2, clean double parenthesis
    rawExpr = rawExpr.replace(/\^\((\d+)\)/g, '^$1');
    const symbols = clusterStrokes(cleanStrokes);

    return {
      expression: rawExpr,
      symbols: symbols.map(s => ({ text: s.label, box: s.b, alternatives: s.alternatives, exact: !!s.exact, paths: s.paths })),
      engine: 'vietnamese-math-ink',
      needsConfirmation: true,
      experimental: true
    };
  }

  function insidePolygon(p, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }

  function select(strokes, polygon) {
    if (polygon.length < 8) throw Error('Khoanh một vòng kín quanh công thức.');
    const b = box(polygon);
    if (width(b) < 20 || height(b) < 15 || Math.hypot(polygon[0].x - polygon.at(-1).x, polygon[0].y - polygon.at(-1).y) > Math.max(width(b), height(b)) * 0.45) {
      throw Error('Vòng khoanh cần khép kín và đủ lớn.');
    }
    const chosen = [], partial = [];
    for (const s of strokes) {
      if (s.erase || s.hl || !s.pts?.length) continue;
      let n = 0;
      for (const p of s.pts) if (insidePolygon(p, polygon)) n++;
      const ratio = n / s.pts.length;
      if (ratio >= 0.85) chosen.push(s);
      else if (n) partial.push(s);
    }
    if (partial.length) throw Error('Vòng khoanh cắt qua nét viết. Hãy khoanh rộng hơn để lấy trọn công thức.');
    if (!chosen.length) throw Error('Không có nét viết trong vùng khoanh.');
    const bounds = box(chosen.flatMap(s => s.pts));
    for (const s of strokes) {
      if (s.erase && s.pts.some(p => p.x >= bounds.x0 && p.x <= bounds.x1 && p.y >= bounds.y0 && p.y <= bounds.y1)) {
        throw Error('Vùng này có nét tẩy. Hãy viết lại công thức ở vùng trống để nhận diện đúng phần còn thấy.');
      }
    }
    return { strokes: chosen, box: bounds };
  }

  /* Hoc net chu cua nguoi dung: them mau ki hieu (toi da USER_MAX, bo mau cu nhat). Duong dan toa do tuy y, se duoc chuan hoa. */
  const USER_MAX = 400, LABEL = /^[0-9A-Za-zα-ωΑ-Ω+\-=\/().]$/u;
  function addTemplate(label, paths) {
    if (typeof label !== 'string' || !LABEL.test(label) || !Array.isArray(paths)) return false;
    const clean = paths.slice(0, 6).map(p => (Array.isArray(p) ? p : []).slice(0, 400).map(q => ({ x: Number(q.x), y: Number(q.y) })))
      .filter(p => p.length && p.every(q => Number.isFinite(q.x) && Number.isFinite(q.y)));
    if (!clean.length) return false;
    const t = { label, paths: clean, user: true };
    t.feature = sample(clean);
    templates.push(t);
    const users = templates.filter(x => x.user);
    if (users.length > USER_MAX) templates.splice(templates.indexOf(users[0]), 1);
    return true;
  }
  function clearUserTemplates() { for (let i = templates.length - 1; i >= 0; i--) if (templates[i].user) templates.splice(i, 1); }
  const userTemplateCount = () => templates.filter(x => x.user).length;

  return { recognise, classify, select, box, addTemplate, clearUserTemplates, userTemplateCount };
});
