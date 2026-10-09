import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";

type UnsavedChangesDialogProps = {
  open: boolean;
  onStay: () => void;
  onDiscardAndLeave: () => void;
  onSaveAndLeave: () => void;
};

export function UnsavedChangesDialog({
  open,
  onStay,
  onDiscardAndLeave,
  onSaveAndLeave,
}: UnsavedChangesDialogProps) {
  const { t } = useLocale();

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onStay();
      }}>
      <DialogContent
        title={t("unsaved_changes")}
        description={t("unsaved_changes_event_type_description")}
        Icon="circle-alert"
        type="confirmation">
        <DialogClose variant="icon" StartIcon="x" className="absolute top-4 ltr:right-4 rtl:left-4">
          <span className="sr-only">{t("close")}</span>
        </DialogClose>
        <DialogFooter className="mt-6">
          <Button color="minimal" data-testid="unsaved-changes-discard" onClick={onDiscardAndLeave}>
            {t("dont_save_and_leave")}
          </Button>
          <Button data-testid="unsaved-changes-save" onClick={onSaveAndLeave}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
