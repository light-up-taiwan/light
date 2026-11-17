// 台灣本島輪廓與點位（前台地圖與分享卡共用）
//
// 第 1 階段：1,963 個點（黃仁勳出生的 1963 年）。
// 亮滿之後進入第 2 階段：點距減半，原本的點全部保留、亮著，中間長出新的、更小的點；
// 以此類推，沒有上限。第 N 則留言永遠對應同一個位置。
(function () {
  const OUTLINE = [[121.53,25.30],[121.64,25.22],[121.74,25.15],[121.86,25.10],[122.00,25.01],[121.90,24.93],[121.83,24.85],
  [121.82,24.72],[121.86,24.60],[121.85,24.48],[121.76,24.30],[121.68,24.12],[121.62,23.98],[121.56,23.78],[121.50,23.58],
  [121.45,23.38],[121.38,23.13],[121.27,22.95],[121.15,22.75],[121.02,22.60],[120.92,22.40],[120.88,22.20],[120.86,22.02],
  [120.84,21.90],[120.73,21.93],[120.70,22.05],[120.62,22.25],[120.53,22.37],[120.45,22.45],[120.33,22.55],[120.27,22.62],
  [120.22,22.80],[120.17,22.93],[120.10,23.05],[120.05,23.16],[120.10,23.32],[120.13,23.48],[120.15,23.65],[120.20,23.80],
  [120.30,24.00],[120.40,24.12],[120.50,24.27],[120.60,24.42],[120.70,24.58],[120.82,24.72],[120.92,24.85],[121.02,24.98],
  [121.15,25.07],[121.30,25.13],[121.40,25.18],[121.45,25.25],[121.53,25.30]];
  const COS = Math.cos(23.7 * Math.PI / 180);
  const B = { lonMin: 119.95, lonMax: 122.1, latMin: 21.82, latMax: 25.38 };
  const STEP0 = 0.03874;        // 這個間距剛好排出 1,963 個點
  const MAX_LEVEL = 6;          // 第 6 階段約 200 萬個點，實務上等於沒有上限

  function inPoly(x, y) {
    let c = false;
    for (let i = 0, j = OUTLINE.length - 1; i < OUTLINE.length; j = i++) {
      const [xi, yi] = OUTLINE[i], [xj, yj] = OUTLINE[j];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }
  function shuffle(arr, seed) {
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  }

  // levels[k] = 第 k 階段「新增」的點（依點亮順序）；caps[k] = 到第 k 階段為止的總點數
  const levels = [null], caps = [0];
  function build(k) {
    const step = STEP0 / Math.pow(2, k - 1), dx = step / COS, pts = [];
    for (let r = 0; B.latMax - r * step > B.latMin; r++) {
      const la = B.latMax - r * step;
      for (let c = 0; B.lonMin + (c + (r % 2) * .5) * dx < B.lonMax; c++) {
        // 上一階段已有的點：偶數列，且欄位對得上
        if (k > 1 && r % 2 === 0 && (c % 2) === ((r / 2) % 2)) continue;
        const lo = B.lonMin + (c + (r % 2) * .5) * dx;
        if (inPoly(lo, la)) pts.push({ lo, la });
      }
    }
    levels[k] = shuffle(pts, 20261117 + k * 7919);
    caps[k] = caps[k - 1] + pts.length;
  }
  function ensure(k) { k = Math.min(k, MAX_LEVEL); while (levels.length <= k) build(levels.length); return k; }
  ensure(1);

  // 第 total 則留言時，地圖處在第幾階段
  function levelFor(total) {
    let k = 1;
    while (k < MAX_LEVEL) { ensure(k); if (total <= caps[k]) return k; k++; }
    ensure(MAX_LEVEL); return MAX_LEVEL;
  }
  // 第 n 則留言的位置（超過最後一階段就從頭循環）
  function pointOf(n) {
    const k = levelFor(n), cap = caps[MAX_LEVEL] || Infinity;
    if (n > cap) n = ((n - 1) % cap) + 1;
    ensure(k);
    return levels[k][n - caps[k - 1] - 1];
  }
  // 第 L 階段要畫的所有點，附上對應的留言編號 n
  function pointsUpTo(L) {
    ensure(L); const out = [];
    for (let k = 1; k <= L; k++) levels[k].forEach((p, i) => out.push({ lo: p.lo, la: p.la, n: caps[k - 1] + i + 1 }));
    return out;
  }
  // 投影到 (x0, y0, w, h) 的框內；r(L) 是第 L 階段的點半徑
  function projector(x0, y0, w, h) {
    const gw = (B.lonMax - B.lonMin) * COS, gh = B.latMax - B.latMin, s = Math.min(w / gw, h / gh);
    const ox = x0 + (w - gw * s) / 2, oy = y0 + (h - gh * s) / 2;
    return {
      xy: p => [ox + (p.lo - B.lonMin) * COS * s, oy + (B.latMax - p.la) * s],
      r: L => STEP0 * s * 0.32 / Math.pow(2, L - 1) * (L > 1 ? 1.15 : 1)
    };
  }

  window.TAIWAN = {
    GOAL: caps[1], ASPECT: 0.62, MAX_LEVEL,
    levelFor, pointOf, pointsUpTo, projector,
    cap: k => { ensure(k); return caps[Math.min(k, MAX_LEVEL)]; }
  };
})();
