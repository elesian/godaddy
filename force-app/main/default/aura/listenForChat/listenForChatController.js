({
  getChatLog: function (cmp, evt, helper) {
    debugger;
    console.log("Entering Get Chat Log");
    var conversationKit = cmp.find("conversationKit");
    var recordId = cmp.get("v.recordId");
    console.log("Record Id: " + recordId);
    conversationKit
      .getChatLog({
        recordId: recordId,
      })
      .then(function (result) {
        if (result) {
          console.log("Successfully retrieved chat log");
          console.log(result);
          cmp.set("v.chatLog", JSON.stringify(result));
        } else {
          console.log("Failed to retrieve chat log");
        }
      })
      .catch((error) => {
        helper.showConfirmationToast(
          cmp,
          "Error",
          "Error getting chat logs: " + error,
          "error"
        );
      });
  },
  handleSendReply: function (component, event, helper) {
    console.log("Event" + event);
    var message = event.getParam("reply");
    var conversationKit = component.find("conversationKit");
    var recordId = component.get("v.recordId");
    try {
      conversationKit
        .sendMessage({
          recordId: recordId,
          message: {
            text: message,
          },
        })
        .then(function (result) {
          if (result) {
            console.log("Success");
          } else {
            console.log("Failed");
            helper.showConfirmationToast(
              cmp,
              "Error",
              "Unable to send chat, try again",
              "error"
            );
          }
        });
    } catch (error) {
      console.log(error);
      helper.showConfirmationToast(
        cmp,
        "Error",
        "Error Sending Reply: " + error,
        "error"
      );
    }
  },
  createACase: function (component, event, helper) {
    debugger;
    component.set("v.readyForSummary", "");
    var conversationKit = component.find("conversationKit");
    var recordId = component.get("v.recordId");
    var chat = [];
    try {
      conversationKit
        .getChatLog({
          recordId: recordId,
        })
        .then(function (result) {
          debugger;

          if (result) {
            console.log("Successfully retrieved chat log");
            console.log(result);
            component.set("v.readyForSummary", JSON.stringify(result));
          } else {
            console.log("Failed to retrieve chat log");
            helper.showConfirmationToast(
              component,
              "Error",
              "Unable to retrieve chat log",
              "error"
            );
          }
        })
        .catch((error) => {
          debugger;
          if (error.includes("No active conversation for record")) {
            try {
              helper.retrieveRecord(component, recordId);
            
            } catch (error) {
              console.log(
                "Error Retrieving Transcript Record After Chat Ended: " + error
              );
              helper.showConfirmationToast(
                component,
                "Error",
                "The chat transcription is not available yet. Please try again once the status is 'Complete'",
                "error"
              );
            }
          } else {
            helper.showConfirmationToast(
              component,
              "Error",
              "Error Retrieving Chat Log: " + error,
              "error"
            );
            console.log(error);
          }
        });
    } catch (error) {
      helper.showConfirmationToast(
        component,
        "Error",
        "Error Creating Case: " + error,
        "error"
      );
      console.log(error);
    }
  },
  handleCaseSuccess: function (component, event, helper) {
    helper.showConfirmationToast(
      component,
      "Success",
      "Successfully create case with ID " + event.getParam("reply"),
      "success"
    );
  },
});