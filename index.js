const TelegramBot = require("node-telegram-bot-api");
const token = "8169137821:AAGQe9UubR_IbwYuY1jmJxioXSF3wJvnH54";
const fs = require("fs");
const bot = new TelegramBot(token, { polling: true });

const ADMIN_ID = 6119111693;
const USERS_FILE = "users.txt";
const PENDING_FILE = "pending.txt";

const TOTAL_CELLS = 25;
const COLUMNS = 5;
let userStates = {};

function isUserAuthorized(userId) {
  if (!fs.existsSync(USERS_FILE)) return false;
  const users = fs.readFileSync(USERS_FILE, "utf-8").split("\n").map(x => x.trim());
  return users.includes(userId.toString());
}

function addUser(userId) {
  fs.appendFileSync(USERS_FILE, `${userId}\n`);
}

function addPendingUser(userId, firstName, phone) {
  const entry = `${userId}|${firstName}|${phone}`;
  fs.appendFileSync(PENDING_FILE, `${entry}\n`);
}

function removePendingUser(userId) {
  if (!fs.existsSync(PENDING_FILE)) return;
  const pending = fs.readFileSync(PENDING_FILE, "utf-8").split("\n").map(x => x.trim());
  const updated = pending.filter(line => !line.startsWith(`${userId}|`));
  fs.writeFileSync(PENDING_FILE, updated.join("\n"));
}

function createEmptyGrid() {
  return Array(TOTAL_CELLS).fill("🟦");
}

function renderGrid(grid) {
  let output = "";
  for (let i = 0; i < TOTAL_CELLS; i++) {
    output += grid[i];
    if ((i + 1) % COLUMNS === 0) output += "\n";
  }
  return output;
}

function addRandomStar(grid) {
  const emptyIndexes = grid.map((val, i) => val === "🟦" ? i : null).filter(i => i !== null);
  if (emptyIndexes.length === 0) return grid;
  const randomIndex = emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
  grid[randomIndex] = "⭐";
  return grid;
}

function calculateSuccessProbability(grid, bombs) {
  const usedStars = grid.filter(cell => cell === "⭐").length;
  const remainingCells = TOTAL_CELLS - usedStars;
  const successProb = ((remainingCells - bombs) / remainingCells) * 100;
  return successProb.toFixed(2);
}

function sendMainMenu(chatId) {
  bot.sendMessage(chatId, "🔍 Qaysi o‘yinni analiz qilmoqchisiz?", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "1WIN Mines", callback_data: "mines" }],
        [{ text: "✈️ Aviator", callback_data: "aviator" }],
        [{ text: "📞 Admin bilan bog‘lanish", url: "https://t.me/sardorshoakbarov" }]
      ]
    }
  });
}

// /start komandasi
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isUserAuthorized(userId)) {
    bot.sendMessage(chatId, `‼️ Diqqat! Siz hali ro‘yxatdan o‘tmagansiz.
  
 🔑 **Ro‘yxatdan o‘tish jarayoni:**

1️⃣ **1Win saytiga o‘ting** va **1WINAKBARQUMORBOZ** promokodini kiritib ro‘yxatdan o‘ting.

2️⃣ Ro‘yxatdan o‘tgach, hisobingizga istalgan miqdorda **depozit** kiriting.

3️⃣ **📱 Telefon raqamingizni yuboring**, shunda admin sizga to‘liq **dostup** (kirish huquqi) taqdim etadi.

📌 **Eslatma:** Iltimos, promokodni to‘g‘ri kiritganingizga ishonch hosil qiling, aks holda ro‘yxatdan o‘tish jarayoni amalga oshmaydi. Agar promokodni to‘g‘ri kiritgan bo‘lsangiz, telefon raqamingizni yuborishingiz kerak bo‘ladi.

❗ **Iltimos, faqat **1WINAKBARQUMORBOZ** promokodidan foydalaning, aks holda tizimda xatolik yuz berishi mumkin.**`, {
      reply_markup: {
        keyboard: [
          [{ text: "📱 Raqam yuborish", request_contact: true }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
  
    // Albatta, brauzerda ochiladigan tugmani alohida yuboramiz:
    bot.sendMessage(chatId, "🌐 Quyidagi tugma orqali 1Win saytiga o‘ting:", {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🌐 1Win da ro'yxatdan o'tish",
              url: "https://1wthia.top/1win?from=1winbonus"
            }
          ]
        ]
      }
    });
  
    return;
  }
  
  sendMainMenu(chatId);
  
});

// Kontakt qabul qilish
bot.on("contact", (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const contact = msg.contact;

  if (contact.user_id !== userId) {
    bot.sendMessage(chatId, "⚠️ Iltimos, faqat o‘zingizning raqamingizni yuboring.");
    return;
  }

  addPendingUser(userId, msg.from.first_name, contact.phone_number);

  bot.sendMessage(chatId, "✅ Raqamingiz adminga yuborildi. Ro‘yxatga qo‘shilishingizni kuting.");
  bot.sendMessage(ADMIN_ID, `📥 Yangi foydalanuvchi ro‘yxatga qo‘shilmoqchi:\n\nID: ${userId}\nIsm: ${msg.from.first_name}\nRaqam: ${contact.phone_number}\n\nTasdiqlash uchun: /approve ${userId}`);
});

