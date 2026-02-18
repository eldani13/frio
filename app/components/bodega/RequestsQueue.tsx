import type { RequestsQueueProps } from "../../interfaces/bodega/RequestsQueue";
import type { BodegaOrder, OrderType } from "../../interfaces/bodega";

const TYPE_LABELS: Record<OrderType, string> = {
  a_bodega: "A bodega",
  a_salida: "A salida",
  revisar: "Revisar",
};

const formatOrderDetails = (order: BodegaOrder): string => {
  const target = order.targetPosition ?? "-";
  const sourceLabel =
    order.sourceZone === "bodega"
      ? "Bodega"
      : order.sourceZone === "salida"
        ? "Salida"
        : "Ingreso";
  if (order.type === "revisar") {
    return `Revisar ${sourceLabel} ${order.sourcePosition}`;
  }
  if (order.type === "a_bodega") {
    return `${sourceLabel} ${order.sourcePosition} · Destino bodega ${target}`;
  }
  return `${sourceLabel} ${order.sourcePosition} · Destino salida ${target}`;
};

const orderTimestamp = (order: BodegaOrder) =>
  typeof order.createdAtMs === "number" ? order.createdAtMs : Date.now();

export default function RequestsQueue({
  requests,
  canExecute,
  onExecute,
}: RequestsQueueProps) {
  const orderedRequests = [...requests].sort(
    (a, b) => orderTimestamp(a) - orderTimestamp(b)
  );
  const nextRequest = orderedRequests[0];

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Pendientes: {requests.length}
        </h2>
      </div>

      <div className="mt-6">
        {!nextRequest ? (
          <div className="flex min-h-[70vh] items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 px-8 text-center">
            <p className="text-4xl font-semibold text-slate-700">
              No hay solicitudes pendientes.
            </p>
          </div>
        ) : canExecute ? (
          <button
            type="button"
            onClick={() => onExecute(nextRequest.id)}
            className="flex min-h-[70vh] w-full flex-col justify-center rounded-[32px] bg-emerald-600 px-12 py-16 text-left text-white shadow-lg transition hover:bg-emerald-500"
          >
            <p className="text-4xl font-semibold">
              {TYPE_LABELS[nextRequest.type]}
            </p>
            <p className="mt-5 text-3xl">
              {formatOrderDetails(nextRequest)}
            </p>
            <p className="mt-5 text-lg text-emerald-50">
              Solicitado por {nextRequest.createdBy} · {nextRequest.createdAt}
            </p>
            <p className="mt-12 text-7xl font-semibold leading-none">
              Ejecutar
            </p>
          </button>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-xl font-semibold text-slate-900">
              {TYPE_LABELS[nextRequest.type]}
            </p>
            <p className="mt-2 text-lg text-slate-700">
              {formatOrderDetails(nextRequest)}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Solicitado por {nextRequest.createdBy} · {nextRequest.createdAt}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
