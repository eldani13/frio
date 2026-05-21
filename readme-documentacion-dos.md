# Bodega de Frío — Documentación general

Documento de visión de producto, logística y flujo de información. Para arranque rápido, stack detallado y referencia de archivos, ver el [README.md](./README.md) principal y [README-USUARIOS-ACCESO-RAPIDO.md](./README-USUARIOS-ACCESO-RAPIDO.md).

---

## 1. Introducción y visión general

### Propósito del sistema

La aplicación es una plataforma web para **operar y supervisar bodegas de frío** en un entorno **multi-cuenta** (varias organizaciones comerciales), **multi-bodega** (varias ubicaciones) y **multi-rol** (cada persona ve y ejecuta solo lo que corresponde a su función).

El foco logístico es el **ciclo de la mercancía refrigerada**: recepción y registro, ubicación en almacén, movimientos entre zonas, preparación para salida, despacho y, cuando aplica, **transformación** (procesamiento de un insumo en producto derivado) con control de **merma** y **sobrantes** reintegrables. Todo se articula con **órdenes de compra**, **órdenes de venta**, **catálogos** y, en muchos casos, **transporte** con trazabilidad hasta el cierre del viaje.

El sistema mantiene **estado operativo en tiempo casi real** por bodega (mapa de ocupación, colas de entrada y salida, órdenes de trabajo y alertas) y un **historial** para auditoría y reportes.

### Público objetivo / usuarios

- **Personal de bodega** que recibe mercancía, ejecuta traslados y atiende la cola de trabajo.
- **Supervisores o jefes** que crean y priorizan órdenes de trabajo internas.
- **Custodios** que concentran ingresos y la relación con órdenes de compra y de venta en recepción.
- **Personal de procesamiento** cuando una cuenta solicita transformar producto en bodega interna.
- **Administración** que supervisa mapa, actividades y despachos sin operar casilleros de forma operativa.
- **Cuentas comerciales** (cliente u operador de cuenta) que gestionan catálogo, compras, ventas, asignación de bodegas y solicitudes hacia configuración o integraciones.
- **Configuradores** que dan de alta clientes, usuarios, bodegas y atienden solicitudes de integración.
- **Transporte** que ejecuta viajes de entrega ligados a ventas, con registro de evidencias.

### Glosario de términos

| Término | Significado |
|--------|-------------|
| **Bodega interna** | Ubicación cuyo inventario y operación viven en el propio sistema (estado en la nube por bodega). |
| **Bodega externa** | Ubicación cuyo inventario se consulta desde otra infraestructura operativa; la pantalla refleja ese stock sin ser la fuente de verdad del mapa local. |
| **Casillero / posición** | Celda del mapa donde se ubica una caja o lote, con identificadores, temperatura, peso y vínculos a órdenes o catálogo. |
| **Zona de entrada** | Cola de cajas recién ingresadas, aún no ubicadas en el mapa principal. |
| **Zona de bodega** | Mapa principal de almacenamiento. |
| **Zona de salida** | Cola de cajas listas para despacho o en proceso de salida. |
| **Orden de trabajo** | Instrucción de mover o revisar mercancía entre zonas; la ejecuta personal de bodega según cola. |
| **Orden de compra** | Pedido a proveedor con líneas y cantidades; puede alimentar el ingreso al cerrarse la recepción en bodega. |
| **Orden de venta** | Pedido de salida hacia un comprador; puede vincularse al ingreso (cartonaje) y al transporte. |
| **Solicitud de compra** | Pedido interno de cuenta que puede disparar notificación automatizada al proveedor. |
| **Solicitud de procesamiento** | Pedido para transformar cantidad de **producto primario** en **producto secundario** en bodega interna, con ciclo de estados y asignación a operarios. |
| **Primario / secundario** | Insumo almacenado frente a resultado del procesamiento. |
| **Merma / desperdicio** | Kilogramos declarados como pérdida al cerrar procesamiento; no reingresan al mapa y se acumulan para reporte. |
| **Sobrante** | Fracción del primario que, tras procesar, se **reintegra** al mismo producto en el mapa. |
| **Viaje de transporte** | Unidad de entrega ligada a una venta, con numeración única, líneas con cantidades esperadas y cierre con evidencia. |
| **Cuenta / código de cuenta** | Identificador de negocio que agrupa catálogo, órdenes y solicitudes de una misma organización. |
| **Alerta** | Aviso por temperatura fuera de umbral, demora en orden o incumplimiento reportado; puede asignarse y cerrarse con motivo. |

