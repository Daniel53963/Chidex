document.addEventListener('DOMContentLoaded', function () {
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function updateIcon() {
    btn.textContent = currentTheme() === 'light' ? '☀️' : '🌙';
  }

  updateIcon();

  btn.addEventListener('click', function () {
    var next = currentTheme() === 'light' ? 'dark' : 'light';
    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    try { localStorage.setItem('chidex-theme', next); } catch (e) {}
    updateIcon();
  });
});
