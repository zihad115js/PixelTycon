// Game State Management
const gameState = {
    coins: 0,
    clickPower: 1,
    incomePerSecond: 0,
    businesses: [],
    upgrades: {
        click: [],
        business: [],
        special: []
    },
    prestigeTokens: 0,
    prestigeCount: 0,
    prestigeMultiplier: 1,
    gems: 0,
    totalCoinsEarned: 0,
    lastSaveTime: Date.now(),
    offlineEarnings: 0,
    settings: {
        sound: true,
        music: false,
        autoSave: true
    }
};

// Business Definitions
const BUSINESSES = [
    { id: 0, name: 'Lemonade Stand', emoji: '🍋', baseCost: 10, baseIncome: 1, unlockedAt: 0 },
    { id: 1, name: 'Food Truck', emoji: '🚚', baseCost: 50, baseIncome: 5, unlockedAt: 5 },
    { id: 2, name: 'Restaurant', emoji: '🍔', baseCost: 250, baseIncome: 25, unlockedAt: 3 },
    { id: 3, name: 'Hotel', emoji: '🏨', baseCost: 1000, baseIncome: 100, unlockedAt: 5 },
    { id: 4, name: 'Shopping Mall', emoji: '🏬', baseCost: 10000, baseIncome: 1000, unlockedAt: 3 },
    { id: 5, name: 'Movie Theater', emoji: '🎬', baseCost: 50000, baseIncome: 5000, unlockedAt: 5 },
    { id: 6, name: 'Airport', emoji: '✈️', baseCost: 100000, baseIncome: 10000, unlockedAt: 3 },
    { id: 7, name: 'Bank', emoji: '🏦', baseCost: 500000, baseIncome: 50000, unlockedAt: 5 },
    { id: 8, name: 'Casino', emoji: '🎰', baseCost: 1000000, baseIncome: 100000, unlockedAt: 5 },
    { id: 9, name: 'Stadium', emoji: '🏟️', baseCost: 5000000, baseIncome: 500000, unlockedAt: 3 },
];

// Upgrade Definitions
const UPGRADES = {
    click: [
        { id: 'doubleClick', name: 'Double Click', description: '+100% click power', cost: 100, effect: (state) => { state.clickPower *= 2; } },
        { id: 'tripleClick', name: 'Triple Click', description: '+200% click power', cost: 1000, effect: (state) => { state.clickPower *= 3; } },
        { id: 'goldenFinger', name: 'Golden Finger', description: '+5 per click', cost: 10000, effect: (state) => { state.clickPower += 5; } },
        { id: 'platinumTouch', name: 'Platinum Touch', description: '+20 per click', cost: 50000, effect: (state) => { state.clickPower += 20; } },
    ],
    business: [
        { id: 'managerTraining', name: 'Manager Training', description: '+10% all income', cost: 500, effect: (state) => { updateIncomeMultiplier(state, 1.1); } },
        { id: 'bulkBuying', name: 'Bulk Buying', description: '-10% business costs', cost: 5000, effect: (state) => { state.costMultiplier = (state.costMultiplier || 1) * 0.9; } },
        { id: 'automation', name: 'Automation', description: '2x income generation', cost: 50000, effect: (state) => { updateIncomeMultiplier(state, 2); } },
    ],
    special: [
        { id: 'luckyCoin', name: 'Lucky Coin', description: '5% chance double coins', cost: 1000, effect: (state) => { state.luckyChance = true; } },
        { id: 'timeWarp', name: 'Time Warp', description: '1 hour of income (daily)', cost: 100000, effect: (state) => { state.timeWarpUnlocked = true; } },
    ]
};

// Shop Items
const SHOP_ITEMS = {
    gems: [
        { id: 'gems100', name: '100 Gems', gems: 100, price: '$0.99' },
        { id: 'gems500', name: '500 Gems', gems: 500, price: '$3.99' },
        { id: 'gems1200', name: '1200 Gems', gems: 1200, price: '$9.99' },
    ],
    premium: [
        { id: 'noAds', name: 'Remove Ads', description: 'No ads forever', price: '$4.99', gems: 0 },
        { id: 'starterPack', name: 'Starter Pack', description: '200 gems + manager + 2x boost', price: '$2.99', gems: 0 },
        { id: 'goldenPass', name: 'Golden Pass', description: '20% bonus income + daily gems', price: '$4.99/month', gems: 0 },
    ]
};

