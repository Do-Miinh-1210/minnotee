/* MinNote UI v2 "Atelier" — giao diện mặc định. Giao diện cũ (v1) vẫn dùng được:
   ?ui=v1 / ?ui=v2 trên URL, hoặc Ctrl+Alt+U trong app. Lựa chọn được nhớ trong localStorage. */
(function () {
  var KEY = 'minnote_ui';
  var root = document.documentElement;
  function apply(v) {
    if (v === 'v2') root.setAttribute('data-ui', 'v2');
    else root.removeAttribute('data-ui');
  }
  var v = null;
  try {
    var q = new URLSearchParams(location.search).get('ui');
    if (q === 'v1' || q === 'v2') localStorage.setItem(KEY, q);
    v = localStorage.getItem(KEY);
  } catch (_) {}
  apply(v === 'v1' ? 'v1' : 'v2');  // chưa chọn gì → Atelier

  /* Màu hiệu ứng chọn / rê chuột / phát lại dựng hình trên canvas (bundle gọi qua móc
     scripts/apply_highlight_theme_patch.js). v1: xanh ngọc cũ; v2: tím iris của Atelier. */
  globalThis.__mnHi = function (alpha) {
    var rgb;
    if (root.getAttribute('data-ui') === 'v2') rgb = root.classList.contains('dark') ? '148,136,255' : '108,92,245';
    else rgb = '13,148,136';
    return (alpha === undefined || alpha === '') ? 'rgb(' + rgb + ')' : 'rgba(' + rgb + ',' + alpha + ')';
  };

  window.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.altKey && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      var next = root.getAttribute('data-ui') === 'v2' ? 'v1' : 'v2';
      try { localStorage.setItem(KEY, next); } catch (_) {}
      apply(next);
      window.dispatchEvent(new Event('resize'));
    }
  }, true);

  /* Menu thả xuống mở từ thanh công cụ: tự phát hiện thanh ngang (Trên/Dưới) hay thanh dọc (Trái/Phải)
     để mở đúng hướng (dưới nút, trên nút, bên phải hoặc bên trái) mà không đè lên nút hay tràn màn hình. */
  function placeRailMenu(menu) {
    if (root.getAttribute('data-ui') !== 'v2') return;
    var rail = menu.closest('.tb-group.tools');
    var holder = menu.closest('.dropdown');
    var btn = holder && holder.querySelector('.tb');
    if (!rail || !btn) return;
    var aside = rail.closest('aside.tools-bar');
    var railRect = (aside || rail).getBoundingClientRect();
    var b = btn.getBoundingClientRect();
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var mRect = menu.getBoundingClientRect();
    var mw = mRect.width || 220;
    var natural = Math.min(menu.scrollHeight + 2, vh - 16);
    var isHoriz = (aside && (aside.classList.contains('side-bottom') || aside.classList.contains('side-top'))) || (railRect.width > railRect.height);
    var isRight = (aside && aside.classList.contains('side-right')) || (!isHoriz && railRect.left > vw / 2);
    var left, top, maxH;
    if (isHoriz) {
      left = Math.round(Math.max(8, Math.min(b.left, vw - mw - 8)));
      if ((aside && aside.classList.contains('side-bottom')) || railRect.top > vh / 2) {
        top = Math.round(Math.max(8, railRect.top - natural - 6));
        maxH = Math.round(Math.max(120, railRect.top - top - 6));
      } else {
        top = Math.round(Math.min(vh - 120, railRect.bottom + 6));
        maxH = Math.round(Math.max(120, vh - top - 8));
      }
    } else if (isRight) {
      left = Math.round(Math.max(8, railRect.left - mw - 8));
      top = Math.round(Math.max(8, Math.min(b.top - 6, vh - natural - 8)));
      maxH = Math.round(vh - top - 8);
    } else {
      left = Math.round(Math.min(vw - mw - 8, railRect.right + 8));
      top = Math.round(Math.max(8, Math.min(b.top - 6, vh - natural - 8)));
      maxH = Math.round(vh - top - 8);
    }
    var s = menu.style;
    if (s.getPropertyValue('left') !== left + 'px' || s.getPropertyPriority('left') !== 'important') s.setProperty('left', left + 'px', 'important');
    if (s.getPropertyValue('top') !== top + 'px' || s.getPropertyPriority('top') !== 'important') s.setProperty('top', top + 'px', 'important');
    if (s.getPropertyValue('max-height') !== maxH + 'px' || s.getPropertyPriority('max-height') !== 'important') s.setProperty('max-height', maxH + 'px', 'important');
  }
  function scanMenus() {
    var list = document.querySelectorAll('.tb-group.tools .dropdown-menu');
    for (var i = 0; i < list.length; i++) placeRailMenu(list[i]);
  }
  function startMenus() {
    var queued = false;
    new MutationObserver(function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; scanMenus(); });
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    window.addEventListener('resize', scanMenus);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startMenus);
  else startMenus();
})();
