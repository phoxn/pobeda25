/* Победа 25 — интерактив. Без сторонних библиотек и без обращений к внешним серверам. */
(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.remove('no-js');

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  // Анимации включены на всех устройствах, независимо от системной настройки «уменьшить движение»
  root.classList.add('force-motion');
  const reduce = false;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Московское время ---------- */
  const OPEN = 10, CLOSE = 19;
  const msk = () => {
    const parts = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short'
    }).formatToParts(new Date());
    const o = {}; parts.forEach(p => { o[p.type] = p.value; });
    return { d: o.day, m: o.month, y: o.year, h: +o.hour, min: +o.minute };
  };

  const now = msk();
  $$('[data-today]').forEach(el => { el.textContent = `${now.d}.${now.m}.${now.y}`; });
  $$('[data-year]').forEach(el => { el.textContent = now.y; });

  const paintStatus = () => {
    const t = msk(); const hm = t.h + t.min / 60;
    const open = hm >= OPEN && hm < CLOSE;
    const text = open ? `Открыто до ${CLOSE}:00` : (hm < OPEN ? `Закрыто, откроемся в ${OPEN}:00` : `Закрыто, откроемся завтра в ${OPEN}:00`);
    $$('[data-status]').forEach(el => {
      el.classList.toggle('is-open', open);
      const span = el.querySelector('span'); if (span) span.textContent = text;
    });
  };
  paintStatus(); setInterval(paintStatus, 60000);

  /* ---------- Разбивка заголовков на слова ---------- */
  let wi = 0;
  const splitNode = (node) => {
    [...node.childNodes].forEach(ch => {
      if (ch.nodeType === 3) {
        const frag = document.createDocumentFragment();
        ch.textContent.split(/( +|\n+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const w = document.createElement('span'); w.className = 'w';
          const i = document.createElement('i'); i.style.setProperty('--i', wi++); i.textContent = part;
          w.append(i); frag.append(w);
        });
        ch.replaceWith(frag);
      } else if (ch.nodeType === 1) splitNode(ch);
    });
  };
  $$('[data-split]').forEach(el => { wi = 0; splitNode(el); el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim()); });

  /* ---------- Появление при прокрутке ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });

  $$('[data-reveal]').forEach(el => {
    const sibs = [...el.parentElement.children].filter(c => c.hasAttribute('data-reveal'));
    el.style.setProperty('--delay', `${sibs.indexOf(el) * 90}ms`);
    io.observe(el);
  });
  $$('[data-split]').forEach(el => io.observe(el));

  /* ---------- Счётчики ---------- */
  const fmt = (v, el) => {
    const dec = +(el.dataset.decimals || 0);
    return dec ? v.toFixed(dec).replace('.', ',') : Math.round(v).toLocaleString('ru-RU');
  };
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target; countIO.unobserve(el);
      const to = parseFloat(el.dataset.count);
      const t0 = performance.now(), dur = 1600;
      const tick = (t) => {
        const k = clamp((t - t0) / dur); const ease = 1 - Math.pow(1 - k, 4);
        el.textContent = fmt(to * ease, el);
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: .6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- Заказ-наряд: печать, подписи, штамп ---------- */
  const docket = $('[data-docket]');
  const runDocket = () => {
    if (!docket) return;
    const lines = $$('.docket__lines li', docket);
    lines.forEach((l, i) => setTimeout(() => l.classList.add('is-on'), 500 + i * 420));
    const end = 500 + lines.length * 420 + 300;
    setTimeout(() => docket.classList.add('is-printed'), end);
    setTimeout(() => docket.classList.add('is-stamped'), end + 1500);
  };

  const ready = () => { root.classList.add('is-ready'); runDocket(); };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(ready));

  if (docket && finePointer && !reduce) {
    const hero = $('.hero');
    hero.addEventListener('pointermove', (e) => {
      const r = docket.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / innerWidth;
      const y = (e.clientY - (r.top + r.height / 2)) / innerHeight;
      docket.style.setProperty('--ry', `${clamp(x * 14, -7, 7)}deg`);
      docket.style.setProperty('--rx', `${clamp(-y * 12, -6, 6)}deg`);
    });
    hero.addEventListener('pointerleave', () => { docket.style.setProperty('--ry', '0deg'); docket.style.setProperty('--rx', '0deg'); });
  }

  /* ---------- Фильтр прайса ---------- */
  const rows = $$('[data-ledger] li');
  rows.forEach((r, i) => { r.style.viewTransitionName = `row-${i}`; });
  $$('[data-filter]').forEach(btn => btn.addEventListener('click', () => {
    const f = btn.dataset.filter;
    const apply = () => {
      rows.forEach(r => { r.hidden = f !== 'all' && r.dataset.cat !== f; });
      $$('[data-filter]').forEach(b => { const on = b === btn; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
    };
    if (document.startViewTransition) document.startViewTransition(apply); else apply();
  }));

  /* ---------- Поршень: пути для отрисовки ---------- */
  const piston = $('[data-piston]');
  if (piston) $$('.draw > *:not(.dim)', piston).forEach(el => el.setAttribute('pathLength', '1'));

  /* ---------- Всё, что зависит от прокрутки ---------- */
  const bar = $('.progress span');
  const top = $('.top');
  const how = $('.how'), track = $('[data-track]'), ruler = $('[data-ruler]');
  const casePhoto = $('.case__photo');
  const wideHow = matchMedia('(min-width: 901px)');
  let lastY = scrollY, ticking = false, howDist = 0;

  const sizeHow = () => {
    if (!how || !track) return;
    if (!wideHow.matches || reduce) { how.style.height = ''; track.style.removeProperty('--tx'); howDist = 0; return; }
    howDist = Math.max(0, track.scrollWidth - root.clientWidth);
    how.style.height = `${howDist + innerHeight * 1.15}px`;
  };

  const update = () => {
    ticking = false;
    const y = scrollY, vh = innerHeight;
    const max = root.scrollHeight - vh;
    if (bar) bar.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);

    if (top) {
      if (y > 420 && y > lastY + 4) top.classList.add('is-hidden');
      else if (y < lastY - 4 || y < 420) top.classList.remove('is-hidden');
    }
    lastY = y;

    if (howDist && how) {
      const r = how.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - vh));
      track.style.setProperty('--tx', `${(-p * howDist).toFixed(1)}px`);
      if (ruler) ruler.style.setProperty('--p', p.toFixed(4));
    }

    if (piston) {
      const r = piston.getBoundingClientRect();
      const d = clamp((vh * .92 - r.top) / (r.height * .85));
      piston.style.setProperty('--d', d.toFixed(4));
    }

    if (casePhoto && !reduce) {
      const r = casePhoto.getBoundingClientRect();
      casePhoto.style.setProperty('--v', clamp((vh - r.top) / (vh + r.height)).toFixed(4));
    }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { sizeHow(); onScroll(); });
  addEventListener('load', () => { sizeHow(); update(); });
  sizeHow(); update();

  /* ---------- Перетаскиваемые снимки ---------- */
  const board = $('[data-board]');
  if (board) {
    let z = 10;
    const canDrag = () => matchMedia('(min-width: 761px)').matches;
    $$('.print', board).forEach(p => {
      let sx = 0, sy = 0, ox = 0, oy = 0, drag = false;
      p.addEventListener('pointerdown', (e) => {
        if (!canDrag() || e.button !== 0) return;
        drag = true; p.setPointerCapture(e.pointerId); p.classList.add('is-dragging'); p.style.zIndex = ++z;
        sx = e.clientX; sy = e.clientY; ox = +(p.dataset.dx || 0); oy = +(p.dataset.dy || 0);
      });
      p.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const dx = ox + e.clientX - sx, dy = oy + e.clientY - sy;
        p.dataset.dx = dx; p.dataset.dy = dy;
        p.style.setProperty('--dx', `${dx}px`); p.style.setProperty('--dy', `${dy}px`);
      });
      const end = () => { drag = false; p.classList.remove('is-dragging'); };
      p.addEventListener('pointerup', end); p.addEventListener('pointercancel', end);
    });
  }

  /* ---------- Магнитные кнопки ---------- */
  if (finePointer && !reduce) {
    $$('.magnetic').forEach(b => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px, ${(e.clientY - r.top - r.height / 2) * .3}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------- Форма записи (демо: никуда не отправляет и ничего не хранит) ---------- */
  const form = $('[data-form]');
  if (form) {
    const done = $('[data-done]');
    const days = $('[data-days]');
    const WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const mskDate = (ms) => new Date(new Date(ms).toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    for (let i = 0; i < 7; i++) {
      const d = mskDate(Date.now() + i * 864e5);
      const label = i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : `${WD[d.getDay()]}, ${d.getDate()}`;
      const l = document.createElement('label'); l.className = 'chip';
      l.innerHTML = `<input type="radio" name="day" value="${label}"><span>${label}</span>`;
      days.append(l);
    }

    const phone = $('[data-phone]', form);
    const digits = (v) => {
      let d = v.replace(/\D/g, '');
      if (d.startsWith('8')) d = '7' + d.slice(1);
      if (d && !d.startsWith('7')) d = '7' + d;
      return d.slice(0, 11);
    };
    const mask = (d) => {
      const s = d.slice(1); let out = '+7';
      if (s.length) out += ' (' + s.slice(0, 3);
      if (s.length >= 3) out += ')';
      if (s.length > 3) out += ' ' + s.slice(3, 6);
      if (s.length > 6) out += '-' + s.slice(6, 8);
      if (s.length > 8) out += '-' + s.slice(8, 10);
      return out;
    };
    phone.addEventListener('input', () => { const d = digits(phone.value); phone.value = d ? mask(d) : ''; });
    phone.addEventListener('focus', () => { if (!phone.value) phone.value = '+7 ('; });
    phone.addEventListener('blur', () => { if (digits(phone.value).length <= 1) phone.value = ''; });

    const setErr = (input, id, msg) => {
      const p = $('#' + id); p.textContent = msg;
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      input.closest('.field, .consent').classList.toggle('has-error', !!msg);
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const consent = form.elements.consent;
      let first = null;
      if (digits(phone.value).length !== 11) {
        setErr(phone, 'e-phone', 'Проверьте номер: нужно 10 цифр после +7. По нему мастер перезвонит и назначит время.');
        first = first || phone;
      } else setErr(phone, 'e-phone', '');
      if (!consent.checked) {
        setErr(consent, 'e-consent', 'Без согласия на обработку данных мы не можем принять заявку. Можно просто позвонить.');
        first = first || consent;
      } else setErr(consent, 'e-consent', '');
      if (first) { first.focus(); return; }

      // Демо-режим: данные никуда не отправляются. Реальную отправку подключаем после согласования
      // с владельцем на сервере в РФ (ч. 5 ст. 18 152-ФЗ).
      $('[data-ticket]', done).textContent = `№ 0025-${String(Date.now() % 1000).padStart(3, '0')}`;
      form.hidden = true; done.hidden = false;
      requestAnimationFrame(() => done.classList.add('is-stamped'));
      done.focus();
    });

    $('[data-again]', done).addEventListener('click', () => {
      form.reset(); done.classList.remove('is-stamped'); done.hidden = true; form.hidden = false;
      form.elements.name.focus();
    });
  }
})();
