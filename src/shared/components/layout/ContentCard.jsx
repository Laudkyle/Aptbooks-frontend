import React from 'react'; 

export function ContentCard({ title, children, actions }) {
  return (
    <section className="app-card">
      {(title || actions) ? (
        <div className="app-card-header">
          {title ? <h2 className="app-card-title">{title}</h2> : <div />}
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="app-card-body">{children}</div>
    </section>
  ); 
}
