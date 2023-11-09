public with sharing class ResponseSanitizer {
    public static String sanitizeContent(String content) {
        // Placeholder for the processed content
        String processedContent = '';
        
        // Replace line breaks with HTML <br> tags outside of code and table blocks
        content = content.replaceAll('(?s)([^\\[]*?)\\n', '$1<br>');  

        Pattern tablePattern = Pattern.compile('(\\|[^\\|]+\\|([^\\|]+\\|)+)');
        Matcher tableMatcher = tablePattern.matcher(content);
        while (tableMatcher.find()) {
            String markdownTable = tableMatcher.group(1).replaceAll('<br>', '\n'); 
            String[] rows = markdownTable.split('\n');
            String htmlTable = '<div class="scrollable-table"><table border="1"><tbody>'; // Added div wrapper here
            for (String row : rows) {
                htmlTable += '<tr>';
                String[] cells = row.split('\\|');
                for (String cell : cells) {
                    if(cell.trim() != '') { // Replaced the != '' with .isEmpty()
                        htmlTable += '<td>' + cell.trim() + '</td>';
                    }
                }
                htmlTable += '</tr>';
            }
            htmlTable += '</tbody></table></div>'; // Closing div tag added here
            content = content.replace(tableMatcher.group(0), htmlTable);
        }

        // Use a Pattern and Matcher to find and sanitize code snippets
        Pattern codePattern = Pattern.compile('```([\\s\\S]*?)```');
        Matcher codeMatcher = codePattern.matcher(content);
        Integer lastEnd = 0;
        while (codeMatcher.find()) {
            String codeSnippet = codeMatcher.group(1);

            // Sanitize specific patterns that might be converted to hyperlinks
            codeSnippet = codeSnippet
                .replaceAll('http', 'h&#116;tp')
                .replaceAll('https', 'h&#116;tps')
                .replaceAll('www', 'w&#119;w');
            
            // Append the content before the code snippet and the sanitized code snippet
            processedContent += content.substring(lastEnd, codeMatcher.start()) +
                                '<pre><code>' + codeSnippet + '</code></pre>';
            lastEnd = codeMatcher.end();
        }

        processedContent += content.substring(lastEnd);  // Append the remaining content not within code blocks
        
        return processedContent;
    }
}