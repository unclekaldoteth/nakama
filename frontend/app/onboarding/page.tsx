'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import './page.css';

interface Slide {
    icon: string;
    title: string;
    description: string;
}

const slides: Slide[] = [
    {
        icon: '🪙',
        title: 'Buy Your Favorite Creator\'s Coin',
        description: 'Get tokens from creators you believe in on Base',
    },
    {
        icon: '🔒',
        title: 'Lock to Show Conviction',
        description: 'Stake tokens for 7-90+ days to prove you\'re a true fan',
    },
    {
        icon: '🏆',
        title: 'Earn Badges & Perks',
        description: 'Claim soulbound NFTs and get exclusive creator access',
    },
];

export default function OnboardingPage() {
    const router = useRouter();
    const [currentSlide, setCurrentSlide] = useState(0);

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            // Last slide - go to role selection
            router.push('/select-role');
        }
    };

    const handlePrev = () => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
        }
    };

    const handleSkip = () => {
        router.push('/select-role');
    };

    const slide = slides[currentSlide];
    const isLastSlide = currentSlide === slides.length - 1;

    return (
        <div className="onboarding-container">
            <button className="skip-button" onClick={handleSkip}>
                Skip
            </button>

            <div className="slide-content">
                <div className="slide-icon">{slide.icon}</div>
                <h1 className="slide-title">{slide.title}</h1>
                <p className="slide-description">{slide.description}</p>
            </div>

            <div className="slide-navigation">
                <div className="dots">
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            className={`dot ${index === currentSlide ? 'active' : ''}`}
                            onClick={() => setCurrentSlide(index)}
                        />
                    ))}
                </div>

                <div className="nav-buttons">
                    {currentSlide > 0 && (
                        <button className="nav-button prev" onClick={handlePrev}>
                            ← Back
                        </button>
                    )}
                    <button className="nav-button next" onClick={handleNext}>
                        {isLastSlide ? 'Get Started →' : 'Next →'}
                    </button>
                </div>
            </div>
        </div>
    );
}
