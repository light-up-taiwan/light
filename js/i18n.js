// 整個網頁的中英切換
(function () {
  const D = {
    zh: {
      title: '點亮台灣｜寫一句話給黃仁勳',
      demo: '示範模式：目前是假資料，填好 js/config.js 後就會連上正式資料庫',
      h1: '寫一句話給黃仁勳，<span>點亮台灣</span>',
      sub: '每一句話，是一盞燈。<br>當每個角落都被點亮，就是整個台灣想對他說的話。',
      label: '你想對黃仁勳說什麼？',
      ph_msg: '一句就好，例如：謝謝你讓世界看見台灣。',
      hint: '一人一盞燈，之後還可以修改',
      ph_sig: '署名（可留空，例如：新竹的阿明）',
      btn: '點亮我的燈', btn_edit: '更新我的話',
      share_mine: '分享我的燈', copy: '複製網址',
      rules_t: '留言規則',
      rules: '<li>所有留言都會公開，我們不預先審查意見，批評也可以。</li><li>不能留：人身攻擊、髒話、廣告、網址、電話或任何人的個資。</li><li>同一則留言被 <span class="th">3</span> 位以上的人檢舉，會先暫時隱藏，由管理者依照這份規則決定保留或移除。</li><li>每人只能點亮一盞燈，但可以修改內容。</li>',
      feed: '剛剛被點亮的燈',
      footer: '非官方粉絲留言活動，與輝達公司無關・點地圖上任一盞燈，看看別人說了什麼',
      v_h: '先確認你不是機器人', v_p: '只需要做一次，之後留言或檢舉都不用再驗證。', cancel: '取消',
      s_h: '你的燈亮了！', share: '分享', dl: '下載圖片', close: '關閉',
      s_hint_file: '分享到 Threads 或 IG 限動，邀更多人一起點亮台灣。',
      s_hint_img: '長按圖片可以儲存，再分享到 Threads 或 IG 限動。',
      share_text: n => `我是點亮台灣的第 ${n} 盞燈。你也來寫一句話給黃仁勳吧！`,
      count_pre: (t, left) => `已點亮 <b>${t}</b> 盞，還差 ${left} 盞就能亮滿全台`,
      goal_pre: '目標 1,963 盞，他出生的那一年',
      count_post: t => `<span style="color:var(--glow)">目標 1,963 盞達成！</span>現在是第 <b>${t}</b> 盞`,
      goal_stage: (s, left) => `第 ${s} 階段：台灣越點越密，這一輪還差 ${left} 盞`,
      goal_max: '已經點到最密了，燈還在繼續亮',
      st_conn: '連線中…', st_ready: '寫下一句話，點亮屬於你的那盞燈。', st_posting: '點亮中…',
      st_first: n => `成功！你是點亮台灣的第 ${n} 盞燈（綠色那盞）。`,
      st_updated: '已更新你的話。',
      st_mine: n => `你是第 ${n} 盞燈（綠色那盞），可以修改內容。`,
      st_removed: '你的留言已依留言規則移除。',
      st_dbfail: '目前連不上資料庫，請稍後重新整理。',
      st_copied: '網址已複製，貼給朋友吧！', st_copyfail: '複製失敗，網址是：',
      st_sendfail: '送出失敗，請再試一次',
      loading: '讀取中…', light_no: n => `第 ${n} 盞燈`, anon: '匿名', q: s => `「${s}」`,
      tip_pending: '這盞燈的話被多人檢舉，正在等待管理者處理。',
      tip_removed: '這盞燈的話已依留言規則移除。',
      tip_none: '找不到這則留言。',
      rep: '檢舉', rep_sure: '確定檢舉這則？', rep_already: '你已經檢舉過了',
      rep_pending: '已達檢舉門檻，暫時隱藏', rep_ok: '已收到檢舉，謝謝',
      feed_empty: '還沒有人點燈，成為第一盞吧！',
      feed_meta: (sig, n) => `— ${sig}・第 ${n} 盞`,
      v_cancelled: '已取消驗證',
      c_top: '寫一句話給黃仁勳', c_l1: '我是點亮台灣的', c_l2: n => `第 ${n} 盞燈`,
      c_pre: t => `已有 ${t} 盞燈亮起・一起點亮台灣`,
      c_post: t => `目標 1,963 盞已達成・現在有 ${t} 盞燈`
    },
    en: {
      title: 'Light Up Taiwan | Write Jensen Huang one line',
      demo: 'Demo mode: sample data. Fill in js/config.js to connect the real database.',
      h1: 'Write Jensen Huang one line. <span>Light up Taiwan.</span>',
      sub: 'Every line is a light.<br>When every corner is lit, that\'s all of Taiwan talking to him.',
      label: 'What do you want to say to Jensen Huang?',
      ph_msg: 'Just one line, e.g. Thank you for putting Taiwan on the map.',
      hint: 'One light per person. You can edit it later.',
      ph_sig: 'Sign it (optional, e.g. Ming from Hsinchu)',
      btn: 'Light mine up', btn_edit: 'Update my line',
      share_mine: 'Share my light', copy: 'Copy link',
      rules_t: 'Rules',
      rules: '<li>Every line is public. We don\'t pre-screen opinions, and criticism is welcome.</li><li>Not allowed: personal attacks, profanity, ads, links, phone numbers, or anyone\'s personal info.</li><li>If <span class="th">3</span> or more people report a line, it\'s hidden until the admin decides to keep or remove it, based on these rules.</li><li>One light per person, but you can edit your line.</li>',
      feed: 'Just lit up',
      footer: 'An unofficial fan project, not affiliated with NVIDIA · Tap any light on the map to read it',
      v_h: 'Quick check: are you human?', v_p: 'Only once. You won\'t be asked again to post or report.', cancel: 'Cancel',
      s_h: 'Your light is on!', share: 'Share', dl: 'Download image', close: 'Close',
      s_hint_file: 'Share it to Threads or your IG story and invite more people to light up Taiwan.',
      s_hint_img: 'Long-press the image to save it, then share it to Threads or your IG story.',
      share_text: n => `I'm light #${n} lighting up Taiwan. Come write Jensen Huang one line!`,
      count_pre: (t, left) => `<b>${t}</b> lit, ${left} to go to light up all of Taiwan`,
      goal_pre: 'Goal: 1,963 lights, the year he was born',
      count_post: t => `<span style="color:var(--glow)">Goal of 1,963 reached!</span> Now at light #<b>${t}</b>`,
      goal_stage: (s, left) => `Stage ${s}: Taiwan gets denser. ${left} to go this round`,
      goal_max: 'As dense as it gets. Still lighting up.',
      st_conn: 'Connecting…', st_ready: 'Write one line to light up your own.', st_posting: 'Lighting up…',
      st_first: n => `Done! You're light #${n} on the map (the green one).`,
      st_updated: 'Your line has been updated.',
      st_mine: n => `You're light #${n} (the green one). You can still edit it.`,
      st_removed: 'Your line was removed under the rules.',
      st_dbfail: 'Can\'t reach the database right now. Please refresh later.',
      st_copied: 'Link copied. Send it to a friend!', st_copyfail: 'Copy failed. The link is: ',
      st_sendfail: 'Couldn\'t send. Please try again.',
      loading: 'Loading…', light_no: n => `Light #${n}`, anon: 'Anonymous', q: s => `“${s}”`,
      tip_pending: 'Several people reported this line. It\'s waiting for the admin.',
      tip_removed: 'This line was removed under the rules.',
      tip_none: 'Message not found.',
      rep: 'Report', rep_sure: 'Report this line?', rep_already: 'You already reported this',
      rep_pending: 'Hidden until reviewed', rep_ok: 'Report received, thanks',
      feed_empty: 'No lights yet. Be the first!',
      feed_meta: (sig, n) => `— ${sig} · #${n}`,
      v_cancelled: 'Check cancelled',
      c_top: 'Write Jensen Huang one line', c_l1: 'Lighting up Taiwan as', c_l2: n => `light #${n}`,
      c_pre: t => `${t} lights on · Light up Taiwan together`,
      c_post: t => `Goal of 1,963 reached · ${t} lights now`
    }
  };
  // 伺服器回傳的中文錯誤訊息 → 英文
  const ERR = {
    '請先完成人機驗證': 'Please complete the human check first.',
    '留言需要 1 到 80 個字': 'Your line needs 1 to 80 characters.',
    '署名最多 20 個字': 'Signatures can be up to 20 characters.',
    '留言不能包含網址或帳號': 'No links or account handles, please.',
    '留言不能包含電話號碼': 'No phone numbers, please.',
    '留言含有不雅字詞': 'Please keep it clean.',
    '這句話剛剛已經很多人留過了，換個說法吧': 'Lots of people just posted this exact line. Try your own words?',
    '你的留言已被管理者移除，無法再修改': 'Your line was removed by the admin and can\'t be edited.',
    '修改太頻繁，請 30 秒後再試': 'Too many edits. Try again in 30 seconds.',
    '找不到這則留言': 'Message not found.',
    '不能檢舉自己的留言': 'You can\'t report your own line.',
    '人機驗證沒有通過，請再試一次': 'Human check failed. Please try again.',
    '人機驗證失敗，請再試一次': 'Human check failed. Please try again.',
    '驗證逾時，請再試一次': 'The check timed out. Please try again.',
    '人機驗證載入失敗，請重新整理': 'Couldn\'t load the human check. Please refresh.',
    '網路連線失敗，請稍後再試': 'Network error. Please try again later.',
    '已取消驗證': 'Check cancelled'
  };

  let lang = 'zh';
  try { lang = localStorage.getItem('lt_lang') || ''; } catch (e) {}
  if (lang !== 'zh' && lang !== 'en') lang = /^zh/i.test(navigator.language || 'zh') ? 'zh' : 'en';
  const listeners = [];

  function t(key, ...args) { const v = D[lang][key]; return typeof v === 'function' ? v(...args) : v; }
  function err(msg) { return lang === 'en' && ERR[msg] ? ERR[msg] : msg; }
  function apply() {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
    document.body.setAttribute('data-lang', lang);
    document.title = t('title');
    document.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach(e => { e.innerHTML = t(e.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-ph]').forEach(e => { e.placeholder = t(e.dataset.i18nPh); });
    document.querySelectorAll('.lt button').forEach(b => b.classList.toggle('on', b.dataset.l === lang));
  }
  function set(l) {
    lang = l; try { localStorage.setItem('lt_lang', l); } catch (e) {}
    apply(); listeners.forEach(f => f(l));
  }
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.querySelectorAll('.lt button').forEach(b => b.addEventListener('click', () => set(b.dataset.l)));
  });
  window.I18N = { t, err, set, get lang() { return lang; }, onChange: f => listeners.push(f), apply };
})();
