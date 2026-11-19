import { httpClient } from "@/services/http";
import type {
  CenterDto,
  CenterFilters,
  CreateCenterPayload,
  CreateRoomPayload,
  PageResult,
  RoomDto,
  RoomFilters,
  UpdateCenterPayload,
  UpdateRoomPayload,
} from "../types/facility.types";

const centersBase = "/classroom/api/v1/centers";
const roomsBase = "/classroom/api/v1/rooms";

export const facilitiesApi = {
  // Centers
  listCenters: async (filters: CenterFilters = {}, signal?: AbortSignal) =>
    (
      await httpClient.get<PageResult<CenterDto>>(centersBase, {
        params: {
          search: filters.search || undefined,
          status: filters.status || undefined,
          page: filters.page ?? 1,
          pageSize: filters.pageSize ?? 20,
        },
        signal,
      })
    ).data,

  getCenter: async (id: string, signal?: AbortSignal) =>
    (await httpClient.get<CenterDto>(`${centersBase}/${id}`, { signal })).data,

  createCenter: async (payload: CreateCenterPayload) =>
    (await httpClient.post<CenterDto>(centersBase, payload)).data,

  updateCenter: async (id: string, payload: UpdateCenterPayload) =>
    (await httpClient.put<CenterDto>(`${centersBase}/${id}`, payload)).data,

  activateCenter: async (id: string) =>
    (await httpClient.post<CenterDto>(`${centersBase}/${id}/activate`)).data,

  deactivateCenter: async (id: string) =>
    (await httpClient.post<CenterDto>(`${centersBase}/${id}/deactivate`)).data,

  // Rooms
  listRooms: async (filters: RoomFilters = {}, signal?: AbortSignal) =>
    (
      await httpClient.get<PageResult<RoomDto>>(roomsBase, {
        params: {
          centerId: filters.centerId || undefined,
          search: filters.search || undefined,
          status: filters.status || undefined,
          page: filters.page ?? 1,
          pageSize: filters.pageSize ?? 20,
        },
        signal,
      })
    ).data,

  getRoom: async (id: string, signal?: AbortSignal) =>
    (await httpClient.get<RoomDto>(`${roomsBase}/${id}`, { signal })).data,

  createRoom: async (payload: CreateRoomPayload) =>
    (await httpClient.post<RoomDto>(roomsBase, payload)).data,

  updateRoom: async (id: string, payload: UpdateRoomPayload) =>
    (await httpClient.put<RoomDto>(`${roomsBase}/${id}`, payload)).data,

  activateRoom: async (id: string) =>
    (await httpClient.post<RoomDto>(`${roomsBase}/${id}/activate`)).data,

  deactivateRoom: async (id: string) =>
    (await httpClient.post<RoomDto>(`${roomsBase}/${id}/deactivate`)).data,
};
