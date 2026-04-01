import { type ReactNode, useEffect, useCallback } from 'react';
import { Command } from 'cmdk';
import { Search } from 'lucide-react';

export interface CommandItem {
  id: string;
  label: string;
  category: 'player' | 'team' | 'screen' | 'action';
  icon?: ReactNode;
  keywords?: string[];
  onSelect: () => void;
}

interface MfdCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  placeholder?: string;
}

const categoryLabels: Record<string, string> = {
  player: 'Players',
  team: 'Teams',
  screen: 'Screens',
  action: 'Actions',
};

const categoryOrder = ['action', 'screen', 'player', 'team'];

export function MfdCommandPalette({
  open,
  onOpenChange,
  items,
  placeholder = 'Search players, teams, screens...',
}: MfdCommandPaletteProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    },
    [open, onOpenChange],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!open) return null;

  const grouped = new Map<string, CommandItem[]>();
  for (const item of items) {
    const existing = grouped.get(item.category) ?? [];
    existing.push(item);
    grouped.set(item.category, existing);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '20vh',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        animation: 'mfd-fadein var(--mfd-motion-fast)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <Command
        style={{
          width: 540,
          maxWidth: 'calc(100vw - 32px)',
          background: 'var(--mfd-surface)',
          border: '1px solid var(--mfd-border)',
          borderRadius: 'var(--mfd-rad-xl)',
          boxShadow: 'var(--mfd-shadow-lg)',
          overflow: 'hidden',
          animation: 'mfd-slideIn var(--mfd-motion-normal)',
          fontFamily: 'var(--mfd-font-sans)',
        }}
        label="Command palette"
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--mfd-sp-sm)',
          padding: 'var(--mfd-sp-md) var(--mfd-sp-lg)',
          borderBottom: '1px solid var(--mfd-border)',
        }}>
          <Search size={16} style={{ color: 'var(--mfd-text-faint)', flexShrink: 0 }} />
          <Command.Input
            placeholder={placeholder}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--mfd-text)',
              fontFamily: 'var(--mfd-font-sans)',
              fontSize: '0.875rem',
            }}
          />
          <kbd style={{
            padding: '2px 6px',
            fontSize: '0.625rem',
            fontFamily: 'var(--mfd-font-mono)',
            color: 'var(--mfd-text-faint)',
            background: 'var(--mfd-bg-3)',
            border: '1px solid var(--mfd-border)',
            borderRadius: 'var(--mfd-rad-sm)',
          }}>
            ESC
          </kbd>
        </div>

        <Command.List
          style={{
            maxHeight: 360,
            overflow: 'auto',
            padding: 'var(--mfd-sp-sm)',
          }}
        >
          <Command.Empty
            style={{
              padding: 'var(--mfd-sp-xl)',
              textAlign: 'center',
              color: 'var(--mfd-text-faint)',
              fontSize: '0.8125rem',
            }}
          >
            No results found
          </Command.Empty>

          {categoryOrder.map((cat) => {
            const catItems = grouped.get(cat);
            if (!catItems?.length) return null;

            return (
              <Command.Group
                key={cat}
                heading={categoryLabels[cat]}
                style={{
                  padding: '0',
                }}
              >
                <div style={{
                  padding: '6px 8px 2px',
                  fontSize: '0.625rem',
                  fontFamily: 'var(--mfd-font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--mfd-text-faint)',
                }}>
                  {categoryLabels[cat]}
                </div>
                {catItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.label}
                    keywords={item.keywords}
                    onSelect={() => {
                      item.onSelect();
                      onOpenChange(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--mfd-sp-sm)',
                      padding: '8px 10px',
                      fontSize: '0.8125rem',
                      color: 'var(--mfd-text)',
                      borderRadius: 'var(--mfd-rad-md)',
                      cursor: 'pointer',
                      transition: 'background var(--mfd-motion-fast)',
                    }}
                    data-cmdk-item=""
                  >
                    {item.icon && (
                      <span style={{ color: 'var(--mfd-text-dim)', display: 'flex' }}>
                        {item.icon}
                      </span>
                    )}
                    {item.label}
                  </Command.Item>
                ))}
              </Command.Group>
            );
          })}
        </Command.List>
      </Command>
    </div>
  );
}
