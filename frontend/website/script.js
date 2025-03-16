const PLATFORM_URL = 'http://localhost:8000'; // Platform Site
const TRADING_URL = 'http://localhost:8001'; // Trading Site
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

        currentUser = { email, password, handle, balance: 10000, accounts: [], trades: [] };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        alert('Signed up! Welcome, ' + handle);
        window.location.href = `${PLATFORM_URL}/dashboard.html`;
    });
}

// Login Form
if (document.getElementById('login-form')) {
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const storedUser = JSON.parse(localStorage.getItem('currentUser'));
        if (storedUser && storedUser.email === email && storedUser.password === password) {
            currentUser = storedUser;
            localStorage.setItem('currentUser', JSON.stringify(currentUser)); // Ensure it’s fresh
            alert('Logged in! Welcome back, ' + currentUser.handle);
            window.location.href = `${PLATFORM_URL}/dashboard.html`;
        } else {
            document.getElementById('login-error').style.display = 'block';
        }
    });
}

// Dashboard
if (window.location.pathname.includes('dashboard.html')) {
    if (!currentUser) {
        window.location.href = `${PLATFORM_URL}/login.html`;
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
            const costs = {50: 250, 100: 300, 150: 350};
            if (currentUser.balance >= costs[size]) {
                currentUser.balance -= costs[size];
                currentUser.accounts.push({ size, purchased: new Date().toISOString() });
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                alert(`Bought a $${size}K account!`);
                document.getElementById('user-balance').textContent = currentUser.balance;
                document.getElementById('active-accounts').textContent = currentUser.accounts.length;
                accountList.innerHTML = currentUser.accounts.map(a => `<li>$${a.size}K (Bought: ${new Date(a.purchased).toLocaleDateString()})</li>`).join('');
            } else {
                alert('Not enough balance!');
            }
        });

        // Pass currentUser to Trading Site via URL
        const userParam = encodeURIComponent(JSON.stringify(currentUser));
        document.querySelector('.bg-blue-500').href = `${TRADING_URL}/index.html?user=${userParam}`;
    }
}

// Logout
if (document.getElementById('logout-link')) {
    document.getElementById('logout-link').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('currentUser');
        currentUser = null;
        alert('Logged out!');
        window.location.href = `${PLATFORM_URL}/login.html`;
    });
}