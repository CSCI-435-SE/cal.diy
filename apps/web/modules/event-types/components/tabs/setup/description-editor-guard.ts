/**
 * The Lexical editor behind the event type description calls `setText` twice while it mounts,
 * echoing back the value it was just seeded with. Writing that echo into the form is what let
 * users save an event type they had not touched: `md.render` -> `turndown` is lossy, so the echo
 * can differ from what is stored ("**bold**" comes back as "****bold****"), react-hook-form then
 * sees the form as changed, and the next save wrote the mangled text to the database.
 *
 * This guard answers one question per emission: is this the user editing, or the editor echoing?
 * It latches on the first differing value so that every later emission is treated as an edit -
 * including clearing the field back to the echoed text, which must still be saved.
 *
 * See https://github.com/CSCI-435-SE/cal.diy/issues/10
 */
export function createDescriptionEditorGuard(): (markdownValue: string) => boolean {
  let mountEcho: string | null = null;
  let hasUserEdited = false;

  return function isUserEdit(markdownValue: string): boolean {
    if (hasUserEdited) return true;

    if (mountEcho === null) {
      mountEcho = markdownValue;
    }
    if (markdownValue === mountEcho) return false;

    hasUserEdited = true;
    return true;
  };
}
