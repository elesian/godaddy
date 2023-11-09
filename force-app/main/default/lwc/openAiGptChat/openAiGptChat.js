import { LightningElement, track } from 'lwc';
import makeOpenAICall from '@salesforce/apex/OpenAIApiHandler.makeOpenAICall';
//import makeOpenAiCall from '@salesforce/apex/OpenAiController.callOpenAI';
import OpenAiGptChatHelper from './openAiGptChatHelper';
import openAiGptChatPromptGrounding from './openAiGptChatPromptGrounding';
import groundedOpenAICall from '@salesforce/apex/ApexDocsGPTController.makeCallout'


/*export default class OpenAiGptChat extends LightningElement {

    @track prompt = '';
    @track response = '';

    handlePromptChange(event) {
        this.prompt = event.target.value;
    }

    async handlePromptSubmit() {
        if (this.prompt) {
            try {
                const requestBody = JSON.stringify({ 
                    model: "gpt-3.5-turbo",
                    messages: [{'role': 'user', 'content': this.prompt}],
                    max_tokens: 1024,
                    n:1,
                    stop: '\n'
                });
                const response = await makeOpenAICall({ requestBody });
                if (response) {
                    this.response = JSON.parse(response.response).choices[0].message.content;
                } else {
                    console.error('OpenAI API call failed:', response);
                    console.log(response);
                    console.log(JSON.parse(response.response));
                }
            } catch (error) {
                console.error('Error calling OpenAI API:', error);
            }
        }
    }
}*/


export default class OpenAiGptChat extends LightningElement {
    @track chatMessages = [];
    @track currentMessage = '';
    @track response = false;
    @track isLoading = false;
    allowApiCalls = true;

    constructor() {
        super();
        const grounding = openAiGptChatPromptGrounding.groundOpenAI();
        this.chatMessages = [...this.chatMessages, { id: grounding.id, role: grounding.role, content: grounding.content, isAi: false }];
    }

    handleMessageChange(event) {
        this.currentMessage = event.target.value;
        this.adjustInputHeight(event.target);

    }
    adjustInputHeight(inputElement) {
        inputElement.style.height = 'auto';
        inputElement.style.height = (inputElement.scrollHeight) + 'px';
    }

    get updatedMessages() {
        return this.chatMessages.map((message) => {
            const className = message.role === 'system' ? 'system' : message.isAi ? 'ai-message' : 'user-message';
            return { ...message, className };
        });
    }

    set updatedMessages(value) {
        this.chatMessages = value;
    }

    async handleMessageSend() {
        if (this.currentMessage) {
            const newMessage = { id: new Date().getTime(), role: 'user', content: this.currentMessage, isAi: false };
            this.chatMessages = [...this.chatMessages, newMessage];

            const messagesWithoutId = this.chatMessages.map(({ id, isAi, ...rest }) => rest);

            if (this.allowApiCalls) {
                this.isLoading = true;
                await this.callOpenAI(messagesWithoutId);
                //this.response = true;
            } else {
                this.chatMessages = OpenAiGptChatHelper.mockOpenAICall().map(item => {
                    const aiMessage = item.content;
                    const role = item.role;
                    const isAi = item.role === 'user' ? false : true;
                    return { id: new Date().getTime(), role: role, content: aiMessage, isAi: isAi };
                });
                this.response = true;
            }


        }
    }

    async callOpenAI(messages) {
        try {
            const requestBody = JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: messages,
            max_tokens: 1024,
            n: 1,
            stop: '\n'
            });



            const response = await groundedOpenAICall({requestBody});
            if (response) {
                //const parser = new DOMParser();
                // const aiMessage = parser.parseFromString(JSON.parse(response.response).choices[0].message.content, 'text/html').body.textContent;
                const aiMessage = JSON.parse(response.response).choices[0].message.content;
                console.log('Loggin AI Message: ' + aiMessage);
                console.log(aiMessage);
                this.chatMessages = [...this.chatMessages, { id: new Date().getTime(), role: 'assistant', content: aiMessage, isAi: true }];
                //this.response = true;

            } else {
                console.error('OpenAI API call failed:', response);
            }
        } catch (error) {
            console.error('Error calling OpenAI API:', error);
        }finally {
            this.isLoading = false;
            this.response = true; // new line
        }
        this.currentMessage = '';

    }

    // async callOpenAI(messages) {
    //     try {
    //         debugger;
    //         const aiMessage = await makeOpenAiCall(JSON.stringify(messages));
    //         if (aiMessage) {
    //             console.log('Loggin AI Message: ' + aiMessage);
    //             console.log(aiMessage);
    //             this.chatMessages = [...this.chatMessages, { id: new Date().getTime(), role: 'assistant', content: aiMessage, isAi: true }];
    //             this.response = true;
    //         } else {
    //             console.error('OpenAI API call failed:', response);
    //         }
    //     } catch (error) {
    //         console.error('LWC: Error calling OpenAI API:', error);
    //     } finally {
    //         this.isLoading = false;
    //     }
    //     this.currentMessage = '';

    // }




}