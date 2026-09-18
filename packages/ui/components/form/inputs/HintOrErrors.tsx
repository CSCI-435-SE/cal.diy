import type { FieldValues } from "react-hook-form";
import { useFormContext } from "react-hook-form";
import { Icon } from "../../icon";
import { InputError } from "./InputError";

type hintsOrErrorsProps = {
  hintErrors?: string[];
  fieldName: string;
  t: (key: string) => string;
};

export function HintsOrErrors<T extends FieldValues = FieldValues>({
  hintErrors,
  fieldName,
  t,
}: hintsOrErrorsProps) {
  const methods = useFormContext() as ReturnType<typeof useFormContext> | null;
  /* If there's no methods it means we're using these components outside a React Hook Form context */
  if (!methods) return null;
  const { formState } = methods;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const fieldErrors: FieldErrors<T> | undefined = formState.errors[fieldName];
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const fieldValue: unknown = methods.getValues(fieldName);
  // dirtyFields[fieldName] stays true even after the field is cleared back to empty
  // (RHF never un-dirties a field), so use the live value to gate colored hints instead -
  // otherwise typing then deleting a character leaves every hint stuck red.
  const hasValue = typeof fieldValue === "string" ? fieldValue.length > 0 : !!fieldValue;

  if (!hintErrors && fieldErrors && !fieldErrors.message) {
    // no hints passed, field errors exist and they are custom ones
    return (
      <div className="text-gray text-default mt-2 flex items-center text-sm">
        <ul className="ml-2">
          {Object.keys(fieldErrors).map((key: string) => {
            return (
              <li key={key} className="text-blue-700">
                {t(`${fieldName}_hint_${key}`)}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (hintErrors && fieldErrors) {
    // hints passed, field errors exist
    return (
      <div className="text-gray text-default mt-2 flex items-center text-sm">
        <ul className="ml-2">
          {hintErrors.map((key: string) => {
            const error = fieldErrors[key] || fieldErrors.message;
            return (
              <li
                key={key}
                data-testid="hint-error"
                className={error !== undefined ? (hasValue ? "text-error" : "") : "text-green-600"}>
                {error !== undefined ? (
                  hasValue ? (
                    <Icon
                      name="x"
                      size="12"
                      strokeWidth="3"
                      className="-ml-1 inline-block ltr:mr-2 rtl:ml-2"
                    />
                  ) : (
                    <Icon
                      name="circle"
                      fill="currentColor"
                      size="5"
                      className="inline-block ltr:mr-2 rtl:ml-2"
                    />
                  )
                ) : (
                  <Icon
                    name="check"
                    size="12"
                    strokeWidth="3"
                    className="-ml-1 inline-block ltr:mr-2 rtl:ml-2"
                  />
                )}
                {t(`${fieldName}_hint_${key}`)}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // errors exist, not custom ones, just show them as is
  if (fieldErrors) {
    return <InputError message={fieldErrors.message} />;
  }

  if (!hintErrors) return null;

  // hints passed, no errors exist, proceed to just show hints
  return (
    <div className="text-gray text-default mt-2 flex items-center text-sm">
      <ul className="ml-2">
        {hintErrors.map((key: string) => {
          // if field has content, and no error exist, show checked status and color
          return (
            <li key={key} className={hasValue ? "text-green-600" : ""}>
              {hasValue ? (
                <Icon
                  name="check"
                  size="12"
                  strokeWidth="3"
                  className="-ml-1 inline-block ltr:mr-2 rtl:ml-2"
                />
              ) : (
                <Icon name="circle" fill="currentColor" size="5" className="inline-block ltr:mr-2 rtl:ml-2" />
              )}
              {t(`${fieldName}_hint_${key}`)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
