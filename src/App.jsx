import Icons from './components/Icons.jsx';
import { AuthModal, MobileMenu, Checkout, OrderSuccess, MyOrders, HelpPage } from './components/Modals.jsx';
import React, { useState, useEffect, useRef } from 'react';
import { breakdown, fmt, fetchProducts, fetchVariants, saveOrder, I18N, CATS, REGIONS, SB_URL, SB_KEY, ANON_KEY } from './lib/supabase.js';


/* ============ SAVAT.UZ — product detail, cart, app ============ */





/* ---- Image Swiper ---- */
export function ImageSwiper({ p, lang }) {
  const imgs = (p.image_urls && p.image_urls.length > 0) ? p.image_urls : (p.image_url ? [p.image_url] : []);
  const total = imgs.length;
  const [idx, setIdx] = React.useState(0);
  const wrapRef = React.useRef(null);
  const startX = React.useRef(null);
  const dragXRef = React.useRef(0);
  const [dragX, setDragX] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const idxRef = React.useRef(idx);
  React.useEffect(() => { idxRef.current = idx; }, [idx]);

  const goTo = (i) => { if(i < 0 || i >= total) return; setIdx(i); };
  const prev = (e) => { if(e) e.stopPropagation(); goTo(idxRef.current - 1); };
  const next = (e) => { if(e) e.stopPropagation(); goTo(idxRef.current + 1); };

  const endDragWithDx = (dx) => {
    // dx > 0 = o'ngga surdi = chapga o'tish
    // dx < 0 = chapga surdi = o'ngga o'tish
    const cur = idxRef.current;
    if (Math.abs(dx) > 40) {
      if (dx > 0 && cur > 0) goTo(cur - 1);
      else if (dx < 0 && cur < total - 1) goTo(cur + 1);
    }
    startX.current = null; dragXRef.current = 0; setDragX(0); setDragging(false);
  };

  const onTouchStart = (e) => { startX.current = e.touches[0].clientX; dragXRef.current = 0; setDragX(0); setDragging(true); };
  const onTouchMove  = (e) => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    dragXRef.current = dx; setDragX(dx);
  };
  const onTouchEnd = () => { endDragWithDx(dragXRef.current); };

  const onMouseDown = (e) => {
    if(total <= 1) return;
    e.preventDefault();
    startX.current = e.clientX; dragXRef.current = 0; setDragX(0); setDragging(true);
    const onMove = (ev) => {
      const dx = ev.clientX - startX.current;
      dragXRef.current = dx; setDragX(dx);
    };
    const onUp = () => {
      endDragWithDx(dragXRef.current);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };
  const onMouseMove  = () => {};
  const onMouseUp    = () => {};
  const onMouseLeave = () => {};

  const pxOffset = dragging ? dragX : 0;
  const pctBase = -(idx * 100);

  const ChevL = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>;
  const ChevR = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>;

  return (
    <div>
      <div
        className="swiper-wrap"
        ref={wrapRef}
        style={{ cursor: total > 1 ? (dragging ? "grabbing" : "grab") : "default" }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseLeave}
      >
        <div
          className={"swiper-track" + (dragging ? " no-anim" : "")}
          style={{ transform: `translateX(calc(${pctBase}% + ${pxOffset}px))` }}
        >
          {total === 0 ? (
            <div className="swiper-slide">
              <div className="ph" style={{ background: p.tile }}>
                <span className="ph-label">{p.name[lang || "uz"].toLowerCase()}</span>
              </div>
            </div>
          ) : imgs.map((url, i) => (
            <div className="swiper-slide" key={i}>
              <img src={url} alt={p.name[lang || "uz"]} draggable="false" />
            </div>
          ))}
        </div>

        <div className="swiper-badge">
          <span className="badge-disc" style={{ fontSize: 15, padding: "7px 14px" }}>−{breakdown(p).pct}%</span>
        </div>

        {total > 1 && (
          <>
            {idx > 0 && <button className="swiper-btn swiper-prev" onClick={prev} aria-label="Oldingi"><ChevL /></button>}
            {idx < total - 1 && <button className="swiper-btn swiper-next" onClick={next} aria-label="Keyingi"><ChevR /></button>}
          </>
        )}
      </div>

      {total > 1 && (
        <>
          <div className="swiper-dots">
            {imgs.map((_, i) => <button key={i} className={"swiper-dot" + (i === idx ? " on" : "")} onClick={() => goTo(i)} />)}
          </div>
          <div className="swiper-thumbs">
            {imgs.map((url, i) => (
              <div key={i} className={"swiper-thumb" + (i === idx ? " on" : "")} onClick={() => goTo(i)}>
                <img src={url} alt={"" + (i+1)} draggable="false" />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---- Variant Picker ---- */
export function VariantPicker({ variants, selected, onSelect, productImages }) {
  if (!variants || variants.length === 0) return null;

  const groups = {};
  variants.forEach(v => {
    if (!groups[v.type]) groups[v.type] = [];
    groups[v.type].push(v);
  });

  const typeLabels = { color: "Rang", size: "Razmer", model: "Model" };

  return (
    <div style={{ margin: "16px 0" }}>
      {Object.entries(groups).map(([type, items]) => {
        const sel = selected[type];
        return (
          <div key={type} style={{ marginBottom: 16 }}>
            <div className="var-label">
              {typeLabels[type] || type}
              {sel && <span style={{ fontWeight: 800, color: "var(--ink)", textTransform: "none", letterSpacing: 0 }}> — {sel.value}</span>}
            </div>

            {type === "color" ? (
              /* Rang: kichik rasm kartochkalar (Taobao uslubi) */
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {items.map((v, i) => {
                  const isOn = sel && sel.id === v.id;
                  /* Rang uchun: agar image_url bo'lsa — rasm, bo'lmasa color_hex doira */
                  const imgSrc = v.image_url || (productImages && productImages[i]) || null;
                  return (
                    <button
                      key={v.id}
                      onClick={() => onSelect(type, v)}
                      style={{
                        position: "relative", padding: 0, border: "2px solid " + (isOn ? "var(--brand)" : "var(--line-2)"),
                        borderRadius: 10, overflow: "hidden", cursor: "pointer", background: "var(--surface-2)",
                        boxShadow: isOn ? "0 0 0 3px var(--brand-soft)" : "none",
                        transition: ".15s", flexShrink: 0,
                        width: imgSrc ? 56 : 40, height: imgSrc ? 56 : 40,
                      }}
                      title={v.value}
                    >
                      {imgSrc ? (
                        <img src={imgSrc} alt={v.value} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", background: v.color_hex || "#ccc",
                          display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {isOn && <span style={{ color: "#fff", fontSize: 16, fontWeight: 800, textShadow: "0 1px 3px rgba(0,0,0,.4)" }}>✓</span>}
                        </div>
                      )}
                      {isOn && imgSrc && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(108,43,217,.15)",
                          display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: "var(--brand)", fontSize: 16, fontWeight: 800 }}>✓</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Razmer / Model: chip tugmalar */
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {items.map(v => {
                  const isOn = sel && sel.id === v.id;
                  return (
                    <button
                      key={v.id}
                      className={"var-chip" + (isOn ? " on" : "")}
                      onClick={() => onSelect(type, v)}
                    >
                      {v.value}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Product Detail ---------- */
export function ProductDetail({ p, t, lang, qty, onBack, onAdd, onOrder, onInc, onDec }) {
  const b = breakdown(p);
  const [thumb, setThumb] = useState(0);
  const [open, setOpen] = useState(false);
  const total = useCountUp(b.total, true);
  const [variants, setVariants] = useState([]);
  const [selVars, setSelVars] = useState({});

  useEffect(() => {
    if(!p || !p.id) return;
    const SB = "https://gjsaelqqubmlwnmfyuso.supabase.co";
    const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqc2FlbHFxdWJtbHdubWZ5dXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDY5MzAsImV4cCI6MjA5NzAyMjkzMH0.zLx1yBAUdMqtTW61zibbhQts3zVk-aRQTmTjn0L1U9Y";
    fetch(SB + "/rest/v1/product_variants?product_id=eq." + p.id + "&order=id", {
      headers: { apikey: KEY }
    }).then(r => r.json()).then(rows => setVariants(rows || [])).catch(() => {});
  }, [p && p.id]);

  const types = [...new Set(variants.map(v => v.type))];
  const allSelected = types.length === 0 || types.every(t => selVars[t]);
  const varLabel = Object.values(selVars).map(v => v.value).join(", ");
  const under = p.weight < 1;

  const wLabel = p.weight < 1 ? Math.round(p.weight * 1000) + " g" : p.weight + " kg";
  const rows = [
    { ic: <Icons.factory />, lbl: t.pc_china, val: b.china },
    { ic: <Icons.plane />, lbl: t.pc_cargo, val: b.cargo },
    { ic: <Icons.shield />, lbl: t.pc_service, val: b.service },
  ];

  return (
    <div className="pd wrap up">
      <button className="back-link" onClick={onBack}><Icons.back style={{ width: 18, height: 18 }} />{t.back}</button>
      <div className="pd-grid">
        {/* gallery */}
        <div className="pd-gallery">
          <ImageSwiper p={p} lang={lang} />
        </div>

        {/* info */}
        <div>
          <span className="pd-src"><Icons.globe style={{ width: 15, height: 15 }} /> Pinduoduo · 拼多多</span>
          <h1 className="pd-title">{p.name[lang]}</h1>
          <p className="pd-sub">{p.sub[lang]}</p>
          <div className="pd-meta">
            <span className="stars" style={{ fontSize: 15 }}>{"★".repeat(5)}</span>
            <b>{p.rating}</b>
            <span className="sep" />
            <span>{fmt(p.sold)} {t.sold}</span>
            <span className="sep" />
            <span><b>{p.days}</b> {t.delivery_days}</span>
            <span className="sep" />
            <span>{t.weight}: <b>{wLabel}</b></span>
          </div>

          {/* price calculator */}
          <div className="calc">
            <div className="calc-h"><h3>{t.pc_title}</h3></div>
            {rows.map((r, i) => (
              <div className="calc-row" key={i}>
                <span className="lbl"><span className="ic" style={{ color: p.accent }}>{r.ic}</span>{r.lbl}</span>
                <span className="val">{fmt(r.val)} {t.unit}</span>
              </div>
            ))}
            <div className="calc-total">
              <div className="was">{t.pc_market}: <s>{fmt(b.market)} {t.unit}</s></div>
              <div className="now-row">
                <span className="now-lbl">{t.pc_total}</span>
                <span className="now">{fmt(total)} <small>{t.unit}</small></span>
              </div>
              <div className="calc-save"><Icons.flame style={{ width: 15, height: 15 }} />{t.pc_save} {fmt(b.save)} {t.unit}</div>
            </div>

            {/* service explainer */}
            <div className="svc">
              <button className={"svc-q" + (open ? " open" : "")} onClick={() => setOpen(!open)}>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Icons.shield style={{ width: 18, height: 18, color: "var(--brand)" }} />{t.service_q}
                </span>
                <Icons.chevron className="chev" style={{ width: 18, height: 18 }} />
              </button>
              {open && (
                <div className="svc-body pop">
                  <div className={"svc-rule" + (under ? " svc-active" : "")}>
                    <span className="k"><span className="badge">≤1</span>{t.service_r1}</span>
                    <span className="v">{t.service_r1v}</span>
                  </div>
                  <div className={"svc-rule" + (!under ? " svc-active" : "")}>
                    <span className="k"><span className="badge">1+</span>{t.service_r2}</span>
                    <span className="v">{t.service_r2v}</span>
                  </div>
                  <p className="svc-note">
                    {t.service_note} <b style={{ color: "var(--ink)" }}>{wLabel} → {fmt(b.service)} {t.unit}</b>
                  </p>
                </div>
              )}
            </div>
          </div>

          <VariantPicker
            variants={variants}
            selected={selVars}
            onSelect={(type, v) => setSelVars(prev => ({...prev, [type]: v}))}
            productImages={p.image_urls || (p.image_url ? [p.image_url] : [])}
          />
          {variants.length > 0 && !allSelected && (
            <div style={{fontSize:13,color:"#e05c00",fontWeight:700,marginBottom:10}}>
              ⚠️ Variantni tanlang
            </div>
          )}
          <div className="pd-cta">
            <button className="order" onClick={() => { if(variants.length > 0 && !allSelected) return; onOrder(p, varLabel); }} style={variants.length > 0 && !allSelected ? {opacity:.5} : {}}>{t.detail_order} <Icons.arrow style={{ width: 18, height: 18 }} /></button>
            {qty > 0 ? (
              <div className="stepper stepper-lg">
                <button onClick={() => onDec(p.id)} aria-label="-"><Icons.minus /></button>
                <span>{qty}</span>
                <button onClick={() => onInc(p)} aria-label="+"><Icons.plus /></button>
              </div>
            ) : (
              <button className="addc" onClick={(e) => { if(variants.length > 0 && !allSelected) return; onAdd(p, e, varLabel); }} style={variants.length > 0 && !allSelected ? {opacity:.5} : {}} aria-label={t.detail_add}><Icons.cart style={{ width: 22, height: 22 }} /></button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Cart Drawer ---------- */
export function CartDrawer({ open, items, t, lang, onClose, onQty, onRemove, onCheckout }) {
  const total = items.reduce((s, it) => s + breakdown(it.p).total * it.q, 0);
  const count = items.reduce((s, it) => s + it.q, 0);
  return (
    <>
      <div className={"scrim" + (open ? " on" : "")} onClick={onClose} />
      <aside className={"drawer" + (open ? " on" : "")}>
        <div className="drawer-h">
          <h3>{t.cart_title}{count > 0 ? ` · ${count}` : ""}</h3>
          <button className="x-btn" onClick={onClose}><Icons.x style={{ width: 20, height: 20 }} /></button>
        </div>
        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="cart-empty">
              <div className="big"><Icons.cart style={{ width: 30, height: 30 }} /></div>
              <p>{t.cart_empty}</p>
            </div>
          ) : items.map((it) => {
            const b = breakdown(it.p);
            return (
              <div className="ci" key={it.p.id}>
                <div className="ci-media"><Media p={it.p} label="" /></div>
                <div className="ci-info">
                  <p className="ci-name">{it.p.name[lang]}</p>
                  <span className="ci-price">{fmt(b.total * it.q)} <small style={{ fontSize: 12, color: "var(--ink-3)" }}>{t.unit}</small></span>
                  <div>
                    <div className="ci-qty">
                      <button onClick={() => onQty(it.p.id, -1)}><Icons.minus style={{ width: 14, height: 14 }} /></button>
                      <span>{it.q}</span>
                      <button onClick={() => onQty(it.p.id, 1)}><Icons.plus style={{ width: 14, height: 14 }} /></button>
                    </div>
                  </div>
                </div>
                <button className="ci-rm" onClick={() => onRemove(it.p.id)}><Icons.x style={{ width: 16, height: 16 }} /></button>
              </div>
            );
          })}
        </div>
        {items.length > 0 && (
          <div className="drawer-foot">
            <div className="drawer-total">
              <span className="t-l">{t.cart_total}</span>
              <span className="t-v">{fmt(total)} <small style={{ fontSize: 16 }}>{t.unit}</small></span>
            </div>
            <button className="checkout" onClick={onCheckout}>{t.cart_checkout} →</button>
          </div>
        )}
      </aside>
    </>
  );
}

/* ---------- App ---------- */
export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem("savat_lang") || "uz");
  const [view, setView] = useState("home"); // home | product | checkout | success
  const [current, setCurrent] = useState(null);
  const [cat, setCat] = useState("all");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("savat_user") || "null"); } catch (e) { return null; }
  });
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [order, setOrder] = useState(null);
  const [query, setQuery] = useState("");
  const toastTimer = useRef(null);

  const t = I18N[lang];
  useEffect(() => { localStorage.setItem("savat_lang", lang); }, [lang]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => {
    if (user) localStorage.setItem("savat_user", JSON.stringify(user));
    else localStorage.removeItem("savat_user");
  }, [user]);
  useEffect(() => {
    fetchProducts()
      .then((rows) => { if (rows && rows.length) setProducts(rows); })
      .catch((err) => { console.error("Mahsulotlarni yuklashda xato:", err); })
      .finally(() => setProductsLoading(false));
  }, []);

  const featured = products.find((p) => p.id === 1) || products[0];
  const list = products.filter((p) => {
    const matchCat = cat === "all" || p.cat === cat;
    const q = query.trim().toLowerCase();
    const matchQ = !q || p.name.uz.toLowerCase().includes(q) || p.name.ru.toLowerCase().includes(q) || (p.sub && (p.sub.uz.toLowerCase().includes(q) || p.sub.ru.toLowerCase().includes(q)));
    return matchCat && matchQ;
  });

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  };
  const addToCart = (p) => {
    setCart((c) => {
      const f = c.find((it) => it.p.id === p.id);
      if (f) return c.map((it) => it.p.id === p.id ? { ...it, q: it.q + 1 } : it);
      return [...c, { p, q: 1 }];
    });
    showToast(t.added);
  };
  const changeQty = (id, d) => setCart((c) => c.map((it) => it.p.id === id ? { ...it, q: Math.max(1, it.q + d) } : it));
  const removeItem = (id) => setCart((c) => c.filter((it) => it.p.id !== id));
  const decItem = (id) => setCart((c) => c.flatMap((it) => it.p.id === id ? (it.q > 1 ? [{ ...it, q: it.q - 1 }] : []) : [it]));
  const cartQty = (id) => { const it = cart.find((i) => i.p.id === id); return it ? it.q : 0; };
  const openProduct = (p) => { setCurrent(p); setView("product"); window.scrollTo({ top: 0 }); };
  const goHome = () => { setView("home"); window.scrollTo({ top: 0 }); };
  const goCheckout = () => {
    if (cart.length === 0) return;
    setCartOpen(false);
    setView("checkout");
    window.scrollTo({ top: 0 });
  };
  const onAccount = () => { if (user) setMenuOpen(true); else setAuthOpen(true); };
  const onAuth = (u) => { setUser(u); setAuthOpen(false); };
  const onLogout = () => { setUser(null); };
  const placeOrder = (o) => {
    saveOrder({ ...o, user_email: user ? user.email : null }).catch((err) => console.error("Buyurtmani saqlashda xato:", err));
    setOrder(o);
    setCart([]);
    setView("success");
    window.scrollTo({ top: 0 });
  };

  const cartCount = cart.reduce((s, it) => s + it.q, 0);

  return (
    <>
      <Header t={t} lang={lang} setLang={setLang} cartCount={cartCount}
        onCart={() => setCartOpen(true)} onHome={goHome}
        user={user} onAccount={onAccount} onMenu={() => setMenuOpen(true)}
        onMyOrders={() => setView("myorders")} onHelp={() => setView("help")} onCatalog={() => { goHome(); document.querySelector(".cats")?.scrollIntoView({behavior:"smooth"}); }}
        query={query} onSearch={(v) => { setQuery(v); if(view !== "home") setView("home"); }}
        products={products} onSelect={(p) => { setQuery(""); openProduct(p); }} />
      <MobileSearch t={t} query={query} lang={lang}
        onSearch={(v) => { setQuery(v); if(view !== "home") setView("home"); }}
        products={products} onSelect={(p) => { setQuery(""); openProduct(p); }} />

      {view === "home" && (
        <main>
          <Hero t={t} lang={lang} product={featured} onView={openProduct} onAdd={addToCart} />
          <Cats cats={CATS} lang={lang} active={cat} onPick={setCat} />
          <Bestsellers products={list} t={t} lang={lang} qtyFor={cartQty} query={query}
            onView={openProduct}
            onAdd={(p) => {
              if (p._hasVariants) { openProduct(p); }
              else { addToCart(p); }
            }}
            onInc={(p) => addToCart(p)} onDec={decItem} />
          <Why t={t} />
          <Footer t={t} />
        </main>
      )}
      {view === "product" && (
        <main>
          <ProductDetail p={current} t={t} lang={lang} qty={cartQty(current.id)} onBack={goHome}
            onAdd={(p) => addToCart(p)} onOrder={(p) => { addToCart(p); goCheckout(); }}
            onInc={(p) => addToCart(p)} onDec={decItem} />
          <Footer t={t} />
        </main>
      )}
      {view === "checkout" && (
        <main>
          <Checkout items={cart} t={t} lang={lang} user={user}
            onBack={() => (current ? openProduct(current) : goHome())}
            onPlace={placeOrder} onRequireAuth={() => setAuthOpen(true)} />
          <Footer t={t} />
        </main>
      )}
      {view === "success" && order && (
        <main>
          <OrderSuccess order={order} t={t} onHome={goHome} />
          <Footer t={t} />
        </main>
      )}
      {view === "myorders" && (
        <main>
          <MyOrders user={user} t={t} onHome={goHome} />
        </main>
      )}
      {view === "help" && (
        <main>
          <HelpPage t={t} onHome={goHome} user={user} onLogin={() => setAuthOpen(true)} />
        </main>
      )}

      <CartDrawer open={cartOpen} items={cart} t={t} lang={lang}
        onClose={() => setCartOpen(false)} onQty={changeQty} onRemove={removeItem}
        onCheckout={goCheckout} />

      <AuthModal open={authOpen} t={t} onClose={() => setAuthOpen(false)} onAuth={onAuth} />
      <MobileMenu open={menuOpen} t={t} lang={lang} setLang={setLang}
        onClose={() => setMenuOpen(false)} onHome={goHome}
        user={user} onAccount={() => setAuthOpen(true)} onLogout={onLogout}
        onMyOrders={() => setView("myorders")}
        onHelp={() => { setMenuOpen(false); setView("help"); }}
        onCatalog={() => { setMenuOpen(false); goHome(); }} />

      {/* Bottom Navigation — faqat mobile */}
      <nav className="bottom-nav">
        <button className={view === "home" ? "active" : ""} onClick={goHome}>
          <Icons.home style={{ width: 22, height: 22 }} />
          <span>Bosh</span>
        </button>
        <button onClick={() => { goHome(); setTimeout(() => document.querySelector(".cats")?.scrollIntoView({behavior:"smooth"}), 100); }}>
          <Icons.grid style={{ width: 22, height: 22 }} />
          <span>Katalog</span>
        </button>
        {user ? (
          <button className={view === "myorders" ? "active" : ""} onClick={() => setView("myorders")}>
            <Icons.box style={{ width: 22, height: 22 }} />
            <span>Buyurtmalar</span>
          </button>
        ) : (
          <button className={view === "help" ? "active" : ""} onClick={() => setView("help")}>
            <Icons.help style={{ width: 22, height: 22 }} />
            <span>Yordam</span>
          </button>
        )}
        <button className="bn-cart" onClick={() => setCartOpen(true)}>
          <Icons.cart style={{ width: 22, height: 22 }} />
          {cartCount > 0 && <span className="bn-badge">{cartCount}</span>}
          <span>Savat</span>
        </button>
      </nav>

      <div className={"toast" + (toast ? " on" : "")}>
        <span className="ok"><Icons.check style={{ width: 13, height: 13, color: "#fff" }} /></span>
        {toast}
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);