/* Copyright (C) 2016 othmar52 <othmar52@users.noreply.github.com>
 *
 * This file is part of sliMpd - a php based mpd web client
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License
 * for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
/*
 * dependencies: jquery, backbonejs, underscorejs
 */
(function() {
    "use strict";
    var $ = window.jQuery,
        _ = window._;
    $.extend(true, window.sliMpd, {
        modules : {}
    });
    window.sliMpd.modules.EditAlbumView = window.sliMpd.modules.PageView.extend({

        name : null,
        rendered : false,
        initialFormValues : "",
        alNumRegEx : /[^a-zêèéäöüí\d]/i,
        localSortable : null,

        initialize : function(options) {
            window.sliMpd.modules.PageView.prototype.initialize.call(this, options);
        },

        render : function(renderMarkup) {
            if (this.rendered) {
                return;
            }
            window.sliMpd.modules.PageView.prototype.render.call(this, renderMarkup);

            // record all form values before user-input modifies values
            this.formSnapshot("#edit-album");

            var that = this;

            $(".marry", this.$el).off("click", this.marryTrackClickListener).on("click", this.marryTrackClickListener);
            $(".marry-all", this.$el).off("click", this.marryAllTracksClickListener).on("click", this.marryAllTracksClickListener);
            $(".marry-property", this.$el).off("click", this.marryPropertyClickListener).on("click", this.marryPropertyClickListener);
            $(".marry-all-properties", this.$el).off("click", this.marryAllPropertiesClickListener).on("click", this.marryAllPropertiesClickListener);
            $(".marry-genre", this.$el).off("click", this.marryGenreClickListener).on("click", this.marryGenreClickListener);

            this.highlightPhrases();
            $("#edit-album", this.$el).on("submit", function(e) {
                e.preventDefault();
                window.NProgress.start();
                var currentItems = that.convertSerializedArrayToHash($(this).serializeArray());
                var itemsToSubmit = that.hashDiff(that.initialFormValues, currentItems);
                $.ajax({
                    type: $(this).attr("method"),
                    url: window.sliMpd.router.setGetParameter($(this).attr("action"), "nosurrounding", "1"),
                    data: itemsToSubmit,
                    success: function(response) {
                        window.NProgress.done();
                        window.sliMpd.checkNotify(response);
                    }
                });
            });

            $("#submit-marriage", this.$el).on("submit", function(e) {
                e.preventDefault();

                var that = this;
                var discogsId = $("#ext-items-container").attr("data-release-id");
                var data = { discogsid: discogsId, track: { }, album: { } };
                var collectedData = 0;
                // collect linked tracks
                $(".local-items .well").each(function(idx,item){
                    if($(item).hasClass("is-married")) {
                        //var trackProperties = { [$(this).attr("data-uid")]: { "setDiscogsId": discogsId, "setDiscogsTrackIndex": 44}};
                        data.track[$(item).attr("data-uid")] = {
                            "setDiscogsId": discogsId,
                            "setDiscogsTrackIndex": idx
                        };
                        collectedData++;
                        //console.log("married", $(item).attr("data-uid"), discogsId);
                    }
                });
                // collected confirmed album properties
                $(".marry-property.use-property").each(function(){
                    var $target = $( $(this).attr("data-target"), this.$el);
                    data.album[$target.attr("name")] = $target.val();
                    collectedData++;
                });
                // do not submit nothing
                if(collectedData < 1) {
                    window.sliMpd.notify({"message": "no changes have been made. skipping...", "type": "warning"});
                    return;
                }
                window.NProgress.start();
                $.ajax({
                    type: $(this).attr("method"),
                    url: window.sliMpd.router.setGetParameter($(this).attr("action"), "nosurrounding", "1"),
                    data: data,
                    success: function(response) {
                        window.NProgress.done();
                        window.sliMpd.checkNotify(response);
                    }
                });
            });

            // thanks to http://stackoverflow.com/questions/4299241/jquery-sortable-lists-and-fixed-locked-items#answer-6131590
           this.localSortable = $(".grid", this.$el).sortable({
                items: ".well:not(.locked)",
                placeholder: "well placeholder",
                tolerance: "pointer",
                forceHelperSize: true,
                axis: "y",
                cancel: ".locked",
                helper: function(event, ui){
                    var $clone =  $(ui).clone();
                    $clone .css("position", "absolute");
                    return $clone.get(0);
                },
                start: function(){
                    $(".locked", this).each(function(){
                        var $this = $(this);
                        $this.data("pos", $this.index());
                    });
                },
                change: function(){
                    var $sortable = $(this);
                    var $statics = $(".locked", this).detach();
                    var $helper = $("<div class='well'></div>").prependTo(this);
                    $statics.each(function(){
                        var $this = $(this);
                        var target = $this.data("pos");
                        $this.insertAfter($(".well", $sortable).eq(target));
                    });
                    $helper.remove();
                },
                stop: function( event, ui ) {
                    that.highlightPhrases();
                }
            }).disableSelection();

           this.imageSortable = $(".thumbs", this.$el).sortable({
                items: ".thumb",
                placeholder: "thumb placeholder",
                tolerance: "pointer",
                forceHelperSize: true
            }).disableSelection();

            this.rendered = true;
        },

        remove : function() {
            $(".marry", this.$el).off("click", this.marryTrackClickListener);
            $(".marry-all", this.$el).off("click", this.marryAllTracksClickListener);
            $(".marry-property", this.$el).off("click", this.marryPropertyClickListener);
            $(".marry-all-properties", this.$el).off("click", this.marryAllPropertiesClickListener);
            $(".marry-genre", this.$el).off("click", this.marryGenreClickListener);
            window.sliMpd.modules.PageView.prototype.remove.call(this);
        },


        /**
         * tracks
         */
        marryTrack : function(index) {
            // add class to external item
            $("#ext-item-" + index).addClass("is-married");

            // search local item of same position
            $(".local-items div.well:eq("+ index +")").addClass("is-married locked");
        },

        unmarryTrack : function(index) {
            // add class to external item
            $("#ext-item-" + index).removeClass("is-married");

            // search local item of same position
            $(".local-items div.well:eq("+ index +")").removeClass("is-married locked");
        },

        marryAllTracks : function(maxIndex) {
            for(var index=0; index<maxIndex; index++) {
                this.marryTrack(index);
            }
        },

        unmarryAllTracks : function(maxIndex) {
            for(var index=0; index<maxIndex; index++) {
                this.unmarryTrack(index);
            }
        },

        marryTrackClickListener : function(e) {
            e.preventDefault();
            var index = $(e.currentTarget).attr("data-index");
            if($("#ext-item-" + index).hasClass("is-married")) {
                this.unmarryTrack(index);
                return;
            }
            this.marryTrack(index);
        },

        marryAllTracksClickListener : function(e) {
            e.preventDefault();
            // count married items
            var $countMarried = $(".local-items .is-married").length;

            // count total of shorter list for comparison
            var longerLength = ($(".local-items .well").length > $(".external-items .well").length)
                ? $(".external-items .well").length
                : $(".local-items .well").length;
            
            // in case we have more married than unmarried -> unmarry all and vice versa
            //var $action = "unmarryAllTracks";
            if(longerLength - $countMarried > $countMarried) {
                this.marryAllTracks(longerLength);
                return;
            }
            this.unmarryAllTracks(longerLength);
        },

        /**
         * album properties
         */
        marryProperty : function($triggerElement) {
            if($triggerElement.attr("id") === "marryAllGenres" ) {
                return this.marryAllGenres();
            }
            $( $triggerElement.attr("data-target"), this.$el).val($( $triggerElement.attr("data-source"), this.$el).text());
            $triggerElement.addClass("use-property");
        },

        unmarryProperty : function($triggerElement) {
            if($triggerElement.attr("id") === "marryAllGenres" ) {
                return this.unmarryAllGenres();
            }
            var $targetElement = $( $triggerElement.attr("data-target"), this.$el);
            $targetElement.val($targetElement.attr("data-initvalue"));
            $triggerElement.removeClass("use-property");
        },

        marryAllProperties : function($allTriggers) {
            var that = this;
            $allTriggers.each(function(){
                that.marryProperty($(this));
            });
        },

        unmarryAllProperties : function($allTriggers) {
            var that = this;
            $allTriggers.each(function(){
                that.unmarryProperty($(this));
            });
        },

        marryPropertyClickListener : function(e) {
            e.preventDefault();
            var $triggerElement = $(e.currentTarget);
            if($triggerElement.hasClass("use-property")) {
                if($triggerElement.attr("id") === "marryAllGenres" ) {
                    return this.unmarryAllGenres();
                }
                this.unmarryProperty($triggerElement);
                return;
            }
            if($triggerElement.attr("id") === "marryAllGenres" ) {
                return this.marryAllGenres();
            }
            this.marryProperty($triggerElement);
        },

        marryAllPropertiesClickListener : function(e) {
            e.preventDefault();
            // count total and married properties
            var $allTriggers = $(".marry-property");
            var $countMarried = $(".marry-property.use-property").length;

            // in case we have more married than unmarried -> unmarry all and vice versa
            if($countMarried >= $allTriggers.length) {
                this.unmarryAllProperties($allTriggers);
                return;
            }
            this.marryAllProperties($allTriggers);
        },

        /**
         * genre stuff
         */
        marryGenre : function($triggerElement) {
            $triggerElement.addClass("use-genre");
            this.updateMarriedGenres();
        },

        unmarryGenre : function($triggerElement) {
            $triggerElement.removeClass("use-genre");
            this.updateMarriedGenres();
        },

        marryAllGenres : function($allTriggers) {
            $(".marry-genre", this.$el).addClass("use-genre");
            this.updateMarriedGenres();
        },

        unmarryAllGenres : function($allTriggers) {
            $(".marry-genre", this.$el).removeClass("use-genre");
            this.updateMarriedGenres();
        },

        marryGenreClickListener : function(e) {
            e.preventDefault();
            var $triggerElement = $(e.currentTarget);
            if($triggerElement.hasClass("use-genre")) {
                this.unmarryGenre($triggerElement);
                return;
            }
            this.marryGenre($triggerElement);
        },

        updateMarriedGenres : function() {
            var genres = new Array();
            var $target = $("#targetGenre");
            var $marryAll = $("#marryAllGenres");
            var that = this;
            $(".marry-genre.use-genre").each(function() {
                genres.push( $( $(this).attr("data-source"), that.$el).text() );
            });
            if(genres.length > 0) {
                $target.val(genres.join(", "));
                $marryAll.addClass("use-property");
                return;
            }
            $target.val($target.attr("data-initvalue"));
            $marryAll.removeClass("use-property");
        },

        // TODO: move to separate file "formSnaphot.js" begin
        formSnapshot : function(selectorx) {
            var $form = $(selectorx, this.$el);
            if(!$form.length) {
                return;
            }
            // store all initial form values in variable
            this.initialFormValues = this.convertSerializedArrayToHash($form.serializeArray());
        },

        hashDiff : function (startItems, currentItems) {
            var finalItems = {};
            for (var itemKey in currentItems) {
                if (startItems[itemKey] === currentItems[itemKey]) {
                    continue;
                }
                finalItems[itemKey] = currentItems[itemKey];
            }
            return finalItems;
        },

        convertSerializedArrayToHash : function (itemsArray) {
            var returnItems = {};
            for (var index = 0; index<itemsArray.length; index++) {
                returnItems[itemsArray[index].name] = itemsArray[index].value;
            }
            return returnItems;
        },
        // TODO: move to separate file "formSnaphot.js" end

        // TODO: move to separate file "stringCompareTool.js" begin
        // thanks to http://stackoverflow.com/questions/10473745/compare-strings-javascript-return-of-likely#answer-36566052
        similarity : function (string1, string2) {
            var longer = string1;
            var shorter = string2;
            if (string1.length < string2.length) {
                longer = string2;
                shorter = string1;
            }
            var longerLength = longer.length;
            if (longerLength === 0) {
                return 1.0;
            }
            return (longerLength - this.editDistance(longer, shorter)) / parseFloat(longerLength);
        },

        editDistance : function (string1, string2) {
            string1 = string1.toLowerCase();
            string2 = string2.toLowerCase();
            var costs = new Array();
            for (var idx = 0; idx <= string1.length; idx++) {
                var lastValue = idx;
                for (var iidx = 0; iidx <= string2.length; iidx++) {
                    if (idx === 0) {
                        costs[iidx] = iidx;
                        continue;
                    }
                    if (iidx > 0) {
                        var newValue = costs[iidx - 1];
                        if (string1.charAt(idx - 1) !== string2.charAt(iidx - 1)) {
                            newValue = Math.min(Math.min(newValue, lastValue), costs[iidx]) + 1;
                        }
                        costs[iidx - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
                if (idx > 0) {
                    costs[string2.length] = lastValue;
                }
            }
            return costs[string2.length];
        },

        // TODO: move to separate file "stringCompareTool.js" end
        highlightPhrases : function() {
            this.highlightSide("external", "local");
            this.highlightSide("local", "external");
            this.highlightDuration("external", "local");
        },

        spanIt : function(input, className) {
            var darkList = ["ft", "feat", "and", "mp3", "flac", "mp4", "m4a", "ogg"];
            if(darkList.indexOf(input.toLowerCase()) > -1) {
                className = "dark";
            }
            return "<span class=\""+ className +"\">" + input + "</span>";
        },

        highlightSide : function(side1, side2) {
            var that = this;
            $("."+ side1 +"-items .well", that.$el).each(function(idx, item){
                var $currentPartner = $("."+ side2 +"-items div.well:eq("+ idx +")", that.$el);
                var $itemChunks = that.extractChunks($(item).find(".highlight").text());
                var $partnerChunks = that.extractChunks($currentPartner.find(".highlight").text());
                var $itemMarkup = "";
                var $partnerMarkup = "";
                var $chunkHighScore = 0;
                var $chunkScore = 0;

                //console.log($itemChunks);
                for (var idx2 = 0; idx2 < $itemChunks.length; idx2++) {
                    if(that.alNumRegEx.test($itemChunks[idx2])) {
                        $itemMarkup = $itemMarkup.concat(that.spanIt($itemChunks[idx2], "dark"));
                        continue;
                    }
                    $chunkHighScore = 0;
                    for (var idx3 = 0; idx3 < $partnerChunks.length; idx3++) {
                        if(that.alNumRegEx.test($partnerChunks[idx3])) {
                            continue;
                        }
                        $chunkScore = that.similarity($itemChunks[idx2], $partnerChunks[idx3]);
                        $chunkHighScore = ($chunkHighScore > $chunkScore) ? $chunkHighScore : $chunkScore;

                        // remove leading zeroes to green "05" and "5"
                        $chunkScore = that.similarity($itemChunks[idx2].replace(/^0+/, ""), $partnerChunks[idx3].replace(/^0+/, ""));
                        $chunkHighScore = ($chunkHighScore > $chunkScore) ? $chunkHighScore : $chunkScore;
                    }
                    if($chunkHighScore > 0.9) {
                        $itemMarkup = $itemMarkup.concat(that.spanIt($itemChunks[idx2], "ul-green"));
                        continue;
                    }
                    if($chunkHighScore >= 0.5) {
                        $itemMarkup = $itemMarkup.concat(that.spanIt($itemChunks[idx2], "ul-orange"));
                        continue;
                    }
                    $itemMarkup = $itemMarkup.concat(that.spanIt($itemChunks[idx2], "ul-red"));
                }
                //console.log("itemMarkup", $itemMarkup);
                $(item).find(".highlight").html($itemMarkup);
                $itemMarkup = "";
            });
        },

        highlightDuration : function(side1, side2) {
            var that = this;
            $("."+ side1 +"-items .well", that.$el).each(function(idx, item){
                var $extDuration = $(item).find(".duration").attr("data-miliseconds");
                if($extDuration === "" || typeof $extDuration === "undefined") {
                    // no duration provided by external data-source
                    return;
                }
                var $localPartner = $("."+ side2 +"-items div.well:eq("+ idx +")", that.$el);
                var $localDuration = $localPartner.find(".duration").attr("data-miliseconds");
                var $difference =  Math.abs($extDuration - $localDuration);
                var $itemMarkup = "";
                var $cssClass = "";
                switch(true) {
                    case ($difference < 2000): $cssClass = "ul-green"; break;
                    case ($difference < 4000): $cssClass = "ul-orange"; break;
                    default: $cssClass = "ul-red"; break;
                }

                // duration markup for external side
                $itemMarkup = that.spanIt("[", "dark")
                    + that.spanIt(window.sliMpd.currentPlayer.formatTime($extDuration/1000), $cssClass)
                    + that.spanIt("]", "dark");
                $(item).find(".duration").html($itemMarkup);

                // duration markup for local side
                $itemMarkup = that.spanIt("[", "dark")
                    + that.spanIt(window.sliMpd.currentPlayer.formatTime($localDuration/1000), $cssClass)
                    + that.spanIt("]", "dark");
                $localPartner.find(".duration").html($itemMarkup);
            });
        },
        /**
         * converts a string to an array with groups of alphanumeric and non-alphanumeric phrases
         *
         * @param string inputString
         * @return array string-chunks
         */
        extractChunks : function(inputString) {
            var returnArray = new Array();
            var chunk = "";
            var isAlNum = this.alNumRegEx.test(inputString[0]);
            for (var idx = 0, len = inputString.length; idx < len; idx++) {
                if(this.alNumRegEx.test(inputString[idx]) === isAlNum) {
                    chunk = chunk.concat(inputString[idx]);
                    returnArray = this.mayPushChunkHelper(idx, len, chunk, returnArray);
                    continue;
                }
                returnArray.push(chunk);
                chunk = inputString[idx];
                isAlNum = this.alNumRegEx.test(inputString[idx]);
                returnArray = this.mayPushChunkHelper(idx, len, chunk, returnArray);
            }
            return returnArray;
        },

        mayPushChunkHelper : function(idx, len, chunk, returnArray) {
            if(idx === (len -1)) {
                returnArray.push(chunk);
            }
            return returnArray;
        }
    });
}());
