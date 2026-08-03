import { useSession } from '../store/sessionStore';


export default function OfflineBanner() {
  const { state } = useSession();
  const { isOnline, syncStatus } = state;

  if (isOnline && syncStatus !== 'syncing' && syncStatus !== 'error') return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '0.5rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        fontSize: '0.9rem',
        fontWeight: 700,
        fontFamily: 'var(--font-body)',
        ...(isOnline
          ? syncStatus === 'error'
            ? { background: 'rgba(229,62,62,0.95)', color: 'white' }
            : { background: 'rgba(79,91,213,0.95)', color: 'white' }
          : { background: 'rgba(229,62,62,0.95)', color: 'white' }),
      }}
    >
      {!isOnline ? (
        <>
          <span>📵</span>
          <span>Offline — quiz continues locally, will sync when connected</span>
        </>
      ) : syncStatus === 'syncing' ? (
        <>
          <span className="anim-spin" style={{ display: 'inline-block' }}>🔄</span>
          <span>Syncing to server…</span>
        </>
      ) : syncStatus === 'error' ? (
        <>
          <span>⚠️</span>
          <span>Sync failed — data saved locally, will retry</span>
        </>
      ) : null}
    </div>
  );
}
