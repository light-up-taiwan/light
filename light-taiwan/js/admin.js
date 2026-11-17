(function () {
  const API = window.API, $ = id => document.getElementById(id);
  let status = 'pending', q = '', offset = 0;
  const STATUS = { visible: '公開中', pending: '待處理', approved: '已保留', removed: '已移除' };

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  async function start() {
    const s = await API.session();
    if (s && !s.user.is_anonymous && API.live) return enter();
    if (!API.live && s) return enter();
    $('loginView').hidden = false;
    if (API.needCaptcha) API.captchaToken($('ts')).then(t => { tsToken = t; }).catch(e => { $('loginErr').textContent = e.message; });
  }
  let tsToken = null;
  $('loginBtn').addEventListener('click', async () => {
    $('loginErr').textContent = '';
    try {
      if (API.needCaptcha && !tsToken) throw new Error('請先完成上方的人機驗證');
      await API.signInEmail($('email').value.trim(), $('pw').value, tsToken);
      enter();
    } catch (e) {
      $('loginErr').textContent = e.message; tsToken = null;
      if (API.needCaptcha) API.captchaToken($('ts')).then(t => { tsToken = t; }).catch(() => {});
    }
  });
  $('logout').addEventListener('click', async () => { await API.signOut(); location.reload(); });

  async function enter() {
    $('loginView').hidden = true; $('adminView').hidden = false;
    await overview(); await list(true);
  }

  async function overview() {
    try {
      const o = await API.adminOverview();
      $('sTotal').textContent = Number(o.total).toLocaleString();
      $('sToday').textContent = Number(o.today).toLocaleString();
      $('sPending').textContent = Number(o.pending).toLocaleString();
      $('sRemoved').textContent = Number(o.removed).toLocaleString();
      $('th').value = o.threshold;
      const src = $('sources'); src.innerHTML = '';
      const sum = o.sources.reduce((a, b) => a + Number(b.c), 0) || 1;
      if (!o.sources.length) src.append(el('div', 'empty', '還沒有資料'));
      o.sources.forEach(s => { const r = el('div', 'src'); r.append(el('span', '', s.src), el('span', '', `${Number(s.c).toLocaleString()}（${Math.round(s.c / sum * 100)}%）`)); src.append(r); });
      const d = $('daily'); d.innerHTML = '';
      const max = Math.max(1, ...o.daily.map(x => Number(x.c)));
      o.daily.forEach(x => { const b = el('div'); b.style.height = (Number(x.c) / max * 100) + '%'; b.title = `${x.d}：${x.c}`; b.append(el('span', '', x.d.slice(3))); d.append(b); });
      if (!o.daily.length) d.append(el('div', 'empty', '還沒有資料'));
    } catch (e) {
      $('adminView').innerHTML = ''; $('adminView').append(el('div', 'empty', e.message + '（請確認這個帳號已加入 admins 資料表）'));
    }
  }

  async function list(reset) {
    if (reset) { offset = 0; $('items').innerHTML = ''; }
    const rows = await API.adminList(status, q, 50, offset);
    offset += rows.length;
    if (reset && !rows.length) $('items').append(el('div', 'empty', status === 'pending' ? '目前沒有待處理的留言 🎉' : '沒有資料'));
    rows.forEach(r => $('items').append(item(r)));
    $('more').hidden = rows.length < 50;
  }

  function item(r) {
    const d = el('div', 'item'), body = el('div', 'body');
    body.append(el('div', 't', r.text));
    const m = el('div', 'm');
    m.append(el('span', 'tag ' + r.status, STATUS[r.status]));
    m.append(document.createTextNode(`第 ${r.n} 盞・${r.sig || '匿名'}・檢舉 ${r.report_count} 次・來源 ${r.src || '直接進站'}・${new Date(r.created_at).toLocaleString('zh-TW', { hour12: false })}`));
    body.append(m);
    const acts = el('div', 'acts');
    const act = (label, cls, s) => { const b = el('button', 'btn ' + cls, label); b.addEventListener('click', async () => {
      b.disabled = true; try { await API.adminSet(r.n, s); r.status = s === 'visible' ? 'visible' : s; if (s === 'visible') r.report_count = 0;
        d.replaceWith(item(r)); overview(); } catch (e) { b.disabled = false; alertRow(d, e.message); } }); return b; };
    if (r.status !== 'approved') acts.append(act('保留', 'ok', 'approved'));
    if (r.status !== 'removed') acts.append(act('移除', 'danger', 'removed'));
    if (r.status === 'removed' || r.status === 'approved') acts.append(act('重設', 'ghost', 'visible'));
    d.append(body, acts); return d;
  }
  function alertRow(d, msg) { const e = el('div', 'err', msg); d.querySelector('.body').append(e); }

  $('tabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    [...$('tabs').children].forEach(x => x.classList.toggle('on', x === b));
    status = b.dataset.s; list(true);
  });
  $('qBtn').addEventListener('click', () => { q = $('q').value.trim(); list(true); });
  $('q').addEventListener('keydown', e => { if (e.key === 'Enter') { q = $('q').value.trim(); list(true); } });
  $('more').addEventListener('click', () => list(false));
  $('thSave').addEventListener('click', async () => {
    try { await API.adminThreshold(parseInt($('th').value, 10)); $('thMsg').style.color = 'var(--accent)'; $('thMsg').textContent = '已儲存'; }
    catch (e) { $('thMsg').style.color = ''; $('thMsg').textContent = e.message; }
  });

  start();
})();
