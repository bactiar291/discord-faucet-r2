require('dotenv').config();
const axios = require("axios");
const FormData = require("form-data");
const { v4: uuid } = require("uuid");

const ACCOUNTS = [
  {
    name: "Akun 1",
    discordToken: process.env.TOKEN_1,
    sepoliaWallet: process.env.WALLET_1_SEPOLIA
  },
  {
    name: "Akun 2",
    discordToken: process.env.TOKEN_2,
    sepoliaWallet: process.env.WALLET_2_SEPOLIA
  },
  {
    name: "Akun 3",
    discordToken: process.env.TOKEN_3,
    sepoliaWallet: process.env.WALLET_3_SEPOLIA
  },
  {
    name: "Akun 4",
    discordToken: process.env.TOKEN_4,
    sepoliaWallet: process.env.WALLET_4_SEPOLIA
  }
];

const NETWORKS = [
  {
    name: "Sepolia",
    channelId: "1339883019556749395"
  }
];

const BOT_CONFIG = {
  APP_ID: "1356609826230243469",
  GUILD_ID: "1308368864505106442",
  COMMAND_ID: "1356665931056808211",
  COMMAND_VERSION: "1356665931056808212",
  DELAY_BETWEEN_ACCOUNTS: 15000 
};

async function fetchUserId(discordToken) {
  try {
    const res = await axios.get("https://discord.com/api/v9/users/@me", {
      headers: { Authorization: discordToken }
    });
    return res.data.id;
  } catch (error) {
    console.error(`Error fetching user ID: ${error.message}`);
    return null;
  }
}

async function claimFaucet(account, network) {
  if (network.name !== "Sepolia") return; 
  
  try {
    if (!account.sepoliaWallet) {
      console.log(`[${account.name}] ❌ Wallet Sepolia tidak ditemukan`);
      return;
    }

    const userId = await fetchUserId(account.discordToken);
    if (!userId) return;

    const payload = {
      type: 2,
      application_id: BOT_CONFIG.APP_ID,
      guild_id: BOT_CONFIG.GUILD_ID,
      channel_id: network.channelId,
      session_id: uuid(),
      data: {
        version: BOT_CONFIG.COMMAND_VERSION,
        id: BOT_CONFIG.COMMAND_ID,
        name: "faucet",
        type: 1,
        options: [{ type: 3, name: "address", value: account.sepoliaWallet }]
      },
      nonce: Date.now().toString()
    };

    const form = new FormData();
    form.append("payload_json", JSON.stringify(payload));

    await axios.post("https://discord.com/api/v9/interactions", form, {
      headers: { Authorization: account.discordToken, ...form.getHeaders() }
    });

    console.log(`[${account.name}][${network.name}] Permintaan dikirim...`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const res = await axios.get(
      `https://discord.com/api/v9/channels/${network.channelId}/messages?limit=10`,
      { headers: { Authorization: account.discordToken } }
    );

    const messages = res.data;
    const myResponse = messages.find(m =>
      m.author.id === BOT_CONFIG.APP_ID && m.interaction?.user?.id === userId
    );

    if (!myResponse) {
      console.log(`[${account.name}][${network.name}] ❌ Tidak ada respons`);
      return;
    }

    const txt = myResponse.content || "";
    if (txt.includes("successfully")) {
      console.log(`[${account.name}][${network.name}] ✅ Berhasil claim!`);
    } else if (txt.includes("already claimed")) {
      console.log(`[${account.name}][${network.name}] ⏳ Sudah di-claim`);
    } else {
      console.log(`[${account.name}][${network.name}] 📬 Respons: ${txt.split("\n")[0]}`);
    }
  } catch (error) {
    console.error(`[${account.name}][${network.name}] 🛑 Error: ${error.message}`);
  }
}

async function main() {
  if (!ACCOUNTS.length) {
    console.error("ERROR: Tidak ada akun yang dikonfigurasi");
    return;
  }

  console.log("Memulai proses claim Sepolia untuk multi-akun...");
  
  for (const account of ACCOUNTS) {
    if (!account.discordToken) {
      console.error(`❌ Token Discord tidak ditemukan untuk akun: ${account.name}`);
      continue;
    }
    
    if (!account.sepoliaWallet) {
      console.error(`❌ Wallet Sepolia tidak ditemukan untuk akun: ${account.name}`);
      continue;
    }
    
    console.log(`\nMemproses akun: ${account.name}`);
    console.log(`Wallet: ${account.sepoliaWallet.slice(0, 6)}...${account.sepoliaWallet.slice(-4)}`);
    
    for (const network of NETWORKS) {
      await claimFaucet(account, network);
    }
    
    if (account !== ACCOUNTS[ACCOUNTS.length - 1]) {
      console.log(`\n🕒 Menunggu ${BOT_CONFIG.DELAY_BETWEEN_ACCOUNTS/1000} detik ke akun berikutnya...`);
      await new Promise(resolve => setTimeout(resolve, BOT_CONFIG.DELAY_BETWEEN_ACCOUNTS));
    }
  }
  
  console.log("\n✅ Semua proses claim Sepolia selesai!");
}

main().catch(console.error);
