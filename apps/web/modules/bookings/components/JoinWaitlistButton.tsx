import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useBookerTime } from "@calcom/features/bookings/Booker/hooks/useBookerTime";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";

/** Joins the waitlist for a whole `date` (YYYY-MM-DD in booker timezone), or only `slotStart` when given. */
export const JoinWaitlistButton = ({
  date,
  slotStart,
  label,
  className,
}: {
  date: string;
  slotStart?: string;
  label: string;
  className?: string;
}) => {
  const { t } = useLocale();
  const eventId = useBookerStoreContext((state) => state.eventId);
  const { timezone } = useBookerTime();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  if (!eventId) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventTypeId: eventId, name, email, timeZone: timezone, date, slotStart }),
      });
      if (!res.ok) throw new Error(String(res.status));
      showToast(t("waitlist_joined"), "success");
      setOpen(false);
    } catch {
      showToast(t("waitlist_join_failed"), "error");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <Button
        color="secondary"
        className={classNames("min-h-9 mb-2 flex h-auto w-full justify-center py-2", className)}
        onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submit}>
            <DialogHeader title={label} subtitle={t("waitlist_join_description")} />
            <div className="space-y-4">
              <TextField
                name="name"
                autoComplete="name"
                label={t("your_name")}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <TextField
                name="email"
                autoComplete="email"
                label={t("email_address")}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <DialogFooter noSticky>
              <DialogClose />
              <Button type="submit" loading={isPending}>
                {t("waitlist_join")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
