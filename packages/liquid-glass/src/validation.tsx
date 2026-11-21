export const CUSTOM_VALIDATION_DESCRIPTION =
  "Unvalidated — not reviewed or approved by a human UI/UX team.";

export function ValidationBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`qg-validation-badge ${className}`}
      data-validation="unvalidated"
      title={CUSTOM_VALIDATION_DESCRIPTION}
      aria-label={CUSTOM_VALIDATION_DESCRIPTION}
    >
      Unvalidated
    </span>
  );
}

export function FoundationBadge() {
  return (
    <span
      className="qg-foundation-badge"
      data-foundation="ui-sdk"
      title="Behaviour from Vercel's UI SDK. This is source provenance, not human approval of Quantive's styling or composition."
    >
      SDK foundation
    </span>
  );
}
