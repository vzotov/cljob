App.SearchModel = Backbone.Model.extend({
    defaults: {
        query: "",
        sort: "date",
        catAbb: "jjj",
        newSearch: true
    },
    initialize: function () {
        this.set("watched", new App.LocationCollection());
    },
    setState: function (state) {
        this.set("state", state);
        this.setLocation(state.get("locations").at(0));
    },
    setLocation: function (location) {
        this.set("location", location);
    },
    watch: function(location){
        this.get("watched").add(location);
    },
    clearWatched: function(){
        this.get("watched").reset();
    }
});
App.StateModel = Backbone.Model.extend({
    initialize: function (options) {
    }
});
App.StateCollection = Backbone.Collection.extend({
    model: App.StateModel
});
App.LocationModel = Backbone.Model.extend({
    initialize: function (options) {
        this.parse();
    },
    parse: function () {
        var str = this.get("string");
        var exp = /(\w+)\.craigslist.+sort=(\w+).+query=(\w+)/g;
        var m = exp.exec(str);
        this.set("id", m[1]);
        this.set("sort", m[2]);
        this.set("query", m[3]);
    },
    getState: function(){
        return App.states.get(this.get("stateId"));
    }
});
App.LocationCollection = Backbone.Collection.extend({
    model: App.LocationModel
});
