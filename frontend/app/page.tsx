'use client';

import { useMiniApp } from '@/lib/MiniAppProvider';
import Link from 'next/link';

export default function HomePage() {
  const { isReady, isInMiniApp, user } = useMiniApp();

  if (!isReady) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Conviction Vault</h1>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {user.pfpUrl && (
              <img
                src={user.pfpUrl}
                alt={user.displayName || ''}
                style={{ width: 32, height: 32, borderRadius: '50%' }}
              />
            )}
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              @{user.username}
            </span>
          </div>
        )}
      </div>

      {/* Hero Section */}
      <div className="card" style={{
        background: 'var(--gradient-primary)',
        border: 'none',
        textAlign: 'center',
        padding: '32px 20px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
          Show Your Conviction
        </h2>
        <p style={{ fontSize: '14px', opacity: 0.9 }}>
          Stake creator coins to prove your support and unlock exclusive perks
        </p>
      </div>

      {/* Quick Actions */}
      <div className="section">
        <div className="section-header">
          <h3 className="section-title">Quick Actions</h3>
        </div>

        <Link href="/creator/0x0000000000000000000000000000000000000000" className="card" style={{ display: 'block' }}>
          <div className="card-header">
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--gradient-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              👤
            </div>
            <div>
              <div className="card-title">Browse Creators</div>
              <div className="card-subtitle">Find creators to support</div>
            </div>
          </div>
        </Link>

        <Link href="/my-convictions" className="card" style={{ display: 'block' }}>
          <div className="card-header">
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FFD700 0%, #CD7F32 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              🏆
            </div>
            <div>
              <div className="card-title">My Convictions</div>
              <div className="card-subtitle">View your staked positions & badges</div>
            </div>
          </div>
        </Link>
      </div>

      {/* How It Works */}
      <div className="section">
        <div className="section-header">
          <h3 className="section-title">How It Works</h3>
        </div>

        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700',
                flexShrink: 0
              }}>1</div>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>Buy Creator Coin</div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Get your favorite creator's token
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700',
                flexShrink: 0
              }}>2</div>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>Lock to Show Conviction</div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Stake tokens for 7-90+ days
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700',
                flexShrink: 0
              }}>3</div>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>Earn Your Badge</div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Claim a soulbound NFT proving your tier
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tier Levels */}
      <div className="section">
        <div className="section-header">
          <h3 className="section-title">Tier Levels</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>🥉</span>
              <span style={{ fontWeight: '600' }}>Bronze</span>
            </div>
            <span className="tier-badge tier-badge-bronze">Any stake</span>
          </div>

          <div className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>🥈</span>
              <span style={{ fontWeight: '600' }}>Silver</span>
            </div>
            <span className="tier-badge tier-badge-silver">7+ days lock</span>
          </div>

          <div className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>🥇</span>
              <span style={{ fontWeight: '600' }}>Gold</span>
            </div>
            <span className="tier-badge tier-badge-gold">30+ days lock</span>
          </div>

          <div className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>🏆</span>
              <span style={{ fontWeight: '600' }}>Legend</span>
            </div>
            <span className="tier-badge tier-badge-legend">90+ days lock</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        padding: '24px 0',
        fontSize: '12px',
        color: 'var(--text-muted)'
      }}>
        {isInMiniApp ? 'Running in Base App' : 'Standalone Mode'}
      </div>
    </div>
  );
}
