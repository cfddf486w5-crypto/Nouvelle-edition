export function initRouter() {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.module').forEach((mod) => mod.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.target)?.classList.add('active');
    });
  });

  document.querySelectorAll('.sub-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sub-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('#module2 .submodule').forEach((mod) => mod.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.subtarget)?.classList.add('active');
    });
  });
}
