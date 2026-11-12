import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button, Modal } from "../ui";
import styles from "./users.module.css";

/**
 * The server returns the temporary password once and never stores it in plain text,
 * so this is the only chance to copy it.
 */
export function TemporaryPasswordDialog({
  email,
  password,
  onClose,
}: {
  email: string;
  password: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${email}\n${password}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal
      open
      title="Đã tạo tài khoản"
      description={
        <>
          Gửi cho <strong>{email}</strong>. Mật khẩu chỉ hiện <strong>một lần</strong>.
        </>
      }
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          Đã lưu mật khẩu
        </Button>
      }
    >
      <div className={styles.passwordBox}>
        <code aria-label="Mật khẩu tạm">{password}</code>
        <Button
          size="sm"
          icon={copied ? <Check size={15} /> : <Copy size={15} />}
          onClick={() => void copy()}
        >
          {copied ? "Đã sao chép" : "Sao chép"}
        </Button>
      </div>
    </Modal>
  );
}
