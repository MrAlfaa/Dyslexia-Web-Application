import { cloneElement, createElement, isValidElement } from 'react';
import { Link } from 'react-router-dom';

const allowedVariants = new Set(['primary', 'secondary', 'quiet', 'danger']);

const joinClasses = (...classes) => classes.filter(Boolean).join(' ');

const isInternalHref = (href) =>
  typeof href === 'string' && href.startsWith('/') && !href.startsWith('//');

const renderIcon = (icon) => {
  if (!icon) return null;

  if (isValidElement(icon)) {
    return cloneElement(icon, {
      className: joinClasses('lex-expedition-button__icon', icon.props.className),
      'aria-hidden': true,
      focusable: false,
    });
  }

  return createElement(icon, {
    className: 'lex-expedition-button__icon',
    'aria-hidden': true,
    focusable: false,
  });
};

const ExpeditionButton = ({
  icon,
  variant = 'primary',
  children,
  className = '',
  href,
  disabled = false,
  'aria-disabled': ariaDisabled,
  ...buttonProps
}) => {
  const normalizedVariant = allowedVariants.has(variant) ? variant : 'primary';
  const classes = joinClasses(
    'lex-interactive',
    'lex-expedition-button',
    `lex-expedition-button--${normalizedVariant}`,
    className,
  );
  const content = (
    <>
      {renderIcon(icon)}
      <span>{children}</span>
    </>
  );

  if (href && (disabled || ariaDisabled === true || ariaDisabled === 'true')) {
    return (
      <span className={classes} role="link" aria-disabled="true">
        {content}
      </span>
    );
  }

  if (href && isInternalHref(href)) {
    return (
      <Link className={classes} to={href} {...buttonProps}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a className={classes} href={href} {...buttonProps}>
        {content}
      </a>
    );
  }

  return (
    <button
      className={classes}
      type="button"
      disabled={disabled}
      aria-disabled={ariaDisabled}
      {...buttonProps}
    >
      {content}
    </button>
  );
};

export default ExpeditionButton;
