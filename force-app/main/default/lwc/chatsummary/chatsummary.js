import { LightningElement, api, wire, track } from 'lwc';
import getChatTranscripts from '@salesforce/apex/ChatTranscriptService.getChatTranscripts';
import getChatHistorySummary from '@salesforce/apex/OpenAISummaryService.getChatHistorySummary';

export default class ChatSummary extends LightningElement {
    @api recordId;
    @track chatTranscripts;
    @track summary;
    @track isLoading = false; 

    @wire(getChatTranscripts, { caseId: '$recordId' })
    wiredTranscripts({ error, data }) {
        if (data) {
            this.chatTranscripts = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.chatTranscripts = undefined;
        }
    }

    handleSummarize() {
        this.isLoading = true; 
        getChatHistorySummary({ transcripts: this.chatTranscripts })
        .then(result => {
            console.log(result);
            if(result) {
                this.summary = result; // Assign the result directly if it is not null or undefined
            } else {
                this.summary = "Summary not available.";
            }
            this.isLoading = false; 
        })
        .catch(error => {
            this.error = error;
            this.isLoading = false; 
        });
    }
    
}