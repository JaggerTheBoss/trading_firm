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

        const newUser = { email, password, handle, balance: 10000, trades: [], accounts: [] };
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

// Dashboard Display & Account Buying
if (document.getElementById('user-handle') && window.location.pathname.includes('dashboard.html')) {
    if (!currentUser) {
        window.location.href = 'login.html';
    } else {
        document.getElementById('user-handle').textContent = currentUser.handle;
        document.getElementById('user-balance').textContent = currentUser.balance;
        document.getElementById('active-accounts').textContent = currentUser.accounts.length;
        const accountList = document.getElementById('account-list');
        accountList.innerHTML = currentUser.accounts.length 
            ? currentUser.accounts.map(a => `<li>$${a.size}K (Bought: ${new Date(a.purchased).toLocaleDateString()})</li>`).join('') 
            : '<li>No accounts yet</li>';

        document.getElementById('buy-account').addEventListener('click', () => {
            const size = parseInt(document.getElementById('account-size').value);
            const costs = { 50: 250, 100: 300, 150: 350 };
            const cost = costs[size];
            if (currentUser.balance < cost) {
                alert('Not enough balance to buy this account!');
                return;
            }
            if (currentUser.accounts.length >= 5) {
                alert('Max 5 accounts allowed!');
                return;
            }
            currentUser.balance -= cost;
            currentUser.accounts.push({ size, purchased: new Date().toISOString() });
            updateUserData();
            alert(`Bought a $${size}K account for $${cost}!`);
            document.getElementById('user-balance').textContent = currentUser.balance;
            document.getElementById('active-accounts').textContent = currentUser.accounts.length;
            accountList.innerHTML = currentUser.accounts.map(a => `<li>$${a.size}K (Bought: ${new Date(a.purchased).toLocaleDateString()})</li>`).join('');
        });
    }
}

// Profile Display & Edit
if (document.getElementById('user-email')) {
    if (!currentUser) {
        window.location.href = 'login.html';
    } else {
        document.getElementById('user-email').textContent = currentUser.email;
        document.getElementById('user-handle').textContent = currentUser.handle;
        document.getElementById('user-balance').textContent = currentUser.balance;
        const tradeList = document.getElementById('trade-history');
        tradeList.innerHTML = currentUser.trades.length 
            ? currentUser.trades.map(t => `<li>${t.contract} - $${t.profit.toFixed(2)} (${new Date(t.date).toLocaleDateString()})</li>`).join('') 
            : '<li>No trades yet</li>';

        document.getElementById('edit-handle-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const newHandle = document.getElementById('new-handle').value.trim();
            if (!newHandle || newHandle === currentUser.handle) return;
            if (users.some(u => u.handle === newHandle && u.email !== currentUser.email)) {
                alert('Handle already taken');
                return;
            }
            const userIndex = users.findIndex(u => u.email === currentUser.email);
            users[userIndex].handle = newHandle;
            currentUser.handle = newHandle;
            updateUserData();
            document.getElementById('user-handle').textContent = newHandle;
            alert('Handle updated to ' + newHandle);
            document.getElementById('new-handle').value = '';
        });
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

// Helper Function
function updateUserData() {
    const userIndex = users.findIndex(u => u.email === currentUser.email);
    users[userIndex] = { ...currentUser };
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
}