// Admin uchun approve komandasi
bot.onText(/\/approve (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userIdToApprove = match[1];

  if (chatId !== ADMIN_ID) {
    bot.sendMessage(chatId, "⚠️ Sizda ruxsat yo‘q.");
    return;
  }

  if (isUserAuthorized(userIdToApprove)) {
    bot.sendMessage(chatId, `✅ Foydalanuvchi ${userIdToApprove} allaqachon ro‘yxatda.`);
    return;
  }

  addUser(userIdToApprove);
  removePendingUser(userIdToApprove);

  bot.sendMessage(chatId, `✅ Foydalanuvchi ${userIdToApprove} muvaffaqiyatli qo‘shildi.`);
  bot.sendMessage(userIdToApprove, "🎉 Siz ro‘yxatga qo‘shildingiz! Endi /start deb boshlang.");
});

// Callback querylar uchun (aviator + mines)
bot.on("callback_query", (callbackQuery) => {
  const msg = callbackQuery.message;
  const data = callbackQuery.data;
  const chatId = msg.chat.id;
  const msgId = msg.message_id;

  if (data === "aviator" || data === "aviator_next") {
    let randomX;
    if (Math.random() < 0.05) randomX = (Math.random() * (100 - 50) + 50).toFixed(2);
    else if (Math.random() < 0.1) randomX = (Math.random() * (40 - 20) + 20).toFixed(2);
    else randomX = (Math.random() * (3 - 1) + 1).toFixed(2);

    userStates[chatId] = { aviatorX: randomX };

    bot.editMessageText(`✈️ Aviator taxmin:\n📈 Ko‘rsatilgan koeffitsient: *${randomX}x*\nChiqib ko‘ring.`, {
      chat_id: chatId,
      message_id: msgId,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "➡️ Next", callback_data: "aviator_next" },
            { text: "❌ Yutqazdim", callback_data: "aviator_lose" }
          ],
          [{ text: "🏠 Uyga", callback_data: "home" }]
        ]
      }
    });
    bot.answerCallbackQuery(callbackQuery.id);
    return;
  }

  if (data === "aviator_lose") {
    bot.editMessageText("GPT qayta analiz qiladi bu safar 30%ga aniqlik kuchayadi", {
      chat_id: chatId,
      message_id: msgId,
      reply_markup: {
        inline_keyboard: [
          [{ text: "♻️ Qayta urinish", callback_data: "aviator" }],
          [{ text: "🏠 Uyga", callback_data: "home" }]
        ]
      }
    });
    bot.answerCallbackQuery(callbackQuery.id);
    return;
  }

  if (data === "mines") {
    userStates[chatId] = null;
    const buttons = [];
    for (let i = 1; i <= 20; i++) {
      buttons.push({ text: `${i} bomba`, callback_data: `setbombs_${i}` });
    }
    const keyboard = [];
    for (let i = 0; i < buttons.length; i += 4) {
      keyboard.push(buttons.slice(i, i + 4));
    }
    keyboard.push([{ text: "🏠 Uyga", callback_data: "home" }]);

    bot.editMessageText("💣 Nechta bomba bo‘lishini tanlang (1 dan 20 gacha):", {
      chat_id: chatId,
      message_id: msgId,
      reply_markup: { inline_keyboard: keyboard }
    });
    return;
  }

  if (data.startsWith("setbombs_")) {
    const bombs = parseInt(data.split("_")[1]);
    const grid = createEmptyGrid();
    const updatedGrid = addRandomStar(grid);

    userStates[chatId] = {
      bombs,
      grid: updatedGrid,
      stars: 1,
    };

    const success = calculateSuccessProbability(updatedGrid, bombs);
    const output = `${renderGrid(updatedGrid)}\n📊 Ehtimol: Bu tanlangan katak bomba emas bo‘lishi ehtimoli: *${success}%*`;

    bot.editMessageText(output, {
      chat_id: chatId,
      message_id: msgId,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "➡️ Next", callback_data: "next" },
            { text: "❌ Yutqazdim", callback_data: "lose" }
          ],
          [{ text: "🏠 Uyga", callback_data: "home" }]
        ]
      }
    });
    bot.answerCallbackQuery(callbackQuery.id);
    return;
  }

  if (data === "next") {
    const state = userStates[chatId];
    if (!state) {
      bot.answerCallbackQuery(callbackQuery.id, { text: "Iltimos, /start dan boshlang." });
      return;
    }

    const maxStars = TOTAL_CELLS - state.bombs;
    if (state.stars >= maxStars) {
      bot.editMessageText(`${renderGrid(state.grid)}\n✅ O‘yin tugadi. Yulduzchalar soni yetdi.`, {
        chat_id: chatId,
        message_id: msgId,
      });
      return;
    }

    const newGrid = addRandomStar(state.grid);
    state.stars++;
    const success = calculateSuccessProbability(newGrid, state.bombs);

    const output = `${renderGrid(newGrid)}\n📊 Ehtimol: Bu tanlangan katak bomba emas bo‘lishi ehtimoli: *${success}%*`;

    bot.editMessageText(output, {
      chat_id: chatId,
      message_id: msgId,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "➡️ Next", callback_data: "next" }],
          [{ text: "🏠 Uyga", callback_data: "home" }]
        ]
      }
    });
    bot.answerCallbackQuery(callbackQuery.id);
    return;
  }

  if (data === "lose") {
    bot.editMessageText("❌ Kechirasiz, bu safar bomba chiqdi. Yana urinib ko‘ring!", {
      chat_id: chatId,
      message_id: msgId,
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔁 Qayta boshlash (Mines)", callback_data: "mines" }],
          [{ text: "🏠 Uyga", callback_data: "home" }]
        ]
      }
    });
    bot.answerCallbackQuery(callbackQuery.id);
    return;
  }

  if (data === "home") {
    sendMainMenu(chatId);
    bot.answerCallbackQuery(callbackQuery.id);
  }
});
