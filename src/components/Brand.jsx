import { Link } from "react-router-dom";

// Text signature for the club; does not replace Depilamor's official logo.
export default function Brand({ to = "/app/inicio", light = false }) {
  return (
    <Link
      className={`brand${light ? " brand-light" : ""}`}
      to={to}
      aria-label="Clube DNA Depilamor"
    >
      <span className="brand-monogram" aria-hidden="true">
        dna
      </span>
      <span className="brand-signature">
        <strong>clube DNA</strong>
        <span>DEPILAMOR</span>
      </span>
    </Link>
  );
}
