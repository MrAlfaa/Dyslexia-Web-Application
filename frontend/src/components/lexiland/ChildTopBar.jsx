import { ArrowLeft, Star, UserRound } from 'lucide-react';
import LexiLandBrand from './LexiLandBrand';

const ChildTopBar = ({
  profileHref = '/profile',
  backHref,
  brandHref = '/dashboard',
  stars,
  children,
  backLabel = 'Go back',
  profileLabel = 'Open profile',
  brandTagline,
}) => (
  <header className="lex-child-topbar">
    <div className="lex-child-topbar__start">
      {backHref ? (
        <a
          className="lex-interactive lex-child-topbar__icon-link"
          href={backHref}
          aria-label={backLabel}
        >
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={2.35} />
        </a>
      ) : null}
      <LexiLandBrand href={brandHref} tagline={brandTagline} compact />
    </div>

    <div className="lex-child-topbar__actions">{children}</div>

    <div className="lex-child-topbar__end">
      {stars !== undefined && stars !== null ? (
        <span className="lex-child-topbar__stars" aria-label={`${stars} stars`}>
          <Star aria-hidden="true" size={18} strokeWidth={2.25} />
          <span>{stars}</span>
        </span>
      ) : null}
      <a
        className="lex-interactive lex-child-topbar__icon-link"
        href={profileHref}
        aria-label={profileLabel}
      >
        <UserRound aria-hidden="true" size={21} strokeWidth={2.35} />
      </a>
    </div>
  </header>
);

export default ChildTopBar;
