import { useCallback, useMemo, useState, type FormEvent } from "react";
import { Building2, DoorOpen, Edit3, Plus, Power, PowerOff } from "lucide-react";
import {
  AdminPage,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  DataToolbar,
  Modal,
  Pagination,
  Segmented,
  type Column,
} from "../components/ui";
import { AddressPicker } from "@/shared/components/AddressPicker";
import { Select, type SelectOption } from "@/shared/components/Select";
import {
  composeAddress,
  emptyAddress,
  parseAddress,
  type AddressParts,
} from "@/shared/utils/vietnam-address";
import { useCenters, useFacilityActions, useRooms } from "../hooks/useFacilities";
import type {
  CenterDto,
  CreateCenterPayload,
  CreateRoomPayload,
  FacilityStatus,
  RoomDto,
  UpdateCenterPayload,
  UpdateRoomPayload,
} from "../types/facility.types";
import { classErrorMessage } from "../utils/classErrorMessage";
import styles from "./FacilitiesPage.module.css";

type TabMode = "centers" | "rooms";

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(iso),
  );

export function FacilitiesPage() {
  const [tab, setTab] = useState<TabMode>("centers");
  const [centerSearch, setCenterSearch] = useState("");
  const [centerStatus, setCenterStatus] = useState<FacilityStatus | "">("");
  const [centerPage, setCenterPage] = useState(1);

  const [roomSearch, setRoomSearch] = useState("");
  const [selectedCenterId, setSelectedCenterId] = useState<string>("");
  const [roomStatus, setRoomStatus] = useState<FacilityStatus | "">("");
  const [roomPage, setRoomPage] = useState(1);

  const [editingCenter, setEditingCenter] = useState<CenterDto | "new" | null>(null);
  const [centerAddress, setCenterAddress] = useState<AddressParts>(emptyAddress);
  const [editingRoom, setEditingRoom] = useState<RoomDto | "new" | null>(null);

  const [confirmToggleCenter, setConfirmToggleCenter] = useState<CenterDto | null>(null);
  const [confirmToggleRoom, setConfirmToggleRoom] = useState<RoomDto | null>(null);

  const [actionError, setActionError] = useState("");

  const centersQuery = useCenters({
    search: centerSearch,
    status: centerStatus || undefined,
    page: centerPage,
    pageSize: 15,
  });

  const roomsQuery = useRooms({
    centerId: selectedCenterId || undefined,
    search: roomSearch,
    status: roomStatus || undefined,
    page: roomPage,
    pageSize: 15,
  });

  // Query all active centers for the room center selector dropdown
  const allCentersQuery = useCenters({ pageSize: 100 });

  const actions = useFacilityActions();

  const openCenterEditor = useCallback((center: CenterDto | "new" | null) => {
    if (center) setCenterAddress(parseAddress(center === "new" ? "" : center.address));
    setEditingCenter(center);
  }, []);

  const centerOptions = useMemo<SelectOption<string>[]>(() => {
    const list = allCentersQuery.data?.items ?? [];
    return [
      { value: "", label: "Tất cả cơ sở" },
      ...list.map((c) => ({ value: c.id, label: `${c.name} (${c.address})` })),
    ];
  }, [allCentersQuery.data?.items]);

  const activeCenterOptions = useMemo<SelectOption<string>[]>(() => {
    const list = (allCentersQuery.data?.items ?? []).filter((c) => c.status === "Active");
    return list.map((c) => ({ value: c.id, label: c.name }));
  }, [allCentersQuery.data?.items]);

  const handleCenterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionError("");
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const address = composeAddress(centerAddress);
    const timeZoneId = String(form.get("timeZoneId") ?? "Asia/Ho_Chi_Minh").trim();

    if (!centerAddress.street.trim()) {
      setActionError("Vui lòng nhập tên đường, số nhà.");
      return;
    }
    if (!centerAddress.city.trim()) {
      setActionError("Vui lòng chọn thành phố/tỉnh.");
      return;
    }

    try {
      if (editingCenter === "new") {
        const payload: CreateCenterPayload = { name, address, timeZoneId };
        await actions.createCenter.mutateAsync(payload);
      } else if (editingCenter) {
        const payload: UpdateCenterPayload = { name, address, timeZoneId };
        await actions.updateCenter.mutateAsync({ id: editingCenter.id, payload });
      }
      openCenterEditor(null);
    } catch (err) {
      setActionError(classErrorMessage(err));
    }
  };

  const handleRoomSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionError("");
    const form = new FormData(e.currentTarget);
    const centerId = String(form.get("centerId") ?? "").trim();
    const name = String(form.get("name") ?? "").trim();
    const capacity = Number(form.get("capacity") ?? 30);

    try {
      if (editingRoom === "new") {
        const payload: CreateRoomPayload = { centerId, name, capacity };
        await actions.createRoom.mutateAsync(payload);
      } else if (editingRoom) {
        const payload: UpdateRoomPayload = { centerId, name, capacity };
        await actions.updateRoom.mutateAsync({ id: editingRoom.id, payload });
      }
      setEditingRoom(null);
    } catch (err) {
      setActionError(classErrorMessage(err));
    }
  };

  const handleToggleCenterStatus = async () => {
    if (!confirmToggleCenter) return;
    setActionError("");
    try {
      if (confirmToggleCenter.status === "Active") {
        await actions.deactivateCenter.mutateAsync(confirmToggleCenter.id);
      } else {
        await actions.activateCenter.mutateAsync(confirmToggleCenter.id);
      }
      setConfirmToggleCenter(null);
    } catch (err) {
      setActionError(classErrorMessage(err));
    }
  };

  const handleToggleRoomStatus = async () => {
    if (!confirmToggleRoom) return;
    setActionError("");
    try {
      if (confirmToggleRoom.status === "Active") {
        await actions.deactivateRoom.mutateAsync(confirmToggleRoom.id);
      } else {
        await actions.activateRoom.mutateAsync(confirmToggleRoom.id);
      }
      setConfirmToggleRoom(null);
    } catch (err) {
      setActionError(classErrorMessage(err));
    }
  };

  const centerColumns = useMemo<Column<CenterDto>[]>(
    () => [
      {
        key: "name",
        header: "Tên cơ sở",
        locked: true,
        render: (row) => <strong>{row.name}</strong>,
      },
      {
        key: "address",
        header: "Địa chỉ",
        render: (row) => row.address,
      },
      {
        key: "timeZoneId",
        header: "Múi giờ",
        render: (row) => row.timeZoneId,
      },
      {
        key: "status",
        header: "Trạng thái",
        render: (row) => (
          <Badge tone={row.status === "Active" ? "green" : "neutral"}>
            {row.status === "Active" ? "Đang hoạt động" : "Ngừng hoạt động"}
          </Badge>
        ),
      },
      {
        key: "updatedAt",
        header: "Cập nhật",
        nowrap: true,
        render: (row) => formatDate(row.updatedAt),
      },
      {
        key: "actions",
        header: "Thao tác",
        nowrap: true,
        render: (row) => (
          <div className={styles.actionsCell}>
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                setSelectedCenterId(row.id);
                setTab("rooms");
                setRoomPage(1);
              }}
              title="Xem danh sách phòng thuộc cơ sở này"
            >
              <DoorOpen size={14} /> Xem phòng
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                setActionError("");
                openCenterEditor(row);
              }}
            >
              <Edit3 size={14} /> Sửa
            </Button>
            <Button
              size="sm"
              variant={row.status === "Active" ? "danger" : "default"}
              onClick={() => {
                setActionError("");
                setConfirmToggleCenter(row);
              }}
            >
              {row.status === "Active" ? <PowerOff size={14} /> : <Power size={14} />}
              {row.status === "Active" ? "Vô hiệu hóa" : "Kích hoạt"}
            </Button>
          </div>
        ),
      },
    ],
    [openCenterEditor],
  );

  const roomColumns = useMemo<Column<RoomDto>[]>(
    () => [
      {
        key: "name",
        header: "Tên phòng",
        locked: true,
        render: (row) => <strong>{row.name}</strong>,
      },
      {
        key: "centerName",
        header: "Cơ sở",
        render: (row) => (
          <span className={styles.centerBadge}>
            <Building2
              size={13}
              style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}
            />
            {row.centerName}
          </span>
        ),
      },
      {
        key: "capacity",
        header: "Sức chứa",
        render: (row) => <span className={styles.capacityText}>{row.capacity} học viên</span>,
      },
      {
        key: "status",
        header: "Trạng thái",
        render: (row) => (
          <Badge tone={row.status === "Active" ? "green" : "neutral"}>
            {row.status === "Active" ? "Đang hoạt động" : "Ngừng hoạt động"}
          </Badge>
        ),
      },
      {
        key: "updatedAt",
        header: "Cập nhật",
        nowrap: true,
        render: (row) => formatDate(row.updatedAt),
      },
      {
        key: "actions",
        header: "Thao tác",
        nowrap: true,
        render: (row) => (
          <div className={styles.actionsCell}>
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                setActionError("");
                setEditingRoom(row);
              }}
            >
              <Edit3 size={14} /> Sửa
            </Button>
            <Button
              size="sm"
              variant={row.status === "Active" ? "danger" : "default"}
              onClick={() => {
                setActionError("");
                setConfirmToggleRoom(row);
              }}
            >
              {row.status === "Active" ? <PowerOff size={14} /> : <Power size={14} />}
              {row.status === "Active" ? "Vô hiệu hóa" : "Kích hoạt"}
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <AdminPage
      theme="blue"
      eyebrow="Quản lý lớp học / Cơ sở vật chất"
      title="Cơ sở & Phòng học"
      description="Quản lý các cơ sở đào tạo, phòng học trực tiếp và sức chứa phục vụ xếp lịch lớp học."
      actions={
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button
            variant="default"
            onClick={() => {
              setActionError("");
              openCenterEditor("new");
            }}
          >
            <Plus size={15} /> Thêm cơ sở
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setActionError("");
              setEditingRoom("new");
            }}
          >
            <Plus size={15} /> Thêm phòng học
          </Button>
        </div>
      }
    >
      <div className={styles.container}>
        {actionError && <div className={styles.errorBanner}>{actionError}</div>}

        <div className={styles.tabsRow}>
          <Segmented
            label="Chế độ xem cơ sở vật chất"
            value={tab}
            onChange={(v) => {
              setTab(v);
              setActionError("");
            }}
            options={[
              {
                value: "centers",
                label: "Cơ sở đào tạo",
                count: centersQuery.data?.totalCount,
                icon: <Building2 size={15} />,
              },
              {
                value: "rooms",
                label: "Phòng học",
                count: roomsQuery.data?.totalCount,
                icon: <DoorOpen size={15} />,
              },
            ]}
          />
        </div>

        {tab === "centers" ? (
          <>
            <DataToolbar
              placeholder="Tìm kiếm cơ sở theo tên hoặc địa chỉ..."
              search={centerSearch}
              onSearch={(v) => {
                setCenterSearch(v);
                setCenterPage(1);
              }}
              filters={[
                {
                  key: "status",
                  label: "Trạng thái",
                  value: centerStatus,
                  options: [
                    { value: "", label: "Tất cả trạng thái" },
                    { value: "Active", label: "Đang hoạt động" },
                    { value: "Inactive", label: "Ngừng hoạt động" },
                  ],
                },
              ]}
              onFilterChange={(_k, val) => {
                setCenterStatus(val as FacilityStatus | "");
                setCenterPage(1);
              }}
            />

            <DataTable<CenterDto>
              id="centers-table"
              label="Danh sách cơ sở đào tạo"
              columns={centerColumns}
              rows={centersQuery.data?.items}
              getRowId={(r) => r.id}
              loading={centersQuery.isLoading}
              emptyTitle="Không tìm thấy cơ sở nào"
              emptyDescription="Chưa có cơ sở đào tạo nào hoặc không khớp với bộ lọc."
            />

            {centersQuery.data && centersQuery.data.totalCount > 15 && (
              <Pagination
                page={centerPage}
                pages={Math.ceil(centersQuery.data.totalCount / 15)}
                total={centersQuery.data.totalCount}
                pageSize={15}
                onChange={setCenterPage}
              />
            )}
          </>
        ) : (
          <>
            <DataToolbar
              placeholder="Tìm kiếm phòng học theo tên..."
              search={roomSearch}
              onSearch={(v) => {
                setRoomSearch(v);
                setRoomPage(1);
              }}
              filters={[
                {
                  key: "centerId",
                  label: "Cơ sở",
                  value: selectedCenterId,
                  options: centerOptions,
                },
                {
                  key: "status",
                  label: "Trạng thái",
                  value: roomStatus,
                  options: [
                    { value: "", label: "Tất cả trạng thái" },
                    { value: "Active", label: "Đang hoạt động" },
                    { value: "Inactive", label: "Ngừng hoạt động" },
                  ],
                },
              ]}
              onFilterChange={(key, val) => {
                if (key === "centerId") setSelectedCenterId(val);
                if (key === "status") setRoomStatus(val as FacilityStatus | "");
                setRoomPage(1);
              }}
            />

            <DataTable<RoomDto>
              id="rooms-table"
              label="Danh sách phòng học"
              columns={roomColumns}
              rows={roomsQuery.data?.items}
              getRowId={(r) => r.id}
              loading={roomsQuery.isLoading}
              emptyTitle="Không tìm thấy phòng học nào"
              emptyDescription="Chưa có phòng học nào hoặc không khớp với bộ lọc."
            />

            {roomsQuery.data && roomsQuery.data.totalCount > 15 && (
              <Pagination
                page={roomPage}
                pages={Math.ceil(roomsQuery.data.totalCount / 15)}
                total={roomsQuery.data.totalCount}
                pageSize={15}
                onChange={setRoomPage}
              />
            )}
          </>
        )}
      </div>

      {/* Center Modal */}
      {editingCenter && (
        <Modal
          open={Boolean(editingCenter)}
          wide
          title={
            editingCenter === "new" ? "Thêm cơ sở đào tạo mới" : `Chỉnh sửa: ${editingCenter.name}`
          }
          onClose={() => openCenterEditor(null)}
          footer={
            <>
              <Button variant="default" onClick={() => openCenterEditor(null)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="center-form"
                disabled={actions.createCenter.isPending || actions.updateCenter.isPending}
              >
                {editingCenter === "new" ? "Tạo cơ sở" : "Lưu thay đổi"}
              </Button>
            </>
          }
        >
          <form id="center-form" onSubmit={handleCenterSubmit} className={styles.formGrid}>
            <label className={styles.formField}>
              <span className={styles.formLabel}>Tên cơ sở *</span>
              <input
                className={styles.formControl}
                name="name"
                required
                maxLength={100}
                placeholder="Ví dụ: Cơ sở Quận 1"
                defaultValue={editingCenter !== "new" ? editingCenter.name : ""}
              />
            </label>

            <div className={styles.formField}>
              <span className={styles.formLabel}>Địa chỉ *</span>
              <AddressPicker
                name="address"
                value={centerAddress}
                onChange={setCenterAddress}
                required
              />
            </div>

            <label className={styles.formField}>
              <span className={styles.formLabel}>Múi giờ</span>
              <input
                className={styles.formControl}
                name="timeZoneId"
                placeholder="Asia/Ho_Chi_Minh"
                defaultValue={
                  editingCenter !== "new" ? editingCenter.timeZoneId : "Asia/Ho_Chi_Minh"
                }
              />
            </label>
          </form>
        </Modal>
      )}

      {/* Room Modal */}
      {editingRoom && (
        <Modal
          open={Boolean(editingRoom)}
          title={editingRoom === "new" ? "Thêm phòng học mới" : `Chỉnh sửa: ${editingRoom.name}`}
          onClose={() => setEditingRoom(null)}
          footer={
            <>
              <Button variant="default" onClick={() => setEditingRoom(null)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="room-form"
                disabled={actions.createRoom.isPending || actions.updateRoom.isPending}
              >
                {editingRoom === "new" ? "Tạo phòng" : "Lưu thay đổi"}
              </Button>
            </>
          }
        >
          <form id="room-form" onSubmit={handleRoomSubmit} className={styles.formGrid}>
            <div className={styles.formField}>
              <span className={styles.formLabel}>Thuộc cơ sở *</span>
              <Select
                name="centerId"
                defaultValue={
                  editingRoom !== "new"
                    ? editingRoom.centerId
                    : selectedCenterId || activeCenterOptions[0]?.value || ""
                }
                options={activeCenterOptions}
                aria-label="Chọn cơ sở"
              />
            </div>

            <label className={styles.formField}>
              <span className={styles.formLabel}>Tên phòng học *</span>
              <input
                className={styles.formControl}
                name="name"
                required
                maxLength={60}
                placeholder="Ví dụ: Phòng Lab 101"
                defaultValue={editingRoom !== "new" ? editingRoom.name : ""}
              />
            </label>

            <label className={styles.formField}>
              <span className={styles.formLabel}>Sức chứa (số học viên) *</span>
              <input
                className={styles.formControl}
                name="capacity"
                type="number"
                min="1"
                max="500"
                required
                placeholder="Ví dụ: 30"
                defaultValue={editingRoom !== "new" ? editingRoom.capacity : 30}
              />
            </label>
          </form>
        </Modal>
      )}

      {/* Toggle Center Status Confirm */}
      {confirmToggleCenter && (
        <ConfirmDialog
          open={Boolean(confirmToggleCenter)}
          title={
            confirmToggleCenter.status === "Active"
              ? `Vô hiệu hóa cơ sở: ${confirmToggleCenter.name}?`
              : `Kích hoạt cơ sở: ${confirmToggleCenter.name}?`
          }
          description={
            confirmToggleCenter.status === "Active"
              ? "Cơ sở sẽ không thể được chọn khi xếp phòng mới. Các phòng thuộc cơ sở này sẽ không thể dùng cho lịch học mới."
              : "Cơ sở và các phòng thuộc cơ sở sẽ sẵn sàng để phân công cho các lớp học."
          }
          confirmLabel={confirmToggleCenter.status === "Active" ? "Vô hiệu hóa" : "Kích hoạt"}
          tone={confirmToggleCenter.status === "Active" ? "danger" : "default"}
          onClose={() => setConfirmToggleCenter(null)}
          onConfirm={handleToggleCenterStatus}
          pending={actions.activateCenter.isPending || actions.deactivateCenter.isPending}
        />
      )}

      {/* Toggle Room Status Confirm */}
      {confirmToggleRoom && (
        <ConfirmDialog
          open={Boolean(confirmToggleRoom)}
          title={
            confirmToggleRoom.status === "Active"
              ? `Vô hiệu hóa phòng học: ${confirmToggleRoom.name}?`
              : `Kích hoạt phòng học: ${confirmToggleRoom.name}?`
          }
          description={
            confirmToggleRoom.status === "Active"
              ? "Phòng học sẽ không thể gán làm phòng mặc định hoặc chọn cho buổi học mới."
              : "Phòng học sẽ sẵn sàng để phục vụ các buổi học trực tiếp."
          }
          confirmLabel={confirmToggleRoom.status === "Active" ? "Vô hiệu hóa" : "Kích hoạt"}
          tone={confirmToggleRoom.status === "Active" ? "danger" : "default"}
          onClose={() => setConfirmToggleRoom(null)}
          onConfirm={handleToggleRoomStatus}
          pending={actions.activateRoom.isPending || actions.deactivateRoom.isPending}
        />
      )}
    </AdminPage>
  );
}