---

## 2. Arquitectura y stack tecnológico

- **Aplicación web**: **Next.js** (App Router), **React**, **TypeScript**, estilos con **Tailwind CSS**.
- **Identidad y datos**: **Firebase Authentication**; **Cloud Firestore** como base documental (bodegas, clientes, órdenes, solicitudes, usuarios); **Firebase Storage** donde aplica.
- **Tiempo real**: suscripción a documentos de estado de la bodega activa para que varios operadores vean el mismo mapa y colas al instante.
- **Integraciones**: segundo proyecto Firebase (lectura) para inventario de bodega externa; **rutas API** del propio Next para reenvío a **webhook** (automatización de pedidos a proveedor) y para **subida de evidencias** a **Cloudinary**.
- **Reportes y oficina**: gráficos (**Recharts**), exportes (**html2canvas**, **jsPDF**), importación de catálogo desde tabla (**xlsx**).

Flujo lógico: el navegador resuelve sesión, rol y bodega; las acciones actualizan estado local y se confirman con escrituras en la nube; los reportes combinan estado en vivo, historial y datos por cuenta.

---

## 3. Estructura del proyecto (estructura de directorios)

Referencia superficial para desarrolladores:

- **`app/`** — Rutas de páginas, pantallas del tablero principal, piezas de interfaz por dominio y **rutas API** internas.
- **`app/services/`** — Acceso a Firestore y reglas de persistencia por dominio (órdenes, catálogos, transporte, procesamiento, etc.).
- **`lib/`** — Cliente de nube principal, sincronización de estado de bodega, inventario externo y funciones puras de dominio (procesamiento, emparejamiento venta–mapa).
- **`app/lib/`** — Utilidades de dominio más acopladas a la app (visualización, claves de línea, pendientes de movimiento).
- **`docs/`** — Notas técnicas complementarias (p. ej. esquema de datos).
- Raíz — configuración de Firebase, Vitest, TypeScript y manifiesto npm.

---

## 4. Módulos principales (core de negocio)

### 4.1 Bodegas e inventario

Cada bodega **interna** tiene un **estado en vivo**: mapa de casilleros, colas de entrada y salida, cajas despachadas, órdenes de trabajo abiertas, contadores de movimiento y alertas. Los cambios se replican en tiempo casi real a todos los usuarios conectados.

El **historial** conserva ingresos archivados, salidas y movimientos ejecutados, alertas cerradas y despachos definitivos (incluido dato de vehículo cuando se registra). Separa lo **operativo del momento** de lo **auditable**.

Las bodegas pueden declararse **internas** u **externas** en metadatos: la interna lee y escribe el estado descrito; la externa muestra inventario obtenido de otra base, útil para comparar o reportar sin duplicar el stock local.

### 4.2 Catálogos

Las cuentas mantienen **productos** con datos comerciales y operativos (títulos, códigos de almacén, precios, reglas de conversión para procesamiento, pérdida esperada en transformación, etc.). El catálogo alimenta órdenes de compra y venta, solicitudes de procesamiento y la **correlación** entre casilleros y líneas comerciales. Se admite **importación masiva** desde archivo de tabla.

Existen maestros de **proveedores**, **compradores**, **flota** y **plantas** que intervienen en pedidos, ventas y reportes.

### 4.3 Órdenes

Conviven tres familias:

1. **Órdenes de compra** — Desde creación hasta recepción en bodega; los estados reflejan preparación, envío y cierre al completar el ingreso. Puede activarse **integración** hacia proveedor (pedido automatizado).
2. **Órdenes de venta** — Venta hacia comprador; pueden pasar a **transporte interno**, luego a **cartonaje en custodia** al ingresar en bodega, y a estados de cierre según el resultado del viaje.
3. **Órdenes de trabajo** — Traslados o revisiones entre zonas; las emite quien tiene rol de mando en bodega y las consume la cola del operador.

