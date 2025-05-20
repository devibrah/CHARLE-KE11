const PastebinAPI = require('pastebin-js'),
    pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL');
const { makeid } = require('./id');
const QRCode = require('qrcode');
const express = require('express');
const path = require('path');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const baileys = require("@whiskeysockets/baileys");
const { 
    makeWASocket, 
    useMultiFileAuthState, 
    Browsers, 
    delay 
} = baileys;

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    let responseSent = false;

    async function BWM_XMD_QR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        try {
            let sock = makeWASocket({
                auth: state,
                printQRInTerminal: false,
                logger: pino({ level: "silent" }),
                browser: Browsers.macOS("Desktop"),
            });

            // Listen for QR events
            for await (const update of sock.ev["connection.update"]) {
                const { connection, lastDisconnect, qr } = update;
                if (qr && !responseSent) {
                    const qrImage = await QRCode.toDataURL(qr);
                    const htmlContent = `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>QR Code Scanner</title>
                        <style>
                            body {
                                margin: 0;
                                overflow: hidden;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                height: 100vh;
                                background: black;
                            }
                            video {
                                position: absolute;
                                top: 0;
                                left: 0;
                                width: 100%;
                                height: 100%;
                                object-fit: cover;
                                z-index: -1;
                            }
                            img {
                                z-index: 1;
                                border: 5px solid white;
                                border-radius: 15px;
                            }
                        </style>
                    </head>
                    <body>
                        <video autoplay muted loop>
                            <source src="https://files.catbox.moe/d5ch2k.mp4">
                        </video>
                        <img src="${qrImage}" alt="Scan this QR code">
                    </body>
                    </html>
                    `;
                    res.send(htmlContent);
                    responseSent = true;
                }

                if (connection === "open") {
                    await delay(10000);
                    let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
                    await delay(1000);

                    // Directly convert to base64
                    let b64data = Buffer.from(data).toString('base64');

                    await sock.sendMessage(sock.user.id, { text: '' + b64data });

                    let BWM_XMD_TEXT = `
🔐 *Session Successfully Connected*  
*Welcome to Charles md Platform*  


                    `;

                    await sock.sendMessage(sock.user.id, {
                        image: { url: 'https://files.catbox.moe/642del.jpeg' },
                        caption: BWM_XMD_TEXT
                    });

                    await sock.sendMessage(sock.user.id, {
                        audio: { url: 'https://files.catbox.moe/l1dfxb.mp3' },
                        mimetype: 'audio/mp4',
                        ptt: true
                    });

                    await delay(100);
                    await sock.ws.close();
                    return await removeFile('./temp/' + id);
                } else if (
                    connection === "close" &&
                    lastDisconnect &&
                    lastDisconnect.error &&
                    lastDisconnect.error.output &&
                    lastDisconnect.error.output.statusCode != 401
                ) {
                    await delay(10000);
                    BWM_XMD_QR_CODE();
                }
            }

            // Listen for creds.update events to save credentials
            for await (const credsUpdate of sock.ev["creds.update"]) {
                await saveCreds();
            }
        } catch (err) {
            if (!responseSent) {
                res.json({ code: "Service is Currently Unavailable" });
                responseSent = true;
            }
            console.log(err);
            await removeFile('./temp/' + id);
        }
    }

    return await BWM_XMD_QR_CODE();
});

module.exports = router;
