({
  convertHtmlToHumanReadable: function (htmlString) {
    var plainText = htmlString
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ");

    var sections = plainText.split("\n");
    sections = sections.filter(function (section) {
      return section.trim() !== "";
    });

    var humanReadableText = sections.join("\n");
    return humanReadableText;
  },
  retrieveRecord: function (component, recordId) {
    var action = component.get("c.getTranscript"); // Apex method name

    action.setParams({
      recordId: recordId,
    });

    action.setCallback(this, function (response) {
      var state = response.getState();
      if (state === "SUCCESS") {
        var transcriptRecord = response.getReturnValue();
        if (transcriptRecord.Status === "Completed") {
          var body = this.convertHtmlToHumanReadable(
            transcriptRecord.Body 
          );
          component.set("v.readyForSummary", JSON.stringify(body)); 
        } else {
          this.showConfirmationToast(
            component,
            "Error",
            "The chat transcription is not available yet. Please try again once the status is 'Complete'",
            "warning"
          );
        }
        console.log(transcriptRecord); // Corrected the variable name
      } else {
        console.error("Error retrieving record: " + response.getError());
      }
    });

    $A.enqueueAction(action);
  },
  showConfirmationToast: function (component, title, message, type) {
    var toastEvent = $A.get("e.force:showToast");
    toastEvent.setParams({
      title: title,
      type: type,
      mode: "dismissible",
      duration: 5000,
      message: message,
    });
    toastEvent.fire();
  },
});