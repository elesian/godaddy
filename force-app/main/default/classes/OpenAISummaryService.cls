public with sharing class OpenAISummaryService {
    
    @AuraEnabled
    // This function sends chat transcripts to an external service to get the summary
    public static String getChatHistorySummary(List<String> transcripts) {
        // Combine the transcripts, if necessary
        String combinedTranscripts = String.join(transcripts, '\n');
        if (combinedTranscripts.length() > 3500) {
            combinedTranscripts = combinedTranscripts.substring(0, 3500);
        }
        
        // Construct the HTTP request to send the transcripts to the external service
        HttpRequest req = new HttpRequest();
        
        // Set the endpoint URL (replace with the actual URL of your external service)
        req.setEndpoint('https://apex-docs-gpt-0472278cbe07.herokuapp.com/chat-history-summary');
        
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        
        // Construct the request body
        Map<String, Object> requestBody = new Map<String, Object>();
        requestBody.put('content', combinedTranscripts);
        req.setBody(JSON.serialize(requestBody));
        
        // Create a new HTTP object to send the request
        Http http = new Http();
        HttpResponse res;
        try {
            // Send the request and receive the response
            res = http.send(req);
            
            if (res.getStatusCode() == 200) {
                // Parse the response, if needed, and return the summary
                Map<String, Object> responseBody = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
                return (String) responseBody.get('summary');
            } else {
                System.debug('Error: ' + res.getStatus() + ' ' + res.getBody());
                return null;
            }
        } catch(Exception e) {
            System.debug('Exception: ' + e.getMessage());
            return null;
        }
    }
}