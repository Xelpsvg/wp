const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const mysql = require('mysql2/promise');
const express = require('express');

// 1. Basit bir Web Sunucusu (Render'ın uyutmaması ve ping atılması için)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('8/A WhatsApp Botu Aktif ve Çalışıyor!');
});

app.listen(PORT, () => {
    console.log(`Web sunucusu ${PORT} portunda calisiyor.`);
});

// 2. MySQL Veritabanı Bağlantı Ayarları (InfinityFree bilgilerin)
const dbConfig = {
    host: 'sql100.infinityfree.com',
    user: 'if0_43132735',
    password: 'KEE4AO6Nm8cmz',
    database: 'if0_43132735_8a'
};

async function mesajlariKontrolEt(sock) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Veritabanından onaylanmış ama henüz WhatsApp'a gönderilmemiş mesajları çek
        const [rows] = await connection.execute("SELECT m.*, u.ad_soyad FROM mesajlar m JOIN kullanicilar u ON m.kullanici_id = u.id WHERE m.durum = 'onaylandi'");

        for (const row of rows) {
            // Hedef WhatsApp grup ID'sini buraya yazmalısın (Örn: 123456789-group@g.us)
            // Ya da test için kendi numaranıza gönderebilirsiniz: row.telefon + "@s.whatsapp.net"
            const hedefGrupID = "GRUBUY_YAZ_BURAYA@g.us"; 

            const gonderilecekMetin = `📢 *8/A LGS Mesaj Panosu*\n\n*Gönderen:* ${row.ad_soyad}\n*Mesaj:* ${row.mesaj_icerigi}`;

            await sock.sendMessage(hedefGrupID, { text: gonderilecekMetin });

            // Mesajın durumunu "gonderildi" olarak güncelle ki tekrar tekrar atmasın
            await connection.execute("UPDATE mesajlar SET durum = 'gonderildi' WHERE id = ?", [row.id]);
            console.log(`Mesaj gruba iletildi: ID ${row.id}`);
        }

        await connection.end();
    } catch (error) {
        console.error("Veritabanı kontrol hatası:", error);
    }
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Bağlantı kapandı, yeniden bağlanılıyor...', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('WhatsApp Botu başarıyla bağlandı!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Her 10 saniyede bir veritabanını kontrol et (onaylı mesaj var mı diye)
    setInterval(() => {
        mesajlariKontrolEt(sock);
    }, 10000);
}

startBot();
