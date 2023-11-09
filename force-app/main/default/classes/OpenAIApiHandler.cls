public with sharing class OpenAIApiHandler {
    public class OpenAIResponse {
        @AuraEnabled
        public String response;

        public OpenAIResponse(String response) {
            this.response = response;
        }
    }

    @AuraEnabled(cacheable=true)
    public static OpenAIResponse makeOpenAICall(String requestBody) {
        try {
            HttpRequest req = new HttpRequest();
            req.setEndpoint('callout:OpenAI');
            req.setMethod('POST');
            //req.setHeader('Content-Type', 'application/json');
            req.setBody(requestBody);
            req.setTimeout(60000);
    
            Http http = new Http();
            HttpResponse res = http.send(req);
            system.debug('OpenAI Response: ' + res.getBody());
            return new OpenAIResponse(res.getBody());
        } catch (Exception ex) {
             // Handle the exception here (e.g., log the error, return a default response, etc.)
             System.debug('Exception during OpenAI call: ' + ex.getMessage());
             System.debug('Exception during OpenAI call: ' + ex.getStackTraceString());
            return new OpenAIResponse('An error occurred during the OpenAI call.');
        }
    }
    
}