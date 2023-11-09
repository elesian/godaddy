import { LightningElement, api } from 'lwc';

export default class GptChatContainer extends LightningElement {
    @api isLoading = false;
    @api updatedMessages;
    isReady = false;

    renderedCallback(){
        console.log('Updated Messages' + this.updatedMessages);
    }
}