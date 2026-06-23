/* ============ SAVAT.UZ — data, i18n, narx mantiqi ============ */
  // ---- Supabase ulanish ----
export const SB_URL = "https://gjsaelqqubmlwnmfyuso.supabase.co";
export const SB_KEY = "sb_publishable_ckKVB9tWH-dXgHh_dtgapQ_Htl3IACg";
export const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqc2FlbHFxdWJtbHdubWZ5dXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDY5MzAsImV4cCI6MjA5NzAyMjkzMH0.zLx1yBAUdMqtTW61zibbhQts3zVk-aRQTmTjn0L1U9Y";

  // Supabase'dan mahsulotlarni olib, sahifa kutgan formatga o'tkazadi
export async function fetchProducts() {
    // Products va variantlarni parallel yuklaymiz
    return Promise.all([
      fetch(SB_URL + "/rest/v1/products?select=*&order=id", {
        headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY }
      }).then(function(res){ return res.json(); }),
      fetch(SB_URL + "/rest/v1/product_variants?select=product_id", {
        headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY }
      }).then(function(res){ return res.json(); }).catch(function(){ return []; })
    ]).then(function(results) {
      var rows = results[0];
      var varRows = results[1] || [];
      var varIds = new Set(varRows.map(function(v){ return Number(v.product_id); }));
      var mapped = rows.map(function (r) {
        return {
          id: r.id,
          cat: r.cat,
          tile: r.tile,
          accent: r.accent,
          name: { uz: r.name_uz, ru: r.name_ru },
          sub: { uz: r.sub_uz, ru: r.sub_ru },
          china: r.china,
          market: r.market,
          weight: r.weight,
          rating: r.rating,
          sold: r.sold,
          days: r.days,
          hit: r.hit,
          image_url: r.image_url || null,
          image_urls: r.image_urls || (r.image_url ? [r.image_url] : []),
          _hasVariants: varIds.has(r.id)
        };
      });
      for (var i = mapped.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = mapped[i]; mapped[i] = mapped[j]; mapped[j] = tmp;
      }
      return mapped;
    });
  }

  // Yangi buyurtmani Supabase'ning "orders" jadvaliga yozadi
export async function saveOrder(o) {
    return fetch(SB_URL + "/rest/v1/orders", {
      method: "POST",
      headers: {
        "apikey": SB_KEY,
        "Authorization": "Bearer " + SB_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        order_num: o.num,
        items: o.items,
        region: o.region,
        city: o.city,
        address: o.address,
        phone: o.phone,
        comment: o.comment,
        pay_method: o.pay,
        total: o.total,
        count: o.count,
        user_email: o.user_email || null
      })
    });
  }

  // ---- Narx qoidalari ----
const CARGO_PER_KG = 120000;       // kargo: 1 kg uchun
const SERVICE_UNDER = 20000;       // 1 kg gacha — sobit xizmat haqi
const SERVICE_PER_KG = 15000;      // 1 kg dan ortiq — har kg uchun

  function serviceFee(weight) {
    if (weight < 1) return SERVICE_UNDER;
    return Math.ceil(weight) * SERVICE_PER_KG;
  }
  function cargoFee(weight) {
    return Math.round(weight * CARGO_PER_KG / 1000) * 1000;
  }
  // Mahsulot uchun to'liq narx tahlili
