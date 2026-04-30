# Bodega de Frio

Sistema web de operacion para bodega fria con enfoque multi-rol, multi-cuenta y multi-bodega.
Construido con Next.js App Router + React + Firebase (Auth, Firestore, Storage), integra flujo de:

- Ingreso de inventario por custodio.
- Gestion de ordenes de compra y ordenes de venta.
- Traslado interno (entrada, bodega, salida) por cola de trabajo.
- Procesamiento (primario/secundario), merma y devolucion de sobrantes.
- Transporte con evidencia fotografica/firma y cierre de viaje.
- Reporteria por modulo (proveedor, comprador, transporte, bodega interna/externa).
- Configuracion operativa (bodegas, cuentas, usuarios, clientes).

## 1) Estado actual del proyecto

Este repositorio ya no es solo un dashboard de 12 posiciones. Hoy incluye:

- Dashboard operativo central por roles: `administrador`, `custodio`, `operario`, `procesador`, `jefe`, `cliente`, `configurador`, `operadorCuentas`, `transporte`.
- Persistencia de estado en vivo por bodega: slots, entradas, salidas, despachos, ordenes, alertas y tareas.
- Integracion con bodega externa (Fridem) por Firestore y Realtime Database.
- Integracion de pedidos a proveedor via webhook (n8n) con ruta API interna.
- Subida de evidencia de transporte a Cloudinary desde endpoint server-side.

## 2) Stack tecnico

- Next.js 16.1.6
- React 19.2.3
- TypeScript
- Tailwind CSS 4
- Firebase SDK 11 (Auth, Firestore, Storage, Realtime)
- Cloudinary SDK
- Recharts (reportes)
- xlsx (importacion de catalogo)
- html2canvas + jsPDF (export/reportes)

## 3) Arquitectura funcional

### 3.1 Punto de entrada

- `app/page.tsx`: renderiza `BodegaDashboard`.
- `app/layout.tsx`: envuelve toda la app con:
  - `AuthProvider` (sesion y contexto de autenticacion)
  - `BodegaHistoryProvider` (historial por bodega)

### 3.2 Nucleo de negocio

- `app/components/BodegaDashboard.tsx`:
  - Orquesta autenticacion, carga de perfil, sesion y role-based UI.
  - Administra estado operativo en memoria (slots, cajas, ordenes, alertas, tareas).
  - Suscribe y persiste estado cloud de bodega.
  - Enruta modulos por tabs segun rol.

### 3.3 Persistencia

- `lib/bodegaCloudState.ts`:
  - Estado principal: `warehouses/{warehouseId}/state/main`
  - Historial: `warehouses/{warehouseId}/state/history`
  - Helpers de subscribe, lectura puntual, guardado merge y acumulado de merma.

### 3.4 Autenticacion y perfiles

- Auth Firebase para login/logout.
- Perfil en Firestore (`users` y/o `usuarios`) con espejado de compatibilidad.
- `app/context/AuthContext.tsx`: expone `session`, `loading`, `clientId`, `codeCuenta`, `role`.

### 3.5 Modo bodega interna/externa

- Bodega interna: usa estado cloud propio del sistema.
- Bodega externa: carga inventario desde Fridem (`lib/fridemClient.ts`, `lib/fridemInventory.ts`).

## 4) Flujo completo de operacion (end-to-end)

## 4.1 Login y bootstrap

1. Usuario abre app y autenticacion resuelve sesion.
2. Se carga perfil (rol, nombre, cuenta, permisos).
3. Se define bodega activa.
4. Si bodega es interna:
   - Subscribe a estado principal + historial.
   - Cambios locales se guardan con merge en Firestore.
5. Si bodega es externa:
   - Se consulta inventario remoto Fridem.
   - Se monta mapa en solo lectura operativa externa.

## 4.2 Ingreso

1. Custodio recibe mercancia.
2. Puede registrar ingreso manual o desde orden:
   - Desde orden de compra (OC).
   - Desde orden de venta en transporte hacia bodega (cartonaje).
