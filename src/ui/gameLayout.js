/**
 * Bố cục gameplay theo kích thước world (375×812) — stack cột / kho / ritual không chồng nhau.
 * @param {number} w
 * @param {number} h
 */
export function computeGameLayout(w, h) {
  const hudBottom = 108;
  const bottomPad = 14;
  const ritualH = 56;
  const ritualGap = 10;
  const poolH = 92;
  const columnPoolGap = 14;
  const minColumnH = 160;

  const ritualY = h - bottomPad - ritualH / 2;
  const ritualHintY = ritualY - ritualH / 2 - 20;

  const poolY = h - bottomPad - ritualH - ritualGap - poolH / 2;
  const poolTop = poolY - poolH / 2;

  const viewportTopY = Math.round(hudBottom + 6);
  let viewportBottomY = Math.round(poolTop - columnPoolGap);

  if (viewportBottomY - viewportTopY < minColumnH) {
    viewportBottomY = viewportTopY + minColumnH;
  }

  const collectLaneY = Math.round(hudBottom + (viewportBottomY - hudBottom) * 0.22);

  return {
    columnX: Math.round(w / 2),
    viewportTopY,
    viewportBottomY,
    poolY: Math.round(poolY),
    poolH,
    ritualY: Math.round(ritualY),
    ritualHintY: Math.round(ritualHintY),
    collectLaneY,
  };
}
