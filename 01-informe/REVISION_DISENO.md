# Revisión de diseño — landing y página de tickets

**Fecha:** 28 de octubre de 2026
**Alcance:** `index.html` y `tickets.html` a 1440, 1024, 768, 390 y 360 px.
**Método:** revisión de las capturas finales (`EVIDENCIA/capturas-despues/`),
inspección del CSS y comprobación de jerarquía, contraste, espaciado, estados y
comportamiento responsive. No es una auditoría de marca ni de copy: eso queda
del lado de KOA.

---

## 1. Sistema visual

| Elemento | Uso actual | Valoración |
|---|---|---|
| Display | Orbitron, mayúsculas, tracking negativo | Muy reconocible y coherente con hockey/evento. Correcto en titulares; no se usa en párrafos. |
| Texto | Manrope variable | Legible a 16–18 px; buen contraste sobre fondo oscuro y claro. |
| Acento | Lima `#ebe266` | Un solo acento principal. Se reserva para CTA, precio y palabras clave; no compite consigo mismo. |
| Secundarios | Naranja `#ff7f19`, rojo `#e20613` | Aparecen poco; funcionan como detalles, no como segundo CTA. |
| Superficies | Negro `#050505`, off-white `#f4f1e8` | Alternancia claro/oscuro clara, sin grises intermedios sucios. |
| Forma | Radios 18–34 px, botones píldora | Consistente entre landing, legales y compra. |
| Textura | Grano sutil y degradados radiales | Da profundidad sin ensuciar la lectura. |

La identidad se mantiene en las tres superficies (landing, compra y legales). El
paso de modal a página propia no rompió el lenguaje visual porque se reutilizan
los mismos tokens, tipografía y componentes `.tm-*`.

---

## 2. Landing (`index.html`)

### Fortalezas

1. **Jerarquía inequívoca.** Fecha → H1 → párrafo → dos CTA → prueba visual. El
   visitante entiende qué es, cuándo y cuánto cuesta en la primera pantalla.
2. **Precio como argumento visual.** `$175` aparece como stat flotante y como
   tarjeta de precio; no hay que buscar la tarifa.
3. **Un CTA primario repetido.** Nav, hero, precio, CTA final y pie llevan al
   mismo destino (`tickets.html`). Ya no hay botones que abren capas distintas.
4. **Ritmo de secciones.** Alterna bloques oscuros y claros; el marquee y las
   tarjetas de estadísticas cortan la monotonía sin romper la lectura.
5. **FAQ y legal visibles.** Acordeón con `aria-expanded`/`inert` y enlaces
   reales, no `href="#"`.
6. **Movimiento contenido.** Parallax y partículas se pausan fuera de pantalla y
   respetan `prefers-reduced-motion`; el cursor nativo elimina la sensación de
   “web experimental” que tenía antes.

### Fricciones detectadas

| # | Observación | Impacto | Recomendación |
|---|---|---|---|
| D-01 | En móvil no hay CTA de compra fijo: el botón del nav se oculta y el usuario depende de volver al hero o bajar hasta la tarjeta de precio. | Medio | Barra inferior compacta con «$175 · Buy Tickets», dismissible, o repetir el CTA tras la sección de experiencia. |
| D-02 | El chip «Performance tracking» aparece en la imagen del hero y otra vez en la fila de badges inferior. | Bajo | Dejar una sola aparición; la fila inferior puede usar otro beneficio (p. ej. «4 days · 3 countries»). |
| D-03 | El botón flotante de WhatsApp puede tapar badges o texto al hacer scroll en 390 px (se ve sobre la fila de pills). | Bajo | Añadir `scroll-padding`/espacio inferior en las secciones finales o reducir el botón mientras se hace scroll. |
| D-04 | El punto final de «TOURNAMENT.» queda separado por el tracking del display. | Muy bajo | Ajustar `letter-spacing` del último carácter o envolver el punto en un `<span>` sin tracking. |
| D-05 | La landing es larga (≈11 pantallas a 390 px). | Bajo | Es contenido de evento; funciona. Solo vigilar el abandono con analítica antes de recortar. |

Ninguna de estas fricciones bloquea la compra ni la lectura. D-01 es la única
que puede afectar conversión de forma medible.

---

## 3. Página de tickets (`tickets.html`)

### Fortalezas

