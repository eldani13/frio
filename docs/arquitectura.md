# Arquitectura y Datos

## Visión general
- Frontend Next.js (App Router). Pantalla principal: `app/page.tsx` → `BodegaDashboard` orquesta estado, auth y persistencia.
- UI por secciones en `app/components/bodega/*` (grid, formularios, cola de solicitudes, alertas, etc.).
- Tipos compartidos en `app/interfaces/bodega.ts` y props específicos en `app/interfaces/bodega/*`.
- Infra: Firebase (Auth, Firestore, Storage) inicializado en `lib/firebaseClient.ts`; sincronización de estado e historial en Firestore vía `lib/bodegaCloudState.ts`.

## Flujo de datos
1. Usuario se autentica (Firebase Auth) en `BodegaDashboard`.
2. Se suscribe a Firestore (`subscribeWarehouseState` y `subscribeHistoryState`) para el `warehouseId` activo (por defecto `NEXT_PUBLIC_WAREHOUSE_ID` o "default").
3. Las acciones de UI (ingresos, movimientos, salidas, alertas, cola de solicitudes) actualizan el estado en memoria y se persisten con `saveWarehouseState` / `saveHistoryState` (merge + `serverTimestamp`).
4. Todos los clientes ven el mismo estado en tiempo real.

## Esquema Firestore
**Colección principal:** `warehouses/{warehouseId}/state/main`
- `slots`: Slot[] — { position: number; autoId: string; name: string; temperature: number|null; client: string }
- `inboundBoxes`: Box[] — cola de entrada
- `outboundBoxes`: Box[] — cola de salida
- `dispatchedBoxes`: Box[] — despachados
- `orders`: BodegaOrder[] — { id; type: "a_bodega"|"a_salida"|"revisar"; sourceZone: "ingresos"|"bodega"|"salida"; sourcePosition; targetPosition?; createdAt; createdAtMs; createdBy; client?; autoId?; boxName? }
- `stats`: { ingresos: number; salidas: number; movimientosBodega: number }
- `warehouseName`: string
- `alerts`: AlertItem[] — { id; title; description; reason?; sourceOrderId?; meta?; createdAt? }
- `assignedAlerts`: AlertAssignment[] — { alertId; kind: "temperatura"|"reporte"|"otro"; assignedAt; assignedBy; sourceOrderId?; position? }
- `alertasOperario`: Array<{ position: number; ... }> — alertas en curso por posición
- `alertasOperarioSolved`: number[] — posiciones resueltas
- `llamadasJefe`: Array<Record<string, unknown>> — log de llamadas/escalamientos

**Historial:** `warehouses/{warehouseId}/state/history`
- `ingresos`: Box[] (histórico)
- `salidas`: BodegaOrder[] ejecutadas
- `movimientosBodega`: BodegaOrder[] internos
- `alertas`: AlertHistoryEntry[] — { id; title; description; meta?; createdAt; createdAtMs }

**Perfiles de usuario:** `users/{uid}`
- `role`: "custodio"|"administrador"|"operario"|"jefe"|"cliente"
- `displayName`: string
- `clientId?`: string

## Variables de entorno (NEXT_PUBLIC_*)
- FIREBASE_API_KEY
- FIREBASE_AUTH_DOMAIN
- FIREBASE_PROJECT_ID
- FIREBASE_STORAGE_BUCKET
- FIREBASE_MESSAGING_SENDER_ID
- FIREBASE_APP_ID
- WAREHOUSE_ID (opcional, default "default")

## Cómo correr
```
npm install
npm run dev
# abrir http://localhost:3000
```

## Archivos clave
- `app/components/BodegaDashboard.tsx`: negocio, auth, estado y persistencia.
- `app/components/bodega/*`: UI por sección (grilla, formularios, cola de solicitudes, alertas).
- `app/interfaces/bodega.ts`: modelos compartidos (Slot, Box, BodegaOrder, AlertItem, AlertAssignment, HistoryState).
- `lib/firebaseClient.ts`: bootstrap Firebase (Auth, Firestore, Storage).
- `lib/bodegaCloudState.ts`: suscripción y guardado de estado/historial en Firestore.