Las **solicitudes de compra** actúan como capa de pedido que puede enlazarse con el flujo automatizado hacia proveedor.

### 4.4 Procesamiento

Una **solicitud de procesamiento** la crea la cuenta (según permisos), elige primario, secundario, cantidad y bodega interna, y recorre estados (iniciada, en curso, pendiente de cierre, terminada). Un **jefe o administrador** puede asignar el operario de bodega que inicia el trabajo.

Al pasar a **en curso** se **descuenta** peso del primario en el mapa. En el cierre se declaran **merma** (kg que no vuelven al inventario) y opcionalmente **sobrante** a reintegrar. Al **terminar**, el resultado secundario debe **ubicarse** en el mapa mediante una orden de trabajo especializada; el sobrante reingresa por un flujo equivalente. Los kg de merma se acumulan en historial para reportes.

### 4.5 Reportes

Agregan **kilogramos y operaciones** desde estado en vivo, historial, órdenes de compra y venta, viajes de transporte e inventario externo cuando la vista lo requiere. Hay **módulos temáticos** (proveedor, comprador, transporte, bodega interna, bodega externa) para operadores de cuenta y supervisión. Parte del contenido está en un **hub de rutas** dedicado y otra parte embebida en el tablero principal según el rol.

---

## 5. Roles y permisos (autorización)

Los perfiles previstos incluyen: **administrador**, **custodio**, **operario**, **procesador**, **jefe**, **cliente**, **configurador**, **operador de cuentas** y **transporte**. Cada uno recibe pestañas y acciones distintas (ingreso y órdenes comerciales del custodio, cola de solicitudes para bodega, solo órdenes de trabajo para el jefe, mapa en solo lectura para administración, panel aislado para transporte, reportes y catálogos para cuentas, configuración para el configurador).

La **autorización en interfaz** depende del rol y, en datos por cuenta, del identificador de cliente y código de cuenta de la sesión.

**Advertencia de seguridad**: las reglas del servidor de base de datos pueden permitir lectura/escritura amplia a **cualquier usuario autenticado**. Eso facilita desarrollo pero **no** sustituye un modelo de permisos en servidor; en producción conviene endurecer reglas o usar claims y validar pertenencia a cuenta/bodega.

---

## 6. Lógica de negocio compleja (para desarrolladores)

Dónde suele estar la complejidad (referencia de ubicación, sin listar pantallas):

- **Sincronización del estado de bodega** — Fusión al guardar, marcas de tiempo del servidor y suscripciones en vivo en la capa compartida bajo **`lib/`**.
- **Procesamiento e inventario** — Funciones puras que calculan descuentos en casilleros al terminar una solicitud, búsqueda de casillero para devolver sobrante al primario y traducción de tareas de cola a cambios de inventario (**`lib/`** y servicios de solicitud bajo **`app/services/`**).
- **Emparejamiento venta–salida** — Planificación de qué casilleros cubren líneas de una venta al despachar (**`lib/`**, módulo dedicado al cruce por peso y vínculos de orden).
- **Órdenes de compra** — Recepción, claves de línea y ordenación (**`app/lib/`** y servicios de orden).
- **Catálogo y unidades** — Normalización y visualización de cantidades/pesos (**`lib/`** y tipos en la app).
- **Orquestación del tablero** — El componente principal del tablero concentra autenticación, suscripciones, pestañas por rol, handoff entre zonas, alertas y enganches a transporte y procesamiento; es el punto habitual para depurar flujos cruzados (bajo **`app/components/`**).

Los tests unitarios cubren sobre todo funciones puras de esas zonas.

---

## 7. Integraciones y APIs externas

