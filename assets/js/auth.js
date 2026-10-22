// ============================================
// TerraSense Agri — Auth JS (Login & Register)
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    checkIfAlreadyLoggedIn();

    // Bind form events
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Password visibility toggle
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            const icon = btn.querySelector('.material-symbols-outlined') || btn.querySelector('.eye-icon') || btn;
            if (input) {
                if (input.type === 'password') {
                    input.type = 'text';
                    if (icon.classList.contains('material-symbols-outlined')) {
                        icon.textContent = 'visibility_off';
                    } else {
                        icon.innerHTML = '<i class="ph ph-eye-slash"></i>';
                    }
                } else {
                    input.type = 'password';
                    if (icon.classList.contains('material-symbols-outlined')) {
                        icon.textContent = 'visibility';
                    } else {
                        icon.innerHTML = '<i class="ph ph-eye"></i>';
                    }
                }
            }
        });
    });
});

async function checkIfAlreadyLoggedIn() {
    try {
        const res = await fetch(`${App.apiBase}/auth.php?action=check`);
        const data = await res.json();
        if (data.authenticated) {
            window.location.href = '/TerraSense-Agri/pages/dashboard.html';
        }
    } catch (err) {
        // Ignore — not logged in
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const errorEl = document.getElementById('login-error');

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showFormError(errorEl, 'Email dan password harus diisi');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm"></span> Memproses...';
    hideFormError(errorEl);

    try {
        const res = await fetch(`${App.apiBase}/auth.php?action=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (data.success) {
            App.toast(data.message, 'success');
            setTimeout(() => {
                window.location.href = '/TerraSense-Agri/pages/dashboard.html';
            }, 500);
        } else {
            showFormError(errorEl, data.message);
            btn.disabled = false;
            btn.innerHTML = 'Masuk ke Dashboard';
        }
    } catch (err) {
        showFormError(errorEl, 'Gagal terhubung ke server. Periksa koneksi internet.');
        btn.disabled = false;
        btn.innerHTML = 'Masuk ke Dashboard';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const errorEl = document.getElementById('register-error');

    const name = document.getElementById('reg-name')?.value?.trim() || '';
    const email = document.getElementById('reg-email')?.value?.trim() || '';
    const password = document.getElementById('reg-password')?.value || '';
    const confirmPasswordEl = document.getElementById('reg-confirm-password');
    const confirmPassword = confirmPasswordEl ? confirmPasswordEl.value : null;
    const phone = document.getElementById('reg-phone')?.value?.trim() || '';
    const location = document.getElementById('reg-location')?.value?.trim() || 'Sumedang, Jawa Barat';

    // Validation
    if (!name || name.length < 2) {
        showFormError(errorEl, 'Nama harus minimal 2 karakter');
        return;
    }
    if (!email) {
        showFormError(errorEl, 'Email harus diisi');
        return;
    }
    if (password.length < 6) {
        showFormError(errorEl, 'Password harus minimal 6 karakter');
        return;
    }
    if (confirmPassword !== null && password !== confirmPassword) {
        showFormError(errorEl, 'Konfirmasi password tidak cocok');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm"></span> Mendaftarkan...';
    hideFormError(errorEl);

    try {
        const res = await fetch(`${App.apiBase}/auth.php?action=register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, phone, location }),
        });
        const data = await res.json();

        if (data.success) {
            App.toast(data.message, 'success');
            setTimeout(() => {
                window.location.href = '/TerraSense-Agri/pages/dashboard.html';
            }, 500);
        } else {
            showFormError(errorEl, data.message);
            btn.disabled = false;
            btn.innerHTML = 'Daftar Sekarang';
        }
    } catch (err) {
        showFormError(errorEl, 'Gagal terhubung ke server. Periksa koneksi internet.');
        btn.disabled = false;
        btn.innerHTML = 'Daftar Sekarang';
    }
}

function showFormError(el, message) {
    if (el) {
        const textSpan = el.querySelector('span[id$="-text"]');
        if (textSpan) {
            textSpan.textContent = message;
        } else {
            // Fallback if wiped out
            el.innerHTML = `<span class="material-symbols-outlined text-error text-[20px]">error</span><span id="${el.id}-text">${message}</span>`;
        }
        el.classList.remove('hidden');
        el.style.display = '';
    }
}

function hideFormError(el) {
    if (el) {
        el.classList.add('hidden');
    }
}