3. Caja entra a zona de ingresos con trazabilidad (producto, cliente, kg, metadata).
4. Se crean/ejecutan ordenes para mover a bodega o salida.

## 4.3 Ordenes de trabajo y cola operativa

1. Jefe/custodio crean ordenes (`a_bodega`, `a_salida`, `revisar`).
2. Operario ve solicitudes pendientes en `RequestsQueue`.
3. Al ejecutar, sistema mueve caja entre zonas y actualiza:
   - `slots`
   - `inboundBoxes`
   - `outboundBoxes`
   - `dispatchedBoxes`
4. Se actualiza historial y estadisticas.

## 4.4 Procesamiento

1. Operador de cuenta genera solicitud de procesamiento.
2. Bodega interna recibe cola por `codeCuenta`.
3. Operario/procesador avanza estados (`Pendiente`, `En curso`, `Terminado`).
4. Al iniciar procesamiento:
   - Se descuenta primario desde slots de bodega.
5. Al terminar:
   - Se registra resultado secundario.
   - Se calcula sobrante/merma.
   - Puede crear orden de devolucion de desperdicio/sobrante al primario.

## 4.5 Salidas de venta y transporte

1. Venta pasa a transporte interno (`OrdenVentaService.marcarEnTransporteInterna`).
2. Custodio cartoniza/ingresa contra orden de venta.
3. Se crean viajes de transporte (`TV-####`).
4. Transporte registra entrega con:
   - Cantidades entregadas por linea.
   - Evidencia (foto/firma/incidencia).
5. Se cierra viaje y se deriva estado final de venta (`Cerrado(ok)` o `Cerrado(no ok)`).

## 4.6 Alertas

- Alertas por temperatura, demora u orden reportada.
- Asignacion a operario.
- Resolucion con motivo o ajuste de temperatura.
- Persistencia de estado y trazabilidad en historial.

## 4.7 Reportes

- Modulos de reportes para:
  - Proveedores
  - Compradores
  - Transporte
  - Bodega interna
  - Bodega externa
- Agregados de kg desde inventario en vivo, historial y ordenes/viajes.

## 5) Rutas de la app

- `/` dashboard central (`BodegaDashboard`).
- `/catalogos` gestion de catalogo de productos.
- `/proveedores` gestion de proveedores + modal de ordenes.
- `/compradores` gestion de compradores.
- `/camiones` gestion de flota.
- `/plantas` gestion de plantas.
- `/asignarbodegas` vinculacion de bodegas a cuenta.
- `/reportes` vista consolidada de modulos de reporte.

## 6) API routes internas

- `POST /api/pedido-proveedor`
  - Recibe pedido consolidado desde frontend.
  - Valida proveedor y lineas.
  - Reenvia a webhook n8n.

- `POST /api/evidencia-transporte`
  - Recibe archivo (FormData).
  - Sube imagen a Cloudinary (signed u unsigned preset).
  - Devuelve URL segura para guardar en Firestore.

## 7) Servicios y funciones principales

Esta seccion resume las funciones exportadas clave (la logica de negocio principal).

### 7.1 Ordenes y compras

- `app/services/ordenCompraService.ts`
  - `getAll`
  - `getByProveedor`
  - `listParaRecepcionEnBodega`
  - `listParaRecepcionEnBodegaGlobal`
  - `listTodasOrdenesCompraGlobal`
  - `cerrarRecepcion`
  - `create`
  - `updateEstado`
  - `marcarEnTransporteInterna`

- `app/services/solicitudCompraService.ts`
  - `getAll`
  - `create`

- `app/services/pedidoProveedorResolve.ts`
  - `resolveProveedorPedidoIntegracion`

- `app/services/pedidoProveedorWebhook.ts`
  - `postPedidoProveedorWebhook`

### 7.2 Ventas y transporte

- `app/services/ordenVentaService.ts`
  - `getAllByCodeCuenta`
  - `getById`
  - `subscribe`
  - `create`
  - `updateEstado`
  - `marcarEnTransporteInterna`
  - `listParaCartonajeEnBodegaGlobal`

