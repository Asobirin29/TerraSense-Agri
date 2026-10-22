// ============================================
// TerraSense Agri — Shared App Utilities
// ============================================

const App = {
    // Base URL for API calls
    apiBase: '/TerraSense-Agri/api',
    uploadBase: '/TerraSense-Agri/uploads/avatars/',

    // ============================================
    // AUTH CHECK — Redirect if not logged in
    // ============================================
    async checkAuth(redirectIfNotAuth = true) {
        try {
            const res = await fetch(`${this.apiBase}/auth.php?action=check`);
            const data = await res.json();
            if (data.authenticated && data.user) {
                return data.user;
            }
            if (redirectIfNotAuth) {
                window.location.href = '/TerraSense-Agri/pages/login.html';
            }
            return null;
        } catch (err) {
            console.error('Auth check failed:', err);
            if (redirectIfNotAuth) {
                window.location.href = '/TerraSense-Agri/pages/login.html';
            }
            return null;
        }
    },

    // ============================================
    // LOGOUT
    // ============================================
    async logout() {
        try {
            await fetch(`${this.apiBase}/auth.php?action=logout`);
        } catch (err) {
            console.error('Logout error:', err);
        }
        window.location.href = '/TerraSense-Agri/pages/login.html';
    },

    // ============================================
    // API HELPER — fetch wrapper
    // ============================================
    async api(endpoint, options = {}) {
        const url = `${this.apiBase}/${endpoint}`;
        const config = {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        };

        const res = await fetch(url, config);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Terjadi kesalahan');
        }

        return data;
    },

    // ============================================
    // TOAST NOTIFICATION
    // ============================================
    toast(message, type = 'success', duration = 4000) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: '<i class="ph-fill ph-check-circle"></i>',
            error: '<i class="ph-fill ph-warning-circle"></i>',
            info: '<i class="ph-fill ph-info"></i>',
        };

        toast.innerHTML = `<span>${icons[type] || '📢'}</span><span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastSlideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    // ============================================
    // RENDER NAVBAR
    // ============================================
    renderNavbar(user, activePage = '') {
        const navbar = document.getElementById('navbar');
        if (!navbar) return;

        const isDashboard = activePage === 'dashboard';
        const isMap = activePage === 'map';

        const avatarHtml = user.avatar
            ? `<img src="${this.uploadBase}${user.avatar}" alt="${user.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
            : `<span class="avatar-placeholder">${user.name.charAt(0).toUpperCase()}</span>`;

        navbar.innerHTML = `
        <div class="navbar-inner">
            <a href="/TerraSense-Agri/pages/dashboard.html" class="navbar-brand">
                <span class="navbar-brand-icon"><i class="ph-fill ph-plant"></i></span>
                <span class="navbar-brand-text"><span>Terra</span><span>Sense</span></span>
            </a>
            <nav class="navbar-nav">
                <a href="/TerraSense-Agri/pages/dashboard.html" class="navbar-link ${isDashboard ? 'active' : ''}">
                    <span class="nav-icon"><i class="ph-fill ph-house"></i></span>
                    <span>Dashboard</span>
                </a>
                <a href="/TerraSense-Agri/pages/farm-map.html" class="navbar-link ${isMap ? 'active' : ''}">
                    <span class="nav-icon"><i class="ph-fill ph-map-trifold"></i></span>
                    <span>Peta Lahan</span>
                </a>
                <a href="/TerraSense-Agri/pages/profile.html" class="navbar-user">
                    <div class="avatar avatar-sm">${avatarHtml}</div>
                    <span class="navbar-user-name">${user.name}</span>
                </a>
            </nav>
        </div>`;
    },

    // ============================================
    // ESCAPE HELPERS
    // ============================================
    // Escape text before putting it into innerHTML
    escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    // The API stores text already HTML-escaped (sanitize()); decode it for textContent / input values
    decodeEntities(str) {
        if (str === null || str === undefined) return '';
        const ta = document.createElement('textarea');
        ta.innerHTML = String(str);
        return ta.value;
    },

    // ============================================
    // FORMAT HELPERS
    // ============================================
    formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    },

    formatDateTime(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    },

    timeAgo(dateStr) {
        const now = new Date();
        const d = new Date(dateStr);
        const diff = Math.floor((now - d) / 1000);

        if (diff < 60) return 'Baru saja';
        if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
        return this.formatDate(dateStr);
    },

    // ============================================
    // ZONE HELPERS
    // ============================================
    getZoneName(zone) {
        const zones = {
            highland: 'Dataran Tinggi',
            midland: 'Dataran Sedang',
            lowland: 'Dataran Rendah',
        };
        return zones[zone] || zone;
    },

    getZoneBadgeClass(zone) {
        return `badge badge-${zone}`;
    },

    getZoneEmoji: function(zoneId) {
        const icons = { highland: '<i class="ph-fill ph-mountains"></i>', midland: '<i class="ph-fill ph-plant"></i>', lowland: '<i class="ph-fill ph-drop"></i>' };
        return icons[zoneId] || '<i class="ph-fill ph-map-pin"></i>';
    },

    // ============================================
    // AVATAR HELPER
    // ============================================
    getAvatarHTML(user, sizeClass = '') {
        if (user.avatar) {
            return `<div class="avatar ${sizeClass}"><img src="${this.uploadBase}${user.avatar}" alt="${user.name}"></div>`;
        }
        return `<div class="avatar ${sizeClass}"><span class="avatar-placeholder">${(user.name || 'U').charAt(0).toUpperCase()}</span></div>`;
    },

    // ============================================
    // ANIMATE NUMBER (Count-up Effect)
    // ============================================
    animateNumber(element, target, decimals = 0, duration = 800) {
        const startTime = performance.now();
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = target * eased;
            element.textContent = current.toFixed(decimals);
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    },

    // ============================================
    // SIDEBAR TOGGLE
    // ============================================
    initSidebarToggle() {
        const toggleBtn = document.getElementById('sidebar-toggle');
        const overlay = document.getElementById('sidebar-overlay');
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                document.body.classList.toggle('sidebar-toggled');
                setTimeout(() => {
                    if (window.map) window.map.invalidateSize();
                }, 300);
            });
        }
        
        if (overlay) {
            overlay.addEventListener('click', () => {
                document.body.classList.remove('sidebar-toggled');
                setTimeout(() => {
                    if (window.map) window.map.invalidateSize();
                }, 300);
            });
        }
    },

    // ============================================
    // SIDEBAR FARMS MENU
    // ============================================
    async initSidebarFarms() {
        const toggleBtn = document.getElementById('toggle-daftar-lahan');
        const listContainer = document.getElementById('sidebar-farms-list');
        const icon = document.getElementById('daftar-lahan-icon');
        
        if (!toggleBtn || !listContainer) return;

        // Toggle logic
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            listContainer.classList.toggle('hidden');
            listContainer.classList.toggle('flex');
            if (icon) {
                icon.classList.toggle('rotate-180');
            }
        });

        try {
            const data = await this.api('farms.php');
            listContainer.innerHTML = ''; // clear loading
            const cropsRes = await fetch('/TerraSense-Agri/assets/data/crops.json').catch(() => null);
            let crops = [];
            if (cropsRes && cropsRes.ok) crops = await cropsRes.json();

            if (data.farms && data.farms.length > 0) {
                data.farms.forEach(farm => {
                    const a = document.createElement('a');
                    a.href = `/TerraSense-Agri/pages/farm-map.html?id=${farm.id}`;
                    
                    const isPlanted = farm.crop_id && farm.planting_date;
                    const cropName = isPlanted ? (crops.find(c => c.id == farm.crop_id || c.name == farm.crop_id)?.name || 'Ditanami') : 'Lahan Kosong';
                    const badgeClass = isPlanted ? 'bg-sage-accent text-primary' : 'bg-white/10 text-white/50';

                    a.className = 'nav-sub-item';
                    a.innerHTML = `
                        <div style="display:flex;align-items:center;gap:6px;">
                            ${this.getZoneEmoji ? this.getZoneEmoji(farm.zone) : '🌾'} 
                            <span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${farm.name}</span>
                        </div>
                        <div style="display:flex;align-items:center;justify-content:space-between;padding-left:26px;margin-top:2px;">
                            <span style="font-size:0.7rem;color:var(--bark-muted);">${parseFloat(farm.area_ha).toFixed(2)} Ha</span>
                            <span style="font-size:0.6rem;padding:2px 6px;border-radius:4px;background:rgba(90,138,96,0.15);color:var(--sage-light);text-transform:uppercase;font-weight:700;">${cropName}</span>
                        </div>
                    `;
                    listContainer.appendChild(a);
                });
            } else {
                listContainer.innerHTML = '<div class="text-on-primary/50 text-xs px-3 py-2">Belum ada lahan</div>';
            }
        } catch (err) {
            console.error('Failed to load farms for sidebar', err);
            listContainer.innerHTML = '<div class="text-error text-xs px-3 py-2">Gagal memuat lahan</div>';
        }
    }
};

function initApp() {
    if (App.initSidebarToggle) App.initSidebarToggle();
    if (App.initSidebarFarms) App.initSidebarFarms();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
