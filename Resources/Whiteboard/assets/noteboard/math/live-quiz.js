/**
 * NoteBoard Ink — Live Quiz (Tương tác trực tiếp kiểu ClassPoint)
 * Tích hợp ngay trên thanh menu bên trái (rail) và bảng điều khiển (studioPanel).
 * Giáo viên điều khiển ngay trên bảng: phát từng câu trong đề Word (kéo thả lúc dạy) hoặc đề đã lưu trên web;
 * phiên chạy trên máy chủ, học sinh trả lời bằng điện thoại.
 */
(()=>{
  'use strict';

  const rail = document.getElementById('rail');
  const panel = document.getElementById('studioPanel');
  if (!rail || !panel) return;

  /* Khai bao som: giao dien ben duoi dung origin ngay khi tao (dung truoc khi khai bao se loi TDZ, mat ca bang Live) */
  const origin = typeof window.nbLiveAuth?.origin === 'string' ? window.nbLiveAuth.origin      /* kiem thu ban Windows */
    : document.querySelector('meta[name="noteboard-account"]') ? location.origin : 'https://app.noteboardink.com';
  const authUrl = origin + '/auth/google';

  // 1. Thêm nút Live Quiz vào thanh rail bên trái (ngay sau Giảng bài)
  let railBtn = document.getElementById('liveRailBtn');
  if (!railBtn) {
    railBtn = document.createElement('button');
    railBtn.className = 'rail-btn';
    railBtn.dataset.panel = 'live';
    railBtn.id = 'liveRailBtn';
    railBtn.title = 'Live Quiz · Tương tác trực tiếp cả lớp (kiểu ClassPoint)';
    railBtn.style.position = 'relative';
    railBtn.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10 M12 6a6 6 0 1 0 6 6 M12 10a2 2 0 1 0 2 2"/>
        <circle cx="12" cy="12" r="1.6" fill="currentColor"/>
      </svg>
      <span>Live Quiz</span>
      <span id="liveBadge" style="display:none;position:absolute;top:5px;right:6px;min-width:14px;height:14px;padding:0 3px;font-size:9px;font-weight:700;line-height:14px;text-align:center;background:#ef4444;color:#fff;border-radius:99px;">0</span>
      <span id="liveDot" style="display:none;position:absolute;top:6px;left:8px;width:7px;height:7px;background:#10b981;border-radius:50%;box-shadow:0 0 5px #10b981"></span>
    `;
    const lessonBtn = rail.querySelector('[data-panel="lesson"]');
    if (lessonBtn && lessonBtn.nextSibling) {
      rail.insertBefore(railBtn, lessonBtn.nextSibling);
    } else {
      rail.appendChild(railBtn);
    }
  }
  railBtn.onclick = () => {
    if (typeof window.showPanel === 'function') window.showPanel('live', true);
  };

  // 2. Thêm section data-section="live" vào studioPanel
  let sec = panel.querySelector('[data-section="live"]');
  if (!sec) {
    sec = document.createElement('section');
    sec.className = 'panel-section';
    sec.dataset.section = 'live';
    sec.hidden = true;
    sec.innerHTML = `
      <div id="liveOffState">
        <p class="panel-intro">Tương tác trực tiếp kiểu ClassPoint ngay trên bài giảng đang chiếu (Word, PDF, GeoGebra, PhET, link web).</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;margin:10px 0;font-size:12.5px;color:#166534;line-height:1.5;">
          <b>✦ Điểm nổi bật:</b>
          <div style="margin-top:4px">• Học sinh dùng điện thoại/iPad quét mã QR tham gia tức thì, không cần tài khoản.</div>
          <div>• Phát từng câu trong đề Word: kéo thả ngay lúc dạy hoặc chọn đề đã lưu trên web.</div>
          <div>• Giữ đủ hình, công thức, bảng; đáp án chỉ hiện khi thầy cô bấm.</div>
        </div>
        <button class="setting-btn primary" id="liveStartBtn" style="font-weight:600;font-size:13.5px;padding:10px 14px;width:100%;">▶ Bắt đầu Live Quiz</button>
        <div style="display:grid;grid-template-columns:1fr;gap:6px;margin-top:8px;">
          <button class="setting-btn" id="liveBankBtn" style="font-size:11.5px;color:#0f766e;border-color:#ccfbf1;background:#f0fdfa;width:100%;">📑 Ngân hàng đề Word / JSON đầy đủ ↗</button>
          <a id="liveSampleWordLink" href="${origin}/mau-phien-truc-tiep.docx" download="mau-phien-truc-tiep.docx" target="_blank" style="font-size:11.5px;color:#1e40af;border:1px solid #dbeafe;background:#eff6ff;border-radius:8px;padding:6px 10px;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px;font-weight:600;">
            <span>📥 Tải đề Word mẫu (.docx)</span>
          </a>
        </div>
        <div id="liveLoginNotice" style="display:none;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px;margin:10px 0;font-size:12.5px;color:#991b1b;line-height:1.5;">
          <div style="font-weight:700;display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span>🔐 Cần đăng nhập tài khoản Google</span>
          </div>
          <div id="liveLoginMessage" style="font-size:12px;color:#7f1d1d;margin-bottom:8px;">
            Thầy cô hãy đăng nhập tài khoản Google để sử dụng tính năng Live Quiz (hỗ trợ cả bản web và bản app).
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <button class="setting-btn primary" id="liveLoginActionBtn" style="font-size:12px;padding:8px 10px;background:#0f766e;color:#fff;border:none;">
              🔗 Đăng nhập bằng Google
            </button>
            <button class="setting-btn" id="liveLoginRetryBtn" style="font-size:12px;padding:6px 10px;background:#fff;">
              🔄 Tôi đã đăng nhập · Thử lại
            </button>
          </div>
          <div style="margin-top:8px;font-size:11px;color:#64748b;">
            Link đăng nhập: <a id="liveLoginPanelLink" href="#" target="_blank" style="color:#0f766e;text-decoration:underline;"></a>
          </div>
        </div>
      </div>

      <div id="liveOnState" style="display:none;">
        <!-- Khối mã lớp & kết nối -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.5px;">MÃ PHIÊN LỚP HỌC</span>
            <span id="liveConnBadge" style="font-size:11px;color:#16a34a;font-weight:600;">● Đang trực tiếp</span>
          </div>
          <div style="display:flex;align-items:baseline;gap:10px;margin:6px 0;">
            <span id="liveCodeText" style="font-size:26px;font-weight:800;letter-spacing:3px;color:#0f766e;font-variant-numeric:tabular-nums;">------</span>
            <span id="liveStudentsText" style="font-size:12.5px;color:#475569;">0 học sinh</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">
            <button class="setting-btn" id="liveShowQRBtn" style="font-size:12px;padding:6px 8px;">⛶ Chiếu mã QR</button>
            <button class="setting-btn danger" id="liveEndBtn" style="font-size:12px;padding:6px 8px;">⏹ Dừng phiên</button>
          </div>
        </div>

        <!-- Phát câu: thời gian, khóa bài, kết quả (chỉ phát câu trong đề Word / đề đã lưu) -->
        <div id="liveRunBox" style="margin-bottom:14px;">
          <label class="field-label">Thời gian làm bài</label>
          <select class="panel-select" id="liveTimerSelect" style="margin-bottom:10px;">
            <option value="0">Không giới hạn thời gian</option>
            <option value="15">15 giây</option>
            <option value="30" selected>30 giây</option>
            <option value="60">60 giây</option>
            <option value="120">2 phút</option>
          </select>

          <div style="display:flex;gap:6px;">
            <button class="setting-btn" id="liveLockBtn" style="display:none;background:#fef3c7;color:#92400e;border-color:#fde68a;">🔒 Khóa bài</button>
          </div>

          <!-- Biểu đồ kết quả trực tiếp -->
          <div id="liveResultBox" style="display:none;margin-top:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <b style="font-size:12px;color:#334155;">KẾT QUẢ BÌNH CHỌN</b>
              <span id="liveProgressCount" style="font-size:11px;color:#64748b;">0 trả lời</span>
            </div>
            <div id="liveBars" style="display:flex;flex-direction:column;gap:6px;"></div>
            <div style="margin-top:10px;padding-top:8px;border-top:1px dashed #cbd5e1;display:flex;gap:6px;">
              <button class="setting-btn" id="livePasteDraftBtn" style="font-size:11px;padding:5px 8px;flex:1;">📋 Dán vào Bảng nháp</button>
            </div>
          </div>
        </div>

      </div>
    `;
    panel.appendChild(sec);
  }

  // 3. Modal QR code phóng to giữa màn hình
  let modal = document.getElementById('liveQRModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'liveQRModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.72);z-index:9999;display:none;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:18px;padding:32px 36px;text-align:center;max-width:440px;box-shadow:0 25px 60px rgba(0,0,0,0.35);position:relative;">
        <button id="liveQRClose" style="position:absolute;top:14px;right:16px;background:none;border:none;font-size:22px;color:#64748b;cursor:pointer;">✕</button>
        <div style="font-size:14px;font-weight:700;color:#0f766e;letter-spacing:1px;text-transform:uppercase;">Tham gia Live Quiz</div>
        <div style="font-size:13px;color:#475569;margin-top:4px;">Quét mã QR hoặc truy cập trên điện thoại:</div>
        <div style="font-size:15px;font-weight:700;color:#1e293b;margin:6px 0 14px;padding:4px 10px;background:#f1f5f9;border-radius:8px;display:inline-block;">app.noteboardink.com/live</div>
        <div id="liveQRImageWrap" style="width:250px;height:250px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:8px;">
          <div style="font-size:13px;color:#64748b;">Đang tải mã QR…</div>
        </div>
        <div style="font-size:12px;color:#64748b;">MÃ LỚP CỦA BẠN:</div>
        <div id="liveQRModalCode" style="font-size:38px;font-weight:800;letter-spacing:5px;color:#0f766e;margin-top:2px;font-variant-numeric:tabular-nums;">------</div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#liveQRClose').onclick = () => { modal.style.display = 'none'; };
    modal.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };
  }

  // 4. Menu Chèn & Giảng bài shortcut
  const insertMenu = document.querySelector('#insertMenu');
  if (insertMenu && !document.getElementById('openLiveSession')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.role = 'menuitem';
    button.id = 'openLiveSession';
    button.innerHTML = '<b>Live Quiz · Tương tác cả lớp</b><small>Phát câu hỏi trong đề Word cho cả lớp</small>';
    button.onclick = () => {
      insertMenu.hidden = true;
      document.querySelector('#insertBtn')?.setAttribute('aria-expanded', 'false');
      if (typeof window.showPanel === 'function') window.showPanel('live', false);
    };
    insertMenu.append(button);
  }
  const lessonSection = document.querySelector('[data-section="lesson"]');
  if (lessonSection && !document.getElementById('lessonLiveSession')) {
    const quick = document.createElement('button');
    quick.type = 'button';
    quick.className = 'setting-btn';
    quick.id = 'lessonLiveSession';
    quick.textContent = 'Live Quiz · Tương tác cả lớp';
    quick.onclick = () => {
      if (typeof window.showPanel === 'function') window.showPanel('live', false);
    };
    lessonSection.append(quick);
  }

  // 5. Trạng thái và kết nối
  let currentRoom = null;
  let eventSource = null;
  let currentAnswers = [];
  let currentDoubts = [];
  let chartOptions = null;        // nhan cot bieu do khi phat cau tu de Word (null: theo dang hoi nhanh)
  let selectedType = 'mcq4';
  let correctOption = null;
  let timerInterval = null;
  let remainingSeconds = 0;


  // Modal đăng nhập Live Quiz
  let loginModal = document.getElementById('liveLoginModal');
  if (!loginModal) {
    loginModal = document.createElement('div');
    loginModal.id = 'liveLoginModal';
    loginModal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.68);z-index:9999;display:none;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    loginModal.innerHTML = `
      <div style="background:#fff;border-radius:18px;padding:26px 28px;max-width:440px;width:92%;box-shadow:0 25px 60px rgba(0,0,0,0.35);position:relative;font-family:inherit;">
        <button id="liveLoginModalClose" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:20px;color:#64748b;cursor:pointer;line-height:1;">✕</button>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
          <div style="width:38px;height:38px;border-radius:10px;background:#ecfdf5;display:flex;align-items:center;justify-content:center;color:#0f766e;font-size:18px;">🔐</div>
          <div>
            <h3 style="margin:0;font-size:15px;font-weight:700;color:#0f766e;">Đăng nhập Live Quiz</h3>
            <div style="font-size:11.5px;color:#64748b;">Tương tác trực tiếp cho cả lớp</div>
          </div>
        </div>
        <div id="liveLoginModalDetail" style="font-size:13px;color:#334155;line-height:1.6;margin-bottom:14px;">
          Thầy cô hãy đăng nhập tài khoản Google để khởi tạo phiên tương tác (hỗ trợ cả bản web và bản app).
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-bottom:14px;font-size:12px;">
          <div style="color:#64748b;margin-bottom:4px;font-size:11px;">Link đăng nhập trực tiếp:</div>
          <a id="liveLoginModalLink" href="${authUrl}" target="_blank" style="color:#0f766e;font-weight:600;word-break:break-all;text-decoration:underline;">${authUrl} ↗</a>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <button class="setting-btn primary" id="liveLoginModalGoBtn" style="font-weight:600;font-size:13px;padding:10px;display:flex;align-items:center;justify-content:center;gap:6px;">
            <span>🔗 Đăng nhập bằng Google</span>
          </button>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <button class="setting-btn" id="liveLoginModalRetryBtn" style="font-size:12px;padding:8px;">🔄 Tôi đã đăng nhập</button>
            <button class="setting-btn" id="liveLoginModalDismissBtn" style="font-size:12px;padding:8px;">Đóng</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(loginModal);

    loginModal.querySelector('#liveLoginModalClose').onclick = () => { loginModal.style.display = 'none'; };
    loginModal.querySelector('#liveLoginModalDismissBtn').onclick = () => { loginModal.style.display = 'none'; };
    loginModal.onclick = e => { if (e.target === loginModal) loginModal.style.display = 'none'; };
  }

  let desktopToken = null;
  async function getDesktopToken() {
    if (desktopToken) return desktopToken;
    if (window.nbLiveAuth && typeof window.nbLiveAuth.getToken === 'function') {
      try {
        desktopToken = await window.nbLiveAuth.getToken();
      } catch (_) {}
    }
    return desktopToken;
  }

  let csrfToken = null;
  async function getCsrf(force) {
    if (csrfToken && !force) return csrfToken;
    const token = await getDesktopToken();
    try {
      const headers = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;
      const r = await fetch(origin + '/api/session', { credentials: 'include', headers });
      if (r.ok) {
        const data = await r.json();
        if (data.csrf) csrfToken = data.csrf;
      }
    } catch (_) {}
    return csrfToken || (token ? 'desktop' : '');
  }

  async function hostFetch(path, body) {
    const csrf = await getCsrf();
    const token = await getDesktopToken();
    const headers = {
      'Content-Type': 'application/json',
      'X-NB-CSRF': csrf
    };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(origin + path, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(body || {})
    });
  }

  function showLoginNotice(reason) {
    const notice = sec.querySelector('#liveLoginNotice');
    const msg = sec.querySelector('#liveLoginMessage');
    const panelLink = sec.querySelector('#liveLoginPanelLink');
    if (panelLink) {
      panelLink.href = authUrl;
      panelLink.textContent = authUrl;
    }
    if (notice && msg) {
      notice.style.display = 'block';
      msg.textContent = (reason && reason !== 'Failed to fetch')
        ? reason
        : 'Cần đăng nhập tài khoản Google tại app.noteboardink.com để sử dụng Live Quiz (chạy trên web hoặc app đều được).';
    }

    if (loginModal) {
      const modalLink = loginModal.querySelector('#liveLoginModalLink');
      if (modalLink) {
        modalLink.href = authUrl;
        modalLink.textContent = authUrl;
      }
      const modalDetail = loginModal.querySelector('#liveLoginModalDetail');
      if (modalDetail) {
        modalDetail.innerHTML = `Thầy cô hãy đăng nhập tài khoản Google để sử dụng tính năng <b>Live Quiz</b>.<br><small style="color:#64748b;font-size:12px;">(Hỗ trợ chạy trực tiếp trên cả trình duyệt Web và ứng dụng NoteBoard Windows)</small>`;
        if (reason && reason !== 'Failed to fetch') {   /* luon cho thay ly do may chu tra ve */
          const why = document.createElement('div');
          why.style.cssText = 'margin-top:8px;padding:6px 10px;border-radius:8px;background:#fef2f2;color:#991b1b;font-size:12px;';
          why.textContent = 'Máy chủ báo: ' + reason;
          modalDetail.append(why);
        }
      }
      loginModal.style.display = 'flex';
    }
  }

  function hideLoginNotice() {
    const notice = sec.querySelector('#liveLoginNotice');
    if (notice) notice.style.display = 'none';
    if (loginModal) loginModal.style.display = 'none';
    errBox.style.display = 'none';
  }

  /* Loi khong phai do chua dang nhap (het han, mat mang, may chu loi): bao dung ly do, khong hien hop dang nhap */
  const errBox = document.createElement('div');
  errBox.id = 'liveErrorNotice';
  errBox.setAttribute('role', 'alert');
  errBox.style.cssText = 'display:none;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px;margin:10px 0;font-size:12.5px;color:#9a3412;line-height:1.5;';
  sec.querySelector('#liveLoginNotice')?.before(errBox);
  function showLiveError(e) {
    const offline = !e.status;
    errBox.textContent = '';
    const b = document.createElement('b'); b.textContent = offline ? 'Không kết nối được máy chủ Live' : 'Chưa mở được phiên Live';
    const p = document.createElement('div'); p.style.marginTop = '4px';
    p.textContent = offline ? 'Kiểm tra kết nối mạng tới app.noteboardink.com rồi bấm Bắt đầu lại.'
      : e.status === 403 ? e.message + ' Kiểm tra hạn sử dụng của tài khoản Google này (dùng thử 7 ngày hoặc bản quyền).'
      : e.message;
    errBox.append(b, p); errBox.style.display = 'block';
  }
  /* Web: dang nhap o tab khac xong, quay lai tab bang thi tu thu lai */
  let awaitingLogin = false;
  window.addEventListener('focus', () => {
    if (!awaitingLogin || currentRoom) return;
    awaitingLogin = false; desktopToken = null; csrfToken = null;
    sec.querySelector('#liveStartBtn')?.click();
  });

  async function triggerLogin() {
    if (window.nbLiveAuth && typeof window.nbLiveAuth.login === 'function') {
      try {
        const res = await window.nbLiveAuth.login();
        if (res && res.ok) {
          desktopToken = null;
          csrfToken = null;
          if (typeof window.toast === 'function') window.toast('Đã đăng nhập Google thành công!');
          hideLoginNotice();
          sec.querySelector('#liveStartBtn').click();
          return;
        }
        if (res && !res.canceled) { hideLoginNotice(); showLiveError({ status: 400, message: res.reason || 'Đăng nhập Google chưa thành công.' }); }
      } catch (e) { hideLoginNotice(); showLiveError({ status: 500, message: e.message }); }
      return;                         /* ban Windows: dang nhap qua app, khong mo trang web rieng */
    }
    awaitingLogin = true;
    window.open(authUrl, '_blank', 'noopener,noreferrer');
  }

  loginModal?.querySelector('#liveLoginModalGoBtn')?.addEventListener('click', triggerLogin);
  sec.querySelector('#liveLoginActionBtn')?.addEventListener('click', triggerLogin);

  loginModal?.querySelector('#liveLoginModalRetryBtn')?.addEventListener('click', () => {
    desktopToken = null;
    csrfToken = null;
    hideLoginNotice();
    sec.querySelector('#liveStartBtn').click();
  });
  sec.querySelector('#liveLoginRetryBtn')?.addEventListener('click', () => {
    desktopToken = null;
    csrfToken = null;
    hideLoginNotice();
    sec.querySelector('#liveStartBtn').click();
  });

  const openBank = () => {
    if (typeof window.nbDesktop?.openExternal === 'function') {
      window.nbDesktop.openExternal(origin + '/teacher/live');
    } else {
      window.open(origin + '/teacher/live', '_blank', 'noopener,noreferrer');
    }
  };

  const openSampleWord = (e) => {
    if (typeof window.nbDesktop?.openExternal === 'function') {
      e?.preventDefault?.();
      window.nbDesktop.openExternal(origin + '/mau-phien-truc-tiep.docx');
    }
  };

  sec.querySelector('#liveBankBtn')?.addEventListener('click', openBank);
  sec.querySelector('#liveSampleWordLink')?.addEventListener('click', openSampleWord);

  // Khởi động hoặc lấy lại phiên trực tiếp đang mở (dùng chung cho Live Quiz và Chia sẻ bảng QR)
  async function ensureRoom() {
    if (currentRoom) return currentRoom;
    const btn = sec.querySelector('#liveStartBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Đang khởi tạo…'; }
    hideLoginNotice();
    try {
      /* Con phien chua ket thuc (tao truoc khi tai lai bang, hoac tu trang Ngan hang de): tiep tuc phien do,
         khong tao them (may chu gioi han 3 phien mo/giao vien). Muon phien moi: Ket thuc roi Bat dau lai. */
      const token = await getDesktopToken();
      const lr = await fetch(origin + '/api/live/host', { credentials: 'include', cache: 'no-store', headers: token ? { Authorization: 'Bearer ' + token } : {} });
      if (lr.status === 401 || lr.status === 403) {
        const err = await lr.json().catch(() => ({}));
        const ex = new Error(err.error || ('Máy chủ báo lỗi ' + lr.status + '.')); ex.status = lr.status; throw ex;
      }
      if (lr.ok) {
        const { rooms = [] } = await lr.json().catch(() => ({}));
        const opens = rooms.filter(x => x.status !== 'ended' && x.expires > Date.now());
        /* uu tien phien co de Word da tai len (tao o trang Ngan hang de) */
        let open = opens[0];
        for (const x of opens.slice(0, 3)) { const qs = await fetchBank(x.id).catch(() => []); if (qs.length) { open = x; break; } }
        if (open) {
          currentRoom = open;
          onRoomStarted(open);
          if (typeof window.toast === 'function') window.toast('Tiếp tục phiên đang mở · mã ' + open.code + ' — bấm Kết thúc nếu muốn tạo phiên mới');
          return currentRoom;
        }
      }
      const docTitle = document.getElementById('documentTitle')?.value || 'Bài giảng';
      const r = await hostFetch('/api/live/host', {
        title: docTitle,
        questions: [{ id: '1', type: 'mcq', html: '<p>Hỏi nhanh về bài giảng</p>', options: ['A','B','C','D'], correct: [] }]
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        const ex = new Error(err.error || ('Máy chủ báo lỗi ' + r.status + '.'));
        ex.status = r.status;
        throw ex;
      }
      currentRoom = await r.json();
      onRoomStarted(currentRoom);
      return currentRoom;
    } catch (e) {
      if (e.status === 401) showLoginNotice(e.message);   /* chi 401 moi la chua dang nhap */
      else showLiveError(e);
      return null;
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '▶ Bắt đầu Live Quiz'; }
    }
  }
  sec.querySelector('#liveStartBtn').onclick = () => ensureRoom();

  function onRoomStarted(room) {
    document.getElementById('liveOffState').style.display = 'none';
    document.getElementById('liveOnState').style.display = 'block';
    document.getElementById('liveCodeText').textContent = room.code;
    document.getElementById('liveQRModalCode').textContent = room.code;
    document.getElementById('liveDot').style.display = 'block';

    // Tải ảnh QR vào modal
    const qrWrap = document.getElementById('liveQRImageWrap');
    qrWrap.innerHTML = `<img src="${origin}/api/live/qr/${room.code}" alt="Mã QR lớp học" style="width:100%;height:100%;object-fit:contain;">`;

    // Kết nối SSE nhận dữ liệu thời gian thực
    connectSSE(room.id);
    loadBank(room);

    // Tự động bật chia sẻ bảng & học liệu (3D, Thí nghiệm, Học liệu) ngay khi mở phiên
    qrShareActive = true;
    setTimeout(() => {
      if (currentRoom && currentRoom.id === room.id) {
        shareBoardToStudents({ showQR: false, toast: false });
      }
    }, 150);
  }

  async function connectSSE(roomId) {
    if (eventSource) eventSource.close();
    const token = await getDesktopToken();
    const url = origin + `/api/live/host/${roomId}/events`, headers = token ? { Authorization: 'Bearer ' + token } : {};
    const badge = (text, color) => { const b = document.getElementById('liveConnBadge'); b.textContent = text; b.style.color = color; };
    const onData = e => { try { handleLiveState(JSON.parse(e.data)); } catch (_) {} };
    /* Đọc luồng SSE bằng fetch (web: cookie; app Windows: token qua header, không đặt vào URL).
       Máy chủ gửi nhịp mỗi 4 giây; quá 6,5 giây không thấy nhịp (bị diệt virus/proxy giữ lại) thì hỏi máy chủ mỗi 1,5 giây. */
    const ctrl = new AbortController();
    let lastChunk = Date.now(), polling = false;
    const poller = setInterval(async () => {
      if (ctrl.signal.aborted) { clearInterval(poller); return; }
      if (polling || Date.now() - lastChunk < 6500) return;
      polling = true;
      try {
        const r = await fetch(origin + `/api/live/host/${roomId}?lite=1`, { credentials: 'include', cache: 'no-store', headers, signal: ctrl.signal });
        if (r.ok) { handleLiveState(await r.json()); badge('● Đang trực tiếp (dự phòng)', '#16a34a'); }
      } catch (_) {} finally { polling = false; }
    }, 1500);
    eventSource = { close: () => { ctrl.abort(); clearInterval(poller); } };
    (async () => {
      while (!ctrl.signal.aborted) {
        try {
          const r = await fetch(url, { credentials: 'include', headers: { ...headers, Accept: 'text/event-stream' }, cache: 'no-store', signal: ctrl.signal });
          if (!r.ok || !r.body) throw Error('HTTP ' + r.status);
          badge('● Đang trực tiếp', '#16a34a');
          const reader = r.body.getReader(), dec = new TextDecoder();
          let buf = '';
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            lastChunk = Date.now();
            buf = (buf + dec.decode(value, { stream: true })).replace(/\r\n?/g, '\n');
            let i;
            while ((i = buf.indexOf('\n\n')) >= 0) {
              const data = buf.slice(0, i).split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).replace(/^ /, '')).join('\n');
              buf = buf.slice(i + 2);
              if (data) onData({ data });
            }
          }
        } catch (_) {
          if (ctrl.signal.aborted) return;
        }
        badge('● Đang kết nối lại…', '#f59e0b');
        await new Promise(res => setTimeout(res, 3000));
      }
    })();
  }

  function handleLiveState(data) {
    if (data.participants !== undefined) {
      document.getElementById('liveStudentsText').textContent = data.participants + ' học sinh';
    }
    if (data.responses) {
      currentAnswers = data.responses;
      renderChart();
    }
    if (data.doubts) {
      currentDoubts = data.doubts;
      renderDoubts();
    }
    if (data.locked) {
      document.getElementById('liveLockBtn').style.display = 'none';
      clearInterval(timerInterval);
    }
    liveStageUpdate(data);
  }

  /* ---------- Nguồn câu hỏi: đề đã lưu trên web hoặc kéo thả Word/JSON ngay lúc dạy ----------
     App chỉ là màn điều khiển; phiên chạy trên máy chủ. Câu của đề khác/đề vừa kéo vào được phát vào
     chính phiên đang chạy (mã lớp không đổi). Bảng NoteBoard đang chiếu cho cả lớp nên ở đây
     không hiện đáp án: chỉ hiện khi thầy cô bấm "Hiện đáp án". */
  function getQuestionType(q) {
    if (!q) return 'mcq';
    if (q.type === 'word_cloud') return 'word_cloud';
    if (q.type === 'short_answer') return 'short_answer';
    if (q.type === 'tf' || q.type === 'true_false') return 'tf';
    const opts = q.options || [];
    if (opts.length === 2) {
      const p0 = plainText(opts[0]).toLowerCase();
      const p1 = plainText(opts[1]).toLowerCase();
      if ((p0 === 'đúng' && p1 === 'sai') || (p0 === 'sai' && p1 === 'đúng') ||
          (p0 === 'true' && p1 === 'false') || (p0 === 'false' && p1 === 'true') ||
          (p0 === 'đ' && p1 === 's') || (p0 === 's' && p1 === 'đ')) {
        return 'tf';
      }
    }
    if (!opts.length) {
      if (/từ khóa|word cloud|đám mây/i.test(plainText(q.html))) return 'word_cloud';
      return 'short_answer';
    }
    return 'mcq';
  }

  const TYPE_META = {
    mcq: { label: 'Trắc nghiệm 4 lựa chọn (A-B-C-D)', short: '🔘 Trắc nghiệm ABCD', icon: '🔘', badgeClass: 'mcq', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    tf: { label: 'Đúng / Sai (True / False)', short: '⚖️ Đúng / Sai', icon: '⚖️', badgeClass: 'tf', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
    short_answer: { label: 'Trả lời ngắn (Short Answer)', short: '✍️ Trả lời ngắn', icon: '✍️', badgeClass: 'sa', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    word_cloud: { label: 'Đám mây từ khóa (Word Cloud)', short: '☁️ Word Cloud', icon: '☁️', badgeClass: 'wc', color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' }
  };

  const bankBox = document.createElement('div');
  bankBox.id = 'liveBankBox';
  bankBox.style.cssText = 'border-top:1px solid #e2e8f0;padding-top:12px;margin-bottom:14px;';
  bankBox.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#0f766e;letter-spacing:0.5px;margin-bottom:8px;">ĐỀ CÂU HỎI <span id="liveBankCount" style="font-weight:600;color:#475569;"></span></div>
    <select class="panel-select" id="liveSavedSelect" style="margin-bottom:6px;width:100%;"><option value="">📂 Đề đã lưu trên web…</option></select>
    <div id="liveDropZone" role="button" tabindex="0" style="border:2px dashed #99d5c9;border-radius:10px;padding:10px;text-align:center;font-size:12px;color:#0f766e;background:#f0fdfa;cursor:pointer;margin-bottom:6px;"><span>📄 Kéo thả đề Word (.docx) hoặc JSON vào đây</span><br><small style="color:#64748b;">hoặc bấm để chọn file · giữ hình, công thức, bảng</small></div>
    <input type="file" id="liveWordInput" accept=".docx,.json" hidden>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
      <a id="liveSampleWordLink2" class="setting-btn" href="${origin}/mau-phien-truc-tiep.docx" download="mau-phien-truc-tiep.docx" target="_blank" style="font-size:11.5px;color:#1e40af;border:1px solid #dbeafe;background:#eff6ff;border-radius:8px;padding:6px 8px;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:4px;font-weight:600;">
        <span>📥 Tải file Word mẫu</span>
      </a>
      <button type="button" class="setting-btn" id="liveBankBtn2" style="font-size:11.5px;color:#0f766e;border:1px solid #ccfbf1;background:#f0fdfa;border-radius:8px;padding:6px 8px;">📑 Ngân hàng đề ↗</button>
    </div>
    <div id="liveBankWarn" style="display:none;font-size:11.5px;color:#9a3412;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:6px 8px;margin-bottom:6px;"></div>
    <div id="liveBankList" style="display:none;">
      <!-- Khung tóm tắt số câu & vị trí -->
      <div id="liveBankSummaryBar" style="display:flex;align-items:center;justify-content:space-between;background:#f0fdfa;border:1px solid #ccfbf1;border-radius:10px;padding:8px 12px;margin-bottom:8px;font-size:12.5px;">
        <span id="liveBankTotalBadge" style="font-weight:700;color:#0f766e;">📚 Đề thi: 0 câu</span>
        <span id="liveBankCurrentBadge" style="color:#0d9488;font-weight:700;background:#e6fffa;padding:2px 8px;border-radius:6px;border:1px solid #b2f5ea;">Câu 1 / 1</span>
      </div>
      <!-- Badge phân loại câu hỏi rõ ràng -->
      <div id="liveBankTypeWrap" style="margin-bottom:8px;">
        <span id="liveBankTypeBadge" class="qtype-badge" style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:8px;font-size:12px;font-weight:700;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;">🔘 Trắc nghiệm 4 lựa chọn (A-B-C-D)</span>
      </div>
      <select class="panel-select" id="liveBankSelect" style="margin-bottom:6px;width:100%;"></select>
      <div id="liveBankPreview" style="font-size:12px;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px;max-height:130px;overflow:auto;margin-bottom:8px;"></div>
      <button type="button" class="setting-btn" id="liveBankPreviewStageBtn" style="width:100%;font-size:12px;padding:8px 10px;color:#0f766e;background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;margin-bottom:8px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;"><span>👁️ Trình chiếu đề lên bảng (chưa tính giờ)</span></button>
      <select class="panel-select" id="liveModeSelect" style="margin-bottom:8px;width:100%;" title="Cách chuyển câu (như Quizizz)">
        <option value="manual">👆 Thầy cô bấm "Câu tiếp" để sang câu</option>
        <option value="auto">⏩ Tự chuyển câu khi hết giờ / cả lớp đã trả lời</option>
      </select>
      <button class="setting-btn primary" id="liveBankPublish" style="width:100%;font-size:13.5px;padding:11px 14px;font-weight:700;background:linear-gradient(135deg,#0f766e,#0d9488);color:#fff;border:none;border-radius:9px;box-shadow:0 4px 14px rgba(15,118,110,.3);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">▶ Bắt đầu</button>
    </div>`;
  sec.querySelector('#liveRunBox').before(bankBox);
  bankBox.querySelector('#liveBankBtn2')?.addEventListener('click', openBank);
  bankBox.querySelector('#liveSampleWordLink2')?.addEventListener('click', openSampleWord);
  bankBox.querySelector('#liveBankPreviewStageBtn')?.addEventListener('click', () => {
    stageShow = 'preview';
    showStage();
    liveStageRender(true);
    clockTick();
  });
  let bank = { questions: [], roomId: null, label: '' };   // roomId: đề của chính phiên đang chạy -> phát theo số thứ tự
  let liveCurrentQ = null;                                  // câu đang phát (giữ đáp án trong bộ nhớ, không hiện ra)
  const plainText = html => { const d = document.createElement('div'); d.innerHTML = String(html || ''); return (d.textContent || '').replace(/\s+/g, ' ').trim(); };
  async function authHeaders() { const t = await getDesktopToken(); return t ? { Authorization: 'Bearer ' + t } : { 'X-NB-CSRF': await getCsrf() }; }
  async function hostGet(path) { const t = await getDesktopToken(); return fetch(origin + path, { credentials: 'include', cache: 'no-store', headers: t ? { Authorization: 'Bearer ' + t } : {} }); }
  async function fetchBank(roomId) {
    const r = await hostGet('/api/live/host/' + roomId);
    if (!r.ok) return [];
    const qs = (await r.json()).questions || [];
    /* phiên tạo từ bảng chỉ có 1 câu giữ chỗ "Hỏi nhanh về bài giảng": không phải đề thật */
    return qs.length === 1 && /^Hỏi nhanh về bài giảng$/.test(plainText(qs[0].html)) ? [] : qs;
  }
  function setBank(questions, roomId, label, warnings) {
    bank = { questions: questions || [], roomId, label: label || '' };
    const total = bank.questions.length;
    sec.querySelector('#liveBankCount').textContent = total ? '· ' + bank.label + ' · ' + total + ' câu' : '';
    const warn = sec.querySelector('#liveBankWarn'), w = (warnings || []).filter(x => !/đáp án/i.test(x));   // cảnh báo về đáp án không hiện trên màn chiếu
    warn.style.display = w.length ? 'block' : 'none'; warn.textContent = w.slice(0, 3).join(' · ');
    sec.querySelector('#liveBankList').style.display = total ? 'block' : 'none';
    const sel = sec.querySelector('#liveBankSelect');
    sel.replaceChildren(...bank.questions.map((q, i) => { const o = document.createElement('option'); o.value = i; o.textContent = 'Câu ' + (i + 1) + ': ' + plainText(q.html).slice(0, 70); return o; }));
    if (total > 0) {
      sel.value = '0';
      showBankPreview();
      // Tự động mở cửa sổ chiếu ở chế độ PREVIEW để học sinh và thầy cô đọc đề trước
      // CHƯA TÍNH THỜI GIAN CÂU 1 (chỉ tính khi thầy cô bấm "▶ Bắt đầu làm bài")
      stageShow = 'preview';
      showStage();
      liveStageRender(true);
      clockTick();
    }
  }
  function showBankPreview() {
    const idx = +sec.querySelector('#liveBankSelect').value || 0;
    const q = bank.questions[idx];
    const total = bank.questions.length;
    const pv = sec.querySelector('#liveBankPreview');
    pv.textContent = q ? plainText(q.html) : '';
    // Cập nhật số câu & vị trí
    const tBadge = sec.querySelector('#liveBankTotalBadge');
    if (tBadge) tBadge.textContent = '📚 Đề thi: ' + total + ' câu';
    const cBadge = sec.querySelector('#liveBankCurrentBadge');
    if (cBadge) cBadge.textContent = 'Câu ' + (idx + 1) + ' / ' + total;
    // Cập nhật loại câu hỏi
    const qType = getQuestionType(q);
    const meta = TYPE_META[qType] || TYPE_META.mcq;
    const typeBadge = sec.querySelector('#liveBankTypeBadge');
    if (typeBadge) {
      typeBadge.textContent = meta.icon + ' ' + meta.label;
      typeBadge.style.color = meta.color;
      typeBadge.style.background = meta.bg;
      typeBadge.style.borderColor = meta.border;
    }
    // Cập nhật nút bắt đầu
    const pubBtn = sec.querySelector('#liveBankPublish');
    if (pubBtn) {
      pubBtn.textContent = '▶ Bắt đầu';
      pubBtn.title = `Bắt đầu làm bài (Câu ${idx + 1})`;
    }
    if (!q) return;
    if (qType === 'mcq') {
      (q.options || []).forEach((o, i) => { const d = document.createElement('div'); d.textContent = String.fromCharCode(65 + i) + '. ' + plainText(o); pv.append(d); });
    } else if (qType === 'tf') {
      const d1 = document.createElement('div'); d1.textContent = 'A. Đúng (True)';
      const d2 = document.createElement('div'); d2.textContent = 'B. Sai (False)';
      pv.append(d1, d2);
    } else if (qType === 'word_cloud') {
      const d = document.createElement('div'); d.style.color = '#0f766e'; d.style.fontStyle = 'italic';
      d.textContent = '☁️ Học sinh nhập từ khóa trên điện thoại, hiển thị dạng đám mây từ khóa trực quan.';
      pv.append(d);
    } else {
      const d = document.createElement('div'); d.style.color = '#d97706'; d.style.fontStyle = 'italic';
      d.textContent = '✍️ Học sinh gõ câu trả lời ngắn trên điện thoại, hiển thị dạng lưới thẻ phản hồi (Response Wall).';
      pv.append(d);
    }
    const t = document.createElement('template'); t.innerHTML = [q.html, ...(q.options || [])].join('');
    const tags = [t.content.querySelector('img,svg') && '🖼 có hình', t.content.querySelector('table') && '▦ có bảng', /\$|\\\(|\\\[/.test(t.content.textContent) && '∑ có công thức'].filter(Boolean);
    if (tags.length) { const s = document.createElement('div'); s.style.cssText = 'margin-top:4px;color:#0f766e;font-size:11px;'; s.textContent = tags.join(' · '); pv.append(s); }
    // Nếu stage đang mở ở chế độ xem trước, đồng bộ câu hỏi lên stage
    if (!stage.hidden && (stageShow !== 'live' || !liveCurrentQ)) {
      liveStageRender(true);
      clockTick();
    }
  }
  async function loadSaved() {
    const sel = sec.querySelector('#liveSavedSelect');
    try {
      const r = await hostGet('/api/live/host');
      if (!r.ok) return;
      const { rooms = [] } = await r.json();
      sel.replaceChildren(sel.options[0], ...rooms.slice(0, 30).map(x => { const o = document.createElement('option'); o.value = x.id; o.textContent = (x.title || 'Phiên trực tiếp') + ' · ' + new Date(x.created).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + (x.id === currentRoom?.id ? ' · phiên này' : ''); return o; }));
    } catch (_) {}
  }
  async function loadBank(room) {
    const qs = await fetchBank(room.id).catch(() => []);
    setBank(qs, qs.length ? room.id : null, qs.length ? 'đề của phiên này' : '');
    loadSaved();
  }
  sec.querySelector('#liveSavedSelect').onchange = async e => {
    const id = e.target.value; if (!id) return;
    const qs = await fetchBank(id).catch(() => []);
    if (!qs.length) { setBank([], null, '', ['Phiên này chưa có đề câu hỏi.']); return; }
    setBank(qs, id === currentRoom?.id ? id : null, e.target.selectedOptions[0].textContent.split(' · ')[0]);
  };
  async function importFile(file) {
    const zone = sec.querySelector('#liveDropZone'), label = zone.querySelector('span');
    if (!window.NBLiveImport) { setBank(bank.questions, bank.roomId, bank.label, ['Chưa tải được bộ đọc đề.']); return; }
    zone.style.opacity = '.6'; label.textContent = '⏳ Đang đọc ' + file.name + '…';
    try {
      NBLiveImport.configure({ origin, headers: authHeaders });
      const data = await NBLiveImport.read(file);
      if (!data.questions.length) throw Error('Không tìm thấy câu hỏi. Mỗi câu bắt đầu bằng "Câu 1." hoặc "Bài 1.".');
      setBank(data.questions, null, file.name.replace(/\.[^.]+$/, ''), data.warnings);
      if (typeof window.toast === 'function') window.toast('Đã nhận ' + data.questions.length + ' câu từ ' + file.name);
    } catch (e) {
      setBank(bank.questions, bank.roomId, bank.label, [e.message]);
    } finally {
      zone.style.opacity = ''; label.textContent = '📄 Kéo thả đề Word (.docx) hoặc JSON vào đây';
    }
  }
  {
    const zone = sec.querySelector('#liveDropZone'), input = sec.querySelector('#liveWordInput');
    zone.onclick = () => input.click();
    zone.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } };
    input.onchange = () => { const f = input.files[0]; input.value = ''; if (f) importFile(f); };
    /* chặn để file không bị mở thành bài giảng trên bảng */
    zone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); zone.style.background = '#ccfbf1'; });
    zone.addEventListener('dragleave', () => { zone.style.background = '#f0fdfa'; });
    zone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); zone.style.background = '#f0fdfa'; const f = e.dataTransfer.files[0]; if (f) importFile(f); });
  }
  sec.querySelector('#liveBankSelect').onchange = showBankPreview;
  /* Hiện đáp án: chỉ khi thầy cô chủ động bấm (bảng đang chiếu cho cả lớp) */
  const revealBtn = document.createElement('button');
  revealBtn.className = 'setting-btn'; revealBtn.id = 'liveRevealBtn'; revealBtn.type = 'button';
  revealBtn.style.cssText = 'display:none;font-size:11px;padding:5px 8px;flex:1;';
  revealBtn.textContent = '👁 Hiện đáp án';
  sec.querySelector('#livePasteDraftBtn')?.before(revealBtn);
  revealBtn.onclick = () => {
    const c = (liveCurrentQ?.correct || []).find(Number.isInteger);
    if (c === undefined) return;
    correctOption = c; renderChart();
    sfx.reveal(); liveStageRender();
  };
  sec.querySelector('#liveBankPublish').onclick = () => publishIndex(+sec.querySelector('#liveBankSelect').value);
  {
    const mode = sec.querySelector('#liveModeSelect');
    try { mode.value = localStorage.getItem('nbLiveMode') === 'auto' ? 'auto' : 'manual'; } catch (_) {}
    mode.onchange = () => { try { localStorage.setItem('nbLiveMode', mode.value); } catch (_) {} };
  }
  const autoMode = () => sec.querySelector('#liveModeSelect')?.value === 'auto';
  /* Phát câu thứ index của đề (nút trong bảng và cửa sổ Live trên bảng dùng chung) */
  async function publishIndex(index) {
    if (!currentRoom) {
      const room = await ensureRoom();
      if (!room) return;
    }
    const btn = sec.querySelector('#liveBankPublish'), sel = sec.querySelector('#liveBankSelect'), q = bank.questions[index];
    if (!q) return;
    sel.value = String(index);
    btn.disabled = true;
    try {
      let seconds = Number(document.getElementById('liveTimerSelect').value || 0);
      if (autoMode() && !seconds) seconds = 30;           /* tự chuyển câu cần có thời gian */
      clearTimeout(autoTimer);
      const qType = getQuestionType(q);
      const isWordCloud = qType === 'word_cloud';
      const isShortAnswer = qType === 'short_answer';
      const body = bank.roomId === currentRoom.id ? { index, seconds }
        : { seconds, quick: { type: isWordCloud ? 'word_cloud' : isShortAnswer ? 'short_answer' : 'mcq', html: q.html, options: q.options || [], correct: q.correct || [], multi: !!q.multi } };
      /* câu có hình lớn: thu gọn để vừa giới hạn gói dữ liệu của máy chủ (Nginx 32 KB) */
      if (body.quick && JSON.stringify(body).length > 30000 && window.NBLiveImport?.fit) {
        const small = await NBLiveImport.fit(body.quick, 29000);
        body.quick.html = small.html; body.quick.options = small.options;
      }
      const r = await hostFetch(`/api/live/host/${currentRoom.id}/publish`, body);
      if (!r.ok) { const err = await r.json().catch(() => ({})); throw new Error(err.error || (r.status === 413 ? 'Câu hỏi có hình quá lớn so với giới hạn máy chủ.' : 'Không phát được câu hỏi')); }
      liveCurrentQ = q;
      chartOptions = (q.options || []).map((_, i) => String.fromCharCode(65 + i));
      correctOption = null; currentAnswers = [];
      document.getElementById('liveResultBox').style.display = 'block';
      sec.querySelector('#liveLockBtn').style.display = 'block';
      revealBtn.style.display = chartOptions.length && (q.correct || []).some(Number.isInteger) ? 'block' : 'none';
      renderChart();
      clearInterval(timerInterval);
      if (seconds > 0) {                  /* hết giờ: tự khóa câu */
        remainingSeconds = seconds;
        timerInterval = setInterval(() => { if (--remainingSeconds <= 0) { clearInterval(timerInterval); sec.querySelector('#liveLockBtn').click(); } }, 1000);
      }
      if (index + 1 < bank.questions.length) { sel.value = String(index + 1); showBankPreview(); }   /* sẵn sàng câu tiếp theo */
      liveStageOnPublish(q, index, seconds);
      if (typeof window.toast === 'function') window.toast('Đã phát câu ' + (index + 1) + ' cho cả lớp');
    } catch (e) {
      /* fetch bị chặn (vd Nginx từ chối gói lớn nên trả về không kèm CORS) chỉ báo "Failed to fetch" */
      alert(e instanceof TypeError ? 'Không gửi được câu ' + (index + 1) + ' lên máy chủ. Câu có hình/công thức lớn hơn giới hạn của máy chủ (cần mở rộng Nginx cho /api/live/ lên 8 MB), hoặc mạng đang gián đoạn.' : e.message);
    } finally {
      btn.disabled = false;
    }
  }

  // Khóa bài
  sec.querySelector('#liveLockBtn').onclick = async () => {
    if (!currentRoom) return;
    clearInterval(timerInterval);
    try {
      await hostFetch(`/api/live/host/${currentRoom.id}/lock`, {});
      sec.querySelector('#liveLockBtn').style.display = 'none';
      stageState.locked = true; sfx.stopMusic(); liveStageRender(); autoAdvance();
    } catch (_) {}
  };

  // Hiện modal QR (đồng thời cập nhật bảng & học liệu 3D/Thí nghiệm/PhET mới nhất sang ĐT học sinh)
  sec.querySelector('#liveShowQRBtn').onclick = () => {
    modal.style.display = 'flex';
    if (currentRoom) shareBoardToStudents({ showQR: true, toast: false });
  };

  // Dừng phiên
  sec.querySelector('#liveEndBtn').onclick = async () => {
    if (!currentRoom || !confirm('Thầy cô có chắc muốn kết thúc phiên Live Quiz này?')) return;
    try {
      await hostFetch(`/api/live/host/${currentRoom.id}/end`, {});
    } catch (_) {}
    if (eventSource) eventSource.close();
    const endedRoom = currentRoom;
    currentRoom = null;
    qrShareActive = false;
    updateShareSummaryUI(null);
    window.NBProjector?.onQrShareUpdate?.(null);
    sfx.stopMusic();
    summaryPurged = false; summaryData = null;
    liveStageSummary(endedRoom, true);    /* thống kê cả phiên hiện ngay trên bảng; tải về máy rồi xóa kết quả trên máy chủ */
    document.getElementById('liveOffState').style.display = 'block';
    document.getElementById('liveOnState').style.display = 'none';
    document.getElementById('liveDot').style.display = 'none';
    document.getElementById('liveBadge').style.display = 'none';
  };

  // Vẽ biểu đồ kết quả trên panel bên phải
  function renderChart() {
    const box = document.getElementById('liveBars');
    if (!box) return;
    box.innerHTML = '';
    const qType = getQuestionType(liveCurrentQ);
    const total = currentAnswers.length;
    document.getElementById('liveProgressCount').textContent = total + ' học sinh đã nộp';

    if (qType === 'word_cloud' || qType === 'short_answer') {
      // Thống kê câu trả lời ngắn / từ khóa
      const freq = new Map();
      currentAnswers.forEach(a => {
        const t = String(a.answer || '').trim();
        if (!t) return;
        const k = t.toLowerCase();
        if (!freq.has(k)) freq.set(k, { display: t, count: 0 });
        freq.get(k).count++;
      });
      const sorted = [...freq.values()].sort((a, b) => b.count - a.count).slice(0, 8);
      if (!sorted.length) {
        box.innerHTML = '<div style="font-size:12px;color:#94a3b8;text-align:center;padding:8px 0;">Chưa có câu trả lời nào được gửi về.</div>';
        return;
      }
      sorted.forEach(item => {
        const pct = total ? Math.round(item.count * 100 / total) : 0;
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11.5px;';
        row.innerHTML = `
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;color:#334155;">${item.display}</span>
          <div style="flex:1.5;background:#e2e8f0;height:12px;border-radius:4px;overflow:hidden;">
            <div style="width:${pct}%;background:${qType === 'word_cloud' ? '#0f766e' : '#d97706'};height:100%;"></div>
          </div>
          <span style="min-width:44px;text-align:right;color:#64748b;">${pct}% (${item.count})</span>
        `;
        box.appendChild(row);
      });
      return;
    }

    let options = ['A','B','C','D'];
    if (qType === 'tf') options = ['Đúng','Sai'];
    else if (chartOptions) options = chartOptions;
    else if (selectedType === 'mcq3') options = ['A','B','C'];
    else if (selectedType === 'tf') options = ['Đúng','Sai'];
    else if (selectedType === 'poll') options = ['Đã hiểu rõ','Còn phân vân','Chưa hiểu'];

    const counts = options.map(() => 0);
    currentAnswers.forEach(ans => {
      if (Array.isArray(ans.answer)) {
        ans.answer.forEach(idx => { if (counts[idx] !== undefined) counts[idx]++; });
      } else if (qType === 'tf') {
        const val = ans.answer;
        if (val === 0 || val === '0' || /^đúng$|^true$/i.test(String(val).trim())) counts[0]++;
        else if (val === 1 || val === '1' || /^sai$|^false$/i.test(String(val).trim())) counts[1]++;
      }
    });

    options.forEach((opt, idx) => {
      const c = counts[idx] || 0;
      const pct = total > 0 ? Math.round((c / total) * 100) : 0;
      const isCorrect = correctOption === idx;

      const barRow = document.createElement('div');
      barRow.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;';
      barRow.title = 'Bấm để chọn làm đáp án đúng';
      barRow.innerHTML = `
        <span style="min-width:24px;font-size:12px;font-weight:700;color:${isCorrect ? '#16a34a' : '#475569'};">${opt}</span>
        <div style="flex:1;background:#e2e8f0;height:16px;border-radius:4px;overflow:hidden;position:relative;">
          <div style="width:${pct}%;background:${isCorrect ? '#22c55e' : (qType === 'tf' ? (idx === 0 ? '#10b981' : '#ef4444') : '#0ea5e9')};height:100%;transition:width 0.3s;"></div>
        </div>
        <span style="min-width:44px;font-size:11.5px;text-align:right;color:#64748b;font-variant-numeric:tabular-nums;">${pct}% (${c})</span>
      `;

      barRow.onclick = async () => {
        correctOption = isCorrect ? null : idx;
        renderChart();
        liveStageRender();
        if (currentRoom) {
          hostFetch(`/api/live/host/${currentRoom.id}/grade`, { correct: correctOption !== null ? [correctOption] : [] }).catch(() => {});
        }
      };

      box.appendChild(barRow);
    });
  }

  // Danh sách thắc mắc của học sinh
  function renderDoubts() {
    const list = document.getElementById('liveDoubtsList');
    if (!list) return;                // đã bỏ ô "Em chưa hiểu" — chỉ phát câu trong đề
    const badge = document.getElementById('liveDoubtsCountBadge');
    const railBadge = document.getElementById('liveBadge');

    const unanswered = currentDoubts.filter(d => !d.answered);
    badge.textContent = unanswered.length + ' câu';
    
    if (unanswered.length > 0) {
      railBadge.textContent = unanswered.length;
      railBadge.style.display = 'block';
    } else {
      railBadge.style.display = 'none';
    }

    if (!currentDoubts.length) {
      list.innerHTML = '<div style="font-size:12px;color:#94a3b8;text-align:center;padding:12px 0;">Chưa có câu hỏi nào. Học sinh bấm "Em chưa hiểu" trên điện thoại sẽ hiện ở đây.</div>';
      return;
    }

    list.innerHTML = '';
    currentDoubts.forEach(d => {
      const card = document.createElement('div');
      card.style.cssText = `background:#fff;border:1px solid ${d.answered ? '#e2e8f0' : '#fca5a5'};border-radius:8px;padding:8px 10px;font-size:12px;opacity:${d.answered ? '0.6' : '1'};`;
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <b style="color:#0f766e;">${d.name || 'Học sinh'}</b>
          <span style="color:#94a3b8;font-size:10.5px;">${new Date(d.at).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</span>
        </div>
        <div style="color:#1e293b;line-height:1.45;margin-bottom:6px;">${d.text}</div>
        <div style="display:flex;gap:4px;justify-content:flex-end;">
          <button class="setting-btn" data-act="pin" style="font-size:10.5px;padding:3px 7px;">📌 Ghim vào nháp</button>
          <button class="setting-btn" data-act="done" style="font-size:10.5px;padding:3px 7px;">${d.answered ? '✓ Đã xong' : 'Đã giải đáp'}</button>
        </div>
      `;

      // Ghim thắc mắc vào Bảng nháp
      card.querySelector('[data-act="pin"]').onclick = () => {
        pinDoubtToScratch(d.name, d.text);
      };

      // Đánh dấu đã giải đáp
      card.querySelector('[data-act="done"]').onclick = async () => {
        d.answered = 1;
        renderDoubts();
        if (currentRoom) {
          hostFetch(`/api/live/host/${currentRoom.id}/doubt_answer`, { doubtId: d.id }).catch(() => {});
        }
      };

      list.appendChild(card);
    });
  }

  // Ghim kết quả Quiz vào Bảng nháp
  sec.querySelector('#livePasteDraftBtn').onclick = () => {
    let options = ['A','B','C','D'];
    if (chartOptions) options = chartOptions;
    else if (selectedType === 'mcq3') options = ['A','B','C'];
    else if (selectedType === 'tf') options = ['Đúng','Sai'];
    else if (selectedType === 'poll') options = ['Đã hiểu rõ','Còn phân vân','Chưa hiểu'];

    const counts = options.map(() => 0);
    const total = currentAnswers.length;
    currentAnswers.forEach(ans => {
      if (Array.isArray(ans.answer)) {
        ans.answer.forEach(idx => { if (counts[idx] !== undefined) counts[idx]++; });
      }
    });

    const lines = options.map((opt, i) => {
      const c = counts[i] || 0;
      const pct = total > 0 ? Math.round((c / total) * 100) : 0;
      return `${opt}: ${pct}% (${c})${correctOption === i ? ' ★ ĐÚNG' : ''}`;
    }).join(' | ');

    pinTextToScratch(`📊 [KẾT QUẢ LIVE QUIZ]\n${lines} (Tổng: ${total} bạn)`);
  };

  function pinDoubtToScratch(name, text) {
    pinTextToScratch(`❓ [HỎI LẠI - ${name}]:\n"${text}"`);
  }

  function pinTextToScratch(content) {
    const hasDoc = (document.querySelectorAll('#board .blk').length > 0) || (typeof window.pdfPages !== 'undefined' && window.pdfPages > 0);
    let targetX = 120;
    if (hasDoc) {
      if (typeof window.setScratch === 'function' && (window.splitK === undefined || window.splitK >= 1)) {
        window.setScratch(0.62); // Tự động bật Bảng nháp bên phải khi có bài tập
      }
      targetX = 1640;
    }
    const curScroll = typeof window.boardScrollY !== 'undefined' ? window.boardScrollY : (window.nbBoard?.scrollY || 0);
    const y = curScroll + 60;
    if (typeof window.newText === 'function') {
      window.newText(targetX, y);
      setTimeout(() => {
        const active = document.querySelector('.txt:focus, .blk.typed:focus') || document.querySelectorAll('#board .txt:not(.pic)')[document.querySelectorAll('#board .txt:not(.pic)').length - 1];
        if (active) {
          active.textContent = content;
          if (typeof window.commitEdit === 'function') window.commitEdit();
          if (typeof window.toast === 'function') window.toast(hasDoc ? 'Đã dán vào Bảng nháp bên phải!' : 'Đã dán lên bảng!');
        }
      }, 50);
    }
  }


  /* ================= Cửa sổ Live trên bảng (như màn chiếu web): câu đang phát, kết quả chọn trực tiếp,
     chuyển câu, tổng kết cuối phiên, xuất kết quả; âm thanh kiểu Quizizz (tự tạo bằng Web Audio, không cần file) ================= */
  const sfx = (() => {
    let ac = null, music = null;
    const mode = () => { try { return localStorage.getItem('nbLiveSound') || 'all'; } catch (_) { return 'all'; } };
    const ctx = () => {
      if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ac = new A(); }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    };
    function tone(freq, at, dur, { type = 'sine', gain = .16, slide = 0 } = {}) {
      const c = ctx(); if (!c) return;
      const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + .015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .05);
    }
    const play = f => { if (mode() !== 'off') try { f(); } catch (_) {} };
    function stopMusic() { if (music) { clearInterval(music); music = null; } }
    return {
      mode, stopMusic,
      cycle() { const m = { all: 'sfx', sfx: 'off', off: 'all' }[mode()]; try { localStorage.setItem('nbLiveSound', m); } catch (_) {} if (m !== 'all') stopMusic(); return m; },
      publish: () => play(() => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .07, .22, { type: 'triangle', gain: .14 })); tone(1568, .3, .35, { gain: .06 }); }),
      answer: () => play(() => tone(880, 0, .09, { type: 'triangle', gain: .09, slide: 1.5 })),
      tick: last => play(() => tone(last ? 1250 : 950, 0, .07, { type: 'square', gain: .05 })),
      timeUp: () => play(() => { tone(392, 0, .18, { type: 'sawtooth', gain: .08 }); tone(311, .18, .4, { type: 'sawtooth', gain: .08 }); }),
      reveal: () => play(() => { tone(784, 0, .12, { type: 'triangle' }); tone(1175, .12, .32, { type: 'triangle' }); }),
      fanfare: () => play(() => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * .12, i === 5 ? .6 : .14, { type: 'triangle', gain: .13 })); }),
      music() {           /* nhạc nền nhẹ khi câu đang mở (chế độ 🔊) */
        stopMusic(); if (mode() !== 'all' || !ctx()) return;
        const notes = [262, 330, 392, 494, 392, 330, 294, 349, 440, 523, 440, 349]; let i = 0;
        music = setInterval(() => { const f = notes[i % notes.length]; tone(f, 0, .22, { gain: .035 }); if (i % 4 === 0) tone(f / 2, 0, .45, { type: 'triangle', gain: .03 }); i++; }, 260);
      }
    };
  })();

  const KEY_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];
  const stage = document.createElement('section');
  stage.id = 'liveStage'; stage.hidden = true; stage.setAttribute('aria-label', 'Cửa sổ Live Quiz');
  stage.innerHTML = `
    <style>
      #liveStage{position:fixed;z-index:45;width:min(980px,62vw);height:min(640px,calc(100vh - 170px));display:flex;flex-direction:column;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.35);overflow:hidden;color:#0f172a}
      #liveStage[hidden]{display:none}
      #liveStage.fullscreen{position:fixed!important;inset:0!important;left:0!important;top:0!important;width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;border-radius:0!important;z-index:99999!important;box-shadow:none!important}
      #liveStage .ls-head{display:flex;align-items:center;gap:8px;padding:10px 14px;background:linear-gradient(90deg,#0f766e,#0d9488);color:#fff;cursor:move;user-select:none;touch-action:none}
      #liveStage.fullscreen .ls-head{padding:14px 24px;cursor:default}
      #liveStage.fullscreen .ls-body{padding:24px 36px}
      #liveStage.fullscreen .ls-q{font-size:clamp(22px,2.2vw,36px);margin-bottom:24px}
      #liveStage.fullscreen .ls-opt{padding:14px 20px;border-radius:14px}
      #liveStage.fullscreen .ls-key{width:44px;height:44px;font-size:20px;border-radius:12px}
      #liveStage.fullscreen .ls-txt{font-size:clamp(18px,1.8vw,26px)}
      #liveStage.fullscreen .ls-num{font-size:20px}
      #liveStage.fullscreen .ls-timer{font-size:28px;padding:8px 14px;min-width:80px}
      #liveStage.fullscreen .ls-foot{padding:14px 24px}
      #liveStage.fullscreen .ls-btn{padding:12px 22px;font-size:16px}
      #liveStage.fullscreen .ls-rs{display:none!important}
      #liveStage .ls-pill{background:rgba(255,255,255,.18);border-radius:999px;padding:3px 10px;font-weight:700;font-size:13px;white-space:nowrap}
      #liveStage .ls-sp{flex:1}
      #liveStage .ls-ico{background:rgba(255,255,255,.16);border:0;color:#fff;border-radius:8px;width:34px;height:30px;cursor:pointer;font-size:15px}
      #liveStage .ls-timer{min-width:58px;text-align:center;font:800 20px/1 system-ui,sans-serif;font-variant-numeric:tabular-nums;background:#fff;color:#0f766e;border-radius:10px;padding:6px 8px}
      #liveStage .ls-timer.warn{color:#dc2626;animation:lsPulse .5s ease-in-out infinite alternate}
      @keyframes lsPulse{to{transform:scale(1.1)}}
      @keyframes lsIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
      #liveStage .ls-body{padding:16px 22px;overflow:auto;flex:1;animation:lsIn .3s ease-out}
      #liveStage .ls-status{font-size:13px;color:#64748b;margin-bottom:8px;font-weight:600}
      #liveStage .ls-q{font-size:clamp(17px,1.6vw,24px);line-height:1.55;margin-bottom:14px;overflow-wrap:anywhere}
      #liveStage .ls-q img,#liveStage .ls-txt img{max-width:min(100%,420px);max-height:28vh;width:auto!important;height:auto!important;display:block;margin:6px auto}
      #liveStage .ls-q svg,#liveStage .ls-txt svg{max-width:min(100%,420px);max-height:28vh}
      #liveStage table{border-collapse:collapse}#liveStage td,#liveStage th{border:1px solid #cbd5e1;padding:3px 8px}
      #liveStage .ls-opts{display:grid;gap:8px}
      #liveStage .ls-opt{position:relative;display:flex;align-items:center;gap:10px;border:2px solid #e2e8f0;border-radius:12px;padding:8px 12px;overflow:hidden;min-height:46px}
      #liveStage .ls-fill{position:absolute;left:0;top:0;bottom:0;width:0;background:#e0f2fe;transition:width .5s cubic-bezier(.2,.8,.2,1)}
      #liveStage .ls-opt>*:not(.ls-fill){position:relative}
      #liveStage .ls-key{flex:none;width:32px;height:32px;border-radius:9px;display:grid;place-items:center;font-weight:800;color:#fff}
      #liveStage .ls-txt{flex:1;font-size:clamp(15px,1.3vw,20px);overflow-wrap:anywhere}
      #liveStage .ls-num{font-weight:800;font-variant-numeric:tabular-nums;color:#334155;white-space:nowrap}
      #liveStage .ls-opt.right{border-color:#16a34a;box-shadow:0 0 0 3px #bbf7d0}
      #liveStage .ls-opt.right .ls-fill{background:#bbf7d0}
      #liveStage .ls-opt.right .ls-num::after{content:' ✓';color:#16a34a}
      #liveStage .ls-foot{display:flex;flex-wrap:wrap;gap:8px;padding:10px 14px;border-top:1px solid #e2e8f0;background:#f8fafc}
      #liveStage .ls-btn{border:0;border-radius:10px;padding:10px 16px;font-weight:700;font-size:14px;cursor:pointer;background:#e2e8f0;color:#0f172a}
      #liveStage .ls-btn.go{background:#0f766e;color:#fff;flex:1;min-width:150px;font-size:16px}
      #liveStage .ls-btn.lock{background:#f59e0b;color:#fff;flex:1}
      #liveStage .ls-btn.next{background:#1d4ed8;color:#fff}
      #liveStage .ls-btn:disabled{opacity:.4;cursor:default}
      #liveStage .ls-btn[hidden]{display:none}
      #liveStage .ls-kpi{display:flex;gap:10px;flex-wrap:wrap;margin:6px 0 14px}
      #liveStage .ls-kpi div{flex:1;min-width:120px;background:#f0fdfa;border-radius:12px;padding:10px 12px}
      #liveStage .ls-kpi b{display:block;font-size:26px;color:#0f766e}
      #liveStage .ls-kpi span{font-size:12px;color:#475569}
      #liveStage .ls-sum-row{display:grid;grid-template-columns:62px 1fr 110px;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:14px}
      #liveStage .ls-bar{height:12px;border-radius:99px;background:#e2e8f0;overflow:hidden}
      #liveStage .ls-bar i{display:block;height:100%;background:linear-gradient(90deg,#22c55e,#16a34a)}
      #liveStage .ls-ranks{overflow-x:auto;margin-top:6px}
      #liveStage .ls-ranks table{width:100%;border-collapse:collapse;font-size:14px}
      #liveStage .ls-ranks th,#liveStage .ls-ranks td{padding:8px;text-align:center;white-space:nowrap;border-bottom:1px solid #e2e8f0}
      #liveStage .ls-ranks th{background:#f0fdfa;font-size:12px}
      #liveStage .ls-ranks td:nth-child(2){text-align:left;white-space:normal;min-width:100px;overflow-wrap:anywhere}
      #liveStage .ls-rank:nth-child(1){background:#fef3c7}#liveStage .ls-rank:nth-child(2){background:#e2e8f0}#liveStage .ls-rank:nth-child(3){background:#ffedd5}
      #liveStage h3{margin:14px 0 6px;font-size:15px;color:#0f766e}
      .ls-podium{display:flex;align-items:flex-end;justify-content:center;gap:16px;margin:18px 0 24px;padding:10px 0}
      .ls-pod-col{flex:1;max-width:240px;display:flex;flex-direction:column;align-items:center;text-align:center}
      .ls-pod-avatar{width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:8px;box-shadow:0 4px 14px rgba(0,0,0,.12);border:3px solid #fff}
      .ls-pod-col.r1 .ls-pod-avatar{background:linear-gradient(135deg,#fef08a,#eab308);width:70px;height:70px;font-size:34px;box-shadow:0 6px 20px rgba(234,179,8,.45)}
      .ls-pod-col.r2 .ls-pod-avatar{background:linear-gradient(135deg,#f1f5f9,#94a3b8)}
      .ls-pod-col.r3 .ls-pod-avatar{background:linear-gradient(135deg,#fed7aa,#f97316)}
      .ls-pod-name{font-weight:700;font-size:15px;color:#0f172a;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:2px}
      .ls-pod-col.r1 .ls-pod-name{font-size:18px;color:#854d0e}
      .ls-pod-score{font-weight:800;font-size:18px;color:#0f766e;margin-bottom:3px}
      .ls-pod-col.r1 .ls-pod-score{font-size:21px;color:#0d9488}
      .ls-pod-meta{font-size:12px;color:#475569;line-height:1.4}
      .ls-pod-stand{width:100%;border-radius:14px 14px 0 0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:24px;margin-top:10px;text-shadow:0 1px 3px rgba(0,0,0,.3)}
      .ls-pod-col.r1 .ls-pod-stand{height:110px;background:linear-gradient(180deg,#eab308,#ca8a04)}
      .ls-pod-col.r2 .ls-pod-stand{height:80px;background:linear-gradient(180deg,#94a3b8,#64748b)}
      .ls-pod-col.r3 .ls-pod-stand{height:60px;background:linear-gradient(180deg,#f97316,#ea580c)}
      #liveStage.fullscreen .ls-pod-stand.r1{height:160px}
      #liveStage.fullscreen .ls-pod-stand.r2{height:120px}
      #liveStage.fullscreen .ls-pod-stand.r3{height:90px}
      .ls-btn-sub{border:1px solid #cbd5e1;background:#f8fafc;color:#334155;border-radius:8px;padding:8px 14px;font-weight:600;font-size:13px;cursor:pointer;width:100%;margin:14px 0 8px;text-align:center}
      .ls-btn-sub:hover{background:#f1f5f9;color:#0f766e;border-color:#99f6e4}
      #liveStage .ls-rs{position:absolute;right:0;bottom:0;width:18px;height:18px;cursor:nwse-resize;background:linear-gradient(135deg,transparent 50%,#94a3b8 50%);border-bottom-right-radius:18px;touch-action:none}
      /* ClassPoint-style Word Cloud */
      #liveStage .ls-wc-wrap{display:flex;flex-direction:column;gap:12px;margin-top:10px}
      #liveStage .ls-wc-meta{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;background:#f0fdfa;border:1px solid #ccfbf1;padding:8px 14px;border-radius:10px;font-size:13px;color:#0f766e;font-weight:600}
      #liveStage .ls-wc-cloud{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 14px;padding:26px 18px;min-height:220px;max-height:46vh;overflow:auto;background:radial-gradient(circle at center,#f8fafc 40%,#f1f5f9 100%);border-radius:16px;border:2px dashed #cbd5e1}
      #liveStage .ls-wc-tag{display:inline-flex;align-items:center;gap:6px;font-weight:800;line-height:1.2;padding:6px 14px;border-radius:999px;background:#fff;box-shadow:0 3px 12px rgba(0,0,0,.08);transition:all .3s cubic-bezier(.2,.8,.2,1);cursor:default;user-select:none;animation:lsPop .35s ease-out}
      #liveStage .ls-wc-tag:hover{transform:scale(1.1);box-shadow:0 8px 20px rgba(0,0,0,.15);z-index:2}
      #liveStage .ls-wc-count{font-size:12px;font-weight:700;background:rgba(0,0,0,.08);color:inherit;padding:2px 7px;border-radius:999px}
      #liveStage .ls-wc-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;color:#64748b;font-size:15px;text-align:center;gap:8px}
      @keyframes lsPop{0%{transform:scale(.5);opacity:0}80%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
      /* ClassPoint-style Short Answer Response Wall */
      #liveStage .ls-wall-wrap{display:flex;flex-direction:column;gap:12px;margin-top:10px}
      #liveStage .ls-wall-bar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;background:#f8fafc;border:1px solid #e2e8f0;padding:8px 12px;border-radius:10px}
      #liveStage .ls-wall-filters{display:flex;gap:6px}
      #liveStage .ls-wall-filter{font-size:12px;padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;color:#475569;font-weight:600;cursor:pointer}
      #liveStage .ls-wall-filter.active{background:#0f766e;color:#fff;border-color:#0f766e}
      #liveStage .ls-wall-anon{font-size:12px;color:#475569;display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none}
      #liveStage .ls-wall-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px;max-height:46vh;overflow:auto;padding:4px}
      #liveStage.fullscreen .ls-wall-grid{grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
      #liveStage .ls-wall-card{background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:12px 14px;box-shadow:0 2px 8px rgba(0,0,0,.04);display:flex;flex-direction:column;gap:8px;animation:lsIn .3s ease-out;position:relative}
      #liveStage .ls-wall-card.correct{border-color:#22c55e;background:#f0fdf4}
      #liveStage .ls-wall-header{display:flex;align-items:center;gap:8px}
      #liveStage .ls-wall-avatar{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:12.5px;color:#fff;flex:none}
      #liveStage .ls-wall-name{font-weight:700;font-size:13px;color:#1e293b;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #liveStage .ls-wall-time{font-size:11px;color:#94a3b8}
      #liveStage .ls-wall-text{font-size:14px;line-height:1.5;color:#0f172a;word-break:break-word;font-weight:600;padding:2px 0}
      #liveStage.fullscreen .ls-wall-text{font-size:17px}
      #liveStage .ls-wall-tag{align-self:flex-start;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;background:#e2e8f0;color:#475569}
      #liveStage .ls-wall-card.correct .ls-wall-tag{background:#dcfce7;color:#15803d}
      #liveStage .ls-wall-empty{grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;color:#64748b;font-size:14.5px;text-align:center;gap:6px}
      #liveStage .ls-wall-groups{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;margin-top:6px}
      #liveStage .ls-wall-groups h4{margin:0 0 8px;font-size:13px;color:#0f766e}
      #liveStage .ls-wall-gitem{display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;font-size:13px}
      #liveStage .ls-wall-gitem.correct{color:#15803d;font-weight:700}
      /* True / False Direct Cards */
      #liveStage .ls-tf-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px}
      #liveStage .ls-tf-card{position:relative;border:3px solid #e2e8f0;border-radius:16px;padding:22px 16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:#fff;text-align:center;cursor:default;overflow:hidden;transition:all .3s}
      #liveStage .ls-tf-card.true{border-color:#bbf7d0;background:#f0fdf4}
      #liveStage .ls-tf-card.false{border-color:#fecaca;background:#fef2f2}
      #liveStage .ls-tf-fill{position:absolute;bottom:0;left:0;right:0;height:0;transition:height .5s cubic-bezier(.2,.8,.2,1);opacity:.22}
      #liveStage .ls-tf-card.true .ls-tf-fill{background:#22c55e}
      #liveStage .ls-tf-card.false .ls-tf-fill{background:#ef4444}
      #liveStage .ls-tf-icon{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;font-size:28px;color:#fff;font-weight:900;z-index:1}
      #liveStage .ls-tf-card.true .ls-tf-icon{background:#16a34a}
      #liveStage .ls-tf-card.false .ls-tf-icon{background:#dc2626}
      #liveStage .ls-tf-label{font-size:22px;font-weight:800;letter-spacing:1px;z-index:1}
      #liveStage .ls-tf-card.true .ls-tf-label{color:#15803d}
      #liveStage .ls-tf-card.false .ls-tf-label{color:#b91c1c}
      #liveStage .ls-tf-val{font-size:20px;font-weight:800;color:#334155;z-index:1;font-variant-numeric:tabular-nums}
      #liveStage .ls-tf-card.right{box-shadow:0 0 0 4px #22c55e,0 8px 24px rgba(34,197,94,.3)}
      #liveStage .ls-tf-card.right::after{content:'✓ ĐÁP ÁN ĐÚNG';position:absolute;top:8px;right:8px;background:#16a34a;color:#fff;font-size:10.5px;font-weight:800;padding:3px 8px;border-radius:999px;z-index:2}
      #liveStage .ls-type-pill{display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,.24);padding:3px 10px;border-radius:999px;font-weight:700;font-size:12px;white-space:nowrap}
      @media (prefers-reduced-motion:reduce){#liveStage .ls-fill,#liveStage .ls-tf-fill{transition:none}#liveStage .ls-timer.warn,#liveStage .ls-body,#liveStage .ls-wc-tag{animation:none}}
    </style>
    <div class="ls-head" id="lsHead"><span class="ls-pill" id="lsNum">Câu –</span><span class="ls-type-pill" id="lsTypeBadge">🔘 Trắc nghiệm</span><span class="ls-pill" id="lsCode">Mã ------</span><span class="ls-pill" id="lsCount">👥 0 · ✔ 0</span><span class="ls-sp"></span><span class="ls-timer" id="lsTimer">∞</span><button class="ls-ico" id="lsSound" type="button"></button><button class="ls-ico" id="lsFullscreen" type="button" title="Toàn màn hình (F hoặc nhấp đúp tiêu đề)">⛶</button><button class="ls-ico" id="lsClose" type="button" title="Ẩn cửa sổ (mở lại bằng nút Cửa sổ kết quả)">✕</button></div>
    <div class="ls-body" id="lsBody"></div>
    <div class="ls-foot" id="lsFoot">
      <button class="ls-btn" id="lsPrev" type="button">‹ Câu trước</button>
      <button class="ls-btn go" id="lsGo" type="button" style="background:#0f766e;color:#fff;font-size:15px;font-weight:800;box-shadow:0 4px 14px rgba(15,118,110,.35)">▶ Bắt đầu làm bài</button>
      <button class="ls-btn lock" id="lsLock" type="button" hidden>🔒 Khóa bài</button>
      <button class="ls-btn" id="lsReveal" type="button" hidden>👁 Hiện đáp án</button>
      <button class="ls-btn next" id="lsNext" type="button">Câu tiếp ›</button>
      <button class="ls-btn" id="lsSum" type="button">📊 Tổng kết</button>
    </div>
    <div class="ls-foot" id="lsSumFoot" hidden>
      <button class="ls-btn" id="lsBack" type="button">‹ Quay lại câu hỏi</button>
      <button class="ls-btn go" id="lsCsv" type="button">⬇ Xuất kết quả Excel (Tổng hợp & Ma trận)</button>
      <button class="ls-btn" id="lsPin" type="button">📋 Dán thống kê lên bảng</button>
    </div>
    <span class="ls-rs" id="lsResize" title="Kéo để đổi cỡ"></span>`;
  document.body.appendChild(stage);
  const $s = id => stage.querySelector('#' + id);

  let stageShow = 'preview';           // 'live': câu đang phát · 'preview': xem câu đã chọn (chưa phát)
  let stageView = 'question';          // 'question' | 'summary'
  let lastPublished = -1, stageKey = '', ticked = -1, clockTimer = null, lastRoom = null, summaryData = null;
  const stageState = { participants: 0, answered: 0, locked: true, deadlineLocal: null, skew: 0 };
  const selIndex = () => +sec.querySelector('#liveBankSelect').value || 0;
  function richInto(el, html) {
    const sanitized = String(html || '')
      .replace(/\[(?:00)?[Aa]0\]/g, ' ')
      .replace(/\[EF[0-9A-Fa-f]{2}\]/g, ' ')
      .replace(/(\d+),\s+(\d+)/g, '$1,$2');
    el.innerHTML = sanitized;
    try {
      window.renderMathInElement?.(el, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false,
        preProcess: (m) => m.replace(/\[(?:00)?[Aa]0\]/g, ' ').replace(/\u00a0/g, ' ').replace(/\[EF[0-9A-Fa-f]{2}\]/g, '\\,')
      });
    } catch (_) {}
  }
  function placeStage() {
    if (stage.dataset.placed) return;
    const rail = document.getElementById('rail')?.getBoundingClientRect(), bar = document.getElementById('bar')?.getBoundingClientRect();
    stage.style.left = Math.round((rail?.right || 0) + 24) + 'px';
    stage.style.top = Math.round((bar?.bottom || 0) + 16) + 'px';
    stage.dataset.placed = '1';
  }
  function showStage() { placeStage(); stage.hidden = false; }
  function soundIcon() { const m = sfx.mode(); $s('lsSound').textContent = m === 'all' ? '🔊' : m === 'sfx' ? '🔉' : '🔇'; $s('lsSound').title = m === 'all' ? 'Âm thanh + nhạc nền (bấm để đổi)' : m === 'sfx' ? 'Chỉ hiệu ứng âm thanh (bấm để đổi)' : 'Đã tắt âm thanh (bấm để bật)'; }
  soundIcon();

  let wallFilter = 'all';  // 'all' | 'correct' | 'wrong'
  let wallAnon = false;    // Ẩn tên học sinh
  const WC_PALETTE = ['#0f766e', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#059669', '#0284c7', '#d97706', '#4f46e5', '#be123c'];

  function liveStageRender(force) {
    if (stage.hidden || stageView !== 'question') return;
    const total = bank.questions.length;
    const idx = stageShow === 'live' && liveCurrentQ ? lastPublished : selIndex();
    const q = stageShow === 'live' && liveCurrentQ ? liveCurrentQ : bank.questions[idx];
    const live = stageShow === 'live' && !!liveCurrentQ;
    const qType = getQuestionType(q);
    const meta = TYPE_META[qType] || TYPE_META.mcq;

    // Header pills
    $s('lsNum').textContent = q ? 'Câu ' + (idx + 1) + (total ? '/' + total : '') : 'Chưa có đề';
    const typePill = $s('lsTypeBadge');
    if (typePill) {
      typePill.textContent = meta.icon + ' ' + (meta.short || meta.label);
      typePill.title = 'Loại câu hỏi: ' + meta.label;
    }
    $s('lsCode').textContent = 'Mã ' + (currentRoom?.code || lastRoom?.code || '------');
    $s('lsCount').textContent = '👥 ' + stageState.participants + ' · ✔ ' + (live ? stageState.answered : 0);

    const body = $s('lsBody');
    const n = live ? currentAnswers.length : 0;
    const ansSignature = live ? currentAnswers.map(a => (a.id || a.name) + ':' + (Array.isArray(a.answer) ? a.answer.join(',') : a.answer)).join('|') : '';
    const qKey = (live ? 'L' : 'P') + idx + '|' + qType + '|' + (q ? q.html.length : 0);

    if (force || qKey !== stageKey) {
      stageKey = qKey;
      body.replaceChildren();
      body.style.animation = 'none'; void body.offsetWidth; body.style.animation = '';

      if (!q) {
        const p = document.createElement('div'); p.className = 'ls-status';
        p.textContent = 'Kéo thả đề Word vào khối "ĐỀ CÂU HỎI" ở bảng Live Quiz bên phải, hoặc chọn đề đã lưu, rồi bấm ▶ Phát câu này.';
        body.append(p);
      } else {
        // Status bar
        const st = document.createElement('div'); st.className = 'ls-status'; st.id = 'lsState';
        body.append(st);

        // Nội dung câu hỏi
        const qd = document.createElement('div'); qd.className = 'ls-q'; richInto(qd, q.html); body.append(qd);

        // Dựng khung theo từng loại câu hỏi
        if (qType === 'mcq') {
          const opts = document.createElement('div'); opts.className = 'ls-opts';
          (q.options || []).forEach((o, i) => {
            const row = document.createElement('div'); row.className = 'ls-opt'; row.dataset.i = i;
            const fill = document.createElement('span'); fill.className = 'ls-fill';
            const k = document.createElement('span'); k.className = 'ls-key'; k.style.background = KEY_COLORS[i % KEY_COLORS.length]; k.textContent = String.fromCharCode(65 + i);
            const t = document.createElement('span'); t.className = 'ls-txt'; richInto(t, o);
            const num = document.createElement('span'); num.className = 'ls-num';
            row.append(fill, k, t, num); opts.append(row);
          });
          body.append(opts);
        } else if (qType === 'tf') {
          const tfGrid = document.createElement('div'); tfGrid.className = 'ls-tf-grid';
          tfGrid.innerHTML = `
            <div class="ls-tf-card true" data-tf="0">
              <div class="ls-tf-fill"></div>
              <div class="ls-tf-icon">✓</div>
              <div class="ls-tf-label">ĐÚNG</div>
              <div class="ls-tf-val"></div>
            </div>
            <div class="ls-tf-card false" data-tf="1">
              <div class="ls-tf-fill"></div>
              <div class="ls-tf-icon">✗</div>
              <div class="ls-tf-label">SAI</div>
              <div class="ls-tf-val"></div>
            </div>
          `;
          body.append(tfGrid);
        } else if (qType === 'word_cloud') {
          const wcWrap = document.createElement('div'); wcWrap.className = 'ls-wc-wrap';
          body.append(wcWrap);
        } else {
          const wallWrap = document.createElement('div'); wallWrap.className = 'ls-wall-wrap';
          body.append(wallWrap);
        }
      }
    }

    // Cập nhật trạng thái câu hỏi
    const st = $s('lsState');
    if (st) {
      st.textContent = !live ? '👁️ Đang trình chiếu đề bài — Học sinh đọc kỹ đề bài trước khi bắt đầu'
        : stageState.locked ? '🔒 Đã khóa câu hỏi · ' + n + ' học sinh đã nộp bài'
        : '● Đang nhận câu trả lời từ học sinh… (' + n + '/' + (stageState.participants || 0) + ' đã nộp)';
    }

    // Cập nhật dữ liệu phản hồi học sinh theo từng loại câu hỏi
    if (q && qType === 'mcq') {
      const rows = [...body.querySelectorAll('.ls-opt')];
      const counts = rows.map(() => 0);
      if (live) currentAnswers.forEach(a => { if (Array.isArray(a.answer)) a.answer.forEach(k => { if (counts[k] !== undefined) counts[k]++; }); });
      rows.forEach((row, i) => {
        const pct = n ? Math.round(counts[i] * 100 / n) : 0;
        row.querySelector('.ls-fill').style.width = (live ? pct : 0) + '%';
        row.querySelector('.ls-num').textContent = live ? counts[i] + ' · ' + pct + '%' : '';
        row.classList.toggle('right', live && correctOption === i);
      });
    } else if (q && qType === 'tf') {
      let trueCount = 0, falseCount = 0;
      if (live) {
        currentAnswers.forEach(a => {
          const val = Array.isArray(a.answer) ? a.answer[0] : a.answer;
          if (val === 0 || val === '0' || /^đúng$|^true$/i.test(String(val).trim())) trueCount++;
          else if (val === 1 || val === '1' || /^sai$|^false$/i.test(String(val).trim())) falseCount++;
        });
      }
      const truePct = n ? Math.round(trueCount * 100 / n) : 0;
      const falsePct = n ? Math.round(falseCount * 100 / n) : 0;
      const cardTrue = body.querySelector('.ls-tf-card.true');
      const cardFalse = body.querySelector('.ls-tf-card.false');
      if (cardTrue && cardFalse) {
        cardTrue.querySelector('.ls-tf-fill').style.height = (live ? truePct : 0) + '%';
        cardTrue.querySelector('.ls-tf-val').textContent = live ? trueCount + ' (' + truePct + '%)' : 'Phương án A';
        cardTrue.classList.toggle('right', live && correctOption === 0);

        cardFalse.querySelector('.ls-tf-fill').style.height = (live ? falsePct : 0) + '%';
        cardFalse.querySelector('.ls-tf-val').textContent = live ? falseCount + ' (' + falsePct + '%)' : 'Phương án B';
        cardFalse.classList.toggle('right', live && correctOption === 1);
      }
    } else if (q && qType === 'word_cloud') {
      const wcWrap = body.querySelector('.ls-wc-wrap');
      if (wcWrap && (force || wcWrap.dataset.ansSig !== ansSignature)) {
        wcWrap.dataset.ansSig = ansSignature;
        wcWrap.replaceChildren();
        const words = [];
        if (live) {
          currentAnswers.forEach(a => {
            const raw = String(a.answer || '').trim();
            if (!raw) return;
            raw.split(/[,;\n]+/).map(w => w.trim()).filter(Boolean).forEach(w => words.push({ word: w, student: a.name }));
          });
        }
        const freqMap = new Map();
        words.forEach(({ word, student }) => {
          const key = word.toLowerCase();
          if (!freqMap.has(key)) freqMap.set(key, { display: word, count: 0, students: [] });
          const item = freqMap.get(key);
          item.count++;
          if (!item.students.includes(student)) item.students.push(student);
          if (word[0] === word[0].toUpperCase() && item.display[0] !== item.display[0].toUpperCase()) item.display = word;
        });

        const totalWords = words.length;
        const uniqueWords = freqMap.size;
        const sortedWords = [...freqMap.values()].sort((a, b) => b.count - a.count);
        const topWord = sortedWords[0]?.display || '';

        const metaBar = document.createElement('div'); metaBar.className = 'ls-wc-meta';
        metaBar.innerHTML = `
          <span>👥 <b>${n}</b> học sinh đã gửi · 💬 <b>${totalWords}</b> từ khóa (<b>${uniqueWords}</b> từ riêng biệt)</span>
          ${topWord ? `<span style="background:#ccfbf1;padding:2px 8px;border-radius:6px;">🌟 Nổi bật nhất: <b>${topWord}</b> (${sortedWords[0].count} lượt)</span>` : ''}
        `;
        wcWrap.append(metaBar);

        const cloud = document.createElement('div'); cloud.className = 'ls-wc-cloud';
        if (!sortedWords.length) {
          cloud.innerHTML = `
            <div class="ls-wc-empty">
              <span style="font-size:36px;">☁️</span>
              <b>Đang chờ học sinh gửi từ khóa…</b>
              <span style="font-size:13px;color:#94a3b8;">Học sinh gõ từ khóa trên điện thoại, các từ sẽ bay vào đám mây thời gian thực tại đây!</span>
            </div>
          `;
        } else {
          const maxCount = Math.max(1, ...sortedWords.map(x => x.count));
          sortedWords.forEach((item, idx) => {
            const tag = document.createElement('span'); tag.className = 'ls-wc-tag';
            const color = WC_PALETTE[idx % WC_PALETTE.length];
            const size = Math.round(16 + ((item.count - 1) / maxCount) * 26);
            tag.style.fontSize = size + 'px';
            tag.style.color = color;
            tag.style.borderColor = color + '40';
            tag.title = `${item.count} lượt nhập: ${item.students.slice(0, 5).join(', ')}${item.students.length > 5 ? '…' : ''}`;
            tag.innerHTML = `<span>${item.display}</span>${item.count > 1 ? `<span class="ls-wc-count" style="background:${color}18;color:${color}">${item.count}</span>` : ''}`;
            cloud.append(tag);
          });
        }
        wcWrap.append(cloud);
      }
    } else if (q) {
      // Short Answer Response Wall
      const wallWrap = body.querySelector('.ls-wall-wrap');
      if (wallWrap && (force || wallWrap.dataset.ansSig !== ansSignature + '|' + wallFilter + '|' + (wallAnon ? 1 : 0))) {
        wallWrap.dataset.ansSig = ansSignature + '|' + wallFilter + '|' + (wallAnon ? 1 : 0);
        wallWrap.replaceChildren();
        const answersList = live ? currentAnswers : [];
        const correctKey = (q?.correct || []).map(x => String(x).trim().toLowerCase());

        const classified = answersList.map(a => {
          const text = String(a.answer || '').trim();
          const isMatch = a.correct === 1 || (correctKey.length && correctKey.includes(text.toLowerCase()));
          return { ...a, text, isMatch };
        });

        const correctCount = classified.filter(x => x.isMatch).length;
        const wrongCount = classified.length - correctCount;

        const bar = document.createElement('div'); bar.className = 'ls-wall-bar';
        const filters = document.createElement('div'); filters.className = 'ls-wall-filters';
        const btnAll = document.createElement('button'); btnAll.className = 'ls-wall-filter' + (wallFilter === 'all' ? ' active' : ''); btnAll.textContent = `Tất cả (${classified.length})`;
        btnAll.onclick = () => { wallFilter = 'all'; liveStageRender(true); };
        filters.append(btnAll);

        if (correctKey.length) {
          const btnCor = document.createElement('button'); btnCor.className = 'ls-wall-filter' + (wallFilter === 'correct' ? ' active' : ''); btnCor.textContent = `✓ Đúng (${correctCount})`;
          btnCor.onclick = () => { wallFilter = 'correct'; liveStageRender(true); };
          const btnWro = document.createElement('button'); btnWro.className = 'ls-wall-filter' + (wallFilter === 'wrong' ? ' active' : ''); btnWro.textContent = `Chưa khớp (${wrongCount})`;
          btnWro.onclick = () => { wallFilter = 'wrong'; liveStageRender(true); };
          filters.append(btnCor, btnWro);
        }

        const anonLabel = document.createElement('label'); anonLabel.className = 'ls-wall-anon';
        anonLabel.innerHTML = `<input type="checkbox" ${wallAnon ? 'checked' : ''}> Ẩn tên học sinh`;
        anonLabel.querySelector('input').onchange = e => { wallAnon = e.target.checked; liveStageRender(true); };

        bar.append(filters, anonLabel);
        wallWrap.append(bar);

        const grid = document.createElement('div'); grid.className = 'ls-wall-grid';
        const filtered = classified.filter(item => {
          if (wallFilter === 'correct') return item.isMatch;
          if (wallFilter === 'wrong') return !item.isMatch;
          return true;
        });

        if (!filtered.length) {
          grid.innerHTML = `
            <div class="ls-wall-empty">
              <span style="font-size:36px;">✍️</span>
              <b>${classified.length ? 'Không có câu trả lời nào theo bộ lọc này.' : 'Đang chờ học sinh gửi câu trả lời ngắn…'}</b>
              <span style="font-size:13px;color:#94a3b8;">${classified.length ? '' : 'Học sinh nhập nội dung trên điện thoại, các thẻ câu trả lời sẽ xuất hiện tại đây theo thời gian thực!'}</span>
            </div>
          `;
        } else {
          filtered.forEach((item, i) => {
            const card = document.createElement('div'); card.className = 'ls-wall-card' + (item.isMatch ? ' correct' : '');
            const color = WC_PALETTE[i % WC_PALETTE.length];
            const displayName = wallAnon ? `Học sinh #${i + 1}` : (item.name || 'Học sinh');
            const initial = displayName.charAt(0).toUpperCase();

            card.innerHTML = `
              <div class="ls-wall-header">
                <div class="ls-wall-avatar" style="background:${color}">${initial}</div>
                <div class="ls-wall-name">${displayName}</div>
                <div class="ls-wall-time">${item.at ? Math.max(1, Math.round((item.at - (stageState.skew || 0)) / 1000 % 60)) + 's' : ''}</div>
              </div>
              <div class="ls-wall-text">${item.text || '<i>(Không có nội dung)</i>'}</div>
              ${correctKey.length ? `<div class="ls-wall-tag">${item.isMatch ? '✓ Đáp án đúng' : 'Chưa khớp'}</div>` : ''}
            `;
            grid.append(card);
          });
        }
        wallWrap.append(grid);

        if (classified.length > 2) {
          const groupMap = new Map();
          classified.forEach(x => {
            const k = x.text.toLowerCase();
            if (!groupMap.has(k)) groupMap.set(k, { text: x.text, count: 0, isMatch: x.isMatch });
            groupMap.get(k).count++;
          });
          const groupsWrap = document.createElement('div'); groupsWrap.className = 'ls-wall-groups';
          groupsWrap.innerHTML = `<h4>📊 Thống kê nhóm câu trả lời (${groupMap.size} nhóm khác nhau):</h4>`;
          [...groupMap.values()].sort((a, b) => b.count - a.count).slice(0, 6).forEach(g => {
            const pct = Math.round(g.count * 100 / classified.length);
            const gRow = document.createElement('div'); gRow.className = 'ls-wall-gitem' + (g.isMatch ? ' correct' : '');
            gRow.innerHTML = `<span>${g.isMatch ? '✓ ' : '• '}<b>${g.text}</b></span><span>${g.count} bạn (${pct}%)</span>`;
            groupsWrap.append(gRow);
          });
          wallWrap.append(groupsWrap);
        }
      }
    }

    // Nút điều khiển
    const hasKey = live && (q?.correct || []).some(Number.isInteger) && (q?.options || []).length;
    $s('lsGo').hidden = live;
    $s('lsLock').hidden = !live || stageState.locked;
    $s('lsReveal').hidden = !(live && stageState.locked && hasKey && correctOption === null);
    $s('lsPrev').disabled = idx <= 0;
    $s('lsNext').disabled = idx + 1 >= total;
    $s('lsNext').textContent = live ? 'Câu tiếp ›' : 'Xem câu sau ›';
    $s('lsGo').disabled = !q;
  }

  function clockTick() {
    const el = $s('lsTimer'), live = stageShow === 'live' && liveCurrentQ;
    if (!live || stageState.locked || !stageState.deadlineLocal) {
      if (live && stageState.locked) {
        el.textContent = '🔒';
      } else {
        const secSel = Number(document.getElementById('liveTimerSelect')?.value || 0);
        el.textContent = secSel > 0 ? (secSel >= 60 ? Math.floor(secSel / 60) + ':' + String(secSel % 60).padStart(2, '0') : secSel + 's') : '∞';
      }
      el.classList.remove('warn');
      return;
    }
    const left = Math.max(0, Math.ceil((stageState.deadlineLocal - Date.now()) / 1000));
    el.textContent = left >= 60 ? Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') : String(left);
    el.classList.toggle('warn', left <= 5);
    if (left <= 5 && left > 0 && left !== ticked) { ticked = left; sfx.tick(left === 1); }
    if (left === 0 && ticked !== 0) { ticked = 0; sfx.stopMusic(); sfx.timeUp(); if (!stageState.locked) sec.querySelector('#liveLockBtn')?.click(); }
  }

  function liveStageOnPublish(q, index, seconds) {
    lastRoom = currentRoom; lastPublished = index; stageShow = 'live'; stageView = 'question';
    Object.assign(stageState, { answered: 0, locked: false, deadlineLocal: seconds ? Date.now() + seconds * 1000 : null });
    ticked = -1; correctOption = null;
    $s('lsFoot').hidden = false; $s('lsSumFoot').hidden = true;
    showStage(); liveStageRender(true);
    sfx.publish(); setTimeout(() => { if (!stageState.locked) sfx.music(); }, 650);
    clearInterval(clockTimer); clockTimer = setInterval(clockTick, 200); clockTick();
  }

  function liveStageUpdate(data) {
    if (data.participants !== undefined) stageState.participants = data.participants;
    if (data.serverTime) stageState.skew = Date.now() - data.serverTime;
    if (data.deadline !== undefined && stageShow === 'live') stageState.deadlineLocal = data.deadline ? data.deadline + stageState.skew : null;
    if (data.locked !== undefined) { const was = stageState.locked; stageState.locked = !!data.locked; if (!was && stageState.locked) { sfx.stopMusic(); autoAdvance(); } }
    if (data.responses) { const n = data.responses.length; if (n > stageState.answered && stageShow === 'live' && !stageState.locked) sfx.answer(); stageState.answered = n; }
    /* tự chuyển câu: cả lớp đã trả lời thì khóa sớm */
    if (autoMode() && stageShow === 'live' && liveCurrentQ && !stageState.locked && stageState.participants > 0 && stageState.answered >= stageState.participants) {
      stageState.locked = true; sec.querySelector('#liveLockBtn').click();
    }
    liveStageRender();
  }

  /* Chế độ tự chuyển câu (như Quizizz): khóa câu (hết giờ / cả lớp đã trả lời) → hiện đáp án 5 giây → phát câu tiếp;
     hết đề → Tổng kết. Thầy cô bấm Câu tiếp để sang sớm. */
  let autoTimer = null, autoDone = -1;
  function autoAdvance() {
    if (!autoMode() || stageShow !== 'live' || !liveCurrentQ || !currentRoom || autoDone === lastPublished) return;
    autoDone = lastPublished;
    if ((liveCurrentQ.correct || []).some(Number.isInteger) && correctOption === null) revealBtn.click();
    const at = lastPublished, next = at + 1;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      if (!autoMode() || lastPublished !== at || !currentRoom) return;
      if (next < bank.questions.length) publishIndex(next); else liveStageSummary();
    }, 5000);
  }

  /* ---- Tổng kết cuối phiên ----
     Điểm kiểu Quizizz do máy chủ tính lúc tổng kết (đúng càng sớm càng cao). Khi Dừng phiên: tải kết quả về máy rồi xóa
     kết quả trên máy chủ (purge, giữ đề); thống kê và file Excel tạo ngay trên máy từ dữ liệu đã tải. */
  let summaryPurged = false;
  async function liveStageSummary(room, purge) {
    room = room || currentRoom || lastRoom; if (!room) return;
    lastRoom = room; stageView = 'summary'; stageKey = '';
    showStage();
    $s('lsFoot').hidden = true; $s('lsSumFoot').hidden = false;
    $s('lsNum').textContent = 'Tổng kết'; $s('lsTimer').textContent = '🏁'; $s('lsTimer').classList.remove('warn');
    const body = $s('lsBody');
    try {
      if (!(summaryPurged && summaryData && summaryData.code === room.code)) {
        body.textContent = 'Đang tổng hợp kết quả…';
        const r = await hostGet(`/api/live/host/${room.id}/summary`);
        if (!r.ok) { const err = await r.json().catch(() => ({})); throw Error(err.error || 'Không lấy được kết quả (' + r.status + ').'); }
        summaryData = await r.json(); summaryPurged = false;
      }
      if (purge && !summaryPurged) {
        const p = await hostFetch(`/api/live/host/${room.id}/purge`, {}).catch(() => null);
        summaryPurged = !!p?.ok;
      }
      renderSummary(summaryData);
      sfx.fanfare();
    } catch (e) { body.textContent = e.message; }
  }
  function formatTime(ms) {
    if (!ms || ms <= 0) return '0s';
    const sec = Math.round(ms / 1000);
    if (sec < 60) return sec + 's';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + 'm ' + (s < 10 ? '0' : '') + s + 's';
  }
  function renderSummary(s) {
    const body = $s('lsBody'), el = (tag, text, cls) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; };
    $s('lsCode').textContent = 'Mã ' + s.code;
    $s('lsCount').textContent = '👥 ' + s.participants + ' · ' + s.rounds.length + ' câu';
    body.replaceChildren(el('div', '🏁 ' + (s.title || 'Phiên trực tiếp'), 'ls-q'));
    const graded = s.rounds.filter(x => x.graded && x.answered), ans = s.rounds.reduce((a, x) => a + x.answered, 0);
    const avg = graded.length ? Math.round(graded.reduce((a, x) => a + x.correct, 0) * 100 / graded.reduce((a, x) => a + x.answered, 0)) : null;
    const kpi = el('div', undefined, 'ls-kpi');
    for (const [v, t] of [[s.participants, 'học sinh tham gia'], [s.rounds.length, 'câu đã phát'], [ans, 'lượt trả lời'], [avg === null ? '–' : avg + '%', 'đúng / lượt đã chấm']]) {
      const d = el('div'); d.append(el('b', String(v)), el('span', t)); kpi.append(d);
    }
    body.append(kpi);
    const ranked = s.students;
    const keyed = s.rounds.filter(r => r.graded).length || s.rounds.length;
    if (ranked.length) {
      body.append(el('h3', '🏆 Vinh danh Top 3 xuất sắc nhất'));
      const podium = el('div', undefined, 'ls-podium');
      const topIndices = ranked.length >= 3 ? [1, 0, 2] : (ranked.length === 2 ? [1, 0] : [0]);
      const ranks = ranked.length >= 3 ? [2, 1, 3] : (ranked.length === 2 ? [2, 1] : [1]);
      const badges = ranked.length >= 3 ? ['🥈', '🥇', '🥉'] : (ranked.length === 2 ? ['🥈', '🥇'] : ['🥇']);
      topIndices.forEach((stIdx, colIdx) => {
        const st = ranked[stIdx];
        if (!st) return;
        const rk = ranks[colIdx];
        const t = NBLiveResults.stats(s, st);
        const pctTotal = keyed ? Math.round(t.correct * 1000 / keyed) / 10 : 0;
        const col = el('div', undefined, 'ls-pod-col r' + rk);
        const av = el('div', badges[colIdx], 'ls-pod-avatar');
        const nm = el('div', st.name, 'ls-pod-name'); nm.title = st.name;
        const sc = el('div', st.points.toLocaleString('vi-VN') + ' đ', 'ls-pod-score');
        const meta = el('div', undefined, 'ls-pod-meta');
        meta.innerHTML = `<b>${t.correct}/${keyed}</b> câu (${pctTotal}%)<br><span style="font-size:11px;color:#64748b">Làm ${t.answered}/${t.total} · ⏱️${formatTime(st.time)}</span>`;
        const stand = el('div', String(rk), 'ls-pod-stand r' + rk);
        col.append(av, nm, sc, meta, stand);
        podium.append(col);
      });
      body.append(podium);

      body.append(el('h3', '🏆 Bảng tổng kết kết quả'));
      const list = el('div', undefined, 'ls-ranks'), table = el('table'), head = el('thead'), header = el('tr'), tbody = el('tbody');
      const totals = ranked.map(x => NBLiveResults.stats(s, x));
      const extra = [['waiting','Đang chờ'],['ungraded','Chưa chấm'],['survey','Không chấm']].filter(([key]) => totals.some(x => x[key]));
      for (const name of ['Hạng','Học sinh','Đã trả lời','Đúng','Sai','Chưa trả lời',...extra.map(x=>x[1]),'Điểm']) header.append(el('th', name));
      head.append(header); table.append(head, tbody);
      ranked.forEach((x, i) => {
        const row = el('tr', undefined, 'ls-rank'), t = totals[i];
        const pctTotal = keyed ? Math.round(t.correct * 1000 / keyed) / 10 : 0;
        const correctText = t.correct + (keyed ? ' (' + pctTotal + '%)' : '');
        for (const value of [i+1, x.name, t.answered+'/'+t.total, correctText, t.wrong, t.missing, ...extra.map(([key])=>t[key]), x.points+' điểm']) {
          row.append(el('td', String(value)));
        }
        tbody.append(row);
      });
      list.append(table); body.append(list);
    }
    body.append(el('h3', 'Từng câu'));
    for (const x of s.rounds) {
      const row = el('div', undefined, 'ls-sum-row'); row.title = x.text;
      const bar = el('div', undefined, 'ls-bar'), i = document.createElement('i');
      const pct = x.graded && x.answered ? Math.round(x.correct * 100 / x.answered) : 0; i.style.width = pct + '%'; bar.append(i);
      row.append(el('b', 'Câu ' + x.n), bar, el('span', x.graded ? x.correct + '/' + x.answered + ' đúng (' + pct + '%)' : x.answered + ' trả lời'));
      body.append(row);
    }
    if (summaryPurged) body.append(el('div', '✓ Đã tải kết quả về máy và xóa khỏi máy chủ. Hãy xuất file Excel trước khi đóng bảng.', 'ls-status'));
  }
  /* Workbook is created locally, including after the session results have been purged. */
  async function exportExcel() {
    const room = lastRoom || currentRoom; if (!room) return;
    try {
      if (!summaryData || summaryData.code !== room.code) {
        const r = await hostGet(`/api/live/host/${room.id}/summary`);
        if (!r.ok) { const err = await r.json().catch(() => ({})); throw Error(err.error || 'Không lấy được kết quả (' + r.status + ').'); }
        summaryData = await r.json();
      }
      const d = new Date(), name = 'ket-qua-live-' + summaryData.code + '-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '.xlsx';
      const url = URL.createObjectURL(NBLiveResults.workbook(summaryData)), a = document.createElement('a');
      a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      if (typeof window.toast === 'function') window.toast('Đã xuất Excel gồm Tổng hợp và Chi tiết: ' + name);
    } catch (e) { alert(e.message); }
  }
  function pinSummary() {
    const s = summaryData; if (!s) return;
    const lines = s.rounds.map(x => 'Câu ' + x.n + ': ' + (x.graded ? x.correct + '/' + x.answered + ' đúng (' + (x.answered ? Math.round(x.correct * 100 / x.answered) : 0) + '%)' : x.answered + ' trả lời'));
    const top = s.students.filter(x => x.answered).slice(0, 5).map((x, i) => (i + 1) + '. ' + x.name + ' ' + x.points + 'đ');
    pinTextToScratch('📊 [TỔNG KẾT LIVE QUIZ] ' + (s.title || '') + ' · mã ' + s.code + ' · ' + s.participants + ' học sinh\n' + lines.join('\n') + (top.length ? '\n🏆 ' + top.join(' · ') : ''));
  }

  /* ---- Nút trong cửa sổ ---- */
  $s('lsGo').onclick = () => publishIndex(selIndex());
  $s('lsLock').onclick = () => sec.querySelector('#liveLockBtn').click();
  $s('lsReveal').onclick = () => revealBtn.click();
  $s('lsNext').onclick = () => {
    if (stageShow === 'live' && liveCurrentQ) {
      if (lastPublished + 1 < bank.questions.length) publishIndex(lastPublished + 1);
      return;
    }
    const sel = sec.querySelector('#liveBankSelect');
    sel.value = String(Math.min(bank.questions.length - 1, selIndex() + 1));
    showBankPreview();
    liveStageRender(true);
    clockTick();
  };
  $s('lsPrev').onclick = () => {
    const cur = stageShow === 'live' && liveCurrentQ ? lastPublished : selIndex();
    const prev = Math.max(0, cur - 1);
    stageShow = 'preview'; sfx.stopMusic();
    const sel = sec.querySelector('#liveBankSelect'); sel.value = String(prev);
    showBankPreview(); liveStageRender(true); clockTick();
  };
  $s('lsSum').onclick = () => liveStageSummary();
  $s('lsBack').onclick = () => { stageView = 'question'; stageKey = ''; $s('lsFoot').hidden = false; $s('lsSumFoot').hidden = true; liveStageRender(true); clockTick(); };
  $s('lsCsv').onclick = exportExcel;
  $s('lsPin').onclick = pinSummary;
  $s('lsSound').onclick = () => { const m = sfx.cycle(); soundIcon(); if (m === 'all' && stageShow === 'live' && !stageState.locked) sfx.music(); };
  $s('lsClose').onclick = () => { stage.hidden = true; };
  sec.querySelector('#liveBankSelect').addEventListener('change', () => {
    if (stageShow !== 'live' || !liveCurrentQ) {
      showBankPreview();
      liveStageRender(true);
      clockTick();
    }
  });
  /* nút mở cửa sổ ở bảng Live Quiz */
  {
    const open = document.createElement('button');
    open.className = 'setting-btn'; open.id = 'liveStageBtn'; open.type = 'button';
    open.style.cssText = 'font-size:12px;padding:6px 8px;';
    open.textContent = '🖥 Trình chiếu Live Quiz';
    open.onclick = () => { if (stage.hidden) { showStage(); stageKey = ''; stageView === 'summary' ? liveStageSummary() : liveStageRender(true); } else stage.hidden = true; };
    sec.querySelector('#liveShowQRBtn')?.after(open);
  }
  /* kéo tiêu đề để di chuyển, góc phải dưới để đổi cỡ */
  function dragWith(handle, onMove) {
    handle.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      e.preventDefault(); handle.setPointerCapture(e.pointerId);
      const r = stage.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY;
      handle.onpointermove = ev => onMove(r, ev.clientX - x0, ev.clientY - y0);
      handle.onpointerup = handle.onpointercancel = () => { handle.onpointermove = null; };
    });
  }
  dragWith($s('lsHead'), (r, dx, dy) => {
    if (stage.classList.contains('fullscreen')) return;
    stage.style.left = Math.max(0, Math.min(innerWidth - 120, r.left + dx)) + 'px';
    stage.style.top = Math.max(0, Math.min(innerHeight - 60, r.top + dy)) + 'px';
  });
  dragWith($s('lsResize'), (r, dx, dy) => {
    if (stage.classList.contains('fullscreen')) return;
    stage.style.width = Math.max(420, Math.min(innerWidth - r.left - 8, r.width + dx)) + 'px';
    stage.style.height = Math.max(320, Math.min(innerHeight - r.top - 8, r.height + dy)) + 'px';
  });

  let stageSavedBounds = null;
  function toggleStageFullscreen(force) {
    const isFs = force !== undefined ? !!force : !stage.classList.contains('fullscreen');
    if (isFs) {
      stageSavedBounds = {
        left: stage.style.left,
        top: stage.style.top,
        width: stage.style.width,
        height: stage.style.height
      };
      stage.classList.add('fullscreen');
      stage.style.left = '';
      stage.style.top = '';
      stage.style.width = '';
      stage.style.height = '';
      const btn = $s('lsFullscreen');
      if (btn) { btn.textContent = '🗗'; btn.title = 'Thu nhỏ cửa sổ (F, Esc hoặc nhấp đúp tiêu đề)'; }
    } else {
      stage.classList.remove('fullscreen');
      if (stageSavedBounds) {
        stage.style.left = stageSavedBounds.left || '';
        stage.style.top = stageSavedBounds.top || '';
        stage.style.width = stageSavedBounds.width || '';
        stage.style.height = stageSavedBounds.height || '';
      }
      const btn = $s('lsFullscreen');
      if (btn) { btn.textContent = '⛶'; btn.title = 'Toàn màn hình (F hoặc nhấp đúp tiêu đề)'; }
    }
  }
  $s('lsHead')?.addEventListener('dblclick', e => {
    if (e.target.closest('button')) return;
    toggleStageFullscreen();
  });
  $s('lsFullscreen')?.addEventListener('click', () => toggleStageFullscreen());
  window.addEventListener('keydown', e => {
    if (stage.hidden) return;
    const tag = (e.target?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
    if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      toggleStageFullscreen();
    } else if (e.key === 'Escape' && stage.classList.contains('fullscreen')) {
      e.preventDefault();
      toggleStageFullscreen(false);
    }
  });

  /* ---- Chia sẻ Bảng bài giảng & Học liệu tương tác (3D, Thí nghiệm, Học liệu PhET) trong cùng phiên QR ---- */
  let qrShareActive = false, autoShareTimer = null;
  const shareBox = document.createElement('div');
  shareBox.id = 'liveShareBoardBox';
  shareBox.style.cssText = 'background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:8px 10px;margin-top:10px;';
  shareBox.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
      <span style="font-size:11px;font-weight:700;color:#0f766e;letter-spacing:0.4px;">📱 BẢNG & HỌC LIỆU ĐT</span>
      <span id="liveShareStatusBadge" style="font-size:10.5px;font-weight:700;color:#64748b;">Chưa phát bảng</span>
    </div>
    <div id="liveShareSummary" style="font-size:11px;color:#334155;line-height:1.4;margin-bottom:6px;">
      Chia sẻ bảng kèm <b>Hình 3D, Thí nghiệm, Học liệu PhET</b> sang điện thoại học sinh (cùng mã QR).
    </div>
    <button type="button" class="setting-btn primary" id="liveShareBoardBtn" style="width:100%;font-size:11.5px;font-weight:600;padding:6px 8px;margin:0 0 5px;">📤 Chia sẻ / Cập nhật bảng sang ĐT</button>
    <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:#475569;cursor:pointer;user-select:none;margin:0;">
      <input type="checkbox" id="liveAutoShareChk" checked style="width:14px;height:14px;accent-color:#0f766e;">
      <span>Tự cập nhật 3D, Thí nghiệm, Học liệu</span>
    </label>
  `;
  sec.querySelector('#liveOnState')?.append(shareBox);

  function captureBoardSnapshot() {
    try {
      const wrap = document.getElementById('wrap');
      if (!wrap) return null;
      const wr = wrap.getBoundingClientRect();
      if (wr.width < 40 || wr.height < 40) return null;
      const cw = 960, ch = Math.max(480, Math.min(720, Math.round(cw * wr.height / wr.width)));
      const c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      const g = c.getContext('2d');
      const sx = cw / wr.width, sy = ch / wr.height;
      const dark = document.documentElement.dataset.theme === 'dark' || document.documentElement.dataset.paper === 'blackboard';
      g.fillStyle = dark ? '#0f172a' : '#ffffff';
      g.fillRect(0, 0, cw, ch);

      // Vẽ các ảnh/canvas trên bảng (trang PDF, hình minh họa, khối 3D, mô phỏng)
      const mediaEls = wrap.querySelectorAll('#board img, #board canvas');
      for (const el of mediaEls) {
        if (el.closest('[hidden]')) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || r.bottom < wr.top || r.top > wr.bottom) continue;
        try {
          g.drawImage(el, (r.left - wr.left) * sx, (r.top - wr.top) * sy, r.width * sx, r.height * sy);
        } catch (_) {}
      }

      // Vẽ văn bản bài giảng đã mở (.blk.on) và chữ gõ trên bảng (.txt:not(.pic))
      g.fillStyle = dark ? '#f8fafc' : '#1e293b';
      g.font = '15px "Segoe UI", system-ui, sans-serif';
      const textEls = wrap.querySelectorAll('#board .blk.on, #board .txt:not(.pic)');
      for (const el of textEls) {
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4 || r.bottom < wr.top || r.top > wr.bottom) continue;
        const txt = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!txt) continue;
        const x = Math.max(8, (r.left - wr.left) * sx);
        const y = Math.max(18, (r.top - wr.top) * sy + 16);
        g.fillText(txt.slice(0, 140), x, y, Math.max(80, r.width * sx));
      }

      // Vẽ lớp mực viết tay (#ink)
      const ink = document.getElementById('ink');
      if (ink && ink.width > 0 && ink.height > 0) {
        try { g.drawImage(ink, 0, 0, cw, ch); } catch (_) {}
      }

      // Che các tấm rèm chưa lật (.nb-cover:not(.revealed)) để không lộ đáp án ẩn
      const covers = wrap.querySelectorAll('#board .nb-cover:not(.revealed)');
      for (const cv of covers) {
        const r = cv.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        g.fillStyle = '#0f766e';
        g.fillRect((r.left - wr.left) * sx, (r.top - wr.top) * sy, r.width * sx, r.height * sy);
      }

      return c.toDataURL('image/jpeg', 0.76);
    } catch (_) {
      return null;
    }
  }

  function collectBoardPayload(opts = {}) {
    const items = [];
    const list = (typeof texts !== 'undefined' && Array.isArray(texts)) ? texts : [];
    let spCount = 0, phCount = 0, rsCount = 0;
    let activeFocusId = '';
    const wrapEl = document.getElementById('wrap');
    const wr = wrapEl ? wrapEl.getBoundingClientRect() : null;

    const activeSp = window.NBSpatialBoard?.active;
    if (activeSp?.target?.pic && activeSp.scene) {
      activeSp.target.pic.spatial = JSON.parse(JSON.stringify(activeSp.scene));
    }
    const activePh = window.NBPhysicsBoard?.active;
    if (activePh?.target?.pic && activePh.scene) {
      activePh.target.pic.simulation = {
        id: activePh.scene.id,
        states: JSON.parse(JSON.stringify(activePh.scene.states || {})),
        refs: JSON.parse(JSON.stringify(activePh.scene.refs || {}))
      };
    }

    list.forEach((t, idx) => {
      if (!t || !t.pic || (t.el && !t.el.isConnected)) return;
      let hotspot = null;
      try {
        if (wr && t.el && wr.width > 20 && wr.height > 20) {
          const r = t.el.getBoundingClientRect();
          if (r.width > 10 && r.height > 10 && r.bottom > wr.top && r.top < wr.bottom) {
            hotspot = {
              x: +(((r.left - wr.left) / wr.width) * 100).toFixed(2),
              y: +(((r.top - wr.top) / wr.height) * 100).toFixed(2),
              w: +((r.width / wr.width) * 100).toFixed(2),
              h: +((r.height / wr.height) * 100).toFixed(2)
            };
          }
        }
      } catch (_) {}

      if (t.pic.spatial) {
        if (!t.pic.shareId) t.pic.shareId = 'sp-' + (idx + 1);
        if (activeSp?.target === t) activeFocusId = t.pic.shareId;
        const kindName = window.NBSpatial?.kinds?.[t.pic.spatial.kind] || 'Hình 3D';
        items.push({
          id: t.pic.shareId,
          type: 'spatial',
          title: kindName + ' ' + (++spCount),
          scene: JSON.parse(JSON.stringify(t.pic.spatial)),
          hotspot
        });
      } else if (t.pic.simulation) {
        if (!t.pic.shareId) t.pic.shareId = 'ph-' + (idx + 1);
        if (activePh?.target === t) activeFocusId = t.pic.shareId;
        const simTitle = window.NBPhysics?.get?.(t.pic.simulation.id)?.title || ('Thí nghiệm ' + (++phCount));
        items.push({
          id: t.pic.shareId,
          type: 'physics',
          title: simTitle,
          simId: t.pic.simulation.id,
          states: t.pic.simulation.states || {},
          refs: (t.pic.simulation.refs && typeof t.pic.simulation.refs === 'object' && !Array.isArray(t.pic.simulation.refs)) ? t.pic.simulation.refs : {},
          hotspot
        });
      } else if (t.pic.url || t.pic.link || t.pic.html) {
        if (!t.pic.shareId) t.pic.shareId = 'rs-' + (idx + 1);
        const rawUrl = t.pic.url || t.pic.link?.url || '';
        let embedUrl = rawUrl;
        try {
          if (rawUrl && window.NBLinks?.parse) {
            const parsed = window.NBLinks.parse(rawUrl);
            if (parsed?.embed) embedUrl = parsed.embed;
          }
        } catch (_) {}
        const title = t.pic.title || t.pic.link?.title || ('Học liệu ' + (++rsCount));
        items.push({
          id: t.pic.shareId,
          type: 'resource',
          title,
          url: embedUrl,
          html: t.pic.html || '',
          hotspot
        });
      } else if (t.pic.ggb) {
        if (!t.pic.shareId) t.pic.shareId = 'ggb-' + (idx + 1);
        if (!activeFocusId) activeFocusId = t.pic.shareId;
        const is3D = t.pic.app === '3d';
        const title = is3D ? ('GeoGebra 3D ' + (++spCount)) : ('Đồ thị GeoGebra ' + (++rsCount));
        items.push({
          id: t.pic.shareId,
          type: 'resource',
          title,
          url: is3D ? 'https://www.geogebra.org/3d' : 'https://www.geogebra.org/classic',
          html: '',
          hotspot
        });
      }
    });

    if (activeSp?.scene && !items.some(x => x.type === 'spatial')) {
      const spId = 'sp-active';
      const kindName = window.NBSpatial?.kinds?.[activeSp.scene.kind] || 'Hình 3D';
      items.unshift({
        id: spId,
        type: 'spatial',
        title: kindName + ' (Đang mở)',
        scene: JSON.parse(JSON.stringify(activeSp.scene))
      });
      activeFocusId = spId;
    }
    if (activePh?.scene && !items.some(x => x.type === 'physics')) {
      const phId = 'ph-active';
      const simTitle = window.NBPhysics?.get?.(activePh.scene.id)?.title || 'Thí nghiệm Vật lí';
      items.unshift({
        id: phId,
        type: 'physics',
        title: simTitle + ' (Đang mở)',
        simId: activePh.scene.id,
        states: activePh.scene.states || {},
        refs: activePh.scene.refs || {}
      });
      activeFocusId = phId;
    }

    // Nếu giáo viên đang mở cửa sổ Xem nhanh học liệu (#onlineViewer), tự động đính kèm vào danh sách phát sang ĐT học sinh
    const viewerEl = document.getElementById('onlineViewer');
    if (viewerEl && (viewerEl.open || viewerEl.hasAttribute('open') || viewerEl.classList.contains('open'))) {
      const openLinkEl = document.getElementById('onlineOpenSource');
      const frameEl = document.querySelector('#onlineFrameHost iframe');
      const rawUrl = (openLinkEl && openLinkEl.href && openLinkEl.href !== location.href)
        ? openLinkEl.href
        : (frameEl?.src || '');
      let embedUrl = rawUrl;
      let vTitle = document.getElementById('onlineViewerTitle')?.textContent?.trim() || 'Học liệu tương tác';
      try {
        if (rawUrl && window.NBLinks?.parse) {
          const parsed = window.NBLinks.parse(rawUrl);
          if (parsed?.embed) embedUrl = parsed.embed;
          if (!vTitle && parsed?.label) vTitle = parsed.label;
        }
      } catch (_) {}
      if (embedUrl && /^https?:\/\//i.test(embedUrl)) {
        const existing = items.find(x => x.type === 'resource' && x.url === embedUrl);
        if (existing) {
          activeFocusId = existing.id;
        } else {
          items.push({
            id: 'rs-viewer',
            type: 'resource',
            title: vTitle,
            url: embedUrl,
            html: ''
          });
          activeFocusId = 'rs-viewer';
        }
      }
    }

    if (opts.extraItem && !items.some(x => x.id === opts.extraItem.id)) {
      items.unshift(opts.extraItem);
    }
    let focusId = opts.focusId || '';
    if (!focusId && opts.focusTarget?.pic?.shareId) {
      focusId = opts.focusTarget.pic.shareId;
    }
    if (!focusId && opts.extraItem?.id) {
      focusId = opts.extraItem.id;
    }
    if (!focusId && activeFocusId) {
      focusId = activeFocusId;
    }
    /* trang HTML / PhET đang ở chế độ Tương tác, hoặc đối tượng đang chọn */
    if (!focusId) {
      const liveObj = window.nbHtmlLive?.live;
      const sel = (typeof selected !== 'undefined' && Array.isArray(selected) && selected.length === 1) ? selected[0] : null;
      const t = liveObj || sel;
      if (t?.pic?.shareId) focusId = t.pic.shareId;
    }
    /* Chỉ gửi nội dung thầy cô đang tương tác — không gửi cả bảng, ảnh bảng hay các mục khác */
    const only = items.filter(x => x.id === focusId);
    const docTitle = document.getElementById('documentTitle')?.value || 'Bảng bài giảng';
    return {
      pageTitle: docTitle,
      focusId: only.length ? focusId : '',
      boardImage: null,
      items: only
    };
  }

  function updateShareSummaryUI(payload) {
    const sumEl = document.getElementById('liveShareSummary');
    const badgeEl = document.getElementById('liveShareStatusBadge');
    if (!sumEl || !badgeEl) return;
    if (!qrShareActive || !currentRoom) {
      badgeEl.textContent = 'Chưa phát bảng';
      badgeEl.style.color = '#64748b';
      return;
    }
    const items = payload?.items || [];
    const nSp = items.filter(x => x.type === 'spatial').length;
    const nPh = items.filter(x => x.type === 'physics').length;
    const nRs = items.filter(x => x.type === 'resource').length;
    const parts = items.map(x => (x.type === 'spatial' ? '🧊 ' : x.type === 'physics' ? '⚡ ' : '🌐 ') + x.title);   /* chỉ nội dung đang tương tác */
    void nSp; void nPh; void nRs;
    badgeEl.textContent = '● Đang chia sẻ QR';
    badgeEl.style.color = '#0f766e';
    sumEl.innerHTML = `Đã phát sang ĐT học sinh: <b>${parts.join(' · ')}</b>.<br><small style="color:#64748b;">Học sinh thao tác độc lập trên điện thoại; khi thầy cô phát câu hỏi sẽ tự hiện trên cùng phiên này.</small>`;
  }

  /* Trang HTML trên bảng (thí nghiệm 3D, mô phỏng HTML): gửi lên máy chủ một lần kèm mã băm; lần chia sẻ sau chỉ gửi mã.
     Học sinh tải trang qua máy chủ, chạy cách ly trên máy mình nên tự thao tác được. */
  const sentResources = new Map();     // mã phiên -> Map(id học liệu -> mã băm đã gửi)
  async function sha256Hex(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  async function packResources(roomId, payload) {
    const seen = sentResources.get(roomId) || new Map(); sentResources.set(roomId, seen);
    for (const it of payload.items) {
      if (it.type !== 'resource' || !it.html) continue;
      it.resHash = await sha256Hex(it.html);
      if (seen.get(it.id) === it.resHash) delete it.html;
    }
    return seen;
  }
  async function shareBoardToStudents(opts = {}) {
    clearTimeout(autoShareTimer);
    if (opts.enableAuto) {
      const chk = document.getElementById('liveAutoShareChk');
      if (chk) chk.checked = true;
    }
    const hadRoom = !!currentRoom;
    const room = await ensureRoom();
    if (!room) return null;
    const btn = document.getElementById('liveShareBoardBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang đồng bộ sang ĐT…'; }
    try {
      const payload = collectBoardPayload(opts);
      if (!payload.items.length) {
        if (opts.showQR) modal.style.display = 'flex';      /* học sinh vẫn quét mã vào phòng chờ trước */
        if (opts.toast !== false && typeof window.toast === 'function') window.toast('Hãy mở thí nghiệm / mô phỏng (bấm Tương tác) hoặc chọn đối tượng cần gửi cho học sinh rồi bấm Chia sẻ');
        return null;
      }
      const seenRes = await packResources(room.id, payload);
      const r = await hostFetch(`/api/live/host/${room.id}/share`, payload);
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || (r.status === 413 ? 'Trang HTML trên bảng quá lớn để chia sẻ.' : 'Không gửi được bảng sang điện thoại học sinh.'));
      }
      for (const it of payload.items) if (it.html && it.resHash) { seenRes.set(it.id, it.resHash); delete it.html; }
      qrShareActive = true;
      updateShareSummaryUI(payload);
      window.NBProjector?.onQrShareUpdate?.(room, payload);
      if (opts.showQR || (!hadRoom && opts.showQR !== false)) {
        modal.style.display = 'flex';
      }
      if (opts.toast !== false && typeof window.toast === 'function') {
        const count = payload.items.length;
        window.toast(count
          ? `Đã chia sẻ bảng & ${count} hoạt động (3D/Thí nghiệm/Học liệu) sang ĐT học sinh · Mã ${room.code}`
          : `Đã chia sẻ bảng giảng dạy sang ĐT học sinh · Mã ${room.code}`);
      }
      return { room, payload };
    } catch (e) {
      if (typeof window.toast === 'function') window.toast(e.message);
      return null;
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '📤 Chia sẻ / Cập nhật bảng sang ĐT'; }
    }
  }

  shareBox.querySelector('#liveShareBoardBtn').onclick = () => shareBoardToStudents({ showQR: false });

  // Nút "📱 Gửi sang ĐT học sinh" ngay trên thanh chọn đối tượng (#selBar) khi chọn Hình 3D, Thí nghiệm, Học liệu
  const selBarEl = document.getElementById('selBar');
  if (selBarEl && typeof placeSelBar === 'function') {
    const shareObjBtn = document.createElement('button');
    shareObjBtn.type = 'button';
    shareObjBtn.dataset.act = 'share-student';
    shareObjBtn.hidden = true;
    shareObjBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14 M13 6l6 6-6 6"/></svg><span>Điện thoại</span>';
    shareObjBtn.title = 'Gửi hoạt động này (3D / Thí nghiệm / Học liệu) sang điện thoại để học sinh tự thao tác độc lập (dùng chung mã QR)';
    shareObjBtn.onclick = () => {
      const target = (typeof selected !== 'undefined' && selected.length === 1) ? selected[0] : null;
      if (!target) return;
      shareBoardToStudents({ focusTarget: target, showQR: !currentRoom });
    };
    selBarEl.append(shareObjBtn);
    const prevPlaceSelBar = placeSelBar;
    placeSelBar = function () {
      prevPlaceSelBar.apply(this, arguments);
      const t = (typeof selected !== 'undefined' && selected.length === 1) ? selected[0] : null;
      const isInteractive = !!(t && t.pic && (t.pic.spatial || t.pic.simulation || t.pic.url || t.pic.link || t.pic.html));
      shareObjBtn.hidden = !isInteractive;
    };
  }

  // Nút "📱 Chia sẻ QR cho HS" trực tiếp trên thanh Thí nghiệm Vật lí (#physicsLiveBar), Hình 3D (#spatialBar), và Học liệu (#onlineViewer)
  function attachInteractiveToolbars() {
    const phBar = document.getElementById('physicsLiveBar');
    if (phBar && !phBar.querySelector('[data-physics-qr]')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ph-btn';
      b.dataset.physicsQr = '1';
      b.style.cssText = 'background:#ecfdf5;border-color:#0f766e;color:#0f766e;font-weight:700;';
      b.textContent = '📱 Chia sẻ QR cho HS';
      b.title = 'Phát thí nghiệm này sang điện thoại học sinh để các em tự kéo thanh trượt & làm thí nghiệm độc lập';
      b.onclick = () => shareBoardToStudents({ showQR: true });
      const doneBtn = phBar.querySelector('[data-physics="done"]');
      if (doneBtn) phBar.insertBefore(b, doneBtn);
      else phBar.append(b);
    }

    const spRow = document.querySelector('#spatialBar .sp-row');
    if (spRow && !spRow.querySelector('[data-sp-qr]')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sp-btn';
      b.dataset.spQr = '1';
      b.style.cssText = 'background:#ecfdf5;border-color:#0f766e;color:#0f766e;font-weight:700;';
      b.textContent = '📱 Chia sẻ QR cho HS';
      b.title = 'Phát hình 3D này sang điện thoại học sinh để các em tự xoay 360°, trải phẳng, cắt mặt phẳng độc lập';
      b.onclick = () => shareBoardToStudents({ showQR: true });
      const doneBtn = spRow.querySelector('[data-sp="done"]');
      if (doneBtn) spRow.insertBefore(b, doneBtn);
      else spRow.append(b);
    }

    const onlRow = document.querySelector('#onlineViewer .nb-online-row');
    if (onlRow && !onlRow.querySelector('[data-online-qr]')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'setting-btn';
      b.dataset.onlineQr = '1';
      b.style.cssText = 'background:#ecfdf5;border-color:#0f766e;color:#0f766e;font-weight:700;';
      b.textContent = '📱 Chia sẻ QR cho HS';
      b.title = 'Phát học liệu tương tác này sang điện thoại học sinh để các em tự thao tác độc lập';
      b.onclick = () => shareBoardToStudents({ showQR: true });
      onlRow.insertBefore(b, onlRow.firstChild);
    }
  }
  attachInteractiveToolbars();

  // Tự động đồng bộ bảng & học liệu khi giáo viên thêm/chỉnh sửa hình 3D, Thí nghiệm, Học liệu trên bảng (nếu đang bật chia sẻ QR)
  function scheduleAutoShare(delay = 650) {
    if (!qrShareActive || !currentRoom) return;
    if (!stage.hidden && stageShow === 'live' && liveCurrentQ && !stageState.locked) return;
    const chk = document.getElementById('liveAutoShareChk');
    if (chk && !chk.checked) return;
    clearTimeout(autoShareTimer);
    autoShareTimer = setTimeout(() => {
      if (qrShareActive && currentRoom && (stage.hidden || stageShow !== 'live' || !liveCurrentQ || stageState.locked)) {
        shareBoardToStudents({ toast: false, showQR: false });
      }
    }, delay);
  }
  if (typeof historyCommit === 'function') {
    const prevHistoryCommit = historyCommit;
    historyCommit = function () {
      const res = prevHistoryCommit.apply(this, arguments);
      scheduleAutoShare(700);
      return res;
    };
  }
  function hookMethod(obj, method, delay = 400) {
    if (!obj || typeof obj[method] !== 'function') return;
    const prev = obj[method];
    obj[method] = function () {
      const res = prev.apply(this, arguments);
      scheduleAutoShare(delay);
      return res;
    };
  }
  hookMethod(window.NBSpatialBoard, 'insert', 400);
  hookMethod(window.NBSpatialBoard, 'enter', 350);
  hookMethod(window.NBSpatialBoard, 'finish', 400);
  hookMethod(window.NBPhysicsBoard, 'insert', 400);
  hookMethod(window.NBPhysicsBoard, 'enter', 350);
  hookMethod(window.NBPhysicsBoard, 'finish', 400);
  hookMethod(window.NBOnline, 'insert', 400);
  hookMethod(window.NBOnline, 'embed', 400);
  hookMethod(window.NBOnline, 'openLink', 350);

  window.NBLiveSession = {
    ensureRoom,
    shareBoard: shareBoardToStudents,
    showQR: () => {
      if (currentRoom) modal.style.display = 'flex';
      else shareBoardToStudents({ showQR: true });
    },
    get room() { return currentRoom; },
    get sharing() { return qrShareActive && !!currentRoom; }
  };

  /* ---- Bảng bên phải kéo rộng sang trái (mép trái của bảng) ---- */
  {
    const grip = document.createElement('div');
    grip.id = 'panelResize'; grip.title = 'Kéo sang trái để mở rộng bảng';
    grip.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:10px;cursor:ew-resize;z-index:20;touch-action:none;';
    panel.append(grip);
    const syncGrip = () => {
      const st = panel.scrollTop || 0;
      grip.style.top = st + 'px';
      grip.style.bottom = (-st) + 'px';
    };
    panel.addEventListener('scroll', syncGrip, { passive: true });
    const apply = w => { panel.style.width = w + 'px'; syncGrip(); if (typeof window.fit === 'function') window.fit(); };
    try { const w = +localStorage.getItem('nbPanelWidth'); if (w >= 260) apply(Math.min(w, Math.round(innerWidth * .6))); } catch (_) {}
    grip.addEventListener('pointerdown', e => {
      e.preventDefault(); grip.setPointerCapture(e.pointerId);
      grip.onpointermove = ev => apply(Math.round(Math.max(260, Math.min(innerWidth * .6, innerWidth - ev.clientX))));
      grip.onpointerup = grip.onpointercancel = () => { grip.onpointermove = null; try { localStorage.setItem('nbPanelWidth', parseInt(panel.style.width, 10)); } catch (_) {} };
    });
    grip.addEventListener('dblclick', () => { panel.style.width = ''; syncGrip(); try { localStorage.removeItem('nbPanelWidth'); } catch (_) {} if (typeof window.fit === 'function') window.fit(); });
  }

})();
