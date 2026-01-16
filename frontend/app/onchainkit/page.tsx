'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Address, ContractFunctionParameters } from 'viem';
import { isAddress } from 'viem';
import { base } from 'wagmi/chains';
import { useAccount } from 'wagmi';
import type { Token } from '@coinbase/onchainkit/token';
import { Wallet } from '@coinbase/onchainkit/wallet';
import {
    Identity,
    Avatar,
    Name,
    Address as IdentityAddress,
    Badge,
    EthBalance,
    Socials,
} from '@coinbase/onchainkit/identity';
import {
    Transaction,
    TransactionButton,
    TransactionStatus,
    TransactionToast,
} from '@coinbase/onchainkit/transaction';
import { Signature } from '@coinbase/onchainkit/signature';
import { Swap } from '@coinbase/onchainkit/swap';
import { Buy } from '@coinbase/onchainkit/buy';
import { FundButton } from '@coinbase/onchainkit/fund';
import { API_BASE_URL, CONTRACTS } from '@/lib/contracts';
import './page.css';

const ETH_TOKEN: Token = {
    address: '',
    chainId: base.id,
    decimals: 18,
    image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    name: 'Ether',
    symbol: 'ETH',
};

const USDC_TOKEN: Token = {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    chainId: base.id,
    decimals: 6,
    image: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
    name: 'USD Coin',
    symbol: 'USDC',
};

const swapFromTokens = [ETH_TOKEN, USDC_TOKEN];
const swapToTokens = [USDC_TOKEN, ETH_TOKEN];

