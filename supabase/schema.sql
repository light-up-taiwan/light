-- =====================================================================
-- 點亮台灣｜Supabase 資料庫設定
-- 用法：Supabase 後台 → SQL Editor → 貼上全部 → Run
-- 執行完後，記得改最下面「設定值」的 ntfy 主題與網址
-- =====================================================================

create extension if not exists pg_net with schema extensions;

-- ---------- 資料表 ----------
create table if not exists public.settings (
  key   text primary key,
  value text not null
);

create table if not exists public.messages (
  n            bigint generated always as identity primary key,   -- 第 N 盞燈
  user_id      uuid not null unique,                              -- 一台裝置一則
  text         text not null check (char_length(text) between 1 and 80),
  sig          text not null default '' check (char_length(sig) <= 20),
  src          text not null default '' check (src ~ '^[a-z0-9_-]{0,20}$'),  -- 來源標記
  status       text not null default 'visible'
               check (status in ('visible','pending','approved','removed')),
  report_count int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists messages_created_idx on public.messages (created_at desc);
create index if not exists messages_status_idx  on public.messages (status);

create table if not exists public.reports (
  message_n  bigint not null references public.messages(n) on delete cascade,
  reporter   uuid   not null,
  created_at timestamptz not null default now(),
  primary key (message_n, reporter)                                -- 每人每則只能檢舉一次
);

create table if not exists public.admins (
  user_id uuid primary key
);

-- 所有資料表都不給前端直接讀寫，只能透過下面的函式
alter table public.settings enable row level security;
alter table public.messages enable row level security;
alter table public.reports  enable row level security;
alter table public.admins   enable row level security;
revoke all on public.settings, public.messages, public.reports, public.admins from anon, authenticated;

-- ---------- 內部工具 ----------
create or replace function public._setting(k text) returns text
language sql stable security definer set search_path = public as $$
  select value from settings where key = k
$$;

-- 只擋「不是意見的東西」：網址、帳號、電話、髒話
create or replace function public._bad_text(t text) returns text
language plpgsql immutable as $$
declare
  low text := lower(coalesce(t,''));
  digits text := regexp_replace(coalesce(t,''), '[\s\-－().（）]', '', 'g');
  w text;
begin
  if low ~ '(https?://|www\.|\.(com|tw|net|org|io|cc|me|xyz|top|shop)\b|line\.me|t\.me/|@[a-z0-9_.]{3,})' then
    return '留言不能包含網址或帳號';
  end if;
  if digits ~ '(09[0-9]{8}|0[2-8][0-9]{7,8}|[0-9]{10,})' then
    return '留言不能包含電話號碼';
  end if;
  foreach w in array array['幹你娘','操你媽','操你妈','雞掰','機掰','雞巴','靠北','靠杯','婊子','王八蛋','去死','腦殘','脑残','低能兒','fuck','shit','bitch','cunt'] loop
    if position(w in low) > 0 then
      return '留言含有不雅字詞';
    end if;
  end loop;
  return null;
end $$;

create or replace function public._is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
     and exists (select 1 from admins where user_id = auth.uid())
$$;

-- ---------- 公開讀取 ----------
create or replace function public.get_stats() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'total', coalesce((select max(n) from messages), 0),
    'count', (select count(*) from messages),
    'threshold', coalesce(_setting('report_threshold'),'3')::int
  )
$$;

create or replace function public.get_recent(lim int default 30) returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(x), '[]'::json) from (
    select n, text, sig from messages
    where status in ('visible','approved')
    order by created_at desc
    limit least(greatest(lim,1), 50)
  ) x
$$;

create or replace function public.get_message(p_n bigint) returns json
language sql stable security definer set search_path = public as $$
  select coalesce((
    select json_build_object(
      'n', n,
      'state', case when status in ('visible','approved') then 'ok' else status end,
      'text', case when status in ('visible','approved') then text end,
      'sig',  case when status in ('visible','approved') then sig  end)
    from messages where n = p_n
  ), json_build_object('n', p_n, 'state', 'none'))
$$;

create or replace function public.get_mine() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('n', n, 'text', text, 'sig', sig, 'status', status)
  from messages where user_id = auth.uid()
$$;

-- ---------- 留言 ----------
create or replace function public.post_message(p_text text, p_sig text default '', p_src text default '')
returns bigint
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  t   text := btrim(coalesce(p_text,''));
  s   text := btrim(coalesce(p_sig,''));
  src text := coalesce(lower(substring(coalesce(p_src,'') from '^[A-Za-z0-9_-]{1,20}')), '');
  err text;
  r   messages%rowtype;
begin
  if uid is null then raise exception '請先完成人機驗證'; end if;
  if t = '' or char_length(t) > 80 then raise exception '留言需要 1 到 80 個字'; end if;
  if char_length(s) > 20 then raise exception '署名最多 20 個字'; end if;
  err := coalesce(_bad_text(t), _bad_text(s));
  if err is not null then raise exception '%', err; end if;

  -- 擋洗版：同一句話 10 分鐘內已有 3 個人留過
  if (select count(*) from messages m
      where m.text = t and m.user_id <> uid and m.created_at > now() - interval '10 minutes') >= 3 then
    raise exception '這句話剛剛已經很多人留過了，換個說法吧';
  end if;

  select * into r from messages m where m.user_id = uid for update;
  if found then
    if r.status = 'removed' then raise exception '你的留言已被管理者移除，無法再修改'; end if;
    if r.updated_at > now() - interval '30 seconds' then raise exception '修改太頻繁，請 30 秒後再試'; end if;
    if r.status = 'approved' then
      -- 內容換了，之前的審核結果不再適用
      delete from reports where message_n = r.n;
      update messages m set text = t, sig = s, status = 'visible', report_count = 0, updated_at = now()
        where m.n = r.n;
    else
      update messages m set text = t, sig = s, updated_at = now() where m.n = r.n;
    end if;
    return r.n;
  end if;

  insert into messages (user_id, text, sig, src) values (uid, t, s, src) returning * into r;
  return r.n;
