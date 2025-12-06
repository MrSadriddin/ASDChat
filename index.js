import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid'; 
import dotenv from "dotenv";
import { generateResponse } from "./services/ai.js";
import { createChatFile, saveMessage, getChatHistory, getAllChats, deleteChat } from "./utils/storage.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 2620;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get("/", async (req, res) => {
    const chatList = await getAllChats();
    res.render("index", { chatList });
});

app.post("/chat/new", async (req, res) => {
    const newChatId = uuidv4();
    await createChatFile(newChatId);
    res.redirect(`/chat/${newChatId}`);
});

app.get("/chat/:id", async (req, res) => {
    const chatId = req.params.id;
    const history = await getChatHistory(chatId);
    const chatList = await getAllChats();
    
    res.render("chat", { chatId, history, chatList });
});

app.post("/api/chat/:id", async (req, res) => {
    const chatId = req.params.id;
    const { message } = req.body;

    try {
        await saveMessage(chatId, "user", message);
        const fullHistory = await getChatHistory(chatId);
        const aiResponse = await generateResponse(fullHistory, message);
        await saveMessage(chatId, "model", aiResponse);
        res.json({ response: aiResponse });
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Server error occurred" });
    }
});

app.delete("/api/chat/:id", async (req, res) => {
    const chatId = req.params.id;
    try {
        await deleteChat(chatId);
        res.json({ success: true });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ error: "Failed to delete chat" });
    }
});

app.listen(2620, () => {
    console.log(`Server running on http://localhost:2620`);
});