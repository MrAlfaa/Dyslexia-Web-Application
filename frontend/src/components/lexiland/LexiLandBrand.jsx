import lexilandLogo from '../../assets/lexiland/lexiland-logo.png';

const joinClasses = (...classes) => classes.filter(Boolean).join(' ');

const LexiLandBrand = ({
  href = '/',
  tagline,
  compact = false,
  className = '',
  ariaLabel = 'LexiLand home',
}) => {
  const content = (
    <>
      <img className="lex-brand__mark" src={lexilandLogo} alt="" />
      <span>
        <span className="lex-brand__name">LexiLand</span>
        {tagline ? <span className="lex-brand__tagline">{tagline}</span> : null}
      </span>
    </>
  );

  const classes = joinClasses('lex-brand', compact && 'lex-brand--compact', className);

  if (!href) {
    return <div className={classes}>{content}</div>;
  }

  return (
    <a className={joinClasses(classes, 'lex-interactive')} href={href} aria-label={ariaLabel}>
      {content}
    </a>
  );
};

export default LexiLandBrand;
