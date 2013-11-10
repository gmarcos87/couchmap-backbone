var Backbone = require('backbone');
var _ = require('underscore');

var CouchCoarseModel = Backbone.Model.extend({
});

/* CouchCoarseColl
   options:
    * url: mandatory, URL of the coarse URL
*/
module.exports = Backbone.Collection.extend({
  initialize: function(models, options) {
    this.url = options.url;
    this.request = undefined;
  },
  update: function(bbox, zoom) {
    this.abort();
    var tiles = bbox.toTiles(zoom);
    this.request = $.ajax({
      type: 'POST',
      dataType: 'json',
      contentType: 'application/json',
      data: JSON.stringify({keys: tiles}),
      url: this.url + '?group=true'
    })
    .done(function(data) {
      var ids = _.map(tiles, function(k) { return k.toString(); });
      this.remove(ids);
      this.set(_.map(data.rows, function(o) {
        return new CouchCoarseModel(_.extend(o.value, {id: o.key.toString()}));
      }), {remove: false});
      //console.log(_.compact(_.map(ids, function(id) { return this.get(id);}.bind(this))));
    }.bind(this));
    return this.request;
  },
  abort: function() {
    if (this.request) {
      this.request.abort();
      this.request = undefined;
    }
  }
});
