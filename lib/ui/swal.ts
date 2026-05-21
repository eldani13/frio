"use client";

import Swal from "sweetalert2";

const btnAceptar = { confirmButtonText: "Aceptar" as const, confirmButtonColor: "#1e293b" };
const btnConfirmar = {
  showCancelButton: true as const,
  confirmButtonText: "Sí, continuar",
  cancelButtonText: "Cancelar",
  confirmButtonColor: "#1e293b",
  cancelButtonColor: "#94a3b8",
};

export async function swalInfo(title: string, text?: string) {
  await Swal.fire({
    icon: "info",
    title,
    ...(text ? { text } : {}),
    ...btnAceptar,
  });
}

export async function swalSuccess(title: string, text?: string) {
  await Swal.fire({
    icon: "success",
    title,
    ...(text ? { text } : {}),
    confirmButtonText: "Aceptar",
    confirmButtonColor: "#047857",
  });
}

export async function swalWarning(title: string, text?: string) {
  await Swal.fire({
    icon: "warning",
    title,
    ...(text ? { text } : {}),
    confirmButtonText: "Aceptar",
    confirmButtonColor: "#b45309",
  });
}

export async function swalError(title: string, text?: string) {
  await Swal.fire({
    icon: "error",
    title,
    ...(text ? { text } : {}),
    confirmButtonText: "Aceptar",
    confirmButtonColor: "#b91c1c",
  });
}

/** Toast breve (éxito / aviso). */
export function swalToastSuccess(message: string) {
  void Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title: message,
    showConfirmButton: false,
    timer: 2600,
    timerProgressBar: true,
  });
}

export function swalToastInfo(message: string) {
  void Swal.fire({
    toast: true,
    position: "top-end",
    icon: "info",
    title: message,
    showConfirmButton: false,
    timer: 3200,
    timerProgressBar: true,
  });
}

/** Confirmación genérica (no destructiva). */
export async function swalConfirm(title: string, text?: string, confirmText = "Sí, continuar"): Promise<boolean> {
  const r = await Swal.fire({
    icon: "question",
    title,
    ...(text ? { text } : {}),
    ...btnConfirmar,
    confirmButtonText: confirmText,
  });
  return r.isConfirmed;
}

/** Eliminar o acciones irreversibles. */
export async function swalConfirmDelete(title: string, text?: string): Promise<boolean> {
  const r = await Swal.fire({
    icon: "warning",
    title,
    text: text ?? "Esta acción no se puede deshacer.",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#b91c1c",
    cancelButtonColor: "#94a3b8",
  });
  return r.isConfirmed;
}
