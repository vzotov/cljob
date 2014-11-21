App.SearchView = Backbone.View.extend({
    tagName: "div",
    className: "content",
    events: {
        "click .left": function () {
            this.previousLocation();
        },
        "click .right": function () {
            this.nextLocation();
        }
    },
    initialize: function (options) {
        this.model = options.model;
        this.listenTo(this.model, "change:query", this.startSearching);
        this.listenTo(this.model, "change:location", this.renderOnlyWhatINeed);
    },
    render: function () {
        var view = _.template($("#application-template").html())(this.model.toJSON());

        this.$el.html(view);
        this.$el.attr("tabindex", 1);

        var that = this;
        this.$el.find("form").submit(function (e) {
            var value = $(this).find("input").val();
            that.model.set("query", value);
            e.preventDefault();
        });

        this.$frameHolder = this.$el.find(".frame-holder");

        $(document.body).append(this.$el);

        var $header = this.$el.find("header");

        this.statesSelector = new App.StatesView({
            collection: App.states,
            container: $header,
            search: this.model
        });
        this.statesSelector.render();

        this.locationSelector = new App.LocationBarView({
            collection: App.locations,
            container: $header,
            search: this.model
        });
        this.locationSelector.render();
    },
    startSearching: function () {
        this.$el.focus();
        this.removeAllFrames();
        this.clearWatched();
        this.renderOnlyWhatINeed();
    },
    clearWatched: function(){
        this.model.clearWatched();
    },
    getUrlByLocation: function (location) {
        var sort = this.model.get("sort");
        var query = this.model.get("query");
        var cat = this.model.get("catAbb");
        return "http://" + location.get("id") + App.Settings.searchPrefix +
            "sort=" + sort +
            "&query=" + query +
            "&catAbb=" + cat;
    },
    removeAllFrames: function(){
        App.locations.each(function(location){
            location.trigger("removeFrame");
        });
        this.model.set("newSearch", true);
    },
    renderOnlyWhatINeed: function () {
        /* need to check which iframes have loaded
         if necessary remove excess and add new
        */
        var collection = App.locations;
        var currentLocation = this.model.get("location");
        var startIndex = collection.indexOf(currentLocation);
        var endIndex = startIndex + App.Settings.frameLoadNumber;
        //mark current location as watched
        this.model.watch(currentLocation);

        this.$el.find(".caption")
            .html(currentLocation.get("id") + ",<br/>" + currentLocation.getState().get("id"))
            .finish().show().delay(4000).fadeOut(1000);

        var visibleList = [
            collection.indexOf(currentLocation),
            collection.indexOf(currentLocation) + App.Settings.frameLoadNumber
        ];
        var prevVisList = [];
        var prevLocation;
        if(!this.model.get("newSearch")){
            prevLocation = this.model.previous("location");
        }
        else
        {
            this.model.set("newSearch", false);
        }
        if (prevLocation) {
            prevVisList = [
                collection.indexOf(prevLocation),
                collection.indexOf(prevLocation) + App.Settings.frameLoadNumber
            ];
        }
        var appendList = [],
            removeList = [],
            prependList = [];
        if (prevVisList.length) {
            if (prevVisList[0] > visibleList[0]) {
                if (prevVisList[0] > visibleList[1]) {
                    //remove all from prevVisList[0] to prevVisList[1]
                    removeList = collection.slice(prevVisList[0], prevVisList[1]);
                    //add all from visibleList[0] to visibleList[1]
                    appendList = collection.slice(visibleList[0], visibleList[1]);
                }
                else {
                    //delete below from visibleList[1] to prevVisList[1]
                    removeList = collection.slice(visibleList[1], prevVisList[1]);
                    //add above from visibleList[0] to prevVisList[0]
                    prependList = collection.slice(visibleList[0], prevVisList[0]);
                }
            }
            else if (prevVisList[0] < visibleList[0]) {
                if (prevVisList[1] < visibleList[0]) {
                    //remove all from prevVisList[0] to prevVisList[1]
                    removeList = collection.slice(prevVisList[0], prevVisList[1]);
                    //add all from visibleList[0] to visibleList[1]
                    appendList = collection.slice(visibleList[0], visibleList[1]);
                }
                else {
                    //remove above from prevVisList[0] to visibleList[0]
                    removeList = collection.slice(prevVisList[0], visibleList[0]);
                    //add below from prevVisList[1] to visibleList[1]
                    appendList = collection.slice(prevVisList[1], visibleList[1]);
                }
            }
            if (prevVisList[0] == visibleList[0]) {
                if (prevVisList[1] > visibleList[1]) {
                    removeList = collection.slice(prevVisList[1], visibleList[1]);
                }
                if (prevVisList[1] < visibleList[1]) {
                    appendList = collection.slice(prevVisList[1], visibleList[1]);
                }
            }
        }
        else {
            appendList = collection.slice(visibleList[0], visibleList[1]);
        }
        var that = this;
        if (removeList.length) {
            _.each(removeList,function (location) {
                //remove frames
                location.trigger("removeFrame");
            });
        }
        if (appendList.length) {
            _.each(appendList,function (location) {
                //append frames
                var view = new App.LocationFrameView({
                    location: location,
                    url: that.getUrlByLocation(location),
                    $holder: that.$frameHolder
                });
                view.render(false);
            });
        }
        if (prependList.length) {
            _.each(prependList,function (location) {
                //prepend frames
                var view = new App.LocationFrameView({
                    location: location,
                    url: that.getUrlByLocation(location),
                    $holder: that.$frameHolder
                });
                view.render(true);
            });
        }
    },
    previousLocation: function () {
        var currentLocation = this.model.get("location");
        var pos = App.locations.indexOf(currentLocation);
        if (pos > 0) {
            pos--;
            this.model.set("location", App.locations.at(pos));
        }
    },
    nextLocation: function () {
        var currentLocation = this.model.get("location");
        var pos = App.locations.indexOf(currentLocation);

        if (pos < App.locations.length - 1) {
            pos++;
            this.model.set("location", App.locations.at(pos));
        }
    }
});

