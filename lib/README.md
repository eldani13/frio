# `lib/` — utilidades compartidas

Estructura por dominio (solo organización de archivos; la lógica no cambia).

| Carpeta | Contenido |
|---------|-----------|
| `firebase/` | Cliente Firebase principal (`firebaseClient`) |
| `fridem/` | Integración inventario externo (Fridem) |
| `bodega/` | Estado en nube, kg, inventario interno, salidas, códigos almacén |
| `catalogo/` | Precios, procesamiento y unidades de catálogo |
| `ordenes/` | Ordenación de órdenes y solicitudes de compra |
| `auth/` | Presets de roles en login |
| `ui/` | Helpers SweetAlert (`swal`) |
| `soporte/` | Enlaces de soporte (WhatsApp cuenta) |

Importar siempre con ruta completa, por ejemplo: `@/lib/bodega/bodegaCloudState`.
