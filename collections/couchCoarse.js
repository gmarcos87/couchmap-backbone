var Backbone = require('backbone');
var _ = require('underscore');

var CouchCoarseModel = Backbone.Model.extend({
});

/* CouchCoarseColl
   options:
    * url: mandatory, URL of the coarse URL
*/
module.exports = Backbone.Collection.extend({
  model: CouchCoarseModel,
  initialize: function(models, options) {
    this.url = options.url;
    this.request = undefined;

    // TODO: remove
    /*
    this.on('sync', function() {
      var tiles = this.bbox.toTiles(this.zoom);
      var ids = _.map(tiles, function(k) { return k.toString(); });
      console.log(_.compact(_.map(ids, function(id) { return this.get(id);}.bind(this))));
    });
    */
  },
  fetch: function(bbox, zoom, options) {
    // TODO: remove
    /*
    this.bbox = bbox;
    this.zoom = zoom;
    */

    var tiles = bbox.toTiles(zoom);
    options = _.extend(options || {}, {
      tiles: tiles,
      remove: false,
      reset: false,
      merge: true,
      // ajax options
      type: 'POST',
      dataType: 'json',
      contentType: 'application/json',
      data: JSON.stringify({keys: tiles}),
      url: this.url + '?group=true'
    });

    this.abort();
    this.request = Backbone.Collection.prototype.fetch.call(this, options);
    return this.request;
  },
  abort: function() {
    if (this.request) {
      this.request.abort();
      this.request = undefined;
    }
  },
  parse: function(data, options) {
    var req_ids = _.map(options.tiles, function(k) { return k.toString(); });
    var new_ids = _.map(data.rows, function(o) { return o.key.toString(); });
    return _.map(data.rows, function(o) {
      return _.extend(o.value, {
        id: o.key.toString(),
        zoom: o.key[0],
        x: o.key[1],
        y: o.key[2]
      });
    });
  }
});
