/**
 * Program API service.
 * Returns example MIPS programs. Currently sourced from local mock data, but
 * the async signature lets us swap in a real HTTP backend without touching
 * any consumers.
 */
import { EXAMPLE_PROGRAMS, type ExampleProgram } from "@/data/examplePrograms";
import { API_BASE_URL } from "./apiConfig";

export type { ExampleProgram };

export interface ProgramApi {
  list(): Promise<ExampleProgram[]>;
  get(id: string): Promise<ExampleProgram | undefined>;
}

const mockProgramApi: ProgramApi = {
  async list() {
    return EXAMPLE_PROGRAMS;
  },
  async get(id: string) {
    return EXAMPLE_PROGRAMS.find((p) => p.id === id);
  },
};

const httpProgramApi: ProgramApi = {
  async list() {
    const res = await fetch(`${API_BASE_URL}/programs`);
    if (!res.ok) throw new Error("No se pudieron cargar programas desde el backend.");
    return (await res.json()) as ExampleProgram[];
  },
  async get(id: string) {
    const res = await fetch(`${API_BASE_URL}/programs/${id}`);
    if (res.status === 404) return undefined;
    if (!res.ok) throw new Error("No se pudo cargar el programa desde el backend.");
    return (await res.json()) as ExampleProgram;
  },
};

export const programApi: ProgramApi = {
  async list() {
    try {
      return await httpProgramApi.list();
    } catch {
      return mockProgramApi.list();
    }
  },
  async get(id: string) {
    try {
      return await httpProgramApi.get(id);
    } catch {
      return mockProgramApi.get(id);
    }
  },
};
