import { createElement, isValidElement } from 'react';

const allowedVariants = new Set(['primary', 'secondary', 'quiet', 'danger']);

const joinClasses = (...classes) => classes.filter(Boolean).join(' ');

const renderIcon = (icon) => {
  if (!icon) return null;

  if (isValidElement(icon)) {
    return icon;
  }

  return createElement(icon, {
    className: 'lex-expedition-button__icon',
    'aria-hidden': true,
  });
};

const ExpeditionButton = ({
  icon,
  variant = 'primary',
  children,
  className = '',
  href,
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

  if (href) {
    return (
      <a className={classes} href={href} {...buttonProps}>
        {content}
      </a>
    );
  }

  return (
    <button className={classes} type="button" {...buttonProps}>
      {content}
    </button>
  );
};

export default ExpeditionButton;
