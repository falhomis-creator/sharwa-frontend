import type { Session } from "@/features/dashboard-shell/schemas";
import type { NoteActor } from "@/mocks/customers/state";

/** Who writes a note: the owner, or the staff member by name (the mock session has no staff id). */
export function noteActor(session: Session): NoteActor {
  if (session.kind === "merchant" || !session.staff) return { key: "owner", name: "فارس العمري", isOwner: true };
  return { key: `staff:${session.staff.full_name}`, name: session.staff.full_name, isOwner: false };
}
