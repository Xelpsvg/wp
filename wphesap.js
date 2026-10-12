const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal'); // QR kodu ekranda çizdirmek için
const express = require('express');

// 1. Render'ın uyutmaması için Express Web Sunucusu
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('8/A WhatsApp Botu API Köprüsü ile Çalışıyor!');
});

app.listen(PORT, () => {
    console.log(`Web sunucusu ${PORT} portunda calisiyor.`);
});

// 2. Sitenizin API Bilgileri
const SITE_API_URL = "https://8-a.xo.je/api.php"; // Kendi site adresin
const API_KEY = "8A_LGS_Ozel_Bot_Anahtari_123";

async function mesajlariKontrolEt(sock) {
    try {
        const response = await fetch(`${SITE_API_URL}?key=${API_KEY}&islem=mesajlari_cek`);
        const rows = await response.json();

        if (!Array.isArray(rows)) return;

        for (const row of rows) {
            // WhatsApp grup ID'nizi buraya yazın (Örn: 123456789-group@g.us)
            const hedefGrupID = "GRUBUY_YAZ_BURAYA@g.us"; 

            const gonderilecekMetin = `📢 *8/A LGS Mesaj Panosu*\n\n*Gönderen:* ${row.ad_soyad}\n*Mesaj:* ${row.mesaj_icerigi}`;

            await sock.sendMessage(hedefGrupID, { text: gonderilecekMetin });

            await fetch(SITE_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `key=${API_KEY}&islem=durum_guncelle&mesaj_id=${row.id}`
            });

            console.log(`Mesaj gruba iletildi ve güncellendi: ID ${row.id}`);
        }
    } catch (error) {
        console.error("API bağlantı hatası:", error);
    }
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false // Kendi özel QR basıcaz
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // QR kod geldiğinde terminale çizdir
        if (qr) {
            console.log("QR Kod Alındı, Lütfen Taratın:");
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Bağlantı kapandı, yeniden bağlanılıyor...', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('WhatsApp Botu API üzerinden başarıyla bağlandı!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    setInterval(() => {
        mesajlariKontrolEt(sock);
    }, 10000);
}

startBot();
