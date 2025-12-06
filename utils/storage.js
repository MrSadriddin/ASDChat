import * as Bytescale from "@bytescale/sdk";
import nodeFetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const apiKey = "secret_G22nj4HBvmJmwSrNzwMAkrKskWLB";
const accountId = "G22nj4H";
const BASE_FOLDER = "/chat-data"; 

if (!apiKey || !apiKey.startsWith("secret_")) {
    console.error("❌ XATOLIK: 'secret_' kalit topilmadi. .env faylini tekshiring!");
}

const uploadManager = new Bytescale.UploadManager({ fetchApi: nodeFetch, apiKey: apiKey });
const fileApi = new Bytescale.FileApi({ fetchApi: nodeFetch, apiKey: apiKey });
const folderApi = new Bytescale.FolderApi({ fetchApi: nodeFetch, apiKey: apiKey });

const getFilePath = (chatId) => `${BASE_FOLDER}/${chatId}.md`;

export const createChatFile = async (chatId) => {
    const timestamp = new Date().toISOString();
    const header = `# Chat ID: ${chatId}\n# Created: ${timestamp}\n\n`;

    try {
        await folderApi.putFolder({
            accountId: accountId,
            putFolderRequest: { folderPath: BASE_FOLDER }
        });

        await uploadManager.upload({
            data: header,
            mime: "text/markdown",
            originalFileName: `${chatId}.md`,
            path: { folderPath: BASE_FOLDER, fileName: `${chatId}.md` }
        });
    } catch (error) {
        console.error("❌ Chat yaratishda xato:", error);
        throw error;
    }
};

export const saveMessage = async (chatId, role, content) => {
    const filePath = getFilePath(chatId);
    const roleHeader = role === 'user' ? '### USER' : '### MODEL';
    const newBlock = `\n\n${roleHeader}\n${content}`;

    try {
        let currentContent = "";
        try {
            const response = await fileApi.downloadFile({
                accountId: accountId,
                filePath: filePath,
                cache: false
            });
            currentContent = await response.text();
        } catch (err) {
            const timestamp = new Date().toISOString();
            currentContent = `# Chat ID: ${chatId}\n# Created: ${timestamp}\n\n`;
        }

        const updatedContent = currentContent + newBlock;

        await uploadManager.upload({
            data: updatedContent,
            mime: "text/markdown",
            path: { folderPath: BASE_FOLDER, fileName: `${chatId}.md` }
        });

    } catch (error) {
        throw error;
    }
};

export const getChatHistory = async (chatId) => {
    const filePath = getFilePath(chatId);
    
    try {
        const response = await fileApi.downloadFile({
            accountId: accountId,
            filePath: filePath,
            cache: false
        });
        
        const fileContent = await response.text();
        const regex = /### (USER|MODEL)\s+([\s\S]*?)(?=(?:### (?:USER|MODEL))|$)/g;
        const history = [];
        let match;

        while ((match = regex.exec(fileContent)) !== null) {
            history.push({ 
                role: match[1].toLowerCase(), 
                content: match[2].trim() 
            });
        }
        return history;
    } catch (error) {
        return [];
    }
};

export const getAllChats = async () => {
    try {
        const result = await folderApi.listFolder({
            accountId: accountId,
            folderPath: BASE_FOLDER,
            recursive: false,
            limit: 50
        });
        const fileItems = result.items.filter(item => {
            const isFile = item.type === "File";
            const isMd = item.filePath && item.filePath.toLowerCase().endsWith(".md");
            return isFile && isMd;
        });

        if (fileItems.length === 0) {
            return [];
        }

        const chatPromises = fileItems.map(async (item) => {
            const fileName = item.filePath.split('/').pop(); 
            const chatId = fileName.replace('.md', '');
            
            let preview = "New Chat"; 

            try {
                const response = await fileApi.downloadFile({
                    accountId: accountId,
                    filePath: item.filePath,
                    cache: false
                });
                const text = await response.text();

                const match = text.match(/### USER\s+([\s\S]*?)(?=(?:###|$))/);
                if (match && match[1]) {
                    const cleanText = match[1].trim().replace(/\n/g, ' ');
                    preview = cleanText.substring(0, 30) + (cleanText.length > 30 ? '...' : '');
                }
            } catch (err) {
            }

            return {
                id: chatId,
                preview: preview,
                timestamp: item.lastModified
            };
        });

        const chats = await Promise.all(chatPromises);
        const sortedChats = chats.sort((a, b) => b.timestamp - a.timestamp);
        
        return sortedChats;

    } catch (error) {
        if (error.message && (error.message.includes("404") || error.errorCode === "folder_not_found")) {
            return [];
        }
        return [];
    }
};

export const deleteChat = async (chatId) => {
    try {
        await fileApi.deleteFile({
            accountId: accountId,
            filePath: getFilePath(chatId)
        });
    } catch (error) {
        throw error;
    }
};