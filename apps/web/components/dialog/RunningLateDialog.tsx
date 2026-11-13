import {
  RUNNING_LATE_DELAY_OPTIONS,
  RUNNING_LATE_MESSAGE_MAX_LENGTH,
  type RunningLateDelayMinutes,
} from "@calcom/features/bookings/lib/runningLate";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Label, Select, TextArea } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import type { Dispatch, SetStateAction } from "react";
import { Controller, useForm } from "react-hook-form";

interface IRunningLateDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  bookingId: number;
}

interface FormValues {
  delayMinutes: RunningLateDelayMinutes;
  message: string;
}

export const RunningLateDialog = ({ isOpenDialog, setIsOpenDialog, bookingId }: IRunningLateDialog) => {
  const { t } = useLocale();

  const { control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      delayMinutes: RUNNING_LATE_DELAY_OPTIONS[0],
      message: "",
    },
  });

  const { mutate: sendRunningLate, isPending } = trpc.viewer.bookings.runningLate.useMutation({
    onSuccess(data) {
      if (data.sent === 0) {
        showToast(t("running_late_no_recipients"), "warning");
      } else {
        showToast(t("running_late_sent_toast", { count: data.sent }), "success");
      }
      reset();
      setIsOpenDialog(false);
    },
    onError(error) {
      showToast(error.message || t("unexpected_error_try_again"), "error");
    },
  });

  const onSubmit = (data: FormValues) => {
    sendRunningLate({
      bookingId,
      delayMinutes: data.delayMinutes,
      message: data.message.trim() || undefined,
    });
  };

  const delayOptions = RUNNING_LATE_DELAY_OPTIONS.map((minutes) => ({
    label: t("running_late_delay_minutes", { count: minutes }),
    value: minutes,
  }));

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent enableOverflow>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader title={t("running_late")} subtitle={t("running_late_dialog_description")} />
          <div className="mb-4">
            <Label htmlFor="delayMinutes" className="mb-2 block font-medium text-emphasis text-sm">
              {t("running_late_delay_label")}
            </Label>
            <Controller
              name="delayMinutes"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  inputId="delayMinutes"
                  options={delayOptions}
                  onChange={(option) => {
                    if (option) field.onChange(option.value);
                  }}
                  value={delayOptions.find((opt) => opt.value === field.value)}
                />
              )}
            />
          </div>

          <div className="mb-4">
            <Label htmlFor="message" className="mb-2 block font-medium text-emphasis text-sm">
              {t("running_late_message_label")}{" "}
              <span className="font-normal text-subtle">({t("optional")})</span>
            </Label>
            <Controller
              name="message"
              control={control}
              render={({ field }) => (
                <TextArea
                  {...field}
                  id="message"
                  maxLength={RUNNING_LATE_MESSAGE_MAX_LENGTH}
                  placeholder={t("running_late_message_placeholder")}
                  rows={3}
                />
              )}
            />
          </div>

          <DialogFooter showDivider className="mt-8">
            <Button
              type="button"
              color="secondary"
              onClick={() => setIsOpenDialog(false)}
              disabled={isPending}>
              {t("cancel")}
            </Button>
            <Button type="submit" color="primary" disabled={isPending} loading={isPending}>
              {t("running_late_send")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
