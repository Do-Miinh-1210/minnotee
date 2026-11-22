/* MinNote UI v2 — công tắc bật/tắt giao diện thử nghiệm.
   ?ui=v2 / ?ui=v1 trên URL, hoặc Ctrl+Alt+U trong app. Lựa chọn được nhớ trong localStorage. */
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
  apply(v);
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
