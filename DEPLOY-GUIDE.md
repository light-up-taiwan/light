# 點亮台灣｜公開版部署步驟

整套都用免費方案，不需要信用卡。全部用**新申請的 email** 註冊，就不會跟你本人連在一起。

大約需要 40–60 分鐘，照順序做就好。

---

## 檔案說明

| 檔案 | 用途 |
|---|---|
| `index.html` | 前台：地圖、留言、檢舉、分享卡 |
| `admin.html` | 管理頁：處理被檢舉的留言、看流量來源、調檢舉門檻 |
| `js/config.js` | **唯一需要你改的檔案**（填 5 個值） |
| `js/app.js`、`js/admin.js`、`js/api.js`、`js/taiwan.js`、`js/i18n.js` | 程式本體，不用動 |
| `supabase/schema.sql` | 資料庫設定，貼到 Supabase 執行一次 |

> config.js 沒填之前，直接用瀏覽器打開 `index.html` 會是「示範模式」（假資料），可以先看效果。

---

## 步驟 0：申請新 email

用 Gmail 或 Proton Mail 申請一個新信箱，例如 `lighttaiwan2026@gmail.com`。之後所有服務都用它註冊。

---

## 步驟 1：GitHub（放網頁）

1. 用新 email 註冊 GitHub，帳號名稱取跟你無關的，例如 `lighttaiwan`。
   網址會變成 `https://lighttaiwan.github.io/...`，所以名字要想好。
2. 右上角「＋」→ **New repository**，名稱例如 `light`，選 **Public**，按 Create。
3. 進到 repository →「uploading an existing file」→ 把整個資料夾的檔案拖進去（保留 `js` 與 `supabase` 資料夾結構）→ Commit。
4. **Settings → Pages** → Source 選「Deploy from a branch」→ Branch 選 `main`、資料夾 `/ (root)` → Save。
5. 等 1–2 分鐘，網址會出現在同一頁，例如 `https://lighttaiwan.github.io/light`。**記下這個網址**。

---

## 步驟 2：Supabase（存留言）

1. 到 supabase.com，用新 email（或剛剛的 GitHub 帳號）註冊。
2. **New project**：名稱隨意，Region 選 **Northeast Asia (Tokyo)** 或 **Southeast Asia (Singapore)**，資料庫密碼記好。
3. 左邊選單 **SQL Editor** → 把 `supabase/schema.sql` 全部內容貼上 → **Run**。
4. 改設定值：在 SQL Editor 執行下面這段（換成你的值）：
   ```sql
   update settings set value = '一串只有你知道的英數字，例如 lt-7f3k9q2m' where key = 'ntfy_topic';
   update settings set value = 'https://lighttaiwan.github.io/light'      where key = 'site_url';
   ```
5. **Authentication → Sign In / Providers** → 打開 **Allow anonymous sign-ins**（讓訪客不用註冊就能留言）。
6. **Authentication → URL Configuration** → Site URL 填步驟 1 的網址。
7. 建立管理者帳號：
   - **Authentication → Users → Add user → Create new user**，填新 email 和密碼，勾 **Auto Confirm User**。
   - 回到 SQL Editor 執行（換成你的 email）：
     ```sql
     insert into admins (user_id) select id from auth.users where email = 'lighttaiwan2026@gmail.com';
     ```
8. **Project Settings → API**：記下 **Project URL** 和 **anon public** key。

---

## 步驟 3：Cloudflare（人機驗證＋流量統計）

1. 到 cloudflare.com 用新 email 註冊。
2. **Turnstile → Add widget**：
   - Hostname 填 `lighttaiwan.github.io`（你的 GitHub 網域，不含 /light）
   - Widget mode 選 **Managed**
   - 建立後記下 **Site Key** 和 **Secret Key**
3. 回 Supabase：**Authentication → Attack Protection → Enable CAPTCHA protection** → 選 **Turnstile** → 貼上 **Secret Key** → Save。
4. **Web Analytics → Add a site** → 填你的網址 → 選「手動加 JS」→ 從它給的程式碼裡複製 `"token": "..."` 的那串 token。

---

## 步驟 4：填 config.js

在 GitHub 上點開 `js/config.js` → 右上角鉛筆圖示編輯：

```js
window.CONFIG = {
  SUPABASE_URL: 'https://xxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJ...（很長的一串）',
  TURNSTILE_SITEKEY: '0x4AAAA...',
  CF_BEACON_TOKEN: 'abc123...',
  SITE_URL: 'https://lighttaiwan.github.io/light'
};
```
Commit 後等 1 分鐘，重新整理網頁，上面黃色的「示範模式」字樣消失就成功了。

> anon key 本來就設計成可以公開，安全性靠資料庫裡的規則把關（前端不能直接讀寫資料表，只能呼叫寫好的函式）。**Secret Key 和資料庫密碼絕對不要放進 config.js。**

---

## 步驟 5：手機收檢舉通知（ntfy）

1. 手機安裝 **ntfy** App（App Store / Google Play，免註冊）。
2. 按「＋」訂閱主題，填步驟 2-4 設定的那串英數字。
3. 之後只要有留言被檢舉到門檻，手機就會跳通知，點開直接進管理頁。

> 主題名稱等於通知的密碼，不要太簡單，也不要公開。

---

## 步驟 6：上線前測試

1. 打開網站留一則言 → 應該跳出人機驗證 → 地圖上出現綠色的燈和分享卡。
2. 用另外 3 個瀏覽器（或無痕視窗）各檢舉同一則 → 第 3 次後那則應該變成「等待管理者處理」，手機收到 ntfy 通知。
3. 打開 `你的網址/admin.html` → 登入 → 在「待處理」看到它 → 按保留或移除。
4. 電腦和手機各看一次版面。

---

## 宣傳時的來源標記

每個地方放的連結加上 `?from=名稱`，管理頁就會統計每個管道帶來多少留言：

| 放在哪裡 | 連結 |
|---|---|
| Threads | `https://lighttaiwan.github.io/light/?from=threads` |
| IG | `...?from=ig` |
| LINE 群組 | `...?from=line` |
| Facebook | `...?from=fb` |
| 分享卡（自動） | `...?from=share` |

「訪客從哪裡來、看了多少人」看 Cloudflare Web Analytics；「誰真的留言」看管理頁。兩個一比，就知道每個管道的轉換率。

---

## 免費方案的上限（2026 年資料）

- Supabase 免費版：資料庫 500 MB、流量每月 5 GB、每月 50,000 位登入使用者。
  只有「留言或檢舉的人」會算進 50,000，只看不留的人不算。一則留言約 0.5 KB，500 MB 裝得下幾十萬則。
- 真的爆紅、超過上限時，升級 Pro 是每月 25 美元。
- 免費專案**連續 7 天沒人使用會自動暫停**，活動期間不會發生；活動結束後若要保留，登入 Supabase 按恢復即可。

---

## 匿名提醒

- GitHub、Supabase、Cloudflare、ntfy 都只用新 email，不要綁你的手機號碼或個人帳號。
- 網頁裡沒有你的名字；GitHub 的 commit 作者會是新帳號，**不要在自己的電腦上用 git 指令上傳**（git 可能帶出你電腦設定的姓名與 email），直接用網頁拖拉上傳最安全。
- 管理頁（admin.html）已設定不被 Google 收錄。
