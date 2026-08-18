import React from "react";
import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { uiStore } from "../../../app/store/ui.store.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { SIDE_NAV_GROUPS, canSeeNavItem } from "../../../app/navigation/side-nav.manifest.js";

const linkBase =
  "group relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light/50";
const linkActive =
  "bg-brand-primary/10 text-brand-deep font-semibold ring-1 ring-brand-primary/20 " +
  "before:absolute before:left-1 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-brand-primary";
const linkIdle = "text-slate-700 hover:bg-slate-900/5";

function Item({ to, icon: Icon, label, collapsed }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => clsx(linkBase, isActive ? linkActive : linkIdle)}
      title={collapsed ? label : undefined}
    >
      <Icon className="h-4 w-4 text-slate-500 group-hover:text-slate-700" />
      {collapsed ? <span className="sr-only">{label}</span> : <span className="truncate">{label}</span>}
    </NavLink>
  );
}

function Group({ group, collapsed, hasAny, can, first, showSection }) {
  const items = group.items.filter((item) => canSeeNavItem(item, hasAny, can, group.anyGroups));
  if (!items.length) return null;
  return (
    <React.Fragment>
      {showSection ? (
        <>
          <div className="px-2 pt-2"><div className="h-px w-full bg-border-subtle" /></div>
          <div className={clsx("px-2 pt-2 text-[11px] font-semibold tracking-wide text-slate-500", collapsed && "text-center")}>
            {group.section}
          </div>
        </>
      ) : !first && group.major ? (
        <div className="px-2 pt-2"><div className="h-px w-full bg-border-subtle" /></div>
      ) : null}
      <div
        className={clsx(
          group.major
            ? "px-2 pt-2 text-[11px] font-semibold tracking-wide text-slate-500"
            : "mt-2 px-2 text-[10px] font-semibold tracking-wide text-slate-500/90",
          collapsed && group.major && "text-center",
        )}
      >
        {group.label}
      </div>
      <nav className={clsx("space-y-1", !group.major && "mt-1")}>
        {items.map((item) => (
          <Item key={`${group.label}:${item.routeKey}`} {...item} collapsed={collapsed} />
        ))}
      </nav>
    </React.Fragment>
  );
}

export function SideNav() {
  const sidebarOpen = uiStore((s) => s.sidebarOpen);
  const { hasAny, can } = usePermissions();
  const visibleGroups = SIDE_NAV_GROUPS.filter((group) =>
    group.items.some((item) => canSeeNavItem(item, hasAny, can, group.anyGroups)),
  );

  return (
    <aside
      className={clsx(
        "relative h-screen overflow-y-scroll border-r border-border-subtle bg-white/70 backdrop-blur transition-all",
        sidebarOpen ? "w-64" : "w-16",
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-brand-primary/10 to-transparent" />
      <div className="relative flex h-full flex-col gap-4 p-3">
        <div className={clsx("flex items-center gap-2 px-2 pt-2", !sidebarOpen && "justify-center")}>
          <div className="h-9 w-9 rounded-xl bg-brand-primary/15 ring-1 ring-brand-primary/20 shadow-sm flex items-center justify-center text-brand-primary font-bold">AB</div>
          {sidebarOpen ? (
            <div>
              <div className="text-sm font-semibold text-brand-deep leading-none">AptBooks</div>
              <div className="mt-0.5 text-[11px] text-slate-500 leading-none">Accounting</div>
            </div>
          ) : null}
        </div>

        {visibleGroups.map((group, index) => (
          <Group
            key={group.label}
            group={group}
            collapsed={!sidebarOpen}
            hasAny={hasAny}
            can={can}
            first={index === 0}
            showSection={Boolean(group.section && visibleGroups[index - 1]?.section !== group.section)}
          />
        ))}

        <div className="mt-auto px-2 pb-2 text-center text-[10px] text-slate-400">
          {sidebarOpen ? "AptBooks" : "AB"}
        </div>
      </div>
    </aside>
  );
}
