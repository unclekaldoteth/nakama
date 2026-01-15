'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useMiniApp } from '@/lib/MiniAppProvider';
import { useOnboarding } from '@/lib/useOnboarding';
import { getZoraProfileByAddress } from '@/lib/zoraApi';
import { TrendingAssets } from '@/components/TrendingAssets';
import { TopTraders } from '@/components/TopTraders';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  const { isReady, user, isInMiniApp } = useMiniApp();
  const { address, isConnected } = useAccount();
  const {
    hasOnboarded,
    selectedRole,
    isLoading: onboardingLoading,
    shouldCheckCreator,
    setDetectedCreatorToken,
    updateLastCreatorCheck,
  } = useOnboarding();

  const [isCheckingCreator, setIsCheckingCreator] = useState(false);

  // Handle routing based on onboarding state
  useEffect(() => {
    if (onboardingLoading || !isReady) return;

    // First-time user: go to onboarding
    if (!hasOnboarded) {
      router.replace('/onboarding');
      return;
    }

    if (!selectedRole) {
      router.replace('/select-role');
      return;
    }

    // Returning user: check if they should be redirected to creator home
    // Only check if they selected creator role, or if we should auto-detect
    if (selectedRole === 'creator' && isConnected && address && shouldCheckCreator()) {
      handleCreatorCheck();
    }
  }, [hasOnboarded, selectedRole, onboardingLoading, isReady, isConnected, address]);

  async function handleCreatorCheck() {
    if (isCheckingCreator || !address) return;

    setIsCheckingCreator(true);
    try {
      const result = await getZoraProfileByAddress(address);
      updateLastCreatorCheck();

      if (result.isCreator && result.creatorCoinAddress) {
        setDetectedCreatorToken(result.creatorCoinAddress);
        router.replace('/creator-home');
      }
    } catch (error) {
      console.error('Creator check failed:', error);
    }
    setIsCheckingCreator(false);
  }

  // Show loading while checking onboarding state
  if (!isReady || onboardingLoading || isCheckingCreator) {
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
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ fontSize: '24px', marginBottom: '4px' }}>
            Trade & Hold
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            The best assets on Base
          </p>
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {user.pfpUrl && (
              <img
                src={user.pfpUrl}
                alt={user.displayName || ''}
                style={{ width: 36, height: 36, borderRadius: '50%' }}
              />
            )}
          </div>
        )}
      </div>

      {/* Hero - Hybrid Message */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        border: 'none',
        textAlign: 'center',
        padding: '28px 20px',
        marginBottom: '24px'
      }}>
        <div style={{ fontSize: '42px', marginBottom: '12px' }}>💹</div>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
          Trade Every Asset
        </h2>
        <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '16px' }}>
          Memes • Creators • Tokens — All in one place
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link
            href="/discover"
            style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '12px',
              color: 'white',
              fontWeight: '600',
              fontSize: '14px',
              textDecoration: 'none',
              backdropFilter: 'blur(10px)',
            }}
          >
            🔍 Discover
          </Link>
          <Link
            href="/find-creators"
            style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '12px',
              color: 'white',
              fontWeight: '600',
              fontSize: '14px',
              textDecoration: 'none',
              backdropFilter: 'blur(10px)',
            }}
          >
            🎨 Creators
          </Link>
        </div>
      </div>

      {/* Trending Assets Section */}
      <TrendingAssets limit={5} />

      {/* Quick Actions - Hybrid approach */}
      <div className="section">
        <div className="section-header">
          <h3 className="section-title">Quick Actions</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Link href="/discover" className="card" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px 16px',
            textAlign: 'center',
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              marginBottom: '8px'
            }}>
              📈
            </div>
            <span style={{ fontWeight: '600', fontSize: '14px' }}>Discover</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Browse assets</span>
          </Link>

          <Link href="/my-convictions" className="card" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px 16px',
            textAlign: 'center',
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FFD700 0%, #CD7F32 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              marginBottom: '8px'
            }}>
              🔒
            </div>
            <span style={{ fontWeight: '600', fontSize: '14px' }}>Conviction</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Stake & earn</span>
          </Link>

          <Link href="/leaderboard" className="card" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px 16px',
            textAlign: 'center',
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #EAB308 0%, #CA8A04 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              marginBottom: '8px'
            }}>
              🏆
            </div>
            <span style={{ fontWeight: '600', fontSize: '14px' }}>Leaderboard</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Top traders</span>
          </Link>

          <Link href="/find-creators" className="card" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px 16px',
            textAlign: 'center',
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              marginBottom: '8px'
            }}>
              🎨
            </div>
            <span style={{ fontWeight: '600', fontSize: '14px' }}>Creators</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Support & stake</span>
          </Link>
        </div>

        {/* Show Creator Home link for users who selected creator role */}
        {selectedRole === 'creator' && (
          <Link href="/creator-home" className="card" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginTop: '12px'
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}>
              ✨
            </div>
            <div>
              <div style={{ fontWeight: '600' }}>Creator Dashboard</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                View your supporters & manage tiers
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Top Traders Section */}
      <TopTraders limit={3} />

      {/* Conviction Vault CTA */}
      <div className="section">
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          padding: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '40px' }}>🔒</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontWeight: '700', marginBottom: '4px' }}>Conviction Vault</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                Stake creator coins. Earn badges. Unlock perks.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Link href="/find-creators" style={{
              flex: 1,
              padding: '12px',
              background: 'var(--primary)',
              borderRadius: '10px',
              color: 'white',
              fontWeight: '600',
              fontSize: '14px',
              textAlign: 'center',
              textDecoration: 'none',
            }}>
              Start Staking
            </Link>
            <Link href="/my-convictions" style={{
              flex: 1,
              padding: '12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: 'var(--text-primary)',
              fontWeight: '600',
              fontSize: '14px',
              textAlign: 'center',
              textDecoration: 'none',
            }}>
              My Stakes
            </Link>
          </div>
        </div>
      </div>

      {/* Tier Levels - Collapsible */}
      <div className="section">
        <details className="card" style={{ padding: 0 }}>
          <summary style={{
            padding: '16px 20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: '600',
          }}>
            <span>📊 Conviction Tiers</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>View all</span>
          </summary>
          <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>🥉</span>
                <span style={{ fontWeight: '600' }}>Bronze</span>
              </div>
              <span className="tier-badge tier-badge-bronze" style={{ fontSize: '12px' }}>Any stake</span>
            </div>
            <div style={{ padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>🥈</span>
                <span style={{ fontWeight: '600' }}>Silver</span>
              </div>
              <span className="tier-badge tier-badge-silver" style={{ fontSize: '12px' }}>7+ days</span>
            </div>
            <div style={{ padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>🥇</span>
                <span style={{ fontWeight: '600' }}>Gold</span>
              </div>
              <span className="tier-badge tier-badge-gold" style={{ fontSize: '12px' }}>30+ days</span>
            </div>
            <div style={{ padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>🏆</span>
                <span style={{ fontWeight: '600' }}>Legend</span>
              </div>
              <span className="tier-badge tier-badge-legend" style={{ fontSize: '12px' }}>90+ days</span>
            </div>
          </div>
        </details>
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        padding: '24px 0',
        fontSize: '12px',
        color: 'var(--text-muted)'
      }}>
        {isInMiniApp ? 'Running in Base App' : 'Standalone Mode'} • Powered by Base
      </div>
    </div>
  );
}
