import { LightningElement, track } from 'lwc';
import makeCallout from '@salesforce/apex/ApexDocsGPTController.makeCallout';

export default class DocumentationGPT extends LightningElement {
    @track messages = [];
    userInput = '';
    counter = 0;

    handleInput(event) {
        this.userInput = event.target.value;
    }

    handleEnterPress(event) {
        if(event.key === 'Enter') {
            this.handleSubmit();
        }
    }

    handleSubmit() {
        this.addMessage('question', this.userInput);

        // Call the Apex method
        makeCallout({ query: this.userInput })
            .then(result => {
                // Add the formatted response to the chat
                this.addMessage('response', result);
            })
            .catch(error => {
                console.error('Error:', error);
                this.addMessage('response', 'An error occurred while fetching the response.');
            });

        this.userInput = '';
        this.template.querySelector('.input-field').value = '';  // Clear the input field
    }

    addMessage(type, text) {
        this.counter += 1;
        this.messages = [...this.messages, { id: this.counter, type, text }];
    }
}