# Bodega de Frío — Documentación general

Documento de visión de producto, logística, flujo de información y **referencia para reconstruir** la aplicación a partir de esta beta. Para comandos, lista de servicios por archivo y troubleshooting de herramientas, ver el [README.md](./README.md) principal y [README-USUARIOS-ACCESO-RAPIDO.md](./README-USUARIOS-ACCESO-RAPIDO.md).

---

## 1. Introducción y visión general

### Propósito del sistema

La aplicación es una plataforma web para **operar y supervisar bodegas de frío** en un entorno **multi-cuenta** (varias organizaciones comerciales), **multi-bodega** (varias ubicaciones) y **multi-rol** (cada persona ve y ejecuta solo lo que corresponde a su función).

El foco logístico es el **ciclo de la mercancía refrigerada**: recepción y registro, ubicación en almacén, movimientos entre zonas, preparación para salida, despacho y, cuando aplica, **transformación** (procesamiento de un insumo en producto derivado) con control de **merma** y **sobrantes** reintegrables. Todo se articula con **órdenes de compra**, **órdenes de venta**, **catálogos**, **solicitudes de compra**, **solicitudes de integración** con bodegas externas, **tareas hacia el configurador** y, en muchos casos, **transporte** con trazabilidad hasta el cierre del viaje.

El sistema mantiene **estado operativo en tiempo casi real** por bodega (mapa de ocupación, colas de entrada y salida, órdenes de trabajo abiertas, alertas, tareas de procesamiento visibles para operarios y registro de llamadas al jefe) y un **historial** separado para auditoría, reportes y acumulados (por ejemplo **kilogramos totales de merma de procesamiento** que no vuelven al mapa).

### Público objetivo / usuarios

- **Personal de bodega** que recibe mercancía, ejecuta traslados y atiende la cola de trabajo.
- **Supervisores o jefes** que crean y priorizan órdenes de trabajo internas, asignan alertas y asignan quién inicia cada solicitud de procesamiento en bodega.
- **Custodios** que concentran ingresos, **recepción frente a orden de compra** (con diferencias o líneas adicionales), **cartonaje / recepción frente a orden de venta** cuando la venta llega en transporte a la bodega, y la creación de órdenes de trabajo cuando corresponde junto al jefe.
- **Procesador** (rol distinto del operario): comparte la vista operativa de bodega pero la cola le muestra sobre todo **tareas de procesamiento** asignadas; el avance de estado de la solicitud está acotado a su responsabilidad.
- **Administración** que supervisa mapa (en general **solo lectura** sobre casilleros), actividades, despachos y, junto al jefe, puede asignar operario a una solicitud de procesamiento.
- **Cuentas comerciales** (**cliente** u **operador de cuentas**) que gestionan catálogo, proveedores, compradores, plantas, flota, órdenes de compra y venta, solicitudes de compra, solicitudes de procesamiento, asignación de bodegas a su código de cuenta, reportes operativos y solicitudes formales (integración externa, tareas al configurador).
- **Configurador** que da de alta **clientes**, **usuarios operativos** (catálogo amplio de perfiles), **metadatos de bodegas**, revisa **solicitudes de integración** y puede crear **operadores de cuenta** ligados a un cliente.
- **Transporte** que, tras autenticarse, accede a un **flujo dedicado**: listado de viajes en curso a nivel sistema, detalle por venta, registro de entrega (cantidades por línea, conformidad, incidencia, foto y firma) y cierre que actualiza el estado final de la **orden de venta**.

### Glosario de términos

