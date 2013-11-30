var Backbone = require('backbone');
var _ = require('underscore');
var common = require('couchmap-common');

/* ProxyModel

   options:
    * threshold: optional (500), if less than this number of nodes are
                 in the given bounding box, then the fine model is used,
                 otherwise the coarse.
    * coarseColl: optional (CoarseColl), the collection used for the
                  coarse representation.
    * coarse_url: mandatory, the URL for coarse requests.
    * fineColl: optional (FineColl), the collection used for the fine
                representation
    * fine_url: mandatory, the URL for fine (spatial) requests.
*/
var db_url = 'http://couchmap.d00d3.net/db/';
var ddoc_url = 'http://couchmap.d00d3.net/';
var defaults = {
  coarse_url: ddoc_url + '/../_view/coarse',
  fine_url: ddoc_url + '/../_spatial/by_location',
  changes_url: db_url + '/_changes',
  changes_filter: 'couchmap-api/by_id_or_bbox'
};

module.exports = Backbone.Model.extend({
  initialize: function(attributes, options) {
    this.options = options || {};
    _.extend(this, {
        CoarseColl: require('../collections/coarse'),
        CoarseCollOptions: {
          url: defaults.coarse_url,
          changes_url: defaults.changes_url,
          changes_filter: defaults.changes_filter
        },
        FineColl: require('../collections/fine'),
        FineCollOptions: {
          url: defaults.fine_url,
          changes_url: defaults.changes_url,
          changes_filter: defaults.changes_filter
        },
        threshold: 200,
      },
      _.pick(this.options,
        'CoarseColl', 'CoarseCollOptions',
        'FineColl', 'FineCollOptions',
        'threshold'
        ));
    this.bbox = undefined;
    this.pending = 0;
    // set up coarse collection
    this.set('coarse_coll', new this.CoarseColl(null, this.CoarseCollOptions));
    // set up fine collection
    this.set('fine_coll', new this.FineColl(null, this.FineCollOptions));
    this.listenTo(this.get('fine_coll'), 'changes', function(collection, docs) {
      var count = _.size(collection.filter(function (model) {
        return this.bbox.contains(model.get('lat'), model.get('lon'));
      }, this));
      if (count>this.threshold) {
        this.peek();
      }
    });
  },
  pending_inc: function() {
    this.pending += 1;
    if (this.pending==1) {
      this.trigger('busy');
    }
  },
  pending_dec: function() {
    this.pending -= 1;
    if (this.pending===0) {
      this.trigger('idle');
    }
  },
  update: function(bbox, zoom) {
    if (!bbox) {
      console.log('Warning in CouchMap.update(): no bbox given');
      return;
    }
    this.bbox = bbox;
    this.zoom = zoom;

    this.peek();
  },
  peek: function() {
    var bbox = this.bbox;
    var zoom = this.zoom;

    this.pending_inc();
    this.abort();
    this.get('coarse_coll').abort();
    // peek into spatial index and check if count is less than threshold
    this.request = $.getJSON(this.FineCollOptions.url, {
      bbox: bbox.toGeocouch().toString(),
      count: true
    })
      .done(function(data) {
        this.pending_inc();
        var req;
        if (data.count <= this.threshold) {
          req = this.get('fine_coll').fetch(bbox).done(function() {
            this.trigger('fine');
          }.bind(this));
        } else {
          req = this.get('coarse_coll').fetch(bbox, zoom).done(function() {
            this.trigger('coarse');
          }.bind(this));
        }
        req.always(this.pending_dec.bind(this));
      }.bind(this))
      .fail(function(jqxhr, msg_status) {
        if (msg_status=='abort') {
          console.log('Info (peek): aborted.');
        } else {
          console.log('Warning (peek): failed ('+msg_status+')');
        }
      })
      .always(this.pending_dec.bind(this));
  },
  abort: function() {
    if (this.request) {
      this.request.abort();
      this.request = undefined;
    }
    this.get('coarse_coll').abort();
    this.get('fine_coll').abort();
  }

});
