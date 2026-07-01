/**
 * Căn lớp HTML theo khung canvas Phaser (Scale.EXPAND / letterbox).
 * @param {import('phaser').Game} game
 * @param {HTMLElement} el
 * @returns {() => void}
 */
export function bindHtmlOverlayToCanvas(game, el) {
  const update = () => {
    const canvas = game.canvas;
    if (!canvas || !el) return;
    const r = canvas.getBoundingClientRect();
    el.style.left = `${r.left}px`;
    el.style.top = `${r.top}px`;
    el.style.width = `${r.width}px`;
    el.style.height = `${r.height}px`;
  };

  update();
  window.addEventListener('resize', update);
  window.visualViewport?.addEventListener('resize', update);
  game.scale.on('resize', update);

  return () => {
    window.removeEventListener('resize', update);
    window.visualViewport?.removeEventListener('resize', update);
    game.scale.off('resize', update);
  };
}
