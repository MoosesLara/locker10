# LOCKER 10 · Landing de gimnasio

Página estática (HTML, CSS y JavaScript puro), en español e inglés. Ábrela con doble clic en `index.html` o súbela tal cual a cualquier hosting (Netlify, Vercel, GitHub Pages, cPanel). No necesita instalar nada.

## Qué editar y dónde

| Quiero cambiar | Archivo |
|---|---|
| Cualquier texto, en cualquier idioma (incluye mensajes de WhatsApp, título y descripción para Google) | `js/translations.js` |
| Número de WhatsApp, teléfono visible, horarios de clases | `js/config.js` |
| Precios, fotos, nombres de coaches y testimonios, estructura | `index.html` |
| Colores y tipografías | `css/styles.css`, bloque `:root` al inicio |
| Mapa | `index.html`, iframe del footer: cambia la dirección después de `q=` |
| Diapositiva con la que arranca el carrusel | `index.html`, atributo `data-start` |

## Idiomas

- El sitio elige el idioma así: `?lang=en` en la URL, la última elección del visitante, el idioma de su navegador y, si no coincide ninguno, `defaultLang` (español).
- El selector ES / EN de la navegación se arma solo con los idiomas que existan en `js/translations.js`.
- **Agregar un idioma:** copia el bloque `en` completo en `js/translations.js`, cámbiale la clave (por ejemplo `pt`), `label`, `name` y `locale`, y traduce los valores. No hay que tocar nada más.
- **Agregar un texto nuevo:** ponle `data-i18n="mi.clave"` al elemento en `index.html` (o `data-i18n-attr="alt:mi.clave"` para atributos) y crea `mi.clave` en cada idioma.
- El español escrito en `index.html` es solo el respaldo si JavaScript no carga.

## Rendimiento

- Cada foto tiene versiones WebP en varios tamaños (`img/nombre-480.webp`, `-640`, `-900`…) y el navegador elige la más pequeña que le sirve. El `.jpg` queda como respaldo.
- **Si reemplazas una foto**, hay que regenerar sus versiones WebP y usar un nombre nuevo (las imágenes se cachean 1 año). Pídelo y se hace en un paso.
- `node build.mjs` une y minifica el CSS y une el JS con huella en el nombre; por eso en `dist/` verás `assets/site.xxxx.css` en lugar de `css/styles.css`. Edita siempre los archivos originales, nunca `dist/`.

## Fotos

Están en `img/`, en local. Para cambiar una, reemplaza el archivo con el mismo nombre y proporción, o cambia el `src` en `index.html`. Se tiñen solas con la paleta del sitio.

| Archivo | Uso | Tamaño | Origen |
|---|---|---|---|
| `hero-peso-muerto.jpg` | Hero | 1200×1500 | Unsplash `photo-1517836357463-d25dfeac3438` |
| `sala-mancuernas.jpg` | Por qué LOCKER 10 | 1400×1000 | Unsplash `photo-1576678927484-cc907957088c` |
| `programa-musculacion.jpg` | Programa | 900×1200 | Unsplash `photo-1574680096145-d05b474e2155` |
| `programa-funcional.jpg` | Programa | 900×1200 | Unsplash `photo-1534258936925-c58bed479fcb` |
| `programa-spinning.jpg` | Programa | 900×1200 | Unsplash `photo-1593079831268-3381b0db4a77` |
| `programa-boxeo.jpg` | Programa | 900×1200 | Unsplash `photo-1517438322307-e67111335449` |
| `coach-javier.jpg` | Entrenador | 800×1000 | Unsplash `photo-1581009146145-b5ef050c2e1e` |
| `coach-mariela.jpg` | Entrenadora | 800×1000 | Unsplash `photo-1548690312-e3b507d8c110` |
| `coach-kevin.jpg` | Entrenador | 800×1000 | Unsplash `photo-1567013127542-490d757e51fc` |
| `cta-dominadas.jpg` | CTA final | 1000×1250 | Unsplash `photo-1526506118085-60ce8714f8c5` |

