import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import customerChatGptPromptGroundingHelper from './customerChatGptPromptGroundingHelper';
import makeOpenAICall from '@salesforce/apex/OpenAIApiHandler.makeOpenAICall';
import createCase from '@salesforce/apex/OpenAiController.createCaseFromWrapper';
import { getRecord } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import { createRecord, updateRecord } from 'lightning/uiRecordApi';
import CONTACT_ID from '@salesforce/schema/LiveChatTranscript.ContactId';
import ID_FIELD from '@salesforce/schema/LiveChatTranscript.Id';
import makeGroundedCallOut from '@salesforce/apex/ApexDocsGPTController.makeCallout';
import { getFilteredMessages, setFilteredMessages } from './filteredmessage';
import { sanitizeResponse } from './helperFunctions';



export default class CustomerChatGpt extends NavigationMixin(LightningElement) {
    @api recordId;
    //@api readyForSummary;
    _chatLog = '';
    _readyForSummary;
    initiateSummary = false;
    openAiFormattedMessages = [];
    @track einsteinReply;
    @track response = false;
    @track editMode = false;
    @track isLoading = false;
    currentChatLogs = '';
    filteredMessages = [];
    
   

    @wire(getRecord, { recordId: '$recordId', fields: [CONTACT_ID] }) contactWire;

    @api
    get chatLog() {
        return this._chatLog
    }
    set chatLog(value) {
        debugger;
        if (value) {
            console.log('Entering Value ' + value);
            //console.log(value);
            //this._chatLog = value;
            let rawMessages = JSON.parse(value);
            //console.log(this._chatLog.messages);
            //this._chatLog = rawMessages.messages;
            this.handleChatLogUpdate(rawMessages.messages);
        }
    }


    @api
    get readyForSummary() {
        return this._readyForSummary;
    }
    set readyForSummary(value) {
        //return this._readyForSummary = value
        if (value) {
            let rawMessages = JSON.parse(value);
            this.initiateSummary = true;
            this.currentChatLogs = rawMessages.messages;
            this.handleChatLogUpdate(rawMessages.messages);
        }
    }

    handleChatLogUpdate(chatMessages) {
        console.log('Entering handle chat update');

        // Prepare the grounding message based on initiateSummary flag
        const groundingMessage = this.initiateSummary
            ? customerChatGptPromptGroundingHelper.groundOpenAIForCaseSerialization()
            : customerChatGptPromptGroundingHelper.groundOpenAI();

        // Calculate the number of chat messages to keep (5, since we add one grounding message)
        const maxChatMessages = 5;
        const startIndex = chatMessages.length > maxChatMessages ? chatMessages.length - maxChatMessages : 0;

        // Initialize a new filteredMessages array starting with the grounding message
        let newFilteredMessages = [groundingMessage];

        // Get the latest 5 chat messages
        const latestMessages = chatMessages.slice(startIndex);

        // Add the latest messages to the new filteredMessages array
        for (let message of latestMessages) {
            let role = message.type == 'EndUser' ? 'user' : 'assistant';
            newFilteredMessages.push({ role: role, content: message.content });
        }

        console.log("Filtered messages length after update is " + newFilteredMessages.length);

        // Update the shared state with the new filtered messages
        setFilteredMessages(newFilteredMessages);

        // Call OpenAI with the filtered messages
        this.callOpenAI(getFilteredMessages());
    }

    // Other methods can now access the current state of filteredMessages
    // by calling getFilteredMessages from the shared module.

    getGroundedResponse() {
        let messages = getFilteredMessages();
        let userQuery;
        this.isLoading = true;

        // Check if there are any messages
        if (messages.length === 0) {
            console.error('No messages to retrieve.');
            this.isLoading = false;
            return;
        }

        else {
            userQuery = messages[messages.length - 1].content;
            console.log('user query is ', userQuery);
        }

        // Call the Apex method
        makeGroundedCallOut({ query: userQuery })
            .then(result => {
                // Add the formatted response to the chat
                console.log(result);
                this.einsteinReply = sanitizeResponse(result);
                this.isLoading = false;
                this.reply = true;
                this.currentMessage = '';
                
            })
            .catch(error => {
                console.error('Error:', error);
                
            });
    
    }

    async callOpenAI(messages) {
        console.log('Entering callOpenAI LWC Method');
        debugger;
        this.isLoading = true;
        try {
            const requestBody = JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: messages,
                max_tokens: 1024,
                n: 1,
                //stop: '\n'
            });

            const response = await makeOpenAICall({ requestBody });
            if (response) {
                const aiMessage = JSON.parse(response.response).choices[0].message.content;
                console.log('Logging AI Message: ' + aiMessage);
                console.log(aiMessage);
                if (this.initiateSummary) {
                    this.createCase(aiMessage);
                } else {
                    this.einsteinReply = aiMessage;
                }

            } else {
                console.error('OpenAI API call failed:', response);
                this.isLoading = false;
            }
        } catch (error) {
            // Error objects from server-side calls are often wrapped in a Proxy
            // The actual error details are usually available on the 'body' property
            console.error('Error calling OpenAI API:', error);
            if (error.body) {
                console.error('Error details:', error.body.message);
            } else if (error.message) {
                console.error('Error message:', error.message);
            } else {
                console.error('Unknown error', JSON.stringify(error));
            }
        } finally {
            this.isLoading = false;
            this.response = true; // new line
        }
        this.currentMessage = '';

    }

    handleEditReply() {
        this.editMode = true;
    }

    handleSaveReply() {
        this.editMode = false;
    }

    saveManualEdit(event) {
        this.einsteinReply = event.target.value;
    }

    handleSendReply() {
        console.log('Entering Send Reply');
        const dispatchReply = new CustomEvent('sendreply', {
            detail: {
                reply: this.einsteinReply
            }
        });
        this.dispatchEvent(dispatchReply);
    }

    async createCase(aiMessageCaseWrapper) {
        debugger;
        try {
            console.log('Entering Create Case: ' + aiMessageCaseWrapper);
            const serializedWrapper = customerChatGptPromptGroundingHelper.cleanseJSON(aiMessageCaseWrapper, this.recordId, this.currentChatLogs);
            console.log('Serialized Wrapper: ' + JSON.stringify(serializedWrapper));
            const response = await createCase({ caseWrapper: serializedWrapper });
            if (response) {
                const dispatchCaseSuccess = new CustomEvent('casesuccess', {
                    detail: {
                        reply: response
                    }
                });
                this.dispatchEvent(dispatchCaseSuccess);

                //return refreshApex(this.contactWire);
            }
        } catch (error) {
            console.log(error);
        }
    }

}