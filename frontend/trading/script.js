document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, starting script...');

    const PLATFORM_URL = 'http://localhost:8000';
    const TRADING_URL = 'http://localhost:8001';

    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

    // Check URL for user data
    const urlParams = new URLSearchParams(window.location.search);
    const userFromUrl = urlParams.get('user');
    if (userFromUrl) {
        try {
            currentUser = JSON.parse(decodeURIComponent(userFromUrl));
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            console.log('User data loaded from URL:', currentUser.handle);
        } catch (e) {
            console.error('Failed to parse user from URL:', e);
        }
    } else {
        console.log('No user data in URL, checking localStorage');
    }

    if (!currentUser) {
        console.log('No currentUser, redirecting to login');
        window.location.href = `${PLATFORM_URL}/login.html`;
        return;
    }

    if (!currentUser.accounts.length) {
        console.log('No accounts, redirecting to dashboard');
        alert('Please buy an account first!');
        window.location.href = `${PLATFORM_URL}/dashboard.html`;
        return;
    }

    // Header Stats
    if (document.getElementById('user-balance')) {
        document.getElementById('user-balance').textContent = currentUser.balance.toFixed(2);
        document.getElementById('realized-pnl').textContent = (currentUser.trades.reduce((sum, t) => sum + t.profit, 0) || 0).toFixed(2);
        document.getElementById('unrealized-pnl').textContent = '0.00';
        console.log('Header stats updated:', { balance: currentUser.balance, realizedPnl: document.getElementById('realized-pnl').textContent });
    }

    // Chart Setup
    if (window.location.pathname.includes('index.html')) {
        console.log('Attempting to initialize chart...');

        // Verify LightweightCharts
        if (typeof LightweightCharts === 'undefined') {
            console.error('LightweightCharts library not found! Check script tag or network.');
            alert('Chart library failed to load. Ensure the Lightweight Charts library is loaded via CDN.');
            return;
        }
        console.log('LightweightCharts library detected');

        // Verify chart element
        const nqChartElement = document.getElementById('nq-chart');
        if (!nqChartElement) {
            console.error('Chart container #nq-chart not found in DOM!');
            alert('Chart container missing. Check the HTML.');
            return;
        }
        console.log('Chart container found:', nqChartElement);

        // Check and set initial dimensions
        let chartWidth = nqChartElement.clientWidth || 800;
        let chartHeight = nqChartElement.clientHeight || 600;
        console.log('Initial chart dimensions:', { width: chartWidth, height: chartHeight });
        if (chartWidth === 0 || chartHeight === 0) {
            console.warn('Chart element has zero size initially, applying fallbacks.');
            nqChartElement.style.minWidth = '800px';
            nqChartElement.style.minHeight = '600px';
            chartWidth = 800;
            chartHeight = 600;
        }

        // Initialize Chart
        let nqChart;
        try {
            nqChart = LightweightCharts.createChart(nqChartElement, {
                width: chartWidth,
                height: chartHeight,
                layout: { background: { color: '#1f2937' }, textColor: '#d1d5db' },
                grid: { vertLines: { color: '#374151' }, horzLines: { color: '#374151' } },
                timeScale: { timeVisible: true, secondsVisible: false }
            });
            console.log('Chart created successfully');
        } catch (e) {
            console.error('Failed to create chart:', e);
            alert('Chart initialization failed. See console for details.');
            return;
        }

        // Verify addCandlestickSeries method
        if (typeof nqChart.addCandlestickSeries !== 'function') {
            console.error('addCandlestickSeries is not a function! Library version might be outdated or incompatible.');
            alert('Chart library error: addCandlestickSeries method not found. Using v4.1.7 should resolve this.');
            return;
        }
        console.log('addCandlestickSeries method available');

        const nqSeries = nqChart.addCandlestickSeries({ upColor: '#00cc00', downColor: '#000000' });
        console.log('Candlestick series added');

        // Mock OHLC Data
        let chartData = [];
        let currentPosition = { contract: null, amount: 0, action: null, entryPrice: 0 };
        let unrealizedPnL = 0;

        function generateOHLC(basePrice, count, intervalSeconds) {
            const data = [];
            let time = Math.floor(Date.now() / 1000) - (count * intervalSeconds);
            let open = basePrice;
            for (let i = 0; i < count; i++) {
                const high = open + Math.random() * 5;
                const low = open - Math.random() * 5;
                const close = low + Math.random() * (high - low);
                data.push({ time: time, open, high, low, close });
                open = close + (Math.random() - 0.5) * 2;
                time += intervalSeconds;
            }
            return data;
        }

        chartData = generateOHLC(19667.50, 300, 60); // 1m intervals
        console.log('Generated initial OHLC data:', chartData.slice(-5));
        nqSeries.setData(chartData);
        console.log('Chart data set');

        // Timeframe Switching
        const timeframeButtons = document.querySelectorAll('.timeframe-btn');
        timeframeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const interval = btn.getAttribute('data-interval');
                const intervals = { '1m': 60, '5m': 300, '15m': 900, '30m': 1800, '1h': 3600 };
                chartData = generateOHLC(19667.50, 300, intervals[interval]);
                nqSeries.setData(chartData);
                timeframeButtons.forEach(b => b.classList.remove('bg-gray-500'));
                btn.classList.add('bg-gray-500');
                console.log(`Switched to ${interval} timeframe`);
            });
        });

        // Order Handling
        document.getElementById('buy-btn').addEventListener('click', () => {
            const contract = document.getElementById('trade-contract').value;
            const amount = parseInt(document.getElementById('trade-amount').value);
            const lastPrice = chartData[chartData.length - 1].close;
            currentPosition = { contract, amount, action: 'buy', entryPrice: lastPrice };
            document.getElementById('current-position').textContent = `${amount} ${contract} (Buy)`;
            updateUnrealizedPnL(lastPrice);
            console.log('Buy order placed:', currentPosition);
        });

        document.getElementById('sell-btn').addEventListener('click', () => {
            const contract = document.getElementById('trade-contract').value;
            const amount = parseInt(document.getElementById('trade-amount').value);
            const lastPrice = chartData[chartData.length - 1].close;
            currentPosition = { contract, amount, action: 'sell', entryPrice: lastPrice };
            document.getElementById('current-position').textContent = `${amount} ${contract} (Sell)`;
            updateUnrealizedPnL(lastPrice);
            console.log('Sell order placed:', currentPosition);
        });

        document.getElementById('close-position').addEventListener('click', () => {
            if (currentPosition.amount === 0) return;
            const lastPrice = chartData[chartData.length - 1].close;
            const profit = currentPosition.action === 'buy' 
                ? (lastPrice - currentPosition.entryPrice) * currentPosition.amount * 10 
                : (currentPosition.entryPrice - lastPrice) * currentPosition.amount * 10;
            currentUser.trades.push({
                contract: currentPosition.contract,
                amount: currentPosition.amount,
                action: currentPosition.action,
                profit: profit
            });
            currentUser.balance += profit;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            document.getElementById('user-balance').textContent = currentUser.balance.toFixed(2);
            document.getElementById('realized-pnl').textContent = (currentUser.trades.reduce((sum, t) => sum + t.profit, 0)).toFixed(2);
            currentPosition = { contract: null, amount: 0, action: null, entryPrice: 0 };
            unrealizedPnL = 0;
            document.getElementById('current-position').textContent = 'None';
            document.getElementById('unrealized-pnl').textContent = '0.00';
            document.getElementById('unrealized-pnl-panel').textContent = '0.00';
            console.log('Position closed, profit:', profit);
        });

        function updateUnrealizedPnL(currentPrice) {
            if (currentPosition.amount === 0) return;
            unrealizedPnL = currentPosition.action === 'buy' 
                ? (currentPrice - currentPosition.entryPrice) * currentPosition.amount * 10 
                : (currentPosition.entryPrice - currentPrice) * currentPosition.amount * 10;
            document.getElementById('unrealized-pnl').textContent = unrealizedPnL.toFixed(2);
            document.getElementById('unrealized-pnl-panel').textContent = unrealizedPnL.toFixed(2);
            console.log('Unrealized P&L updated:', unrealizedPnL.toFixed(2));
        }

        // Simulate real-time updates
        setInterval(() => {
            const lastCandle = chartData[chartData.length - 1];
            const newCandle = {
                time: lastCandle.time + 60,
                open: lastCandle.close,
                high: lastCandle.close + Math.random() * 5,
                low: lastCandle.close - Math.random() * 5,
                close: lastCandle.close + (Math.random() - 0.5) * 2
            };
            chartData.push(newCandle);
            if (chartData.length > 300) chartData.shift();
            nqSeries.setData(chartData);
            updateUnrealizedPnL(newCandle.close);
            console.log('Updated chart with new candle:', newCandle);
        }, 1000);

        // Resize handling
        window.addEventListener('resize', () => {
            chartWidth = nqChartElement.clientWidth || 800;
            chartHeight = nqChartElement.clientHeight || 600;
            nqChart.resize(chartWidth, chartHeight);
            console.log('Resized chart to:', { width: chartWidth, height: chartHeight });
        });
    } // Added missing closing brace for index.html block

    // Trades Page
    if (window.location.pathname.includes('trades.html')) {
        document.getElementById('user-balance').textContent = currentUser.balance;
        document.getElementById('total-trades').textContent = currentUser.trades.length;
        const wins = currentUser.trades.filter(t => t.profit > 0).length;
        document.getElementById('win-rate').textContent = currentUser.trades.length ? ((wins / currentUser.trades.length) * 100).toFixed(1) + '%' : '0%';
        const tradeList = document.getElementById('trade-history');
        tradeList.innerHTML = currentUser.trades.length 
            ? currentUser.trades.slice(-5).reverse().map(t => `<li>${t.contract} (${t.action}) - $${t.profit.toFixed(2)}</li>`).join('') 
            : '<li>No trades yet</li>';

        document.getElementById('trade-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const contract = document.getElementById('trade-contract').value;
            const amount = parseInt(document.getElementById('trade-amount').value);
            const action = document.getElementById('trade-action').value;
            const profit = (Math.random() * 200 - 100) * amount;
            currentUser.trades.push({ contract, amount, action, profit });
            currentUser.balance += profit;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            document.getElementById('user-balance').textContent = currentUser.balance;
            document.getElementById('total-trades').textContent = currentUser.trades.length;
            document.getElementById('win-rate').textContent = currentUser.trades.length ? ((currentUser.trades.filter(t => t.profit > 0).length / currentUser.trades.length) * 100).toFixed(1) + '%' : '0%';
            tradeList.innerHTML = currentUser.trades.slice(-5).reverse().map(t => `<li>${t.contract} (${t.action}) - $${t.profit.toFixed(2)}</li>`).join('');
            alert(`Trade placed: ${action} ${contract} x${amount} = $${profit.toFixed(2)}`);
        });
    }

    // Logout
    if (document.getElementById('logout-link')) {
        document.getElementById('logout-link').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('currentUser');
            alert('Logged out!');
            window.location.href = `${PLATFORM_URL}/login.html`;
        });
    }
});