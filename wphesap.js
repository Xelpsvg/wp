const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
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
const SITE_API_URL = "https://8-a.xo.je/api.php"; // Kendi site adresini yaz
const API_KEY = "8A_LGS_Ozel_Bot_Anahtari_123";

async function mesajlariKontrolEt(sock) {
    try {
        // Sitendeki API'ye bağlanıp onaylı mesajları isteyelim
        const response = await fetch(`${SITE_API_URL}?key=${API_KEY}&islem=mesajlari_cek`);
        const rows = await response.json();

        if (!Array.isArray(rows)) return;

        for (const row of rows) {
            // Hedef WhatsApp grup ID'sini buraya yazmalısın (Örn: 123456789-group@g.us)
            const hedefGrupID = "GRUBUY_YAZ_BURAYA@g.us"; 

            const gonderilecekMetin = `📢 *8/A LGS Mesaj Panosu*\n\n*Gönderen:* ${row.ad_soyad}\n*Mesaj:* ${row.mesaj_icerigi}`;

            // Mesajı WhatsApp grubuna gönder
            await sock.sendMessage(hedefGrupID, { text: gonderilecekMetin });

            // Sitedeki API'ye bildirerek mesajın durumunu "gonderildi" yapalım
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
        auth: state
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // QR Kod terminalde çıkmazsa Render loglarından okuyabilmen için
        if (qr) {
            console.log("Lütfen Render Logs ekranındaki QR Kodu taratın!");
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

    // Her 10 saniyede bir sitendeki API'yi kontrol et
    setInterval(() => {
        mesajlariKontrolEst ? mesajlariKontrolEt(sock) : mesajlariKontrolEt(sock);
    }, 10000);
}

startBot();
