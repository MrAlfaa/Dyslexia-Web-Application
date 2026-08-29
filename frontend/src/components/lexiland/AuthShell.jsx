import { Map, ShieldCheck } from 'lucide-react';
import LexiLandBrand from './LexiLandBrand';

const AuthShell = ({
  title,
  description,
  children,
  secondaryAction,
  media,
  brandTagline = 'Guardian Console',
  mediaDescription = 'Monitor learning progress in one calm, secure workspace.',
}) => (
  <main className="lex-auth-page">
    <section className="lex-auth-shell" aria-labelledby="lex-auth-title">
      <aside className="lex-auth-shell__media" aria-label="LexiLand guardian workspace">
        <div className="lex-auth-shell__media-art" aria-hidden="true">
          {media || <Map size={72} strokeWidth={1.5} />}
        </div>
        <div className="lex-auth-shell__media-copy">
          <LexiLandBrand href="/" tagline={brandTagline} compact />
          <p>
            <ShieldCheck aria-hidden="true" size={18} strokeWidth={2.25} />
            {mediaDescription}
          </p>
        </div>
      </aside>

      <div className="lex-auth-shell__content">
        <div className="lex-auth-shell__secondary">{secondaryAction}</div>
        <header className="lex-auth-shell__heading">
          <h1 id="lex-auth-title">{title}</h1>
          {description ? <p>{description}</p> : null}
        </header>
        <div className="lex-auth-shell__form">{children}</div>
      </div>
    </section>
  </main>
);

export default AuthShell;
