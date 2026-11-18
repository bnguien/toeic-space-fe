export type FacilityStatus = "Active" | "Inactive";

export interface CenterDto {
  id: string;
  name: string;
  address: string;
  timeZoneId: string;
  status: FacilityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RoomDto {
  id: string;
  centerId: string;
  centerName: string;
  name: string;
  capacity: number;
  status: FacilityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ClassRoomChangeDto {
  id: string;
  classId: string;
  previousRoomId: string | null;
  newRoomId: string | null;
  changedBy: string;
  changedAt: string;
  reason: string | null;
}

export interface CreateCenterPayload {
  name: string;
  address: string;
  timeZoneId?: string;
}

export interface UpdateCenterPayload {
  name: string;
  address: string;
  timeZoneId: string;
}

export interface CreateRoomPayload {
  centerId: string;
  name: string;
  capacity: number;
}

export interface UpdateRoomPayload {
  centerId: string;
  name: string;
  capacity: number;
}

export interface CenterFilters {
  search?: string;
  status?: FacilityStatus;
  page?: number;
  pageSize?: number;
}

export interface RoomFilters {
  centerId?: string;
  search?: string;
  status?: FacilityStatus;
  page?: number;
  pageSize?: number;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}
