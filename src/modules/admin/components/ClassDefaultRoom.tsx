import { useMemo, useState, type FormEvent } from "react";
import { Building2, ChevronDown, ChevronUp, DoorOpen, History, Trash2 } from "lucide-react";
import { Badge, Button, Modal } from "./ui";
import { Select, type SelectOption } from "@/shared/components/Select";
import { useClassActions, useDefaultRoomHistory } from "../hooks/useClasses";
import { useRoom, useRooms } from "../hooks/useFacilities";
import type { ClassStatus } from "../types/class.types";
import { classErrorMessage } from "../utils/classErrorMessage";
import styles from "./ClassDefaultRoom.module.css";

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(iso),
  );

export function ClassDefaultRoom({
  classId,
  classStatus,
  defaultRoomId,
}: {
  classId: string;
  classStatus: ClassStatus | "Deleted";
  defaultRoomId: string | null;
}) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState("");

  const canEdit = classStatus === "Draft" || classStatus === "Active";

  const roomQuery = useRoom(defaultRoomId);
  const allRoomsQuery = useRooms({ status: "Active", pageSize: 100 });
  const historyQuery = useDefaultRoomHistory(showHistory ? classId : null);
  const actions = useClassActions();

  const roomOptions = useMemo<SelectOption<string>[]>(() => {
    const list = allRoomsQuery.data?.items ?? [];
    return list.map((r) => ({
      value: r.id,
      label: `${r.name} · ${r.centerName} (${r.capacity} chỗ)`,
    }));
  }, [allRoomsQuery.data?.items]);

  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [applyToFuture, setApplyToFuture] = useState(false);

  const openAssignModal = () => {
    setError("");
    setSelectedRoomId(defaultRoomId ?? roomOptions[0]?.value ?? "");
    setReason("");
    setApplyToFuture(false);
    setShowAssignModal(true);
  };

  const openClearModal = () => {
    setError("");
    setReason("");
    setApplyToFuture(false);
    setShowClearModal(true);
  };

  const handleAssignSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedRoomId) {
      setError("Vui lòng chọn một phòng học.");
      return;
    }
    if (defaultRoomId && defaultRoomId !== selectedRoomId && !reason.trim()) {
      setError("Vui lòng nhập lý do thay đổi phòng học mặc định.");
      return;
    }

    try {
      await actions.setDefaultRoom.mutateAsync({
        id: classId,
        payload: {
          roomId: selectedRoomId,
          reason: reason.trim() || null,
          applyToFutureSessions: applyToFuture,
        },
      });
      setShowAssignModal(false);
    } catch (err) {
      setError(classErrorMessage(err));
    }
  };

  const handleClearSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do xóa phòng học mặc định.");
      return;
    }

    try {
      await actions.setDefaultRoom.mutateAsync({
        id: classId,
        payload: {
          roomId: null,
          reason: reason.trim(),
          applyToFutureSessions: applyToFuture,
        },
      });
      setShowClearModal(false);
    } catch (err) {
      setError(classErrorMessage(err));
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>PHÒNG HỌC MẶC ĐỊNH</span>
          <h3>{roomQuery.data ? roomQuery.data.name : "Chưa thiết lập"}</h3>
        </div>
        {canEdit && (
          <div className={styles.roomActions}>
            <Button size="sm" variant="default" onClick={openAssignModal}>
              <DoorOpen size={14} />
              {defaultRoomId ? "Đổi phòng" : "Gán phòng"}
            </Button>
            {defaultRoomId && (
              <Button size="sm" variant="danger" onClick={openClearModal}>
                <Trash2 size={14} />
                Xóa phòng
              </Button>
            )}
          </div>
        )}
      </div>

      {defaultRoomId && roomQuery.data ? (
        <div className={styles.roomCard}>
          <div className={styles.roomInfo}>
            <div className={styles.roomName}>
              <DoorOpen size={16} />
              {roomQuery.data.name}
              <Badge tone={roomQuery.data.status === "Active" ? "green" : "neutral"}>
                {roomQuery.data.status === "Active" ? "Đang hoạt động" : "Ngừng hoạt động"}
              </Badge>
            </div>
            <div className={styles.roomMeta}>
              <Building2
                size={13}
                style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}
              />
              {roomQuery.data.centerName} · Sức chứa:{" "}
              <strong>{roomQuery.data.capacity} học viên</strong>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <span>Lớp chưa được gán phòng học trực tiếp mặc định.</span>
        </div>
      )}

      {/* History Toggle */}
      <div>
        <button
          type="button"
          className={styles.historyToggle}
          onClick={() => setShowHistory((prev) => !prev)}
        >
          <History size={13} />
          {showHistory ? "Ẩn lịch sử phòng học" : "Xem lịch sử thay đổi phòng học"}
          {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {showHistory && (
          <div className={styles.historyList}>
            {historyQuery.isLoading && (
              <p style={{ fontSize: "0.8rem", color: "#8a9aa8" }}>Đang tải lịch sử...</p>
            )}
            {historyQuery.data && historyQuery.data.length === 0 && (
              <p style={{ fontSize: "0.8rem", color: "#8a9aa8" }}>
                Chưa có thay đổi phòng học nào.
              </p>
            )}
            {historyQuery.data?.map((record) => (
              <div key={record.id} className={styles.historyItem}>
                <span className={styles.historyDot} />
                <div className={styles.historyContent}>
                  <div>
                    <strong>
                      {record.previousRoomId && record.newRoomId
                        ? "Thay đổi phòng học mặc định"
                        : record.newRoomId
                          ? "Gán phòng học mặc định"
                          : "Đã xóa phòng học mặc định"}
                    </strong>
                    {" · "}
                    <small style={{ color: "#778899" }}>{formatDate(record.changedAt)}</small>
                  </div>
                  {record.reason && (
                    <div className={styles.historyReason}>Lý do: &quot;{record.reason}&quot;</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign / Change Room Modal */}
      {showAssignModal && (
        <Modal
          open={showAssignModal}
          title={defaultRoomId ? "Thay đổi phòng học mặc định" : "Gán phòng học mặc định cho lớp"}
          onClose={() => setShowAssignModal(false)}
          footer={
            <>
              <Button variant="default" onClick={() => setShowAssignModal(false)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="assign-room-form"
                disabled={actions.setDefaultRoom.isPending}
              >
                {defaultRoomId ? "Lưu thay đổi" : "Gán phòng"}
              </Button>
            </>
          }
        >
          <form id="assign-room-form" onSubmit={handleAssignSubmit} className={styles.dialogForm}>
            {error && <div className={styles.errorBanner}>{error}</div>}

            <div className={styles.dialogField}>
              <span className={styles.dialogLabel}>Chọn phòng học hoạt động *</span>
              <Select
                value={selectedRoomId}
                onChange={setSelectedRoomId}
                options={roomOptions}
                aria-label="Chọn phòng học"
              />
            </div>

            {defaultRoomId && (
              <div className={styles.dialogField}>
                <span className={styles.dialogLabel}>Lý do thay đổi phòng * (Bắt buộc)</span>
                <input
                  className={styles.dialogControl}
                  required
                  maxLength={500}
                  placeholder="Ví dụ: Chuyển sang phòng lớn hơn do lớp tăng số lượng học viên"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            )}

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={applyToFuture}
                onChange={(e) => setApplyToFuture(e.target.checked)}
              />
              <span>
                Áp dụng phòng mới này cho tất cả các buổi học chưa diễn ra trong tương lai
              </span>
            </label>
          </form>
        </Modal>
      )}

      {/* Clear Room Modal */}
      {showClearModal && (
        <Modal
          open={showClearModal}
          title="Xóa phòng học mặc định của lớp"
          onClose={() => setShowClearModal(false)}
          footer={
            <>
              <Button variant="default" onClick={() => setShowClearModal(false)}>
                Hủy
              </Button>
              <Button
                variant="danger"
                type="submit"
                form="clear-room-form"
                disabled={actions.setDefaultRoom.isPending}
              >
                Xác nhận xóa
              </Button>
            </>
          }
        >
          <form id="clear-room-form" onSubmit={handleClearSubmit} className={styles.dialogForm}>
            {error && <div className={styles.errorBanner}>{error}</div>}

            <p style={{ fontSize: "0.85rem", color: "#4f6274" }}>
              Sau khi xóa, lớp sẽ không có phòng học mặc định. Các lịch học Offline tạo mới sẽ yêu
              cầu phải gán phòng mặc định lại.
            </p>

            <div className={styles.dialogField}>
              <span className={styles.dialogLabel}>Lý do xóa phòng mặc định * (Bắt buộc)</span>
              <input
                className={styles.dialogControl}
                required
                maxLength={500}
                placeholder="Ví dụ: Lớp chuyển sang hình thức học trực tuyến hoàn toàn"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={applyToFuture}
                onChange={(e) => setApplyToFuture(e.target.checked)}
              />
              <span>Đồng thời hủy gán phòng cho các buổi học trong tương lai</span>
            </label>
          </form>
        </Modal>
      )}
    </section>
  );
}
