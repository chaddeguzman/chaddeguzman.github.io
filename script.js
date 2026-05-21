document.addEventListener('DOMContentLoaded', () => {
    const glow = document.getElementById('glow');
    const actionBtn = document.getElementById('actionBtn');

    // 1. Smooth Mouse Tracking for Ambient Background Glow
    window.addEventListener('mousemove', (e) => {
        const { clientX, clientY } = e;
        
        // Slightly delay or ease the movement relative to center screen
        const moveX = (clientX - window.innerWidth / 2) * 0.15;
        const moveY = (clientY - window.innerHeight / 2) * 0.15;

        glow.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
    });

    // 2. Micro-interaction for Action Button click
    actionBtn.addEventListener('click', () => {
        actionBtn.textContent = 'Redirecting...';
        actionBtn.style.background = '#4f46e5';
        
        setTimeout(() => {
            // Open your desired webpage URL in a new window
            window.open('https://www.linkedin.com/in/chad-de-guzman/', '_blank');
            
            // Reset button text state
            setTimeout(() => {
                actionBtn.textContent = 'Connect With Me';
                actionBtn.style.background = '#6366f1';
            }, 1000);
        }, 300);
    });
});
