import { LightningElement, api, track, wire } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import makeOpenAICall from "@salesforce/apex/OpenAIApiHandler.makeOpenAICall";
import getCaseSummary from "@salesforce/apex/OpenAiController.getCaseSummary";
import createKnowledgeArticle from "@salesforce/apex/OpenAiController.createKnowledgeArticle";
import { createRecord, updateRecord } from "lightning/uiRecordApi";
import { getRecord } from "lightning/uiRecordApi";
import { refreshApex } from "@salesforce/apex";
import SUMMARY_FIELD from "@salesforce/schema/Case.Case_Summary__c";
import ID_FIELD from "@salesforce/schema/Case.Id";
//import RECORD_TYPE from "@salesforce/schema/Case.RecordTypeId";
// import KNOWLEDGE_TITLE from "@salesforce/schema/Knowledge__c.Title";
// import KNOWLEDGE_URL from "@salesforce/schema/Knowledge__c.UrlName";
// import KNOWLEDGE_PUB from "@salesforce/schema/Knowledge__c.PublishStatus";
// import KNOWLEDGE_SUM from "@salesforce/schema/Knowledge__c.Summary";
// import KNOWLEDGE_BODY from "@salesforce/schema/Knowledge__c.Article_Body__c";
//import KNOWLEDGE_RECORD_TYPE from "@salesforce/schema/Knowledge__c.RecordTypeId";
import DEMO_CONTEXT from "@salesforce/label/c.Demo_Context";

