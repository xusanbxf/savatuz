/* ============ SAVAT.UZ — components ============ */
import React, { useState, useEffect, useRef } from 'react';
import Icons from './components/Icons.jsx';
import { breakdown, fmt, fetchProducts, saveOrder, I18N, CATS, REGIONS, SB_URL, SB_KEY, ANON_KEY } from './lib/supabase.js';
const I = Icons;

/* ---- placeholder media tile ---- */
function Media({ p, label }) {
  if (p.image_url) {
    return (
      <div className="ph" style={{ background: p.tile, padding: 0, overflow: "hidden" }}>
        <img src={p.image_url} alt={p.name.uz} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
    );
  }
  return (
    <div className="ph" style={{ background: p.tile }}>
      <span className="ph-label">{label || p.name.uz.toLowerCase()}</span>
    </div>
  );
}

/* ---- animated count-up ---- */
function useCountUp(target, on) {
  const [v, setV] = useState(target);
  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!on || document.hidden || reduce) { setV(target); return; }
    let raf, start;
    const dur = 700;
    setV(0);
    const step = (t) => {
      if (!start) start = t;
      const k = Math.min((t - start) / dur, 1);
      const e = 1 - Math.pow(1 - k, 3);
      setV(target * e);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const safety = setTimeout(() => setV(target), dur + 200);
    return () => { cancelAnimationFrame(raf); clearTimeout(safety); };
  }, [target, on]);
  return v;
}

