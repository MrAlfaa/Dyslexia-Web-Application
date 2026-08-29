import { ArrowLeft, Star, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import LexiLandBrand from './LexiLandBrand';

const isInternalHref = (href) =>
  typeof href === 'string' && href.startsWith('/') && !href.startsWith('//');

const NavigationLink = ({ href, children, ...linkProps }) => {
  if (isInternalHref(href)) {
    return (
      <Link to={href} {...linkProps}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} {...linkProps}>
      {children}
    </a>
  );
};

const ChildTopBar = ({
  profileHref = '/profile',
  backHref,
  brandHref = '/dashboard',
  stars,
  children,
  backLabel = 'Go back',
  profileLabel = 'Open profile',
  starsAriaLabel,
  brandTagline,
}) => (
  <header className="lex-child-topbar">
    <div className="lex-child-topbar__start">
      {backHref ? (
        <NavigationLink
          className="lex-interactive lex-child-topbar__icon-link"
          href={backHref}
          aria-label={backLabel}
        >
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={2.35} />
        </NavigationLink>
      ) : null}
      <LexiLandBrand href={brandHref} tagline={brandTagline} compact />
    </div>

    <div className="lex-child-topbar__actions">{children}</div>

    <div className="lex-child-topbar__end">
      {stars !== undefined && stars !== null ? (
        <span
          className="lex-child-topbar__stars"
          aria-label={starsAriaLabel || `${stars} stars`}
        >
          <Star aria-hidden="true" size={18} strokeWidth={2.25} />
          <span>{stars}</span>
        </span>
      ) : null}
      <NavigationLink
        className="lex-interactive lex-child-topbar__icon-link"
        href={profileHref}
        aria-label={profileLabel}
      >
        <UserRound aria-hidden="true" size={21} strokeWidth={2.35} />
      </NavigationLink>
    </div>
  </header>
);

export default ChildTopBar;
