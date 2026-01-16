'use client';

import { useBaseAccount } from '@/lib/BaseAccountProvider';
import { useCallback, useState } from 'react';

const DEFAULT_MESSAGE = 'Sign in to Conviction Vault';

export default function BaseAccountPage() {
    const { address, connect, signMessage, sendTransaction, isReady } = useBaseAccount();
    const [message, setMessage] = useState(DEFAULT_MESSAGE);
    const [signature, setSignature] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [toAddress, setToAddress] = useState('');
    const [value, setValue] = useState('0x0');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConnect = useCallback(async () => {
        setError(null);
        try {
            await connect();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to connect');
        }
    }, [connect]);

    const handleSign = useCallback(async () => {
        setError(null);
        setSignature(null);
        setIsSubmitting(true);
        try {
            const result = await signMessage(message);
            setSignature(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to sign message');
        } finally {
            setIsSubmitting(false);
        }
    }, [message, signMessage]);

    const handleSend = useCallback(async () => {
        setError(null);
        setTxHash(null);
        if (!toAddress) {
            setError('Enter a destination address.');
            return;
        }
        setIsSubmitting(true);
        try {
            const hash = await sendTransaction({
                to: toAddress as `0x${string}`,
                value: value as `0x${string}`,
            });
            setTxHash(hash);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send transaction');
        } finally {
            setIsSubmitting(false);
        }
    }, [sendTransaction, toAddress, value]);

    return (
        <div className="container">
            <div className="page-header">
                <div>
                    <h1 className="page-title" style={{ fontSize: '24px', marginBottom: '4px' }}>
                        Base Account SDK
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                        Connect, sign, and send transactions using Base Account.
                    </p>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
                <h2 className="card-title">Wallet Connection</h2>
                <p className="card-subtitle" style={{ marginBottom: '12px' }}>
                    {address ? `Connected as ${address}` : 'Not connected'}
                </p>
                <button
                    className="btn btn-primary"
                    onClick={handleConnect}
                    disabled={!isReady || isSubmitting}
                >
                    {address ? 'Reconnect Base Account' : 'Connect Base Account'}
                </button>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
                <h2 className="card-title">Sign Message</h2>
                <p className="card-subtitle" style={{ marginBottom: '12px' }}>
                    Generate a signature using your Base Account wallet.
                </p>
                <input
                    className="form-input"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Message to sign"
                    style={{ marginBottom: '12px' }}
                />
                <button
                    className="btn btn-primary"
                    onClick={handleSign}
                    disabled={!isReady || isSubmitting}
                >
                    Sign Message
                </button>
                {signature ? (
                    <p style={{ marginTop: '12px', wordBreak: 'break-all' }}>
                        Signature: {signature}
                    </p>
                ) : null}
            </div>

            <div className="card">
                <h2 className="card-title">Send Transaction</h2>
                <p className="card-subtitle" style={{ marginBottom: '12px' }}>
                    Send a transaction from your Base Account. Value must be hex (wei).
                </p>
                <input
                    className="form-input"
                    value={toAddress}
                    onChange={(event) => setToAddress(event.target.value)}
                    placeholder="0xRecipient..."
                    style={{ marginBottom: '12px' }}
                />
                <input
                    className="form-input"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder="0x0"
                    style={{ marginBottom: '12px' }}
                />
                <button
                    className="btn btn-primary"
                    onClick={handleSend}
                    disabled={!isReady || isSubmitting}
                >
                    Send Transaction
                </button>
                {txHash ? (
                    <p style={{ marginTop: '12px', wordBreak: 'break-all' }}>
                        Transaction: {txHash}
                    </p>
                ) : null}
            </div>

            {error ? (
                <p style={{ marginTop: '12px', color: 'var(--text-danger)' }}>
                    {error}
                </p>
            ) : null}
        </div>
    );
}
