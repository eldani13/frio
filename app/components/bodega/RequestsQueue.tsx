import type { RequestsQueueProps } from "../../interfaces/bodega/RequestsQueue";
import type { BodegaOrder, OrderType } from "../../interfaces/bodega";

const TYPE_LABELS: Record<OrderType, string> = {
  a_bodega: "A bodega",
  a_salida: "A salida",
};

const formatOrderDetails = (order: BodegaOrder): string => {
  const target = order.targetPosition ?? "-";
  const sourceLabel = order.sourceZone === "bodega" ? "Bodega" : "Ingreso";
  if (order.type === "a_bodega") {
    return `${sourceLabel} ${order.sourcePosition} · Destino bodega ${target}`;
  }
  return `${sourceLabel} ${order.sourcePosition} · Destino salida ${target}`;
};

export default function RequestsQueue({
  requests,
  canExecute,
  onExecute,
}: RequestsQueueProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Solicitudes pendientes
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {requests.length === 0
              ? "No hay solicitudes activas."
              : "Revisa y ejecuta las solicitudes en espera."}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          Total: {requests.length}
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {requests.length === 0
          ? null
          : requests.map((request) => (
          <div
            key={request.id}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {TYPE_LABELS[request.type]}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {formatOrderDetails(request)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Solicitado por {request.createdBy} · {request.createdAt}
                </p>
              </div>
              {canExecute ? (
                <button
                  type="button"
                  onClick={() => onExecute(request.id)}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
                >
                  Ejecutar
                </button>
              ) : (
                <span className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500">
                  Solo lectura
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
