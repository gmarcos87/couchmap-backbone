var Backbone = require('backbone');
var _ = require('underscore');
var $ = require('jquery');

var FineModel = Backbone.Model.extend({
  idAttribute: '_id'
});

// fetches models based on bounding boxes and keeps them up-to-date
// (realized with spatial index via GeoCouch and CouchDB's changes feed)
module.exports = Backbone.Collection.extend({
  model: FineModel,
  // initialize respects the following keys in options:
  // * bbox (mandatory): a valid common.bbox (see libremap-common)
  // The following options can also be set by setting them as properties in
  // collections that inherit from this one:
  // * url: url of the GeoCouch spatial index
  // * changes_url: url of the CouchDB changes feed
  // * changes_filter: name of the CouchDB filter function that filters documents
  //                  that lie in a given bounding box or whose id is contained
  //                  in a given array of document ids.
  initialize: function (models, options) {
    options = options || {};
    _.extend(this, _.pick(options, 'url', 'changes_url', 'changes_filter'));
    Backbone.Collection.prototype.initialize.apply(this, arguments);
    this.on('sync', function() {
      this.watch_abort();
      this.watch();
    });
  },
  // fetches all models in the bounding box from couchdb
  // (uses the spatial view)
  fetch: function (bbox, options) {
    this.bbox = bbox;
    options = _.extend(options || {}, {
      remove: false,
      // ajax options
      data: {
        bbox: this.bbox.toGeocouch().toString()
      }
    });
    return Backbone.Collection.prototype.fetch.call(this, options);
  },
  // parse output of couchdb's spatial view
  parse: function (response, options) {
    this.update_seq = response.update_seq;
    return _.map(response.rows, function(row) {
      return row.value;
    });
  },
  // sets up live changes from couchdb's _changes feed.
  // sends a bounding box and a list of ids whose nodes are outside the
  // bounding box to the filter function
  watch: function () {
    (function poll() {
      this.watch_abort();
      // gather all ids of documents that are inside the collection but outside
      // the current bounding box
      var ids_outside = _.map(
        this.filter(function(model) {
          var lat = model.get('lat');
          var lon = model.get('lon');
          return !this.bbox.contains(lat, lon);
        }.bind(this)),
        function(model) {
          return model.id;
        });
      // create a new request to the changes feed
      this.changes_request = $.ajax({
        url: this.changes_url + '?' + $.param({
          filter: this.changes_filter,
          limit: 100,
          feed: 'longpoll',
          include_docs: 'true',
          since: this.update_seq || 0
        }),
        // use POST because GET potentially has a low maximal length of the
        // query string
        type: "post",
        data: JSON.stringify({
          "ids": ids_outside,
          "bbox": this.bbox.toGeocouch()
        }),
        dataType: "json",
        contentType: "application/json",
        timeout: 65000,
      })
        .done(function(data) {
          // update update_seq, merge the changes and set up a new changes
          // request
          this.update_seq = data.last_seq;
          var docs = _.map(data.results, function(row) {
            return row.doc;
          });
          this.set(docs, {remove: false});
          this.trigger('changes', this, docs);
          setTimeout(poll.bind(this), 500);
        }.bind(this))
        .fail(function(jqxhr, msg_status, msg_err) {
          this.changes_request = null;
          // if not aborted via watch_abort: retry after 10s
          // otherwise: do nothing :)
          if (msg_status=='abort') {
            console.log('Info (watch): aborted.');
          } else if (msg_status=='timeout') {
            setTimeout(poll.bind(this), 500);
          } else {
            console.log('Warning (watch): failed ('+msg_status+')');
            console.log('Warning (watch): retrying in 10s...');
            setTimeout(poll.bind(this), 10000);
          }
        }.bind(this));
    }).bind(this)();
  },
  // abort watch
  watch_abort: function() {
    if (this.changes_request) {
      this.changes_request.abort();
    }
  },
  abort: function() {
    this.watch_abort();
  }
});
