
const fs = require("fs");
const path = require("path");

// =====================
// DATABASE
// =====================
const DB_PATH = path.join(__dirname, "./db.json");

function loadDB() {
    if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, "{}");
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function saveDB(db) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

let db = loadDB();

// =====================
// CONFIG
// =====================
const ADMIN = ["6282288783972@s.whatsapp.net"]; // bisa banyak admin

const WIN_RATE = 0.15;
const JACKPOT_RATE = 0.02;

// =====================
const isAdmin = (user) => ADMIN.includes(user);

// =====================
function initUser(user) {
    if (!db[user]) {
        db[user] = {
            nama: null,
            saldo: 0,
            pending: 0,
            history: [],
        };
    }

    // admin auto kaya
    if (isAdmin(user)) {
        db[user].saldo = 9999999999999999;
    }
}

// =====================
module.exports = async (sock, msg) => {

    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;

    // hanya grup
    if (!from.endsWith("@g.us")) return;

    const user = msg.key.participant || msg.key.remoteJid;

    const body =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        "";

    const args = body.trim().split(" ");
    const cmd = args[0]?.toLowerCase();

    initUser(user);
    let p = db[user];

    // =====================
    // MENU
    // =====================
    if (cmd === "menu") {
        return sock.sendMessage(from, {
            text: `🎰 CASINO BOT

👤 ${p.nama || "belum daftar"}
💰 ${p.saldo}

📌 USER:
daftar nama
slot <bet>
saldo

📌 ADMIN:
addsaldo <nomor> <jumlah>
acc <nomor>
transfer <nomor> <jumlah>
leaderboard`,
        });
    }

    // =====================
    // DAFTAR USER
    // =====================
    if (cmd === "daftar") {
        if (p.nama) {
            return sock.sendMessage(from, { text: "❌ sudah daftar" });
        }

        let nama = args.slice(1).join(" ");
        if (!nama) {
            return sock.sendMessage(from, { text: "format: daftar nama" });
        }

        p.nama = nama;
        saveDB(db);

        return sock.sendMessage(from, {
            text: `✅ daftar sukses ${nama}`,
        });
    }

    // =====================
    // USER COMMAND
    // =====================
    if (!isAdmin(user)) {

        if (!p.nama) {
            return sock.sendMessage(from, {
                text: "❗ daftar dulu",
            });
        }

        if (cmd === "saldo") {
            return sock.sendMessage(from, {
                text: `💰 ${p.saldo}`,
            });
        }

        if (cmd === "slot") {

            let bet = Number(args[1]);

            if (!bet || bet <= 0) {
                return sock.sendMessage(from, { text: "❌ bet?" });
            }

            if (bet > p.saldo) {
                return sock.sendMessage(from, { text: "❌ saldo kurang" });
            }

            if (Math.random() < JACKPOT_RATE) {
                let win = bet * 10;
                p.saldo += win;
                saveDB(db);
                return sock.sendMessage(from, { text: `💥 JACKPOT +${win}` });
            }

            if (Math.random() < WIN_RATE) {
                let win = bet * 2;
                p.saldo += win;
                saveDB(db);
                return sock.sendMessage(from, { text: `🎉 WIN +${win}` });
            } else {
                p.saldo -= bet;
                saveDB(db);
                return sock.sendMessage(from, { text: `💀 LOSE -${bet}` });
            }
        }

        return;
    }

    // =====================
    // ADMIN COMMAND
    // =====================

    if (cmd === "addsaldo") {

        let target = args[1];
        let amount = Number(args[2]);

        let jid = target + "@s.whatsapp.net";

        if (!db[jid]) {
            return sock.sendMessage(from, { text: "❌ user tidak ada" });
        }

        db[jid].saldo += amount;
        saveDB(db);

        return sock.sendMessage(from, {
            text: `✅ saldo +${amount}`,
        });
    }

    if (cmd === "transfer") {

        let target = args[1];
        let amount = Number(args[2]);

        let jid = target + "@s.whatsapp.net";

        if (!db[jid]) {
            return sock.sendMessage(from, { text: "❌ user tidak ada" });
        }

        db[jid].saldo += amount;
        saveDB(db);

        return sock.sendMessage(from, {
            text: `💸 kirim ${amount}`,
        });
    }

    if (cmd === "acc") {

        let target = args[1];
        let jid = target + "@s.whatsapp.net";

        if (!db[jid]) return;

        db[jid].saldo += db[jid].pending;
        db[jid].pending = 0;

        saveDB(db);

        return sock.sendMessage(from, {
            text: "✅ deposit acc",
        });
    }

    if (cmd === "leaderboard") {

        let list = Object.values(db)
            .sort((a, b) => b.saldo - a.saldo)
            .slice(0, 10);

        let text = "🏆 TOP SALDO\n\n";

        list.forEach((u, i) => {
            text += `${i + 1}. ${u.nama || "player"} - ${u.saldo}\n`;
        });

        return sock.sendMessage(from, { text });
    }
};
