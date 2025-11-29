import { useEffect } from "react";
import { usePage } from "@inertiajs/react";
import { Toaster, toast } from "sonner";
import type { PageProps } from "@inertiajs/core";

interface FlashMessages {
  success?: string;
  error?: string;
  warning?: string;
  info?: string;
}

interface AppPageProps extends PageProps {
  flash?: FlashMessages;
}

export function ToastProvider() {
  const { flash } = usePage<AppPageProps>().props;

  useEffect(() => {
    if (flash?.success) {
      toast.success(flash.success);
    }

    if (flash?.error) {
      toast.error(flash.error);
    }

    if (flash?.warning) {
      toast.warning(flash.warning);
    }

    if (flash?.info) {
      toast(flash.info);
    }
  }, [flash]);

  return (
    <Toaster 
      richColors 
      closeButton 
      position="top-right"
      theme="light"
      duration={3500}
    />
  );
}