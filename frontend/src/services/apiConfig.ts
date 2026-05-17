export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

export class ApiResponseError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiResponseError";
  }
}

export function formatApiError(error: unknown): string {
  if (error instanceof TypeError) {
    return "Backend no disponible. Se esta usando el simulador local como respaldo.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Error desconocido al comunicarse con el backend.";
}

export async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) return "La solicitud contiene datos invalidos.";
  } catch {
    // Ignore invalid JSON and use status below.
  }

  if (response.status >= 500) return "Error interno del backend.";
  if (response.status === 404) return "Ruta del backend no encontrada.";
  return `Error del backend (${response.status}).`;
}
