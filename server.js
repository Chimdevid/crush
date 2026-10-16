
require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});

app.post("/api/notify", async (req, res) => {
  try {
    const { choice, details = {} } = req.body || {};

    if (!["YES", "NO", "DATE_DETAILS"].includes(choice)) {
      return res.status(400).json({
        success: false,
        error: "Invalid choice"
      });
    }

    let message;

    if (choice === "YES") {
      message = "💖 She clicked YES!\nShe said yes to a date!";
    } else if (choice === "NO") {
      message = "🥺 She clicked NO.\nShe declined the date invitation.";
    } else {
      const { date, time, food, place = "" } = details;

      if (
        typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        typeof time !== "string" ||
        time.length > 60 ||
        typeof food !== "string" ||
        food.length > 100 ||
        typeof place !== "string" ||
        place.length > 150
      ) {
        return res.status(400).json({
          success: false,
          error: "Invalid date details"
        });
      }

      message =
        "🌹 DATE PREFERENCES RECEIVED!\n\n" +
        "📅 Date: " + date + "\n" +
        "⏰ Time: " + time + "\n" +
        "🍽️ Food: " + food + "\n" +
        "📍 Place: " + (place || "Not specified");
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      console.error("Telegram environment variables are missing.");

      return res.status(500).json({
        success: false,
        error: "Telegram configuration is missing"
      });
    }

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message
        })
      }
    );

    const result = await telegramResponse.json();

    if (!telegramResponse.ok || !result.ok) {
      console.error("Telegram error:", result.description);

      return res.status(502).json({
        success: false,
        error: "Telegram failed to send the message"
      });
    }

    return res.json({ success: true });

  } catch (error) {
    console.error("Server error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