1. **Una sola tarea.** Cabecera mínima (logo + volver), sin menú ni distracciones.
2. **Precio y qué incluye antes del formulario.** El resumen responde «cuánto» y
   «qué obtengo» sin abrir nada.
3. **Dos columnas con jerarquía correcta.** Resumen sticky a la izquierda,
   formulario a la derecha; en escritorio se puede leer el resumen mientras se
   completa el formulario.
4. **Móvil resuelto.** El resumen se apila, aparece «Fill in my details» a ancho
   completo y el CTA de pago queda al final del card, sin barras que tapen
   campos.
5. **Formulario legible.** Etiquetas visibles (no solo placeholders), errores
   inline, `aria-describedby`, foco al primer error y checkbox con estado claro.
6. **Confianza.** «Secure payments powered by Stripe» y enlaces legales junto al
   consentimiento, no escondidos en el pie.

### Fricciones detectadas

| # | Observación | Impacto | Recomendación |
|---|---|---|---|
| T-01 | La cantidad cambia pero el resumen sigue mostrando solo «$175 / per player». No hay total del pedido. | **Alto** | Mostrar un total calculado en cliente (`$175 × N`) junto al precio. Es solo presentación: el servidor debe seguir calculando el importe real. |
| T-02 | En escritorio queda un hueco amplio bajo la nota de WhatsApp cuando el formulario es más alto que el resumen. | Bajo | Añadir un bloque corto de confianza/venue (logo Happi Arena, «4 days», «Cancun») o centrar el resumen verticalmente. |
| T-03 | Con 10 boletos el formulario se vuelve muy largo (10 fieldsets). | Medio | Acordeón por jugador o flujo por pasos; ya está previsto como opcional en el plan. |
| T-04 | El campo de teléfono arranca en `+52`; un comprador de Canadá/EE. UU. debe cambiarlo. | Bajo | Mantener `+52` (sede México) pero hacer más visible el selector de país. |
| T-05 | La página no muestra ninguna imagen del evento; es 100 % tipográfica. | Muy bajo | Es una decisión estética válida (compra enfocada). Si se quiere más contexto, una franja fina con `team-ice` sin competir con el formulario. |

T-01 es la mejora de mayor retorno y no requiere backend: el importe real se
valida igual en servidor.

---

## 4. Responsive

| Ancho | Resultado |
|---:|---|
| 1440 | Dos columnas equilibradas; resumen sticky; sin desbordes. |
| 1024 | Se mantienen dos columnas; el formulario conserva aire. |
| 768 | Una columna; resumen completo antes del formulario; salto visible. |
| 390 | Una columna; CTA a ancho completo; campos y stepper cómodos; sin scroll horizontal. |
| 360 | Igual que 390; no hay recortes de texto ni botones partidos. |

Comprobado con la suite: `scrollWidth === clientWidth` en ambas páginas y en los
cinco anchos, sin errores de consola.

---

## 5. Accesibilidad visual

- Contraste alto en titulares y texto principal; placeholders algo más bajos,
  aceptable porque la etiqueta siempre está visible.
- Foco visible en campos, checkbox y botones.
- Objetivos táctiles ≥ 44–48 px en CTAs y stepper.
- El estado de error no depende solo del color: hay texto y `aria-invalid`.
- Cursor nativo restaurado en todo el sitio; se eliminó `cursor:none` de
  tarjetas, FAQ y pestañas.
- Sin JS, el contenido sigue visible y se ofrece WhatsApp como alternativa.

---

## 6. Prioridad sugerida

1. **T-01** — total del pedido visible al cambiar la cantidad.
2. **D-01** — CTA de compra persistente en móvil.
3. **T-03** — acordeón/pasos si la analítica muestra abandono con varios boletos.
4. **D-02, D-03, D-04, T-02, T-05** — pulido, sin impacto funcional.

Nada de esta lista se implementó en esta entrega: el objetivo de esta ronda era
mover la compra a su propia página, corregir el cursor, retirar el crédito de
Dinametra y dejar el diseño revisado y documentado.

---

## 7. Ajustes ya aplicados en esta ronda

- Compra en página independiente, con resumen sticky y salto al formulario en móvil.
- Checkbox propio con estado marcado claro y foco visible.
- Leyenda del fieldset con fondo opaco para que el borde no la atraviese.
- Cursor nativo en todo el sitio.
- Crédito «Developed by Dinametra» eliminado del pie.
- CTA de WhatsApp y enlaces legales coherentes entre landing y compra.
