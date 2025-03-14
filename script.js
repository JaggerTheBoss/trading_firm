// Particles.js Background (Home only)
if (document.getElementById('particles')) {
    particlesJS('particles', {
        particles: {
            number: { value: 50, density: { enable: true, value_area: 1000 } },
            color: { value: '#ffffff' },
            shape: { type: 'circle' },
            opacity: { value: 0.3, random: true },
            size: { value: 3, random: true },
            move: { enable: true, speed: 1, direction: 'none', random: true, out_mode: 'out' }
        },
        interactivity: { detect_on: 'canvas', events: { onhover: { enable: false }, onclick: { enable: false } } }
    });
}

// Market Time (Home only)
function updateMarketTime() {
    const now = new Date();
    const estHours = now.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false });
    const marketTime = estHours >= 18 || estHours < 16 || (estHours == 16 && now.getMinutes() <= 10) ? 'Open' : 'Closed';
    document.getElementById('market-time') && (document.getElementById('market-time').innerText = `4:10 PM EST (${marketTime})`);
}
setInterval(updateMarketTime, 60000);

// Tagline Rotation (Home only)
if (document.getElementById('tagline')) {
    const taglines = ['Skip the Demo, Win Big', 'Trade Live, Cash Out Fast', 'Your Path to Millions', 'Legends Start Here', 'Dominate Futures Now', 'Stack, Trade, Win'];
    let tagIndex = 0;
    setInterval(() => {
        tagIndex = (tagIndex + 1) % taglines.length;
        document.getElementById('tagline').innerText = taglines[tagIndex];
    }, 3500);
}

// Market Ticker (Home only)
if (document.getElementById('ticker-text')) {
    function updateTicker() {
        const prices = [
            `E-mini S&P: $${(4830 + Math.random() * 10).toFixed(2)}`,
            `Nasdaq Micro: $${(15900 + Math.random() * 50).toFixed(2)}`,
            `Crude Oil: $${(78 + Math.random() * 2).toFixed(2)}`
        ];
        document.getElementById('ticker-text').innerText = prices.join(' | ');
    }
    updateTicker();
    setInterval(updateTicker, 5000);
}

// FAQ Toggle (Home only)
function toggleFAQ(element) {
    const answer = element.nextElementSibling;
    if (answer.style.display === 'none' || answer.style.display === '') {
        answer.style.display = 'block';
    } else {
        answer.style.display = 'none';
    }
}

// User Management
let users = JSON.parse(localStorage.getItem('users')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

// Signup Form
if (document.getElementById('signup-form')) {
    document.getElementById('signup-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const handle = document.getElementById('signup-handle').value;

        if (password !== confirmPassword) {
            document.getElementById('signup-error').style.display = 'block';
            document.getElementById('signup-error').innerText = 'Passwords don’t match';
            return;
        }

        if (users.some(user => user.email === email || user.handle === handle)) {
            document.getElementById('signup-error').style.display = 'block';
            document.getElementById('signup-error').innerText = 'Email or handle already taken';
            return;
        }

        const newUser = { email, password, handle, balance: 0, trades: [] };
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        alert('Signed up successfully! Welcome, ' + handle);
        window.location.href = 'dashboard.html';
    });
}

// Login Form
if (document.getElementById('login-form')) {
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
            alert('Logged in! Welcome back, ' + user.handle);
            window.location.href = 'dashboard.html';
        } else {
            document.getElementById('login-error').style.display = 'block';
        }
    });
}

// Dashboard & Profile Display
if (document.getElementById('user-handle')) {
    if (!currentUser) {
        window.location.href = 'login.html';
    } else {
        document.getElementById('user-handle').textContent = currentUser.handle;
    }
}

// Logout
if (document.getElementById('logout-link')) {
    document.getElementById('logout-link').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('currentUser');
        alert('Logged out successfully');
        window.location.href = 'login.html';
    });
}