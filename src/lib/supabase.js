// ============ SAVAT.UZ — Supabase + biznes mantiq ============

export const SB_URL  = "https://gjsaelqqubmlwnmfyuso.supabase.co";
export const SB_KEY  = "sb_publishable_ckKVB9tWH-dXgHh_dtgapQ_Htl3IACg";
export const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqc2FlbHFxdWJtbHdubWZ5dXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDY5MzAsImV4cCI6MjA5NzAyMjkzMH0.zLx1yBAUdMqtTW61zibbhQts3zVk-aRQTmTjn0L1U9Y";

// Headers
export const headers = (token) => ({
  "apikey": SB_KEY,
  "Authorization": `Bearer ${token || SB_KEY}`,
  "Content-Type": "application/json",
});

// Narx hisoblash
export function breakdown(p) {
  const china   = p.china;
  const cargo   = p.weight < 1 ? 20000 : Math.round(p.weight * 15000);
  const service = p.weight < 1 ? 20000 : Math.round(p.weight * 15000);
  const total   = china + cargo + service;
  const pct     = Math.round((1 - total / p.market) * 100);
  return { china, cargo, service, total, pct };
}

export function fmt(n) {
  return Math.round(n).toLocaleString("uz-UZ");
}

// Products fetch
export async function fetchProducts() {
  const [productsRes, variantsRes] = await Promise.all([
    fetch(`${SB_URL}/rest/v1/products?select=*&order=id`, { headers: headers() }),
    fetch(`${SB_URL}/rest/v1/product_variants?select=product_id`, { headers: headers() }),
  ]);

  const rows    = await productsRes.json();
  const varRows = variantsRes.ok ? await variantsRes.json() : [];
  const varIds  = new Set((varRows || []).map(v => Number(v.product_id)));

  const mapped = (rows || []).map(r => ({
    id: r.id,
    cat: r.cat,
    tile: r.tile || "#f0e8ff",
    accent: r.accent || "#6c2bd9",
    name: { uz: r.name_uz, ru: r.name_ru },
    sub:  { uz: r.sub_uz || "", ru: r.sub_ru || "" },
    china:  r.china,
    market: r.market,
    weight: r.weight,
    rating: r.rating || 4.5,
    sold:   r.sold   || 0,
    days:   r.days   || 12,
    hit:    r.hit    || false,
    image_url:  r.image_url  || null,
    image_urls: r.image_urls || (r.image_url ? [r.image_url] : []),
    sku: r.sku || null,
    _hasVariants: varIds.has(r.id),
  }));

  // Random tartib
  for (let i = mapped.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
  }
  return mapped;
}

// Variantlarni olish
export async function fetchVariants(productId) {
  const res = await fetch(
    `${SB_URL}/rest/v1/product_variants?product_id=eq.${productId}&order=id`,
    { headers: headers() }
  );
  return res.ok ? res.json() : [];
}

// Buyurtma saqlash
export async function saveOrder(o) {
  const res = await fetch(`${SB_URL}/rest/v1/orders`, {
    method: "POST",
    headers: { ...headers(), "Prefer": "return=representation" },
    body: JSON.stringify(o),
  });
  if (!res.ok) throw new Error("Buyurtma saqlanmadi");
  const data = await res.json();
  return data[0];
}

// Kategoriyalar
export const CATS = [
  { id: "all",     uz: "Hammasi",     ru: "Всё" },
  { id: "tech",    uz: "Texnika",     ru: "Техника" },
  { id: "fashion", uz: "Kiyim",       ru: "Одежда" },
  { id: "shoes",   uz: "Oyoq kiyim",  ru: "Обувь" },
  { id: "home",    uz: "Uy-ro'zg'or", ru: "Для дома" },
];

