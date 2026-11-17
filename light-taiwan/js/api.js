// 資料存取層：有填 config 就連 Supabase，沒填就用示範資料
(function () {
  const C = window.CONFIG || {};
  const LIVE = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase);

  // ---------- 人機驗證（Cloudflare Turnstile） ----------
  let tsLoaded = null;
  function loadTurnstile() {
    if (!C.TURNSTILE_SITEKEY) return Promise.resolve(false);
    if (!tsLoaded) tsLoaded = new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.onload = () => ok(true); s.onerror = () => fail(new Error('人機驗證載入失敗，請重新整理'));
      document.head.appendChild(s);
    });
    return tsLoaded;
  }
  // 在 container 內顯示驗證，取得 token
  async function captchaToken(container) {
    if (!(await loadTurnstile())) return null;
    container.innerHTML = '';
    return new Promise((ok, fail) => {
      window.turnstile.render(container, {
        sitekey: C.TURNSTILE_SITEKEY, theme: 'dark', language: (window.I18N && I18N.lang === 'en') ? 'en' : 'zh-tw',
        callback: t => ok(t),
        'error-callback': () => fail(new Error('人機驗證失敗，請再試一次')),
        'expired-callback': () => fail(new Error('驗證逾時，請再試一次'))
      });
    });
  }

  // ---------- 正式版 ----------
  function live() {
    const sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    async function rpc(fn, args) {
      const { data, error } = await sb.rpc(fn, args || {});
      if (error) throw new Error(cleanErr(error.message));
      return data;
    }
    return {
      live: true, sb,
      async session() { const { data } = await sb.auth.getSession(); return data.session; },
      async isAnon() { const s = await this.session(); return !!(s && s.user && s.user.is_anonymous); },
      async signInAnon(token) {
        const { error } = await sb.auth.signInAnonymously(token ? { options: { captchaToken: token } } : undefined);
        if (error) throw new Error(cleanErr(error.message));
      },
      async signInEmail(email, password, token) {
        const { error } = await sb.auth.signInWithPassword({ email, password, options: token ? { captchaToken: token } : undefined });
        if (error) throw new Error(cleanErr(error.message));
      },
      async signOut() { await sb.auth.signOut(); },
      stats: () => rpc('get_stats'),
      recent: () => rpc('get_recent', { lim: 30 }),
      message: n => rpc('get_message', { p_n: n }),
      mine: () => rpc('get_mine'),
      post: (t, s, src) => rpc('post_message', { p_text: t, p_sig: s, p_src: src }),
      report: n => rpc('report_message', { p_n: n }),
      adminOverview: () => rpc('admin_overview'),
      adminList: (status, q, limit, offset) => rpc('admin_list', { p_status: status, p_q: q || '', p_limit: limit || 50, p_offset: offset || 0 }),
      adminSet: (n, status) => rpc('admin_set_status', { p_n: n, p_status: status }),
      adminThreshold: v => rpc('admin_set_threshold', { p_value: v })
    };
  }
  function cleanErr(m) {
    m = String(m || '');
    if (/captcha/i.test(m)) return '人機驗證沒有通過，請再試一次';
    if (/Invalid login/i.test(m)) return '帳號或密碼錯誤';
    if (/fetch|network/i.test(m)) return '網路連線失敗，請稍後再試';
    return m;
  }

  // ---------- 示範模式 ----------
  function mock() {
    const LINES = ['謝謝你讓世界看見台灣。','台灣之光，加油！','希望輝達在台灣蓋更多研發中心','夜市的牛排還想再請你吃一次',
      '從遊戲顯卡一路用到現在，謝謝你','你讓工程師這個職業變得很酷','顯卡可以再便宜一點嗎 😂','祝身體健康，皮衣永遠帥',
      '台南人歡迎你回來吃牛肉湯','謝謝你一直記得台灣的供應鏈夥伴','希望 AI 能真的幫到醫療和長照','下次來台北一起去饒河夜市',
      '因為你，我決定念電機系','感謝你在台大的演講，很受用','加油！台灣永遠支持你','希望你的公司繼續照顧台灣的年輕人'];
    const SIGS = ['新竹的阿明','台中工程師','','高雄小美','台北上班族','','花蓮的阿嬤','學生','','桃園的小陳'];
    const msgs = [];
    const N = 1730;
    for (let i = 1; i <= N; i++) {
      msgs.push({ n: i, text: LINES[(i * 7) % LINES.length], sig: SIGS[(i * 3) % SIGS.length],
        status: i % 97 === 0 ? 'pending' : (i % 211 === 0 ? 'removed' : 'visible'), report_count: i % 97 === 0 ? 3 : 0,
        src: ['threads','line','','ig','threads'][i % 5], created_at: new Date(Date.now() - (N - i) * 60000).toISOString() });
    }
    let me = null, signed = false, th = 3;
    const wait = (v) => new Promise(r => setTimeout(() => r(v), 150));
    const view = m => ({ n: m.n, state: ['visible','approved'].includes(m.status) ? 'ok' : m.status,
      text: ['visible','approved'].includes(m.status) ? m.text : null, sig: ['visible','approved'].includes(m.status) ? m.sig : null });
    // 偶爾自己長出新留言，模擬別人在點燈
    setInterval(() => { const n = msgs.length + 1;
      msgs.push({ n, text: LINES[n % LINES.length], sig: SIGS[n % SIGS.length], status: 'visible', report_count: 0, src: 'threads', created_at: new Date().toISOString() });
    }, 6000);
    return {
      live: false,
      async session() { return signed ? { user: { is_anonymous: true } } : null; },
      async isAnon() { return signed; },
      async signInAnon() { signed = true; },
      async signInEmail() { signed = true; },
      async signOut() { signed = false; },
      stats: () => wait({ total: msgs.length, count: msgs.length, threshold: th }),
      recent: () => wait(msgs.filter(m => ['visible','approved'].includes(m.status)).slice(-30).reverse().map(m => ({ n: m.n, text: m.text, sig: m.sig }))),
      message: n => wait(msgs[n - 1] ? view(msgs[n - 1]) : { n, state: 'none' }),
      mine: () => wait(me ? { n: me.n, text: me.text, sig: me.sig, status: me.status } : null),
      async post(t, s) {
        if (/https?:\/\/|www\./i.test(t)) throw new Error('留言不能包含網址或帳號');
        if (me) { me.text = t; me.sig = s; return me.n; }
        me = { n: msgs.length + 1, text: t, sig: s, status: 'visible', report_count: 0, src: 'demo', created_at: new Date().toISOString() };
        msgs.push(me); return wait(me.n);
      },
      async report(n) { const m = msgs[n - 1]; if (m === me) throw new Error('不能檢舉自己的留言');
        m.report_count++; if (m.report_count >= th && m.status === 'visible') { m.status = 'pending'; return 'pending'; } return 'ok'; },
      adminOverview: () => wait({ total: msgs.length, pending: msgs.filter(m => m.status === 'pending').length,
        removed: msgs.filter(m => m.status === 'removed').length, today: 312, threshold: String(th),
        sources: [{ src: 'threads', c: 692 }, { src: 'line', c: 346 }, { src: 'ig', c: 346 }, { src: '(直接進站)', c: 346 }],
        daily: Array.from({ length: 14 }, (_, i) => ({ d: `11/${String(4 + i).padStart(2, '0')}`, c: Math.round(20 * Math.pow(1.35, i)) })) }),
      adminList: (status, q) => wait(msgs.filter(m => (status === 'all' || m.status === status) && (!q || m.text.includes(q) || String(m.n) === q))
        .slice(-50).reverse().map(m => ({ ...m, updated_at: m.created_at }))),
      async adminSet(n, s) { const m = msgs[n - 1]; m.status = s; if (s === 'visible') m.report_count = 0; },
      async adminThreshold(v) { th = v; }
    };
  }

  window.API = LIVE ? live() : mock();
  window.API.captchaToken = captchaToken;
  window.API.needCaptcha = !!C.TURNSTILE_SITEKEY;

  // 流量統計（Cloudflare Web Analytics，無 cookie）
  if (C.CF_BEACON_TOKEN) {
    const s = document.createElement('script');
    s.defer = true; s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.setAttribute('data-cf-beacon', JSON.stringify({ token: C.CF_BEACON_TOKEN }));
    document.head.appendChild(s);
  }
})();
