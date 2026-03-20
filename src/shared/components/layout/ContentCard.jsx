import React from 'react';
import clsx from 'clsx';

export function ContentCard({ title, children, actions, className, bodyClassName }) {
  return (
    <section className={clsx('app-card', className)}>
      {(title || actions) ? (
        <div className="app-card-header">
          {title ? <h2 className="app-card-title">{title}</h2> : <div />}
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={clsx('app-card-body', bodyClassName)}>{children}</div>
    </section>
  );
}
