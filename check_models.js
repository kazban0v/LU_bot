const {
    GoogleGenerativeAI
} = require("@google/generative-ai");
const axios = require("axios");
require('dotenv').config();

async function listAvailableModels() {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not set in the environment variables.');
        }

        // Попробуем получить список моделей через REST API
        const apiKey = process.env.GEMINI_API_KEY;
        const response = await axios.get(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );

        console.log("Available models:\n");
        const models = response.data.models || [];
        const chatModels = models
            .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name.replace('models/', ''));

        chatModels.forEach(model => {
            console.log(`  - ${model}`);
        });

        // Попробуем использовать бесплатные/легкие модели
        const freeModels = [
            "gemini-flash-latest",
            "gemini-2.0-flash-lite",
            "gemini-2.0-flash-lite-001",
            "gemini-flash-lite-latest",
            "gemini-pro-latest",
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash",
            "gemini-2.5-flash"
        ];

        console.log(`\nTesting free/lightweight models...\n`);

        for (const modelName of freeModels) {
            if (chatModels.includes(modelName)) {
                try {
                    console.log(`Testing: ${modelName}...`);
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const model = genAI.getGenerativeModel({
                        model: modelName
                    });
                    const result = await model.generateContent("Say hi");
                    const response = await result.response;
                    console.log(`✅ ${modelName} - WORKS!`);
                    console.log(`   Response: ${response.text()}\n`);
                    console.log(`\n💡 Рекомендуется использовать: ${modelName}\n`);
                    return modelName;
                } catch (error) {
                    if (error.message.includes("quota") || error.message.includes("billing")) {
                        console.log(`❌ ${modelName} - Requires subscription/billing\n`);
                    } else {
                        console.log(`❌ ${modelName} - ${error.message.split('\n')[0]}\n`);
                    }
                }
            }
        }

        console.log("⚠️  No free models found. You may need to enable billing or use an alternative API.");
    } catch (error) {
        console.error("Error listing models:", error.message);
        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", JSON.stringify(error.response.data, null, 2));
        }
    }
}

listAvailableModels();