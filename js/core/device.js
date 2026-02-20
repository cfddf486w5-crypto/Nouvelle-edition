export function detectDevice() {
  const ua = navigator.userAgent || '';
  const isIPhone = /iPhone/i.test(ua);
  const iOSVersion = (ua.match(/OS (\d+)_/) || [])[1] || '';
  return {
    isIPhone,
    iOSVersion,
    screen: { width: window.innerWidth, height: window.innerHeight },
    touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    orientation: window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape'
  };
}

export function applyIPhoneOptimizations() {
  document.documentElement.style.fontSize = '16px';
  document.addEventListener('touchend', () => {}, { passive: true });
}
