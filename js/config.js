/*
  CONFIGURACIÓN DEL GYM
  ---------------------------------------------------------------
  Datos que no dependen del idioma: WhatsApp, teléfono y horarios.
  Los textos (incluidos los mensajes de WhatsApp) están en js/translations.js;
  colores y tipografías al inicio de css/styles.css.
*/
window.GYM = {
  // Número de WhatsApp en formato internacional, solo dígitos (502 = Guatemala).
  // GENÉRICO: cámbialo por el número real antes de publicar.
  whatsapp: "50250000000",

  // Cómo se muestra el teléfono en el footer.
  telefonoVisible: "+502 5000 0000",

  // Datos legales del titular. Aparecen en el Aviso de privacidad y en los
  // Términos y condiciones (cada <span data-legal="..."> se llena desde aquí).
  // GENÉRICOS: reemplázalos por los de tu Patente de Comercio y RTU antes de publicar.
  legal: {
    razonSocial: "Locker Diez, Sociedad Anónima",
    nombreComercial: "LOCKER 10",
    nit: "0000000-0",
    domicilio: "Centro Comercial Oakland Place, Nivel 3, Diagonal 6, 13-01, Zona 10, Ciudad de Guatemala",
    correoPrivacidad: "privacidad@locker10.gt",
    correoGeneral: "hola@locker10.gt",
    sitio: "locker10.gt",
  },

  // COOKIES Y CONSENTIMIENTO
  // El panel de cookies solo muestra las categorías que el sitio usa de verdad.
  // - Si algún día usas Google Analytics, pon tu ID (ej. "G-XXXXXXX"): aparece la
  //   categoría "Analítica" y el script solo se carga si el visitante la acepta.
  // - Igual con el píxel de Meta (Facebook/Instagram) en "Publicidad".
  // - Si cambias qué cookies usas, sube "version" para volver a pedir permiso a todos.
  cookies: {
    version: 1,
    vigenciaMeses: 12,
    googleAnalyticsId: "",
    metaPixelId: "",
  },

  // Clases por día. Formato: [hora, clase, coach].
  // "clase" es una clave de js/translations.js ("classes.strength", etc.),
  // así cambia de idioma sola. Los nombres de los coaches no se traducen.
  horarios: {
    mon: [["6:00", "strength", "Javier"], ["7:15", "functional", "Mariela"], ["12:30", "mobility", "Mariela"], ["18:30", "spinning", "Kevin"], ["19:45", "boxing", "Kevin"]],
    tue: [["6:00", "functional", "Mariela"], ["7:15", "spinning", "Kevin"], ["12:30", "strength", "Javier"], ["18:30", "boxing", "Kevin"], ["19:45", "strength", "Javier"]],
    wed: [["6:00", "strength", "Javier"], ["7:15", "functional", "Mariela"], ["12:30", "mobility", "Mariela"], ["18:30", "spinning", "Kevin"], ["19:45", "boxing", "Kevin"]],
    thu: [["6:00", "functional", "Mariela"], ["7:15", "spinning", "Kevin"], ["12:30", "strength", "Javier"], ["18:30", "boxing", "Kevin"], ["19:45", "strength", "Javier"]],
    fri: [["6:00", "strength", "Javier"], ["7:15", "functional", "Mariela"], ["18:30", "spinning", "Kevin"], ["19:45", "boxing", "Kevin"]],
    sat: [["8:00", "functional", "Mariela"], ["9:15", "spinning", "Kevin"], ["10:30", "strength", "Javier"], ["15:00", "boxing", "Kevin"]],
    sun: [["9:00", "mobility", "Mariela"], ["10:15", "spinning", "Kevin"]],
  },
};
