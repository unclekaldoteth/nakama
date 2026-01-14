'use client';

import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/lib/useOnboarding';
import './page.css';

interface RoleOption {
    id: 'creator' | 'supporter';
    icon: string;
    title: string;
    description: string;
    destination: string;
}

const roleOptions: RoleOption[] = [
    {
        id: 'creator',
        icon: '🎨',
        title: "I'm a Creator",
        description: 'I have a coin on Zora and want to see my supporters & manage tiers',
        destination: '/creator-home',
    },
    {
        id: 'supporter',
        icon: '💪',
        title: "I'm a Supporter",
        description: 'I want to find creators to support and earn conviction badges',
        destination: '/',
    },
];

export default function SelectRolePage() {
    const router = useRouter();
    const { completeOnboarding } = useOnboarding();

    const handleSelectRole = (role: RoleOption) => {
        completeOnboarding(role.id);
        router.push(role.destination);
    };

    return (
        <div className="select-role-container">
            <div className="role-header">
                <h1 className="role-title">How will you use Nakama?</h1>
                <p className="role-subtitle">Choose your primary role to get started</p>
            </div>

            <div className="role-options">
                {roleOptions.map((role) => (
                    <button
                        key={role.id}
                        className="role-card"
                        onClick={() => handleSelectRole(role)}
                    >
                        <div className="role-icon">{role.icon}</div>
                        <div className="role-content">
                            <h2 className="role-name">{role.title}</h2>
                            <p className="role-description">{role.description}</p>
                        </div>
                        <div className="role-arrow">→</div>
                    </button>
                ))}
            </div>

            <p className="role-footnote">
                (You can do both later!)
            </p>
        </div>
    );
}