| Término | Significado |
|--------|-------------|
| **Bodega interna** | Ubicación cuyo inventario y operación viven en el propio sistema (documento de estado en la nube por identificador de bodega). |
| **Bodega externa** | Ubicación cuyo inventario se **consulta** desde otra infraestructura (segundo proyecto de nube / tiempo real); no se escribe el mapa local desde esta app. Útil para reportes y comparación con la operación propia. |
| **Capacidad de bodega** | Número de casilleros del mapa principal; por defecto la app nace con **doce** posiciones y puede alinearse a la capacidad declarada en metadatos de la bodega o a la longitud del inventario externo si aplica. |
| **Casillero / posición** | Celda numerada del mapa con identificadores de caja, temperatura, peso en kg, cliente comercial y **trazas** opcionales: vínculo a orden de compra o venta, identificador de producto de catálogo, **código de almacén** (correlación interna), datos de lote o embalaje, y metadatos de **procesamiento** (título del secundario, unidades estimadas, id de solicitud, devolución de sobrante). |
| **Código de cuenta** | Código alfanumérico del **documento cliente** en la nube; agrupa catálogo, órdenes, solicitudes y vincula **bodegas** asignadas a esa cuenta. La sesión del operador de cuenta y del cliente lo necesita para consultas en vivo. |
| **Zona de entrada** | Cola de **cajas** recién registradas; la interfaz puede mostrar un subconjunto visible de la cola si hay muchas filas. |
| **Zona de bodega** | Mapa principal de almacenamiento (casilleros). |
| **Zona de salida** | Cola de cajas en preparación o listas para despacho; misma idea de visualización parcial si la cola es larga. |
| **Orden de trabajo** | Instrucción de mover o revisar mercancía entre zonas (`hacia mapa`, `hacia salida`, `revisar`); el origen puede ser ingreso, mapa, salida o **devolución desde procesamiento terminado** (secundario a ubicar o sobrante de primario a reintegrar). |
| **Orden de compra** | Pedido a proveedor con líneas (producto, cantidad y/o **peso en kg**), estado de ciclo de vida, destino de bodega opcional, fecha de llegada estipulada y bloque de **recepción** al cerrar en custodia. |
| **Orden de venta** | Pedido hacia un comprador con líneas; puede incluir bodega de origen, bodega destino en fase transporte, bloque de **recepción en bodega** y evolución hasta cierre conforme al viaje. |
| **Solicitud de compra** | Pedido interno tipo listado (prefijo **SOL-**) con líneas en **kg** por producto; sirve para disparar integración a proveedor sin ser aún una OC formal completa. |
| **Solicitud de procesamiento** | Transformación **cuenta → bodega interna** con estados, asignación de operario, kg descontados del mapa al iniciar, merma y sobrante al cerrar, y **órdenes de trabajo** posteriores para ubicar resultado o reintegrar sobrante. |
| **Primario / secundario** | Insumo en mapa frente a producto de catálogo **vinculado** (secundario) con reglas de conversión y % de pérdida esperada para estimar unidades. |
| **Merma / desperdicio** | Kg declarados que **no** reingresan; suman al total histórico de merma de procesamiento para reportes. |
| **Sobrante** | Kg fraccionarios del primario que **sí** se devuelven al mismo producto en el mapa tras cerrar la solicitud. |
| **Viaje de transporte** | Registro bajo una orden de venta con número global (**TV-####**), estado **en curso** o **entregado**, copia de líneas esperadas, líneas entregadas, datos de camión, evidencias y estado resultante de la venta (**cerrado ok** / **cerrado no ok**). |
| **Recepción de OC** | Registro quién cerró, cuándo, líneas recibidas vs pedido, **líneas adicionales** (producto no pedido), si hubo diferencias y notas. |
| **Recepción de venta en bodega** | Cuando la venta viene en transporte hacia la bodega, el custodio registra lo recibido por línea frente a lo esperado. |
| **Solicitud de integración** | Pedido de una cuenta para conectar una **bodega externa** por uno o más medios indicados (scraping, API, CSV plano); estados **activo** o **finalizado**; la atiende el configurador. |
| **Tarea para configurador** | Ticket interno (título, detalle, cuenta) en estado **pendiente** o **resuelta**; lo crea la cuenta y lo ve el configurador. |
| **Alerta** | Ítem en lista global con motivo opcional; puede asignarse a un operario por tipo (temperatura, reporte u otro); hay alertas **por posición** en curso y lista de posiciones resueltas; temperatura por encima de umbral (p. ej. **5 °C**) genera alerta de temperatura. |
| **Llamada / escalamiento al jefe** | Registro en log cuando el operario solicita apoyo; sirve para trazabilidad operativa. |
| **Producto secundario en catálogo** | Puede referenciar un primario por id, reglas de conversión y **merma %** de referencia al crear procesamiento. |
| **Proveedor de pedido integrado** | Concepto de negocio: un proveedor **fijo por cuenta** usado al enviar ciertas solicitudes al webhook; su identificador en base de datos y la URL del automatismo están definidos en **configuración desplegable** (no variables de entorno por defecto). |

---

## 2. Arquitectura y stack tecnológico

### Capas

- **Cliente (navegador)** — Aplicación **Next.js** (App Router), **React 19**, **TypeScript**, **Tailwind CSS**. Orquesta autenticación, suscripciones en tiempo real al documento de estado de la bodega activa, filtros por rol y por cuenta, y llamadas a rutas internas del mismo sitio (pedido proveedor, evidencia).
- **Servidor (Node en Next)** — Rutas **POST** mínimas: reenvío de pedido a automatización externa y subida de archivos de evidencia a **Cloudinary** (subida firmada o preset no firmado según configuración).
- **Nube principal** — **Firebase Authentication** + **Cloud Firestore** + **Storage** según necesidad de adjuntos.
- **Nube secundaria (solo lectura)** — Segunda aplicación Firebase para leer inventario de bodega externa (Firestore y/o **Realtime Database** según URL configurada).

### Comportamiento global

- Tras el login, la app carga **perfil operativo** desde el documento de usuario en la colección de usuarios operativos; opcionalmente existe un documento de perfil **por uid** con reglas más restrictivas en servidor. El **código de cuenta** se obtiene leyendo el documento **cliente** vinculado al `clientId` del usuario.
- El layout raíz envuelve la app con **proveedor de sesión** (sesión mínima para rutas que solo usan ese contexto) y **proveedor de historial por bodega** para compartir lecturas de historial donde haga falta sin repetir suscripciones.
- Los datos por cuenta (productos, órdenes, solicitudes) viven bajo **`clientes/{idCliente}/…`**; el estado físico de bodega interna bajo **`warehouses/{idBodega}/state/…`**.

### Stack (versiones orientativas)

Next.js 16, React 19, TypeScript, Tailwind 4, Firebase JS SDK 11, Cloudinary SDK, Recharts, xlsx, html2canvas, jsPDF, Vitest; calidad: ESLint, chequeo de tipos con `tsconfig` dedicado.

---

## 3. Estructura del proyecto (estructura de directorios)

Referencia superficial para desarrolladores:

- **`app/`** — Rutas de páginas (`/`, `/catalogos`, `/reportes`, …), el **tablero principal** como conjunto de secciones, piezas de interfaz por dominio, **`app/api/`** (rutas POST servidor), **`app/context/`** (sesión reutilizable en páginas independientes), **`app/interfaces/`** (modelos de mapa, órdenes de trabajo, cliente/usuario de configuración).
- **`app/services/`** — Una capa por dominio: órdenes de compra y venta, solicitudes de compra y procesamiento, catálogo, proveedores, compradores, camiones, plantas, asignación de bodegas, viajes de transporte, integración, tareas al configurador, operadores de cuenta, etc.
- **`lib/`** — Cliente Firebase principal, sincronización de estado e historial de bodega (incluye cola de escrituras y utilidades de merge), inventario externo, funciones puras de procesamiento, emparejamiento venta–mapa, normalización de kg y códigos de producto.
- **`app/lib/`** — Cálculos y helpers acoplados a reglas de UI de dominio (recepción OC, pendientes de movimiento de procesamiento, sugerencias de sobrante, badges, etc.).
- **`docs/`** — Esquema resumido de documentos en nube (útil junto a la sección 11 de este archivo).
- **Raíz** — `firebase.json` (reglas Firestore/Storage), `vitest.config`, `package.json`, scripts.

---

## 4. Módulos principales (core de negocio)

### 4.1 Bodegas e inventario

- **Estado en vivo (`…/state/main`)** — Incluye: arreglo de **casilleros**; colas de **entrada**, **salida** y **despachados** (última cola antes de archivar en historial); lista de **órdenes de trabajo** abiertas; **estadísticas** incrementales (conteos de ingresos, salidas y movimientos internos); nombre de bodega; **alertas** libres y **asignaciones**; estructuras para alertas por posición, **tareas de procesamiento** visibles para el operario en mapa, y **log de llamadas al jefe**.
- **Historial (`…/state/history`)** — Ingresos archivados, salidas y movimientos **ya ejecutados**, alertas pasadas a histórico, **despachos definitivos** (con datos de camión si se capturaron) y contador acumulado de **kg de merma de procesamiento**. Las escrituras al historial usan **transacciones** para no perder entradas concurrentes entre pestañas o usuarios.
- **Metadatos de bodega (`warehouses/{id}`)** — Nombre, estado **interna / externa**, capacidad, bandera de deshabilitado, **código de cuenta** cuando la bodega ya fue asignada a una cuenta.
- **Asignación de bodegas** — Flujo de negocio: listar bodegas **sin** código de cuenta y con estado interno o externo según pantalla; al asignar, se escribe el **codeCuenta** en el documento de la bodega. Las cuentas luego consultan solo las bodegas cuyo código coincide con el suyo.
- **Inventario externo** — No persiste en el documento de estado principal; se **lee** al vuelo para pintar el mapa y los reportes de bodega externa.

### 4.2 Catálogos

- **Productos** — Campos comerciales (título, slug, precios, SEO, imágenes), logística (peso, unidad de visualización, tracker), **tipo de producto**, vínculo **primario → secundario** (`includedPrimarioCatalogoId`), **reglas de conversión** (kg de referencia → unidades de secundario), **merma %** de referencia en secundarios, **código de almacén** correlativo (mínimo cuatro dígitos), y `codeCuenta` obligatorio para aislar datos por cuenta.
- **Importación** — Desde archivo de tabla; mapeo de columnas comunes (precio, peso, etc.) y creación masiva.
- **Maestros** — Proveedores, compradores, plantas (nombre, ubicación, capacidad en pallets, rango térmico, operatividad), camiones (placa, marca, modelo, tipo refrigerado/seco/isotérmico, capacidad kg/m³/pallets, disponibilidad). Todos anclados a **codeCuenta** donde aplica.

### 4.3 Órdenes

- **Orden de compra** — Numeración **OC-####** con id numérico; líneas con referencia a producto de catálogo y snapshots de texto/código; estados estándar incluyen **Iniciado**, **En curso**, **Transporte**, **Cerrado(ok)**, **Cerrado(no ok)**; en datos históricos pueden aparecer **Enviada**, **Terminado**, **Recibida(ok)**, **Recibida(con diferencias)**. Soporta destino de bodega interna/externa, fecha de llegada estipulada y bloque de **recepción** con diferencias y líneas adicionales. Puede marcarse envío a bodega y cierre de recepción que alimenta ingreso.
- **Solicitud de compra** — **SOL-####**; líneas en **kg**; estado propio; puede disparar el **webhook** de pedido a proveedor con datos del proveedor resueltos desde la base (nombre, código, id, teléfono).
- **Orden de venta** — Misma familia de estados que la OC en muchos flujos; líneas en **unidades**; comprador; bodega de origen y destino para fases de transporte; **recepción en bodega** cuando aplica; transición a transporte interno y creación de **viajes**.
- **Orden de trabajo** — Generada desde la UI de jefe/custodio o como consecuencia de **procesamiento terminado** (ubicar secundario o devolver sobrante); al ejecutarse por el operario actualiza colas, mapa y estadísticas, y vuelca al historial lo que corresponda.

### 4.4 Procesamiento

- **Creación** — La cuenta elige primario, secundario, cantidad (según unidad de visualización del primario), bodega interna y opcionalmente regla de tres y pérdida esperada tomadas del catálogo.
- **Asignación** — Jefe o administrador asigna **uid** y nombre de operario de bodega que puede pasar de **Iniciado** a **En curso**.
- **En curso** — Descuento de **kg de primario** desde uno o más casilleros compatibles (misma cuenta, mismo producto/código).
- **Pendiente / Terminado** — Declaración de **merma kg** y **sobrante kg**; generación de órdenes de trabajo para completar el ciclo en mapa; acumulado de merma en historial.
- **Cola visual** — Tareas aparecen en la misma idea que “alertas por posición” para que el operario abra el flujo correcto desde el mapa.

### 4.5 Reportes

- **Módulos** — Agregan kg y operaciones desde estado en vivo, historial, órdenes, viajes y, en vistas de bodega externa, filas derivadas del inventario remoto.
- **Hub `/reportes`** — Selector de módulo (proveedor, transporte, bodega interna/externa, comprador) y flujos de detalle con listas y totales.
- **Embebido en tablero** — La pestaña de reportes del tablero reutiliza los mismos módulos o páginas según rol (**cliente / operador de cuentas** ven vista filtrada a su cuenta; administrador ve vista global de bodega seleccionada).

---

## 5. Roles y permisos (autorización)

### Matriz resumida (comportamiento en producto)

| Rol | Idea principal en la app |
|-----|---------------------------|
| **Administrador** | Ve estado de bodega y pestañas de supervisión; el mapa es **solo lectura** (no dispara flujos de casillero). Puede reportes globales y asignación de procesamiento con el jefe. |
| **Custodio** | Ingreso manual y desde OC/venta; pestañas de órdenes de compra y venta para recepción y cartonaje; creación de órdenes de trabajo junto con el flujo de bodega. |
| **Operario** | Mapa operativo, cola de solicitudes, ejecución de órdenes de trabajo y alertas asignadas; alias histórico **operador** tratado como operario salvo **operador de cuentas**. |
| **Procesador** | Misma área operativa base; la experiencia enfatiza **tareas de procesamiento** asignadas. |
| **Jefe** | Interfaz centrada en **órdenes de trabajo** (pestaña forzada); creación de órdenes; gestión de alertas; asignaciones de procesamiento. |
| **Cliente** y **operador de cuentas** | Pestaña de **reportes** con datos filtrados por su cuenta; acceso a rutas de maestros y hub de reportes según implementación; no operan el mapa físico de la bodega interna salvo que el producto evolucione. |
| **Configurador** | Pestaña de **configuración**: clientes, usuarios, bodegas, solicitudes de integración, tareas entrantes. |
| **Transporte** | Pantalla dedicada de viajes; no usa el tablero de pestañas estándar. |

### Datos multi-tenant

- Filtro por **`clientId`** y/o **`codeCuenta`** en consultas de catálogo, órdenes y solicitudes.
- El custodio trabaja con **lista de clientes** cargada para seleccionar comercial al ingresar cajas.

### Seguridad

- Las **reglas Firestore** actuales del repositorio permiten **read/write a cualquier usuario autenticado** en la mayoría de rutas; **no** hay separación fuerte por tenant en servidor. Para reimplementación productiva: reglas por `request.auth.uid`, custom claims o Cloud Functions con validación de pertenencia a `clientId` / bodega.

---

## 6. Lógica de negocio compleja (para desarrolladores)

- **Cola de guardado por bodega** — Encadenar promesas de escritura al documento `main` evita que dos guardados concurrentes lleguen en orden inverso y **revertan** la UI al estado viejo.
- **Merge e historial** — Función que lee el historial actual dentro de una **transacción**, aplica un transformador y escribe; imprescindible cuando varios eventos archivan ingresos o salidas seguidos.
- **Strip de `undefined`** — Antes de persistir, recursión que elimina campos indefinidos porque Firestore los rechaza y el guardado fallaría en silencio.
- **Procesamiento ↔ mapa** — Librerías puras: después de **Terminado**, calcular nuevos slots; localizar casillero para **devolver sobrante** al mismo primario; convertir tarea de cola en parches de inventario.
- **Venta ↔ salida** — Planificar qué casilleros cubren cada línea de venta usando peso de catálogo × cantidad o cantidad pura según datos disponibles.
- **Recepción OC** — Claves estables por línea para comparar pedido vs recibido y soportar cierres con diferencias.
- **Orquestación** — El archivo principal del tablero concentra decenas de responsabilidades (auth, tabs por rol, suscripciones, OC/OV, transporte, procesamiento, alertas); es el principal **punto de acoplamiento** si se rehace desde cero conviene **partirlo en hooks por dominio** desde el día uno.

---

## 7. Integraciones y APIs externas

### Webhook de pedido a proveedor (n8n u otro)

- El navegador llama a **`POST /api/pedido-proveedor`** con cuerpo JSON: identificadores de cliente y cuenta, líneas (id de catálogo, snapshots de código/título, **cantidad como string de kg**), estado y datos del proveedor (nombre, código, id, teléfono) ya **resueltos desde Firestore** en el cliente.
- El servidor valida campos obligatorios y hace **`fetch` servidor** a la URL del webhook para evitar CORS y ocultar detalles si se desea.
- El **proveedor de integración** es un documento fijo por convención de producto (ver configuración en código).

### Evidencia de transporte (Cloudinary)

- **`POST /api/evidencia-transporte`** acepta **FormData** con archivo; tamaño máximo del orden de **10 MB**.
- Prioridad de credenciales: **`CLOUDINARY_URL`** unificada; si no, tres variables; modo **preset no firmado** posible con solo nombre de nube + preset.
- Respuesta con URL segura para guardar en el documento del viaje en Firestore.

### Firebase principal

- Auth, Firestore, Storage; todas las colecciones de negocio descritas en la sección 11.

### Firebase / RTDB externo (Fridem)

- Inicialización condicionada por variables `NEXT_PUBLIC_FRIDEM_*` y **`NEXT_PUBLIC_FRIDEM_DATABASE_URL`**.
- Lectura de filas/slots para armar el mapa de **bodega externa** y reportes.

### WhatsApp

- Constante de contacto de soporte en cabecera (URL `https://wa.me/...`); no integra API oficial de mensajería.

---

## 8. Guía de interfaz de usuario (UI templates)

- **Raíz `/`** — Tablero con cabecera (marca, sesión, selector de bodega, contacto soporte), **pestañas condicionales por rol** y cuerpo que monta la sección activa.
- **Jefe** — Siempre aterriza en la vista de **órdenes de trabajo**; no navega libremente a otras pestañas del mismo modo que otros roles.
- **Transporte** — Vista propia: lista global de viajes en curso, modales de detalle y formulario de cierre de entrega.
- **Rutas dedicadas** — `/catalogos`, `/proveedores`, `/compradores`, `/camiones`, `/plantas`, `/asignarbodegas`, `/reportes` (mismos bloques reutilizables dentro del tablero en muchos casos).
- **Patrones** — Tablas con orden/filtro/paginación en catálogo; modales de detalle para OC/OV; **SweetAlert2** para confirmaciones y errores en parte del flujo.

---

## 9. Pruebas (testing)

- **Vitest**, entorno Node; archivos `*.test.ts`.
- Cobertura configurada sobre **`app/lib/**/*.ts`** y **`lib/**/*.ts`**.
- Comandos: `npm run test`, `test:watch`, `test:coverage`; **`npm run test:all`** encadena lint + `tsc --noEmit` con proyecto dedicado + cobertura.
- **Lint**: `npm run lint` (ESLint con config Next).

---

## 10. Despliegue y variables de entorno

### Ejecución

```bash
npm install
npm run dev   # desarrollo
npm run build && npm run start   # producción
```

### Firebase principal (`NEXT_PUBLIC_*`)

`NEXT_PUBLIC_FIREBASE_API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `STORAGE_BUCKET`, `MESSAGING_SENDER_ID`, `APP_ID`, y opcional `NEXT_PUBLIC_WAREHOUSE_ID` (id de bodega por defecto).

### Fridem (`NEXT_PUBLIC_FRIDEM_*`)

Misma familia de claves que Firebase + `NEXT_PUBLIC_FRIDEM_MEASUREMENT_ID` + **`NEXT_PUBLIC_FRIDEM_DATABASE_URL`** (crítica para RTDB).

### Cloudinary (servidor)

`CLOUDINARY_URL` **o** `CLOUDINARY_CLOUD_NAME` + `API_KEY` + `API_SECRET`; opcionales `CLOUDINARY_UNSIGNED_UPLOAD_PRESET`, `CLOUDINARY_EVIDENCIA_FOLDER`.

### Atajos de login (solo desarrollo / entorno controlado)

Ver [README-USUARIOS-ACCESO-RAPIDO.md](./README-USUARIOS-ACCESO-RAPIDO.md): `NEXT_PUBLIC_ENABLE_LOGIN_ROLE_SHORTCUTS`, `NEXT_PUBLIC_DISABLE_LOGIN_ROLE_SHORTCUTS`, `NEXT_PUBLIC_BODEGA_DEV_LOGINS`, `NEXT_PUBLIC_LOGIN_<ROL>_EMAIL` / `PASSWORD`.

### Integración pedido proveedor

URL del webhook e id del documento de proveedor: **constantes en código** del repositorio (módulo de configuración dedicado en el árbol de la app); externalizar a variables si el despliegue lo exige.

### Despliegue Firebase Hosting / reglas

- `firebase.json` apunta a `firestore.rules`, `firestore.indexes.json`, `storage.rules`.
- Tras cambiar reglas o índices, desplegar con CLI de Firebase según el pipeline del equipo.

### Turbopack / monorepo

Si Next advierte raíz incorrecta por **múltiples** `package-lock.json` en carpetas padre, fijar raíz explícita en `next.config` o limpiar lockfiles duplicados (detalle en README principal).

---

## 11. Modelo de datos en la nube (referencia de reconstrucción)

> Rutas lógicas; los nombres de colección están en **inglés** tal como en la beta.

### Bodega interna — estado operativo

- Documento **`warehouses/{warehouseId}/state/main`**
  - `slots[]` — Casilleros con campos base (posición, ids, nombre, temperatura, cliente, kg) + trazas opcionales (órdenes, catálogo, procesamiento, lote, etc.).
  - `inboundBoxes[]`, `outboundBoxes[]`, `dispatchedBoxes[]` — Cajas en cola.
  - `orders[]` — Órdenes de trabajo abiertas.
  - `stats` — `{ ingresos, salidas, movimientosBodega }`.
  - `warehouseName`, `alerts[]`, `assignedAlerts[]`.
  - `alertasOperario`, `alertasOperarioSolved`, `tareasProcesamientoOperario`, `llamadasJefe`.

- Documento **`warehouses/{warehouseId}/state/history`**
  - `ingresos[]`, `salidas[]`, `movimientosBodega[]`, `alertas[]`, `despachadosHistorial[]`, `mermaProcesamientoKgTotal`.

- Documento **`warehouses/{warehouseId}`** (metadatos)
  - `name`, `status` (`interna` / `externa` o `external`), `capacity`, `codeCuenta`, `disabled`, fechas, etc.

### Por cuenta — `clientes/{clientId}`

- Documento raíz del cliente: al menos **`code`** (código de cuenta), nombre, flags de deshabilitado, auditoría de creación.

- Subcolecciones típicas (cada documento con campos según tipos en la app):
  - **`productos`** — Catálogo.
  - **`providers`**, **`compradores`** — Maestros.
  - **`ordenesCompra`**, **`ordenesVenta`** — Órdenes con líneas y estado.
  - **`ordenesVenta/{ventaId}/viajesTransporte`** — Viajes **TV-####** con líneas, camión, evidencias, cierre.
  - **`solicitudesCompra`** — SOL- con líneas en kg.
  - **`solicitudesProcesamiento`** — Ciclo de procesamiento por cuenta/bodega.
  - **`solicitudesIntegracion`** — Integración bodega externa.
  - **`tareasParaConfigurador`** — Tickets pendientes/resueltos.

### Usuarios y perfiles

- **`usuarios/{uid}`** — Perfil operativo principal usado por el tablero (rol, nombre, `clientId`, código auxiliar si existe).
- **`users/{uid}`** — Perfil legado / reglas más estrictas en plantilla de reglas (solo el dueño escribe).

### Contadores globales

- **`systemCounters/viajesTransporte`** — Reserva atómica del siguiente número **TV-####** al crear un viaje.

---

## 12. Flujos operativos extremo a extremo

### A. Arranque de sesión y contexto

1. Usuario inicia sesión en Firebase Auth.
2. Se lee **`usuarios/{uid}`** → rol, `clientId`, nombre.
3. Si hay `clientId`, se lee **`clientes/{id}`** → `code` (código de cuenta) para todas las consultas de cuenta.
4. Se elige **bodega activa** (lista según rol: administrador/jefe/operario global vs cuenta filtrada por `codeCuenta`).
5. Si la bodega es **interna**, suscripción a **`state/main`** y **`state/history`**; si es **externa**, consultas de inventario remoto y mapa en modo lectura acorde.

### B. Ingreso y traslado

1. **Custodio** registra caja (manual o desde OC / venta en transporte) → entra a **entrada**.
2. **Jefe o custodio** crea **orden de trabajo** hacia mapa o hacia salida (o revisión).
3. **Operario** ejecuta desde la cola → se mueven objetos entre arrays/casilleros, se incrementan stats y se archiva en **historial** lo ejecutado.
4. **Despacho** desde salida → pasa a **despachados** y luego a **historial de despachados** con opción de datos de camión.

### C. Orden de compra

1. **Operador de cuenta** crea OC con líneas y proveedor.
2. Cambios de estado hasta **Transporte**; opcional envío a webhook al crear **solicitud de compra** u operación equivalente.
3. **Custodio** recibe y usa la OC en ingreso; al **cerrar recepción** se guardan líneas recibidas, adicionales y flags de diferencias → estado final y posible alimentación de cajas en entrada.

### D. Orden de venta y transporte

1. Cuenta crea venta y líneas.
2. Estado pasa a **Transporte** hacia bodega destino si aplica.
3. **Custodio** registra **recepción en bodega** (cartonaje).
4. Se crea **viaje** con número global; rol **transporte** registra entregas y evidencias.
5. Al cerrar viaje → estado **Entregado** en el viaje y **Cerrado(ok)** o **Cerrado(no ok)** en la venta según conformidad.

### E. Procesamiento

1. Cuenta crea **solicitud** con bodega interna y productos.
2. Jefe/admin **asigna** operario.
3. Operario/procesador pasa a **En curso** → descuento de kg en **slots**.
4. Cierre con merma/sobrante → estados finales y **órdenes de trabajo** para ubicar secundario o reintegrar sobrante.
5. **Merma** suma a **`mermaProcesamientoKgTotal`** en historial.

### F. Integración y configuración

1. Cuenta crea **solicitud de integración** (tipos scraping/API/CSV).
2. **Configurador** ve cola global o por cliente y marca **finalizado** cuando corresponde.
3. **Tarea para configurador** — flujo análogo para pedidos genéricos de configuración.

### G. Alertas y temperatura

1. Temperatura de casillero **> umbral** (p. ej. 5 °C) genera alerta de temperatura.
2. Órdenes de trabajo **vencidas** por tiempo generan alertas de demora (ventana del orden de minutos en la implementación actual).
3. Operario puede **reportar** incumplimiento con motivo; jefe asigna y resuelve.

---

## 13. Convenciones, numeración e invariantes

- **Prefijos** — `OC-`, `SOL-`, `TV-` + contadores numéricos por colección o global según entidad.
- **Ids de caja** — Patrones con fecha y contador diario (auto-generados en cliente al crear ingresos).
- **Órdenes de trabajo** — Tipos y zonas de origen acotados a un conjunto cerrado; pueden incluir metadatos de **origen de procesamiento** para saber qué solicitud cerró.
- **Firestore** — No persiste `undefined`; hay que limpiar objetos antes de `setDoc`/`updateDoc`.
- **Concurrencia** — Nunca confiar en dos escrituras “full document” simultáneas al mismo `main` sin cola; el historial crítico debe usar **transacción**.
- **Roles string** — Valores en minúsculas fijas; existe compatibilidad con etiqueta **operador** como sinónimo de operario de bodega **salvo** `operadorCuentas`.

---

## 14. Limitaciones, riesgos y notas para una versión productiva

- **Seguridad en reglas** — Cualquier usuario autenticado puede leer/escribir casi todo; riesgo máximo en datos multi-tenant. Prioridad alta al rehacer.
- **Tablero monolítico** — Dificulta pruebas y mantenimiento; conviene dividir por dominio desde el inicio.
- **Datos legacy** — Estados de OC antiguos (`Enviada`, `Terminado`, …) y campos deprecados en catálogo; la nueva implementación debe **normalizar** al leer.
- **Dependencia de n8n** — Si el webhook cambia de contrato, ajustar la ruta API y el flujo externo a la par.
- **Fridem** — Acoplamiento a esquema remoto; si el sistema externo cambia, adaptar capa de lectura.

---

## 15. Checklist para reimplementación desde cero

1. **Autenticación** + documento de usuario + resolución de **codeCuenta** desde cliente.
2. **Modelo Firestore** exacto (sección 11) + **reglas** endurecidas.
3. **Estado main/history** con transacciones de historial y cola de escritura de main.
4. **Roles y rutas** (tablero + páginas dedicadas + transporte aislado).
5. **Servicios por dominio** (OC, SOL, venta, viaje, catálogo, maestros, procesamiento, integración, tareas).
6. **Integraciones**: webhook + Cloudinary con mismos contratos de cuerpo y límites.
7. **Fridem** (opcional): segunda app Firebase + RTDB URL.
8. **UI**: mapa, colas, modales, reportes modulares, importación xlsx.
9. **Pruebas** en funciones puras de inventario/procesamiento/ordenación.
10. **Observabilidad** y backups de Firestore desde consola cloud.

---

## 16. Flujo integral de punta a punta (compra → bodega → venta)

Esta sección cuenta **una historia continua** de cómo la mercancía entra, se mueve y sale, y al final propone **tres escenarios** concretos. Los roles citados son los valores reales de **`role`** (ver §1 y §5).

### 16.1 Hilo conductor (visión de negocio)

Imaginá una **cuenta comercial** (`cliente` o `operadorCuentas`) que ya tiene **proveedores**, **compradores**, **productos en catálogo** (con pesos, códigos de almacén y, si aplica, reglas primario/secundario) y una **bodega interna** asignada a su código de cuenta.

1. **Comprar** — La cuenta genera una **orden de compra** al proveedor (líneas con productos y kg o unidades). La OC avanza por estados (iniciada, en curso, transporte…) hasta que el proveedor envía el camión hacia la bodega.
2. **Entrar a la bodega** — El **`custodio`** recibe físicamente la mercancía. Puede **cerrar la recepción** contra la OC: línea por línea qué kg llegaron, si hubo **diferencias** o incluso **líneas adicionales** no pedidas. Con eso la OC pasa a estado de cierre y el sistema sabe qué había prometido vs qué entró.
3. **Registrar ingreso** — El custodio **alta las cajas** (manual o asistido desde la OC): van a la **zona de entrada** con temperatura, peso, cliente comercial y vínculos al catálogo / OC. Ahí la mercancía “existe” en el sistema pero **aún no ocupa el mapa principal**.
4. **Ubicar en el mapa** — El **`jefe`** (o el custodio según el flujo) crea **órdenes de trabajo** del tipo “de entrada hacia bodega”. El **`operario`** las toma de la **cola**, ejecuta y la caja pasa del arreglo de entrada a un **casillero** numerado del mapa. Los contadores de movimiento suben y el historial guarda el movimiento.
5. **Permanencia y control** — En **mapa**, cada casillero muestra temperatura; si supera el umbral o una orden lleva demasiado tiempo, nacen **alertas**; el **`jefe`** puede asignarlas al operario y cerrarlas con motivo. El **`administrador`** supervisa sin mover casilleros.
6. **Transformar (opcional)** — Si la cuenta creó una **solicitud de procesamiento**, el jefe/admin **asigna** un `operario` o `procesador`. Al ponerse en curso se **descuenta kg del primario** en el mapa; al cerrar se declaran **merma** (sale del inventario lógico y suma al acumulado de reporte) y/o **sobrante** (vuelve al mismo producto). Luego aparecen **órdenes de trabajo** especiales para **dejar el secundario** en un casillero o **reintegrar el sobrante** — otra vez el operario ejecuta desde la cola.
7. **Vender** — La cuenta crea una **orden de venta** a un comprador (líneas en unidades). Cuando el negocio decide despachar, la venta puede pasar a **transporte** hacia una bodega destino o flujo interno según se haya configurado.
8. **Salida física** — Si el stock ya está en mapa, el jefe/custodio genera órdenes de trabajo **hacia la zona de salida**; el operario ejecuta. Desde salida se **despacha** hacia camión: el sistema registra **despacho** con datos de flota si se cargan.
9. **Entrega al comprador** — Si la venta implica **viaje** (`transporte`), se abre un viaje numerado **TV-####**, el transportista registra **cantidades entregadas por línea**, **conformidad**, **foto/firma** o incidencia, y al cerrar la venta queda **Cerrado(ok)** o **Cerrado(no ok)**.

Ese es el **esqueleto**: compra documentada → recepción honesta → ingreso visible → mapa auditado → (opcional) transformación con pérdidas explícitas → venta documentada → salida física → evidencia de entrega.

---

### 16.2 Caso ejemplo A — “Solo compra y stock” (sin venta ni procesamiento)

- **Actores:** `operadorCuentas` (cuenta **MIT**), proveedor **Frigorífico Sur**, `custodio`, `jefe`, `operario`.
- **Hechos:** La cuenta da de alta el producto **“Pechuga congelada”** con peso de referencia. Crea **OC-0042** por **2 000 kg** a Frigorífico Sur y marca fecha de llegada. El proveedor despacha; la OC pasa a **Transporte**.
- En bodega, el custodio recibe **1 980 kg** (faltaron 20 kg). Cierra recepción con **diferencias**; la OC queda **Cerrado(ok)** o **Cerrado(no ok)** según política del negocio.
- Registra **cuatro cajas** en entrada vinculadas a la OC. El jefe crea cuatro órdenes “a bodega”; el operario las ejecuta y ocupa los casilleros **3, 4, 7 y 8**.
- **Resultado:** inventario en vivo refleja **1 980 kg** repartidos; historial tiene ingresos y movimientos; reportes de bodega interna muestran el stock. **Fin del caso** (la venta vendría después con otro documento).

---

### 16.3 Caso ejemplo B — “Venta con viaje hasta el comprador”

- **Actores:** misma cuenta, `custodio` en bodega **Origen**, `transporte`, comprador **Supermercados Norte**.
- **Hechos:** En catálogo ya existe el producto; en mapa hay **800 kg** en dos casilleros. La cuenta crea **venta VE-0015** por **500 unidades** (el sistema calcula kg esperados desde el catálogo cuando hace falta).
- La venta pasa a **Transporte** hacia una bodega intermedia o directo al cliente según se haya definido **destino**. El custodio en origen hace **cartonaje / recepción** si la mercancía entra o sale de esa bodega en tránsito (registro línea a línea).
- Se genera el viaje **TV-0048** con líneas esperadas y se asigna un **camión** de la flota de la cuenta. El usuario `transporte` abre el viaje, carga **foto de pallet**, marca **500 unidades conformes** (o menos + incidencia), firma en pantalla y **cierra entrega**.
- La orden de venta pasa a **Cerrado(ok)** o **Cerrado(no ok)** según conformidad.
- **Resultado:** trazabilidad de venta ↔ viaje ↔ evidencia; el stock en mapa en origen se habrá reducido con las órdenes de trabajo de salida previas o el flujo que use la operación real.

---

### 16.4 Caso ejemplo C — “Procesamiento con merma y sobrante”

- **Actores:** `cliente`, `jefe`, `procesador` (o `operario` según asignación).
- **Hechos:** En catálogo el **primario** es “Carne en bloque” y el **secundario** “Lonchas empaquetadas”, con regla de conversión y % de pérdida de referencia. La cuenta crea **solicitud de procesamiento** por **500 kg** de primario hacia lonchas, en la bodega interna **B-01**.
- El jefe **asigna** al procesador Juan. Juan pasa la solicitud a **En curso**: el sistema **resta 500 kg** de los casilleros donde había ese producto (o el reparto que defina la lógica).
- Al terminar el trabajo físico, Juan declara **merma 15 kg** (pérdida real) y **sobrante 8 kg** de bloque que vuelve al mismo producto. Pasa a **Terminado** / cierre pendiente según el flujo de estados.
- El sistema genera **órdenes de trabajo**: una para **ubicar las lonchas** en un casillero libre (el jefe elige destino) y otra para **reintegrar los 8 kg** de bloque al casillero de origen o compatible.
- **Resultado:** en historial sube **mermaProcesamientoKgTotal +15**; en mapa hay lonchas nuevas y algo de bloque recuperado; reportes de procesamiento cuadran kg.

---

### 16.5 Casos borde y combinaciones (misma app, distintos guiones)

| Situación | Qué cambia en el flujo |
|-----------|-------------------------|
| **Solicitud de compra (SOL)** en lugar de OC formal | La cuenta arma **SOL-####** en kg; al confirmar puede disparar el **webhook** al proveedor; luego igual puede existir OC o ingreso directo según operación real. |
| **Bodega externa** | No se escribe el mapa local; se **lee** inventario remoto para pantallas y reportes; la operación “de verdad” sigue en el otro sistema. |
| **Solo `transporte`** | Nunca ve mapa: solo viajes abiertos y cierre con evidencia. |
| **Llamada al jefe** | El operario escala; queda registro en el estado de bodega para auditoría operativa. |
| **Cliente sin tocar bodega** | `cliente` / `operadorCuentas` vive en **órdenes, catálogo y reportes**; la mano física la tienen custodio/jefe/operario. |

Con los casos A–C y la tabla de §16.5 tenés **guión para demos** y **checklist narrativo** para validar una reimplementación: cada historia debería poder contarse sin saltos lógicos desde el mismo modelo de datos.

---

*Este documento pretende ser autosuficiente para entender la beta; el README técnico del repo sigue siendo la lista compacta de scripts y archivos clave.*
