document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = 'http://localhost:5000';
    const PLATFORM_URL = 'http://localhost:8000';
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    console.log('Initial currentUser:', currentUser);

    if (!currentUser) {
        console.log('No currentUser, redirecting to login');
        window.location.href = `${PLATFORM_URL}/login.html`;
        return;
    }

    // Refresh user data
    try {
        console.log('Fetching user data from server...');
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email, password: currentUser.password })
        });
        console.log('Login response status:', response.status);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Login failed: ${response.status} - ${errorText}`);
        }
        currentUser = await response.json();
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        console.log('Updated currentUser:', currentUser);
    } catch (error) {
        console.error('Error refreshing user:', error);
        localStorage.removeItem('currentUser');
        window.location.href = `${PLATFORM_URL}/login.html`;
        return;
    }

    if (!currentUser.accounts.length) {
        console.log('No accounts, redirecting to dashboard');
        alert('Please buy an account on the Platform site first!');
        window.location.href = `${PLATFORM_URL}/dashboard.html`;
        return;
    }

    if (document.getElementById('user-handle')) {
        document.getElementById('user-handle').textContent = currentUser.handle;
    }

    // Charts Page
    if (window.location.pathname.includes('charts.html')) {
        console.log('Initializing charts...');
        if (typeof LightweightCharts === 'undefined') {
            console.error('TradingView Lightweight Charts library not loaded!');
            alert('Chart library failed to load. Check your internet or use a local copy.');
            return;
        }
        console.log('TradingView library loaded successfully');

        function generateOHLC(basePrice, count, contract) {
            const data = [];
            let time = Math.floor(Date.now() / 1000) - (count * 60);
            let open = basePrice;
            for (let i = 0; i < count; i++) {
                const high = open + Math.random() * 5;
                const low = open - Math.random() * 5;
                const close = low + Math.random() * (high - low);
                const trades = currentUser.trades.filter(t => t.contract === contract && Math.floor(new Date(t.date).getTime() / 1000 / 60) === Math.floor(time / 60));
                if (trades.length) {
                    const tradeImpact = trades.reduce((sum, t) => sum + (t.action === 'buy' ? 2 : -2) * t.amount, 0);
                    open += tradeImpact;
                    close += tradeImpact;
                }
                data.push({ time: time, open, high, low, close });
                open = close + (Math.random() - 0.5) * 2;
                time += 60;
            }
            return data;
        }

        const spChartElement = document.getElementById('sp-chart');
        if (!spChartElement) {
            console.error('SP chart element not found!');
            return;
        }
        console.log('SP chart element found');
        const spChart = LightweightCharts.createChart(spChartElement, {
            width: spChartElement.clientWidth,
            height: 400,
            layout: { background: { color: '#1f2937' }, textColor: '#d1d5db' },
            grid: { vertLines: { color: '#374151' }, horzLines: { color: '#374151' } },
            timeScale: { timeVisible: true, secondsVisible: false },
        });
        const spSeries = spChart.addCandlestickSeries({ upColor: '#00cc00', downColor: '#ff0000' });
        let spData = generateOHLC(4832, 300, 'E-mini S&P');
        spSeries.setData(spData);
        console.log('SP Data:', spData.slice(-5));

        const spMarkers = spChart.addLineSeries({ color: 'transparent', lineWidth: 0 });
        let spTradeMarkers = currentUser.trades
            .filter(t => t.contract === 'E-mini S&P')
            .map(t => ({
                time: Math.floor(new Date(t.date).getTime() / 1000),
                position: 'aboveBar',
                color: t.action === 'buy' ? '#00cc00' : '#ff0000',
                shape: t.action === 'buy' ? 'arrowUp' : 'arrowDown',
                text: `${t.action} x${t.amount}`
            }));
        spMarkers.setMarkers(spTradeMarkers);

        const nasdaqChartElement = document.getElementById('nasdaq-chart');
        if (!nasdaqChartElement) {
            console.error('Nasdaq chart element not found!');
            return;
        }
        console.log('Nasdaq chart element found');
        const nasdaqChart = LightweightCharts.createChart(nasdaqChartElement, {
            width: nasdaqChartElement.clientWidth,
            height: 400,
            layout: { background: { color: '#1f2937' }, textColor: '#d1d5db' },
            grid: { vertLines: { color: '#374151' }, horzLines: { color: '#374151' } },
            timeScale: { timeVisible: true, secondsVisible: false },
        });
        const nasdaqSeries = nasdaqChart.addCandlestickSeries({ upColor: '#00cc00', downColor: '#ff0000' });
        let nasdaqData = generateOHLC(15927, 300, 'Nasdaq Micro');
        nasdaqSeries.setData(nasdaqData);
        console.log('Nasdaq Data:', nasdaqData.slice(-5));

        const nasdaqMarkers = nasdaqChart.addLineSeries({ color: 'transparent', lineWidth: 0 });
        let nasdaqTradeMarkers = currentUser.trades
            .filter(t => t.contract === 'Nasdaq Micro')
            .map(t => ({
                time: Math.floor(new Date(t.date).getTime() / 1000),
                position: 'aboveBar',
                color: t.action === 'buy' ? '#00cc00' : '#ff0000',
                shape: t.action === 'buy' ? 'arrowUp' : 'arrowDown',
                text: `${t.action} x${t.amount}`
            }));
        nasdaqMarkers.setMarkers(nasdaqTradeMarkers);

        async function updateCharts() {
            const spLast = spData[spData.length - 1].close;
            const nasdaqLast = nasdaqData[nasdaqData.length - 1].close;
            document.getElementById('sp-price').textContent = spLast.toFixed(2);
            document.getElementById('nasdaq-price').textContent = nasdaqLast.toFixed(2);

            const time = Math.floor(Date.now() / 1000);
            const newSp = { 
                time, 
                open: spLast, 
                high: spLast + Math.random() * 5, 
                low: spLast - Math.random() * 5, 
                close: spLast + (Math.random() - 0.5) * 2 
            };
            const newNasdaq = { 
                time, 
                open: nasdaqLast, 
                high: nasdaqLast + Math.random() * 20, 
                low: nasdaqLast - Math.random() * 20, 
                close: nasdaqLast + (Math.random() - 0.5) * 10 
            };

            spData.shift(); spData.push(newSp);
            nasdaqData.shift(); nasdaqData.push(newNasdaq);
            spSeries.setData(spData);
            nasdaqSeries.setData(nasdaqData);

            const latestTrades = currentUser.trades.filter(t => Math.floor(new Date(t.date).getTime() / 1000) >= time - 60);
            latestTrades.forEach(t => {
                const marker = {
                    time: Math.floor(new Date(t.date).getTime() / 1000),
                    position: 'aboveBar',
                    color: t.action === 'buy' ? '#00cc00' : '#ff0000',
                    shape: t.action === 'buy' ? 'arrowUp' : 'arrowDown',
                    text: `${t.action} x${t.amount}`
                };
                if (t.contract === 'E-mini S&P') spTradeMarkers.push(marker);
                if (t.contract === 'Nasdaq Micro') nasdaqTradeMarkers.push(marker);
            });
            spMarkers.setMarkers(spTradeMarkers);
            nasdaqMarkers.setMarkers(nasdaqTradeMarkers);
        }
        updateCharts();
        setInterval(updateCharts, 1000);
    }

    // Trades Page
    if (window.location.pathname.includes('trades.html')) {
        document.getElementById('user-balance').textContent = currentUser.balance;
        document.getElementById('total-trades').textContent = currentUser.trades.length;
        const wins = currentUser.trades.filter(t => t.profit > 0).length;
        document.getElementById('win-rate').textContent = currentUser.trades.length ? ((wins / currentUser.trades.length) * 100).toFixed(1) + '%' : '0%';

        const tradeList = document.getElementById('trade-history');
        tradeList.innerHTML = currentUser.trades.length 
            ? currentUser.trades.slice(-5).reverse().map(t => `<li>${t.contract} (${t.action}) x${t.amount} - $${t.profit.toFixed(2)} (${new Date(t.date).toLocaleTimeString()})</li>`).join('') 
            : '<li>No trades yet</li>';

        document.getElementById('trade-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const contract = document.getElementById('trade-contract').value;
            const amount = parseInt(document.getElementById('trade-amount').value);
            const action = document.getElementById('trade-action').value;

            const response = await fetch(`${API_URL}/trade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: currentUser.id, contract, amount, action })
            });
            const data = await response.json();
            if (response.ok) {
                currentUser.balance = data.balance;
                currentUser.trades = data.trades;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                alert(`Trade placed: ${action} ${contract} x${amount} = $${data.trades[data.trades.length - 1].profit.toFixed(2)}`);
                document.getElementById('trade-form').reset();
                refreshTrades();
            } else {
                alert(data.error);
            }
        });
    }

    // Logout
    if (document.getElementById('logout-link')) {
        document.getElementById('logout-link').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('currentUser');
            alert('Logged out successfully');
            window.location.href = `${PLATFORM_URL}/login.html`;
        });
    }

    function refreshTrades() {
        document.getElementById('user-balance').textContent = currentUser.balance;
        document.getElementById('total-trades').textContent = currentUser.trades.length;
        const wins = currentUser.trades.filter(t => t.profit > 0).length;
        document.getElementById('win-rate').textContent = currentUser.trades.length ? ((wins / currentUser.trades.length) * 100).toFixed(1) + '%' : '0%';
        const tradeList = document.getElementById('trade-history');
        tradeList.innerHTML = currentUser.trades.slice(-5).reverse().map(t => `<li>${t.contract} (${t.action}) x${t.amount} - $${t.profit.toFixed(2)} (${new Date(t.date).toLocaleTimeString()})</li>`).join('');
    }
});
document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = 'http://localhost:5000';
    const PLATFORM_URL = 'http://localhost:8000';
    const token = localStorage.getItem('sessionToken');

    if (!token) {
        window.location.href = `${PLATFORM_URL}/login.html`;
        return;
    }

    try {
        const response = await fetch(`${API_URL}/get_user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        if (!response.ok) {
            throw new Error('Invalid token');
        }
        const currentUser = await response.json();
        // Proceed with loading the trading page (e.g., charts, trades)
        console.log('User authenticated:', currentUser.handle);
    } catch (error) {
        console.error('Error:', error);
        localStorage.removeItem('sessionToken');
        window.location.href = `${PLATFORM_URL}/login.html`;
    }
});