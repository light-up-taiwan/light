(function () {
  const C = window.CONFIG || {};
  const API = window.API;
  const T = window.TAIWAN;
  const t = (k, ...a) => I18N.t(k, ...a);
  const $ = id => document.getElementById(id);
  const GOAL = T.GOAL;   // 1,963
  const SITE = (C.SITE_URL || location.origin + location.pathname.replace(/index\.html$/, '')).replace(/\/$/, '');

  if (!API.live) $('demo').hidden = false;

  // ---------- 來源標記：?from=threads 之類，第一次進站時記下 ----------
  let SRC = '';
  try {
    const q = new URLSearchParams(location.search).get('from');
    if (q && /^[A-Za-z0-9_-]{1,20}$/.test(q) && !localStorage.getItem('lt_src')) localStorage.setItem('lt_src', q.toLowerCase());
    SRC = localStorage.getItem('lt_src') || '';
  } catch (e) {}

  // ---------- 狀態 ----------
  let total = 0, mine = null, threshold = 3;
  const litAt = new Map();          // 留言編號 n → 亮起的時間（做動畫）

  // ---------- 地圖 ----------
  // 第 1 階段 1,963 個點；亮滿之後點距減半，原本的燈都還亮著，中間長出更小、更密的新點，沒有上限。
  const cv = $('cv'), ctx = cv.getContext('2d'), stage = $('stage'), tip = $('tip');
  let W = 0, H = 0, PJ = null, L = 1, PTS = [], layer = null, layerKey = '';
  function sprite(col) {
    const c = document.createElement('canvas'), S = 64; c.width = c.height = S;
    const x = c.getContext('2d'), g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, `rgba(${col},.6)`); g.addColorStop(1, `rgba(${col},0)`);
    x.fillStyle = g; x.fillRect(0, 0, S, S); return c;
  }
  const GOLD = sprite('255,211,106'), GREEN = sprite('123,224,165');
  function resize() {
    const r = stage.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    if (!r.width) return;
    W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    PJ = T.projector(0, 0, W, H); layerKey = '';
  }
  // 靜態圖層：只有點數、階段或尺寸改變時才重畫，點再多也不會卡
  function buildLayer() {
    L = T.levelFor(Math.max(total, 1));
    const key = [L, total, W, H].join('|');
    if (key === layerKey) return;
    layerKey = key;
    const dpr = window.devicePixelRatio || 1;
    if (!layer) layer = document.createElement('canvas');
    layer.width = W * dpr; layer.height = H * dpr;
    const g = layer.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const R = PJ.r(L);
    PTS = T.pointsUpTo(L).map(p => { const [x, y] = PJ.xy(p); return { x, y, n: p.n }; });
    g.fillStyle = 'rgba(120,140,175,.22)'; g.beginPath();
    for (const p of PTS) if (p.n > total) { g.moveTo(p.x + R * .8, p.y); g.arc(p.x, p.y, R * .8, 0, 6.283); }
    g.fill();
    const gr = R * 3.4;
    g.globalAlpha = L > 1 ? .75 : .9;
    for (const p of PTS) if (p.n <= total) g.drawImage(GOLD, p.x - gr, p.y - gr, gr * 2, gr * 2);
    g.globalAlpha = 1; g.fillStyle = '#fff3cf'; g.beginPath();
    for (const p of PTS) if (p.n <= total) { g.moveTo(p.x + R, p.y); g.arc(p.x, p.y, R, 0, 6.283); }
    g.fill();
  }
  function draw(now) {
    if (PJ && W) {
      buildLayer();
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = .9 + .1 * Math.sin(now / 900);      // 整片燈輕輕呼吸
      ctx.drawImage(layer, 0, 0, W, H); ctx.globalAlpha = 1;
      const R = PJ.r(L);
      for (const [n, born] of litAt) {                      // 剛亮起的燈：光暈放大再收回
        const age = (now - born) / 1500;
        if (age > 1) { litAt.delete(n); continue; }
        const [x, y] = PJ.xy(T.pointOf(n)), gr = Math.max(R, 2) * 3.4 * (1 + (1 - age) * 4);
        ctx.globalAlpha = 1 - age; ctx.drawImage(GOLD, x - gr, y - gr, gr * 2, gr * 2); ctx.globalAlpha = 1;
      }
      if (mine) {                                            // 自己的燈：綠色、最上層
        const [x, y] = PJ.xy(T.pointOf(mine.n)), Rm = Math.max(R, 2.2), gr = Rm * 7 * (1 + .25 * Math.sin(now / 400));
        ctx.drawImage(GREEN, x - gr, y - gr, gr * 2, gr * 2);
        ctx.fillStyle = '#d6ffe6'; ctx.beginPath(); ctx.arc(x, y, Rm * 1.6, 0, 6.283); ctx.fill();
      }
    }
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize', resize);
  try { new ResizeObserver(resize).observe(stage); } catch (e) {}
  resize(); requestAnimationFrame(draw);

  // ---------- 點燈看留言 ----------
  function nearestLit(cx, cy) {
    let best = null, bd = Infinity;
    for (const p of PTS) { if (p.n > total) continue; const d = (p.x - cx) ** 2 + (p.y - cy) ** 2; if (d < bd) { bd = d; best = p; } }
    return best && bd <= Math.max(PJ.r(L) * 6, 18) ** 2 ? best : null;
  }
  function placeTip(p) {
    tip.classList.add('show');
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = Math.max(0, Math.min(W - tw, p.x - tw / 2)) + 'px';
    tip.style.top = (p.y - th - 14 < 0 ? p.y + 14 : p.y - th - 14) + 'px';
  }
  async function openDot(p) {
    const n = p.n;
    tip.innerHTML = ''; tip.append(el('div', 'no', t('loading'))); placeTip(p);
    try {
      const m = await API.message(n);
      tip.innerHTML = '';
      const no = el('div', 'no', t('light_no', n.toLocaleString()));
      if (m.state === 'ok') {
        tip.append(no, el('div', '', t('q', m.text)), el('div', 'who', '— ' + (m.sig || t('anon'))));
        const acts = el('div', 'acts');
        if (!(mine && mine.n === n)) acts.append(reportBtn(n, () => tip.classList.remove('show')));
        acts.append(el('span'));
        tip.append(acts);
      } else if (m.state === 'pending') {
        tip.append(no, el('div', 'no', t('tip_pending')));
      } else if (m.state === 'removed') {
        tip.append(no, el('div', 'no', t('tip_removed')));
      } else {
        tip.append(no, el('div', 'no', t('tip_none')));
      }
      placeTip(p);
    } catch (e) { tip.innerHTML = ''; tip.append(el('div', 'no', I18N.err(e.message))); placeTip(p); }
  }
  cv.addEventListener('click', e => {
    const r = cv.getBoundingClientRect(), p = nearestLit(e.clientX - r.left, e.clientY - r.top);
    if (!p) { tip.classList.remove('show'); return; }
    openDot(p);
  });
  document.addEventListener('click', e => { if (!stage.contains(e.target)) tip.classList.remove('show'); });

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  // ---------- 檢舉 ----------
  function reportBtn(n, after) {
    const b = el('button', 'linkbtn', t('rep'));
    b.type = 'button';
    b.addEventListener('click', async ev => {
      ev.stopPropagation();
      if (!confirmInline(b)) return;
      try {
        await ensureSession();
        const r = await API.report(n);
        b.replaceWith(el('span', 'no', r === 'already' ? t('rep_already') : r === 'pending' ? t('rep_pending') : t('rep_ok')));
        if (r === 'pending') { refreshRecent(); if (after) setTimeout(after, 1500); }
      } catch (e) { b.replaceWith(el('span', 'no', e.message)); }
    });
    return b;
  }
  // 第一次按「檢舉」→ 變成「確定檢舉？」，再按一次才送出（避免誤觸）
  function confirmInline(b) {
    if (b.dataset.sure) return true;
    b.dataset.sure = '1'; b.textContent = t('rep_sure'); b.style.color = 'var(--warn)';
    return false;
  }

  // ---------- 人機驗證 ----------
  async function ensureSession() {
    if (await API.session()) return;
    let token = null;
    if (API.needCaptcha) {
      const modal = $('verify'); modal.classList.add('show');
      try {
        token = await Promise.race([
          API.captchaToken($('ts')),
          new Promise((_, fail) => { $('verifyCancel').onclick = () => fail(new Error(t('v_cancelled'))); })
        ]);
      } finally { modal.classList.remove('show'); }
    }
    await API.signInAnon(token);
  }

  // ---------- 表單 ----------
  const msgEl = $('msg'), sigEl = $('sig'), btn = $('btn'), st = $('status');
  let busy = false;
  let lastSay = null;
  function setStatus(text, err) { lastSay = null; st.textContent = text; st.classList.toggle('err', !!err); }
  function say(key, err, ...args) { st.textContent = t(key, ...args); st.classList.toggle('err', !!err); lastSay = [key, err, args]; }
  function upd() { $('len').textContent = msgEl.value.length + ' / 80'; btn.disabled = busy || !msgEl.value.trim(); }
  msgEl.addEventListener('input', upd);

  $('f').addEventListener('submit', async e => {
    e.preventDefault();
    const text = msgEl.value.trim(), sig = sigEl.value.trim();
    if (!text) return;
    busy = true; upd(); say('st_posting');
    try {
      await ensureSession();
      const first = !mine;
      const n = await API.post(text, sig, SRC);
      mine = { n, text, sig, status: 'visible' };
      if (n > total) total = n;
      litAt.set(n, performance.now());
      showMine();
      first ? say('st_first', false, n.toLocaleString()) : say('st_updated');
      render(); refreshRecent();
      if (first) openShare();
    } catch (err) { err.message ? setStatus(I18N.err(err.message), true) : say('st_sendfail', true); }
    busy = false; upd();
  });

  function showMine() {
    if (!mine) return;
    btn.textContent = t('btn_edit');
    $('mineActs').classList.add('show');
  }

  // ---------- 分享 ----------
  const shareUrl = () => SITE + '/?from=share';
  $('copyBtn').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(shareUrl()); say('st_copied'); }
    catch (e) { setStatus(t('st_copyfail') + shareUrl(), true); }
  });
  $('shareBtn').addEventListener('click', openShare);
  $('shareClose').addEventListener('click', () => $('shareModal').classList.remove('show'));
  let cardBlob = null;
  async function openShare() {
    if (!mine) return;
    $('shareModal').classList.add('show');
    $('cardImg').removeAttribute('src');
    try { await document.fonts.load('700 60px "Noto Sans TC"'); await document.fonts.load('400 40px "Noto Sans TC"'); } catch (e) {}
    const c = makeCard(mine.n, mine.text, mine.sig);
    cardBlob = await new Promise(r => c.toBlob(r, 'image/png'));
    const url = URL.createObjectURL(cardBlob);
    $('cardImg').src = url; $('dlCard').href = url;
    const canFile = !!(navigator.canShare && navigator.canShare({ files: [new File([cardBlob], 'x.png', { type: 'image/png' })] }));
    $('doShare').hidden = !canFile && !navigator.share;
    $('shareHint').textContent = canFile ? t('s_hint_file') : t('s_hint_img');
  }
  $('doShare').addEventListener('click', async () => {
    const text = t('share_text', mine.n.toLocaleString());
    try {
      const file = new File([cardBlob], `點亮台灣-${mine.n}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text: text + ' ' + shareUrl() });
      else await navigator.share({ text, url: shareUrl() });
    } catch (e) { /* 使用者取消分享 */ }
  });

  function makeCard(n, text, sig) {
    const Wc = 1080, Hc = 1350, c = document.createElement('canvas'); c.width = Wc; c.height = Hc;
    const x = c.getContext('2d');
    const bg = x.createRadialGradient(Wc / 2, 420, 50, Wc / 2, 520, 900);
    bg.addColorStop(0, '#16264a'); bg.addColorStop(1, '#070b14'); x.fillStyle = bg; x.fillRect(0, 0, Wc, Hc);
    // 地圖
    const mapH = 820, mapW = mapH * T.ASPECT, mx = 50, my = 330;
    const pj = T.projector(mx, my, mapW, mapH), Lc = T.levelFor(Math.max(total, 1)), pr = pj.r(Lc);
    const cpts = T.pointsUpTo(Lc);
    x.fillStyle = 'rgba(120,140,175,.25)'; x.beginPath();
    for (const q of cpts) if (q.n > total) { const [a, b] = pj.xy(q); x.moveTo(a + pr * .8, b); x.arc(a, b, pr * .8, 0, 6.283); }
    x.fill();
    for (const q of cpts) if (q.n <= total && q.n !== n) { const [a, b] = pj.xy(q), g = pr * 3.2; x.drawImage(GOLD, a - g, b - g, g * 2, g * 2); }
    x.fillStyle = '#fff3cf'; x.beginPath();
    for (const q of cpts) if (q.n <= total && q.n !== n) { const [a, b] = pj.xy(q); x.moveTo(a + pr, b); x.arc(a, b, pr, 0, 6.283); }
    x.fill();
    const [ma, mb] = pj.xy(T.pointOf(n)), mr = Math.max(pr, 5), gg = mr * 18;
    x.drawImage(GREEN, ma - gg, mb - gg, gg * 2, gg * 2); x.drawImage(GREEN, ma - gg / 2, mb - gg / 2, gg, gg);
    x.fillStyle = '#eafff1'; x.beginPath(); x.arc(ma, mb, mr * 2.6, 0, 6.283); x.fill();
    x.strokeStyle = 'rgba(123,224,165,.9)'; x.lineWidth = 3; x.beginPath(); x.arc(ma, mb, mr * 7, 0, 6.283); x.stroke();
    // 文字
    const F = '"Noto Sans TC", system-ui, sans-serif';
    x.textBaseline = 'top'; x.fillStyle = '#8592a8'; x.font = `400 34px ${F}`;
    x.fillText(t('c_top'), 80, 90);
    x.fillStyle = '#e9eef7'; x.font = `700 64px ${F}`; x.fillText(t('c_l1'), 80, 140);
    x.fillStyle = '#ffd36a'; x.shadowColor = 'rgba(255,211,106,.6)'; x.shadowBlur = 24;
    x.fillText(t('c_l2', n.toLocaleString()), 80, 216); x.shadowBlur = 0;
    // 右側留言
    const tx = mx + mapW + 30, tw = Wc - tx - 70;
    x.font = `500 44px ${F}`;
    const lines = wrap(x, t('q', text), tw).slice(0, 8);
    let ty = my + mapH / 2 - (lines.length * 64 + 60) / 2;
    x.fillStyle = 'rgba(123,224,165,.9)'; x.fillRect(tx - 22, ty + 6, 5, lines.length * 64 + 46);
    x.fillStyle = '#e9eef7'; lines.forEach(l => { x.fillText(l, tx, ty); ty += 64; });
    x.fillStyle = '#ffd36a'; x.font = `400 32px ${F}`; x.fillText('— ' + (sig || t('anon')), tx, ty + 12);
    // 底部
    x.fillStyle = '#8592a8'; x.font = `400 30px ${F}`;
    x.fillText(total > GOAL ? t('c_post', total.toLocaleString()) : t('c_pre', total.toLocaleString()), 80, Hc - 110);
    x.fillStyle = '#e9eef7'; x.font = `500 32px ${F}`;
    x.fillText(SITE.replace(/^https?:\/\//, ''), 80, Hc - 66);
    return c;
  }
  function wrap(x, s, w) {
    const out = []; let line = '';
    const noStart = '，。、！？；：」』）…～,.!?)';
    for (const ch of Array.from(s)) {
      if (x.measureText(line + ch).width > w && line && !noStart.includes(ch)) { out.push(line); line = ch; }
      else line += ch;
    }
    if (line) out.push(line); return out;
  }

  // ---------- 資料更新 ----------
  function render() {
    const tt = total.toLocaleString();
    let pct, goal;
    if (total < GOAL) {
      $('countline').innerHTML = t('count_pre', tt, (GOAL - total).toLocaleString());
      pct = total / GOAL; goal = t('goal_pre');
    } else {
      $('countline').innerHTML = t('count_post', tt);
      const Lr = T.levelFor(total);
      const S = (total >= T.cap(Lr) && Lr < T.MAX_LEVEL) ? Lr + 1 : Lr;
      const prev = T.cap(S - 1), next = T.cap(S);
      if (total >= next) { pct = 1; goal = t('goal_max'); }
      else { pct = (total - prev) / (next - prev); goal = t('goal_stage', S, (next - total).toLocaleString()); }
    }
    $('barfill').style.width = Math.max(total ? 1.5 : 0, pct * 100) + '%';
    $('goal').textContent = goal;
    document.querySelectorAll('.th').forEach(e => { e.textContent = threshold; });
  }
  async function refreshRecent() {
    try {
      const rows = await API.recent(), list = $('list'); list.innerHTML = '';
      if (!rows.length) { list.append(el('div', 'msg', t('feed_empty'))); return; }
      rows.forEach(m => {
        const d = el('div', 'msg'); d.append(el('div', '', m.text));
        const s = el('small'); s.append(el('span', '', t('feed_meta', m.sig || t('anon'), Number(m.n).toLocaleString())));
        if (!(mine && mine.n === m.n)) s.append(reportBtn(m.n, refreshRecent));
        d.append(s); list.append(d);
      });
    } catch (e) {}
  }
  async function refreshStats(first) {
    try {
      const s = await API.stats(), now = performance.now();
      threshold = s.threshold || threshold;
      if (!first) for (let n = Math.max(total + 1, s.total - 200); n <= s.total; n++) litAt.set(n, now);
      const grew = s.total > total; total = Math.max(total, s.total); render();
      if (grew && !first) refreshRecent();
      return true;
    } catch (e) { if (first) say('st_dbfail', true); return false; }
  }

  // 切換語言：重畫所有會變動的文字
  I18N.onChange(() => {
    render(); refreshRecent();
    btn.textContent = mine ? t('btn_edit') : t('btn');
    if (lastSay) say(lastSay[0], lastSay[1], ...lastSay[2]);
    tip.classList.remove('show');
    if ($('shareModal').classList.contains('show')) openShare();
  });
  btn.textContent = t('btn');
  say('st_conn');

  (async () => {
    const ok = await refreshStats(true);
    refreshRecent();
    try {
      if (await API.session()) {
        const m = await API.mine();
        if (m) { mine = m; msgEl.value = m.text; sigEl.value = m.sig || ''; showMine(); upd();
          if (m.status === 'removed') say('st_removed', true);
          else say('st_mine', false, m.n.toLocaleString()); return; }
      }
    } catch (e) {}
    if (ok) say('st_ready');
  })();
  // 頁面在前景時每 15 秒更新一次
  setInterval(() => { if (!document.hidden) refreshStats(false); }, 15000);
})();
