// js/theme.js — Force dark mode (light mode removed)

(() => {
  document.documentElement.setAttribute('data-theme', 'dark');
  localStorage.removeItem('interface-theme');
})();