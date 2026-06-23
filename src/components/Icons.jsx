import React from 'react';

/* ============ SAVAT.UZ — icons (stroke, currentColor) ============ */
const S = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" {...p} />;

const Icons = {
  basket: (p) => <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M5 9h14l-1.2 9.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 9Z" fill="#fff" opacity=".95"/>
    <path d="M8.5 9 12 3.8 15.5 9" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9.5" cy="13.5" r="1" fill="#7c3aed"/>
    <circle cx="14.5" cy="13.5" r="1" fill="#7c3aed"/>
  </svg>,
  search: (p) => <S {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></S>,
  cart: (p) => <S {...p}><path d="M3 4h2l2.3 11.5a1.5 1.5 0 0 0 1.5 1.2h8.2a1.5 1.5 0 0 0 1.5-1.2L21 8H6"/><circle cx="9.5" cy="20" r="1.3"/><circle cx="17.5" cy="20" r="1.3"/></S>,
  plus: (p) => <S {...p}><path d="M12 5v14M5 12h14"/></S>,
  minus: (p) => <S {...p}><path d="M5 12h14"/></S>,
  arrow: (p) => <S {...p}><path d="M5 12h14M13 6l6 6-6 6"/></S>,
  back: (p) => <S {...p}><path d="M19 12H5M11 6l-6 6 6 6"/></S>,
  chevron: (p) => <S {...p}><path d="m6 9 6 6 6-6"/></S>,
  x: (p) => <S {...p}><path d="M6 6l12 12M18 6 6 18"/></S>,
  check: (p) => <S strokeWidth="2.4" {...p}><path d="M4 12.5 9 17.5 20 6.5"/></S>,
  factory: (p) => <S {...p}><path d="M3 21h18M4 21V10l5 3V10l5 3V6l5 2.5V21"/><path d="M8 21v-3M13 21v-3"/></S>,
  plane: (p) => <S {...p}><path d="M21 5.5 3 12l6 2 2 6 3-5 5 4 2-13.5Z"/></S>,
  tag: (p) => <S {...p}><path d="M12 3H5a2 2 0 0 0-2 2v7l9 9 9-9-9-9Z"/><circle cx="8" cy="8" r="1.4"/></S>,
  truck: (p) => <S {...p}><path d="M2 7h11v9H2zM13 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></S>,
  weight: (p) => <S {...p}><path d="M12 3a2.2 2.2 0 1 1-2.2 2.2A2.2 2.2 0 0 1 12 3Z"/><path d="M8.5 7.5h7l2.5 11.5a1 1 0 0 1-1 1.2H7a1 1 0 0 1-1-1.2L8.5 7.5Z"/></S>,
  shield: (p) => <S {...p}><path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z"/><path d="m9.2 12 2 2 3.6-3.8"/></S>,
  eye: (p) => <S {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/></S>,
  star: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8-4.3-4.1 5.9-.9L12 3Z"/></svg>,
  globe: (p) => <S {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/></S>,
  flame: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2c1 3-2 4-2 7a3 3 0 0 0 6 0c0-1-.4-1.8-.4-1.8C18 9 19 12 19 14a7 7 0 0 1-14 0c0-4 4-6 4-9 0-1.5 1-2.5 3-3Z"/></svg>,
  user: (p) => <S {...p}><circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5"/></S>,
  menu: (p) => <S {...p}><path d="M4 7h16M4 12h16M4 17h16"/></S>,
  lock: (p) => <S {...p}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></S>,
  pin: (p) => <S {...p}><path d="M12 21s7-5.5 7-11a7 7 0 0 0-14 0c0 5.5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.4"/></S>,
  phone: (p) => <S {...p}><path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 5 5L19 16l1.5 3.5V20a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z"/></S>,
  card: (p) => <S {...p}><rect x="3" y="6" width="18" height="12" rx="2.4"/><path d="M3 10h18"/></S>,
  spark: (p) => <S {...p}><path d="M12 4v16M4 12h16M6.5 6.5l11 11M17.5 6.5l-11 11"/></S>,
  home: (p) => <S {...p}><path d="M3 12L12 4l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z"/></S>,
  grid: (p) => <S {...p}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></S>,
  box: (p) => <S {...p}><path d="M12 3L3 8v8l9 5 9-5V8L12 3Z"/><path d="M3 8l9 5 9-5M12 13v8"/></S>,
  help: (p) => <S {...p}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></S>,
};

export default Icons;