export function breakdown(p) {
    var cargo = cargoFee(p.weight);
    var service = serviceFee(p.weight);
    var total = p.china + cargo + service;
    var save = p.market - total;
    var pct = Math.round(save / p.market * 100);
    return { china: p.china, cargo: cargo, service: service, total: total, market: p.market, save: save, pct: pct };
  }

  // ---- Mahsulotlar ----
  // china = Xitoy zavod narxi, market = O'zbek bozori narxi, weight = kg
  var PRODUCTS = [
    { id: 1, cat: "shoes", tile: "#ede4ff", accent: "#6c2bd9",
      name: { uz: "Sport krossovka", ru: "Спортивные кроссовки" },
      sub:  { uz: "Erkaklar uchun, nafas oluvchi", ru: "Мужские, дышащие" },
      china: 95000, market: 650000, weight: 0.8, rating: 4.8, sold: 12400, days: 12, hit: true },

    { id: 2, cat: "tech", tile: "#e3f0ff", accent: "#2563eb",
      name: { uz: "Simsiz quloqchin", ru: "Беспроводные наушники" },
      sub:  { uz: "TWS, shovqin bostirish", ru: "TWS, шумоподавление" },
      china: 78000, market: 420000, weight: 0.25, rating: 4.7, sold: 23800, days: 10, hit: true },

    { id: 3, cat: "tech", tile: "#e8f7ee", accent: "#12a150",
      name: { uz: "Aqlli soat", ru: "Умные часы" },
      sub:  { uz: "AMOLED, qon bosimi sensori", ru: "AMOLED, датчик давления" },
      china: 130000, market: 690000, weight: 0.3, rating: 4.6, sold: 9100, days: 11 },

    { id: 4, cat: "fashion", tile: "#fdeef0", accent: "#e11d6a",
      name: { uz: "Demi-mavsum kurtka", ru: "Демисезонная куртка" },
      sub:  { uz: "Suv o'tkazmaydigan", ru: "Водоотталкивающая" },
      china: 165000, market: 880000, weight: 1.4, rating: 4.5, sold: 4300, days: 14 },

    { id: 5, cat: "fashion", tile: "#fff2e0", accent: "#e67700",
      name: { uz: "Charm sumka", ru: "Кожаная сумка" },
      sub:  { uz: "Eko-charm, ayollar uchun", ru: "Эко-кожа, женская" },
      china: 92000, market: 540000, weight: 0.7, rating: 4.7, sold: 7600, days: 12 },

    { id: 6, cat: "home", tile: "#eef0f4", accent: "#475569",
      name: { uz: "Portativ blender", ru: "Портативный блендер" },
      sub:  { uz: "USB-akkumulyator, 380ml", ru: "USB-аккумулятор, 380мл" },
      china: 58000, market: 290000, weight: 0.6, rating: 4.4, sold: 15200, days: 10 },

    { id: 7, cat: "tech", tile: "#fdeede", accent: "#f0432e",
      name: { uz: "Power Bank 30000mAh", ru: "Повербанк 30000mAh" },
      sub:  { uz: "Tez quvvatlash, PD 22.5W", ru: "Быстрая зарядка, PD 22.5W" },
      china: 84000, market: 380000, weight: 0.55, rating: 4.6, sold: 18900, days: 11, hit: true },

    { id: 8, cat: "home", tile: "#eafaf3", accent: "#0d9488",
      name: { uz: "LED stol chiroq", ru: "LED настольная лампа" },
      sub:  { uz: "Dimmer, ko'z himoyasi", ru: "Диммер, защита глаз" },
      china: 46000, market: 240000, weight: 0.5, rating: 4.5, sold: 6700, days: 9 },

    { id: 9, cat: "home", tile: "#f0ecff", accent: "#7c3aed",
      name: { uz: "Robot changyutgich", ru: "Робот-пылесос" },
      sub:  { uz: "Lazerli navigatsiya", ru: "Лазерная навигация" },
      china: 690000, market: 3200000, weight: 3.6, rating: 4.7, sold: 2100, days: 16 },

    { id: 10, cat: "fashion", tile: "#fef0e8", accent: "#db5a2a",
      name: { uz: "Sport krossovka Pro", ru: "Кроссовки Pro" },
      sub:  { uz: "Yengil, yugurish uchun", ru: "Лёгкие, для бега" },
      china: 110000, market: 720000, weight: 0.85, rating: 4.8, sold: 8800, days: 12 },

    { id: 11, cat: "tech", tile: "#e6f7fb", accent: "#0891b2",
      name: { uz: "Bluetooth kolonka", ru: "Bluetooth-колонка" },
      sub:  { uz: "Suvga chidamli, 24W", ru: "Влагозащита, 24W" },
      china: 72000, market: 360000, weight: 0.65, rating: 4.6, sold: 11300, days: 10 },

    { id: 12, cat: "home", tile: "#fdecf2", accent: "#be185d",
      name: { uz: "Pardoz oynasi LED", ru: "Зеркало с LED" },
      sub:  { uz: "Sensorli, 3 rejim", ru: "Сенсор, 3 режима" },
      china: 64000, market: 330000, weight: 0.9, rating: 4.5, sold: 5400, days: 11 }
  ];

