(function () {

  var req = function Juice$Request() {
    this.query_params = {}     
    this.post_params = {}
  }

  req.prototype = {
  };

  Juice.Request = req;

})();
