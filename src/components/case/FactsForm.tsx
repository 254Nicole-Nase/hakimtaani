import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FieldSpec } from "./fact-fields";

type Props<T extends Record<string, unknown>> = {
  fields: FieldSpec<T>[];
  facts: T;
  missing: string[];
  onChange: (facts: T) => void;
};

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function FactsForm<T extends Record<string, unknown>>({
  fields,
  facts,
  missing,
  onChange,
}: Props<T>) {
  const set = (key: string, value: unknown) => onChange({ ...facts, [key]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields
        .filter((f) => !f.show || f.show(facts))
        .map((field) => {
          const value = facts[field.key];
          const isMissing = missing.includes(field.key);
          const id = `fact-${field.key}`;
          const wide = field.kind === "yesno" || field.label.length > 45;

          return (
            <div key={field.key} className={`space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}>
              <Label htmlFor={id} className={isMissing ? "text-destructive" : ""}>
                {field.label}
                {isMissing && <span className="ml-1 text-xs font-normal">— needed</span>}
              </Label>

              {field.kind === "select" && (
                <select
                  id={id}
                  className={`${selectClass} ${isMissing ? "border-destructive" : ""}`}
                  value={(value as string | null) ?? ""}
                  onChange={(e) => set(field.key, e.target.value || null)}
                >
                  <option value="">Choose…</option>
                  {field.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}

              {field.kind === "yesno" && (
                <div id={id} role="radiogroup" className="flex gap-2">
                  {(
                    [
                      [true, "Yes"],
                      [false, "No"],
                      [null, "Not sure"],
                    ] as const
                  ).map(([v, label]) => (
                    <button
                      key={label}
                      type="button"
                      role="radio"
                      aria-checked={value === v}
                      onClick={() => set(field.key, v)}
                      className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                        value === v
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background hover:bg-accent"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {(field.kind === "money" || field.kind === "number") && (
                <div className="relative">
                  {field.kind === "money" && (
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      KES
                    </span>
                  )}
                  <Input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    className={`${field.kind === "money" ? "pl-12" : ""} ${isMissing ? "border-destructive" : ""}`}
                    value={value == null ? "" : String(value)}
                    onChange={(e) =>
                      set(
                        field.key,
                        e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
                      )
                    }
                  />
                </div>
              )}

              {field.kind === "date" && (
                <Input
                  id={id}
                  type="date"
                  className={isMissing ? "border-destructive" : ""}
                  value={(value as string | null) ?? ""}
                  onChange={(e) => set(field.key, e.target.value || null)}
                />
              )}

              {field.kind === "text" && (
                <Input
                  id={id}
                  value={(value as string | null) ?? ""}
                  onChange={(e) => set(field.key, e.target.value || null)}
                />
              )}

              {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
            </div>
          );
        })}
    </div>
  );
}
