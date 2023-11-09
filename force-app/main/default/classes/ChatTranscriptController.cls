public with sharing class ChatTranscriptController {
    @AuraEnabled(cacheable=false)
    public static String getChatTranscript(String recordId) {
        // Query for the LiveChatTranscript record
        LiveChatTranscript transcript = [SELECT Id, Body, CreatedDate FROM LiveChatTranscript WHERE Id = :recordId LIMIT 1];

        // Serialize the transcript to JSON and return it
        String jsonResponse = JSON.serialize(transcript);
        return jsonResponse;
    }
}