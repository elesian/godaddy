// filteredMessagesStore.js
let filteredMessages = [];

const getFilteredMessages = () => {
    return filteredMessages;
};

const setFilteredMessages = (messages) => {
    filteredMessages = [...messages];
};

export { getFilteredMessages, setFilteredMessages };