export default class CaseSummaryButton extends NavigationMixin(
  LightningElement
) {
  @api recordId;
  @track isKnowledge = false;
  @track isLoading = false;
  @track response = false;
  @api responseText = "";
  responseTextType = "";
  //   knowledgeFields = [
  //     KNOWLEDGE_TITLE,
  //     KNOWLEDGE_URL,
  //     KNOWLEDGE_PUB,
  //     KNOWLEDGE_SUM,
  //     KNOWLEDGE_BODY,
  //   ];
  knowledgeValues = {
    title: "",
    url: "",
    pubStatus: "",
    valStatus: "",
    summary: "",
    body: "",
  };

  publishStatusOptions = [
    { label: "Draft", value: "Draft" },
    { label: "Published", value: "Published" },
  ];

  validationStatusOptions = [
    { label: "Not Validated", value: "Not Validated" },
    { label: "Validated", value: "Validated" },
  ];

  @wire(getRecord, { recordId: "$recordId", fields: [SUMMARY_FIELD] })
  wiredRecordResult;

  handleButtonClick(event) {
    this.isLoading = true;
    const eventId = event.target.name;
    this.responseTextType =
      eventId === "caseSummary" ? "caseSummary" : "knowledeArticle";
    try {
      debugger;
      getCaseSummary({ caseId: this.recordId })
        .then((result) => {
          const messages = [];
          messages.push({
            content: "Case Description: " + result.caseDescription,
            role: "system",
          });
          result.chatterPosts.forEach((post) => {
            messages.push({
              content:
                "Follow Up Created By " +
                post.createdBy +
                "on Date of " +
                post.createdDate +
                " // " +
                post.body,
              role: "system",
            });
          });
          const messageContent =
            eventId === "caseSummary"
              ? "Can you provide a brief summary of this case based on description and Follow Ups. The summary should flow chronologically based on the date and summarize in an easy to follow way. Please provide response all on one line without linebreaks. Please mention details regarding initial and final service provider and keep response under 120 words"
              : "Can you draft a knowledge article based on the description and Follow Ups that explains how to resolve incidents like these. Start your response with a title line and then a summary line that provides an overview of the article in less than or equal to the number of characters in a tweet followed by the article itself";
          messages.push({ content: messageContent, role: "user" });
          return this.callOpenAI(messages);
        })
        .then((openAIResult) => {
          debugger;
          this.isKnowledge = eventId == "knowledgeArticle" ? true : false;
          this.responseText = openAIResult;
          if (this.isKnowledge) {
            this.handleKnowledgeFields(this.responseText);
          }
          this.response = true;
          console.log(openAIResult);
          this.isLoading = false;
        })
        .catch((error) => {
          debugger;
          // Handle errors
          this.isLoading = false;
          console.log("Error Calling OpenAI: " + error);
        });
    } catch (error) {
      console.log("Error with Apex Class: " + error);
    }
  }

  async callOpenAI(messages) {
    debugger;
    try {
      const requestBody = JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: messages,
        max_tokens: 1024,
        n: 1,
        //stop: '\n'
      });

      const response = await makeOpenAICall({ requestBody });
      if (response) {
        return JSON.parse(response.response).choices[0].message.content;
      } else {
        console.error("OpenAI API call failed:", response);
      }
    } catch (error) {
      debugger;
      console.error("Error calling OpenAI API:", error);
    } finally {
      this.isLoading = false;
    }
  }

  handleResponseChange(event) {
    this.responseText = event.target.value;
  }

  handleKnowledgeFields(text) {
    const lines = text.split("\n");
    let title = "";
    let summary = "";
    let body = "";
    let currentSection = "";

    for (let line of lines) {
      if (line.startsWith("Title: ")) {
        title = line.replace("Title: ", "").trim();
        currentSection = "summary";
      } else if (line.startsWith("Summary: ")) {
        summary = line.replace("Summary: ", "").trim();
        currentSection = "body";
      } else if (line === "Article:") {
        currentSection = "article";
      } else {
        if (currentSection === "article") {
          body += line + "<br>";
        }
      }
    }

    this.knowledgeValues.title = title;
    this.knowledgeValues.summary = summary;
    this.knowledgeValues.body = body.trim();

    const titleForUrl = title.replace(/[^a-zA-Z0-9 ]/g, "").toLowerCase();
    this.knowledgeValues.url = titleForUrl.replace(/\s+/g, "-");
  }

  handleSave() {
    debugger;
    if (this.responseTextType === "caseSummary") {
      const fields = {};
      fields[ID_FIELD.fieldApiName] = this.recordId;
      fields[SUMMARY_FIELD.fieldApiName] = this.responseText;
      //fields[RECORD_TYPE.fieldApiName] =
      //  DEMO_CONTEXT === "UAL" ? "0125j000000O03MAAS" : "0125j000000O1EIAA0";
      const recordInput = { fields };
      try {
        updateRecord(recordInput)
          .then(() => {
            this.response = false;
            return refreshApex(this.wiredRecordResult);
          })
          .catch((error) => {
            console.error("Error updating record: " + error);
          });
      } catch (error) {
        console.log("Error with update record: " + error);
        console.error("Error stack:", error.stack);
      }
    } else if (this.responseTextType === "knowledeArticle") {
      try {
        //const stringVal = JSON.stringify();
        createKnowledgeArticle({ knowledgeValues: this.knowledgeValues })
          .then((response) => {
            this.response = false;
            this[NavigationMixin.Navigate]({
              type: "standard__webPage",
              attributes: {
                url:
                  `https://pwc-23e-dev-ed.develop.lightning.force.com/lightning/r/Knowledge__kav/` +
                  response +
                  `/view`,
              },
            });
          })
          .catch((error) => {
            console.log("Error creating knowledge: " + error.body.message);
          });
      } catch (error) {
        console.log("Error creating knowledge: " + error);
      }
    }
    //     const fields = {};
    //     fields[KNOWLEDGE_TITLE.fieldApiName] = this.knowledgeValues.title;
    //     fields[KNOWLEDGE_URL.fieldApiName] = this.knowledgeValues.url;
    //     fields[KNOWLEDGE_PUB.fieldApiName] = this.knowledgeValues.pubStatus;
    //     fields[KNOWLEDGE_VAL.fieldApiName] = this.knowledgeValues.valStatus;
    //     fields[KNOWLEDGE_SUM.fieldApiName] = this.knowledgeValues.summary;
    //     fields[KNOWLEDGE_BODY.fieldApiName] = this.knowledgeValues.body;
    //     fields[KNOWLEDGE_RECORD_TYPE.fieldApiName] = '0128V000001eyJvQAI';
    //     const recordInput = {
    //         "apiName": "KnowledgeArticleVersion",
    //         "fields": fields
    //     }
    //     try {
    //         createRecord(recordInput)
    //             .then((response) => {
    //                 this.response = false;
    //                 const url = `/lightning/r/Knowledge_kav/${response.id}/view`;
    //                 this[NavigationMixin.Navigate]({
    //                     type: 'standard__RecordPage',
    //                     attributes: {
    //                         recordId: response.id,
    //                         objectApiName: 'Knowledge_kav',
    //                         actionName: 'view',
    //                     }
    //                 });
    //             })
    //             .catch(error => {
    //                 console.log('Error creating knowledge: ' + error);
    //             })
    //     } catch (error) {
    //         console.log('Error creating knowledge: ' + error);
    //     }
    // }
  }

  handleCloseModal() {
    this.response = false;
  }

  handleKnowledgeInputChange(event) {
    const field = event.target.getAttribute("data-field");
    this.knowledgeValues[field] = event.target.value;
  }

  // handleCancel() {
  //     // Dispatch an event to notify the parent component about cancellation
  //     const cancelEvent = new CustomEvent('cancelresponse');
  //     this.dispatchEvent(cancelEvent);
  // }
}