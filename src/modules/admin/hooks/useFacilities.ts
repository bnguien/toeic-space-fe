import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { facilitiesApi } from "../api/facilities.api";
import type {
  CenterFilters,
  CreateCenterPayload,
  CreateRoomPayload,
  RoomFilters,
  UpdateCenterPayload,
  UpdateRoomPayload,
} from "../types/facility.types";

export const facilityKeys = {
  allCenters: ["admin", "centers"] as const,
  centers: (filters: CenterFilters) => [...facilityKeys.allCenters, filters] as const,
  center: (id: string) => [...facilityKeys.allCenters, id] as const,
  allRooms: ["admin", "rooms"] as const,
  rooms: (filters: RoomFilters) => [...facilityKeys.allRooms, filters] as const,
  room: (id: string) => [...facilityKeys.allRooms, id] as const,
};

export function useCenters(filters: CenterFilters = {}) {
  return useQuery({
    queryKey: facilityKeys.centers(filters),
    queryFn: ({ signal }) => facilitiesApi.listCenters(filters, signal),
  });
}

export function useCenter(id: string | null) {
  return useQuery({
    queryKey: id ? facilityKeys.center(id) : facilityKeys.allCenters,
    queryFn: ({ signal }) => (id ? facilitiesApi.getCenter(id, signal) : null),
    enabled: Boolean(id),
  });
}

export function useRooms(filters: RoomFilters = {}) {
  return useQuery({
    queryKey: facilityKeys.rooms(filters),
    queryFn: ({ signal }) => facilitiesApi.listRooms(filters, signal),
  });
}

export function useRoom(id: string | null) {
  return useQuery({
    queryKey: id ? facilityKeys.room(id) : facilityKeys.allRooms,
    queryFn: ({ signal }) => (id ? facilitiesApi.getRoom(id, signal) : null),
    enabled: Boolean(id),
  });
}

export function useFacilityActions() {
  const queryClient = useQueryClient();

  const invalidateCenters = () =>
    queryClient.invalidateQueries({ queryKey: facilityKeys.allCenters });
  const invalidateRooms = () => queryClient.invalidateQueries({ queryKey: facilityKeys.allRooms });

  const createCenter = useMutation({
    mutationFn: (payload: CreateCenterPayload) => facilitiesApi.createCenter(payload),
    onSuccess: invalidateCenters,
  });

  const updateCenter = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCenterPayload }) =>
      facilitiesApi.updateCenter(id, payload),
    onSuccess: invalidateCenters,
  });

  const activateCenter = useMutation({
    mutationFn: (id: string) => facilitiesApi.activateCenter(id),
    onSuccess: invalidateCenters,
  });

  const deactivateCenter = useMutation({
    mutationFn: (id: string) => facilitiesApi.deactivateCenter(id),
    onSuccess: invalidateCenters,
  });

  const createRoom = useMutation({
    mutationFn: (payload: CreateRoomPayload) => facilitiesApi.createRoom(payload),
    onSuccess: invalidateRooms,
  });

  const updateRoom = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRoomPayload }) =>
      facilitiesApi.updateRoom(id, payload),
    onSuccess: invalidateRooms,
  });

  const activateRoom = useMutation({
    mutationFn: (id: string) => facilitiesApi.activateRoom(id),
    onSuccess: invalidateRooms,
  });

  const deactivateRoom = useMutation({
    mutationFn: (id: string) => facilitiesApi.deactivateRoom(id),
    onSuccess: invalidateRooms,
  });

  return {
    createCenter,
    updateCenter,
    activateCenter,
    deactivateCenter,
    createRoom,
    updateRoom,
    activateRoom,
    deactivateRoom,
  };
}
