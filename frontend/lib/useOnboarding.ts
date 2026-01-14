'use client';

import { useState, useEffect, useCallback } from 'react';

// Storage keys
const STORAGE_KEYS = {
    HAS_ONBOARDED: 'nakama_hasOnboarded',
    SELECTED_ROLE: 'nakama_selectedRole',
    DETECTED_CREATOR_TOKEN: 'nakama_detectedCreatorToken',
    LAST_CREATOR_CHECK: 'nakama_lastCreatorCheck',
} as const;

export type UserRole = 'creator' | 'supporter';

export interface OnboardingState {
    hasOnboarded: boolean;
    selectedRole: UserRole | null;
    detectedCreatorToken: string | null;
    lastCreatorCheck: string | null;
    isLoading: boolean;
}

export interface OnboardingActions {
    completeOnboarding: (role: UserRole) => void;
    setDetectedCreatorToken: (tokenAddress: string | null) => void;
    updateLastCreatorCheck: () => void;
    resetOnboarding: () => void;
    shouldCheckCreator: () => boolean;
}

/**
 * Custom hook to manage onboarding state via localStorage
 */
export function useOnboarding(): OnboardingState & OnboardingActions {
    const [state, setState] = useState<OnboardingState>({
        hasOnboarded: false,
        selectedRole: null,
        detectedCreatorToken: null,
        lastCreatorCheck: null,
        isLoading: true,
    });

    // Load state from localStorage on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const hasOnboarded = localStorage.getItem(STORAGE_KEYS.HAS_ONBOARDED) === 'true';
        const storedRole = localStorage.getItem(STORAGE_KEYS.SELECTED_ROLE);
        const selectedRole = storedRole === 'creator' || storedRole === 'supporter'
            ? (storedRole as UserRole)
            : null;
        if (storedRole && !selectedRole) {
            localStorage.removeItem(STORAGE_KEYS.SELECTED_ROLE);
        }
        const detectedCreatorToken = localStorage.getItem(STORAGE_KEYS.DETECTED_CREATOR_TOKEN);
        const lastCreatorCheck = localStorage.getItem(STORAGE_KEYS.LAST_CREATOR_CHECK);

        setState({
            hasOnboarded,
            selectedRole,
            detectedCreatorToken,
            lastCreatorCheck,
            isLoading: false,
        });
    }, []);

    /**
     * Complete onboarding and set user's role
     */
    const completeOnboarding = useCallback((role: UserRole) => {
        if (typeof window === 'undefined') return;

        localStorage.setItem(STORAGE_KEYS.HAS_ONBOARDED, 'true');
        localStorage.setItem(STORAGE_KEYS.SELECTED_ROLE, role);

        setState(prev => ({
            ...prev,
            hasOnboarded: true,
            selectedRole: role,
        }));
    }, []);

    /**
     * Set detected creator token (from Zora API)
     */
    const setDetectedCreatorToken = useCallback((tokenAddress: string | null) => {
        if (typeof window === 'undefined') return;

        if (tokenAddress) {
            localStorage.setItem(STORAGE_KEYS.DETECTED_CREATOR_TOKEN, tokenAddress);
        } else {
            localStorage.removeItem(STORAGE_KEYS.DETECTED_CREATOR_TOKEN);
        }

        setState(prev => ({
            ...prev,
            detectedCreatorToken: tokenAddress,
        }));
    }, []);

    /**
     * Update last creator check timestamp
     */
    const updateLastCreatorCheck = useCallback(() => {
        if (typeof window === 'undefined') return;

        const now = new Date().toISOString();
        localStorage.setItem(STORAGE_KEYS.LAST_CREATOR_CHECK, now);

        setState(prev => ({
            ...prev,
            lastCreatorCheck: now,
        }));
    }, []);

    /**
     * Check if we should re-check creator status (cache for 1 hour)
     */
    const shouldCheckCreator = useCallback(() => {
        if (!state.lastCreatorCheck) return true;

        const lastCheck = new Date(state.lastCreatorCheck).getTime();
        const now = Date.now();
        const ONE_HOUR = 60 * 60 * 1000;

        return now - lastCheck > ONE_HOUR;
    }, [state.lastCreatorCheck]);

    /**
     * Reset all onboarding state (for testing)
     */
    const resetOnboarding = useCallback(() => {
        if (typeof window === 'undefined') return;

        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });

        setState({
            hasOnboarded: false,
            selectedRole: null,
            detectedCreatorToken: null,
            lastCreatorCheck: null,
            isLoading: false,
        });
    }, []);

    return {
        ...state,
        completeOnboarding,
        setDetectedCreatorToken,
        updateLastCreatorCheck,
        shouldCheckCreator,
        resetOnboarding,
    };
}
