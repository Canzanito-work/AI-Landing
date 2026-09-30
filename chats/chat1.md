# Knowmad Mood landing page wireframes

_Started 2026-09-30 10:00 UTC_

---

## User

Wireframe the screens for Diseña una landing page de captación para campañas de Google Ads y LinkedIn Ads de knowmad mood, en versión escritorio (1440 px) y móvil (390 px).

## Material adjunto
1. "Landing IA «Lo que importa.» — Documento maestro" (PDF): contiene la arquitectura (apartado 3) y el copy definitivo (apartados 4 y 5). Es la única fuente de textos: usa el copy real, sin lorem ipsum ni reescrituras. Los [PENDIENTE] deben verse en el diseño como marcadores visibles (por ejemplo, resaltados en amarillo), no ocultarse.
2. Presentación corporativa de knowmad mood: referencia de identidad de marca. Extrae de ella el logotipo, la paleta, la tipografía y los recursos gráficos (por ejemplo, las formas curvas de fondo).
3. Referencias visuales: [capturas o URLs]. Antes de diseñar, resume en una lista breve los patrones que tomas de cada referencia (estructura del hero, ritmo de secciones, tratamiento de tarjetas, uso del color, tipografía, microinteracciones) y explica cómo los adaptas a la marca de knowmad mood. El resultado debe ser reconocible como knowmad mood, no como una copia de las referencias.

## Requisitos de estructura (del documento maestro)
- Orden de secciones del apartado 3: cabecera fija → hero con formulario → problema → cómo abordamos la IA → soluciones → casos de éxito → quiénes somos y cifras → offering → modelos de colaboración → sectores → cierre con formulario → pie.
- Hero: en escritorio, el titular a la izquierda y el formulario en la columna derecha, visible en el primer pantallazo. En móvil, el titular y el CTA arriba, y el formulario justo debajo.
- Un único CTA («Solicitar diagnóstico de IA») con el mismo estilo en todos los botones.
- Sin menú de navegación; logotipo sin enlace.
- Móvil: barra CTA fija a partir del segundo pantallazo.
- Offering, modelos de colaboración y sectores deben ser compactos (por ejemplo, rejillas densas, acordeones o pestañas) para no alargar la página. En el offering, destaca las áreas 06 y 08; en los modelos de colaboración, AI & Automation as a Service y CoE as a Service.
- Casos de éxito como tarjetas con reto, solución, resultado y testimonio, sin enlaces externos.
- Formulario con los campos y el microcopy del apartado 5, incluidos los estados de error y el mensaje de confirmación (4.11).

## Requisitos técnicos que condicionan el diseño
- Rendimiento: sin vídeo ni carrusel automático en el hero, e imágenes ligeras (objetivo LCP < 2,5 s en móvil). Prioriza tipografía, color y formas vectoriales sobre la fotografía.
- La página se construirá después como módulos reutilizables de HubSpot CMS: diseña cada sección como un bloque independiente y coherente, con un sistema de componentes consistente (botones, tarjetas, cifras, iconos).
- Accesibilidad: contraste AA en todos los textos y botones.

## Entregables
1. Resumen de patrones extraídos de las referencias (breve).
2. Diseño completo de escritorio y móvil.
3. Dos variantes del hero: titular A y titular B del apartado 4.1.
4. Estados del formulario: vacío, error y confirmación.
5. Guía mínima de estilos usada: colores con código hex, tipografías y tamaños, espaciados y componentes.

## Assistant

_[tool: list_files]_

_[tool: read_skill_prompt]_

_[tool: run_script]_

_[tool: run_script]_

_[tool: copy_files]_

_[tool: run_script]_

_[tool: run_script]_

_[tool: run_script]_

_[tool: run_script]_

_[tool: run_script]_

_[tool: run_script]_

_[tool: write_file]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: run_script]_

_[tool: save_screenshot]_

_[tool: save_screenshot]_

_[tool: save_screenshot]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: save_screenshot]_

_[tool: save_screenshot]_

_[tool: run_script]_

_[tool: view_image]_

_[tool: image_metadata]_

_[tool: image_metadata]_

_[tool: view_image]_

_[tool: update_todos]_

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: ready_for_verification]_

He dejado todo en **Landing IA.dc.html**. El verificador todavía lo está revisando, así que aún no lo he comprobado en pantalla. El documento tiene estas partes:

- **1a** · Resumen de lo que tomo de cada referencia y cómo lo adapto a knowmad mood.
  - Del panel de hero y los pasos numerados en contorno salen el hero y el método.
  - La píldora con las cifras alrededor pasa a «Quiénes somos», rellena con el degradado del logotipo.
  - El fondo oscuro con halo rojo se usa solo en el cierre, hecho con CSS y sin foto.
- **1b / 1c** · Página completa en escritorio (1440 px) y móvil (390 px), en el orden del apartado 3. Los formularios funcionan: validan los campos y muestran la confirmación.
- **1d–1g** · Hero con el titular A y con el titular B, en escritorio y en móvil.
- **1h** · Estados del formulario: vacío, error y confirmación.
- **1i** · Guía de estilos: colores con hex y contraste, tipografía, espaciados y componentes.

Tienes tres ajustes en el panel de Tweaks: titular A/B, versión del CTA (cambia a «Hablar con un experto en IA» del apartado 4.12 en toda la página) y mostrar u ocultar las notas del wireframe.

Hay algunas decisiones que conviene que valides:

- **Cabecera en móvil:** solo lleva el logotipo, porque el botón no cabía junto a él. El CTA fijo está en la barra inferior, que en el lienzo aparece justo debajo del hero con una nota explicativa.
- **Tipografía:** uso Figtree como sustituta web de la de la presentación. Hay que confirmarla con Marca.
- **Logotipo:** lo he recortado de la presentación, así que tiene poca resolución. Para producción hace falta el SVG oficial.
- **Offering en móvil:** las tarjetas solo muestran el nombre del área, sin la descripción en castellano, para que la sección sea más corta.

