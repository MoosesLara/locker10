(function () {
  "use strict";
  var GYM = window.GYM || {};
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;

  // Avisa al <head> que el motor de movimiento cargó (si no, quita .mo y todo queda visible)
  window.LOCKER_MOTION = true;
  root.classList.add("mo");

  /* =================================================================
     IDIOMAS (los textos viven en js/translations.js)
     - data-i18n="clave"            → texto del elemento
     - data-i18n-attr="alt:clave"   → atributos (varios separados por ;)
     - data-i18n-plan="clave"       → rellena {plan} en el texto
     ================================================================= */
  var TR = window.TRANSLATIONS || {};
  var LANG_KEY = "locker10-lang";
  var languages = Object.keys(TR).filter(function (k) { return TR[k] && TR[k].t; });
  var lang = TR.defaultLang || languages[0];
  var langHooks = [];

  function t(key, vars) {
    var dict = (TR[lang] && TR[lang].t) || {};
    var fallback = (TR[TR.defaultLang] && TR[TR.defaultLang].t) || {};
    var value = key in dict ? dict[key] : key in fallback ? fallback[key] : key;
    if (vars) {
      Object.keys(vars).forEach(function (k) { value = value.split("{" + k + "}").join(vars[k]); });
    }
    return value;
  }

  // Titulares: cada línea (separada por <br>) va en su propia ranura animada
  function splitHeading(el, html) {
    el.innerHTML = String(html).split(/<br\s*\/?>/i).map(function (line) {
      return '<span class="line"><span class="line__inner">' + line.trim() + "</span></span>";
    }).join("");
    // El retraso de cada línea se pone desde JS (no con style="" en línea, que bloquea la CSP)
    el.querySelectorAll(".line").forEach(function (line, i) { line.style.setProperty("--l", i); });
  }

  function pickInitialLang() {
    var fromUrl = new URLSearchParams(window.location.search).get("lang");
    if (fromUrl && languages.indexOf(fromUrl) > -1) return fromUrl;
    try {
      var saved = localStorage.getItem(LANG_KEY);
      if (saved && languages.indexOf(saved) > -1) return saved;
    } catch (e) { /* almacenamiento bloqueado: se ignora */ }
    var nav = (navigator.languages || [navigator.language || ""]).map(function (l) { return l.slice(0, 2).toLowerCase(); });
    for (var i = 0; i < nav.length; i++) if (languages.indexOf(nav[i]) > -1) return nav[i];
    return TR.defaultLang || languages[0];
  }

  function applyLang(next) {
    if (languages.indexOf(next) < 0) return;
    lang = next;
    root.lang = next;
    // Cada página puede tener su propio título (data-title-key en <body>)
    document.title = t(document.body.dataset.titleKey || "meta.title");
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", t("meta.description"));

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var vars = el.dataset.i18nPlan ? { plan: t(el.dataset.i18nPlan) } : null;
      var value = t(el.dataset.i18n, vars);
      if (el.hasAttribute("data-split")) splitHeading(el, value);
      else if (value.indexOf("<") > -1) el.innerHTML = value; // saltos de línea o enlaces
      else el.textContent = value;
    });
    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.dataset.i18nAttr.split(";").forEach(function (pair) {
        var parts = pair.split(":");
        if (parts.length === 2) el.setAttribute(parts[0].trim(), t(parts[1].trim()));
      });
    });

    // Enlaces de WhatsApp con el mensaje en el idioma activo
    document.querySelectorAll("[data-wa]").forEach(function (a) { a.href = waLink(t(a.dataset.wa)); });
    document.querySelectorAll("[data-wa-plan]").forEach(function (a) {
      a.href = waLink(t("wa.plan", { plan: t(a.dataset.waPlan) }));
    });

    document.querySelectorAll("[data-lang]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
    });

    // Páginas legales: muestra solo la versión del documento en el idioma activo
    var docs = document.querySelectorAll("[data-lang-content]");
    if (docs.length) {
      var hasMatch = Array.prototype.some.call(docs, function (d) { return d.dataset.langContent === lang; });
      docs.forEach(function (d) {
        d.hidden = hasMatch ? d.dataset.langContent !== lang : d.dataset.langContent !== TR.defaultLang;
      });
    }

    // El título del mapa diferido también se traduce
    document.querySelectorAll("[data-map]").forEach(function (box) {
      box.dataset.mapTitle = t("footer.map");
      var frame = box.querySelector("iframe");
      if (frame) frame.title = box.dataset.mapTitle;
    });
    langHooks.forEach(function (fn) { fn(); });
  }

  function setLang(next) {
    applyLang(next);
    try { localStorage.setItem(LANG_KEY, next); } catch (e) { /* sin almacenamiento */ }
    var url = new URL(window.location.href);
    if (next === TR.defaultLang) url.searchParams.delete("lang"); else url.searchParams.set("lang", next);
    window.history.replaceState(null, "", url);
  }

  /* ---------- Enlaces de WhatsApp ---------- */
  function waLink(text) {
    return "https://wa.me/" + GYM.whatsapp + "?text=" + encodeURIComponent(text);
  }
  document.querySelectorAll("[data-phone]").forEach(function (el) {
    if (GYM.telefonoVisible) el.textContent = GYM.telefonoVisible;
  });

  /* ---------- Datos legales del titular (js/config.js → legal) ---------- */
  var legal = GYM.legal || {};
  document.querySelectorAll("[data-legal]").forEach(function (el) {
    var value = legal[el.dataset.legal];
    if (!value) return;
    if (el.tagName === "A" && value.indexOf("@") > -1) el.href = "mailto:" + value;
    el.textContent = value;
  });

  /* ---------- Mapa: Google Maps solo se carga con permiso ----------
     Se carga solo si el visitante aceptó la categoría "Mapas" o si pulsa
     "Ver mapa" (eso cuenta como permiso solo para esa vez). */
  function loadMap(box) {
    if (box.classList.contains("is-loaded")) return;
    var frame = document.createElement("iframe");
    frame.src = box.dataset.map;
    frame.title = box.dataset.mapTitle || "";
    frame.loading = "lazy";
    frame.referrerPolicy = "no-referrer-when-downgrade";
    frame.setAttribute("allowfullscreen", "");
    box.innerHTML = "";
    box.appendChild(frame);
    box.classList.add("is-loaded");
  }
  document.querySelectorAll("[data-map]").forEach(function (box) {
    var btn = box.querySelector("[data-map-load]");
    if (btn) btn.addEventListener("click", function () { loadMap(box); });
  });

  /* =================================================================
     CONSENTIMIENTO DE COOKIES
     Reglas que sigue (estándar europeo RGPD + ePrivacy, referencia internacional):
     - Las necesarias (idioma y esta misma elección) no piden permiso.
     - Nada opcional se carga antes de que el visitante lo acepte.
     - Aceptar y rechazar tienen el mismo peso visual; nada viene premarcado.
     - Se guarda qué aceptó y cuándo; se vuelve a preguntar al vencer o al
       cambiar "version" en js/config.js.
     - "Configurar cookies" en el footer permite cambiar la decisión.
     ================================================================= */
  var CONSENT_KEY = "locker10-consent";
  var COOKIES = GYM.cookies || {};
  var consentCategories = [
    { id: "necessary", locked: true },
    { id: "maps", active: true }, // el mapa del footer está en la portada
    { id: "analytics", active: !!COOKIES.googleAnalyticsId },
    { id: "marketing", active: !!COOKIES.metaPixelId },
  ].filter(function (c) { return c.locked || c.active; });

  function readConsent() {
    try {
      var c = JSON.parse(localStorage.getItem(CONSENT_KEY) || "null");
      if (!c || c.version !== (COOKIES.version || 1)) return null;
      var months = COOKIES.vigenciaMeses || 12;
      if (Date.now() - new Date(c.date).getTime() > months * 30.44 * 864e5) return null;
      return c;
    } catch (e) { return null; }
  }
  function saveConsent(choices) {
    var record = { version: COOKIES.version || 1, date: new Date().toISOString(), choices: choices };
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(record)); } catch (e) { /* sin almacenamiento */ }
    return record;
  }

  // Lo que se activa con cada categoría. Nunca se ejecuta sin permiso.
  var scriptsLoaded = {};
  function applyConsent(record) {
    var ch = (record && record.choices) || {};
    if (ch.maps) document.querySelectorAll("[data-map]").forEach(loadMap);
    if (ch.analytics && COOKIES.googleAnalyticsId && !scriptsLoaded.ga) {
      scriptsLoaded.ga = true;
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(COOKIES.googleAnalyticsId);
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", COOKIES.googleAnalyticsId, { anonymize_ip: true });
    }
    if (ch.marketing && COOKIES.metaPixelId && !scriptsLoaded.pixel) {
      scriptsLoaded.pixel = true;
      /* Código base del píxel de Meta, cargado solo con permiso */
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("init", COOKIES.metaPixelId);
      window.fbq("track", "PageView");
    }
  }

  var consentUI = null;
  function buildConsentUI() {
    // Aviso inicial: no bloquea el sitio; se puede seguir navegando sin decidir
    var banner = document.createElement("section");
    banner.className = "cookie-banner";
    banner.setAttribute("aria-labelledby", "cookie-banner-title");
    banner.hidden = true;
    banner.innerHTML =
      '<h2 class="cookie-banner__title" id="cookie-banner-title"></h2>' +
      '<p class="cookie-banner__text"></p>' +
      '<div class="cookie-actions">' +
        '<button type="button" class="cookie-btn" data-consent="reject"></button>' +
        '<button type="button" class="cookie-btn" data-consent="accept"></button>' +
      '</div>' +
      '<button type="button" class="cookie-link" data-consent="customize"></button>';

    // Panel de configuración por categoría
    var dialog = document.createElement("dialog");
    dialog.className = "cookie-dialog";
    dialog.setAttribute("aria-labelledby", "cookie-dialog-title");
    dialog.innerHTML =
      '<form method="dialog" class="cookie-dialog__inner">' +
        '<div class="cookie-dialog__head">' +
          '<h2 id="cookie-dialog-title"></h2>' +
          '<button type="button" class="cookie-dialog__close" data-consent="close"><i class="ph ph-x" aria-hidden="true"></i><span class="sr-only"></span></button>' +
        '</div>' +
        '<p class="cookie-dialog__intro"></p>' +
        '<ul class="cookie-cats" role="list">' +
          consentCategories.map(function (c) {
            return '<li class="cookie-cat">' +
              '<div class="cookie-cat__text"><h3 id="cc-' + c.id + '-title"></h3><p id="cc-' + c.id + '-desc"></p></div>' +
              '<label class="switch">' +
                '<input type="checkbox" role="switch" data-cat="' + c.id + '" aria-labelledby="cc-' + c.id + '-title" aria-describedby="cc-' + c.id + '-desc"' + (c.locked ? " checked disabled" : "") + '>' +
                '<span class="switch__track" aria-hidden="true"></span>' +
                (c.locked ? '<span class="switch__note"></span>' : "") +
              '</label>' +
            '</li>';
          }).join("") +
        '</ul>' +
        '<p class="cookie-dialog__more"></p>' +
        '<div class="cookie-actions">' +
          '<button type="button" class="cookie-btn" data-consent="reject"></button>' +
          '<button type="button" class="cookie-btn" data-consent="accept"></button>' +
        '</div>' +
        '<button type="button" class="cookie-btn cookie-btn--save" data-consent="save"></button>' +
      '</form>';

    document.body.appendChild(banner);
    document.body.appendChild(dialog);
    consentUI = { banner: banner, dialog: dialog };
    translateConsentUI();

    function decide(choices) {
      var record = saveConsent(choices);
      applyConsent(record);
      hideBanner();
      if (dialog.open) dialog.close();
    }
    function allChoices(value) {
      var ch = {};
      consentCategories.forEach(function (c) { if (!c.locked) ch[c.id] = value; });
      return ch;
    }
    [banner, dialog].forEach(function (root) {
      root.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-consent]");
        if (!btn) return;
        var action = btn.dataset.consent;
        if (action === "accept") decide(allChoices(true));
        else if (action === "reject") decide(allChoices(false));
        else if (action === "customize") openSettings();
        else if (action === "close") dialog.close();
        else if (action === "save") {
          var ch = {};
          dialog.querySelectorAll("input[data-cat]:not([disabled])").forEach(function (i) { ch[i.dataset.cat] = i.checked; });
          decide(ch);
        }
      });
    });
  }

  function translateConsentUI() {
    if (!consentUI) return;
    var b = consentUI.banner, d = consentUI.dialog;
    b.querySelector(".cookie-banner__title").textContent = t("cookies.title");
    b.querySelector(".cookie-banner__text").innerHTML = t("cookies.text");
    b.querySelector(".cookie-link").textContent = t("cookies.customize");
    d.querySelector("#cookie-dialog-title").textContent = t("cookies.settingsTitle");
    d.querySelector(".cookie-dialog__close .sr-only").textContent = t("cookies.close");
    d.querySelector(".cookie-dialog__intro").textContent = t("cookies.settingsText");
    d.querySelector(".cookie-dialog__more").innerHTML = t("cookies.more");
    d.querySelector('[data-consent="save"]').textContent = t("cookies.save");
    [b, d].forEach(function (root) {
      root.querySelector('[data-consent="accept"]').textContent = t("cookies.accept");
      root.querySelector('[data-consent="reject"]').textContent = t("cookies.reject");
    });
    consentCategories.forEach(function (c) {
      d.querySelector("#cc-" + c.id + "-title").textContent = t("cookies.cat." + c.id);
      d.querySelector("#cc-" + c.id + "-desc").textContent = t("cookies.cat." + c.id + ".desc");
    });
    var note = d.querySelector(".switch__note");
    if (note) note.textContent = t("cookies.alwaysOn");
  }

  function showBanner() {
    consentUI.banner.hidden = false;
    root.classList.add("has-cookie-banner");
  }
  function hideBanner() {
    consentUI.banner.hidden = true;
    root.classList.remove("has-cookie-banner");
  }
  function openSettings() {
    // Las casillas reflejan la elección guardada; sin elección, todo apagado
    var saved = readConsent();
    var ch = (saved && saved.choices) || {};
    consentUI.dialog.querySelectorAll("input[data-cat]:not([disabled])").forEach(function (i) {
      i.checked = !!ch[i.dataset.cat];
    });
    if (typeof consentUI.dialog.showModal === "function") consentUI.dialog.showModal();
    else consentUI.dialog.setAttribute("open", "");
  }

  function initConsent() {
    buildConsentUI();
    langHooks.push(translateConsentUI);
    var saved = readConsent();
    if (saved) applyConsent(saved); else showBanner();
    document.querySelectorAll("[data-cookie-settings]").forEach(function (b) {
      b.addEventListener("click", openSettings);
    });
    window.LockerConsent = { open: openSettings, read: readConsent };
  }

  /* ---------- Selector de idioma (se arma solo con los idiomas disponibles) ---------- */
  document.querySelectorAll("[data-lang-switch]").forEach(function (box) {
    if (languages.length < 2) { box.hidden = true; return; }
    languages.forEach(function (code) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "lang__btn";
      b.dataset.lang = code;
      b.lang = code;
      b.title = TR[code].name || code;
      b.textContent = TR[code].label || code.toUpperCase();
      b.addEventListener("click", function () { if (code !== lang) setLang(code); });
      box.appendChild(b);
    });
  });

  /* ---------- Año en el footer ---------- */
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Menú móvil ---------- */
  var nav = document.querySelector("[data-nav]");
  var toggle = document.querySelector(".nav__toggle");
  var menu = document.getElementById("menu");
  function menuOpen() { return toggle.getAttribute("aria-expanded") === "true"; }
  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector(".sr-only").textContent = t(open ? "a11y.closeMenu" : "a11y.openMenu");
    toggle.querySelector(".ph").className = open ? "ph ph-x" : "ph ph-list";
    menu.classList.toggle("is-open", open);
    if (open) nav.classList.remove("is-away");
  }
  toggle.addEventListener("click", function () { setMenu(!menuOpen()); });
  menu.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menuOpen()) {
      setMenu(false);
      toggle.focus();
    }
  });

  // Al cambiar de idioma con el menú abierto, su etiqueta también se traduce
  langHooks.push(function () {
    toggle.querySelector(".sr-only").textContent = t(menuOpen() ? "a11y.closeMenu" : "a11y.openMenu");
  });

  /* ---------- Páginas legales: anclas entre idiomas ----------
     Si un enlace apunta a una sección de la versión oculta (por ejemplo
     privacidad.html#cookies con el sitio en inglés), lleva a la sección
     equivalente de la versión visible. */
  function syncLegalAnchor() {
    if (!window.location.hash) return;
    var target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    var doc = target && target.closest("[data-lang-content]");
    if (!doc || !doc.hidden) return;
    var visible = document.querySelector("[data-lang-content]:not([hidden])");
    if (!visible) return;
    var index = Array.prototype.indexOf.call(doc.querySelectorAll("h2[id]"), target);
    var twin = visible.querySelectorAll("h2[id]")[index];
    if (twin) twin.scrollIntoView();
  }
  if (document.querySelector("[data-lang-content]")) {
    langHooks.push(syncLegalAnchor);
    window.addEventListener("hashchange", syncLegalAnchor);
  }

  /* ---------- Idioma inicial (también separa los titulares en líneas) ---------- */
  applyLang(pickInitialLang());
  document.querySelectorAll("[data-split]").forEach(function (el) {
    if (!el.querySelector(".line")) splitHeading(el, el.innerHTML);
  });

  /* ---------- Aviso de cookies (después del idioma, para mostrarse ya traducido) ---------- */
  initConsent();

  /* ---------- Índices para las cascadas ---------- */
  document.querySelectorAll("[data-stagger]").forEach(function (list) {
    Array.prototype.forEach.call(list.children, function (child, i) {
      child.style.setProperty("--i", i);
    });
  });
  document.querySelectorAll("[data-door]").forEach(function (door, i) {
    door.style.setProperty("--i", i);
  });

  /* ---------- Contadores (precios y cifras) ---------- */
  function formatCount(el, value) {
    var n = Math.round(value);
    var text = Math.abs(n) >= 1000 ? n.toLocaleString("en-US") : String(n);
    return (el.dataset.prefix || "") + text + (el.dataset.suffix || "");
  }
  var counters = document.querySelectorAll("[data-count]");
  if (!reduceMotion && hasIO) {
    counters.forEach(function (el) { el.textContent = formatCount(el, 0); });
  }
  function runCounter(el) {
    var target = parseFloat(el.dataset.count);
    if (reduceMotion) { el.textContent = formatCount(el, target); return; }
    var start = performance.now();
    var duration = 1400;
    (function tick(now) {
      var t = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 4);
      el.textContent = formatCount(el, target * eased);
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  }

  /* ---------- Horarios por día ---------- */
  var tabs = document.querySelector("[data-tabs]");
  var panel = document.querySelector("[data-panel]");
  var days = Object.keys(GYM.horarios || {});
  if (tabs && panel && days.length) {
    var list = document.createElement("ol");
    list.className = "slots";
    list.setAttribute("role", "list");
    panel.appendChild(list);

    // Indicador de latón que se desliza bajo el día activo
    var thumb = document.createElement("span");
    thumb.className = "tabs__thumb";
    thumb.setAttribute("aria-hidden", "true");
    tabs.appendChild(thumb);
    tabs.classList.add("has-thumb");

    var current = 0;
    var buttons = days.map(function (day, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tab";
      b.id = "tab-" + i;
      b.textContent = t("days." + day);
      b.setAttribute("role", "tab");
      b.setAttribute("aria-controls", "slots-panel");
      b.addEventListener("click", function () { select(i, true); });
      tabs.appendChild(b);
      return b;
    });
    panel.id = "slots-panel";

    // Flechas izquierda/derecha para moverse entre días
    tabs.addEventListener("keydown", function (e) {
      var i = buttons.indexOf(document.activeElement);
      if (i < 0) return;
      var next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
      if (next === null) return;
      e.preventDefault();
      next = (next + buttons.length) % buttons.length;
      select(next, true);
      buttons[next].focus();
    });

    // Se mide en el siguiente cuadro, después de que el DOM ya cambió:
    // así no se fuerza un recálculo de layout en medio de las escrituras
    var thumbFrame = 0;
    function moveThumb() {
      cancelAnimationFrame(thumbFrame);
      thumbFrame = requestAnimationFrame(function () {
        var b = buttons[current];
        var x = b.offsetLeft, w = b.offsetWidth;
        tabs.style.setProperty("--x", x + "px");
        tabs.style.setProperty("--w", w + "px");
      });
    }

    function select(index, animate) {
      current = index;
      buttons.forEach(function (b, i) {
        var on = i === index;
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
      });
      panel.setAttribute("aria-labelledby", buttons[index].id);
      renderSlots();
      moveThumb();
      if (animate) {
        list.classList.remove("is-swapping");
        void list.offsetWidth;
        list.classList.add("is-swapping");
      }
    }

    function renderSlots() {
      list.innerHTML = "";
      GYM.horarios[days[current]].forEach(function (s, i) {
        var li = document.createElement("li");
        li.className = "slot";
        li.style.setProperty("--i", i);
        [["slot__time", s[0]], ["slot__class", t("classes." + s[1])], ["slot__coach", t("schedule.with", { name: s[2] })]]
          .forEach(function (part) {
            var span = document.createElement("span");
            span.className = part[0];
            span.textContent = part[1];
            li.appendChild(span);
          });
        list.appendChild(li);
      });
    }

    // Al cambiar de idioma: días y clases en el idioma nuevo, sin animar
    langHooks.push(function () {
      buttons.forEach(function (b, i) { b.textContent = t("days." + days[i]); });
      renderSlots();
      moveThumb();
    });

    // Abre en el día de hoy (los días en config.js van de lunes a domingo)
    select((new Date().getDay() + 6) % 7, false);
    window.addEventListener("resize", moveThumb);
  }

  /* ---------- Carrusel de programas (infinito) ----------
     La pista usa el scroll nativo con imán (scroll-snap): el dedo, el trackpad
     y la rueda funcionan solos y se sienten naturales.
     Para que sea infinito, las tarjetas se repiten: [copias | originales | copias].
     Cuando el movimiento termina sobre una copia, la pista salta en silencio a la
     tarjeta original idéntica (mismo aspecto, misma posición en pantalla): el
     salto no se ve y siempre hay una tarjeta siguiente en ambas direcciones. */
  document.querySelectorAll("[data-carousel]").forEach(function (carousel) {
    var section = carousel.closest("section") || document;
    var track = carousel.querySelector("[data-carousel-track]");
    var originals = Array.prototype.slice.call(track.children);
    var prevBtn = section.querySelector("[data-carousel-prev]");
    var nextBtn = section.querySelector("[data-carousel-next]");
    var currentEl = section.querySelector("[data-carousel-current]");
    var totalEl = section.querySelector("[data-carousel-total]");
    var bar = carousel.querySelector("[data-carousel-bar]");
    var status = carousel.querySelector("[data-carousel-status]");
    var n = originals.length;
    if (!n) return;

    function pad(i) { return (i < 10 ? "0" : "") + i; }
    if (totalEl) totalEl.textContent = pad(n);
    function labelSlides() {
      originals.forEach(function (slide, i) {
        slide.setAttribute("aria-label", t("programs.slideOf", { i: i + 1, n: n }));
      });
    }
    labelSlides();
    langHooks.push(labelSlides);

    // Copias antes y después. Están ocultas para lectores de pantalla (las originales ya se anuncian).
    function makeClone(slide) {
      var clone = slide.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.removeAttribute("aria-label");
      clone.removeAttribute("data-door");
      clone.classList.add("is-clone");
      if (!hasIO) clone.classList.add("is-in");
      return clone;
    }
    var before = document.createDocumentFragment();
    var after = document.createDocumentFragment();
    originals.forEach(function (s) { before.appendChild(makeClone(s)); after.appendChild(makeClone(s)); });
    track.insertBefore(before, track.firstChild);
    track.appendChild(after);
    var slides = Array.prototype.slice.call(track.children); // 3 × n: [copias | originales | copias]
    slides.forEach(function (slide) {
      slide.querySelectorAll("img").forEach(function (img) { img.draggable = false; });
    });
    // Las copias se revelan junto con la original (mismo momento de la animación de entrada)
    if (hasIO) {
      var revealIO = new IntersectionObserver(function (entries) {
        if (!entries.some(function (e) { return e.isIntersecting; })) return;
        slides.forEach(function (s) { if (s.classList.contains("is-clone")) s.classList.add("is-in"); });
        revealIO.disconnect();
      });
      revealIO.observe(track);
    }

    // Segundo tramo de la barra: entra por la izquierda mientras el primero sale por la derecha
    var bar2 = null;
    if (bar) {
      bar2 = bar.cloneNode(false);
      bar2.removeAttribute("data-carousel-bar");
      bar.parentNode.appendChild(bar2);
    }

    // La diapositiva k (0 … 3n-1) queda centrada en scrollLeft = k × paso
    var stepCache = 0;
    function step() {
      if (!stepCache) stepCache = slides[1].offsetLeft - slides[0].offsetLeft || track.clientWidth;
      return stepCache;
    }
    window.addEventListener("resize", function () { stepCache = 0; });
    function position() { return track.scrollLeft / step(); }       // continuo (ej. 5.4)
    function nearest() { return Math.round(position()); }           // diapositiva centrada
    function real(k) { return ((k % n) + n) % n; }                    // 0 … n-1

    var currentK = -1;
    function update() {
      var p = position();
      var k = Math.round(p);
      var r = real(k);
      if (k !== currentK) {
        currentK = k;
        if (currentEl) currentEl.textContent = pad(r + 1);
        slides.forEach(function (s, j) { s.classList.toggle("is-current", j === k); });
      }
      if (bar) {
        // Avance continuo y circular: un tramo por diapositiva
        var loop = ((p % n) + n) % n;                 // 0 … n (sin saltos)
        bar.style.setProperty("--thumb", (100 / n).toFixed(3) + "%");
        bar.style.setProperty("--thumb-x", (loop * 100).toFixed(2) + "%");
        bar2.style.setProperty("--thumb", (100 / n).toFixed(3) + "%");
        bar2.style.setProperty("--thumb-x", ((loop - n) * 100).toFixed(2) + "%");
      }
    }

    // Salto silencioso a la copia equivalente del grupo central
    function recenter() {
      var k = nearest();
      if (k >= n && k < 2 * n) return;
      var target = real(k) + n;
      track.classList.add("is-jumping");               // sin transiciones durante el salto
      track.scrollLeft = target * step();
      update();
      requestAnimationFrame(function () { requestAnimationFrame(function () { track.classList.remove("is-jumping"); }); });
    }

    // Destino de la animación en curso: los clics rápidos suman desde aquí y no se pierden
    var targetK = null;
    function base() { return targetK !== null ? targetK : nearest(); }

    function goTo(k, announce) {
      // Si el destino cae fuera de las copias, primero se recentra (invisible) y se recalcula
      if (k < 1 || k > 3 * n - 2) {
        var cur = nearest();
        var shift = (real(cur) + n) - cur;   // cuánto se mueve el recentrado
        recenter();
        k += shift;
      }
      targetK = k;
      track.scrollTo({ left: k * step(), behavior: reduceMotion ? "auto" : "smooth" });
      if (announce && status) {
        var title = slides[k].querySelector("h3");
        status.textContent = t("programs.status", { i: real(k) + 1, n: n, name: title ? title.textContent : "" });
      }
    }

    // Movimiento y fin del movimiento
    var pending = false, settleTimer = 0, dragging = false;
    track.addEventListener("scroll", function () {
      if (!pending) {
        pending = true;
        requestAnimationFrame(function () { pending = false; update(); });
      }
      // Respaldo para navegadores sin el evento "scrollend"
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, 160);
    }, { passive: true });
    function settle() {
      if (dragging) return;
      clearTimeout(settleTimer);
      targetK = null;
      recenter();
    }
    track.addEventListener("scrollend", settle);
    window.addEventListener("resize", function () { requestAnimationFrame(function () { track.scrollLeft = (real(nearest()) + n) * step(); update(); }); });

    if (prevBtn) prevBtn.addEventListener("click", function () { goTo(base() - 1, true); });
    if (nextBtn) nextBtn.addEventListener("click", function () { goTo(base() + 1, true); });

    // Teclado: flechas avanzan una diapositiva; Inicio y Fin van a la primera y la última
    track.addEventListener("keydown", function (e) {
      var map = { ArrowRight: 1, ArrowLeft: -1 };
      if (e.key in map) { e.preventDefault(); goTo(base() + map[e.key], true); }
      else if (e.key === "Home") { e.preventDefault(); goTo(n, true); }
      else if (e.key === "End") { e.preventDefault(); goTo(2 * n - 1, true); }
    });

    // Arrastre con mouse (en táctil ya lo resuelve el scroll nativo)
    var drag = null;
    var suppressClick = false;
    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      targetK = null;
      drag = { x: e.clientX, left: track.scrollLeft, lastX: e.clientX, lastT: e.timeStamp, v: 0, moved: false };
    });
    track.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 5) {
        drag.moved = true;
        dragging = true;
        track.classList.add("is-dragging");
        track.setPointerCapture(e.pointerId);
      }
      if (!drag.moved) return;
      var dt = Math.max(1, e.timeStamp - drag.lastT);
      drag.v = (e.clientX - drag.lastX) / dt;
      drag.lastX = e.clientX;
      drag.lastT = e.timeStamp;
      track.scrollLeft = drag.left - dx;
    });
    function endDrag(e) {
      if (!drag) return;
      var d = drag;
      drag = null;
      if (!d.moved) return;
      dragging = false;
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 60);
      if (track.hasPointerCapture && track.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId);
      // Proyecta la inercia del gesto y se asienta en la diapositiva más cercana
      var projected = (track.scrollLeft - d.v * 220) / step();
      goTo(Math.round(projected), true);
      var release = function () { track.classList.remove("is-dragging"); };
      if ("onscrollend" in window) track.addEventListener("scrollend", release, { once: true });
      setTimeout(release, 700);
    }
    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
    track.addEventListener("click", function (e) {
      if (suppressClick) { e.preventDefault(); e.stopPropagation(); suppressClick = false; }
    }, true);

    // Clic en una diapositiva lateral: la trae al centro
    slides.forEach(function (slide, k) {
      slide.addEventListener("click", function () {
        if (!slide.classList.contains("is-current")) goTo(k, true);
      });
    });

    // Diapositiva inicial: data-start en el HTML (1 = la primera), dentro del grupo central
    var start = Math.max(0, Math.min(n - 1, (parseInt(carousel.dataset.start, 10) || 1) - 1));
    var touched = false;
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach(function (type) {
      track.addEventListener(type, function () { touched = true; }, { once: true, passive: true });
    });
    [prevBtn, nextBtn].forEach(function (b) { if (b) b.addEventListener("click", function () { touched = true; }); });
    function placeStart() {
      if (touched) return;
      stepCache = 0;
      track.classList.add("is-jumping");
      track.scrollLeft = (start + n) * step();
      update();
      requestAnimationFrame(function () { track.classList.remove("is-jumping"); });
    }
    // Se mide en el primer cuadro (no durante la carga del script) para no forzar
    // un cálculo de layout que bloquee el hilo principal
    requestAnimationFrame(placeStart);
    // Por si las fuentes o el tamaño cambian al terminar de cargar
    window.addEventListener("load", placeStart);
  });

  /* ---------- Preguntas: abrir y cerrar con altura animada ---------- */
  document.querySelectorAll(".faq__list details").forEach(function (details) {
    var summary = details.querySelector("summary");
    var content = details.querySelector("p");
    if (!summary || !content || reduceMotion || !content.animate) return;
    summary.addEventListener("click", function (e) {
      e.preventDefault();
      if (details.dataset.busy) return;
      details.dataset.busy = "1";
      if (!details.open) {
        details.open = true;
        var h = content.offsetHeight;
        content.animate(
          [{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }],
          { duration: 380, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
        ).onfinish = function () { delete details.dataset.busy; };
      } else {
        content.animate(
          [{ height: content.offsetHeight + "px", opacity: 1 }, { height: "0px", opacity: 0 }],
          { duration: 220, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }
        ).onfinish = function () { details.open = false; delete details.dataset.busy; };
      }
    });
  });

  /* =================================================================
     HERO: galería en abanico
     - Reparte las tarjetas al cargar, rota sola cada FAN_DELAY ms
     - Con el cursor: el abanico se abre (CSS) y se inclina en 3D siguiendo el mouse
     - Clic o flechas del teclado: lleva esa foto al centro
     - Se pausa con el cursor encima, con foco dentro, fuera de pantalla o con la pestaña oculta
     ================================================================= */
  var FAN_DELAY = 3200;
  document.querySelectorAll("[data-fan]").forEach(function (fan) {
    var stage = fan.querySelector("[data-fan-stage]");
    var cards = Array.prototype.slice.call(fan.querySelectorAll("[data-fan-card]"));
    var timerBar = fan.querySelector("[data-fan-timer]");
    var n = cards.length;
    if (!n) return;
    var half = Math.floor(n / 2);
    var active = Math.max(0, Math.min(n - 1, (parseInt(fan.dataset.start, 10) || half + 1) - 1));
    var prevOffsets = [];
    fan.style.setProperty("--fan-delay", FAN_DELAY + "ms");

    function offsetOf(i) { return ((i - active + n + half) % n) - half; }

    function layout(animateWrap) {
      cards.forEach(function (card, i) {
        var o = offsetOf(i);
        // Una tarjeta que salta de un extremo al otro no cruza el abanico: aparece en su nuevo lugar
        if (animateWrap && prevOffsets[i] !== undefined && Math.abs(o - prevOffsets[i]) > half) {
          card.classList.add("is-wrapping");
          requestAnimationFrame(function () { requestAnimationFrame(function () { card.classList.remove("is-wrapping"); }); });
        }
        prevOffsets[i] = o;
        card.style.setProperty("--o", o);
        card.style.setProperty("--a", Math.abs(o));
        card.classList.toggle("is-active", o === 0);
        card.setAttribute("aria-pressed", String(o === 0));
        card.tabIndex = o === 0 ? 0 : -1;
      });
    }

    // ----- Rotación automática -----
    var timer = 0, paused = false, visible = true, hovering = false, focused = false;
    function restartTimerBar() {
      if (!timerBar) return;
      timerBar.classList.remove("is-running");
      void timerBar.offsetWidth;
      timerBar.classList.add("is-running");
    }
    function schedule() {
      clearTimeout(timer);
      if (reduceMotion || paused) return;
      restartTimerBar();
      timer = setTimeout(function () { go(active + 1); }, FAN_DELAY);
    }
    function updatePause() {
      var p = hovering || focused || !visible || document.hidden;
      if (p === paused) return;
      paused = p;
      fan.classList.toggle("is-paused", p);
      if (p) clearTimeout(timer); else schedule();
    }
    function go(i) {
      active = (i + n) % n;
      layout(true);
      schedule();
    }

    cards.forEach(function (card, i) {
      card.addEventListener("click", function () { if (i !== active) go(i); });
    });
    stage.addEventListener("keydown", function (e) {
      var step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      go(active + step);
      cards[active].focus();
    });
    stage.addEventListener("pointerenter", function () { hovering = true; updatePause(); });
    stage.addEventListener("pointerleave", function () { hovering = false; updatePause(); });
    fan.addEventListener("focusin", function () { focused = true; updatePause(); });
    fan.addEventListener("focusout", function (e) { if (!fan.contains(e.relatedTarget)) { focused = false; updatePause(); } });
    document.addEventListener("visibilitychange", updatePause);
    if (hasIO) new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; updatePause(); }).observe(fan);

    // ----- Inclinación 3D siguiendo el cursor (solo mouse, suavizada) -----
    var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (fine && !reduceMotion) {
      var hero = fan.closest("section") || fan;
      var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
      function tilt() {
        cx += (tx - cx) * 0.08;
        cy += (ty - cy) * 0.08;
        stage.style.transform = "rotateX(" + cy.toFixed(2) + "deg) rotateY(" + cx.toFixed(2) + "deg)";
        raf = Math.abs(tx - cx) > 0.01 || Math.abs(ty - cy) > 0.01 ? requestAnimationFrame(tilt) : 0;
      }
      hero.addEventListener("pointermove", function (e) {
        var r = fan.getBoundingClientRect();
        tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / r.width)) * 9;
        ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / r.height)) * -7;
        if (!raf) raf = requestAnimationFrame(tilt);
      });
      hero.addEventListener("pointerleave", function () { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(tilt); });
    }

    // ----- Reparto inicial -----
    layout(false);
    if (reduceMotion) return;
    fan.classList.add("is-dealing", "is-entering");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        fan.classList.remove("is-dealing");
        setTimeout(function () { fan.classList.remove("is-entering"); schedule(); }, 1400);
      });
    });
  });

  /* ---------- Botón principal "magnético": se acerca un poco al cursor ---------- */
  if (!reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll(".hero .keytag").forEach(function (btn) {
      btn.addEventListener("pointermove", function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) * 0.18;
        var y = (e.clientY - (r.top + r.height / 2)) * 0.3;
        btn.style.translate = x.toFixed(1) + "px " + y.toFixed(1) + "px";
      });
      btn.addEventListener("pointerleave", function () { btn.style.translate = ""; });
    });
  }

  /* ---------- Apariciones al entrar en pantalla ---------- */
  var revealables = document.querySelectorAll("[data-reveal], [data-door], [data-stagger], [data-split], [data-count]");
  function reveal(el) {
    el.classList.add("is-in");
    if (el.hasAttribute("data-count")) runCounter(el);
  }
  if (hasIO) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          reveal(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.15 });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(reveal);
  }

  /* ---------- Cinta: se pausa fuera de pantalla ---------- */
  var ticker = document.querySelector("[data-ticker]");
  if (ticker && hasIO) {
    new IntersectionObserver(function (entries) {
      ticker.classList.toggle("is-paused", !entries[0].isIntersecting);
    }).observe(ticker);
  }

  /* ---------- Sección activa en la nav ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__links a[href^="#"]'));
  if (hasIO && navLinks.length) {
    var sectionIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navLinks.forEach(function (a) {
      var target = document.querySelector(a.getAttribute("href"));
      if (target) sectionIO.observe(target);
    });
  }

  /* ---------- Botón flotante: oculto mientras otro CTA está a la vista ---------- */
  var heroCta = document.querySelector("[data-hero-cta]");
  var closing = document.querySelector(".closing");
  var float = document.querySelector(".wa-float");
  if (hasIO && float) {
    var visible = new Set();
    var watch = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target);
      });
      float.classList.toggle("is-hidden", visible.size > 0);
    }, { threshold: 0.2 });
    [heroCta, closing].forEach(function (el) { if (el) watch.observe(el); });
  }

  /* ---------- Bucle de scroll: parallax, progreso, nav y cinta ----------
     Un solo requestAnimationFrame por cuadro, y solo trabaja sobre los
     elementos que están en pantalla. */
  var layers = [];
  document.querySelectorAll("[data-parallax]").forEach(function (el) {
    layers.push({ el: el, speed: parseFloat(el.dataset.parallax) || 0, tilt: el.hasAttribute("data-tilt"), on: true, kind: "layer" });
  });
  document.querySelectorAll(".frame .photo").forEach(function (img) {
    layers.push({ el: img, box: img.closest(".frame"), on: true, kind: "photo" });
  });

  if (hasIO) {
    var layerIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { entry.target._onScreen = entry.isIntersecting; });
    }, { rootMargin: "20% 0px 20% 0px" });
    layers.forEach(function (l) { layerIO.observe(l.box || l.el); });
  }

  var progressBar = document.querySelector(".nav__progress");
  var track = document.querySelector(".ticker__track");
  var lastY = window.scrollY;
  var skew = 0;
  var ticking = false;

  function frame() {
    ticking = false;
    var y = window.scrollY;
    var vh = window.innerHeight;
    var max = document.documentElement.scrollHeight - vh;
    var delta = y - lastY;

    // 1) LECTURA: todas las medidas del cuadro antes de tocar cualquier estilo
    var narrow = window.innerWidth < 900;
    var active = reduceMotion ? [] : layers.filter(function (l) {
      return (l.box || l.el)._onScreen !== false && !(narrow && l.kind === "layer");
    });
    var rects = active.map(function (l) { return (l.box || l.el).getBoundingClientRect(); });

    // 2) ESCRITURA
    // Barra de progreso de lectura
    if (progressBar) progressBar.style.setProperty("--progress", max > 0 ? (y / max).toFixed(4) : 0);

    // La nav se esconde al bajar y vuelve al subir
    if (!menuOpen()) {
      if (y > vh * 0.6 && delta > 6) nav.classList.add("is-away");
      else if (delta < -6 || y < vh * 0.6) nav.classList.remove("is-away");
    }
    nav.classList.toggle("is-scrolled", y > 20);

    if (!reduceMotion) {
      // Parallax (en pantallas angostas solo se mueven las fotos dentro de su marco,
      // para que los bloques apilados nunca se encimen)
      if (narrow) layers.forEach(function (l) {
        if (l.kind === "layer" && l.el.style.translate) { l.el.style.translate = ""; l.el.style.removeProperty("--tilt"); }
      });
      active.forEach(function (l, k) {
        var r = rects[k];
        var p = (r.top + r.height / 2 - vh / 2) / vh; // -1 arriba, 0 centro, 1 abajo
        if (l.kind === "photo") {
          var shift = Math.max(-1, Math.min(1, p)) * r.height * 0.07;
          l.el.style.setProperty("--py", shift.toFixed(1) + "px");
        } else {
          var offset = Math.max(-90, Math.min(90, -p * l.speed * vh));
          l.el.style.translate = "0 " + offset.toFixed(1) + "px";
          if (l.tilt) l.el.style.setProperty("--tilt", (p * -5).toFixed(2) + "deg");
        }
      });

      // La cinta se inclina con la velocidad del scroll
      if (track) {
        skew += (Math.max(-8, Math.min(8, delta * 0.35)) - skew) * 0.25;
        if (Math.abs(skew) < 0.05) skew = 0;
        track.style.setProperty("--skew", skew.toFixed(2) + "deg");
        if (skew !== 0) requestTick();
      }
    }
    lastY = y;
  }
  function requestTick() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  }
  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", requestTick);
  requestTick(); // primer cálculo en el siguiente cuadro, no durante la carga
})();