Licencia de Unsplash: uso libre, sin atribución obligatoria. El origen también va guardado dentro de cada archivo.

## Páginas legales

- `privacidad.html`: Aviso de privacidad (incluye la sección de cookies, `privacidad.html#cookies`).
- `terminos.html`: Términos y condiciones del sitio y de la membresía.
- Las dos tienen versión en español e inglés en el mismo archivo y cambian con el selector de idioma.
- La razón social, el NIT, el domicilio y los correos se llenan desde `js/config.js` → `legal`.
- Si cambias precios, plazos de cancelación o reglas, actualiza también estas páginas y su fecha de "Última actualización", para que coincidan con el contrato de membresía.

## Cookies y consentimiento

- Al entrar por primera vez aparece un aviso con **Rechazar todo**, **Aceptar todo** (mismo tamaño) y **Elegir qué acepto** (panel por categoría). Se puede cambiar después desde "Configurar cookies" en el footer de cualquier página.
- Nada opcional se carga antes del permiso. Hoy la única categoría opcional es **Mapas** (Google Maps).
- La elección se guarda 12 meses en el navegador (`locker10-consent`) y se vuelve a preguntar al vencer.
- **Para agregar Google Analytics o el píxel de Meta:** pon el ID en `js/config.js` → `cookies` (`googleAnalyticsId` / `metaPixelId`). La categoría aparece sola en el panel y el script solo se carga si el visitante la acepta. Después:
  1. Sube `cookies.version` en `js/config.js` para volver a pedir permiso a todos.
  2. Agrega la cookie a la tabla de la sección 12 de `privacidad.html` (español e inglés).
- Tipografías (`fonts/`, `css/fonts.css`) e íconos (`vendor/phosphor/`) están alojados en el sitio: cargar la página no envía datos a terceros.

## Publicar

`node build.mjs` genera la carpeta `dist/` solo con los archivos públicos (sin `.claude`, `.agents`, `.gemini`, `.impeccable`, `PRODUCT.md`, `DESIGN.md` ni este README).

- **GitHub Pages:** cada vez que subes cambios a la rama `main`, `.github/workflows/pages.yml` construye `dist/` y lo publica solo (pestaña *Actions* del repositorio para ver el progreso). La dirección es `https://usuario.github.io/nombre-del-repo/`. Cuando tengas los datos reales, quita `--preview` en ese archivo para permitir que Google indexe el sitio.
- **Netlify:** conecta el repositorio o arrastra la carpeta `dist/` a app.netlify.com. `netlify.toml` y `_headers` ya configuran la publicación, las cabeceras de seguridad y la caché.
- **Vercel:** conecta el repositorio; `vercel.json` ya hace lo mismo.
- **Otro hosting (cPanel, etc.):** sube el contenido de `dist/`. Configura ahí la página 404 y, si se puede, las cabeceras de `_headers`.
- Al tener el dominio: cambia `locker10.gt` en las etiquetas `<head>` de las 4 páginas, en `sitemap.xml` y en `robots.txt`, y registra el sitio en Google Search Console y Google Business Profile.

## Antes de publicar

- Haz que un abogado guatemalteco revise `privacidad.html` y `terminos.html` y los compare con tu contrato de membresía.
- Pon la razón social, el NIT y el domicilio reales en `js/config.js` → `legal` (los actuales son genéricos).
- Ten el Libro de Quejas físico en recepción y señaliza las cámaras de videovigilancia, como dicen las páginas legales.
- Publica el sitio con HTTPS (Netlify, Vercel y GitHub Pages lo activan solos).

- Pon el número real en `js/config.js` (`whatsapp` y `telefonoVisible`); el actual (`+502 5000 0000`) es genérico.
- Revisa el nivel del local en Oakland Place, el correo `hola@locker10.gt` y la cuenta `@locker10.gt` en `index.html` y `js/translations.js`.
- Enlaza los perfiles reales de redes sociales, el aviso de privacidad y los términos (hoy apuntan a las páginas generales o a `#`).
