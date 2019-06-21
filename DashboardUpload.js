#!/usr/bin/env /usr/local/bin/node 
btoa = function (str) {return new Buffer(str).toString('base64');};
var http = require('https');
var auth =  "Basic "+btoa("username@account:pass")
var options = {
  host: 'host',
  port: '443',
  path: '/controller/auth?action=login',
  method: 'GET',
  headers: { 'Authorization': auth }
};
 


var util = require('util');
http.globalAgent.maxSockets = 5
var sum=0
 
var FormData = require('form-data'); 
 
//set to 0 to only output the machine agent metric
var debug=1
 
const fs = require('fs');
 
 
 
// functino to call teh controller and pass the X-CSRF-TOKEN if available
function callcontroller(callback, data){
  if(debug>=2)console.dir(options)
  if (data !== undefined) console.dir(data)
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
      callback(str)
    });
 
    if(debug>=2)console.log("end");
    // response is here
  });
  if (data !== undefined) {
    if (typeof data === "string")
	{
      req.write(data)
	  req.end()
	}
	else data.pipe(req);
    if(debug>=2)console.log(data)
  } else {
    req.end();
  }
}
 
function logon(callback){
  options.path = '/controller/auth?action=login'
  callcontroller(callback)
}
 

function setdashboards(data, callback){
var form = new FormData();
form.append('fileUpload', fs.createReadStream(data));
  options.headers = form.getHeaders()
  options.headers['Authorization'] = auth
  options.path = '/controller/CustomDashboardImportExportServlet'
  options.method = 'POST'
  callcontroller(callback, form)
}


 


var dblist = [ {
  "id" : 2593,
  "version" : 0,
  "name" : "Dashboard name" 
} ]

var NewApp="new app";

function modifyForDebenhams(str){
  var dash = JSON.parse(str);
  dash.name = "prefix "+dash.name;
  for (w in dash.widgetTemplates){
  	if (dash.widgetTemplates[w].widgetType == "HealthListWidget"){
	  if (dash.widgetTemplates[w].entityReferences[0].entityName.indexOf("UX") >= 0 )
	  {
	    dash.widgetTemplates[w].entityReferences[0].applicationName=NewApp;
	    dash.widgetTemplates[w].applicationReference.applicationName=NewApp;
	    dash.widgetTemplates[w].applicationReference.entityName=NewApp;
	  	console.log(dash.widgetTemplates[w].entityReferences[0].entityName);
	  }
	}
	if (dash.widgetTemplates[w].dataSeriesTemplates !== undefined)
	{
		for (d in dash.widgetTemplates[w].dataSeriesTemplates ) {
		  var ds = dash.widgetTemplates[w].dataSeriesTemplates[d]
		  RecursiveExpressionFind(ds.metricMatchCriteriaTemplate.metricExpressionTemplate)
		}
	}
  }
  return JSON.stringify(dash, null, 2);
}

function RecursiveExpressionFind(obj)
{
  if (obj.metricPath !== undefined) checkAndModifyApplication(obj)
  if (obj.expression1 !== undefined) RecursiveExpressionFind(obj.expression1)
  if (obj.expression2 !== undefined) RecursiveExpressionFind(obj.expression2)
}

function checkAndModifyApplication(obj){
	if (obj.metricPath.indexOf("End User Experience") >=0 ){
		obj.scopeEntity.applicationName=NewApp;
		obj.scopeEntity.entityName=NewApp;
		console.log(obj.metricPath)
	}
}

if(debug>=1)console.log("start");
logon(() => {
  //var text = fs.readFileSync('deb_business_ops___performance___v2_2.mod.json','utf8')
  //console.log (text)
  for (db in dblist) {
    var fname = dblist[db].name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".mod.json";
	if (fs.existsSync("./"+fname)){
	  (function(infname){
        setdashboards(infname, (str) => { 
          console.log(str);
        })
	  })(fname); 
	}
	break
  }
})
