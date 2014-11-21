/*
* Project Craigslist booster
* by Vladimir Zotov
* */
var App = App || {};
App.Settings = {
    searchPrefix: ".craigslist.org/search/?",
    frameLoadNumber: 5
};

App.init = function () {

    //parsing json.js vars
    App.states = new App.StateCollection();
    App.locations = new App.LocationCollection();

    _.each(states, function (part, index1) {
        _.each(part, function (state, index2) {
            var loc = _.map(locations[index1][index2],
                function(value){
                    return {
                        stateId: state,
                        string: value
                    };
                }
            );
            var locCol = new App.LocationCollection(loc);
            App.states.add({
                id: state,
                locations: locCol
            });
            App.locations.add(locCol.models);
        });
    });

    var currentState = App.states.at(0),
        currentLocation = App.locations.at(0);

    App.search = new App.SearchModel({
        state: currentState,
        location: currentLocation
    });

    App.view = new App.SearchView({
        model: App.search
    });

    App.view.render();
};


$(function () {
    App.init();
});