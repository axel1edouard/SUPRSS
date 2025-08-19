import { Link } from 'react-router-dom';

function ButterflyLogo({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Logo SUPRSS (papillon)">
      <rect x="30" y="22" width="4" height="20" rx="2" fill="var(--brand-700)" />
      <ellipse cx="22" cy="28" rx="14" ry="10" fill="var(--brand-300)" />
      <ellipse cx="42" cy="28" rx="14" ry="10" fill="var(--brand-400)" />
      <ellipse cx="24" cy="40" rx="12" ry="9" fill="var(--brand-200)" />
      <ellipse cx="40" cy="40" rx="12" ry="9" fill="var(--brand-300)" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="home-hero">
      <div className="home-hero__content">
        <div className="home-hero__logo">
          <ButterflyLogo />
          <h1>SUPRSS</h1>
        </div>

        <p className="home-hero__tagline">
          Le lecteur RSS collaboratif qui rassemble vos sources… et vos équipes.
        </p>

        {/* Crédit discret sous la tagline */}
        <p className="home-hero__credit">
          par <strong>InfoFlux Pro</strong> — A. EDOUARD
        </p>

        {/* Bouton centré */}
        <div className="home-hero__ctas">
          <Link className="btn btn--primary btn-lg" to="/login">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}