// Viloyatlar
export const REGIONS = [
  { id: "tsh-c", uz: "Toshkent shahri",    ru: "город Ташкент" },
  { id: "tsh-v", uz: "Toshkent viloyati",  ru: "Ташкентская обл." },
  { id: "sam",   uz: "Samarqand",          ru: "Самарканд" },
  { id: "bux",   uz: "Buxoro",             ru: "Бухара" },
  { id: "and",   uz: "Andijon",            ru: "Андижан" },
  { id: "far",   uz: "Farg'ona",           ru: "Фергана" },
  { id: "nam",   uz: "Namangan",           ru: "Наманган" },
  { id: "qash",  uz: "Qashqadaryo",        ru: "Кашкадарья" },
  { id: "surx",  uz: "Surxondaryo",        ru: "Сурхандарья" },
  { id: "xor",   uz: "Xorazm",             ru: "Хорезм" },
  { id: "nav",   uz: "Navoiy",             ru: "Навои" },
  { id: "jiz",   uz: "Jizzax",             ru: "Джизак" },
  { id: "sir",   uz: "Sirdaryo",           ru: "Сырдарья" },
  { id: "qor",   uz: "Qoraqalpog'iston",   ru: "Каракалпакстан" },
];

// Tarjimalar
export const I18N = {
  uz: {
    tag: "Xitoydan to'g'ridan-to'g'ri",
    nav_home: "Bosh sahifa", nav_catalog: "Katalog", nav_help: "Yordam",
    search: "Mahsulot qidirish...",
    hero_kicker: "HAFTANING HITI",
    hero_title: "Xitoy narxida —\nuyingizgacha",
    hero_lead: "Vositachisiz. Har bir so'm ochiq: zavod narxi, kargo va xizmat haqi.",
    hero_save: "Tejaysiz", hero_cta: "Hoziroq buyurtma", hero_secondary: "Narxni ko'rish",
    cats_title: "Kategoriyalar",
    best_title: "Hit savdo", best_sub: "Eng ko'p sotilayotgan mahsulotlar",
    sold: "sotilgan", view: "Batafsil", add: "Savatga",
    pc_title: "Narx qanday shakllanadi",
    pc_china: "Xitoy narxi (zavod)", pc_cargo: "Kargo (yetkazish)",
    pc_service: "Savat xizmati", pc_total: "Bizda jami",
    pc_market: "O'zbek bozorida", pc_save: "Tejaysiz",
    detail_order: "Buyurtma berish", detail_add: "Savatga qo'shish",
    back: "Orqaga", weight: "Og'irligi", delivery_days: "kunda yetkazamiz",
    service_q: "Xizmat haqi qanday hisoblanadi?",
    service_r1: "1 kg gacha", service_r1v: "20 000 so'm",
    service_r2: "1 kg dan ortiq", service_r2v: "15 000 so'm / kg",
    service_note: "Mahsulot og'irligiga qarab avtomatik hisoblanadi.",
    why_title: "Nega SAVAT.UZ?",
    why1_t: "Vositachisiz narx", why1_d: "To'g'ridan-to'g'ri Xitoy zavodlaridan.",
    why2_t: "Ochiq hisob-kitob", why2_d: "Kargo va xizmat haqi yashirilmaydi.",
    why3_t: "Ishonchli yetkazish", why3_d: "9–16 kunda eshigingizgacha.",
    cart_title: "Savat", cart_empty: "Savat hozircha bo'sh",
    cart_total: "Jami", cart_checkout: "Rasmiylashtirish", added: "Qo'shildi",
    unit: "so'm", market_label: "Bozor narxi",
    login: "Kirish", account: "Hisob",
    auth_login_tab: "Kirish", auth_reg_tab: "Ro'yxatdan o'tish",
    auth_name: "Ismingiz", auth_phone: "Telefon raqam",
    auth_continue: "Davom etish", auth_logout: "Chiqish",
    auth_hello: "Salom",
    checkout: "Rasmiylashtirish",
    co_delivery: "Yetkazib berish manzili", co_region: "Viloyat",
    co_region_ph: "Viloyatni tanlang", co_city: "Shahar / tuman",
    co_address: "Ko'cha, uy, kvartira", co_comment: "Izoh (ixtiyoriy)",
    co_payment: "To'lov usuli", co_summary: "Buyurtmangiz",
    co_items: "Mahsulotlar", co_free: "Bepul",
    co_total: "Jami to'lov", co_place: "Buyurtmani tasdiqlash",
    co_err: "Barcha maydonlarni to'ldiring",
    pay_cash: "Naqd — yetkazganda", pay_cash_d: "Kuryerga qo'lda to'laysiz",
    pay_payme_d: "Onlayn karta orqali", pay_click_d: "Onlayn karta orqali",
    ok_t: "Buyurtma qabul qilindi!", ok_d: "Operatorlarimiz 15 daqiqada siz bilan bog'lanadi.",
    ok_num: "Buyurtma raqami", ok_home: "Bosh sahifaga qaytish",
  },
  ru: {
    tag: "Напрямую из Китая",
    nav_home: "Главная", nav_catalog: "Каталог", nav_help: "Помощь",
    search: "Поиск товаров...",
    hero_kicker: "ХИТ НЕДЕЛИ",
    hero_title: "Цена Китая —\nдо вашей двери",
    hero_lead: "Без посредников. Каждый сум прозрачен: цена завода, карго и сервис.",
    hero_save: "Экономия", hero_cta: "Заказать сейчас", hero_secondary: "Смотреть цену",
    cats_title: "Категории",
    best_title: "Хиты продаж", best_sub: "Самые покупаемые товары",
    sold: "продано", view: "Подробнее", add: "В корзину",
    pc_title: "Из чего складывается цена",
    pc_china: "Цена в Китае (завод)", pc_cargo: "Карго (доставка)",
    pc_service: "Сервис Savat", pc_total: "У нас итого",
    pc_market: "На рынке Узбекистана", pc_save: "Вы экономите",
    detail_order: "Оформить заказ", detail_add: "Добавить в корзину",
    back: "Назад", weight: "Вес", delivery_days: "дней доставка",
    service_q: "Как считается сервисный сбор?",
    service_r1: "До 1 кг", service_r1v: "20 000 сум",
    service_r2: "Свыше 1 кг", service_r2v: "15 000 сум / кг",
    service_note: "Считается автоматически по весу товара.",
    why_title: "Почему SAVAT.UZ?",
    why1_t: "Цена без посредников", why1_d: "Напрямую с фабрик Китая.",
    why2_t: "Прозрачный расчёт", why2_d: "Карго и сервис не скрыты.",
    why3_t: "Надёжная доставка", why3_d: "9–16 дней до вашей двери.",
    cart_title: "Корзина", cart_empty: "Корзина пока пуста",
    cart_total: "Итого", cart_checkout: "Оформить", added: "Добавлено",
    unit: "сум", market_label: "Рыночная цена",
    login: "Вход", account: "Аккаунт",
    auth_login_tab: "Вход", auth_reg_tab: "Регистрация",
    auth_name: "Ваше имя", auth_phone: "Номер телефона",
    auth_continue: "Продолжить", auth_logout: "Выйти",
    auth_hello: "Привет",
    checkout: "Оформить заказ",
    co_delivery: "Адрес доставки", co_region: "Регион",
    co_region_ph: "Выберите регион", co_city: "Город / район",
    co_address: "Улица, дом, квартира", co_comment: "Комментарий (необяз.)",
    co_payment: "Способ оплаты", co_summary: "Ваш заказ",
    co_items: "Товары", co_free: "Бесплатно",
    co_total: "Итого к оплате", co_place: "Подтвердить заказ",
    co_err: "Заполните все поля",
    pay_cash: "Наличными при получении", pay_cash_d: "Оплата курьеру наличными",
    pay_payme_d: "Онлайн картой", pay_click_d: "Онлайн картой",
    ok_t: "Заказ принят!", ok_d: "Наши операторы свяжутся с вами в течение 15 минут.",
    ok_num: "Номер заказа", ok_home: "На главную",
  }
};