document.addEventListener('DOMContentLoaded', () => {
    // === DOM Element Selections ===
    const pasteArea = document.getElementById('paste-area');
    const pastePlaceholder = document.getElementById('paste-placeholder');
    const pastedImage = document.getElementById('pasted-image');
    const outputText = document.getElementById('output-text');
    const copyBtn = document.getElementById('copy-btn');
    const saveBtn = document.getElementById('save-btn');
    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loader-text');
    const notification = document.getElementById('notification');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIconLight = document.getElementById('theme-icon-light');
    const themeIconDark = document.getElementById('theme-icon-dark');

    let currentWorker = null;

    // === Theme Management ===
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            themeIconLight.classList.add('hidden');
            themeIconDark.classList.remove('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            themeIconLight.classList.remove('hidden');
            themeIconDark.classList.add('hidden');
        }
    };

    const currentTheme = localStorage.getItem('theme') || 'light';
    applyTheme(currentTheme);

    themeToggle.addEventListener('click', () => {
        const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    // === OCR Processing Logic ===
    const processImage = async (imageFile) => {
        pastedImage.src = URL.createObjectURL(imageFile);
        pastedImage.classList.remove('hidden');
        pastePlaceholder.classList.add('hidden');
        loader.classList.remove('hidden');
        outputText.value = '';
        copyBtn.disabled = true;
        saveBtn.disabled = true;

        try {
            // Create a new Tesseract worker
            currentWorker = await Tesseract.createWorker({
                logger: m => {
                    console.log(m);
                    if (m.status === 'recognizing text') {
                        loaderText.textContent = `Mengenali teks... (${Math.round(m.progress * 100)}%)`;
                    } else {
                        loaderText.textContent = 'Memproses...';
                    }
                }
            });

            // Load languages: Indonesian (ind) and Arabic (ara)
            await currentWorker.loadLanguage('ind+ara');
            await currentWorker.initialize('ind+ara');
            
            const { data: { text } } = await currentWorker.recognize(imageFile);
            
            outputText.value = text || "Tidak ada teks yang terdeteksi.";
            showNotification(text ? 'Teks berhasil diekstrak!' : 'Tidak ada teks yang terdeteksi.');
            if (text) {
                copyBtn.disabled = false;
                saveBtn.disabled = false;
            }

        } catch (error) {
            console.error(error);
            outputText.value = "Terjadi kesalahan saat memproses gambar.";
            showNotification('Gagal memproses gambar.', 'error');
        } finally {
            loader.classList.add('hidden');
            if (currentWorker) {
                await currentWorker.terminate();
                currentWorker = null;
            }
        }
    };

    // === Clipboard Paste Event Handler ===
    pasteArea.addEventListener('paste', (event) => {
        event.preventDefault();
        const items = (event.clipboardData || window.clipboardData).items;
        let imageFile = null;

        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                imageFile = item.getAsFile();
                break;
            }
        }

        if (imageFile) {
            processImage(imageFile);
        } else {
            showNotification('Data yang ditempel bukan gambar!', 'error');
        }
    });
    
    // Simulate click on paste area to allow paste on mobile
    pasteArea.addEventListener('click', () => {
        // This is a psychological cue. The actual paste is handled by the browser's native paste action.
        showNotification('Sekarang tempel gambar Anda (Ctrl+V atau tahan & tempel).');
    });

    // === Button Actions ===
    copyBtn.addEventListener('click', () => {
        if (outputText.value) {
            navigator.clipboard.writeText(outputText.value)
                .then(() => showNotification('Hasil berhasil disalin!'))
                .catch(() => showNotification('Gagal menyalin.', 'error'));
        }
    });

    saveBtn.addEventListener('click', () => {
        if (outputText.value) {
            const blob = new Blob([outputText.value], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'hasil-ocr.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showNotification('File .txt berhasil disimpan!');
        }
    });

    // === Notification Helper ===
    let notificationTimeout;
    const showNotification = (message, type = 'success') => {
        notification.textContent = message;
        notification.className = notification.className.replace(/bg-slate-800|bg-red-600/g, '');
        notification.classList.add(type === 'success' ? 'bg-slate-800' : 'bg-red-600');
        
        clearTimeout(notificationTimeout);
        notification.classList.remove('opacity-0', 'translate-y-20');

        notificationTimeout = setTimeout(() => {
            notification.classList.add('opacity-0', 'translate-y-20');
        }, 3000);
    };
});