import "./OrbitSpinner.css";

/**
 * OrbitSpinner — a unique, intuitive loading indicator.
 *
 * Three colored orbs orbit around a central pulse, with a soft glow trail.
 * The design communicates "something is in motion" more intuitively than a
 * generic spinning circle. The orbs speed up slightly as they complete each
 * revolution, giving a sense of progress.
 */
export default function OrbitSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="orbit-spinner-wrap" role="status" aria-live="polite">
      <div className="orbit-spinner">
        <div className="orbit-core" />
        <div className="orbit-ring orbit-ring-1">
          <div className="orbit-orb orb-1" />
        </div>
        <div className="orbit-ring orbit-ring-2">
          <div className="orbit-orb orb-2" />
        </div>
        <div className="orbit-ring orbit-ring-3">
          <div className="orbit-orb orb-3" />
        </div>
      </div>
      <span className="orbit-label">{label}</span>
    </div>
  );
}

/** Full-page version that centers itself in the viewport */
export function FullPageSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="orbit-fullpage">
      <OrbitSpinner label={label} />
    </div>
  );
}