export const REGIONS = [
    { id: "tsh-c", uz: "Toshkent shahri", ru: "город Ташкент" },
    { id: "tsh-v", uz: "Toshkent viloyati", ru: "Ташкентская обл." },
    { id: "sam", uz: "Samarqand", ru: "Самарканд" },
    { id: "bux", uz: "Buxoro", ru: "Бухара" },
    { id: "and", uz: "Andijon", ru: "Андижан" },
    { id: "far", uz: "Farg'ona", ru: "Фергана" },
    { id: "nam", uz: "Namangan", ru: "Наманган" },
    { id: "qash", uz: "Qashqadaryo", ru: "Кашкадарья" },
    { id: "surx", uz: "Surxondaryo", ru: "Сурхандарья" },
    { id: "xor", uz: "Xorazm", ru: "Хорезм" },
    { id: "nav", uz: "Navoiy", ru: "Навои" },
    { id: "jiz", uz: "Jizzax", ru: "Джизак" },
    { id: "sir", uz: "Sirdaryo", ru: "Сырдарья" },
    { id: "qor", uz: "Qoraqalpog'iston", ru: "Каракалпакстан" }
  ];

export const CATS = [
    { id: "all",     uz: "Hammasi",     ru: "Всё" },
    { id: "tech",    uz: "Texnika",     ru: "Техника" },
    { id: "fashion", uz: "Kiyim",       ru: "Одежда" },
    { id: "shoes",   uz: "Oyoq kiyim",  ru: "Обувь" },
    { id: "home",    uz: "Uy-ro'zg'or", ru: "Для дома" }
  ];

  // ---- Tarjimalar ----
