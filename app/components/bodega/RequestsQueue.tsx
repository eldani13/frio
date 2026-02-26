import type { RequestsQueueProps } from "../../interfaces/bodega/RequestsQueue";
import { FiMapPin, FiBox, FiUser, FiCalendar, FiPackage, FiArrowRight, FiAlertCircle } from "react-icons/fi";
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
  onReport,
}: RequestsQueueProps) {
  const orderedRequests = [...requests].sort(
    (a, b) => orderTimestamp(a) - orderTimestamp(b)
  );
  const nextRequest = orderedRequests[0];

  return (
    canExecute ? (
      <button
        type="button"
        disabled={!nextRequest}
        onClick={e => {
          if (!nextRequest) return;
          const btn = e.currentTarget;
          btn.classList.add("zoom-out");
          setTimeout(() => {
            btn.classList.remove("zoom-out");
            onExecute(nextRequest.id);
          }, 180);
        }}
        className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm w-full border border-emerald-200 transition-transform duration-150 shadow-md hover:shadow-lg focus:shadow-lg active:shadow-lg hover:scale-[0.98] active:scale-[0.95]"
        style={{ outline: "none" }}
      >
        <div className="flex items-center justify-between mb-6">
          <span className="px-6 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-lg flex items-center gap-2">
            <FiBox className="w-5 h-5" />
            {nextRequest ? TYPE_LABELS[nextRequest.type] : "A bodega"}
          </span>
          <div className="flex items-center gap-3">
            <span className="px-4 py-1 rounded-xl border border-yellow-300 bg-yellow-50 text-yellow-700 font-semibold text-base flex items-center gap-2">
              <FiAlertCircle className="w-5 h-5" /> Pendiente
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold text-base border border-emerald-200">
              {requests.length} tareas
            </span>
          </div>
        </div>
        {!nextRequest ? (
          <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 px-8 text-center">
            <p className="text-3xl font-semibold text-slate-700">
              No hay solicitudes pendientes.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl  p-4 sm:p-8">
            <div className="flex flex-col items-center">
              <span className="text-slate-500 font-semibold text-lg mb-4">Transferencia de:</span>
              <div className="flex items-center justify-center gap-6 w-full">
                {/* Origen */}
                <div className="flex flex-col items-center bg-slate-50 border border-slate-200 rounded-2xl px-8 py-6 w-64">
                  <FiMapPin className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-xs text-slate-400 mb-1">ORIGEN</span>
                  <span className="text-2xl font-bold text-slate-700">{nextRequest.sourceZone === "bodega" ? "Bodega" : nextRequest.sourceZone === "salida" ? "Salida" : "Ingreso"} {nextRequest.sourcePosition}</span>
                </div>
                {/* Flecha */}
                <FiArrowRight className="w-10 h-10 text-slate-300" />
                {/* Destino */}
                <div className="flex flex-col items-center bg-emerald-50 border border-emerald-200 rounded-2xl px-8 py-6 w-64">
                  <FiBox className="w-8 h-8 text-emerald-400 mb-2" />
                  <span className="text-xs text-emerald-400 mb-1">DESTINO</span>
                  <span className="text-2xl font-bold text-emerald-700">{
                    nextRequest.type === "a_bodega"
                      ? `bodega ${nextRequest.targetPosition}`
                      : nextRequest.type === "a_salida"
                        ? `salida ${nextRequest.targetPosition}`
                        : nextRequest.targetPosition && String(nextRequest.targetPosition).trim() !== "" && nextRequest.targetPosition !== undefined && nextRequest.targetPosition !== null
                          ? `revisar ${nextRequest.targetPosition}`
                          : "revisar"
                  }</span>
                </div>
              </div>
              <hr className="my-8 border-slate-200 w-full" />
              {/* Detalles */}
              <div className="flex flex-wrap justify-center gap-8 w-full mb-6">
                <div className="flex items-center gap-2">
                  <FiUser className="w-5 h-5 text-slate-400" />
                  <span className="text-xs text-slate-500">Solicitado por</span>
                  <span className="font-semibold text-slate-700">{nextRequest.createdBy}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiCalendar className="w-5 h-5 text-slate-400" />
                  <span className="text-xs text-slate-500">Fecha y hora</span>
                  <span className="font-semibold text-slate-700">{nextRequest.createdAt}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiPackage className="w-5 h-5 text-slate-400" />
                  <span className="text-xs text-slate-500">ID de solicitud</span>
                  <span className="font-semibold text-slate-700">{nextRequest.id}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </button>
    ) : (
      <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <button className="px-6 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-lg flex items-center gap-2">
            <FiBox className="w-5 h-5" />
            {nextRequest ? TYPE_LABELS[nextRequest.type] : "A bodega"}
          </button>
          <span className="px-4 py-1 rounded-xl border border-yellow-300 bg-yellow-50 text-yellow-700 font-semibold text-base flex items-center gap-2">
            <FiAlertCircle className="w-5 h-5" /> Pendiente
          </span>
        </div>
        {!nextRequest ? (
          <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 px-8 text-center">
            <p className="text-3xl font-semibold text-slate-700">
              No hay solicitudes pendientes.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl  p-4 sm:p-8">
            <div className="flex flex-col items-center">
              <span className="text-slate-500 font-semibold text-lg mb-4">Transferencia de:</span>
              <div className="flex items-center justify-center gap-6 w-full">
                {/* Origen */}
                <div className="flex flex-col items-center bg-slate-50 border border-slate-200 rounded-2xl px-8 py-6 w-64">
                  <FiMapPin className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-xs text-slate-400 mb-1">ORIGEN</span>
                  <span className="text-2xl font-bold text-slate-700">{nextRequest.sourceZone === "bodega" ? "Bodega" : nextRequest.sourceZone === "salida" ? "Salida" : "Ingreso"} {nextRequest.sourcePosition}</span>
                </div>
                {/* Flecha */}
                <FiArrowRight className="w-10 h-10 text-slate-300" />
                {/* Destino */}
                <div className="flex flex-col items-center bg-emerald-50 border border-emerald-200 rounded-2xl px-8 py-6 w-64">
                  <FiBox className="w-8 h-8 text-emerald-400 mb-2" />
                  <span className="text-xs text-emerald-400 mb-1">DESTINO</span>
                  <span className="text-2xl font-bold text-emerald-700">{
                    nextRequest.type === "a_bodega"
                      ? `bodega ${nextRequest.targetPosition}`
                      : nextRequest.type === "a_salida"
                        ? `salida ${nextRequest.targetPosition}`
                        : nextRequest.targetPosition && String(nextRequest.targetPosition).trim() !== "" && nextRequest.targetPosition !== undefined && nextRequest.targetPosition !== null
                          ? `revisar ${nextRequest.targetPosition}`
                          : "revisar"
                  }</span>
                </div>
              </div>
              <hr className="my-8 border-slate-200 w-full" />
              {/* Detalles */}
              <div className="flex flex-wrap justify-center gap-8 w-full mb-6">
                <div className="flex items-center gap-2">
                  <FiUser className="w-5 h-5 text-slate-400" />
                  <span className="text-xs text-slate-500">Solicitado por</span>
                  <span className="font-semibold text-slate-700">{nextRequest.createdBy}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiCalendar className="w-5 h-5 text-slate-400" />
                  <span className="text-xs text-slate-500">Fecha y hora</span>
                  <span className="font-semibold text-slate-700">{nextRequest.createdAt}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiPackage className="w-5 h-5 text-slate-400" />
                  <span className="text-xs text-slate-500">ID de solicitud</span>
                  <span className="font-semibold text-slate-700">{nextRequest.id}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  );
}
