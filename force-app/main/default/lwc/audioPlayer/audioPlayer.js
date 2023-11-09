import { LightningElement, track } from 'lwc';
import getAudioFileNames from '@salesforce/apex/AudioFilesController.getAudioFileNames';
import getAudioFileUrl from '@salesforce/apex/AudioFilesController.getAudioFileUrl';
import getCallSummary from '@salesforce/apex/AudioFilesController.getCallSummary'
import checkJobStatus from '@salesforce/apex/AudioFilesController.checkJobStatus';

export default class AudioPlayer extends LightningElement {
    @track isLoading = false;
    @track audioFiles = [];
    @track transcriptionResult = null;


    connectedCallback() {
        this.loadAudioFiles();
    }

    async handleSummarize(event) {
        console.log('handleSummarize called');
        this.isLoading = true; // Show spinner
        const audioFileName = event.currentTarget.dataset.filename;
    
        try {
            const jobId = await getCallSummary({ audioFileName });
            console.log('Job ID received:', jobId);
    
            // Start polling for result after a delay of 30 seconds
            setTimeout(() => {
                this.pollForResult(jobId, audioFileName);
            }, 30000);
        } catch (error) {
            console.error('Error initiating transcription job:', error);
            this.isLoading = false; // Hide spinner
        }
    }
    

    async pollForResult(jobId, audioFileName) {
        // Start the polling every 5 seconds without an initial delay
        const pollInterval = setInterval(async () => {
            try {
                const response = await checkJobStatus({ jobId });
                console.log('Response:', response);  // Debugging log
            
                // Parse the JSON string into an object
                const result = JSON.parse(response);
                console.log('Parsed Job Status Result:', result);  // Debugging log
            
                if (result.status === 'complete') {
                    console.log('Transcription result:', result.response);
                    const response = JSON.parse(result.response);
                    // Extracting sentiment metatags
                    this.sentimentMetatags = response["Sentiment Metatags"] || [];
                    this.sentimentScore = response["Sentiment Score"]; 
                    this.transcriptionResult = Object.entries(response)
                    .filter(([key]) => key !== 'transcript')  // Add any other keys you want to exclude here
                    .map(([key, value]) => ({ key, value }));
                    console.log(this.transcriptionResult);

                    let audioFile = this.audioFiles.find(file => file.name === audioFileName);
                    if (audioFile) {
                        audioFile.sentimentScore = this.sentimentScore;
                        audioFile.sentimentMetatags = this.sentimentMetatags;
                        audioFile.scoreStyle = this.getScoreStyle(audioFile.sentimentScore);
                        audioFile.transcriptionResult = this.transcriptionResult; // Assign the transcriptionResult to the audioFile
                    }
                    this.audioFiles = [...this.audioFiles];

                    this.isLoading = false; // Hide spinner
                    console.log('Is loading:', this.isLoading);
                    clearInterval(pollInterval); // Stop polling
                } else if (result.status === 'pending') {
                    console.log('Job still pending...');
                } else {
                    console.log('Unknown status:', result.status);
                }
            } catch (error) {
                console.error('Error checking job status:', error);
                this.isLoading = false; // Hide spinner
                clearInterval(pollInterval); // Stop polling
            }
        }, 5000); // Poll every 5 seconds
    }

    getScoreStyle = (score) => {
        if (score !== undefined) {
            const color = this.getSentimentColor(score);
            return `border-color: ${color};`;
        }
        return '';
    }
    
    getSentimentColor(score) {
        // Convert the score to a value between 0 and 120 (for red to green)
        const hue = score * 12; // Adjust this calculation as per your scoring system
    
        // Return the CSS color value
        return `hsl(${hue}, 100%, 50%)`;
    }

    loadAudioFiles() {
        getAudioFileNames()
            .then(result => {
                // Fetch URLs for each audio file
                Promise.all(result.map(file => this.loadAudioFileUrl(file)))
                    .then(urls => {
                        this.audioFiles = urls;
                        this.error = undefined;
                    });
            })
            .catch(error => {
                this.error = error;
                this.audioFiles = [];
            });
    }

    loadAudioFileUrl(fileName) {
        return getAudioFileUrl({ fileName })
            .then(url => {
                console.log('Audio URL:', url);  // For debugging purpose
                return { name: fileName, url: url };
            })
            .catch(error => {
                console.error('Error getting audio file URL:', error);
                return { name: fileName, url: '' };
            });
    }

    refresh() {
        this.loadAudioFiles();
    }
}