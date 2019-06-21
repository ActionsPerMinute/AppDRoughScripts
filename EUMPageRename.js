#!/usr/bin/env /usr/local/bin/node 

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

btoa = function (str) {return new Buffer(str).toString('base64');};


var request = require('request');
var http = require('follow-redirects').https;
var auth =  "Basic "+btoa("username@account:pass")
var options = {
  host: 'host',
  port: 443,
  path: '/controller/auth?action=login',
  method: 'GET',
  headers: { 'Authorization': auth }
};
var appid = 740653 

var util = require('util');
http.globalAgent.maxSockets = 5
var sum=0
 
//set to 0 to only output the machine agent metric
var debug=3
 
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
	  if (options.path == '/controller/auth?action=login'){
		  if ( response.headers['set-cookie'] !== undefined ) {
			options.headers['cookie']=(response.headers['set-cookie'])[0].split(';')[0]
			if ( (response.headers['set-cookie'])[1] !== undefined )
			  options.headers['X-CSRF-TOKEN']=(response.headers['set-cookie'])[1].split(';')[0].split('=')[1]
	 
		  }
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
function getpagelist(callback){
  options.path = '/controller/restui/web/pagelist'
  options.headers['Content-Type'] = "application/json;charset=UTF-8"
  options.headers['Accept'] = "application/json, text/plain, */*"
  options.method = 'POST'
  var now =  (new Date).getTime();
  console.log( now )
  var week = now - (1000 * 60 * 60 * 24 * 7)
  var data  = '{"requestFilter":{"applicationId":'+appid+',"fetchSyntheticData":false},"resultColumns":["PAGE_TYPE","PAGE_NAME","TOTAL_REQUESTS","END_USER_RESPONSE_TIME"],    "offset":0,"limit":-1,"searchFilters":[],      "columnSorts":[{"column":"TOTAL_REQUESTS","direction":"DESC"}],"timeRangeStart":'+week+',"timeRangeEnd":'+ now + '}'
  options.headers['Content-Length']=data.length
  callcontroller(callback, data)
}


function renameBt(btid,newname,callback){
  options.path = '/controller/restui/pageList/renameRequest/'+btid+'/'+appid
  options.headers['Content-Type'] = "application/json;charset=UTF-8"
  options.headers['Accept'] = "application/json, text/plain, */*"
  options.method = 'POST'
  options.headers['Content-Length']=newname.length
  callcontroller(callback,newname)

}

var renames = [
{"rename":"newname","internalname":"addname"}
]

logon(() => {
    getpagelist((str)=>{
	    //if(debug>1)console.log(str)
		var pages = (JSON.parse(str)).data
		for (p in pages){
		    for (r in renames) {
			  if( pages[p].internalName == renames[r].internalname ){
			    console.log(pages[p].addId + " " + pages[p].name + " " + pages[p].internalName + " " + renames[r].rename);
				(function(addId, internalName){
					renameBt(addId,internalName,(str) => {
						console.log(str);
					})
				})(pages[p].addId,renames[r].rename)
				break;
			  }
			}
		}
	})
})
