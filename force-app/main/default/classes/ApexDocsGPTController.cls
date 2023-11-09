public class ApexDocsGPTController {
    @AuraEnabled(cacheable=false)
    public static String makeCallout(String query) {
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        request.setEndpoint('https://apex-docs-gpt-0472278cbe07.herokuapp.com/chat');
        request.setMethod('POST');
        request.setHeader('Content-Type', 'application/json;charset=UTF-8');
        request.setTimeout(60000);

        system.debug('the query in the apex controller is ' + query);

        // Set the body with your query
        request.setBody('{"existing_context":{"role":"system","content":"string"},"query":"' + query + '"}');

        try {
            HttpResponse response = http.send(request);
            if (response.getStatusCode() == 200) {
                Map<String, Object> responseBody = (Map<String, Object>) JSON.deserializeUntyped(response.getBody());
                String content = (String) responseBody.get('response');
                content = content.replace('\n', '<br>');
                
                // Use a Pattern and Matcher to find code snippets and process them
                Pattern codePattern = Pattern.compile('```(.*?)```');
                Matcher codeMatcher = codePattern.matcher(content);
                String processedContent = '';
                Integer lastEnd = 0;
                while (codeMatcher.find()) {
                    String codeSnippet = codeMatcher.group(1);

                    // Replace characters that might trigger auto-linking
                    codeSnippet = codeSnippet.replaceAll('\\.', '.&#8203;');
                    
                    // Append the content before the code snippet and the processed code snippet
                    processedContent += content.substring(lastEnd, codeMatcher.start()) +
                                        '<pre><code>' + codeSnippet + '</code></pre>';
                    lastEnd = codeMatcher.end();
                }
                processedContent += content.substring(lastEnd);  // Append the remaining content
                
                return processedContent;
            } else {
                return 'Error: ' + response.getStatus();
            }
        } catch (Exception e) {
            return 'An error occurred while making the request: ' + e.getMessage();
        }
    }
}