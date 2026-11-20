# KOA XHOCK — Informe QA (versión compacta para lectura por IA)
Fuente: Casos_de_prueba_KOA_XHOCK.docx (informe completo, 54 pp., con capturas). Esta versión omite imágenes y formato; el contenido es el mismo. Auditoría 2026-10-24 sobre https://koa-hub.com/tickets/. Evento anunciado 29 oct–1 nov (Happi Arena Cancún, USD 175/jugador).
## Estado
PARCIAL. koa-hub.com bloqueado desde el entorno de auditoría (403 proxy). NO se ejecutaron: viewports 1440/1024/768/390/360, consola/red, teclado, axe, cabeceras, enlaces, Lighthouse escritorio. Evidencia = observaciones previas del equipo (17 capturas CAP-001..017, Brave/Windows, viewport no registrado, NO re-ejecutadas) + PSI móvil del equipo (24-oct-2026 16:14:56 CDMX, URL con #faq) + análisis de capturas + lectura WebFetch (resumen automático, no DOM). API PSI, robots.txt, sitemap.xml: client_error (no se sabe si existen).
## Leyendas
Sev: Crítica>Alta>Media>Baja. Estado: Confirmado=respaldado por evidencia (no re-probado hoy) | Posible | No verificable | Pendiente. Prio: P1 antes del 29-oct; P2 2 semanas; P3 backlog.
Origen: previo=observación del equipo; previoRev=previo+reformulado; rev=derivado de capturas; psi=PSI móvil del equipo; lectura=WebFetch.
E1=Brave (Chromium) sobre Windows, según las capturas. Viewport y dispositivo no registrados. E2(PSI)=PageSpeed Insights, modo Celulares (emulación de Lighthouse). URL visible en CAP-015: https://koa-hub.com/tickets/#faq. Ejecutado el 24-oct-2026 a las 16:14:56 (hora de Ciudad de México). E3=móvil no registrado
## Capturas (CAP: qué demuestra → hallazgos)
CAP-001 Aviso del navegador «¿Abrir WhatsApp?»: Al pulsar un CTA de contacto, el navegador abre api.whatsapp.com con el mensaje precargado «Hi KOA, I'd like more information about XHOCK» y pide permiso para abrir la aplicación. → QA-022
CAP-002 Página de envío de WhatsApp con mensaje precargado: Paso intermedio de WhatsApp (botones «Abrir aplicación» y «Continuar en WhatsApp Web») antes de llegar al chat. → QA-022
CAP-003 Sección FAQ y botón «Ask another question»: Encabezado de la sección de preguntas frecuentes y el botón que deriva la consulta a WhatsApp (URL visible: koa-hub.com/tickets/). → QA-022
CAP-004 Widget flotante «Escríbenos a WhatsApp»: Panel en español (nombre, correo, teléfono, «Iniciar chat») sobre un sitio en inglés; fondo blanco y título naranja sobre el tema oscuro. → QA-016
CAP-005 Sección de viaje y hoteles (#viaje): Encabezado «Travel to Cancun with exclusive hotel benefits.» sobre fotografía, con botón «View Recommended Hotels» que deriva a WhatsApp. → QA-012,QA-022
CAP-006 Formulario de registro con datos no válidos: Formulario completado con símbolos y números en nombre, apellido y jugador, edad = 1, teléfono de 8 dígitos y casilla de términos sin enlaces visibles. → QA-001,QA-002,QA-006,QA-008
CAP-007 Pie de página y cursor luminoso: Pie con columnas Contact y Legal; el círculo con halo amarillo que sigue al cursor aparece sobre el texto legal. → QA-009,QA-015,QA-006
CAP-008 Botón «Buy Tickets» desenfocado bajo el cursor: Ampliación del botón principal con el cursor encima: la etiqueta se ve desenfocada y casi ilegible. → QA-009
CAP-009 Galería principal con tarjetas flotantes: Imagen principal con miniaturas inferiores y tarjetas «4 days» y «$175 USD / ticket» que sobresalen del contenedor. → QA-007,QA-014
CAP-010 Transición de sección negra a sección crema (#valor): Salto directo de un fondo casi negro a uno crema; el título «More than a tournament. An…» deja «AN» en una línea final. → QA-010,QA-012
CAP-011 Galería «KOA — More than hockey»: Tarjeta con fotografías de la galería sobre fondo claro; no se aprecia indicación de que sean ampliables. → QA-007
CAP-012 Sección de valor (#valor) seguida de la sección de compra: Cuatro tarjetas (fechas, procedencia, precio $175 USD, arena anfitriona) y, inmediatamente debajo, la sección de boletos con el precio $175 USD otra vez. Captura con zoom reducido del navegador. → QA-011,QA-013,QA-012,QA-010
CAP-013 Administrador de tareas: Brave Browser (25): Brave (25 procesos) con 13.4 % de CPU y 10,510.4 MB de memoria; sistema en 38 % de CPU y 66 % de memoria. Muestra el navegador completo, no la pestaña aislada. → QA-003
CAP-014 Formulario con 1000 boletos: Panel «Your information» (XHOCK International Hockey Tournament · Happi Arena Cancun · Oct 29 – Nov 1) con «Number of tickets» = 1000; el equipo reporta que no termina de cargar por el lag. → QA-003,QA-005,QA-004
CAP-015 PageSpeed Insights móvil: puntuaciones: Informe del 24-oct-2026, 4:14:56 p. m.: Rendimiento con error (sin cifra), Accesibilidad 96, Recomendaciones 100, SEO 100, Navegación con agentes 2/2; CrUX «No hay datos». → QA-017,QA-020,QA-021
CAP-016 PageSpeed Insights móvil: métricas: FCP 4.6 s (rojo); LCP y TBT con «Error! NO_LCP»; CLS 0 (verde). Miniatura de la página en versión móvil con menú de hamburguesa. → QA-017,QA-018
CAP-017 PageSpeed Insights móvil: diagnósticos y filmstrip: Cuatro cuadros en blanco antes del primer contenido y lista de diagnósticos: caché (263 KiB), reprocesamiento forzado, entrega de imágenes (645 KiB), bloqueo de renderizado, JS heredado (12 KiB), terceros. → QA-019,QA-017
CAP-018 Recorte de CAP-005: encabezado de viaje: Recorte sin edición de CAP-005: letras muy juntas y texto amarillo sobre el jersey amarillo de la fotografía. → QA-012 (recorte sin editar)
CAP-019 Recorte de CAP-007: enlaces legales: Recorte sin edición de CAP-007: «FAQ Privacy Policy Terms & Conditions» en una sola línea, sin separadores. → QA-015 (recorte sin editar)
CAP-020 Recorte de CAP-012: tarjetas de valor: Recorte sin edición de CAP-012: espacio vacío en «Players from», fecha partida en cuatro líneas y rótulo «DAYS» con glifo ambiguo. → QA-013,QA-012 (recorte sin editar)
CAP-021 Recorte de CAP-009: tarjetas flotantes: Recorte sin edición de CAP-009: «4 days» y «$175 USD / ticket» cortadas en los bordes izquierdo y derecho de la captura. → QA-014 (recorte sin editar)
## Hallazgos
### QA-001 Validación insuficiente de los campos del formulario de registro
Funcional|Media|Confirmado|P1|previoRev|env:E1|caps:CAP-006
Desc: Los campos de datos personales aceptan valores que no corresponden al dato solicitado. El equipo documentó: Edad (solo se valida un valor mínimo; no se aplica un máximo), Nombre del jugador (acepta muchas letras y números), Nombre de contacto (acepta símbolos; ver QA-008 para el riesgo potencial asociado) y Apellidos (acepta números).
Tabla: First name (contacto) / Acepta símbolos y caracteres especiales / `123123_‹ ›OR&II` más un emoji (transcripción aproximada) ; Last name (apellidos) / Acepta números / `67` ; Player name / Acepta muchas letras y números / `asasasa123123123` ; Age / Solo valida valores mínimos; no valida máximos / `1` (no consta si el formulario lo aceptó o lo rechazó)
Notas: La misma captura muestra un teléfono de 8 dígitos (`+52 65782342`) y un correo de dominio atípico (`hola@6.ha`). No consta si el formulario los aceptó; queda por verificar.
Pasos: 1) Abrir https://koa-hub.com/tickets/ y acceder al formulario de registro desde la sección de boletos. 2) Escribir en First name un texto con números y símbolos; en Last name `67`; en Player name `asasasa123123123`; en Age un valor extremo. 3) Marcar la casilla de términos y pulsar «Continue to Payment». No continuar con el pago real. 4) Observar si se rechazan los valores y qué mensajes aparecen.
Esperado: Nombres y apellidos solo con letras (acentos, espacios, guion y apóstrofo) y longitud máxima; edad dentro de un rango definido por negocio; teléfono y correo válidos; mensaje claro junto a cada campo inválido.
Observado: Según el equipo, los campos de nombre aceptan números y símbolos y la edad solo tiene control de mínimo. CAP-006 muestra esos valores escritos en el formulario.
Impacto: Registros con datos inconsistentes (nombre para el jersey, contacto con el comprador, asignación de equipos) y reprocesos manuales cuando el torneo está próximo.
Reco: Validar tipo, formato y longitud por campo (letras Unicode, `maxlength`, rango de `min`/`max` definido con negocio). | Validar el teléfono con una librería de numeración (p. ej. libphonenumber) según el país seleccionado. | Repetir todas las reglas en el servidor (ver QA-008).
### QA-002 Las validaciones se ejecutan solo al pulsar «Continue to Payment»
Funcional|Media|Confirmado|P2|previo|env:E1|caps:-
Desc: Observación original: «Las validaciones se implementan una vez que se da clic en Continue to Payment». Los campos no avisan al completarse; el usuario descubre todos los errores al final de un formulario largo.
Pasos: 1) Abrir el formulario de registro. 2) Completar campos con valores inválidos sin pulsar el botón final. 3) Comprobar que no aparece ningún mensaje. 4) Pulsar «Continue to Payment» (sin completar el pago) y observar los mensajes.
Esperado: Validación en línea al salir de cada campo, mensaje asociado al campo y foco en el primer error al enviar.
Observado: Validación diferida al botón final (observación previa). CAP-006 muestra el formulario completo, con datos inválidos, sin mensajes visibles. La comprensibilidad de los mensajes finales no se evaluó.
Impacto: Más abandono y reintentos; en móvil el campo con error puede quedar fuera de la pantalla (ver QA-005).
Reco: Validar en `blur` y en envío; marcar `aria-invalid` y asociar el texto de error con `aria-describedby`. | Mover el foco al primer campo inválido y mostrar un resumen de errores.
### QA-003 Cantidad de boletos sin límite superior: la página se congela con valores altos
Funcional|Media|Confirmado|P1|previo|env:E1|caps:CAP-013,CAP-014
Desc: El campo «Number of tickets» acepta cualquier cantidad. El formulario pide datos por cada boleto («Complete the information for each player ticket», con un bloque «PLAYER 1», «PLAYER 2»…). Observación original: con 1000 boletos «ni siquiera carga por el lag»; con 100,000 «mi computadora debe cargar 100,000».
Notas: Causa probable (no verificada): el DOM crece con un bloque de jugador por boleto. No se inspeccionó el código. Sobre CAP-013: muestra Brave con 25 procesos (13.4 % de CPU, 10,510.4 MB de memoria) y el sistema en 38 % / 66 %. La captura es del navegador completo, no de una pestaña aislada; el consumo no puede atribuirse en exclusiva a esta página.
Pasos: 1) Abrir el formulario de registro. 2) En «Number of tickets» escribir 1000 (valor visible en CAP-014). 3) Observar la respuesta de la página y el consumo del equipo. 4) No repetir con 100,000 en un equipo de trabajo: puede bloquearlo.
Esperado: Un máximo por orden definido por negocio, con mensaje claro, y una interfaz fluida sin importar el valor escrito.
Observado: El campo acepta valores arbitrarios; con 1000 el formulario no termina de cargar (observación previa).
Impacto: Bloqueo del navegador del usuario y pérdida de lo capturado (ver QA-004). Si el servidor tampoco limita la cantidad, podrían crearse pedidos absurdos (no verificado).
Reco: Aplicar `max` en el campo y validar en JavaScript y en el servidor con el máximo acordado. | Renderizar los bloques de jugador de forma acotada (o por pasos) en lugar de crear todos a la vez. | Retrasar (`debounce`) la generación de bloques mientras el usuario escribe la cantidad.
### QA-004 Se pierde todo el progreso del registro al recargar o salir de la página
Funcional|Media|Confirmado|P2|previo|env:E1|caps:-
Desc: Observación original: «Si me salgo de la página, recargo o similar, se pierde todo el progreso en el registro; si deseo dejarlo para después puede ser molesto que no se guarde en caché ni nada el registro que ya llevaba».
Pasos: 1) Abrir el formulario y completar varios campos. 2) Recargar la página o cerrar y volver a abrir la URL. 3) Abrir de nuevo el formulario y comprobar si los datos siguen.
Esperado: Conservar un borrador temporal (sin datos de pago) o, como mínimo, avisar antes de abandonar con cambios sin enviar.
Observado: Los datos se pierden por completo (observación previa). No hay captura específica de esta prueba.
Impacto: Repetir un formulario largo, especialmente en móvil y cuando se combina con QA-003; abandono del registro.
Reco: Guardar un borrador en `sessionStorage` o `localStorage` con caducidad corta (excluyendo cualquier dato de pago) y restaurarlo al volver; borrarlo al completar. | Añadir un aviso `beforeunload` cuando haya datos sin enviar.
### QA-005 Registro y pago en móvil basados en un scroll largo dentro de un panel
Funcional|Media|Confirmado|P2|previo|env:Dispositivo móvil y viewport no registrados (observación del equipo). Navegador no registrado.|caps:-
Desc: Observación original: «Falta de comodidad en el pago: al ser un scroll en celular no es tan cómodo o puede llevar a confusiones». CAP-014 muestra que el registro se presenta como un panel superpuesto con botón de cierre («X») que contiene todo el formulario.
Pasos: 1) Abrir https://koa-hub.com/tickets/ en un teléfono (o a 390 y 360 px de ancho). 2) Abrir el formulario de registro y recorrerlo hasta «Continue to Payment». 3) Observar la facilidad para ubicar campos con error y el botón de avance.
Esperado: Flujo por pasos (contacto → jugadores → resumen/pago) con indicador de progreso y botón principal siempre visible.
Observado: Formulario largo con desplazamiento interno, con riesgo de confusión (observación previa). No se midió en móvil en esta auditoría.
Impacto: Más errores y abandono en móvil; no hay analítica disponible para cuantificarlo.
Reco: Dividir el formulario en pasos con barra de progreso. | Fijar el botón principal en la parte inferior y usar `100dvh` / `overscroll-behavior: contain` en el panel. | Probar el flujo completo a 390 y 360 px.
### QA-006 Términos y condiciones y política de privacidad difíciles de consultar
Funcional|Media|Confirmado|P1|previoRev|env:E1|caps:-
Desc: Observación original: «Términos y condiciones muy ocultos; al aceptarlos no deja verlos y se encuentran hasta el final de la página». CAP-006 muestra la casilla «I accept the Terms & Conditions and Privacy Policy» sin enlaces visibles; CAP-007 muestra los enlaces «Privacy Policy» y «Terms & Conditions» en el pie.
Notas: Indicio adicional (posible, no verificado en navegador): la lectura de contenido público reporta que los enlaces «Privacy Policy» y «Terms & Conditions» del pie tienen como destino `#`. Debe comprobarse qué ocurre al pulsarlos.
Pasos: 1) Abrir el formulario y llegar a la casilla de aceptación. 2) Intentar abrir los términos desde el texto de la casilla. 3) Desplazarse al pie de página y pulsar «Privacy Policy» y «Terms & Conditions».
Esperado: Que el texto de la casilla enlace a los documentos completos (pestaña nueva o panel que no cierre el formulario) y que los enlaces del pie lleven a documentos reales.
Observado: Los términos no pueden consultarse desde la casilla; solo se encuentran al final de la página (observación previa).
Impacto: El usuario acepta sin poder leer. Puede tener implicaciones de cumplimiento (aviso de privacidad al recabar datos personales y términos de compra); conviene revisarlo con el área legal.
Reco: Convertir «Terms & Conditions» y «Privacy Policy» en enlaces dentro de la etiqueta de la casilla (`target="_blank" rel="noopener"`). | Publicar los documentos reales con fecha de versión y evitar que abrirlos descarte los datos del formulario (ver QA-004). | Corregir los enlaces del pie (ver QA-015).
### QA-007 Las fotografías de la galería («carrusel») no se pueden abrir para verlas
Funcional|Baja|Confirmado|P3|previo|env:E1|caps:CAP-009,CAP-011
Desc: Observación original: «Se deberían poder seleccionar las imágenes de este tipo carrusel para verlas» y, sobre CAP-011, «lo mismo del carrusel». Las miniaturas (CAP-009) y las fotografías de la tarjeta «KOA — More than hockey» (CAP-011) no ofrecen una vista ampliada.
Pasos: 1) Abrir la sección de galería. 2) Pulsar o tocar una miniatura. 3) Comprobar si se abre una vista ampliada.
Esperado: Vista ampliada (lightbox) con navegación por teclado y gestos, o ausencia de señales de interactividad si son decorativas.
Observado: Las imágenes no pueden seleccionarse para verlas (observación previa).
Impacto: Bajo: las fotografías forman parte del contenido de venta del evento y no se pueden apreciar en detalle, sobre todo en móvil.
Reco: Añadir un lightbox accesible (cierre con `Esc`, flechas, atrapar el foco, texto `alt`). | Si se mantienen decorativas, quitar efectos de hover que sugieran interacción.
### QA-008 Validación y saneamiento en el servidor no verificados (riesgo potencial)
Seguridad|Media(provisional)|Posible|P1|previoRev|env:No aplicable: no se realizó ninguna prueba de seguridad. La evidencia es la captura CAP-006 y la observación del equipo.|caps:-
Desc: El equipo anotó dos observaciones: «Nombre (contacto): riesgo de inyección SQL» y «las validaciones se implementan al pulsar Continue to Payment (se puede interceptar la petición para saltárselo al ser una validación front)». Qué sí está demostrado: el campo First name acepta símbolos y la palabra `OR` (CAP-006), es decir, el cliente no filtra caracteres. Qué NO está demostrado: no se interceptó ninguna petición, no se ejecutó ninguna prueba de inyección y no se conoce el backend (consultas parametrizadas, validación del servidor, procesador de pagos). Por eso se registra como riesgo potencial, no como vulnerabilidad confirmada.
Pasos: 1) No realizar estas pruebas contra producción sin autorización. En un entorno de pruebas o con autorización expresa: 2) Enviar valores límite y caracteres especiales por el formulario y por la API, y comprobar si el servidor los rechaza. 3) Con el equipo de backend, revisar que las consultas sean parametrizadas y que las reglas del cliente se repitan en el servidor. 4) Revisar cómo se muestran esos datos en correos y paneles internos (codificación de salida).
Esperado: El servidor valida tipo, longitud y formato; usa consultas parametrizadas; codifica la salida; no depende de reglas del navegador.
Observado: No determinable con la evidencia disponible.
Impacto: Hipotético: si el servidor no valida, datos corruptos y posibles problemas de inyección o XSS almacenado en herramientas internas. Reclasificar la severidad según el resultado de la revisión.
Reco: Revisar el endpoint de registro: validación en servidor, parametrización, límites de longitud y de cantidad (QA-003). | Añadir limitación de frecuencia (rate limiting) y protección anti-bot al registro. | Registrar los rechazos de validación para detectar abuso.
### QA-009 Efecto de cursor luminoso y desenfoque: degrada la legibilidad y las interacciones
Visual|Media|Confirmado|P2|previoRev|env:E1|caps:CAP-007,CAP-008
Desc: Observación original: «Difuminado y seguimiento de mouse deficientes. Consume recursos, evita la visualización del contenido. Al difuminar, hace que los hover destaquen menos». CAP-007 muestra el círculo con halo amarillo sobre el texto del pie; CAP-008 muestra el botón «Buy Tickets» con el cursor encima: su etiqueta aparece desenfocada y casi ilegible.
Notas: Sin medir: el consumo de recursos es una afirmación previa; no se midió en esta auditoría. Tampoco se verificó si el efecto se desactiva en pantallas táctiles o con `prefers-reduced-motion`.
Pasos: 1) Abrir https://koa-hub.com/tickets/ en escritorio. 2) Mover el cursor sobre el texto y sobre «Buy Tickets». 3) Observar la legibilidad del contenido y del estado hover.
Esperado: El efecto no reduce la legibilidad del contenido ni de los botones, no cubre elementos interactivos y se desactiva en táctil y con movimiento reducido.
Observado: El texto del botón principal se desenfoca bajo el cursor (CAP-008); el halo se superpone al contenido (CAP-007).
Impacto: El botón principal pierde legibilidad justo cuando el usuario va a pulsarlo; los estados hover pierden énfasis.
Reco: Quitar el desenfoque (si proviene de `backdrop-filter`, no verificado) o limitarlo a un punto pequeño sin cubrir texto. | Usar `pointer-events: none`, `transform` y `requestAnimationFrame` para el seguimiento. | Desactivar el efecto en `(hover: none)` y con `prefers-reduced-motion`; medirlo con el panel Rendimiento de DevTools.
### QA-010 Contraste abrupto entre secciones oscuras y claras
Visual|Baja|Confirmado|P3|previoRev|env:E1|caps:CAP-010
Desc: Observación original: «Falta de consistencia visual: pasas de un negro muy negro a un blanco muy blanco; afecta los ojos y más que sorprender espanta». En CAP-010 el fondo pasa de casi negro (≈ `#050505`) a crema (≈ `#F3EFE7`), con una relación de luminancia de 17.8:1 (valores muestreados de la captura). CAP-012 muestra el regreso a negro inmediatamente después de la sección crema.
Pasos: 1) Abrir https://koa-hub.com/tickets/ y desplazarse desde el bloque de experiencia hasta la sección «Value prop». 2) Observar el cambio de fondo en el límite entre secciones.
Esperado: Transiciones entre secciones con tonos intermedios o degradados, o un tema coherente.
Observado: Corte directo de negro a crema, sin transición.
Impacto: Fatiga visual y percepción de falta de cohesión. Sin impacto funcional; es una apreciación de diseño que debe validarse con el equipo de marca.
Reco: Añadir un tramo de transición (degradado de unos 80–160 px) o un tono intermedio entre secciones. | Evaluar un esquema único (oscuro o claro) y respetar `prefers-color-scheme`.
### QA-011 El precio se repite en secciones consecutivas y el flujo parece insistente
Visual|Baja|Confirmado|P3|previo|env:E1|caps:CAP-012
Desc: Observación original: «Pasas de una sección con el precio y la promoción a otra que es directamente el pago, lo que hace que parezca insistente». CAP-012 muestra la tarjeta «03 · $175 USD · per player ticket» en la sección de valor y, justo debajo, la sección «Join the International XHOCK Experience» con «Player tickets · $175 USD».
Pasos: 1) Abrir https://koa-hub.com/tickets/ y desplazarse por las secciones #valor y la de boletos. 2) Observar la repetición del precio y la cercanía de los llamados a la compra.
Esperado: Una progresión clara: propuesta de valor → beneficios → precio y compra, sin repetir el mismo mensaje.
Observado: El precio y el llamado a comprar aparecen dos veces en menos de una pantalla.
Impacto: Percepción de presión de venta; no impide completar la tarea.
Reco: Mantener el precio en la tarjeta de compra y sustituir el de la tarjeta «03» por un beneficio no repetido (solo con información real de KOA). | Separar visualmente la sección de valor de la de compra con un bloque intermedio de contenido existente (p. ej. qué incluye el boleto).
### QA-012 Tipografía de encabezados: letras que se tocan, texto amarillo sobre fondo amarillo y palabras sueltas
Visual|Baja|Confirmado|P3|rev|env:E1|caps:CAP-005,CAP-018
Desc: (a) En CAP-005 el encabezado «Travel to Cancun with exclusive hotel benefits.» usa un espaciado entre letras tan cerrado que varias letras se tocan (ver recorte CAP-018), y parte del texto amarillo se superpone al jersey amarillo de la fotografía, lo que reduce el contraste en esa zona. (b) Los encabezados se parten dejando palabras sueltas: «AN» queda sola en una línea en CAP-010 y en CAP-012. (c) Posible: el glifo «A» de la fuente de títulos no tiene travesaño y a tamaño pequeño puede confundirse con «R»; en CAP-012 el rótulo «DAYS» se lee «DRYS» a la resolución de la captura (ver CAP-020).
Notas: El contraste real no se midió; la valoración es visual. El apartado (c) depende de la resolución y el zoom de la captura y queda como posible.
Pasos: 1) Abrir https://koa-hub.com/tickets/ y desplazarse a la sección #viaje. 2) Observar el encabezado sobre la fotografía. 3) Revisar los títulos de las secciones #valor y de boletos a 1440, 1024 y 768 px.
Esperado: Títulos legibles sobre cualquier fondo (contraste de al menos 3:1 en texto grande), sin letras superpuestas y sin palabras huérfanas.
Observado: Letras que se tocan, texto amarillo sobre amarillo y líneas con una sola palabra (CAP-005, CAP-010, CAP-012).
Impacto: Menor legibilidad de los títulos principales; sin bloqueo funcional.
Reco: Usar `letter-spacing` ≥ 0 en la fuente de títulos y no usarla por debajo de ~18 px. | Oscurecer el degradado bajo el título o colocarlo sobre un panel; medir el contraste con DevTools. | Aplicar `text-wrap: balance` en los títulos.
### QA-013 Composición de las tarjetas de la sección de valor: espacio vacío y fecha partida
Visual|Baja|Posible|P3|rev|env:Captura con zoom reducido del navegador (icono de zoom visible en la barra de direcciones). Viewport no registrado.|caps:CAP-020
Desc: En CAP-012 (ver recorte CAP-020): la tarjeta «02 · Players from» deja un gran espacio vacío entre el rótulo y las banderas CA/US/MX; en la tarjeta «01» el rango «October 29 – November 1» se parte en cuatro líneas dejando el «1» suelto. Al haberse capturado con zoom reducido, el comportamiento al 100 % no está confirmado.
Pasos: 1) Abrir https://koa-hub.com/tickets/ al 100 % de zoom. 2) Revisar la sección #valor a 1440, 1024 y 768 px. 3) Comparar la altura y el contenido de las cuatro tarjetas.
Esperado: Tarjetas equilibradas, con contenido alineado y fechas sin cortes.
Observado: Espacio vacío en la tarjeta 02 y fecha en cuatro líneas (en la captura).
Impacto: Detalle estético; sin impacto funcional.
Reco: Evitar el corte del rango de fechas (`white-space: nowrap` o formato corto). | Alinear el contenido de la tarjeta «Players from» (arriba o centrado) o reducir su altura mínima. | Verificar al 100 % y en 1024/768 px.
### QA-014 Tarjetas flotantes «4 days» y «$175 USD / ticket» cortadas en los bordes
Visual|Baja|Posible|P3|rev|env:Viewport no registrado; la imagen parece un recorte de una captura mayor.|caps:CAP-021
Desc: En CAP-009 (ver recorte CAP-021) la tarjeta «4 days» aparece cortada por el borde izquierdo y «$175 USD / ticket» por el derecho; además la barra de navegación fija aparece cortada a la izquierda. Como el viewport no se registró y la imagen puede ser un recorte, solo se considera posible.
Pasos: 1) Abrir https://koa-hub.com/tickets/ a 768, 390 y 360 px. 2) Comprobar si las tarjetas sobresalen del contenedor o provocan desplazamiento horizontal (`document.documentElement.scrollWidth > clientWidth`).
Esperado: Las tarjetas se mantienen dentro del área visible sin recortes ni desplazamiento horizontal.
Observado: Tarjetas cortadas por el borde de la captura (sin viewport conocido).
Impacto: Información de precio y duración parcialmente oculta en anchos reducidos, si se confirma.
Reco: Limitar el desplazamiento negativo de las tarjetas con `inset`/`max-width` relativo al contenedor. | Aplicar `overflow-x: clip` en el contenedor y repetir la prueba a 360 px.
### QA-015 Enlaces legales del pie sin separación visual
Visual|Baja|Confirmado|P3|rev|env:E1|caps:CAP-019
Desc: En CAP-007 (ver recorte CAP-019) «FAQ», «Privacy Policy» y «Terms & Conditions» se muestran en una sola línea, con el mismo tamaño y peso que un título, sin separadores ni subrayado. No se distingue dónde termina un enlace y empieza otro, ni que son enlaces. Su relación con la dificultad para consultar los términos está en QA-006.
Pasos: 1) Abrir https://koa-hub.com/tickets/ y desplazarse al pie de página. 2) Observar la columna «Legal».
Esperado: Enlaces distinguibles (lista, separación, estados hover/foco) y con un área táctil de al menos 24 × 24 px (WCAG 2.2, criterio 2.5.8).
Observado: Tres enlaces seguidos que se leen como un solo texto.
Impacto: Dificulta localizar los documentos legales y pulsar el enlace correcto en móvil.
Reco: Marcar los enlaces como lista (`<ul>`), con separación y estilo de enlace. | Verificar que cada enlace tenga un destino real (ver QA-006).
### QA-016 Widget «Escríbenos a WhatsApp»: idioma y estilo distintos del resto del sitio
Visual|Baja|Confirmado|P3|rev|env:E1|caps:CAP-004
Desc: CAP-004 muestra el panel flotante en español («Escríbenos a WhatsApp», «Tu nombre», «Tu correo electrónico», «Tu teléfono», «Iniciar chat») en un sitio cuyo contenido está en inglés y con una audiencia declarada de Canadá, Estados Unidos y México (CAP-012). Además usa fondo blanco y título naranja sobre un sitio oscuro con acento amarillo. Existen dos rutas a WhatsApp: este widget (pide nombre, correo y teléfono) y los enlaces directos a `wa.me` (no piden datos; ver QA-022).
Pasos: 1) Abrir https://koa-hub.com/tickets/ y pulsar el botón flotante de WhatsApp. 2) Comparar idioma, colores y tipografía del panel con el resto del sitio.
Esperado: Idioma coherente (o selector de idioma), estilo alineado al sistema visual y un criterio único de captura de datos.
Observado: Panel en español, con estilo propio y un flujo distinto al de los otros botones de WhatsApp.
Impacto: Menor confianza y fricción para visitantes de habla inglesa; datos personales solicitados en un flujo y no en el otro.
Reco: Traducir el widget (o localizarlo según el idioma elegido) y alinear colores y tipografía. | Decidir si el widget debe capturar datos personales y, de hacerlo, enlazar la política de privacidad (QA-006).
### QA-017 First Contentful Paint de 4.6 s y pantalla en blanco inicial en móvil
Rendimiento|Alta|Confirmado|P1|psi|env:E2|caps:CAP-015,CAP-016
Desc: Datos medidos (CAP-015, CAP-016, CAP-017): FCP = 4.6 s, marcado en rojo por Lighthouse (umbral «malo»: más de 3 s). El filmstrip muestra cuatro cuadros en blanco antes del primer contenido (un cuadro crema, luego el hero y la sección FAQ).
Notas: Posibles causas (sin verificar): recursos que bloquean el renderizado (diagnóstico de Lighthouse), carga de fuentes y JavaScript, imágenes pesadas (ahorro estimado de 645 KiB) o una animación/pantalla de carga que oculta el contenido hasta que termina. Matiz: es una medición de laboratorio con red y CPU simuladas, no datos de usuarios reales (CrUX: «No hay datos»). La URL analizada incluía el fragmento `#faq`.
Pasos: 1) Abrir PageSpeed Insights con https://koa-hub.com/tickets/ en la pestaña «Celulares». 2) Leer FCP en la sección Métricas y revisar el filmstrip. 3) Repetir sin el fragmento `#faq` para descartar su efecto.
Esperado: FCP de 1.8 s o menos en móvil.
Observado: FCP de 4.6 s con cuatro cuadros en blanco iniciales.
Impacto: En móvil con red lenta el visitante ve una pantalla vacía más de 4 segundos, con riesgo de abandono antes de ver el contenido del evento.
Reco: Insertar el CSS crítico en línea y cargar el resto de forma diferida; añadir `defer`/`async` a los scripts que bloquean. | Precargar solo las fuentes críticas y usar `font-display: swap`. | Servir imágenes responsivas en AVIF/WebP y evitar pantallas de carga que retrasen el primer pintado. | Repetir la medición tras cada cambio.
### QA-018 Lighthouse no registra LCP ni TBT (error NO_LCP): el rendimiento queda sin puntuación
Rendimiento|Media|Confirmado|P2|psi|env:E2|caps:-
Desc: Dato medido (CAP-016, CAP-015): Largest Contentful Paint y Total Blocking Time muestran «Error! NO_LCP», y la categoría Rendimiento aparece con «!» en lugar de una cifra. Lighthouse no detectó el elemento LCP, por lo que no pudo calcular esas métricas ni la puntuación.
Notas: Causa no determinada. Hipótesis a comprobar (no verificadas): contenido oculto hasta que corre una animación o un script (p. ej. opacidad 0 con efecto de aparición), una pantalla de carga superpuesta, o el efecto de analizar la URL con el fragmento `#faq`.
Pasos: 1) Ejecutar PageSpeed Insights sobre https://koa-hub.com/tickets/ (sin fragmento) en «Celulares». 2) Comprobar si LCP y TBT se calculan. 3) Si persiste, grabar un trace en DevTools (Rendimiento) y revisar qué se pinta y cuándo.
Esperado: LCP medible (2.5 s o menos) y puntuación de rendimiento calculada.
Observado: LCP y TBT con error; sin puntuación de rendimiento.
Impacto: No se pueden vigilar los Core Web Vitals en laboratorio; el error puede indicar que el contenido principal no se pinta de forma normal en la carga inicial (hipótesis).
Reco: Re-medir sin el fragmento y, si se repite el error, auditar animaciones iniciales y overlays. | Asegurar que el elemento principal (título o imagen del hero) se pinta sin depender de JavaScript ni de transiciones de opacidad.
### QA-019 Oportunidades de optimización reportadas por Lighthouse (móvil)
Rendimiento|Media|Confirmado|P2|psi|env:E2|caps:CAP-017
Desc: Datos medidos (CAP-017): Usa tiempos de almacenamiento en caché eficientes — ahorro estimado de 263 KiB; Reprocesamiento forzado; Mejora la entrega de imágenes — ahorro estimado de 645 KiB; Solicitudes de bloqueo de renderización; JavaScript heredado — ahorro estimado de 12 KiB; Terceros (informativo). La captura solo muestra los títulos: no se capturó el detalle de qué recursos concretos intervienen.
Notas: Posibles causas (sin verificar): imágenes sin formatos modernos ni tamaños responsivos (la lectura de contenido público indica imágenes alojadas en Unsplash, dato no verificado); estáticos con caché corta; JavaScript transpilado con polyfills; lecturas de layout que fuerzan reprocesamiento (p. ej. los efectos de QA-009).
Pasos: 1) Abrir el informe de PageSpeed (enlace en la sección 6). 2) Expandir cada diagnóstico para ver los recursos afectados.
Esperado: Sin oportunidades de ahorro relevantes.
Observado: Ahorros estimados de 645 KiB (imágenes), 263 KiB (caché) y 12 KiB (JS), además de bloqueo de renderizado y reprocesamiento forzado.
Impacto: Mayor tiempo de carga y consumo de datos en móvil; contribuye a QA-017.
Reco: Convertir imágenes a AVIF/WebP, definir `srcset`/`sizes`, dimensiones explícitas y `loading="lazy"` bajo el primer pliegue. | Usar `Cache-Control: public, max-age=31536000, immutable` en estáticos con hash en el nombre. | Compilar para navegadores modernos (sin polyfills innecesarios) y separar el JS no crítico. | Agrupar lecturas y escrituras de layout en el JS de efectos visuales.
### QA-020 Accesibilidad móvil 96/100: no se identificaron las auditorías con fallo
Accesibilidad|Baja(provisional)|Posible|P3|rev|env:E2|caps:-
Desc: Dato medido (CAP-015): Accesibilidad = 96. Una puntuación inferior a 100 indica que al menos una auditoría automática falló, pero la captura no muestra cuál. No hay datos de contraste medido, nombres accesibles, etiquetas, orden de foco ni lector de pantalla. Las herramientas automáticas cubren solo una parte de los problemas de accesibilidad, por lo que el 96 no sustituye la evaluación manual.
Pasos: 1) Abrir el informe de PageSpeed (sección 6) y expandir la categoría Accesibilidad. 2) Ejecutar axe DevTools o `@axe-core/playwright` y recorrer la página solo con teclado.
Esperado: Sin auditorías fallidas y navegación completa con teclado, con foco visible.
Observado: Puntuación 96; detalle desconocido.
Impacto: Por determinar.
Reco: Obtener la lista de auditorías con fallo y corregirlas. | Completar las pruebas manuales pendientes (sección 11), incluidos contraste de QA-012 y los enlaces de QA-015.
### QA-021 Metadatos para redes sociales y archivos de rastreo no verificables
SEO|Baja|No verificable|P3|lectura|env:Lectura de contenido público con WebFetch (24-oct-2026). Los archivos robots.txt y sitemap.xml no pudieron leerse (la herramienta devolvió «client_error» sin código HTTP).|caps:-
Desc: La lectura de contenido público identificó un título («XHOCK by KOA — International Hockey Tournament in Cancun»), una meta descripción, `meta viewport` y un único H1. No reportó etiquetas Open Graph/Twitter Card, `canonical` ni atributo `lang`, y no fue posible leer `robots.txt` ni `sitemap.xml`. La herramienta resume el contenido y puede omitir etiquetas, por lo que la ausencia no está confirmada. Lighthouse móvil reporta SEO = 100 (CAP-015), lo que no evalúa las etiquetas Open Graph.
Pasos: 1) Ver el código fuente de la página o ejecutar `curl -sI` y `curl -s` sobre la URL. 2) Comprobar la presencia de `og:title`, `og:description`, `og:image`, `twitter:card`, `rel="canonical"` y `<html lang>`. 3) Solicitar `/robots.txt` y `/sitemap.xml`.
Esperado: Etiquetas para compartir en WhatsApp, Instagram y X con título, descripción e imagen; `lang` correcto; `canonical` definido.
Observado: No determinable.
Impacto: Si faltan, los enlaces compartidos pueden verse sin imagen ni descripción adecuadas (relevante porque el contacto se centra en WhatsApp).
Reco: Verificar y, si faltan, añadir Open Graph (imagen de 1200 × 630 px) y Twitter Card, `canonical` y `lang`. | Publicar `robots.txt` y `sitemap.xml` si aplican.
### QA-022 Consultas repetitivas (FAQ y hoteles) atendidas manualmente por WhatsApp
Buenas prácticas|Baja|Confirmado|P3|previoRev|env:E1|caps:CAP-001,CAP-002,CAP-003
Desc: Observación original: «Falta de automatización de procesos simples. Secciones para preguntas comunes (preguntas comunes significa respuestas comunes/repetidas) y cosas como el hotel (copy-paste seguramente) son procesos automatizables con un chatbot en WhatsApp». Evidencia: los botones «Ask another question» (CAP-003) y «View Recommended Hotels» (CAP-005) derivan al chat. Según la lectura de contenido público, los enlaces apuntan a `wa.me` con un texto precargado en inglés distinto según el botón; esos destinos no se probaron en navegador. En escritorio, el enlace pasa por la página de WhatsApp y un aviso del navegador antes de abrir el chat (CAP-001, CAP-002). El FAQ de la página contiene nueve preguntas estables (equipo, qué llevar, registro con amigos, qué incluye, acompañantes, significado de XHOCK, sede, paquetes de hotel).
Pasos: 1) Abrir https://koa-hub.com/tickets/ y pulsar «Ask another question» y «View Recommended Hotels». 2) Observar el recorrido hasta llegar al chat.
Esperado: Que las preguntas frecuentes y la información de hoteles se resuelvan sin intervención humana, con el chat humano como alternativa.
Observado: Las consultas repetitivas se derivan a una conversación manual (CAP-001 a CAP-005).
Impacto: Carga operativa del equipo y tiempos de respuesta, que aumentan cerca del evento.
Reco: Configurar WhatsApp Business (saludo, respuestas rápidas y menú con las preguntas del FAQ y los hoteles) o un chatbot de flujo por menú. | Publicar en la página la información de hoteles con datos reales y vigentes proporcionados por KOA. | Registrar las preguntas más frecuentes para ajustar el contenido.
## Lighthouse móvil (medido por el equipo, CAP-015/016/017)
Informe: https://pagespeed.web.dev/analysis/https-koa-hub-com-tickets/7769ckm0iu?form_factor=mobile&category=performance&category=accessibility&category=best-practices&category=seo&category=agentic-browsing&hl=es-419
Rendimiento: sin puntuación (error NO_LCP) | Accesibilidad 96 | Buenas prácticas 100 | SEO 100 | Navegación con agentes 2/2 | CrUX: sin datos
FCP 4.6s (rojo) | LCP Error NO_LCP | TBT Error NO_LCP | CLS 0 | Speed Index no capturado
Diagnósticos: caché eficiente (263 KiB) | reprocesamiento forzado | entrega de imágenes (645 KiB) | bloqueo de renderizado | JS heredado (12 KiB) | terceros. Filmstrip: 4 cuadros en blanco antes del primer contenido.
Escritorio: NO ejecutado. Causas posibles (hipótesis): contenido oculto por animación/preloader; imágenes sin formatos modernos (posible host Unsplash, no verificado); caché corta; polyfills; lecturas de layout en efectos; URL con #faq.
## Matriz de pruebas (E=ejecutada P=parcial N=pendiente X=no verificable)
A1 Elementos desalineados, desproporcionados o inconsistentes|P|Solo sobre capturas previas (CAP-005, 007, 009, 010, 012); no en vivo.|QA-010…016
A2 Espacios vacíos excesivos y alturas de sección|P|Solo CAP-012 (zoom reducido).|QA-013
A3 Tipografías, tamaños, pesos y colores|P|Inspección visual de capturas; sin medición de estilos computados.|QA-012, QA-016
A4 Contraste insuficiente (medición)|N|Sin DevTools/axe. Solo valoración visual y luminancia de dos colores muestreados.|QA-010, QA-012
A5 Imágenes estiradas, recortadas, borrosas o rotas|P|No se observan imágenes rotas en las capturas; no se inspeccionó la carga real.|—
A6 Desbordamiento horizontal y superposiciones|P|Posible recorte en CAP-009; efecto de cursor sobre contenido (CAP-007/008).|QA-009, QA-014
B1 Escritorio 1440 px|N|Sin acceso de red a koa-hub.com.|—
B2 Portátil 1024 px|N|Sin acceso de red a koa-hub.com.|—
B3 Tableta 768 px|N|Sin acceso de red a koa-hub.com.|—
B4 Móvil 390 px|N|Sin acceso de red; solo observación previa sobre el scroll del registro.|QA-005
B5 Móvil estrecho 360 px|N|Sin acceso de red a koa-hub.com.|—
B6 Uso del menú y controles en móvil|N|CAP-016 muestra un menú de hamburguesa en la miniatura móvil de PageSpeed; no se probó.|—
C1 Navegación principal y enlaces internos|P|Anclas leídas (#top, #boletos, #uso, #viaje, #faq); no se pulsaron.|—
C2 Botones y CTA de WhatsApp|P|Probados por el equipo (CAP-001/002/003/005); destinos adicionales solo leídos.|QA-022
C3 Formulario de registro y validaciones|P|Probado por el equipo con datos ficticios (CAP-006, CAP-014); sin envío ni pago.|QA-001…006, QA-008
C4 Modales, galería y widgets|P|Registro (CAP-014), widget (CAP-004) y galería (CAP-009/011).|QA-007, QA-016
C5 Enlaces externos y destinos|P|Destinos leídos (WhatsApp, Instagram, Google Maps, sitio del desarrollador); no se pulsaron. Destino de «Buy Tickets» y «Continue to Payment» no determinado.|—
C6 Actualizar la página, URL directa, 404 y redirecciones|N|Sin acceso de red.|—
D1 PageSpeed Insights móvil|E|Ejecutado por el equipo el 24-oct-2026 16:14:56 (CAP-015/016/017).|QA-017…019
D2 PageSpeed Insights escritorio|N|No ejecutado por el equipo; la API devolvió «client_error» desde el entorno.|—
E1 Puntuación automática de accesibilidad (móvil)|P|Solo la cifra (96); sin detalle de auditorías.|QA-020
E2 Estructura de encabezados|P|Un H1 y varios H2/H3 según la lectura de contenido (niveles inferidos, no del DOM).|—
E3 Teclado, foco, nombres accesibles, tamaño de objetivos|N|Requiere navegador en vivo.|—
E4 Lector de pantalla|N|Prueba manual pendiente.|—
F1 Consola, solicitudes fallidas y errores HTTP|N|Sin navegador en vivo.|—
F2 Enlaces rotos|N|Sin acceso de red.|—
F3 HTTPS y cabeceras de seguridad|P|Buenas prácticas móvil = 100 (incluye la comprobación de HTTPS). Cabeceras no inspeccionadas.|—
F4 Título, descripción, viewport y H1|P|Leídos mediante WebFetch (resumen automático); SEO móvil = 100.|QA-021
F5 robots.txt y sitemap.xml|X|La herramienta devolvió «client_error»; no se puede afirmar si existen.|QA-021
F6 Información sensible visible|N|Requiere inspección de fuentes y red.|—
F7 Validación en servidor / inyección|X|No se ejecutaron pruebas; se registra solo como riesgo potencial.|QA-008
## Pruebas pendientes y acciones del programador (todas SIN verificar)
### Act.1 Re-medir Lighthouse (móvil y escritorio) y guardar los informes [prio Alta: El FCP de 4.6 s y el error NO_LCP (QA-017, QA-018) afectan la primera impresión en móvil y no hay datos de escritorio.]
No hecho: No hay ejecución de escritorio, ni Speed Index, ni TBT, ni archivos JSON/HTML. La ejecución móvil del equipo falló en LCP/TBT (NO_LCP) y se hizo sobre la URL con `#faq`. Por qué: La API de PageSpeed y koa-hub.com devolvieron 403/client_error desde el entorno de auditoría; solo se dispone de las capturas del equipo. Hacer: Ejecutar PageSpeed Insights sobre la URL limpia en móvil y escritorio, guardar los enlaces y los informes. Herramienta: PageSpeed Insights (pagespeed.web.dev) y Lighthouse en Chrome DevTools o `npx lighthouse`.
Pasos: 1) Abrir https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fkoa-hub.com%2Ftickets%2F (sin `#faq`) y pulsar Analizar. 2) Revisar las pestañas «Celulares» y «Escritorio»; copiar la URL del informe de cada una. 3) Expandir cada diagnóstico (imágenes, caché, bloqueo de renderizado, reprocesamiento forzado, terceros) y anotar los recursos concretos. 4) Para archivos: DevTools → Lighthouse → modo Navegación → «Save as HTML/JSON»; o ejecutar `npx lighthouse https://koa-hub.com/tickets/ --output=html --output=json --output-path=./lh-movil` y repetir con `--preset=desktop` (`./lh-escritorio`).
Observar: Si LCP y TBT se calculan o el error NO_LCP persiste; puntuación de Rendimiento; FCP, LCP, TBT, CLS y Speed Index en ambos modos; lista de recursos afectados. Documentar: Captura de las puntuaciones y de las métricas de cada modo, tabla de valores, enlaces a los informes y los archivos HTML/JSON. Sustituir los datos de la sección 6 y actualizar QA-017, QA-018 y QA-019.
### Act.2 Pruebas responsivas en 1440, 1024, 768, 390 y 360 px (y un móvil real) [prio Alta: Ninguno de los cinco viewports se probó; el registro en móvil (QA-005) y las tarjetas recortadas (QA-014) dependen de ello.]
No hecho: Comprobación visual y funcional de menú, tarjetas, imágenes, formulario y pie en los cinco anchos, y verificación de desplazamiento horizontal. Por qué: Sin acceso de red desde el entorno a koa-hub.com; las capturas previas no registran viewport. Hacer: Recorrer la página completa en cada ancho y probar el flujo de registro hasta antes del pago. Herramienta: Chrome DevTools (modo dispositivo) y un teléfono real con Brave/Chrome.
Pasos: 1) Abrir DevTools (F12) → modo dispositivo (Ctrl+Shift+M) → «Responsive» y fijar 1440, 1024, 768, 390 y 360 px de ancho; recargar en cada uno. 2) En la consola ejecutar `document.documentElement.scrollWidth > document.documentElement.clientWidth` (true indica desplazamiento horizontal). 3) Probar el menú (en móvil aparece un icono de hamburguesa), el botón de WhatsApp, la galería y abrir el registro; llegar a «Continue to Payment» sin completar el pago. 4) Capturar la página completa: Ctrl+Shift+P → «Capture full size screenshot».
Observar: Tarjetas «4 days» / «$175» dentro o fuera del área visible, fecha partida en cuatro líneas, título con «AN» suelto, menú móvil operable, botón principal visible en el formulario, ausencia de scroll horizontal. Documentar: Una captura por ancho con el hallazgo afectado y el viewport en el pie (CAP-022 en adelante); resultado de la comprobación de `scrollWidth` por ancho. Actualizar QA-005, QA-014, QA-013 y QA-012.
### Act.3 Revisar consola, red y recursos fallidos [prio Media: No hay información de errores ni de peso por recurso; sirve para localizar las causas de QA-019.]
No hecho: Errores y advertencias de consola, solicitudes 4xx/5xx, recursos inexistentes, peso y origen de imágenes, scripts de terceros. Por qué: Requiere un navegador en vivo con acceso a la página. Hacer: Recargar con la caché desactivada y revisar las pestañas Console y Network. Herramienta: Chrome DevTools (Console, Network).
Pasos: 1) Abrir DevTools → Network → marcar «Disable cache» y recargar (Ctrl+Shift+R). 2) Ordenar por «Size» y anotar los 10 recursos más pesados, su tipo y su dominio (en particular imágenes y si provienen de un dominio externo). 3) Filtrar errores con `status-code:404` y revisar la pestaña Console (rojos y amarillos). 4) Repetir con el panel Network en «Slow 4G» y observar cuándo aparece el primer contenido.
Observar: Cualquier error en consola, respuestas 4xx/5xx, imágenes de varios cientos de KiB, dominios de terceros, fuentes y scripts que bloquean el render. Documentar: Captura de Console (con errores o vacía) y de Network ordenada por tamaño; lista de recursos con peso y dominio. Actualizar QA-019.
### Act.4 Comprobar enlaces, anclas, recarga, URL directa, 404 y redirecciones [prio Media: Ninguna navegación se pulsó; solo se leyeron los destinos.]
No hecho: Navegación interna (#boletos, #uso, #viaje, #faq), enlaces externos (WhatsApp, Instagram, Google Maps), recarga con ancla, URL sin barra final, `http://`, `www` y una ruta inexistente. Por qué: Sin acceso de red; la lectura de contenido público no pulsa enlaces. Hacer: Pulsar cada enlace y registrar destino y código HTTP. Herramienta: Navegador y `curl`.
Pasos: 1) Pulsar cada enlace del menú, de los botones y del pie, y anotar a dónde lleva. 2) Con `curl -sIL` comprobar `http://koa-hub.com/tickets/`, `https://www.koa-hub.com/tickets/`, `https://koa-hub.com/tickets` y una ruta inexistente (p. ej. `/tickets/no-existe`), anotando códigos y cadena de redirecciones. 3) Recargar la página estando en `#faq` y comprobar que vuelve al mismo punto. 4) Pulsar «Privacy Policy» y «Terms & Conditions» del pie (ver actividad 9).
Observar: Todos los destinos correctos, redirección a HTTPS en un solo salto, una página 404 con navegación, sin bucles. Documentar: Tabla URL → código → destino final y capturas de cualquier error.
### Act.5 Seguir el flujo «Buy Tickets» → «Continue to Payment» hasta antes del cobro [prio Alta: Es la función esencial del sitio y de ella dependen QA-001, QA-002, QA-003 y QA-008.]
No hecho: No se determinó el destino de «Buy Tickets», «Buy Player Ticket» ni «Continue to Payment», ni qué petición se envía. Por qué: No hay navegador en vivo, y no se deben crear registros ni pagos reales sin autorización. Hacer: Recorrer el flujo con datos ficticios en un entorno de pruebas o en modo de prueba del procesador de pagos, y detenerse antes de cualquier cobro real. Herramienta: Chrome DevTools (Network con «Preserve log») y, si existe, el entorno de pruebas del procesador de pagos.
Pasos: 1) Obtener autorización del responsable de KOA y confirmar si hay un entorno de pruebas o modo de prueba de pagos. Si no lo hay, no pulsar «Continue to Payment» en producción con datos ficticios, porque podría crear un pedido o registro real. 2) Abrir Network, marcar «Preserve log», llenar el formulario con datos ficticios (los de QA-001) y pulsar «Continue to Payment». 3) Anotar la URL, el método y el código de la petición, y si el servidor rechaza los datos o los acepta; no capturar ni guardar datos de tarjeta. 4) Cerrar sin completar el pago.
Observar: Respuesta del servidor ante nombres con números/símbolos, edad extrema y cantidad alta (usar un máximo de 1000 para no bloquear el equipo); destino de la pantalla de pago. Documentar: Captura de Network (sin datos personales reales) con la petición y su respuesta; texto del mensaje de validación. Actualizar QA-001, QA-002, QA-003 y QA-008.
### Act.6 Revisar en el código la validación y el saneamiento del servidor [prio Alta: Determina si QA-008 es un riesgo real; hasta entonces sigue sin verificar.]
No hecho: No se pudo comprobar si el servidor repite las validaciones, usa consultas parametrizadas, limita la cantidad de boletos y codifica la salida. Por qué: No se tuvo acceso al código fuente, al repositorio ni al backend. La ubicación del endpoint es desconocida; no se inventan nombres de archivo. Hacer: Localizar el endpoint que recibe el registro y revisar sus reglas. Herramienta: Repositorio del sitio, proveedor de despliegue y, si existe, el panel de la base de datos o del procesador de pagos (solo lectura).
Pasos: 1) A partir de la petición de red de la actividad 5, identificar la URL del endpoint y buscarla en el repositorio. 2) Revisar si valida tipo, longitud y formato; si usa consultas parametrizadas u ORM; si limita la cantidad de boletos; si aplica límite de frecuencia. 3) Comprobar cómo se muestran esos datos en correos y paneles internos (codificación de salida). 4) No escribir credenciales ni tokens en este documento; si hace falta acceso a un servicio, solicitarlo por el canal interno de KOA.
Observar: Validaciones en servidor equivalentes a las del cliente, consultas parametrizadas, máximo de boletos aplicado, rechazos con código 4xx. Documentar: Descripción de las reglas encontradas (sin secretos) y, si procede, fragmentos de código con su ruta. Cambiar el estado de QA-008 a confirmado o descartado.
### Act.7 Accesibilidad: detalle del 96, contraste, teclado, foco y lector de pantalla [prio Media: El 96 indica auditorías fallidas no identificadas (QA-020) y el formulario es la función principal.]
No hecho: No hay lista de auditorías con fallo, contraste medido, texto alternativo, nombres accesibles, orden de foco, indicadores de foco ni prueba con lector de pantalla. Por qué: Requiere navegador en vivo; el lector de pantalla es una prueba manual. Las herramientas automáticas no garantizan cumplimiento. Hacer: Ejecutar axe y recorrer la página con teclado y con un lector de pantalla. Herramienta: Extensión axe DevTools o pestaña Accessibility de Lighthouse; NVDA (Windows) o TalkBack (Android).
Pasos: 1) En el informe de Lighthouse abrir la categoría Accesibilidad y anotar las auditorías con fallo. 2) Ejecutar axe DevTools y anotar problemas por elemento. 3) Medir el contraste del título amarillo sobre la fotografía (selector de color de DevTools, ratio ≥ 3:1 en texto grande) y del texto gris pequeño. 4) Con solo teclado: Tab/Shift+Tab por toda la página y el formulario; comprobar foco visible, que Esc cierre el modal y que no se quede atrapado. 5) Con NVDA: navegar por encabezados (H) y campos (F) y comprobar que cada campo se anuncia con su etiqueta y que los errores se leen.
Observar: Foco siempre visible y en orden lógico, etiquetas en todos los campos, errores anunciados, contraste suficiente. Documentar: Lista de fallos de axe con selector, captura del foco en los elementos problemáticos y resultado manual de cada punto. Actualizar QA-020 y QA-012.
### Act.8 Medir el efecto del cursor y la cantidad de boletos con datos aislados [prio Media: «Consume recursos» (QA-009) y el bloqueo con muchos boletos (QA-003) son afirmaciones previas medidas solo con el navegador completo (CAP-013).]
No hecho: Consumo de CPU y memoria de la pestaña, con y sin el efecto, y su comportamiento en táctil y con movimiento reducido. Por qué: CAP-013 muestra Brave completo (25 procesos); no se puede atribuir a esta página. Hacer: Grabar el rendimiento de la pestaña con y sin el efecto, y probar el modo táctil. Herramienta: Chrome DevTools (Performance, Rendering) y el Administrador de tareas del navegador (Shift+Esc).
Pasos: 1) Abrir el Administrador de tareas del navegador (Shift+Esc) y anotar CPU y memoria de la pestaña en reposo. 2) Grabar 6 s en Performance moviendo el mouse; anotar FPS y tiempo de scripting. 3) Repetir ocultando localmente el elemento del halo desde Elements (cambio solo local; no modifica producción). 4) En DevTools → Rendering emular `prefers-reduced-motion: reduce` y el modo táctil; comprobar si el halo desaparece. 5) Con 1000 boletos (no más), repetir la medición y anotar el tiempo hasta que el formulario responda.
Observar: Diferencia de CPU/FPS con y sin efecto; si el efecto se desactiva en táctil y con movimiento reducido; tiempo de respuesta con 1000 boletos. Documentar: Capturas del Administrador de tareas y de Performance (con y sin efecto, ambos estados realmente obtenidos). Actualizar QA-009 y QA-003.
### Act.9 Verificar enlaces legales y persistencia del formulario [prio Alta: QA-006 es P1: se aceptan términos que no pueden leerse y los enlaces del pie podrían apuntar a `#`.]
No hecho: No se pulsó ningún enlace legal ni se comprobó qué guarda el navegador al recargar. Por qué: La lectura de contenido público indica `#` como destino, pero no inspecciona el DOM ni el almacenamiento. Hacer: Pulsar los enlaces y revisar el almacenamiento local antes y después de llenar el formulario. Herramienta: Chrome DevTools (Elements, Application).
Pasos: 1) Pulsar «Privacy Policy» y «Terms & Conditions» del pie y, en Elements, anotar el `href` real de cada uno. 2) Intentar abrir los términos desde el texto de la casilla del formulario. 3) En Application → Local Storage / Session Storage anotar las claves antes de llenar el formulario, llenar campos, recargar y comparar.
Observar: Si los enlaces llevan a documentos reales, si la casilla permite consultarlos y si el formulario sobrevive a la recarga. Documentar: Captura de los `href` y del almacenamiento antes/después. Actualizar QA-006, QA-015 y QA-004.
### Act.10 Revisar cabeceras de seguridad, cookies y contenido mixto (solo lectura) [prio Media: Solo se sabe que Buenas prácticas móvil es 100; las cabeceras no se inspeccionaron.]
No hecho: HSTS, CSP, X-Content-Type-Options, Referrer-Policy, frame-ancestors/X-Frame-Options, Permissions-Policy y atributos de cookies. Por qué: Requiere solicitar la página, no posible desde el entorno de auditoría. Hacer: Leer las cabeceras de respuesta; es una consulta normal, no una prueba invasiva. Herramienta: `curl -sI` o DevTools → Network → documento → Headers; pestaña Application → Cookies.
Pasos: 1) Ejecutar `curl -sI https://koa-hub.com/tickets/` y copiar las cabeceras (o abrirlas en Network). 2) Anotar cuáles de las cabeceras listadas están presentes. 3) En Application → Cookies revisar `Secure`, `HttpOnly` y `SameSite` de las cookies existentes. 4) Revisar en Console avisos de contenido mixto.
Observar: Presencia o ausencia de cada cabecera y de los atributos de cookies. Su ausencia no es por sí sola una vulnerabilidad: evaluar con el equipo. Documentar: Tabla cabecera → valor y captura de las cookies. Añadir un hallazgo de seguridad solo si hay evidencia.
### Act.11 Comprobar metadatos SEO, robots.txt y sitemap.xml [prio Baja: SEO móvil ya marca 100; falta confirmar etiquetas para compartir y archivos de rastreo (QA-021).]
No hecho: Open Graph, Twitter Card, canonical, `lang`, robots.txt y sitemap.xml (la lectura devolvió «client_error»). Por qué: La lectura de contenido no es una inspección del DOM. Hacer: Revisar el `<head>` y solicitar los dos archivos. Herramienta: Código fuente de la página (Ctrl+U) y `curl`.
Pasos: 1) Con Ctrl+U buscar `og:`, `twitter:`, `canonical` y `<html lang`. 2) Ejecutar `curl -s -o /dev/null -w "%{http_code}" https://koa-hub.com/robots.txt` y lo mismo para `/sitemap.xml`. 3) Enviarse el enlace por WhatsApp y comprobar la vista previa.
Observar: Etiquetas presentes con imagen y descripción correctas; código 200 o 404 para los archivos. Documentar: Lista de etiquetas encontradas y captura de la vista previa. Actualizar el estado de QA-021.
## Priorizadas (prio: IDs)
P1: QA-001, QA-003, QA-006, QA-008, QA-017
P2: QA-002, QA-004, QA-005, QA-009, QA-018, QA-019
P3: QA-007, QA-010, QA-011, QA-012, QA-013, QA-014, QA-015, QA-016, QA-020, QA-021, QA-022
## Contraste con observaciones originales
Sin contradicciones detectadas (tampoco verificadas en vivo). Matiz: "blanco muy blanco" = crema ≈#F3EFE7 vs negro ≈#050505 (17.8:1). CAP-013 es el navegador completo, no la pestaña.
## Trazabilidad observación original → hallazgo
1 automatización FAQ/hoteles→QA-022; 2 validaciones edad/nombres/apellidos→QA-001,QA-008; 3 validación al pulsar Continue to Payment/interceptable→QA-002,QA-008; 4 T&C ocultos→QA-006; 5 difuminado/mouse→QA-009; 6 y 8 carrusel no seleccionable→QA-007; 7 negro→blanco→QA-010; 9 precio/insistencia→QA-011; 10 scroll pago móvil→QA-005; 11-12 boletos sin límite/lag→QA-003; 13 pérdida de progreso→QA-004; 14 optimización móvil/PSI→QA-017,QA-018,QA-019,QA-020. Sin equivalente previo: QA-012, QA-013, QA-014, QA-015, QA-016, QA-020, QA-021.