/* ---- Header ---- */
function Header({ t, lang, setLang, cartCount, onCart, onHome, user, onAccount, onMenu, onMyOrders, onHelp, onCatalog, query, onSearch, products, onSelect }) {
  return (
    <header className="hdr">
      <div className="wrap hdr-row">
        <button className="burger" onClick={onMenu} aria-label="menu"><I.menu /></button>
        <div className="brand" onClick={onHome}>
          <div className="brand-mark"><I.basket /></div>
          <div>
            <div className="brand-name">SAVAT<span className="uz">.UZ</span></div>
            <div className="brand-tag">{t.tag}</div>
          </div>
        </div>
        <nav className="nav">
          <button onClick={onHome}>{t.nav_home}</button>
          <button onClick={onCatalog}>{t.nav_catalog}</button>
          {user && <button onClick={onMyOrders}>{t.nav_track}</button>}
          <button onClick={onHelp}>{t.nav_help}</button>
        </nav>
        <SearchBox t={t} query={query} onSearch={onSearch} products={products} onSelect={onSelect} lang={lang} />
        <div className="hdr-actions">
          <div className="lang">
            <button className={lang === "uz" ? "on" : ""} onClick={() => setLang("uz")}>UZ</button>
            <button className={lang === "ru" ? "on" : ""} onClick={() => setLang("ru")}>RU</button>
          </div>
          <button className="acct-btn" onClick={onAccount}>
            <I.user style={{ width: 18, height: 18 }} />
            <span className="acct-label">{user ? user.name.split(" ")[0] : t.login}</span>
          </button>
          <button className="cart-btn" onClick={onCart}>
            <I.cart />
            <span className="cart-word">{t.cart_title}</span>
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}


/* ---- Search with Dropdown ---- */
function SearchBox({ t, query, onSearch, products, onSelect, lang, mobile }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  
  const bd = breakdown;

  const suggestions = query.trim().length > 0
    ? (products || []).filter(p => {
        const q = query.trim().toLowerCase();
        return p.name.uz.toLowerCase().includes(q) || p.name.ru.toLowerCase().includes(q);
      }).slice(0, 6)
    : [];

  React.useEffect(() => {
    const handler = (e) => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, []);

  const inner = (
    <div className="search-wrap" ref={ref}>
      <div className="search">
        <I.search />
        <input
          placeholder={t.search}
          value={query}
          onChange={(e) => { onSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if(e.key === "Escape") { onSearch(""); setOpen(false); } }}
        />
        {query && <button className="search-clear" onClick={() => { onSearch(""); setOpen(false); }}>×</button>}
      </div>
      {open && query.trim().length > 0 && (
        <div className="search-dropdown">
          {suggestions.length === 0 ? (
            <div className="sd-empty">🔍 {lang === "ru" ? "Ничего не найдено" : "Hech narsa topilmadi"}</div>
          ) : suggestions.map(p => {
            const b = bd(p);
            const imgUrl = (p.image_urls && p.image_urls[0]) || p.image_url;
            return (
              <div className="sd-item" key={p.id} onMouseDown={(e) => { e.preventDefault(); onSelect(p); onSearch(""); setOpen(false); }}>
                <div className="sd-img">
                  {imgUrl ? <img src={imgUrl} alt={p.name[lang||"uz"]} /> : <div style={{width:"100%",height:"100%",background:p.tile,borderRadius:10}}/>}
                </div>
                <div className="sd-info">
                  <div className="sd-name">{p.name[lang||"uz"]}</div>
                  <div className="sd-price">{fmt(b.total)} so'm</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if(mobile) return <div className="mobile-search">{inner}</div>;
  return inner;
}

function MobileSearch({ t, query, onSearch, products, onSelect, lang }) {
  return <SearchBox t={t} query={query} onSearch={onSearch} products={products} onSelect={onSelect} lang={lang} mobile={true} />;
}

/* ---- Hero ---- */
function Hero({ t, lang, product, onView, onAdd }) {
  const b = breakdown(product);
  return (
    <section className="hero">
      <div className="wrap hero-grid">
        <div className="hero-left up">
          <span className="kicker"><span className="dot" />{t.hero_kicker}</span>
          <h1 className="hero-h1">{t.hero_title}</h1>
          <p className="hero-lead">{t.hero_lead}</p>
          <div className="hero-cta-row">
            <button className="btn-primary" onClick={() => onView(product)}>
              {t.hero_cta} <I.arrow style={{ width: 18, height: 18 }} />
            </button>
            <button className="btn-ghost" onClick={() => onView(product)}>{t.hero_secondary}</button>
          </div>
        </div>

        <div className="hero-card up">
          <div className="hero-media" style={{ cursor: "pointer" }} onClick={() => onView(product)}>
            <span className="badge-disc" style={{ position: "absolute", top: 14, left: 14, zIndex: 2 }}>−{b.pct}%</span>
            <Media p={product} />
          </div>
          <div className="hero-card-body">
            <h3 className="hero-card-title">{product.name[lang]}</h3>
            <p className="hero-card-sub">{product.sub[lang]}</p>
            <div className="hero-price-row">
              <div>
                <div className="hero-was">{fmt(b.market)} {t.unit}</div>
                <div className="hero-now">{fmt(b.total)} <small>{t.unit}</small></div>
              </div>
              <span className="save-chip"><I.flame style={{ width: 14, height: 14 }} />{t.hero_save} {fmt(b.save)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---- Category strip ---- */
function Cats({ cats, lang, active, onPick }) {
  const emojis = { all: "🛍️", tech: "📱", shoes: "👟", fashion: "👗", home: "🏠" };
  return (
    <div className="wrap">
      <div className="cats">
        {cats.map((c) => (
          <button key={c.id} className={"cat" + (active === c.id ? " on" : "")} onClick={() => onPick(c.id)}>
            <span className="cat-emoji">{emojis[c.id] || "📦"}</span>
            {c[lang]}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---- Product card ---- */
function ProductCard({ p, t, lang, qty, onView, onAdd, onInc, onDec }) {
  const b = breakdown(p);
  const stop = (e) => e.stopPropagation();
  return (
    <div className="card" onClick={() => onView(p)}>
      <div className="card-media">
        <span className="badge-disc">−{b.pct}%</span>
        {qty > 0 && <span className="badge-incart"><I.check style={{ width: 12, height: 12, strokeWidth: 2.6 }} />{qty} {t.qty}</span>}
        {p.hit && qty === 0 && <span className="badge-hit"><I.flame style={{ width: 12, height: 12 }} />HIT</span>}
        <Media p={p} />
      </div>
      <div className="card-body">
        <h4 className="card-name">{p.name[lang]}</h4>
        <p className="card-sub">{p.sub[lang]}</p>
        <div className="card-rate">
          <span className="stars">{"★".repeat(5)}</span>
          <span>{p.rating}</span>
          <span style={{ color: "var(--ink-3)" }}>· {fmt(p.sold)} {t.sold}</span>
        </div>
        <div className="card-foot">
          <div>
            <span className="card-was">{fmt(b.market)}</span>
            <span className="card-price">{fmt(b.total)} <small>{t.unit}</small></span>
          </div>
          {qty > 0 ? (
            <div className="stepper" onClick={stop}>
              <button onClick={(e) => { stop(e); onDec(p.id); }} aria-label="-"><I.minus /></button>
              <span>{qty}</span>
              <button onClick={(e) => { stop(e); onInc(p); }} aria-label="+"><I.plus /></button>
            </div>
          ) : (
            <button className="card-add" onClick={(e) => { stop(e); onAdd(p, e); }} aria-label={t.add}>
              <I.plus />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- Grid section ---- */
function Bestsellers({ products, t, lang, qtyFor, onView, onAdd, onInc, onDec, query }) {
  return (
    <section className="wrap">
      <div className="sec-head">
        <div>
          <h2 className="sec-title">
            {query ? <><span style={{fontSize:22}}>🔍</span> "{query}"</> : <><span className="sec-flame">🔥</span> {t.best_title}</>}
          </h2>
          <p className="sec-sub">{query ? (lang==="ru" ? "Результаты поиска: " : "Qidiruv natijalari: ") + products.length + (lang==="ru" ? " товаров" : " ta mahsulot") : t.best_sub}</p>
        </div>
      </div>
      {products.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"var(--ink-3)" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
          <div style={{ fontFamily:"Sora,sans-serif", fontWeight:800, fontSize:18, color:"var(--ink)", marginBottom:8 }}>
            {lang==="ru" ? "Ничего не найдено" : "Hech narsa topilmadi"}
          </div>
          <div style={{ fontSize:14 }}>"{query}" {lang==="ru" ? "по вашему запросу нет товаров" : "bo'yicha mahsulot yo'q"}</div>
        </div>
      ) : (
        <div className="grid">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} t={t} lang={lang} qty={qtyFor(p.id)}
              onView={onView} onAdd={onAdd} onInc={onInc} onDec={onDec} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ---- Why strip ---- */
function Why({ t }) {
  const items = [
    { ic: <I.factory />, tk: "why1_t", dk: "why1_d" },
    { ic: <I.tag />, tk: "why2_t", dk: "why2_d" },
    { ic: <I.truck />, tk: "why3_t", dk: "why3_d" },
  ];
  return (
    <section className="wrap">
      <div className="why">
        {items.map((it, i) => (
          <div className="why-card" key={i}>
            <div className="why-ic">{it.ic}</div>
            <h3 className="why-t">{t[it.tk]}</h3>
            <p className="why-d">{t[it.dk]}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---- Footer ---- */
function Footer({ t }) {
  return (
    <footer className="ftr">
      <div className="wrap ftr-row">
        <div className="brand">
          <div className="brand-mark" style={{ width: 34, height: 34, borderRadius: 10 }}><I.basket style={{ width: 20, height: 20 }} /></div>
          <div className="brand-name" style={{ fontSize: 18 }}>SAVAT<span className="uz">.UZ</span></div>
        </div>
        <small>© 2026 SAVAT.UZ — {t.tag}</small>
      </div>
    </footer>
  );
}

/* ============ SAVAT.UZ — product detail, cart, app ============ */
import { AuthModal, MobileMenu, Checkout, OrderSuccess, MyOrders, HelpPage } from './components/Modals.jsx';
const Ico = Icons;
const D = { breakdown, fmt, CATS, REGIONS, I18N, fetchProducts };

/* ---- Image Swiper ---- */
function ImageSwiper({ p, lang }) {
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
function VariantPicker({ variants, selected, onSelect, productImages }) {
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
function ProductDetail({ p, t, lang, qty, onBack, onAdd, onOrder, onInc, onDec }) {
  const b = D.breakdown(p);
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
    { ic: <Ico.factory />, lbl: t.pc_china, val: b.china },
    { ic: <Ico.plane />, lbl: t.pc_cargo, val: b.cargo },
    { ic: <Ico.shield />, lbl: t.pc_service, val: b.service },
  ];

  return (
    <div className="pd wrap up">
      <button className="back-link" onClick={onBack}><Ico.back style={{ width: 18, height: 18 }} />{t.back}</button>
      <div className="pd-grid">
        {/* gallery */}
        <div className="pd-gallery">
          <ImageSwiper p={p} lang={lang} />
        </div>

        {/* info */}
        <div>
          <span className="pd-src"><Ico.globe style={{ width: 15, height: 15 }} /> Pinduoduo · 拼多多</span>
          <h1 className="pd-title">{p.name[lang]}</h1>
          <p className="pd-sub">{p.sub[lang]}</p>
          <div className="pd-meta">
            <span className="stars" style={{ fontSize: 15 }}>{"★".repeat(5)}</span>
            <b>{p.rating}</b>
            <span className="sep" />
            <span>{D.fmt(p.sold)} {t.sold}</span>
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
                <span className="val">{D.fmt(r.val)} {t.unit}</span>
              </div>
            ))}
            <div className="calc-total">
              <div className="was">{t.pc_market}: <s>{D.fmt(b.market)} {t.unit}</s></div>
              <div className="now-row">
                <span className="now-lbl">{t.pc_total}</span>
                <span className="now">{D.fmt(total)} <small>{t.unit}</small></span>
              </div>
              <div className="calc-save"><Ico.flame style={{ width: 15, height: 15 }} />{t.pc_save} {D.fmt(b.save)} {t.unit}</div>
            </div>

            {/* service explainer */}
            <div className="svc">
              <button className={"svc-q" + (open ? " open" : "")} onClick={() => setOpen(!open)}>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Ico.shield style={{ width: 18, height: 18, color: "var(--brand)" }} />{t.service_q}
                </span>
                <Ico.chevron className="chev" style={{ width: 18, height: 18 }} />
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
                    {t.service_note} <b style={{ color: "var(--ink)" }}>{wLabel} → {D.fmt(b.service)} {t.unit}</b>
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
            <button className="order" onClick={() => { if(variants.length > 0 && !allSelected) return; onOrder(p, varLabel); }} style={variants.length > 0 && !allSelected ? {opacity:.5} : {}}>{t.detail_order} <Ico.arrow style={{ width: 18, height: 18 }} /></button>
            {qty > 0 ? (
              <div className="stepper stepper-lg">
                <button onClick={() => onDec(p.id)} aria-label="-"><Ico.minus /></button>
                <span>{qty}</span>
                <button onClick={() => onInc(p)} aria-label="+"><Ico.plus /></button>
              </div>
            ) : (
              <button className="addc" onClick={(e) => { if(variants.length > 0 && !allSelected) return; onAdd(p, e, varLabel); }} style={variants.length > 0 && !allSelected ? {opacity:.5} : {}} aria-label={t.detail_add}><Ico.cart style={{ width: 22, height: 22 }} /></button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Cart Drawer ---------- */
function CartDrawer({ open, items, t, lang, onClose, onQty, onRemove, onCheckout }) {
  const total = items.reduce((s, it) => s + D.breakdown(it.p).total * it.q, 0);
  const count = items.reduce((s, it) => s + it.q, 0);
  return (
    <>
      <div className={"scrim" + (open ? " on" : "")} onClick={onClose} />
      <aside className={"drawer" + (open ? " on" : "")}>
        <div className="drawer-h">
          <h3>{t.cart_title}{count > 0 ? ` · ${count}` : ""}</h3>
          <button className="x-btn" onClick={onClose}><Ico.x style={{ width: 20, height: 20 }} /></button>
        </div>
        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="cart-empty">
              <div className="big"><Ico.cart style={{ width: 30, height: 30 }} /></div>
              <p>{t.cart_empty}</p>
            </div>
          ) : items.map((it) => {
            const b = D.breakdown(it.p);
            return (
              <div className="ci" key={it.p.id}>
                <div className="ci-media"><Media p={it.p} label="" /></div>
                <div className="ci-info">
                  <p className="ci-name">{it.p.name[lang]}</p>
                  <span className="ci-price">{D.fmt(b.total * it.q)} <small style={{ fontSize: 12, color: "var(--ink-3)" }}>{t.unit}</small></span>
                  <div>
                    <div className="ci-qty">
                      <button onClick={() => onQty(it.p.id, -1)}><Ico.minus style={{ width: 14, height: 14 }} /></button>
                      <span>{it.q}</span>
                      <button onClick={() => onQty(it.p.id, 1)}><Ico.plus style={{ width: 14, height: 14 }} /></button>
                    </div>
                  </div>
                </div>
                <button className="ci-rm" onClick={() => onRemove(it.p.id)}><Ico.x style={{ width: 16, height: 16 }} /></button>
              </div>
            );
          })}
        </div>
        {items.length > 0 && (
          <div className="drawer-foot">
            <div className="drawer-total">
              <span className="t-l">{t.cart_total}</span>
              <span className="t-v">{D.fmt(total)} <small style={{ fontSize: 16 }}>{t.unit}</small></span>
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

  const t = D.I18N[lang];
  useEffect(() => { localStorage.setItem("savat_lang", lang); }, [lang]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => {
    if (user) localStorage.setItem("savat_user", JSON.stringify(user));
    else localStorage.removeItem("savat_user");
  }, [user]);
  useEffect(() => {
    D.fetchProducts()
      .then((rows) => { if (rows && rows.length) setProducts(rows); })
      .catch((err) => { console.error("Mahsulotlarni yuklashda xato:", err); })
      .finally(() => setProductsLoading(false));
  }, []);

  const featured = (products || []).find((p) => p.id === 1) || (products || [])[0];
  const list = (products || []).filter((p) => {
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
    D.saveOrder({ ...o, user_email: user ? user.email : null }).catch((err) => console.error("Buyurtmani saqlashda xato:", err));
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
          <Cats cats={D.CATS} lang={lang} active={cat} onPick={setCat} />
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
          <Ico.home style={{ width: 22, height: 22 }} />
          <span>Bosh</span>
        </button>
        <button onClick={() => { goHome(); setTimeout(() => document.querySelector(".cats")?.scrollIntoView({behavior:"smooth"}), 100); }}>
          <Ico.grid style={{ width: 22, height: 22 }} />
          <span>Katalog</span>
        </button>
        {user ? (
          <button className={view === "myorders" ? "active" : ""} onClick={() => setView("myorders")}>
            <Ico.box style={{ width: 22, height: 22 }} />
            <span>Buyurtmalar</span>
          </button>
        ) : (
          <button className={view === "help" ? "active" : ""} onClick={() => setView("help")}>
            <Ico.help style={{ width: 22, height: 22 }} />
            <span>Yordam</span>
          </button>
        )}
        <button className="bn-cart" onClick={() => setCartOpen(true)}>
          <Ico.cart style={{ width: 22, height: 22 }} />
          {cartCount > 0 && <span className="bn-badge">{cartCount}</span>}
          <span>Savat</span>
        </button>
      </nav>

      <div className={"toast" + (toast ? " on" : "")}>
        <span className="ok"><Ico.check style={{ width: 13, height: 13, color: "#fff" }} /></span>
        {toast}
      </div>
    </>
  );
}
