'use client';

import { createBaseAccountSDK, type ProviderInterface } from '@base-org/account';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

type BaseAccountTransaction = {
    from?: `0x${string}`;
    to?: `0x${string}`;
    data?: `0x${string}`;
    value?: `0x${string}`;
    gas?: `0x${string}`;
    gasPrice?: `0x${string}`;
    maxFeePerGas?: `0x${string}`;
    maxPriorityFeePerGas?: `0x${string}`;
    nonce?: `0x${string}`;
    chainId?: `0x${string}`;
};

type BaseAccountContextType = {
    isReady: boolean;
    provider: ProviderInterface | null;
    address: `0x${string}` | null;
    connect: () => Promise<`0x${string}` | null>;
    signMessage: (message: string) => Promise<string>;
    sendTransaction: (tx: BaseAccountTransaction) => Promise<string>;
};

const BaseAccountContext = createContext<BaseAccountContextType | null>(null);

const defaultChainId = (() => {
    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID);
    return Number.isFinite(chainId) && chainId > 0 ? chainId : 8453;
})();

const appName = process.env.NEXT_PUBLIC_BASE_ACCOUNT_APP_NAME || 'Conviction Vault';

function textToHex(message: string) {
    if (message.startsWith('0x')) {
        return message;
    }
    const bytes = new TextEncoder().encode(message);
    const hex = Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
    return `0x${hex}`;
}

export function BaseAccountProvider({ children }: { children: ReactNode }) {
    const [provider, setProvider] = useState<ProviderInterface | null>(null);
    const [address, setAddress] = useState<`0x${string}` | null>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const sdk = createBaseAccountSDK({
            appName,
            appChainIds: [defaultChainId],
        });

        const nextProvider = sdk.getProvider();
        setProvider(nextProvider);
        setIsReady(true);

        const handleAccountsChanged = (accounts: string[]) => {
            setAddress((accounts?.[0] as `0x${string}` | undefined) ?? null);
        };

        const handleDisconnect = () => setAddress(null);

        nextProvider.on('accountsChanged', handleAccountsChanged);
        nextProvider.on('disconnect', handleDisconnect);

        void nextProvider
            .request({ method: 'eth_accounts' })
            .then((accounts) => handleAccountsChanged((accounts as string[]) ?? []))
            .catch(() => {
                setAddress(null);
            });

        return () => {
            nextProvider.removeListener?.('accountsChanged', handleAccountsChanged);
            nextProvider.removeListener?.('disconnect', handleDisconnect);
        };
    }, []);

    const connect = useCallback(async () => {
        if (!provider) return null;
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        const nextAddress = (accounts as string[])?.[0] as `0x${string}` | undefined;
        setAddress(nextAddress ?? null);
        return nextAddress ?? null;
    }, [provider]);

    const signMessage = useCallback(async (message: string) => {
        if (!provider) {
            throw new Error('Base Account provider not ready');
        }
        const activeAddress = address ?? (await connect());
        if (!activeAddress) {
            throw new Error('No connected Base Account address');
        }
        const payload = textToHex(message);
        return provider.request({
            method: 'personal_sign',
            params: [payload, activeAddress],
        }) as Promise<string>;
    }, [address, connect, provider]);

    const sendTransaction = useCallback(async (tx: BaseAccountTransaction) => {
        if (!provider) {
            throw new Error('Base Account provider not ready');
        }
        const activeAddress = address ?? (await connect());
        if (!activeAddress) {
            throw new Error('No connected Base Account address');
        }
        const request = {
            ...tx,
            from: tx.from ?? activeAddress,
        };
        return provider.request({
            method: 'eth_sendTransaction',
            params: [request],
        }) as Promise<string>;
    }, [address, connect, provider]);

    const value = useMemo(() => ({
        isReady,
        provider,
        address,
        connect,
        signMessage,
        sendTransaction,
    }), [address, connect, isReady, provider, sendTransaction, signMessage]);

    return (
        <BaseAccountContext.Provider value={value}>
            {children}
        </BaseAccountContext.Provider>
    );
}

export function useBaseAccount() {
    const context = useContext(BaseAccountContext);
    if (!context) {
        throw new Error('useBaseAccount must be used within a BaseAccountProvider');
    }
    return context;
}