export default function OnchainKitPage() {
    const { address } = useAccount();
    const [tokenAddress, setTokenAddress] = useState('');
    const [onrampSessionToken, setOnrampSessionToken] = useState<string | null>(null);
    const [onrampError, setOnrampError] = useState<string | null>(null);
    const [onrampStatus, setOnrampStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const normalizedTokenAddress = tokenAddress.trim();
    const isTokenValid = isAddress(normalizedTokenAddress);

    const badgeCalls = useMemo<ContractFunctionParameters[] | undefined>(() => {
        if (!isTokenValid) return undefined;

        return [
            {
                address: CONTRACTS.badge.address as Address,
                abi: CONTRACTS.badge.abi,
                functionName: 'claimOrRefresh',
                args: [normalizedTokenAddress as Address],
            },
        ];
    }, [isTokenValid, normalizedTokenAddress]);

    const onchainKitApiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY;
    const cdpProjectId = process.env.NEXT_PUBLIC_CDP_PROJECT_ID;
    const isApiKeyReady = Boolean(onchainKitApiKey);
    const isOnrampReady = Boolean(onrampSessionToken);

    useEffect(() => {
        if (!address) {
            setOnrampStatus('idle');
            setOnrampSessionToken(null);
            setOnrampError(null);
            return;
        }

        let isMounted = true;
        const fetchSessionToken = async () => {
            setOnrampStatus('loading');
            setOnrampError(null);

            try {
                const response = await fetch(`${API_BASE_URL}/onramp/session-token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        address,
                        blockchain: 'base',
                        assets: ['USDC'],
                    }),
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch session token');
                }

                const data = (await response.json()) as { sessionToken?: string };
                if (!data.sessionToken) {
                    throw new Error('Session token missing in response');
                }

                if (isMounted) {
                    setOnrampSessionToken(data.sessionToken);
                    setOnrampStatus('ready');
                }
            } catch (error) {
                if (isMounted) {
                    setOnrampStatus('error');
                    setOnrampSessionToken(null);
                    setOnrampError(error instanceof Error ? error.message : 'Failed to load session token');
                }
            }
        };

        void fetchSessionToken();

        return () => {
            isMounted = false;
        };
    }, [address]);

    return (
        <div className="container onchainkit-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">OnchainKit</h1>
                    <p className="onchainkit-subtitle">
                        Wallet, identity, transactions, swaps, funding, and signatures on Base.
                    </p>
                </div>
                <Wallet />
            </div>

            <div className="card onchainkit-banner">
                <div>
                    <h2 className="card-title">Setup status</h2>
                    <p className="card-subtitle">
                        Configure keys to unlock Buy/Fund and richer swap routing.
                    </p>
                </div>
                <div className="onchainkit-status-grid">
                    <div className="onchainkit-status">
                        <span>OnchainKit API Key</span>
                        <strong>{onchainKitApiKey ? 'Loaded' : 'Missing'}</strong>
                    </div>
                    <div className="onchainkit-status">
                        <span>CDP Project ID</span>
                        <strong>{cdpProjectId ? 'Loaded' : 'Missing'}</strong>
                    </div>
                    <div className="onchainkit-status">
                        <span>Onramp Session Token</span>
                        <strong>
                            {onrampStatus === 'loading'
                                ? 'Loading...'
                                : onrampStatus === 'error'
                                    ? 'Error'
                                    : onrampSessionToken
                                        ? 'Loaded'
                                        : 'Missing'}
                        </strong>
                    </div>
                </div>
                {onrampError ? (
                    <p className="onchainkit-helper">Onramp error: {onrampError}</p>
                ) : null}
            </div>

            <div className="onchainkit-grid">
                <section className="card onchainkit-section">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">Identity</h3>
                            <p className="card-subtitle">Basenames, ENS, socials, and balance.</p>
                        </div>
                    </div>
                    <Identity hasCopyAddressOnClick>
                        <div className="onchainkit-identity">
                            <Avatar />
                            <div className="onchainkit-identity-details">
                                <Name />
                                <IdentityAddress />
                                <Badge />
                            </div>
                            <EthBalance />
                        </div>
                        <div className="onchainkit-divider" />
                        <Socials />
                    </Identity>
                </section>

                <section className="card onchainkit-section">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">Claim Badge</h3>
                            <p className="card-subtitle">
                                Trigger the ConvictionBadge claim via OnchainKit transactions.
                            </p>
                        </div>
                    </div>
                    <label className="onchainkit-label" htmlFor="badgeToken">
                        Creator token address (Base)
                    </label>
                    <input
                        id="badgeToken"
                        className="form-input onchainkit-input"
                        placeholder="0x..."
                        value={tokenAddress}
                        onChange={(event) => setTokenAddress(event.target.value)}
                    />
                    <Transaction calls={badgeCalls} chainId={base.id}>
                        <TransactionButton text="Claim or Refresh Badge" disabled={!isTokenValid} />
                        <TransactionStatus />
                        <TransactionToast />
                    </Transaction>
                    <p className="onchainkit-helper">
                        Enter a creator coin address you have staked to claim a badge.
                    </p>
                </section>

                <section className="card onchainkit-section">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">Signature</h3>
                            <p className="card-subtitle">Lightweight message signing for gating.</p>
                        </div>
                    </div>
                    <Signature message="Conviction Vault access request" label="Sign Access Message" />
                </section>

                <section className="card onchainkit-section">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">Swap</h3>
                            <p className="card-subtitle">Swap between ETH and USDC on Base.</p>
                        </div>
                    </div>
                    <Swap from={swapFromTokens} to={swapToTokens} disabled={!isApiKeyReady} />
                </section>

                <section className="card onchainkit-section">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">Buy</h3>
                            <p className="card-subtitle">Buy USDC with onramp-backed flows.</p>
                        </div>
                    </div>
                    <Buy
                        toToken={USDC_TOKEN}
                        fromToken={ETH_TOKEN}
                        sessionToken={onrampSessionToken || undefined}
                        disabled={!isApiKeyReady || !isOnrampReady}
                    />
                </section>

                <section className="card onchainkit-section">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">Fund Wallet</h3>
                            <p className="card-subtitle">Launch Coinbase Onramp for your wallet.</p>
                        </div>
                    </div>
                    <FundButton sessionToken={onrampSessionToken || undefined} disabled={!isOnrampReady} />
                </section>
            </div>
        </div>
    );
}