App.StatesView = Backbone.View.extend({
    tagName: "select",
    className: "states",
    initialize: function (options) {
        this.collection = options.collection;
        this.container = options.container;
        this.search = options.search;
        this.listenTo(this.search, "change:location", this.changeState)
    },
    render: function () {
        this.parseLocation();
        this.$el.appendTo(this.container);

        var that = this;
        this.$el.on("change", function () {
            var state = that.getLocation($(this).val());
            that.search.setState(state);
        });
    },
    getLocation: function (value) {
        return this.collection.get(value);
    },
    parseLocation: function () {
        this.$el.html("");
        this.collection.each(function (_item) {
            var json = _item.toJSON();
            this.$el.append(_.template("<option value='<%= id %>'><%= id %></option>")(json));
        }, this);
    },
    changeState: function(){
        var location = this.search.get("location");
        var stateId = location.get("stateId");
        this.$el.find("[value='"+stateId+"']").attr("selected", "selected");
    }
});

App.LocationBarView = Backbone.View.extend({
    tagName: "div",
    className: "location-bar",
    events: {
        "mousemove": "showLabel",
        "mouseout": "hideLabel",
        "click": "setLocationToSearch"
    },
    initialize: function (options) {
        this.collection = options.collection;
        this.container = options.container;
        this.search = options.search;
        this.listenTo(this.search, "change:location", this.changeLocation);
        this.listenTo(this.search.get("watched"), "add", this.correctWatchedLocations);
    },
    render: function () {
        this.$label = $("<span />").addClass("label");
        this.$cl = $("<span />").addClass("current-location");
        this.$watched = $("<span />").addClass("watched");
        this.$el.append(this.$label,this.$cl,this.$watched);
        this.container.append(this.$el);
    },
    getLocationByX: function (x) {
        var width = this.$el.width();
        var length = this.collection.length;
        var number = Math.floor(length / width * x);
        return this.collection.at(number);
    },
    getXbyLocation: function (location) {
        var number = this.collection.indexOf(location);
        var width = this.$el.width();
        var length = this.collection.length;
        return Math.floor(number * width / length);
    },
    setLocationToSearch: function (e) {
        var x = e.clientX;
        var location = this.getLocationByX(x);
        App.search.setLocation(location);
    },
    showLabel: function (e) {
        var x = e.clientX;
        var location = this.getLocationByX(x);
        this.$label.html(location.get("id") + ", " + location.getState().get("id"));
        if( x + this.$label.width() <= $(window).width())
        {
            this.$label.css({
                left: x,
                right: "auto"
            });
        }
        else
        {
            this.$label.css({
                left: "auto",
                right: $(window).width() - x
            });
        }
        this.$label.show();
    },
    hideLabel: function(){
        this.$label.hide();
    },
    changeLocation: function()
    {
        var location = this.search.get("location");
        var x = this.getXbyLocation(location);
        var barWidth = this.$el.width();
        var width = barWidth/this.collection.length;
        this.$cl.css({
            left: (x/barWidth*100) + "%",
            width: (width/barWidth*100) + "%"
        });
    },
    correctWatchedLocations: function(){
        var watched = this.search.get("watched");
        var that = this;
        that.$watched.html("");
        watched.each(function(location){
            var $el = that.getLocationEl(location);
            that.$watched.append($el);
        });
        //console.log(watched.toJSON());
    },
    getLocationEl: function(location){
        var x = this.getXbyLocation(location);
        var barWidth = this.$el.width();
        var width = barWidth/this.collection.length;
        return $("<span />").addClass("location").css({
            left: (x/barWidth*100) + "%",
            width: (width/barWidth*100) + "%"
        });
    }
});

App.LocationFrameView = Backbone.View.extend({
    tagName: "iframe",
    className: "location-frame",
    initialize: function (options) {
        this.location = options.location;
        this.url = options.url;
        this.$holder = options.$holder;
        this.listenTo(this.location, "removeFrame", this.remove);
    },
    render: function (prepend) {
        this.$el.attr("src", this.url);
        this.$holder[prepend ? "prepend" : "append"](this.$el);
    }
});
