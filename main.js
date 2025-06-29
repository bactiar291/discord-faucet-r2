require('dotenv').config();
const axios = require("axios");
const FormData = require("form-data");
const { v4: uuid } = require("uuid");

const DISCORD_TOKEN = process.env.TOKEN;
const APP_ID = "1356609826230243469";
const GUILD_ID = "1308368864505106442";
const COMMAND_ID = "1356665931056808211";
const COMMAND_VERSION = "1356665931056808212";
const wallet_address = process.env.WALLET_ADDRESS;

const NETWORK_CHANNEL_IDS = {
    "Sepolia": "1339883019556749395"
};

let MY_USER_ID = null;

async function fetchMyUserId() {
    if (MY_USER_ID) return MY_USER_ID;
    const res = await axios.get("https://discord.com/api/v9/users/@me", {
        headers: { Authorization: DISCORD_TOKEN }
    });
    MY_USER_ID = res.data.id;
    return MY_USER_ID;
}

async function claimFaucet(network) {
    try {
        if (!DISCORD_TOKEN) {
            throw new Error("TOKEN tidak ditemukan di .env");
        }
        if (!wallet_address) {
            throw new Error("WALLET_ADDRESS tidak tersedia di .env");
        }
        const channelId = NETWORK_CHANNEL_IDS[network];
        if (!channelId) {
            throw new Error(`Jaringan ${network} tidak didukung`);
        }

        const userId = await fetchMyUserId();
        const address = wallet_address;

        const payload = {
            type: 2,
            application_id: APP_ID,
            guild_id: GUILD_ID,
            channel_id: channelId,
            session_id: uuid(),
            data: {
                version: COMMAND_VERSION,
                id: COMMAND_ID,
                name: "faucet",
                type: 1,
                options: [{ type: 3, name: "address", value: address }]
            },
            nonce: Date.now().toString()
        };

        const form = new FormData();
        form.append("payload_json", JSON.stringify(payload));

        await axios.post("https://discord.com/api/v9/interactions", form, {
            headers: { Authorization: DISCORD_TOKEN, ...form.getHeaders() }
        });

        console.log(`[${network}] Command Claiming Faucet Sent...`);

        await new Promise(resolve => setTimeout(resolve, 2000));

        const res = await axios.get(
            `https://discord.com/api/v9/channels/${channelId}/messages?limit=10`,
            { headers: { Authorization: DISCORD_TOKEN } }
        );

        const messages = res.data;
        const myResponse = messages.find(m =>
            m.author.id === APP_ID && m.interaction?.user?.id === userId
        );

        if (!myResponse) {
            console.log(`[${network}] No Response Claiming.`);
            return;
        }

        const txt = myResponse.content || "";
        if (txt.includes("successfully")) {
            console.log(`[${network}] Claiming Faucet Successfully`);
        } else if (txt.toLowerCase().includes("claim failed")) {
            console.log(`[${network}] ${txt.split("\n")[0]}`);
        } else {
            console.log(`[${network}] Unknown Status: ${txt}`);
        }
    } catch (error) {
        console.error(`[${network}] Error: ${error.message}`);
    }
}

async function main() {
    await claimFaucet("Sepolia");
}

main().catch(console.error);
