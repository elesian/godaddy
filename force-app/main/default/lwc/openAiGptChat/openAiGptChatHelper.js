export default class OpenAiGptChatHelper {
    static mockOpenAICall() {
        const mockExchanges = [
            { role: 'user', content: 'Hello, can you tell me about the weather today?' },
            { role: 'assistant', content: "Sure! Today's weather is sunny with a high of 78°F." },
            { role: 'user', content: 'What are some popular tourist attractions in this city?' },
            { role: 'assistant', content: 'There are several popular attractions in our city, such as the historic museum, beautiful parks, and the bustling downtown area.' },
            { role: 'user', content: 'Hi, is there a nearby coffee shop?' },
            { role: 'assistant', content: 'Yes, there is a cozy coffee shop just around the corner. They serve a variety of delicious beverages.' },
            { role: 'user', content: 'Could you recommend a good book to read?' },
            { role: 'assistant', content: 'Of course! I recommend "The Alchemist" \n \nby Paulo Coelho. It\'s a timeless tale of adventure and self-discovery.' },
            { role: 'user', content: 'How can I improve my programming skills?' },
            { role: 'assistant', content: 'Improving your programming skills takes practice and dedication. Consider working on coding projects, studying algorithms, and collaborating with others in the programming community.' }
            // Add more exchanges here...
        ];

        return mockExchanges;
    }

    static convertToRtf(plain) {
        plain = plain.replace(/\n/g, "\\par\n");
        return "{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang2057{\\fonttbl{\\f0\\fnil\\fcharset0 Microsoft Sans Serif;}}\n\\viewkind4\\uc1\\pard\\f0\\fs17 " + plain + "\\par\n}";
    }
}