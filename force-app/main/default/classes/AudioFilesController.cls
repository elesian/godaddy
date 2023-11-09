public with sharing class AudioFilesController {
    @AuraEnabled
    public static List<String> getAudioFileNames() {
        String url = 'https://apex-docs-gpt-0472278cbe07.herokuapp.com/audiofiles'; // Replace with your Heroku API endpoint
        
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        request.setEndpoint(url);
        request.setMethod('GET');
        HttpResponse response = http.send(request);
        
        if (response.getStatusCode() == 200) {
            // Parse the response body to a Map
            Map<String, Object> responseBody = (Map<String, Object>) JSON.deserializeUntyped(response.getBody());
            
            // Extract the audioFiles array from the Map
            List<Object> audioFilesObject = (List<Object>) responseBody.get('audioFiles');
            
            // Convert List<Object> to List<String>
            List<String> audioFiles = new List<String>();
            for (Object file : audioFilesObject) {
                audioFiles.add((String) file);
            }
            system.debug('the audiofile URLs are' + audioFiles);
            return audioFiles;
        } else {
            return null;
        }
    }

    @AuraEnabled
    public static String getAudioFileUrl(String fileName) {
        String url = 'https://apex-docs-gpt-0472278cbe07.herokuapp.com/audiofiles/' + fileName; // Adjust the URL and extension as per your needs
        
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        request.setEndpoint(url);
        request.setMethod('GET');
        HttpResponse response = http.send(request);
        
        if (response.getStatusCode() == 200) {
            // Return the URL or the response body based on your needs
            return url; 
        } else {
            return null;
        }
    }

    @AuraEnabled
    public static String getCallSummary(String audioFileName) {
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        request.setEndpoint('https://apex-docs-gpt-0472278cbe07.herokuapp.com/transcribe/' + audioFileName);
        request.setMethod('POST');
        HttpResponse response = http.send(request);
        // Parse the job ID from the response and return it
        Map<String, Object> responseBody = (Map<String, Object>) JSON.deserializeUntyped(response.getBody());
    return (String) responseBody.get('job_id');
}

@AuraEnabled
public static String checkJobStatus(String jobId) {
    Http http = new Http();
    HttpRequest request = new HttpRequest();
    // Replace with your actual endpoint to check the job status
    request.setEndpoint('https://apex-docs-gpt-0472278cbe07.herokuapp.com/transcription-status/' + jobId); 
    request.setMethod('GET');
    HttpResponse response = http.send(request);
    // Logging the status code and response body for debugging
    System.debug(response.getStatusCode());
    System.debug(response.getBody());
return response.getBody(); // Returning the response body
}


}