 window._GIPHY = (() => {
    var apiKey = 'PCwtSgCJwO6jOtgI4wR1ULDrvNJaUZNb';
    var _results = null;

    return { //public API
        getApiKey: function() {
            return apiKey;
        },
        getResults: function() {
            return _results;
        },
        setResults: function(results) {
        console.log(results);
          _results = results
        }
    };
})();





