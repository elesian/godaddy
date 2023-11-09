public with sharing class OpenAiController{
    @AuraEnabled(cacheable = true)
    public static String callOpenAI(String messages){
        String aiMessage = '';
        //List<Map<String, Object>> messages = (List<Map<String, Object>>) JSON.deserializeUntyped(messagesSerialized);
        try{
            String requestBody = JSON.serialize(new Map<String, Object>{ 'model' => 'gpt-3.5-turbo', 'messages' => messages, 'max_tokens' => 1024, 'n' => 1 });

            OpenAIApiHandler.OpenAIResponse apiResponse = OpenAIApiHandler.makeOpenAICall(requestBody);

            if (apiResponse != null && apiResponse.response != null){
                aiMessage = apiResponse.response;
            } else{
                System.debug('OpenAI API call failed.');
            }
        } catch (Exception e){
            System.debug('Error calling OpenAI API: ' + e.getMessage());
        }

        return aiMessage;
    }

    @AuraEnabled(cacheable = true)
    public static CaseSummary getCaseSummary(Id caseId){
        CaseSummary summary = new CaseSummary();

        summary.caseDescription = getCaseDescription(caseId);
        summary.chatterPosts = getChatterPosts(caseId);

        return summary;
    }

    public static String getCaseDescription(Id caseId){
        Case caseRecord = [SELECT Description
                           FROM Case
                           WHERE Id = :caseId
                           LIMIT 1];
        return caseRecord.Description;
    }

    public static List<ChatterPost> getChatterPosts(Id caseId){
        List<ChatterPost> chatterPosts = new List<ChatterPost>();

        List<FeedItem> chatterPostsQuery = [SELECT Id, ParentId, CreatedDate, CreatedBy.Name, Body
                                            FROM FeedItem
                                            WHERE ParentId = :caseId AND Type = 'TextPost'
                                            ORDER BY CreatedDate DESC
                                            LIMIT 10];

        for (FeedItem post : chatterPostsQuery){
            ChatterPost chatterPost = new ChatterPost();
            chatterPost.id = post.Id;
            chatterPost.parentId = post.ParentId;
            chatterPost.createdDate = post.CreatedDate;
            chatterPost.createdBy = post.CreatedBy.Name;
            chatterPost.body = post.Body;
            chatterPosts.add(chatterPost);
        }

        return chatterPosts;
    }

    @AuraEnabled
    public static Id createKnowledgeArticle(KnowledgeValues knowledgeValues){
        system.debug('Debugging Knowledge Values: ' + knowledgeValues);
        system.debug('Debugging Title: ' + knowledgeValues.title);
        system.debug('Debugging URL: ' + knowledgeValues.url);
        system.debug('Debugging Pub Status: ' + knowledgeValues.pubStatus);
        system.debug('Debugging Val Status: ' + knowledgeValues.valStatus);
        system.debug('Debugging Summary: ' + knowledgeValues.summary);
        system.debug('Debugging Body: ' + knowledgeValues.body);
        Knowledge__kav article = new Knowledge__kav();
        article.title = knowledgeValues.title;
        article.UrlName = knowledgeValues.url;
        //article.PublishStatus = knowledgeValues.pubStatus;
        //article.ValidationStatus = knowledgeValues.valStatus;
        article.Summary = knowledgeValues.summary;
        article.Article_Body__c = knowledgeValues.body;

        Database.SaveResult saveResult = Database.insert (article, false);

        if (saveResult.isSuccess()){
            return saveResult.getId();
        } else{
            throw new AuraHandledException('Error creating knowledge: ' + saveResult.getErrors()[0].getMessage());
        }
    }

    // @AuraEnabled
    // public static Id createCaseFromWrapper(string serializedCaseWrapper){
    //     try {
    //         CaseWrapper caseWrapper = (CaseWrapper)JSON.deserialize(serializedCaseWrapper, CaseWrapper.class);
    //     // Query for the Contact using the Contact Name
    //     Contact selectedContact = [SELECT Id, AccountId, Phone, Email FROM Contact WHERE Name = :caseWrapper.Contact_Name LIMIT 1];
    //     if (selectedContact != null) {
    //         // Create a new Case instance
    //         Case newCase = new Case(
    //             OwnerId = UserInfo.getUserId(),
    //             ContactId = selectedContact.Id,
    //             AccountId = selectedContact.AccountId,
    //             Origin = caseWrapper.Origin,
    //             Status = caseWrapper.Status,
    //             Priority = caseWrapper.Priority,
    //             Reason = caseWrapper.CaseReason,
    //             Subject = caseWrapper.Subject,
    //             Description = caseWrapper.Description
    //         );
    //         // Insert the new Case
    //         insert newCase;
    //         return newCase.id;
    //     }
    // } catch (Exception e) {
    //         throw new AuraHandledException(e.getMessage());
    //     }
    // }
    @AuraEnabled
    public static Id createCaseFromWrapper(CaseWrapper caseWrapper){
        try{
            system.debug('Entering into createCaseFromWrapper');
            //CaseWrapper caseWrapper = (CaseWrapper)JSON.deserialize(serializedCaseWrapper, CaseWrapper.class);
            // Query for the Contact using the Contact Name
            String jstring = JSON.serialize(caseWrapper);
            system.debug(jstring);
            Contact selectedContact = [SELECT Id, AccountId, Phone, Email
                                       FROM Contact
                                       WHERE Name = 'Matthew Pantell'
                                       LIMIT 1];

            if (selectedContact != null){
                // Create a new Case instance
                Case newCase = new Case();
                newCase.OwnerId = UserInfo.getUserId();
                newCase.ContactId = selectedContact.Id;
                newCase.AccountId = selectedContact.AccountId;
                newCase.Origin = caseWrapper.Origin;
                newCase.Status = caseWrapper.Status;
                newCase.Priority = caseWrapper.Priority;
                newCase.Reason = caseWrapper.CaseReason;
                newCase.Subject = caseWrapper.Subject;
                newCase.Description = caseWrapper.Description;
                //newCase.RecordTypeId = '0125j000000OMWaAAO'; //hard coded for Go Daddy

                insert newCase;

                LiveChatTranscript chat = [SELECT Id, CaseId, ContactId
                                           FROM LiveChatTranscript
                                           WHERE Id = :caseWrapper.chatId];
                chat.ContactId = selectedContact.id;
                chat.CaseId = newCase.id;
                update chat;

                if (caseWrapper.chatLog.size() > 0){
                    createChatterPostsOnCase(newCase.id, caseWrapper.chatLog);
                }
                return newCase.Id;
            } else{
                throw new AuraHandledException('Selected contact was not found.');
            }
        } catch (Exception e){
            throw new AuraHandledException('An error occurred: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static LiveChatTranscript getTranscript(Id recordId){
        try {
            LiveChatTranscript chatTranscript = [SELECT Id, Status, Body FROM LiveChatTranscript WHERE Id = : recordId];
                return chatTranscript;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    public static void createChatterPostsOnCase(Id caseId, List<ChatLog> chatLogs){
        // Fetch the Case record
        Case existingCase = [SELECT Id, Subject
                             FROM Case
                             WHERE Id = :caseId
                             LIMIT 1];

        // Iterate through the ChatLog list and create Chatter posts
        List<FeedItem> chatterPosts = new List<FeedItem>();
        for (ChatLog log : chatLogs){
            system.debug(log);
            if (log.type != 'AgentWhisper'){
                FeedItem chatterPost = new FeedItem();
                chatterPost.ParentId = existingCase.Id; // Reference to the Case
                chatterPost.Body = (String) log.content;
                chatterPost.Type = 'TextPost'; // This can be changed to 'LinkPost', 'ContentPost', etc. as needed
                system.debug(chatterPost);
                chatterPosts.add(chatterPost);
            }
        }

        // Insert the Chatter posts
        insert chatterPosts;

        System.debug(chatterPosts.size() + ' Chatter posts created on Case: ' + existingCase.Subject);
    }

    //WRAPPER CLASSES
    public class Message{
        @AuraEnabled
        public String content{ get; set; }

        @AuraEnabled
        public String role{ get; set; }

    }

    public class CaseSummary{
        @AuraEnabled
        public String caseDescription;
        @AuraEnabled
        public List<ChatterPost> chatterPosts;
    }

    public class ChatterPost{
        @AuraEnabled
        public String id;
        @AuraEnabled
        public String parentId;
        @AuraEnabled
        public Datetime createdDate;
        @AuraEnabled
        public String createdBy;
        @AuraEnabled
        public String body;

    }

    public class KnowledgeValues{
        @AuraEnabled
        public String title{ get; set; }

        @AuraEnabled
        public String url{ get; set; }

        @AuraEnabled
        public String pubStatus{ get; set; }

        @AuraEnabled
        public String valStatus{ get; set; }

        @AuraEnabled
        public String summary{ get; set; }

        @AuraEnabled
        public String body{ get; set; }

    }

    public class CaseWrapper{
        @AuraEnabled
        public String Contact_Name{ get; set; }

        @AuraEnabled
        public String Origin{ get; set; }

        @AuraEnabled
        public String Status{ get; set; }

        @AuraEnabled
        public String Priority{ get; set; }

        @AuraEnabled
        public String CaseReason{ get; set; }

        @AuraEnabled
        public String Subject{ get; set; }

        @AuraEnabled
        public String Description{ get; set; }

        @AuraEnabled
        public String chatId{ get; set; }

        @AuraEnabled
        public ChatLog[] chatLog{ get; set; }

    }

    public class ChatLog{
        @AuraEnabled
        public string type{ get; set; }

        @AuraEnabled
        public string content{ get; set; }

    }

}