end $$;

-- ---------- 檢舉 ----------
create or replace function public.report_message(p_n bigint) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  uid   uuid := auth.uid();
  r     messages%rowtype;
  th    int  := coalesce(nullif(_setting('report_threshold'),'')::int, 3);
  topic text := coalesce(_setting('ntfy_topic'), '');
  site  text := coalesce(_setting('site_url'), '');
begin
  if uid is null then raise exception '請先完成人機驗證'; end if;
  select * into r from messages where n = p_n for update;
  if not found then raise exception '找不到這則留言'; end if;
  if r.user_id = uid then raise exception '不能檢舉自己的留言'; end if;
  if r.status in ('pending','removed') then return 'pending'; end if;

  insert into reports (message_n, reporter) values (p_n, uid) on conflict do nothing;
  if not found then return 'already'; end if;

  update messages set report_count = report_count + 1 where n = p_n returning * into r;

  if r.status = 'visible' and r.report_count >= th then
    update messages set status = 'pending' where n = p_n;
    if topic <> '' and topic not like 'CHANGE-ME%' then
      perform net.http_post(
        url     := 'https://ntfy.sh',
        body    := jsonb_strip_nulls(jsonb_build_object(
                     'topic',   topic,
                     'title',   '點亮台灣：第 ' || r.n || ' 盞燈被檢舉 ' || r.report_count || ' 次',
                     'message', left(r.text, 80),
                     'click',   case when site <> '' then rtrim(site,'/') || '/admin.html' else null end)),
        headers := '{"Content-Type":"application/json"}'::jsonb);
    end if;
    return 'pending';
  end if;
  return 'ok';
end $$;

-- ---------- 管理者 ----------
create or replace function public.admin_overview() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not _is_admin() then raise exception '沒有管理權限'; end if;
  return json_build_object(
    'total',     (select count(*) from messages),
    'pending',   (select count(*) from messages where status = 'pending'),
    'removed',   (select count(*) from messages where status = 'removed'),
    'today',     (select count(*) from messages where created_at > date_trunc('day', now() at time zone 'Asia/Taipei') at time zone 'Asia/Taipei'),
    'threshold', coalesce(_setting('report_threshold'),'3'),
    'sources',   (select coalesce(json_agg(x order by x.c desc), '[]'::json)
                  from (select coalesce(nullif(src,''),'(直接進站)') as src, count(*) as c
                        from messages group by 1) x),
    'daily',     (select coalesce(json_agg(x order by x.d), '[]'::json)
                  from (select to_char(created_at at time zone 'Asia/Taipei','MM/DD') as d, count(*) as c
                        from messages where created_at > now() - interval '14 days' group by 1) x)
  );
end $$;

create or replace function public.admin_list(p_status text default 'pending', p_q text default '', p_limit int default 50, p_offset int default 0)
returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not _is_admin() then raise exception '沒有管理權限'; end if;
  return (select coalesce(json_agg(x), '[]'::json) from (
    select n, text, sig, src, status, report_count, created_at, updated_at
    from messages
    where (p_status = 'all' or status = p_status)
      and (coalesce(p_q,'') = '' or text ilike '%' || p_q || '%' or sig ilike '%' || p_q || '%' or n::text = p_q)
    order by case when p_status = 'pending' then report_count end desc nulls last, created_at desc
    limit least(greatest(p_limit,1),200) offset greatest(p_offset,0)
  ) x);
end $$;

create or replace function public.admin_set_status(p_n bigint, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not _is_admin() then raise exception '沒有管理權限'; end if;
  if p_status not in ('approved','removed','visible') then raise exception '狀態不正確'; end if;
  if p_status = 'visible' then
    delete from reports where message_n = p_n;
    update messages set status = 'visible', report_count = 0 where n = p_n;
  else
    update messages set status = p_status where n = p_n;
  end if;
end $$;

create or replace function public.admin_set_threshold(p_value int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not _is_admin() then raise exception '沒有管理權限'; end if;
  if p_value < 1 or p_value > 1000 then raise exception '門檻需在 1 到 1000 之間'; end if;
  insert into settings (key, value) values ('report_threshold', p_value::text)
  on conflict (key) do update set value = excluded.value;
end $$;

-- 只開放函式給前端
revoke execute on function public._setting(text), public._bad_text(text), public._is_admin(),
  public.get_mine(), public.post_message(text,text,text), public.report_message(bigint),
  public.admin_overview(), public.admin_list(text,text,int,int),
  public.admin_set_status(bigint,text), public.admin_set_threshold(int) from anon, public;
grant  execute on function public.get_stats(), public.get_recent(int), public.get_message(bigint) to anon, authenticated;
grant  execute on function public.get_mine(), public.post_message(text,text,text), public.report_message(bigint),
                           public.admin_overview(), public.admin_list(text,text,int,int),
                           public.admin_set_status(bigint,text), public.admin_set_threshold(int) to authenticated;

-- ---------- 設定值（請修改） ----------
insert into public.settings (key, value) values
  ('report_threshold', '3'),
  ('ntfy_topic',       'CHANGE-ME-換成一串只有你知道的英數字'),
  ('site_url',         'https://你的帳號.github.io/你的專案名稱')
on conflict (key) do nothing;