- `app/services/viajeVentaTransporteService.ts`
  - `kgEsperadoLineaVentaEnViaje`
  - `subscribeParaVenta`
  - `crearDesdeVenta`
  - `listEnCursoGlobal`
  - `subscribeEnCursoGlobal`
  - `registrarEntrega`

### 7.3 Procesamiento

- `app/services/solicitudProcesamientoService.ts`
  - `create`
  - `subscribePorCliente`
  - `subscribeParaBodegaInterna`
  - `obtenerEstadoSolicitud`
  - `obtenerSolicitud`
  - `actualizarEstado`
  - `asignarOperarioBodega`

- `lib/procesamientoInventarioBodega.ts`
  - `tareaColaOperarioToSolicitudInventario`
  - `deductSlotsAfterProcesamientoTerminado`
  - `findSlotPrimarioParaDevolverDesperdicio`

- `app/lib/pendientesMovimientoProcesamiento.ts`
  - `slotTieneProcesadoUbicado`
  - `procesamientoUbicacionCompletaEnMapa`
  - `desperdicioDevueltoEnMapa`
  - `listPendientesMovimientoBodega`

### 7.4 Catalogos operativos

- `app/services/catalogoService.ts`
  - `getById`, `getAll`, `create`, `update`, `delete`, `importMany`

- `app/services/providerService.ts`
  - `getAll`, `getById`, `create`, `update`, `delete`

- `app/services/compradorService.ts`
  - `getAll`, `create`, `update`, `delete`

- `app/services/camionService.ts` (`TruckService`)
  - `getAll`, `create`, `update`, `delete`

- `app/services/plantaService.ts`
  - `getAll`, `create`, `update`, `delete`

- `app/services/asignarbodegaService.ts`
  - `getPendingBodegas`
  - `assignCodeCuenta`
  - `getWarehousesByCode`

### 7.5 Configuracion de cuentas y tareas

- `app/services/operadorCuentaService.ts`
  - `normalizeOperadorCodeInput`
  - `suggestOperadorCodeFromName`
  - `listOperadoresCuenta`
  - `createOperadorCuenta`

- `app/services/tareaCuentaService.ts`
  - `crear`
  - `subscribePendientes`
  - `marcarResuelta`

- `app/services/solicitudIntegracionService.ts`
  - `crear`
  - `subscribePorCliente`
  - `subscribePendientesConfigurador`
  - `ejecutarSolicitudConfigurador`

### 7.6 Estado de bodega e inventario

- `lib/bodegaCloudState.ts`
  - `mergeHistoryState`
  - `recordMermaProcesamientoKg`
  - `ensureWarehouseState`
  - `fetchWarehouseStateOnce`
  - `fetchHistoryStateOnce`
  - `subscribeWarehouseState`
  - `saveWarehouseState`
  - `ensureHistoryState`
  - `subscribeHistoryState`
  - `saveHistoryState` (compatibilidad)

- `lib/bodegaInternalInventoryRows.ts`
  - `buildIngresoRecordByAutoId`
  - `filasInventarioInternoFromSlots`
  - `totalKgInternoDesdeSlots`

- `lib/ventaSalidaBodegaMatch.ts`
  - `slotVinculadoOrdenVenta`
  - `slotCubreLineaVenta`
  - `planSalidaVentaDesdeMapa`
  - `candidatosSlotsSalidaVenta`

### 7.7 Integracion externa Fridem

- `lib/fridemClient.ts`
  - `ensureFridemAuth`

- `lib/fridemInventory.ts`
  - `fetchFridemSlots`
  - `fetchFridemInventoryRows`

## 8) Modelo de datos (resumen)

### 8.1 Estructura principal en Firestore

- `warehouses/{warehouseId}` metadatos de bodega.
- `warehouses/{warehouseId}/state/main` estado operativo vivo.
- `warehouses/{warehouseId}/state/history` historico y merma acumulada.
- `clientes/{clientId}/...` subcolecciones de negocio por cuenta:
  - `productos`
  - `providers`
  - `compradores`
  - `ordenesCompra`
  - `ordenesVenta`
  - `solicitudesCompra`
  - `solicitudesProcesamiento`
  - `solicitudesIntegracion`
  - `tareasParaConfigurador`

