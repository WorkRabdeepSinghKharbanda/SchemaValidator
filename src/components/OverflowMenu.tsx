import { useState, type ReactNode } from "react";

export interface MenuAction {
  label: string;
  onClick: () => void;
}

export function OverflowMenu({ icon = "⋯", actions, extra }: { icon?: string; actions: MenuAction[]; extra?: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-menu-wrap">
      <button className="overflow-trigger" onClick={() => setOpen((v) => !v)} title="More actions" aria-label="More actions" aria-haspopup="menu" aria-expanded={open}>
        {icon}
      </button>
      {open && (
        <div className="overflow-menu" onMouseLeave={() => setOpen(false)}>
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={() => {
                a.onClick();
                setOpen(false);
              }}
            >
              {a.label}
            </button>
          ))}
          {extra}
        </div>
      )}
    </div>
  );
}