- **Firebase (proyecto principal)** — Autenticación, Firestore y Storage de la aplicación.
- **Firebase / Realtime Database (proyecto externo para bodega externa)** — Lectura de inventario remoto; requiere variables públicas de configuración y URL de base en tiempo real.
- **Webhook de automatización (p. ej. n8n)** — Una **ruta POST** del servidor Next valida el cuerpo y reenvía el pedido al flujo externo; URL y documento de proveedor de integración suelen fijarse en código de configuración del repo.
- **Cloudinary** — Ruta server-side que sube archivos de evidencia de transporte (URL completa de cuenta o nombre de nube + claves; opcional preset sin firmar y carpeta destino).
- **WhatsApp** — Enlace de contacto de soporte en cabecera (no es API bidireccional del producto).

---

## 8. Guía de interfaz de usuario (UI templates)

- **Pantalla inicial** — Tras el login, un **tablero unificado**: cabecera con sesión y selector de bodega cuando aplica, y **pestañas** según rol (mapa/estado, ingreso, órdenes comerciales del custodio, cola de solicitudes, órdenes de trabajo para el jefe, reportes, configuración). La raíz del sitio (`/`) carga este tablero.
- **Rutas dedicadas** — Ejemplos de URL para maestros y hub de reportes: `/catalogos`, `/proveedores`, `/compradores`, `/camiones`, `/plantas`, `/asignarbodegas`, `/reportes`.
- **Patrones de UI** — Tarjetas, tablas, modales de detalle y formularios de alta/edición coherentes en todo el sistema.

---

## 9. Pruebas (testing)

- **Herramienta**: **Vitest**, entorno **Node**.
- **Convención**: archivos `*.test.ts`.
- **Cobertura**: orientada a `app/lib/**/*.ts` y `lib/**/*.ts` (reportes texto y HTML).
- **Comandos**: `npm run test`, `npm run test:watch`, `npm run test:coverage`; existe un script que encadena lint, chequeo de tipos y cobertura.

---

## 10. Despliegue y variables de entorno

### Ejecución local

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`. Producción: `npm run build` y `npm run start`.

### Firebase principal (`NEXT_PUBLIC_*`)

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_WAREHOUSE_ID` — Opcional; bodega por defecto.

### Bodega externa (Fridem)

- `NEXT_PUBLIC_FRIDEM_API_KEY`
- `NEXT_PUBLIC_FRIDEM_AUTH_DOMAIN`
- `NEXT_PUBLIC_FRIDEM_PROJECT_ID`
- `NEXT_PUBLIC_FRIDEM_STORAGE_BUCKET`
- `NEXT_PUBLIC_FRIDEM_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FRIDEM_APP_ID`
- `NEXT_PUBLIC_FRIDEM_MEASUREMENT_ID`
- `NEXT_PUBLIC_FRIDEM_DATABASE_URL`

### Cloudinary (servidor, evidencia de transporte)

- Recomendado: `CLOUDINARY_URL` (`cloudinary://API_KEY:API_SECRET@CLOUD_NAME`)
- Alternativa: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Opcional: `CLOUDINARY_UNSIGNED_UPLOAD_PRESET`, `CLOUDINARY_EVIDENCIA_FOLDER`

### Atajos de login en desarrollo

Ver [README-USUARIOS-ACCESO-RAPIDO.md](./README-USUARIOS-ACCESO-RAPIDO.md).

- `NEXT_PUBLIC_ENABLE_LOGIN_ROLE_SHORTCUTS`
- `NEXT_PUBLIC_DISABLE_LOGIN_ROLE_SHORTCUTS`
- `NEXT_PUBLIC_BODEGA_DEV_LOGINS`
- `NEXT_PUBLIC_LOGIN_<ROL>_EMAIL` / `NEXT_PUBLIC_LOGIN_<ROL>_PASSWORD`

### Integración pedido a proveedor

URL del webhook e identificador del proveedor de integración están definidos en el **módulo de configuración** del repositorio (no como variables de entorno por defecto); cambiar despliegue implica ajustar ese código o externalizarlo según política del equipo.

---

*Detalle de colecciones y rutas de documentos en nube: ver la nota técnica de arquitectura y datos incluida en el repositorio.*
