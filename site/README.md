# knowmad mood · Web corporativa con énfasis en IA

Implementación de `project/Landing Corporativa.dc.html` (desktop 2a · 1440 px, móvil 2b · 390 px) y del formulario `project/Formulario Tech.dc.html`.

Página estática (HTML + CSS + JS sin dependencias). Ábrela con `index.html` o sírvela con cualquier servidor estático:

```sh
npx serve site
```

## Estructura

| Archivo | Contenido |
| --- | --- |
| `index.html` | Marcado. Cada bloque lleva `data-module="…"` y equivale a un módulo de HubSpot CMS. |
| `css/styles.css` | Tokens (`:root`), componentes compartidos (`.btn`, `.eyebrow`, `.pend`, `.chip`, `.sec-head`) y un bloque por sección. |
| `js/main.js` | Variantes, validación y estados del formulario, desplegable RGPD y barra CTA fija en móvil. |
| `js/globe.js` + `js/globe-data.js` | Globo giratorio de «Quiénes somos» y «Grupo y presencia» (canvas, sin dependencias). Los datos se generan con `tools/gen-globe.cjs` a partir de Natural Earth 1:50m; para cambiar los países de presencia, edita la lista `PRESENCE` y vuelve a generarlos. |
| `js/people.js` + `js/people-data.js` | Ilustración de «Personas»: el isologo formado por 3.500 figuras (una por persona), que se agrupan al entrar en pantalla, con lupa. Las posiciones se generan con `tools/gen-people.cjs` a partir del isologo 3D. |
| `js/hero-fx.js` | Hero vivo: cinta de luz animada en canvas (sustituye a la imagen fija cuando hay JS) e isologo con inclinación 3D hacia el cursor. El flotado y el destello del isologo están en CSS. |
| `assets/` | Fondos con las imágenes originales a resolución completa (JPEG; reducirlas producía bandas visibles), versión ligera del hero para móvil (`hero-m.webp`, fallback sin JS), isologo en WebP/PNG y globo estático de respaldo. |

Módulos, en orden: `hero` → `clientes` → `quienes-somos` → `personas` → `que-hacemos` → (línea de texto gigante) → `ia-aplicada` → `casos-de-exito` → `modelos-colaboracion` → `sectores` → `grupo-presencia` → `cierre` (con `formulario`) → `pie`.

## Responsive

- **≥ 1280 px**: réplica del diseño de escritorio (lienzo máximo de 1440 px, centrado).
- **901–1279 px**: el mismo layout con márgenes, columnas y cuerpos de letra más pequeños.
- **≤ 900 px**: réplica del diseño móvil. `.d-only` y `.m-only` controlan qué elementos aparecen solo en escritorio o solo en móvil, tal como en el prototipo.

## Variantes (los «Tweaks» del prototipo)

Se eligen con parámetros de URL:

- `?hero=B`: titular B del hero (por defecto se muestra el A).
- `?cta=experto`: cambia todos los CTA a «Hablar con un experto en IA» y adapta los textos del cierre y del formulario.
- `?pendientes=0`: oculta los marcadores `[PENDIENTE]`, que por defecto se ven.
- `?form=error` o `?form=success`: fuerza un estado del formulario para revisarlo.
- `?fondo=estatico`: el hero usa la imagen fija en lugar de la cinta animada. El isologo sigue animado.

## Versión en un solo archivo

`python3 tools/build-single.py` regenera `landing-ia.html` (con `--fondo-estatico` genera `landing-ia-fondo-estatico.html`, con la imagen fija en el hero) en la raíz del repo, con CSS, JS, imágenes y la tipografía Figtree incluidos. Se abre con doble clic y funciona sin conexión. Vuelve a ejecutarlo después de cada cambio en `site/`.

## Formulario

La validación sigue al prototipo: campos obligatorios, formato de email, rechazo de dominios gratuitos («Introduce tu email corporativo.») y consentimiento. Los campos se llaman como las propiedades de HubSpot (`firstname`, `lastname`, `email`, `company`, `jobtitle`, `km_area_interes`, `km_madurez_ia`).

**Conexión con HubSpot:** el envío va a la Forms API v3 de HubSpot. Para activarlo, rellena `data-hs-portal` (ID del portal) y `data-hs-form` (GUID del formulario) en el `<div id="km-form-diagnostico">` de `index.html`. Con esos atributos vacíos, el formulario funciona en modo demostración: muestra la confirmación sin enviar nada. Además de los campos visibles se envían `km_cta_version`, `km_hero_variant`, los UTM y `gclid` de la URL, la cookie `hubspotutk` y el consentimiento.

## Pendiente antes de publicar

- Todos los `[PENDIENTE]` del documento maestro, que se ven en la página.
- Logotipos de los clientes, las compañías del grupo y las certificaciones, que ahora aparecen como texto.
- El SVG oficial del logotipo (`km-logo-white.png` es un recorte) y la confirmación de Figtree como tipografía web.
- Fotografía real que sustituya a las texturas abstractas de fondo.
- Las URL de Aviso legal, Privacidad y Cookies, que ahora son anclas provisionales.