// Initialize Game
function initGame() {
    // Load from localStorage
    const saved = localStorage.getItem('pixelTycoonSave');
    if (saved) {
        try {
            const loaded = JSON.parse(saved);
            Object.assign(gameState, loaded);
            
            // Calculate offline earnings
            const timeSinceLastSave = (Date.now() - gameState.lastSaveTime) / 1000;
            const offlineSeconds = Math.min(timeSinceLastSave, 12 * 60 * 60); // Cap at 12 hours
            gameState.offlineEarnings = gameState.incomePerSecond * offlineSeconds;
        } catch (e) {
            console.error('Failed to load game state:', e);
        }
    }

    // Initialize businesses
    if (gameState.businesses.length === 0) {
        gameState.businesses = BUSINESSES.map(b => ({
            ...b,
            owned: 0,
            currentCost: b.baseCost,
            currentIncome: b.baseIncome
        }));
    }

    // Initialize upgrades
    if (Object.keys(gameState.upgrades.click).length === 0) {
        gameState.upgrades.click = UPGRADES.click.map(u => ({ ...u, purchased: false }));
        gameState.upgrades.business = UPGRADES.business.map(u => ({ ...u, purchased: false }));
        gameState.upgrades.special = UPGRADES.special.map(u => ({ ...u, purchased: false }));
    }

    // Setup event listeners
    setupEventListeners();
    
    // Render initial UI
    render();

    // Game loop
    setInterval(updateGame, 1000);
    setInterval(saveGame, 10000); // Auto-save every 10 seconds

    // Show offline earnings if any
    if (gameState.offlineEarnings > 0) {
        showOfflineEarningsNotification();
    }
}

// Event Listeners
function setupEventListeners() {
    // Click Button
    document.getElementById('clickButton').addEventListener('click', handleClick);

    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.tab).classList.add('active');
        });
    });

    // Settings Modal
    const menuBtn = document.getElementById('menuBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeButtons = document.querySelectorAll('.close');

    menuBtn.addEventListener('click', () => settingsModal.classList.add('active'));
    closeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('active');
        });
    });

    // Settings Controls
    document.getElementById('soundToggle').addEventListener('change', (e) => {
        gameState.settings.sound = e.target.checked;
    });
    document.getElementById('musicToggle').addEventListener('change', (e) => {
        gameState.settings.music = e.target.checked;
    });
    document.getElementById('autoSaveToggle').addEventListener('change', (e) => {
        gameState.settings.autoSave = e.target.checked;
    });

    document.getElementById('resetGameBtn').addEventListener('click', () => {
        if (confirm('Are you sure? This will reset your game!')) {
            localStorage.removeItem('pixelTycoonSave');
            location.reload();
        }
    });

    document.getElementById('exportSaveBtn').addEventListener('click', exportSave);
    document.getElementById('importSaveBtn').addEventListener('click', importSave);

    // Stats Button
    document.getElementById('statsBtn').addEventListener('click', showStats);

    // Prestige Button
    document.getElementById('prestigeBtn').addEventListener('click', handlePrestige);
}

// Handle Click
function handleClick() {
    const button = document.getElementById('clickButton');
    button.classList.add('pulse');
    setTimeout(() => button.classList.remove('pulse'), 300);

    let earnedCoins = gameState.clickPower;

    // Lucky coin chance
    if (gameState.upgrades.special.find(u => u.id === 'luckyCoin')?.purchased) {
        if (Math.random() < 0.05) {
            earnedCoins *= 2;
        }
    }

    gameState.coins += earnedCoins;
    gameState.totalCoinsEarned += earnedCoins;

    // Show floating coin
    showFloatingCoin(earnedCoins);

    // Play sound
    playSound('click');

    render();
}

// Show floating coin animation
function showFloatingCoin(amount) {
    const container = document.getElementById('floatingCoinsContainer');
    const coin = document.createElement('div');
    coin.className = 'floating-coin';
    coin.textContent = `+${formatNumber(amount)}`;
    coin.style.left = Math.random() * 100 + '%';
    coin.style.top = '50%';
    container.appendChild(coin);
    
    setTimeout(() => coin.remove(), 1000);
}

// Update Game Loop
function updateGame() {
    gameState.coins += gameState.incomePerSecond;
    gameState.totalCoinsEarned += gameState.incomePerSecond;
    render();
}

// Calculate Income Per Second
function calculateIncomePerSecond() {
    let total = 0;
    gameState.businesses.forEach(business => {
        if (business.owned > 0) {
            const income = business.baseIncome * business.owned * gameState.prestigeMultiplier;
            total += income;
        }
    });
    gameState.incomePerSecond = total;
    return total;
}

