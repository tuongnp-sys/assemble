/**
 * Giữ canvas lấp đầy viewport khi xoay máy / Safari thanh URL ẩn-hiện.
 * @param {Phaser.Game} game
 */
export function bindScaleRefresh(game) {
  const refresh = () => {
    if (game?.scale) {
      game.scale.refresh();
    }
  };

  window.addEventListener('resize', refresh);
  window.visualViewport?.addEventListener('resize', refresh);
  window.visualViewport?.addEventListener('scroll', refresh);
  window.addEventListener('orientationchange', () => {
    setTimeout(refresh, 100);
  });
}
