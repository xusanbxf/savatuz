import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SB_URL, SB_KEY, ANON_KEY, I18N, CATS, REGIONS, breakdown, fmt, saveOrder } from '../lib/supabase.js';


/* ============ SAVAT.UZ — auth, checkout, mobile menu ============ */
const AC_D = window.SAVAT;
const AC_I = window.Icons;
const ACMedia = () => window.SC.Media;

/* phone mask: +998 90 123 45 67 */
function maskPhone(raw) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("998")) d = d.slice(3);
  d = d.slice(0, 9);
  let out = "+998";
  if (d.length) out += " " + d.slice(0, 2);
  if (d.length > 2) out += " " + d.slice(2, 5);
  if (d.length > 5) out += " " + d.slice(5, 7);
  if (d.length > 7) out += " " + d.slice(7, 9);
  return out;
}
function phoneValid(p) { return p.replace(/\D/g, "").length === 12; }

/* ---------- Auth modal ---------- */
export function AuthModal({ open, t, onClose, onAuth }) {
  const [tab, setTab] = useState("login"); // login | register | verify | forgot | reset-sent
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const SB_URL = "https://gjsaelqqubmlwnmfyuso.supabase.co";
  const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqc2FlbHFxdWJtbHdubWZ5dXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDY5MzAsImV4cCI6MjA5NzAyMjkzMH0.zLx1yBAUdMqtTW61zibbhQts3zVk-aRQTmTjn0L1U9Y";

  useEffect(() => { if (open) { setErr(""); setInfo(""); setLoading(false); } }, [open, tab]);
  if (!open) return null;

  const sb = (path, body) => fetch(SB_URL + path, {
    method: "POST",
    headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(r => r.json().then(d => ({ ok: r.ok, d })));

  // Kirish
  const doLogin = async () => {
    if (!email.includes("@")) { setErr("To'g'ri email kiriting"); return; }
    if (password.length < 6) { setErr("Parol kamida 6 ta belgi"); return; }
    setLoading(true); setErr("");
    const { ok, d } = await sb("/auth/v1/token?grant_type=password", { email, password });
    setLoading(false);
    if (!ok) {
      if (d.error_description === "Invalid login credentials") setErr("Email yoki parol noto'g'ri");
      else if (d.error_description?.includes("Email not confirmed")) setErr("Email tasdiqlanmagan — pochtangizni tekshiring");
      else setErr(d.error_description || "Xatolik yuz berdi");
      return;
    }
    const finalName = d.user?.user_metadata?.name || email.split("@")[0];
    onAuth({ name: finalName, email, token: d.access_token });
    setName(""); setEmail(""); setPassword("");
  };

  // Ro'yxatdan o'tish
  const doRegister = async () => {
    if (name.trim().length < 2) { setErr("Ismingizni kiriting"); return; }
    if (!email.includes("@")) { setErr("To'g'ri email kiriting"); return; }
    if (password.length < 6) { setErr("Parol kamida 6 ta belgi"); return; }
    setLoading(true); setErr("");

    // Email mavjudligini tekshirish
    const check = await sb("/auth/v1/token?grant_type=password", { email, password: "___check___x9z" });
    if (!check.ok) {
      const desc = check.d.error_description || "";
      if (desc === "Invalid login credentials") {
        // Email bor, faqat parol noto'g'ri = allaqachon ro'yxatdan o'tgan
        setErr("Bu email allaqachon ro'yxatdan o'tgan");
        setLoading(false); return;
      }
      // "Email not confirmed" ham email borligini bildiradi
      if (desc.includes("not confirmed") || desc.includes("Email")) {
        setErr("Bu email allaqachon ro'yxatdan o'tgan");
        setLoading(false); return;
      }
    }

    const { ok, d } = await sb("/auth/v1/signup", { email, password, data: { name: name.trim() } });
    setLoading(false);
    if (!ok) {
      setErr(d.error_description || d.msg || d.message || "Xatolik yuz berdi");
      return;
    }
    setTab("verify");
    setInfo(email + " manziliga tasdiqlash kodi yuborildi");
  };

  // OTP tasdiqlash
  const doVerify = async () => {
    if (otp.trim().length < 6) { setErr("Kodni to'liq kiriting"); return; }
    setLoading(true); setErr("");
    const { ok, d } = await sb("/auth/v1/verify", { type: "signup", email, token: otp.trim() });
    setLoading(false);
    if (!ok) { 
      setErr("Kod noto'g'ri yoki muddati o'tgan. Agar avval ro'yxatdan o'tgan bo'lsangiz — 'Kirishga qaytish' tugmasini bosib, email va parolingiz bilan kiring."); 
      return; 
    }
    const finalName = d.user?.user_metadata?.name || name || email.split("@")[0];
    onAuth({ name: finalName, email, token: d.access_token });
    setName(""); setEmail(""); setPassword(""); setOtp("");
  };

  // Parolni tiklash
  const doForgot = async () => {
    if (!email.includes("@")) { setErr("To'g'ri email kiriting"); return; }
    setLoading(true); setErr("");
    const res = await fetch(SB_URL + "/auth/v1/recover", {
      method: "POST",
      headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    setLoading(false);
    if (res.status === 429) {
      setErr("Urinishlar soni ko'payib ketdi. 5-10 daqiqadan keyin qayta urinib ko'ring.");
      return;
    }
    setTab("reset-sent");
  };

  const Brand = () => (
    <div className="modal-brand">
      <div className="brand-mark" style={{ width: 44, height: 44 }}><AC_I.basket style={{ width: 25, height: 25 }} /></div>
      <div className="brand-name" style={{ fontSize: 22 }}>SAVAT<span className="uz">.UZ</span></div>
    </div>
  );

  // OTP ekrani
  if (tab === "verify") return (
    <div className="modal-scrim on" onClick={onClose}>
      <div className="modal pop" onClick={e => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose}><AC_I.x style={{ width: 20, height: 20 }} /></button>
        <Brand />
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📧</div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Emailni tasdiqlang</div>
          <div style={{ color: "#8a849c", fontSize: 13.5 }}>{info}</div>
          <div style={{ color: "#8a849c", fontSize: 12.5, marginTop: 8 }}>Agar xat kelmasa — avval ro'yxatdan o'tgan bo'lishingiz mumkin. "Kirishga qaytish" tugmasini bosing.</div>
        </div>
        <div className="auth-fields">
          <label className="field">
            <span>Tasdiqlash kodi</span>
            <div className="field-in">
              <AC_I.lock style={{ width: 18, height: 18 }} />
              <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456"
                inputMode="numeric" maxLength={6}
                onKeyDown={e => { if (e.key === "Enter") doVerify(); }} />
            </div>
          </label>
          {err && <p className="field-err">{err}</p>}
        </div>
        <button className="auth-submit" onClick={doVerify} disabled={loading}>
          {loading ? "Tekshirilmoqda..." : "Tasdiqlash"} {!loading && <AC_I.arrow style={{ width: 18, height: 18 }} />}
        </button>
        <p className="auth-note" style={{ textAlign: "center", cursor: "pointer", color: "#6c2bd9" }}
          onClick={() => { setTab("login"); setErr(""); }}>← Kirishga qaytish</p>
      </div>
    </div>
  );

  // Parol tiklash yuborildi
  if (tab === "reset-sent") return (
    <div className="modal-scrim on" onClick={onClose}>
      <div className="modal pop" onClick={e => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose}><AC_I.x style={{ width: 20, height: 20 }} /></button>
        <Brand />
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✉️</div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>Xat yuborildi</div>
          <div style={{ color: "#8a849c", fontSize: 13.5 }}><b>{email}</b> manziliga parolni tiklash havolasi yuborildi. Pochtangizni tekshiring.</div>
        </div>
        <button className="auth-submit" onClick={() => { setTab("login"); setErr(""); }}>
          Kirishga qaytish
        </button>
      </div>
    </div>
  );

  // Parolni unutdim
  if (tab === "forgot") return (
    <div className="modal-scrim on" onClick={onClose}>
      <div className="modal pop" onClick={e => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose}><AC_I.x style={{ width: 20, height: 20 }} /></button>
        <Brand />
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Parolni tiklash</div>
        <div style={{ color: "#8a849c", fontSize: 13.5, marginBottom: 16 }}>Emailingizga tiklash havolasi yuboramiz</div>
        <div className="auth-fields">
          <label className="field">
            <span>Email</span>
            <div className="field-in">
              <AC_I.user style={{ width: 18, height: 18 }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@misol.com"
                onKeyDown={e => { if (e.key === "Enter") doForgot(); }} />
            </div>
          </label>
          {err && <p className="field-err">{err}</p>}
        </div>
        <button className="auth-submit" onClick={doForgot} disabled={loading}>
          {loading ? "Yuborilmoqda..." : "Havolani yuborish"} {!loading && <AC_I.arrow style={{ width: 18, height: 18 }} />}
        </button>
        <p className="auth-note" style={{ textAlign: "center", cursor: "pointer", color: "#6c2bd9" }}
          onClick={() => { setTab("login"); setErr(""); }}>← Kirishga qaytish</p>
      </div>
    </div>
  );

  // Asosiy kirish / ro'yxatdan o'tish
  return (
    <div className="modal-scrim on" onClick={onClose}>
      <div className="modal pop" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose}><AC_I.x style={{ width: 20, height: 20 }} /></button>
        <Brand />
        <div className="auth-tabs">
          <button className={tab === "login" ? "on" : ""} onClick={() => { setTab("login"); setErr(""); }}>{t.auth_login_tab}</button>
          <button className={tab === "register" ? "on" : ""} onClick={() => { setTab("register"); setErr(""); }}>{t.auth_reg_tab}</button>
        </div>
        <div className="auth-fields">
          {tab === "register" && (
            <label className="field">
              <span>{t.auth_name}</span>
              <div className="field-in">
                <AC_I.user style={{ width: 18, height: 18 }} />
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.auth_name} />
              </div>
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <div className="field-in">
              <AC_I.user style={{ width: 18, height: 18 }} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@misol.com" autoComplete="off" />
            </div>
          </label>
          <label className="field">
            <span>Parol</span>
            <div className="field-in">
              <AC_I.lock style={{ width: 18, height: 18 }} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password"
                onKeyDown={(e) => { if (e.key === "Enter") tab === "login" ? doLogin() : doRegister(); }} />
            </div>
          </label>
          {err && <p className="field-err">{err}</p>}
          {tab === "login" && (
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6c2bd9", cursor: "pointer", textAlign: "right" }}
              onClick={() => { setTab("forgot"); setErr(""); }}>Parolni unutdingizmi?</p>
          )}
        </div>
        <button className="auth-submit" onClick={tab === "login" ? doLogin : doRegister} disabled={loading}>
          {loading ? "Yuklanmoqda..." : t.auth_continue} {!loading && <AC_I.arrow style={{ width: 18, height: 18 }} />}
        </button>
        <p className="auth-note">{t.auth_note}</p>
      </div>
    </div>
  );
}

/* ---------- Mobile menu ---------- */
export function MobileMenu({ open, t, lang, setLang, onClose, onHome, user, onAccount, onLogout, onMyOrders, onHelp, onCatalog }) {
  return (
    <>
      <div className={"mm-scrim" + (open ? " on" : "")} onClick={onClose} />
      <aside className={"mm" + (open ? " on" : "")}>
        <div className="mm-head">
          <div className="brand-name" style={{ fontSize: 20 }}>SAVAT<span className="uz">.UZ</span></div>
          <button className="x-btn" onClick={onClose}><AC_I.x style={{ width: 20, height: 20 }} /></button>
        </div>
        <div className="mm-acct" onClick={() => { onClose(); onAccount(); }}>
          <div className="mm-acct-ic"><AC_I.user style={{ width: 20, height: 20 }} /></div>
          <div>
            <div className="mm-acct-name">{user ? `${t.auth_hello}, ${user.name.split(" ")[0]}` : t.login}</div>
            <div className="mm-acct-sub">{user ? user.email : t.auth_reg_tab}</div>
          </div>
        </div>
        <nav className="mm-nav">
          <button onClick={() => { onClose(); onHome(); }}>{t.nav_home}</button>
          <button onClick={() => { onClose(); onCatalog && onCatalog(); onHome(); }}>{t.nav_catalog}</button>
          {user && <button onClick={() => { onClose(); onMyOrders(); }}>{t.nav_track}</button>}
          <button onClick={() => { onClose(); onHelp(); }}>{t.nav_help}</button>
        </nav>
        <div className="mm-foot">
          <div className="lang" style={{ width: "fit-content" }}>
            <button className={lang === "uz" ? "on" : ""} onClick={() => setLang("uz")}>UZ</button>
            <button className={lang === "ru" ? "on" : ""} onClick={() => setLang("ru")}>RU</button>
          </div>
          {user && <button className="mm-logout" style={{ background: "#f0e8ff", color: "#6c2bd9", marginBottom: 8 }} onClick={() => { onClose(); onMyOrders(); }}>Mening buyurtmalarim</button>}
          {user && <button className="mm-logout" onClick={() => { onClose(); onLogout(); }}>{t.auth_logout}</button>}
        </div>
      </aside>
    </>
  );
}

/* ---------- Checkout ---------- */
function PaymentCard({ m, t, selected, onSelect }) {
  const icon = m.id === "cash" ? <AC_I.truck style={{ width: 20, height: 20 }} />
    : m.id === "payme" ? <AC_I.card style={{ width: 20, height: 20 }} />
    : <AC_I.spark style={{ width: 20, height: 20 }} />;
  return (
    <button
      className={"pay" + (m.soon ? " soon" : "") + (selected ? " on" : "")}
      onClick={() => !m.soon && onSelect(m.id)}
      disabled={m.soon}
    >
      <span className="pay-ic" style={{ background: m.tint, color: m.color }}>{icon}</span>
      <span className="pay-text">
        <span className="pay-name">{m.label}</span>
        <span className="pay-sub">{m.sub}</span>
      </span>
      {m.soon
        ? <span className="pay-soon"><AC_I.lock style={{ width: 12, height: 12 }} />{t.soon}</span>
        : <span className={"pay-radio" + (selected ? " on" : "")} />}
    </button>
  );
}

export function Checkout({ items, t, lang, user, onBack, onPlace, onRequireAuth }) {
  const Media = window.SC.Media;
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [phone, setPhone] = useState("+998 ");
  const [pay, setPay] = useState("payme");
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (user && user.phone && phone.replace(/\D/g, "").length <= 3) setPhone(user.phone);
  }, [user]);

  const total = items.reduce((s, it) => s + AC_breakdown(it.p).total * it.q, 0);
  const count = items.reduce((s, it) => s + it.q, 0);

  const methods = [
    { id: "payme", label: "Payme", sub: t.pay_payme_d, tint: "#e6f6fb", color: "#00b8d4" },
    { id: "click", label: "Click", sub: t.pay_click_d, tint: "#eef0ff", color: "#3461ff" },
    { id: "cash", label: t.pay_cash, sub: t.pay_cash_d, tint: "#e7f7ee", color: "#12a150", soon: true },
  ];

  if (!user) {
    return (
      <div className="pd wrap up">
        <button className="back-link" onClick={onBack}><AC_I.back style={{ width: 18, height: 18 }} />{t.back}</button>
        <div className="login-req">
          <div className="login-req-ic"><AC_I.lock style={{ width: 30, height: 30 }} /></div>
          <h2>{t.co_login_req_t}</h2>
          <p>{t.co_login_req_d}</p>
          <button className="auth-submit" style={{ maxWidth: 320, margin: "8px auto 0" }} onClick={onRequireAuth}>
            {t.login} / {t.auth_reg_tab}
          </button>
        </div>
      </div>
    );
  }

  const place = () => {
    if (!region || !phoneValid(phone) || city.trim().length < 2 || address.trim().length < 3) { setErr(true); return; }
    const num = "SV-" + Math.floor(100000 + Math.random() * 900000);
    const orderItems = items.map((it) => {
      const b = AC_breakdown(it.p);
      return { id: it.p.id, name_uz: it.p.name.uz, name_ru: it.p.name.ru, qty: it.q, price: b.total };
    });
    onPlace({ num, total, count, items: orderItems, region, city, address, phone, comment, pay });
  };

  return (
    <div className="pd wrap up">
      <button className="back-link" onClick={onBack}><AC_I.back style={{ width: 18, height: 18 }} />{t.back}</button>
      <h1 className="pd-title" style={{ marginBottom: 22 }}>{t.checkout}</h1>
      <div className="co-grid">
        <div className="co-main">
          {/* delivery */}
          <section className="co-card">
            <h3 className="co-h"><span className="co-num">1</span>{t.co_delivery}</h3>
            <div className="co-form">
              <label className="field">
                <span>{t.co_region}</span>
                <div className={"field-in" + (err && !region ? " bad" : "")}>
                  <AC_I.pin style={{ width: 18, height: 18 }} />
                  <select value={region} onChange={(e) => setRegion(e.target.value)}>
                    <option value="">{t.co_region_ph}</option>
                    {AC_REGIONS.map((r) => <option key={r.id} value={r.id}>{r[lang]}</option>)}
                  </select>
                </div>
              </label>
              <label className="field">
                <span>{t.co_city}</span>
                <div className={"field-in" + (err && city.trim().length < 2 ? " bad" : "")}>
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t.co_city} />
                </div>
              </label>
              <label className="field span2">
                <span>{t.auth_phone}</span>
                <div className={"field-in" + (err && !phoneValid(phone) ? " bad" : "")}>
                  <AC_I.phone style={{ width: 18, height: 18 }} />
                  <input inputMode="tel" value={phone}
                    onChange={(e) => setPhone(maskPhone(e.target.value))}
                    onKeyDown={(e) => { if ((e.key === "Backspace" || e.key === "Delete") && phone.replace(/\D/g, "").length <= 3) e.preventDefault(); }}
                    placeholder="+998 90 123 45 67" />
                </div>
              </label>
              <label className="field span2">
                <span>{t.co_address}</span>
                <div className={"field-in" + (err && address.trim().length < 3 ? " bad" : "")}>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t.co_address} />
                </div>
              </label>
              <label className="field span2">
                <span>{t.co_comment}</span>
                <div className="field-in">
                  <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t.co_comment} />
                </div>
              </label>
            </div>
          </section>

          {/* payment */}
          <section className="co-card">
            <h3 className="co-h"><span className="co-num">2</span>{t.co_payment}</h3>
            <div className="pay-list">
              {methods.map((m) => (
                <PaymentCard key={m.id} m={m} t={t} selected={pay === m.id} onSelect={setPay} />
              ))}
            </div>
          </section>
        </div>

        {/* summary */}
        <aside className="co-side">
          <div className="co-summary">
            <h3 className="co-h" style={{ marginBottom: 14 }}>{t.co_summary}</h3>
            <div className="co-items">
              {items.map((it) => {
                const b = AC_breakdown(it.p);
                return (
                  <div className="co-item" key={it.p.id}>
                    <div className="co-item-media"><Media p={it.p} label="" /></div>
                    <div className="co-item-info">
                      <p className="co-item-name">{it.p.name[lang]}</p>
                      <span className="co-item-qty">{it.q} × {AC_fmt(b.total)} {t.unit}</span>
                    </div>
                    <span className="co-item-sum">{AC_fmt(b.total * it.q)}</span>
                  </div>
                );
              })}
            </div>
            <div className="co-line"><span>{t.co_items} ({count})</span><b>{AC_fmt(total)} {t.unit}</b></div>
            <div className="co-line"><span>{t.co_delivery_fee}</span><b className="free">{t.co_free}</b></div>
            <div className="co-total">
              <span>{t.co_total}</span>
              <span className="co-total-v">{AC_fmt(total)} <small>{t.unit}</small></span>
            </div>
            {err && <p className="field-err" style={{ textAlign: "center" }}>{t.co_err}</p>}
            <button className="co-place" onClick={place}>{t.co_place} <AC_I.check style={{ width: 18, height: 18 }} /></button>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------- Order success ---------- */
export function OrderSuccess({ order, t, onHome }) {
  return (
    <div className="wrap success up">
      <div className="success-card pop">
        <div className="success-ic"><AC_I.check style={{ width: 38, height: 38, strokeWidth: 2.6 }} /></div>
        <h1>{t.ok_t}</h1>
        <p>{t.ok_d}</p>
        <div className="success-order">
          <div>
            <span className="lbl">{t.ok_num}</span>
            <span className="num">{order.num}</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="lbl">{t.co_total}</span>
            <span className="num">{AC_fmt(order.total)} {t.unit}</span>
          </div>
        </div>
        <button className="co-place" style={{ maxWidth: 340, margin: "0 auto" }} onClick={onHome}>{t.ok_home}</button>
      </div>
    </div>
  );
}

export function MyOrders({ user, t, onHome }) {
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const SB_URL = "https://gjsaelqqubmlwnmfyuso.supabase.co";
  const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqc2FlbHFxdWJtbHdubWZ5dXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDY5MzAsImV4cCI6MjA5NzAyMjkzMH0.zLx1yBAUdMqtTW61zibbhQts3zVk-aRQTmTjn0L1U9Y";

  const STATUS_LABELS = { yangi: "🟡 Yangi", tasdiqlangan: "🔵 Tasdiqlangan", yetkazilmoqda: "🟣 Yetkazilmoqda", yakunlangan: "🟢 Yakunlangan", bekor: "🔴 Bekor" };

  useEffect(() => {
    if (!user || !user.email) { setLoading(false); return; }
    fetch(SB_URL + "/rest/v1/orders?user_email=eq." + encodeURIComponent(user.email) + "&order=created_at.desc", {
      headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY }
    }).then(r => r.json()).then(data => { setOrders(data || []); setLoading(false); })
    .catch(() => setLoading(false));
  }, [user]);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px", minHeight: "calc(100vh - 140px)" }}>
      <button onClick={onHome} style={{ background: "none", border: "none", cursor: "pointer", color: "#6c2bd9", fontWeight: 700, fontSize: 14, marginBottom: 16, padding: 0 }}>← Bosh sahifa</button>
      <h2 style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 22, margin: "0 0 20px" }}>Mening buyurtmalarim</h2>
      {loading && <p style={{ color: "#8a849c" }}>Yuklanmoqda...</p>}
      {!loading && !orders.length && <p style={{ color: "#8a849c" }}>Hozircha buyurtmalar yo'q</p>}
      {orders.map(o => (
        <div key={o.id} style={{ background: "#fff", border: "1px solid #ece8f4", borderRadius: 14, padding: 18, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 16 }}>{o.order_num}</span>
            <span style={{ fontSize: 13, color: "#8a849c" }}>{new Date(o.created_at).toLocaleDateString("ru-RU")}</span>
          </div>
          <div style={{ fontSize: 14, color: "#4a4360", marginBottom: 8 }}>
            {(o.items || []).map((it, i) => <div key={i}>{it.qty}× {it.name_uz} — {Math.round(it.price * it.qty).toLocaleString()} so'm</div>)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 17 }}>{Math.round(o.total).toLocaleString()} so'm</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{STATUS_LABELS[o.status] || o.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function HelpPage({ t, onHome, user, onLogin }) {
  const [chatOpen, setChatOpen] = React.useState(false);
  const [messages, setMessages] = React.useState([]);
  const [msg, setMsg] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [openFaq, setOpenFaq] = React.useState(null);
  const [unread, setUnread] = React.useState(0);
  const bottomRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const lastIdRef = React.useRef(0);

  const SB_URL = "https://gjsaelqqubmlwnmfyuso.supabase.co";
  const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqc2FlbHFxdWJtbHdubWZ5dXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDY5MzAsImV4cCI6MjA5NzAyMjkzMH0.zLx1yBAUdMqtTW61zibbhQts3zVk-aRQTmTjn0L1U9Y";

  const faqs = [
    { q: "Xitoydan buyurtma qilish xavfsizmi?", a: "Ha, biz siz uchun to'liq javob beramiz. To'lov bizga keladi, mahsulot tasdiqlangandan keyingina Xitoyga o'tkaziladi." },
    { q: "Yetkazib berish qancha vaqt oladi?", a: "Xitoydan O'zbekistongacha odatda 10-16 ish kuni." },
    { q: "Narxlarda nima kiradi?", a: "Zavod narxi + kargo + xizmat haqi. Hech qanday yashirin to'lov yo'q." },
    { q: "Mahsulot sifatsiz bo'lsa nima bo'ladi?", a: "Biz kafolat beramiz — to'liq qaytarib beramiz yoki qayta buyurtma qilamiz." },
    { q: "Qanday to'lash mumkin?", a: "Click, Payme yoki naqd pul." },
    { q: "Minimal buyurtma summasi bormi?", a: "Yo'q, istalgan miqdorda buyurtma qilsa bo'ladi." },
    { q: "Bir necha mahsulot buyurtsam chegirma bormi?", a: "Ha, kargo xarajati bo'linadi — ko'p mahsulot buyurtsangiz, har biriga tushadigan kargo kamayadi." },
  ];

  const fetchMessages = React.useCallback(() => {
    if (!user) return;
    fetch(SB_URL + "/rest/v1/chats?user_email=eq." + encodeURIComponent(user.email) + "&order=created_at.asc", {
      headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY }
    }).then(r => r.json()).then(data => {
      const msgs = data || [];
      if (!msgs.length) return;
      const maxId = msgs[msgs.length - 1].id;
      if (maxId > lastIdRef.current) {
        const newAdminMsgs = msgs.filter(m => m.id > lastIdRef.current && m.sender === "admin");
        setMessages(msgs);
        lastIdRef.current = maxId;
        if (!chatOpen && newAdminMsgs.length) setUnread(u => u + newAdminMsgs.length);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      } else if (lastIdRef.current === 0) {
        setMessages(msgs);
        lastIdRef.current = maxId;
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    });
  }, [user, chatOpen]);

  useEffect(() => {
    if (!user) return;
    fetchMessages();
    const iv = setInterval(fetchMessages, 1500);
    return () => clearInterval(iv);
  }, [user, fetchMessages]);

  useEffect(() => {
    if (chatOpen) {
      setUnread(0);
      setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); inputRef.current?.focus(); }, 100);
    }
  }, [chatOpen]);

  const sendMsg = async () => {
    if (!msg.trim() || sending) return;
    setSending(true);
    const text = msg.trim();
    setMsg("");
    await fetch(SB_URL + "/rest/v1/chats", {
      method: "POST",
      headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ user_email: user.email, sender: "user", message: text })
    });
    setSending(false);
    fetchMessages();
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 100px" }}>
      <button onClick={onHome} style={{ background: "none", border: "none", cursor: "pointer", color: "#6c2bd9", fontWeight: 700, fontSize: 14, marginBottom: 20, padding: 0 }}>← Bosh sahifa</button>
      <h2 style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 24, margin: "0 0 6px" }}>Yordam markazi</h2>
      <p style={{ color: "#8a849c", fontSize: 14, margin: "0 0 24px" }}>Ko'p so'raladigan savollarga javoblar</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
        {faqs.map((f, i) => (
          <div key={i} style={{ background: "#fff", border: "1.5px solid #ece8f4", borderRadius: 14, overflow: "hidden" }}>
            <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", fontWeight: 700, fontSize: 14.5, color: "#1b1430" }}>
              <span>{f.q}</span>
              <span style={{ fontSize: 20, color: "#6c2bd9", flexShrink: 0, display: "inline-block", transform: openFaq === i ? "rotate(45deg)" : "none", transition: ".2s" }}>+</span>
            </button>
            {openFaq === i && <div style={{ padding: "0 18px 16px", fontSize: 14, color: "#4a4360", lineHeight: 1.6 }}>{f.a}</div>}
          </div>
        ))}
      </div>

      {!user && (
        <div style={{ background: "linear-gradient(135deg,#5b21b6,#7c3aed)", borderRadius: 18, padding: "22px 24px", textAlign: "center", color: "#fff" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>💬</div>
          <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Admin bilan chat</div>
          <div style={{ fontSize: 13.5, opacity: .85, marginBottom: 16 }}>Kirish yoki ro'yxatdan o'tib, bevosita muloqot qiling</div>
          <button onClick={onLogin} style={{ background: "#fff", color: "#6c2bd9", border: "none", borderRadius: 10, padding: "12px 28px", fontFamily: "inherit", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Kirish / Ro'yxatdan o'tish</button>
        </div>
      )}

      {user && (
        <button onClick={() => setChatOpen(true)}
          style={{ position: "fixed", bottom: 80, right: 20, width: 58, height: 58, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#a855f7)", border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(124,58,237,.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, zIndex: 90 }}>
          💬
          {unread > 0 && <span style={{ position: "absolute", top: 0, right: 0, background: "#e11d48", color: "#fff", fontSize: 11, fontWeight: 800, width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{unread}</span>}
        </button>
      )}

      {chatOpen && (
        <div style={{ position: "fixed", bottom: 80, right: 16, width: "calc(100% - 32px)", maxWidth: 420, height: 500, background: "#fff", borderRadius: 20, boxShadow: "0 8px 40px rgba(0,0,0,.18)", display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 100 }}>
          <div style={{ background: "linear-gradient(135deg,#5b21b6,#7c3aed)", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, background: "rgba(255,255,255,.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛍️</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 14, fontFamily: "Sora, sans-serif" }}>SAVAT.UZ Yordam</div>
              <div style={{ color: "rgba(255,255,255,.75)", fontSize: 11.5 }}>🟢 Online</div>
            </div>
            <button onClick={() => setChatOpen(false)} style={{ background: "rgba(255,255,255,.15)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "14px", background: "#f7f5fb", display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", color: "#8a849c", padding: "20px 0", fontSize: 13.5 }}>
                <div style={{ fontSize: 30, marginBottom: 6 }}>👋</div>Salom! Savolingizni yozing
              </div>
            )}
            {messages.map((m, i) => {
              const isUser = m.sender === "user";
              return (
                <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 6 }}>
                  {!isUser && <div style={{ width: 26, height: 26, background: "linear-gradient(135deg,#5b21b6,#7c3aed)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>🛍️</div>}
                  <div style={{ maxWidth: "75%", padding: "9px 13px", borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: isUser ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "#fff", color: isUser ? "#fff" : "#1b1430", fontSize: 14, lineHeight: 1.5, boxShadow: "0 1px 4px rgba(0,0,0,.07)" }}>
                    {m.message}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: "10px 12px", borderTop: "1px solid #ece8f4", display: "flex", gap: 8, background: "#fff", flexShrink: 0 }}>
            <input ref={inputRef} value={msg} onChange={e => setMsg(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sendMsg(); } }}
              placeholder="Xabar yozing..." disabled={sending}
              style={{ flex: 1, border: "1.5px solid #ece8f4", borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", background: "#f7f5fb", outline: "none" }} />
            <button onClick={sendMsg} disabled={sending || !msg.trim()}
              style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: msg.trim() ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "#ece8f4", color: msg.trim() ? "#fff" : "#8a849c", cursor: msg.trim() ? "pointer" : "default", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>↑</button>
          </div>
        </div>
      )}
    </div>
  );
}
// window.AC = { AuthModal, MobileMenu, Checkout, OrderSuccess, MyOrders, HelpPage };