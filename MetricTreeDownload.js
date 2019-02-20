#!/usr/bin/env /usr/local/bin/node
#tobydavies draft
btoa = function (str) {return new Buffer(str).toString('base64');};
var util = require('util');
var sum=0
 
// Config
 
var auth =  "Basic "+btoa("admin@customer1:welcome")
var options = {
  host: 'localhost',
  port: '8090',
  path: '/controller/auth?action=login',
  method: 'GET',
  headers: { 'Authorization': auth }
};
var https = false
if (https)
    var http = require('https');
else
    var http = require('http');
http.globalAgent.maxSockets = 5


//var metricpath="Errors|ConfigExporter|*|Number of Errors"
//var matchstring='HTTP'
//var targetMetric='HTTPErrorSum'
 
//set to 0 to only output the machine agent metric
var debug=0

const fs = require('fs');
 
 
 
// functino to call teh controller and pass the X-CSRF-TOKEN if available
function callcontroller(callback, data){
  if(debug>=2)console.dir(options)
  //if (data !== undefined) console.dir(data)
  var req = http.request(options, function(response) {
    if(debug>=2)console.log("http");
    var str = '';
 
    //another chunk of data has been recieved, so append it to `str`
    response.on('data', function (chunk) {
      str += chunk;
    });
 
    //the whole response has been recieved, so we just print it out here
    response.on('end', function () {
      if(debug>=2)console.dir(response.headers['set-cookie'])
      if ( response.headers['set-cookie'] !== undefined ) {
        options.headers['cookie']=(response.headers['set-cookie'])[0].split(';')[0]
        if ( (response.headers['set-cookie'])[1] !== undefined )
          options.headers['X-CSRF-TOKEN']=(response.headers['set-cookie'])[1].split(';')[0].split('=')[1]
 
      }
	  if(debug>=2)console.log('calling callback');
	  if(debug>=3)console.log(str);
      callback(str)
    });
 
    if(debug>=2)console.log("end");
    // response is here
  });
  if (data !== undefined) {
    req.write(data)
    if(debug>=2)console.log(data)
  }
  req.end();
}
 
function logon(callback){
  if(debug>=2)console.log('in logon')
  options.path = '/controller/auth?action=login'
  callcontroller(callback)
}
 
function getmetrics(callback, app){
  if(debug>=2)console.log('in getmetrics: ' + app)
  options.path = '/controller/rest/applications/'+app+'/metrics?output=JSON'
  options.headers['Content-Type'] = "application/json;charset=UTF-8"
  options.headers['Accept'] = "application/json, text/plain, */*"
  callcontroller(callback)
}

function postmetrics(callback, data, app){
  //options.path = '/controller/rest/applications/'+app+'/metrics?output=JSON'
  options.path = '/controller/restui/metricBrowser/metricTreeRoots/'+app
  options.headers['Content-Type'] = "application/json;charset=UTF-8"
  options.method = 'POST'
//contentType: "application/json",
                //dataType: 'json'
  //console.log(data)
  options.headers['Accept'] = "application/json, text/plain, */*"
  callcontroller(callback, data)
}

function go(){
    var app = '8'
    if(debug)console.log('in go')
    getmetrics (function (o) {
	    if(debug)console.log('getmetrics return')
		function processNode(node, patharray, app) {
		    if(debug) console.log(node, patharray, app, '%%%%%%')
		    if (node === undefined) return;
			//console.log("type of the Response " + typeof(node))
			var nod
			if (typeof(node) != 'object') 
			   var nod = JSON.parse(node)
			if (typeof(nod) == 'object')
			   node = nod
			if (node.length == 0) return;
			if(debug) console.log(node + "########")
			if(!!node.name && !node.hasChildren){
				var path = patharray.join("|")+"|"+node.name
					console.log(path)
			}
			if (node.hasChildren && !node.childcount)
			{
				patharray.push(node.name);
				if(debug)console.log(patharray);
				postmetrics(function(data) {
				        //console.log(data)
                        data = JSON.parse(data);

				        //console.log(data)
						for (i in data) {
							 data[i].parent = node;
						};
						node.children = data;
						node.childcount=1;
						//if(debug >=3 )
						//console.log("callback", node, typeof(node), node.children, typeof(node.children));
						if(data.length==0)
						{
							patharray.pop();
							processNode(node, patharray, app)
						}
						else
							processNode(node.children[0], patharray, app)
					}
				,JSON.stringify(patharray), app)
			}
			else if (node.parent != -1 && node.parent.childcount < node.parent.children.length)
			{
				if(debug)console.log("sibling");
				nextnode = node.parent.children[node.parent.childcount];
				node.parent.childcount++;
				processNode(nextnode, patharray, app);
			}
			else if (node.parent != -1)
			{
				 if(debug)console.log("parent");
				patharray.pop();
				nextnode = node.parent ;
				processNode(nextnode, patharray, app);
			}
			//else { console.log(node); }
		}


		var root= new Object();
		var o =  JSON.parse(o)
		root.childcount = 0;
		for (i in o) {
			 o[i].hasChildren = true;
			 o[i].parent = root;
			 root.childcount++
		};
		root.hasChildren = true;
		root.parent = -1;
		root.children = o;
		root.childcount = 1;
		if(debug)console.log(root,o);
		if(debug)console.log('App: '+ app);
		//for (n in root)
		//console.log()
		processNode(root.children[0], [], app);
    }, app)
}

//console.log('logon')
logon( go )