### 8.2 Colecciones transversales

- `usuarios` (catalogo de usuarios operativos).
- `users` (perfil legado/auth).
- `systemCounters/viajesTransporte` (contador global TV-####).

## 9) Variables de entorno

### 9.1 Firebase principal

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_WAREHOUSE_ID` (opcional; default `default`)

### 9.2 Fridem (bodega externa)

- `NEXT_PUBLIC_FRIDEM_API_KEY`
- `NEXT_PUBLIC_FRIDEM_AUTH_DOMAIN`
- `NEXT_PUBLIC_FRIDEM_PROJECT_ID`
- `NEXT_PUBLIC_FRIDEM_STORAGE_BUCKET`
- `NEXT_PUBLIC_FRIDEM_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FRIDEM_APP_ID`
- `NEXT_PUBLIC_FRIDEM_MEASUREMENT_ID`
- `NEXT_PUBLIC_FRIDEM_DATABASE_URL`

### 9.3 Cloudinary (evidencia transporte)

Opciones:

- Opcion A (recomendada):
  - `CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME`

- Opcion B:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`

- Opcional unsigned preset:
  - `CLOUDINARY_UNSIGNED_UPLOAD_PRESET`

- Opcional carpeta:
  - `CLOUDINARY_EVIDENCIA_FOLDER`

### 9.4 Integracion pedidos proveedor

- Definidas en `app/config/pedidoProveedorIntegracion.ts`:
  - `PEDIDO_PROVEEDOR_DOCUMENT_ID`
  - `PEDIDO_PROVEEDOR_WEBHOOK_URL`

### 9.5 Atajos de login dev

Lista de correos y claves por defecto: [README-USUARIOS-ACCESO-RAPIDO.md](./README-USUARIOS-ACCESO-RAPIDO.md).

- `NEXT_PUBLIC_ENABLE_LOGIN_ROLE_SHORTCUTS`
- `NEXT_PUBLIC_BODEGA_DEV_LOGINS`
- `NEXT_PUBLIC_LOGIN_<ROL>_EMAIL`
- `NEXT_PUBLIC_LOGIN_<ROL>_PASSWORD`

## 10) Scripts

- `npm run dev`: desarrollo con Next.
- `npm run build`: build produccion.
- `npm run start`: servidor de produccion.
- `npm run lint`: linting.

Utilidad adicional:

- `scripts/unify-fonts.mjs`: normaliza clases de fuente/tamano en `app/*`.

## 11) Como ejecutar

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## 12) Troubleshooting rapido

### 12.1 Mensaje de Console Ninja: `failed to connect to host`

No es error de Next ni de tu app; es de la extension de logging. Puede ignorarse mientras la app compile y sirva correctamente.

### 12.2 Warning de Next sobre root por multiples lockfiles

Si ves que Next toma como root una carpeta padre por detectar otro `package-lock.json`, define `turbopack.root` en `next.config.ts` apuntando al root de este proyecto o elimina lockfiles duplicados fuera del repo.

### 12.3 Bodega externa vacia

Validar variables `NEXT_PUBLIC_FRIDEM_*` y `NEXT_PUBLIC_FRIDEM_DATABASE_URL`, ademas de permisos de lectura en la base externa.

### 12.4 Error Cloudinary `Invalid signature`

Generalmente hay mezcla de credenciales. Usar una sola `CLOUDINARY_URL` consistente o revisar que `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` pertenezcan al mismo entorno.

## 13) Nota de mantenimiento

`BodegaDashboard.tsx` concentra gran parte de la orquestacion. Para futuros cambios grandes, se recomienda extraer modulos de dominio (ordenes, alertas, procesamiento, transporte) a hooks/servicios dedicados para bajar complejidad y facilitar pruebas.