export const I18N = {
    uz: {
      tag: "Xitoydan to'g'ridan-to'g'ri",
      nav_home: "Bosh sahifa", nav_catalog: "Katalog", nav_track: "Buyurtmalar", nav_help: "Yordam",
      search: "Mahsulot qidirish...",
      hero_kicker: "HAFTANING HITI",
      hero_title: "Xitoy narxida —\nuyingizgacha",
      hero_lead: "Vositachisiz. Har bir so'm ochiq: zavod narxi, kargo va xizmat haqi — hammasini ko'rasiz.",
      hero_save: "Tejaysiz",
      hero_cta: "Hoziroq buyurtma",
      hero_secondary: "Narxni ko'rish",
      cats_title: "Kategoriyalar",
      best_title: "Hit savdo",
      best_sub: "Eng ko'p sotilayotgan mahsulotlar",
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
      unit: "so'm", market_label: "Bozor narxi", qty: "soni",
      // hisob / auth
      login: "Kirish", account: "Hisob", menu: "Menyu",
      auth_login_tab: "Kirish", auth_reg_tab: "Ro'yxatdan o'tish",
      auth_name: "Ismingiz", auth_phone: "Telefon raqam",
      auth_continue: "Davom etish", auth_logout: "Chiqish",
      auth_hello: "Salom", auth_note: "Davom etish orqali foydalanish shartlariga rozilik bildirasiz.",
      auth_err_name: "Ismingizni kiriting", auth_err_phone: "To'g'ri raqam kiriting",
      // checkout
      checkout: "Rasmiylashtirish",
      co_login_req_t: "Avval hisobga kiring",
      co_login_req_d: "Buyurtmani rasmiylashtirish uchun ro'yxatdan o'ting yoki kiring.",
      co_delivery: "Yetkazib berish manzili", co_region: "Viloyat",
      co_region_ph: "Viloyatni tanlang", co_city: "Shahar / tuman",
      co_address: "Ko'cha, uy, kvartira", co_comment: "Izoh (ixtiyoriy)",
      co_payment: "To'lov usuli", co_summary: "Buyurtmangiz",
      co_items: "Mahsulotlar", co_delivery_fee: "Yetkazib berish", co_free: "Bepul",
      co_total: "Jami to'lov", co_place: "Buyurtmani tasdiqlash",
      co_err: "Barcha maydonlarni to'ldiring",
      pay_cash: "Naqd — yetkazganda", pay_cash_d: "Kuryerga qo'lda to'laysiz",
      pay_payme_d: "Onlayn karta orqali", pay_click_d: "Onlayn karta orqali",
      soon: "Tez orada",
      ok_t: "Buyurtma qabul qilindi!", ok_d: "Operatorlarimiz 15 daqiqada siz bilan bog'lanadi.",
      ok_num: "Buyurtma raqami", ok_home: "Bosh sahifaga qaytish", ok_items: "mahsulot"
    },
    ru: {
      tag: "Напрямую из Китая",
      nav_home: "Главная", nav_catalog: "Каталог", nav_track: "Заказы", nav_help: "Помощь",
      search: "Поиск товаров...",
      hero_kicker: "ХИТ НЕДЕЛИ",
      hero_title: "Цена Китая —\nдо вашей двери",
      hero_lead: "Без посредников. Каждый сум прозрачен: цена завода, карго и сервис — вы видите всё.",
      hero_save: "Экономия",
      hero_cta: "Заказать сейчас",
      hero_secondary: "Смотреть цену",
      cats_title: "Категории",
      best_title: "Хиты продаж",
      best_sub: "Самые покупаемые товары",
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
      unit: "сум", market_label: "Рыночная цена", qty: "кол-во",
      // auth
      login: "Вход", account: "Аккаунт", menu: "Меню",
      auth_login_tab: "Вход", auth_reg_tab: "Регистрация",
      auth_name: "Ваше имя", auth_phone: "Номер телефона",
      auth_continue: "Продолжить", auth_logout: "Выйти",
      auth_hello: "Привет", auth_note: "Продолжая, вы соглашаетесь с условиями использования.",
      auth_err_name: "Введите имя", auth_err_phone: "Введите верный номер",
      // checkout
      checkout: "Оформить заказ",
      co_login_req_t: "Сначала войдите",
      co_login_req_d: "Для оформления заказа зарегистрируйтесь или войдите.",
      co_delivery: "Адрес доставки", co_region: "Регион",
      co_region_ph: "Выберите регион", co_city: "Город / район",
      co_address: "Улица, дом, квартира", co_comment: "Комментарий (необяз.)",
      co_payment: "Способ оплаты", co_summary: "Ваш заказ",
      co_items: "Товары", co_delivery_fee: "Доставка", co_free: "Бесплатно",
      co_total: "Итого к оплате", co_place: "Подтвердить заказ",
      co_err: "Заполните все поля",
      pay_cash: "Наличными при получении", pay_cash_d: "Оплата курьеру наличными",
      pay_payme_d: "Онлайн картой", pay_click_d: "Онлайн картой",
      soon: "Скоро",
      ok_t: "Заказ принят!", ok_d: "Наш оператор свяжется с вами в течение 15 минут.",
      ok_num: "Номер заказа", ok_home: "Вернуться на главную", ok_items: "товаров"
    }
  };

export function fmt(n) {
    return Math.round(n).toLocaleString("ru-RU").replace(/\u00A0/g, " ");
  }