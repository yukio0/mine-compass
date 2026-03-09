/* minecompass-utils.js
 * Small utilities.
 */
(() => {
  window.MineCompass = window.MineCompass || {};

  function toAxisLabel(n) {
    return String(n);
  }

  function cellCoord(r, c) {
    return `${r + 1}-${c + 1}`;
  }

  function neighbors(r, c, rows, cols) {
    const out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const rr = r + dr;
        const cc = c + dc;
        if (0 <= rr && rr < rows && 0 <= cc && cc < cols) out.push([rr, cc]);
      }
    }
    return out;
  }

  function orthoNeighbors(r, c, rows, cols) {
    const out = [];
    if (r - 1 >= 0) out.push([r - 1, c]);
    if (r + 1 < rows) out.push([r + 1, c]);
    if (c - 1 >= 0) out.push([r, c - 1]);
    if (c + 1 < cols) out.push([r, c + 1]);
    return out;
  }

  function wheelPrimaryDelta(e) {
    return Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  }

  window.MineCompass.utils = {
    toAxisLabel,
    cellCoord,
    neighbors,
    orthoNeighbors,
    wheelPrimaryDelta,
  };
})();
