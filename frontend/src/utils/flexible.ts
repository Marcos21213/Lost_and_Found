const DESIGN_WIDTH = 375;
const MIN_WIDTH = 320;
const MAX_WIDTH = 640;

const setRootFontSize = () => {
  const viewportWidth = Math.min(Math.max(window.innerWidth, MIN_WIDTH), MAX_WIDTH);
  document.documentElement.style.fontSize = `${(viewportWidth / DESIGN_WIDTH) * 16}px`;
};

setRootFontSize();
window.addEventListener('resize', setRootFontSize);
window.addEventListener('orientationchange', setRootFontSize);