// Purchase Business
function purchaseBusiness(businessId) {
    const business = gameState.businesses[businessId];
    if (gameState.coins >= business.currentCost) {
        gameState.coins -= business.currentCost;
        business.owned++;
        business.currentCost = Math.ceil(business.baseCost * Math.pow(1.5, business.owned));
        calculateIncomePerSecond();
        playSound('purchase');
        render();
    }
}

// Purchase Upgrade
function purchaseUpgrade(type, upgradeId) {
    let upgrade;
    if (type === 'click') {
        upgrade = gameState.upgrades.click.find(u => u.id === upgradeId);
    } else if (type === 'business') {
        upgrade = gameState.upgrades.business.find(u => u.id === upgradeId);
    } else {
        upgrade = gameState.upgrades.special.find(u => u.id === upgradeId);
    }

    if (upgrade && !upgrade.purchased && gameState.coins >= upgrade.cost) {
        gameState.coins -= upgrade.cost;
        upgrade.purchased = true;
        upgrade.effect(gameState);
        calculateIncomePerSecond();
        playSound('purchase');
        render();
    }
}

// Prestige
function handlePrestige() {
    const prestigeReq = Math.pow(10, 6 + gameState.prestigeCount);
    if (gameState.coins >= prestigeReq) {
        gameState.prestigeTokens++;
        gameState.prestigeCount++;
        gameState.prestigeMultiplier = 1 + (gameState.prestigeTokens * 0.01);
        
        // Reset game
        gameState.coins = 0;
        gameState.clickPower = 1;
        gameState.businesses.forEach(b => {
            b.owned = 0;
            b.currentCost = b.baseCost;
        });
        gameState.upgrades.click.forEach(u => u.purchased = false);
        gameState.upgrades.business.forEach(u => u.purchased = false);
        gameState.upgrades.special.forEach(u => u.purchased = false);
        
        calculateIncomePerSecond();
        playSound('prestige');
        render();
    }
}

// Save Game
function saveGame() {
    gameState.lastSaveTime = Date.now();
    localStorage.setItem('pixelTycoonSave', JSON.stringify(gameState));
}

