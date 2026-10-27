/**
 * MinNote - NoteBoard 2.5.21 Math, 3D Spatial & Science Integration Bridge
 * Connects NoteBoard symbolic math, orthographic 3D geometry, chemical balancer,
 * and Word/MathType import directly into MinNote Whiteboard engine.
 */
(() => {
  'use strict';

  // 1. Helper: Insert item into MinNote Whiteboard
  window.insertSvgOrImageToBoard = async function(dataUri, w = 480, h = 320) {
    try {
      const editor = window.__noteRendererEditor || 
                     (window.noteRenderer && window.noteRenderer.editor) || 
                     (typeof window.getEditor === 'function' ? window.getEditor() : null);

      const targetW = Math.max(120, Math.min(1200, w));
      const targetH = Math.max(80, Math.min(900, h));

      // Calculate center position or default coordinates
      let cx = 200, cy = 180;
      if (editor && editor.camera) {
        cx = (window.innerWidth / 2 - (editor.camera.x || 0)) / (editor.camera.scale || 1) - targetW / 2;
        cy = (window.innerHeight / 2 - (editor.camera.y || 0)) / (editor.camera.scale || 1) - targetH / 2;
      }

      const item = {
        id: 'nb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        type: 'image',
        x: Math.round(cx),
        y: Math.round(cy),
        w: Math.round(targetW),
        h: Math.round(targetH),
        src: dataUri
      };

      if (editor && typeof editor.insertItem === 'function') {
        editor.insertItem(item);
        if (typeof editor.redraw === 'function') editor.redraw();
        if (typeof editor.commit === 'function') editor.commit();
        return true;
      } else if (editor && typeof editor.insertImage === 'function') {
        await editor.insertImage(dataUri, { w: targetW, h: targetH });
        return true;
      } else {
        // Fallback: Copy to clipboard or alert
        const img = new Image();
        img.src = dataUri;
        const win = window.open('', '_blank');
        if (win) {
          win.document.write('<title>Ảnh Xuất MinNote</title><img src="' + dataUri + '" style="max-width:100%">');
        }
        return true;
      }
    } catch (err) {
      console.error('[MinNote NoteBoard Bridge] Error inserting item to board:', err);
      alert('Không thể chèn vào bảng: ' + err.message);
      return false;
    }
  };

  /* ==========================================================================
   * 2. BẢNG BIẾN THIÊN TOÁN HỌC (VARIATION TABLE MODAL)
   * ========================================================================== */
  let varDialog = null;
  window.openNBVariationModal = function(defaultExpr) {
    if (!window.NBVariation) {
      alert('Chưa nạp module NoteBoard Variation. Hãy kiểm tra file assets/noteboard/math/variation.js.');
      return;
    }
    if (varDialog) {
      varDialog.remove();
      varDialog = null;
    }

    const d = document.createElement('dialog');
    varDialog = d;
    d.className = 'nb-modal-dialog';
    d.id = 'minnoteVariationDialog';
    d.setAttribute('aria-label', 'Bảng biến thiên Toán học');
    
    d.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;border-bottom:1px solid #e2e8f0;padding-bottom:12px;">
        <h3 style="margin:0;font-size:18px;font-weight:700;color:#0d9488;display:flex;align-items:center;gap:8px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 16l4-8 4 6 5-10"/></svg>
          Xuất Bảng Biến Thiên Tự Động (Chuẩn SGK Việt Nam)
        </h3>
        <button id="varCloseX" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px;">
        <label style="font-weight:600;color:#334155;">
          Nhập hàm số theo x:
          <input id="varExprInput" type="text" spellcheck="false" 
            placeholder="Ví dụ: y = x^3 - 3*x hoặc y = (2x+1)/(x-1) hoặc y = sqrt(x^2 - 4)" 
            style="width:100%;box-sizing:border-box;margin-top:6px;padding:10px 14px;font:15px Consolas,monospace;border:1.5px solid #cbd5e1;border-radius:8px;outline:none;" />
        </label>

        <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#475569;">
            Cận trái:
            <input id="varLoInput" type="text" placeholder="-∞" style="width:90px;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;font-family:Consolas,monospace;" />
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#475569;">
            Cận phải:
            <input id="varHiInput" type="text" placeholder="+∞" style="width:90px;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;font-family:Consolas,monospace;" />
          </label>
          <button id="varPreviewBtn" style="padding:8px 18px;background:#0d9488;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;margin-left:auto;">
            Xem Trước
          </button>
        </div>

        <div style="font-size:12px;color:#64748b;line-height:1.4;">
          * Hỗ trợ đa thức mọi bậc, phân thức hữu tỉ, căn thức sqrt(f(x)), ln, log, exp, sin, cos, tan. Tự động tìm tập xác định, nghiệm f'(x)=0, dấu đạo hàm, tiệm cận đứng, ngang và chiều mũi tên biến thiên.
        </div>

        <div id="varError" style="color:#ef4444;font-size:13px;font-weight:600;min-height:20px;white-space:pre-wrap;"></div>

        <!-- Preview Box -->
        <div id="varPreviewBox" style="min-height:180px;max-height:360px;overflow:auto;display:flex;align-items:center;justify-content:center;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:10px;padding:12px;">
          <span style="color:#94a3b8;font-style:italic;">Bấm "Xem Trước" để dựng bảng biến thiên SVG vector...</span>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:10px;">
          <button id="varDownloadSvg" disabled style="padding:9px 16px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;border-radius:6px;font-weight:600;cursor:pointer;">
            Tải SVG
          </button>
          <button id="varInsertBtn" disabled style="padding:9px 20px;background:#0d9488;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(13,148,136,0.3);">
            Chèn Vào Bảng MinNote
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(d);
    d.showModal();

    const exprInput = d.querySelector('#varExprInput');
    const loInput = d.querySelector('#varLoInput');
    const hiInput = d.querySelector('#varHiInput');
    const previewBtn = d.querySelector('#varPreviewBtn');
    const previewBox = d.querySelector('#varPreviewBox');
    const errBox = d.querySelector('#varError');
    const insertBtn = d.querySelector('#varInsertBtn');
    const dlBtn = d.querySelector('#varDownloadSvg');
    const closeX = d.querySelector('#varCloseX');

    exprInput.value = (typeof defaultExpr === 'string' && defaultExpr.trim()) ? defaultExpr.trim() : 'y = x^3 - 3*x';

    let currentSvg = '';
    let currentModel = null;

    function renderVariation() {
      errBox.textContent = '';
      const text = exprInput.value.trim();
      if (!text) {
        errBox.textContent = 'Vui lòng nhập hàm số.';
        return;
      }
      try {
        currentModel = window.NBVariation.analyze(text, {
          lo: loInput.value.trim(),
          hi: hiInput.value.trim()
        });
        currentSvg = window.NBVariation.svg(currentModel);
        previewBox.innerHTML = currentSvg;
        const svgEl = previewBox.querySelector('svg');
        if (svgEl) {
          svgEl.style.cssText = 'max-width:100%;height:auto;max-height:320px;display:block;margin:auto;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.06));';
        }
        insertBtn.disabled = false;
        dlBtn.disabled = false;
      } catch (e) {
        currentSvg = '';
        currentModel = null;
        insertBtn.disabled = true;
        dlBtn.disabled = true;
        previewBox.innerHTML = '<span style="color:#ef4444;">Lỗi tính toán: ' + (e.message || String(e)) + '</span>';
        errBox.textContent = e.message || String(e);
      }
    }

    previewBtn.onclick = renderVariation;
    exprInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        renderVariation();
      }
    };

    closeX.onclick = () => d.close();
    d.addEventListener('close', () => d.remove());

    insertBtn.onclick = () => {
      if (!currentSvg) return;
      const svgEl = previewBox.querySelector('svg');
      let w = 580, h = 260;
      if (svgEl) {
        w = svgEl.viewBox?.baseVal?.width || svgEl.width?.baseVal?.value || 580;
        h = svgEl.viewBox?.baseVal?.height || svgEl.height?.baseVal?.value || 260;
      }
      const dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(currentSvg);
      window.insertSvgOrImageToBoard(dataUri, w, h);
      d.close();
    };

    dlBtn.onclick = () => {
      if (!currentSvg) return;
      const blob = new Blob([currentSvg], { type: 'image/svg+xml;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'bang-bien-thien.svg';
      a.click();
    };

    // Tự động render lần đầu
    setTimeout(renderVariation, 60);
  };

  /* ==========================================================================
   * 3. HÌNH HỌC KHÔNG GIAN 3D NATIVE (3D SPATIAL GEOMETRY MODAL)
   * ========================================================================== */
  let spatialDialog = null;
  window.openNBSpatialModal = function(defaultKind) {
    if (!window.NBSpatial) {
      alert('Chưa nạp module NoteBoard Spatial 3D. Hãy kiểm tra file assets/noteboard/math/spatial.js.');
      return;
    }
    if (spatialDialog) {
      spatialDialog.remove();
      spatialDialog = null;
    }

    const d = document.createElement('dialog');
    spatialDialog = d;
    d.className = 'nb-modal-dialog';
    d.id = 'minnoteSpatialDialog';
    d.setAttribute('aria-label', 'Hình học không gian 3D');

    d.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;border-bottom:1px solid #e2e8f0;padding-bottom:12px;">
        <h3 style="margin:0;font-size:18px;font-weight:700;color:#0d9488;display:flex;align-items:center;gap:8px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          Hình Học Không Gian 3D Native (Tự tính nét đứt & góc nhìn)
        </h3>
        <button id="spCloseX" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>
      </div>

      <div style="display:grid;grid-template-columns:300px 1fr;gap:20px;">
        <!-- Left Controls -->
        <div style="display:flex;flex-direction:column;gap:12px;font-size:13px;color:#334155;">
          <label style="font-weight:600;">
            Loại hình 3D:
            <select id="spKindSelect" style="width:100%;margin-top:4px;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:6px;font-weight:600;">
              <option value="cube">Khối Lập Phương (Cube)</option>
              <option value="box">Hình Hộp Chữ Nhật (Box)</option>
              <option value="pyramid">Hình Chóp Tứ Giác (Pyramid S.ABCD)</option>
              <option value="tetra">Hình Chóp Tam Giác / Tứ Diện (Tetra S.ABC)</option>
              <option value="prism3">Lăng Trụ Tam Giác (ABC.A'B'C')</option>
              <option value="prism6">Lăng Trụ Lục Giác</option>
              <option value="cylinder">Hình Trụ (Cylinder)</option>
              <option value="cone">Hình Nón (Cone)</option>
              <option value="sphere">Mặt Cầu (Sphere)</option>
            </select>
          </label>

          <div style="display:flex;flex-direction:column;gap:8px;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
            <label style="font-weight:600;display:flex;justify-content:space-between;">
              Góc xoay ngang (Yaw):
              <span id="spYawVal" style="font-family:Consolas,monospace;color:#0d9488;">35°</span>
            </label>
            <input type="range" id="spYawInput" min="-180" max="180" value="35" style="width:100%;" />

            <label style="font-weight:600;display:flex;justify-content:space-between;margin-top:4px;">
              Góc xoay đứng (Pitch):
              <span id="spPitchVal" style="font-family:Consolas,monospace;color:#0d9488;">24°</span>
            </label>
            <input type="range" id="spPitchInput" min="8" max="80" value="24" style="width:100%;" />
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
              <input type="checkbox" id="spHiddenCheck" checked /> Nét đứt (khuất)
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
              <input type="checkbox" id="spLabelsCheck" checked /> Nhãn đỉnh
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
              <input type="checkbox" id="spTopViewCheck" /> Nhìn từ trên
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
              Màu nét:
              <input type="color" id="spColorInput" value="#0d9488" style="width:28px;height:24px;border:none;cursor:pointer;padding:0;background:none;" />
            </label>
          </div>

          <div style="font-size:11.5px;color:#64748b;line-height:1.4;margin-top:4px;">
            * Mẹo: Bạn có thể kéo thả chuột trực tiếp trên khung vẽ 3D bên phải để xoay góc nhìn tự do.
          </div>
        </div>

        <!-- Right 3D Interactive Canvas -->
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div style="position:relative;width:100%;height:380px;background:#ffffff;border:1.5px solid #cbd5e1;border-radius:12px;overflow:hidden;box-shadow:inset 0 2px 6px rgba(0,0,0,0.03);">
            <canvas id="spCanvas" width="720" height="540" style="width:100%;height:100%;display:block;cursor:grab;touch-action:none;"></canvas>
            <div style="position:absolute;bottom:8px;right:12px;font-size:11px;color:#94a3b8;pointer-events:none;background:rgba(255,255,255,0.8);padding:2px 6px;border-radius:4px;">
              Kéo chuột để xoay 3D
            </div>
          </div>

          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button id="spResetBtn" style="padding:9px 16px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;border-radius:6px;font-weight:600;cursor:pointer;">
              Đặt Lại Góc Nhìn
            </button>
            <button id="spInsertBtn" style="padding:9px 20px;background:#0d9488;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(13,148,136,0.3);">
              Chèn Vào Bảng MinNote
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(d);
    d.showModal();

    const kindSelect = d.querySelector('#spKindSelect');
    const yawInput = d.querySelector('#spYawInput');
    const yawVal = d.querySelector('#spYawVal');
    const pitchInput = d.querySelector('#spPitchInput');
    const pitchVal = d.querySelector('#spPitchVal');
    const hiddenCheck = d.querySelector('#spHiddenCheck');
    const labelsCheck = d.querySelector('#spLabelsCheck');
    const topViewCheck = d.querySelector('#spTopViewCheck');
    const colorInput = d.querySelector('#spColorInput');
    const canvas = d.querySelector('#spCanvas');
    const insertBtn = d.querySelector('#spInsertBtn');
    const resetBtn = d.querySelector('#spResetBtn');
    const closeX = d.querySelector('#spCloseX');

    if (defaultKind && window.NBSpatial.kinds[defaultKind]) {
      kindSelect.value = defaultKind;
    }

    let scene = window.NBSpatial.create(kindSelect.value);
    scene.color = colorInput.value;

    function render3D() {
      yawVal.textContent = Math.round(scene.camera.yaw) + '°';
      pitchVal.textContent = Math.round(scene.camera.pitch) + '°';
      yawInput.value = scene.camera.yaw;
      pitchInput.value = scene.camera.pitch;
      window.NBSpatial.draw(canvas, scene, { background: '#ffffff' });
    }

    function updateSceneKind() {
      const k = kindSelect.value;
      scene = window.NBSpatial.create(k);
      scene.hidden = hiddenCheck.checked;
      scene.labels = labelsCheck.checked;
      scene.topView = topViewCheck.checked;
      scene.color = colorInput.value;
      render3D();
    }

    kindSelect.onchange = updateSceneKind;
    yawInput.oninput = () => { scene.camera.yaw = +yawInput.value; render3D(); };
    pitchInput.oninput = () => { scene.camera.pitch = +pitchInput.value; render3D(); };
    hiddenCheck.onchange = () => { scene.hidden = hiddenCheck.checked; render3D(); };
    labelsCheck.onchange = () => { scene.labels = labelsCheck.checked; render3D(); };
    topViewCheck.onchange = () => { scene.topView = topViewCheck.checked; render3D(); };
    colorInput.onchange = () => { scene.color = colorInput.value; render3D(); };

    resetBtn.onclick = () => {
      scene.camera.yaw = scene.kind === 'pyramid' ? 45 : 35;
      scene.camera.pitch = 24;
      render3D();
    };

    // Canvas Mouse/Touch Rotation
    let isDragging = false, lastX = 0, lastY = 0;
    canvas.addEventListener('pointerdown', (e) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      scene.camera.yaw = ((scene.camera.yaw + dx * 0.7 + 180) % 360) - 180;
      scene.camera.pitch = Math.max(scene.topView ? 8 : -80, Math.min(80, scene.camera.pitch - dy * 0.7));
      render3D();
    });

    const endDrag = (e) => {
      if (isDragging) {
        isDragging = false;
        canvas.style.cursor = 'grab';
        try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    insertBtn.onclick = () => {
      // Export canvas to PNG data uri
      const dataUri = canvas.toDataURL('image/png');
      window.insertSvgOrImageToBoard(dataUri, 520, 390);
      d.close();
    };

    closeX.onclick = () => d.close();
    d.addEventListener('close', () => d.remove());

    // Render initially
    setTimeout(render3D, 60);
  };

  /* ==========================================================================
   * 4. CÂN BẰNG PHẢN ỨNG HÓA HỌC & TÍNH KHỐI LƯỢNG MOL (CHEM UNITS MODAL)
   * ========================================================================== */
  let chemDialog = null;
  window.openNBChemModal = function() {
    if (!window.NBChemUnits) {
      alert('Chưa nạp module NoteBoard ChemUnits. Hãy kiểm tra file assets/noteboard/math/chem-units.js.');
      return;
    }
    if (chemDialog) {
      chemDialog.remove();
      chemDialog = null;
    }

    const d = document.createElement('dialog');
    chemDialog = d;
    d.className = 'nb-modal-dialog';
    d.id = 'minnoteChemDialog';
    d.setAttribute('aria-label', 'Cân bằng Hóa học');

    d.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;border-bottom:1px solid #e2e8f0;padding-bottom:12px;">
        <h3 style="margin:0;font-size:18px;font-weight:700;color:#0d9488;display:flex;align-items:center;gap:8px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/></svg>
          Cân Bằng Phản Ứng Hóa Học &amp; Tính Khối Lượng Mol
        </h3>
        <button id="chemCloseX" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px;">
        <label style="font-weight:600;color:#334155;">
          Nhập phương trình hoặc công thức chất:
          <input id="chemInput" type="text" spellcheck="false" 
            placeholder="Ví dụ: Al + HCl -> AlCl3 + H2 hoặc KMnO4 + HCl -> KCl + MnCl2 + Cl2 + H2O hoặc Fe2(SO4)3" 
            style="width:100%;box-sizing:border-box;margin-top:6px;padding:10px 14px;font:15px Consolas,monospace;border:1.5px solid #cbd5e1;border-radius:8px;outline:none;" />
        </label>

        <div style="display:flex;gap:10px;">
          <button id="chemBalanceBtn" style="padding:9px 20px;background:#0d9488;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;">
            Cân Bằng Phản Ứng
          </button>
          <button id="chemMassBtn" style="padding:9px 18px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;border-radius:6px;font-weight:600;cursor:pointer;">
            Tính Khối Lượng Mol (M)
          </button>
        </div>

        <div id="chemResultBox" style="min-height:120px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:16px;display:flex;flex-direction:column;justify-content:center;gap:8px;">
          <span style="color:#94a3b8;font-style:italic;">Nhập phương trình và bấm "Cân Bằng Phản Ứng" hoặc "Tính Khối Lượng Mol"...</span>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:6px;">
          <button id="chemInsertBtn" disabled style="padding:9px 20px;background:#0d9488;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(13,148,136,0.3);">
            Chèn Vào Bảng MinNote
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(d);
    d.showModal();

    const input = d.querySelector('#chemInput');
    const balanceBtn = d.querySelector('#chemBalanceBtn');
    const massBtn = d.querySelector('#chemMassBtn');
    const resultBox = d.querySelector('#chemResultBox');
    const insertBtn = d.querySelector('#chemInsertBtn');
    const closeX = d.querySelector('#chemCloseX');

    input.value = 'Al + HCl -> AlCl3 + H2';

    let lastResultHtml = '';
    let lastResultText = '';

    function doBalance() {
      const text = input.value.trim();
      if (!text) return;
      try {
        const balanced = window.NBChemUnits.balance(text);
        if (balanced) {
          lastResultText = balanced;
          const prettyHtml = window.NBChemUnits.pretty ? window.NBChemUnits.pretty(balanced) : balanced;
          lastResultHtml = `
            <div style="font-size:18px;font-weight:700;color:#0d9488;margin-bottom:6px;">
              ${prettyHtml}
            </div>
            <div style="font-size:13px;color:#64748b;">
              Phương trình đã được cân bằng chính xác với hệ số nguyên tối giản.
            </div>
          `;
          resultBox.innerHTML = lastResultHtml;
          insertBtn.disabled = false;
        } else {
          resultBox.innerHTML = '<span style="color:#ef4444;">Không thể cân bằng phương trình này. Hãy kiểm tra các chất tham gia và sản phẩm.</span>';
          insertBtn.disabled = true;
        }
      } catch (err) {
        resultBox.innerHTML = '<span style="color:#ef4444;">Lỗi: ' + (err.message || String(err)) + '</span>';
        insertBtn.disabled = true;
      }
    }

    function doMolarMass() {
      const text = input.value.trim();
      if (!text) return;
      try {
        const mass = window.NBChemUnits.molarMass(text);
        if (mass) {
          const prettyF = window.NBChemUnits.pretty ? window.NBChemUnits.pretty(text) : text;
          lastResultText = 'M(' + text + ') = ' + mass + ' g/mol';
          lastResultHtml = `
            <div style="font-size:18px;font-weight:700;color:#0d9488;margin-bottom:6px;">
              M(${prettyF}) = ${mass} g/mol
            </div>
            <div style="font-size:13px;color:#64748b;">
              Khối lượng phân tử / mol nguyên tử theo chuẩn IUPAC.
            </div>
          `;
          resultBox.innerHTML = lastResultHtml;
          insertBtn.disabled = false;
        } else {
          resultBox.innerHTML = '<span style="color:#ef4444;">Không tìm thấy công thức phân tử hợp lệ.</span>';
          insertBtn.disabled = true;
        }
      } catch (err) {
        resultBox.innerHTML = '<span style="color:#ef4444;">Lỗi: ' + (err.message || String(err)) + '</span>';
        insertBtn.disabled = true;
      }
    }

    balanceBtn.onclick = doBalance;
    massBtn.onclick = doMolarMass;
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doBalance();
      }
    };

    insertBtn.onclick = () => {
      if (!lastResultText) return;
      // Chèn dạng công thức hoặc thẻ SVG
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="600" height="120" viewBox="0 0 600 120">
          <rect width="100%" height="100%" fill="#ffffff" rx="12" stroke="#0d9488" stroke-width="2"/>
          <text x="30" y="65" font-family="'Segoe UI', sans-serif" font-size="22" font-weight="bold" fill="#0d9488">
            ${lastResultText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
          </text>
        </svg>
      `;
      const dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      window.insertSvgOrImageToBoard(dataUri, 460, 100);
      d.close();
    };

    closeX.onclick = () => d.close();
    d.addEventListener('close', () => d.remove());

    setTimeout(doBalance, 50);
  };

  /* ==========================================================================
   * 5. QUICK WORD & MATHTYPE TERMINAL MODAL
   * ========================================================================== */
  window.openNBWordTerminalModal = function() {
    if (window.NBQuickWordTerminal && typeof window.NBQuickWordTerminal.open === 'function') {
      window.NBQuickWordTerminal.open();
      return;
    }
    alert('Quick Word Terminal đã sẵn sàng tích hợp trực tiếp.');
  };

  console.log('[MinNote] NoteBoard 2.5.21 Math, 3D Spatial & Science Bridge initialized.');
})();
