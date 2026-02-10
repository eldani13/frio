# Bodega de Frío

Sistema frontend para gestionar una bodega de frío con 12 posiciones. Permite registrar objetos con id y temperatura, moverlos entre posiciones, retirarlos y buscar por id. Los datos se guardan en localStorage para persistir al recargar.

## Funcionalidades

- 12 posiciones con estado (libre/ocupada).
- Registrar o actualizar id y temperatura.
- Mover objetos entre posiciones.
- Retirar objetos.
- Buscar por id.
- Toast flotante con mensajes.
- Persistencia en localStorage.

## Estructura del proyecto

```
app/
	page.tsx
	globals.css
	components/
		BodegaDashboard.tsx
		bodega/
			Header.tsx
			SlotsGrid.tsx
			SlotCard.tsx
			UpsertForm.tsx
			MoveForm.tsx
			RemoveForm.tsx
			SearchForm.tsx
			MessageBanner.tsx
	interfaces/
		bodega.ts
		bodega/
			Header.ts
			SlotCard.ts
			SlotsGrid.ts
			UpsertForm.ts
			MoveForm.ts
			RemoveForm.ts
			SearchForm.ts
			MessageBanner.ts
public/
```

## Arquitectura y responsabilidades

- [app/page.tsx](app/page.tsx): página principal; solo renderiza el dashboard.
- [app/components/BodegaDashboard.tsx](app/components/BodegaDashboard.tsx): lógica de negocio, estado y persistencia en localStorage.
- Componentes en [app/components/bodega](app/components/bodega): UI desacoplada para cada sección.
- Tipos compartidos en [app/interfaces](app/interfaces):
	- [app/interfaces/bodega.ts](app/interfaces/bodega.ts): tipo `Slot`.
	- [app/interfaces/bodega/*](app/interfaces/bodega): props de cada componente.

## Persistencia (localStorage)

El estado de las posiciones se guarda automáticamente en localStorage con la clave `bodegaSlotsV1`. Al recargar, se restaura si el formato es válido.

## Cómo ejecutar

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev`: entorno de desarrollo.
- `npm run build`: build de producción.
- `npm run start`: ejecutar build.

## Convenciones

- Componentes UI en `app/components/bodega`.
- Tipos en `app/interfaces`.
- Lógica de estado en `BodegaDashboard`.
