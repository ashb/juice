
function doneChore(env, task_id) {
  return [
    200,
    {contentType: 'text/html'},
    function() {
      yield "<b>Hi!</b>";
      yield "<pre>Script url args are " + env.PATH_INFO + "</pre>";
      yield "<pre>This script is rooted at " + env.SCRIPT_NAME + "</pre>";
      yield "<h2>Title \u2603</h2>";
    }
  ];

}

var juice = require('juice');

var app = new juice.Application;

app.actions = {
  "/done/(\\d+)": doneChore
};

juice.run(app);