// Export Save
function exportSave() {
    const data = JSON.stringify(gameState, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pixel-tycoon-save.json';
    a.click();
}

// Import Save
function importSave() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                Object.assign(gameState, imported);
                render();
                alert('Save imported successfully!');
            } catch (err) {
                alert('Failed to import save file');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// Show Offline Earnings
function showOfflineEarningsNotification() {
    const earning = gameState.offlineEarnings;
    gameState.coins += earning;
    gameState.totalCoinsEarned += earning;
    alert(`Welcome back! You earned ${formatNumber(earning)} coins while away!`);
    gameState.offlineEarnings = 0;
}

// Show Stats
function showStats() {
    const statsModal = document.getElementById('statsModal');
    const statsContent = document.getElementById('statsContent');
    
    const stats = `
        <div class="stats-row">
            <span>Total Coins Earned:</span>
            <span>${formatNumber(gameState.totalCoinsEarned)}</span>
        </div>
        <div class="stats-row">
            <span>Current Coins:</span>
            <span>${formatNumber(gameState.coins)}</span>
        </div>
        <div class="stats-row">
            <span>Income Per Second:</span>
            <span>${formatNumber(gameState.incomePerSecond)}</span>
        </div>
        <div class="stats-row">
            <span>Prestige Count:</span>
            <span>${gameState.prestigeCount}</span>
        </div>
        <div class="stats-row">
            <span>Prestige Multiplier:</span>
            <span>${gameState.prestigeMultiplier.toFixed(2)}x</span>
        </div>
        <div class="stats-row">
            <span>Total Businesses Owned:</span>
            <span>${gameState.businesses.reduce((sum, b) => sum + b.owned, 0)}</span>
        </div>
        <div class="stats-row">
            <span>Upgrades Purchased:</span>
            <span>${
                gameState.upgrades.click.filter(u => u.purchased).length +
                gameState.upgrades.business.filter(u => u.purchased).length +
                gameState.upgrades.special.filter(u => u.purchased).length
            }</span>
        </div>
    `;
    
    statsContent.innerHTML = stats;
    statsModal.classList.add('active');
}

// Render UI
function render() {
    calculateIncomePerSecond();

    // Update coin display
    document.getElementById('coinCount').textContent = formatNumber(gameState.coins);
    document.getElementById('incomePerSec').textContent = formatNumber(gameState.incomePerSecond);

    // Render businesses
    renderBusinesses();

    // Render upgrades
    renderUpgrades();

    // Render prestige info
    renderPrestige();

    // Render shop
    renderShop();
}

// Render Businesses
function renderBusinesses() {
    const businessList = document.getElementById('businessList');
    businessList.innerHTML = '';

    gameState.businesses.forEach((business, index) => {
        const isUnlocked = gameState.businesses.filter((b, i) => i < index).reduce((sum, b) => sum + b.owned, 0) >= business.unlockedAt || index === 0;
        
        const item = document.createElement('div');
        item.className = `business-item ${!isUnlocked ? 'locked' : ''}`;
        item.innerHTML = `
            <div class="business-info">
                <div class="business-name">${business.emoji} ${business.name}</div>
                <div class="business-stats">
                    <div>Owned: ${business.owned}</div>
                    <div>Income: ${formatNumber(business.baseIncome * business.owned)} / sec</div>
                </div>
            </div>
            <button class="business-button" onclick="purchaseBusiness(${index})" ${gameState.coins < business.currentCost ? 'disabled' : ''}>
                Buy<br>${formatNumber(business.currentCost)}
            </button>
        `;
        businessList.appendChild(item);
    });
}

// Render Upgrades
function renderUpgrades() {
    renderUpgradeSection('click', 'clickUpgradesContainer', UPGRADES.click);
    renderUpgradeSection('business', 'businessUpgradesContainer', UPGRADES.business);
    renderUpgradeSection('special', 'specialUpgradesContainer', UPGRADES.special);
}

function renderUpgradeSection(type, containerId, upgrades) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    upgrades.forEach(upgrade => {
        const purchased = gameState.upgrades[type].find(u => u.id === upgrade.id)?.purchased || false;
        const item = document.createElement('div');
        item.className = `upgrade-item ${purchased ? 'purchased' : ''}`;
        item.innerHTML = `
            <div class="upgrade-name">${upgrade.name}</div>
            <div class="upgrade-description">${upgrade.description}</div>
            <div class="upgrade-cost">${purchased ? '✓ Purchased' : formatNumber(upgrade.cost)}</div>
            <button class="upgrade-btn" onclick="purchaseUpgrade('${type}', '${upgrade.id}')" ${purchased || gameState.coins < upgrade.cost ? 'disabled' : ''}>
                ${purchased ? 'Owned' : 'Buy'}
            </button>
        `;
        container.appendChild(item);
    });
}

// Render Prestige
function renderPrestige() {
    const prestigeReq = Math.pow(10, 6 + gameState.prestigeCount);
    document.getElementById('prestigeTokens').textContent = gameState.prestigeTokens;
    document.getElementById('prestigeMultiplier').textContent = gameState.prestigeMultiplier.toFixed(2) + 'x';
    document.getElementById('prestigeCount').textContent = gameState.prestigeCount;
    document.getElementById('prestigeRequirement').textContent = `Next prestige at: ${formatNumber(prestigeReq)}`;
    
    const btn = document.getElementById('prestigeBtn');
    btn.disabled = gameState.coins < prestigeReq;
}

// Render Shop
function renderShop() {
    const gemPacksContainer = document.getElementById('gemPacks');
    const premiumOffersContainer = document.getElementById('premiumOffers');

    gemPacksContainer.innerHTML = '';
    premiumOffersContainer.innerHTML = '';

    SHOP_ITEMS.gems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
            <div class="shop-title">💎 ${item.name}</div>
            <div class="shop-price">${item.price}</div>
            <button class="shop-btn">Purchase</button>
        `;
        gemPacksContainer.appendChild(div);
    });

    SHOP_ITEMS.premium.forEach(item => {
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
            <div class="shop-title">${item.name}</div>
            <div class="shop-description">${item.description}</div>
            <div class="shop-price">${item.price}</div>
            <button class="shop-btn">Purchase</button>
        `;
        premiumOffersContainer.appendChild(div);
    });
}

// Utility Functions
function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return Math.floor(num).toString();
}

function playSound(type) {
    if (!gameState.settings.sound) return;
    // Sound implementation would go here
    // For now, we'll use the Web Audio API or HTML5 audio
}

function updateIncomeMultiplier(state, multiplier) {
    state.businesses.forEach(b => {
        b.baseIncome *= multiplier;
    });
}

// Initialize game on page load
window.addEventListener('DOMContentLoaded', initGame);

// Save game on page unload
window.addEventListener('beforeunload', saveGame);