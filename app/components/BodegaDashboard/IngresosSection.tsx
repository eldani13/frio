import { FiArchive, FiBox } from "react-icons/fi";
import type { Box } from "../../interfaces/bodega";

type Props = {
  isCustodio: boolean;
  canUseIngresoForm: boolean;
  inboundBoxes: Box[];
  outboundBoxes: Box[];
  ingresoPosition: number;
  ingresoName: string;
  ingresoTemp: string;
  ingresoClient: string;
  setIngresoName: (v: string) => void;
  setIngresoTemp: (v: string) => void;
  setIngresoClient: (v: string) => void;
  handleIngreso: () => void;
  sortByPosition: <T extends { position: number }>(items: T[]) => T[];
  handleDispatchBox: (position: number) => void;
  isCliente?: boolean;
  clientFilterId?: string;
  onClientChange?: (id: string) => void;
};

export default function IngresosSection(props: Props) {
  const {
    isCustodio,
    canUseIngresoForm,
    inboundBoxes,
    outboundBoxes,
    ingresoPosition,
    ingresoName,
    ingresoTemp,
    ingresoClient,
    setIngresoName,
    setIngresoTemp,
    setIngresoClient,
    handleIngreso,
    sortByPosition,
    handleDispatchBox,
    isCliente = false,
    clientFilterId,
    onClientChange,
  } = props;

  const clientOptions = Array.from(
    new Set(outboundBoxes.map((box) => box.client).filter(Boolean)),
  );

  const initialSelected = clientFilterId ?? "";
  const selectedClient =
    initialSelected && clientOptions.includes(initialSelected)
      ? initialSelected
      : "";

  const outboundFiltered = selectedClient
    ? outboundBoxes.filter((box) => box.client === selectedClient)
    : outboundBoxes;

  if (!isCustodio) return null;

  return (
    <section className="flex flex-col lg:flex-row gap-6">
      <div className="rounded-2xl bg-white p-8 shadow-lg border border-green-200 w-full max-w-md mx-auto lg:mx-0 lg:w-87.5 flex flex-col gap-8">
        {/* Zona de ingresos arriba */}
        <div className="flex flex-col justify-between min-h-55">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-600 p-2 text-white">
                <FiArchive className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Zona de ingresos</h2>
                <p className="text-xs text-slate-500">
                  Cajas recibidas recientemente
                </p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
              {inboundBoxes.length} cajas
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center mt-4">
            {inboundBoxes.length === 0 ? (
              <div className="flex flex-col items-center gap-2">
                <FiArchive className="w-10 h-10 text-slate-300" />
                <p className="text-sm text-slate-500">
                  No hay cajas en ingresos
                </p>
              </div>
            ) : (
              <div className="w-full max-h-32 overflow-y-auto flex flex-col items-center">
                {sortByPosition(inboundBoxes).map((box) => (
                  <div
                    key={`ingreso-${box.position}`}
                    className="rounded-xl border border-emerald-200 bg-white p-3 text-sm text-emerald-700 w-full mb-2"
                  >
                    <p className="font-semibold">Ingreso {box.position}</p>
                    <p>Id único: {box.autoId}</p>
                    <p>Nombre: {box.name}</p>
                    <p>Temperatura: {box.temperature} °C</p>
                    <p>Cliente: {box.client || "—"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <hr className="my-4 border-slate-200" />
        {/* Formulario de ingreso abajo */}
        {canUseIngresoForm ? (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="rounded-full bg-emerald-600 p-2 text-white">
                <FiArchive className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Ingreso de cajas</h2>
                <p className="text-xs text-slate-500">
                  Registrar nueva caja
                </p>
              </div>
            </div>
            <div className="grid gap-3 mt-6">
              <label className="text-sm font-medium text-slate-600">
                Orden de posición
              </label>
              <input
                value={ingresoPosition}
                type="number"
                readOnly
                className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
              />
              <label className="text-sm font-medium text-slate-600">
                Cliente
              </label>
              <select
                value={ingresoClient}
                onChange={(event) => setIngresoClient(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mb-2"
              >
                <option value="cliente1">Cliente 1</option>
                <option value="cliente2">Cliente 2</option>
                <option value="cliente3">Cliente 3</option>
              </select>
              <label className="text-sm font-medium text-slate-600">
                Nombre de la caja
              </label>
              <input
                value={ingresoName}
                onChange={(event) => setIngresoName(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Ej: Caja banano"
              />
              <label className="text-sm font-medium text-slate-600">
                Temperatura (°C)
              </label>
              <input
                value={ingresoTemp}
                onChange={(event) => setIngresoTemp(event.target.value)}
                type="number"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Ej: -8"
              />
              <button
                type="button"
                onClick={handleIngreso}
                className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                <FiArchive className="w-4 h-4" /> Registrar ingreso
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Zona de salida e ingresos */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white p-8 shadow-lg border border-pink-200 w-full max-w-md mx-auto lg:mx-0 lg:w-87.5 flex flex-col gap-8">
          {/* Zona de salida arriba (solo lectura) */}
          <div className="flex flex-col justify-between min-h-55">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-pink-600 p-2 text-white">
                  <FiBox className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">Zona de salida</h2>
                  <p className="text-xs text-slate-500">
                    Cajas programadas para salir
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-600">
                {outboundFiltered.length} cajas
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center mt-4">
              {outboundFiltered.length === 0 ? (
                <div className="flex flex-col items-center gap-2">
                  <FiBox className="w-10 h-10 text-slate-300" />
                  <p className="text-sm text-slate-500">
                    No hay cajas en salida
                  </p>
                </div>
              ) : (
                <div className="w-full max-h-32 overflow-y-auto flex flex-col items-center">
                  {sortByPosition(outboundFiltered).map((box) => (
                    <div
                      key={`salida-scroll-${box.position}`}
                      className="rounded-xl border border-pink-200 bg-white p-3 text-sm text-pink-700 w-full mb-2"
                    >
                      <p className="font-semibold">Salida {box.position}</p>
                      <p>Id único: {box.autoId}</p>
                      <p>Nombre: {box.name}</p>
                      <p>Temperatura: {box.temperature} °C</p>
                      <p>Cliente: {box.client || "—"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <hr className="my-4 border-pink-200" />
          {/* Formulario de envío abajo */}
          {outboundFiltered.length > 0 ? (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="rounded-full bg-pink-600 p-2 text-white">
                  <FiBox className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">Enviar caja</h2>
                  <p className="text-xs text-slate-500">
                    Registrar salida de caja
                  </p>
                </div>
              </div>
              <div className="grid gap-3 mt-6">
                <label className="text-sm font-medium text-slate-600">
                  Orden de posición
                </label>
                <input
                  value={outboundFiltered[0]?.position ?? ""}
                  type="number"
                  readOnly
                  className="w-full rounded-lg border border-pink-200 bg-pink-50 px-3 py-2 text-sm text-pink-600"
                />
                <label className="text-sm font-medium text-slate-600">
                  Cliente
                </label>
                <select
                  value={selectedClient}
                  onChange={(event) => onClientChange?.(event.target.value)}
                  disabled={isCliente && !onClientChange}
                  className="w-full rounded-lg border border-pink-200 px-3 py-2 text-sm mb-2 bg-pink-50 text-pink-700"
                >
                  <option value="">Todos</option>
                  {clientOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.replace("cliente", "Cliente ")}
                    </option>
                  ))}
                </select>
                <label className="text-sm font-medium text-slate-600">
                  Nombre de la caja
                </label>
                <input
                  value={outboundFiltered[0]?.name ?? ""}
                  readOnly
                  className="w-full rounded-lg border border-pink-200 px-3 py-2 text-sm"
                />
                <label className="text-sm font-medium text-slate-600">
                  Temperatura (°C)
                </label>
                <input
                  value={outboundFiltered[0]?.temperature ?? ""}
                  type="number"
                  readOnly
                  className="w-full rounded-lg border border-pink-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleDispatchBox(outboundFiltered[0]?.position)
                  }
                  className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-500"
                >
                  <FiBox className="w-4 h-4" /> Enviar caja
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}