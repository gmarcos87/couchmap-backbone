var Backbone = require('backbone');
var _ = require('underscore');
var common = require('couchmap-common');

/* CouchMapModel

   options:
    * threshold: optional (500), if less than this number of nodes are
                 in the given bounding box, then the fine model is used,
                 otherwise the coarse.
    * coarseColl: optional (CouchCoarseColl), the collection used for the
                  coarse representation.
    * coarse_url: mandatory, the URL for coarse requests.
    * fineColl: optional (FineColl), the collection used for the fine
                representation
    * fine_url: mandatory, the URL for fine (spatial) requests.
*/
module.exports = Backbone.Model.extend({
  initialize: function(options) {
    options = options || {};
    this.threshold = options.threshold || -1;
    this.coarse_url = options.coarse_url;
    this.fine_url = options.fine_url;
    this.bbox = undefined;
    this.pending = 0;
    var CoarseColl = options.coarseColl ||
                        require('../collections/couchCoarse');
    this.coarse_coll = new CoarseColl(null, {url: options.coarse_url});
    this.fine_coll = null; // TODO
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
      console.log('Warning in CouchMap.update(): no bbbox given');
      return;
    }
    this.bbox = bbox;

    // TODO: cancel requests + stop watch
    this.pending_inc();
    this.abort();
    this.coarse_coll.abort();
    // peek into spatial index and check if count is less than threshold
    this.request = $.getJSON(this.fine_url, {bbox: bbox.toString(), count: true})
      .done(function(data) {
        this.pending_inc();
        var req;
        if (data.count <= this.threshold) {
          // this.fine_coll.fetch();
        } else {
          req = this.coarse_coll.fetch(bbox, zoom);
        }
        req.always(this.pending_dec.bind(this));
      }.bind(this))
      .fail(function(jqxhr, msg) {
        console.log('Warning in CouchMap.update(): '+msg);
      })
      .always(this.pending_dec.bind(this));
  },
  abort: function() {
    if (this.request) {
      this.request.abort();
      this.request = undefined;
    }
  }

});
