import { toast } from "sonner";

import {
  TOAST_CALL_OUT_CLASS_NAME,
  ToastCallout,
  type ToastVariant,
} from "@/components/toast-callout";

function showToast(variant: ToastVariant, message: string, duration = 5000) {
  toast.custom((id) => <ToastCallout id={id} message={message} variant={variant} />, {
    duration,
    className: TOAST_CALL_OUT_CLASS_NAME,
  });
}

export const notify = {
  success(message: string) {
    showToast("success", message, 4000);
  },
  error(message: string) {
    showToast("error", message, 6000);
  },
  info(message: string) {
    showToast("info", message, 5000);
  },
  warning(message: string) {
    showToast("warning", message, 5000);
  },
};
