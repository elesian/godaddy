public with sharing class ChatTranscriptService {
    @AuraEnabled(cacheable=true)
    public static List<String> getChatTranscripts(String caseId) {
        List<String> transcripts = new List<String>();
        for (telegramTranscript__c transcript : [
            SELECT transcriptlog__c 
            FROM telegramTranscript__c 
            WHERE case__c = :caseId 
            ORDER BY CreatedDate DESC
        ]) {
            transcripts.add(transcript.transcriptlog__c);
        }
        return transcripts;
    }
}