// ===== 部署時只要改這個檔案 =====
// 五個欄位都留空時，網站會進入「示範模式」：用假資料展示，不會連資料庫。
window.CONFIG = {
  // Supabase 後台 → Project Settings → API
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',

  // Cloudflare Turnstile（人機驗證）的 Site Key
  TURNSTILE_SITEKEY: '',

  // Cloudflare Web Analytics（流量統計）的 token
  CF_BEACON_TOKEN: '',

  // 網站正式網址，分享卡與分享連結會用到，例如 https://lighttaiwan.github.io/light
  SITE_URL: ''
};
