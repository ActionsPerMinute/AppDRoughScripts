#!/usr/bin/env /usr/local/bin/node 
btoa = function (str) {return new Buffer(str).toString('base64');};
var http = require('https');
var util = require('util');
http.globalAgent.maxSockets = 5
var sum=0
 
 
// Config
 
var auth =  "Basic "+btoa("user@account:pass")
var options = {
  host: 'host',
  port: '443',
  path: '/controller/auth?action=login',
  method: 'GET',
  headers: { 'Authorization': auth }
};
 
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
    req.write(data)
    if(debug>=2)console.log(data)
  }
  req.end();
}
 
function logon(callback){
  options.path = '/controller/auth?action=login'
  callcontroller(callback)
}
 
function getdashboards(id, callback){
  options.path = '/controller/CustomDashboardImportExportServlet?dashboardId='+id
  options.headers['Content-Type'] = "application/json;charset=UTF-8"
  options.headers['Accept'] = "application/json, text/plain, */*"
  callcontroller(callback)
}
 
 
if(debug>=1)console.log("start");


var dblist = [ {
  "id" : 2593,
  "version" : 0,
  "name" : "Dashboardname"
}]

var NewApp="New application name";

function modifyForDebenhams(str){
  var dash = JSON.parse(str);
  dash.name = "dashboardprefix "+dash.name;
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
		  if ( RecursiveExpressionFind(ds.metricMatchCriteriaTemplate.metricExpressionTemplate) ) ds.metricMatchCriteriaTemplate.applicationName = NewApp
		}
	}
  }
  return JSON.stringify(dash, null, 2);
}

function RecursiveExpressionFind(obj)
{
  var modified = false;
  if (obj.metricPath !== undefined) modified |= checkAndModifyApplication(obj) 
  if (obj.expression1 !== undefined) modified |= RecursiveExpressionFind(obj.expression1)
  if (obj.expression2 !== undefined) modified |= RecursiveExpressionFind(obj.expression2)
  return modified;
}

function checkAndModifyApplication(obj){
	if (obj.metricPath.indexOf("End User Experience") >=0 ){
		obj.scopeEntity.applicationName=NewApp;
		obj.scopeEntity.entityName=NewApp;
		console.log(obj.metricPath)
		return true;
	} else return false
}

logon(() => {
  for ( db in dblist ) {
    var fname = dblist[db].name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    console.log(fname);
    (function(infname){
      getdashboards(dblist[db].id, (str) => {
	    //modifyForDebenhams(str)
		fs.writeFile(infname+".json", JSON.stringify(JSON.parse(str), null, 2), function(err) {
		  if(err) {
			return console.log(err);
		  }
		  console.log("The file was saved!");
		}); 
		fs.writeFile(infname+".mod.json", modifyForDebenhams(str), function(err) {
		  if(err) {
			return console.log(err);
		  }
		  console.log("The file was saved!");
		}); 
	  })
	})(fname);
  }
})
