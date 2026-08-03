import { useNavigate, useParams } from 'react-router-dom';

export type ActiveTab = 'talk' | 'facts' | 'quiz' | 'mission' | 'map' | 'roster';

interface Props {
  activeTab: ActiveTab;
  onOpenRoster?: () => void;
  onOpenTalk?: () => void;
  onOpenFacts?: () => void;
  onOpenMission?: () => void;
}

export default function IconRail({
  activeTab,
  onOpenRoster,
  onOpenTalk,
  onOpenFacts,
  onOpenMission,
}: Props) {
  const navigate = useNavigate();
  const { sectionId } = useParams<{ sectionId: string }>();

  const items = [
    { id: 'talk' as ActiveTab, label: 'Talk', icon: '💬', onClick: onOpenTalk },
    { id: 'facts' as ActiveTab, label: 'Facts', icon: '💡', onClick: onOpenFacts },
    {
      id: 'quiz' as ActiveTab,
      label: 'Quiz',
      icon: '🎯',
      onClick: () => navigate(`/session/${sectionId}/quiz`),
    },
    { id: 'mission' as ActiveTab, label: 'Mission', icon: '⭐', onClick: onOpenMission },
    {
      id: 'map' as ActiveTab,
      label: 'Map',
      icon: '🗺️',
      onClick: () => navigate(`/session/${sectionId}/map`),
    },
    { id: 'roster' as ActiveTab, label: 'Roster', icon: '👥', onClick: onOpenRoster },
  ];

  return (
    <aside
      style={{
        width: 76,
        background: 'rgba(15, 20, 34, 0.94)',
        backdropFilter: 'blur(12px)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.25rem 0',
        gap: '0.9rem',
        zIndex: 40,
        flexShrink: 0,
        height: '100%',
      }}
    >
      {items.map((item) => {
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={item.onClick}
            title={item.label}
            style={{
              width: 54,
              height: 54,
              borderRadius: '16px',
              background: active
                ? 'linear-gradient(135deg, #ff9933 0%, #e07000 100%)'
                : 'rgba(30, 36, 54, 0.7)',
              color: active ? '#1a0a00' : 'var(--color-text-secondary)',
              border: active ? '2px solid #ffc107' : '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: active
                ? '0 0 20px rgba(255, 153, 51, 0.6), 0 4px 12px rgba(0,0,0,0.5)'
                : 'none',
              transform: active ? 'scale(1.05)' : 'scale(1)',
            }}
            onMouseEnter={(e) => {
              if (!active) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-saffron)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-saffron)';
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)';
              }
            }}
          >
            <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{item.icon}</span>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 900,
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.3px',
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
