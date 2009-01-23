(function() {

  app = function Juice$Application() {
    this.urlpatterns = [];
  };

  app.prototype = {
    dispatch: function Juice$Application$dispatch(req, res) {
      // Fix up the url and the base to deal with fcgi base not being app base
      var full_url = req.base + req.path;

      var [reg_point] = this.registration_point.exec(full_url);
      req.base = reg_point;
      req.path = full_url.substr(reg_point.length);
      var url = req.path;

      if (url.length == 0)
        url = "/";

      for each (let val in this.urlpatterns) {
        if (!(val instanceof Array)) {
          warn("Non array entry found in " + this.name + ".urlpatterns: " + val.toSource());
          continue;
        }
        let [pat, cb] = val;
        warn("Checking", url, "against", pat);
        if (typeof pat == 'string') {
          if (url == pat) {
            cb(req, res);
            return true;
          }
        } else {
          // If its not a string it better be callable as a function
          var matches = pat(url, req);

          if (matches) {
            //matches.unshift();
            cb(req, res, matches);
            return true;
          }
        }
      }
      return false;

    }
  };

  Juice.Application = app;
})();
