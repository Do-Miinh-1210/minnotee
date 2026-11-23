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

  /* Màu hiệu ứng chọn / rê chuột / phát lại dựng hình trên canvas (hệ sinh thái MinNote / MinMath). */
  globalThis.__mnHi = function (alpha) {
    var rgb;
    if (root.getAttribute('data-ui') === 'v2') rgb = root.classList.contains('dark') ? '96,165,250' : '37,99,235';
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
})();
