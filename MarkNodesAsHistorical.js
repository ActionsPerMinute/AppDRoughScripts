#!/usr/bin/env /usr/local/bin/node
//tobydavies draft
btoa = function (str) {return new Buffer(str).toString('base64');};
var util = require('util');
var sum=0
 
// Config
 
var auth =  "Basic "+btoa("username@account:pass")
var options = {
  host: '<domain>',
  port: '443',
  path: '/controller/auth?action=login',
  method: 'GET',
  headers: { 'Authorization': auth }
};
var https = true
if (https)
    var http = require('https');
else
    var http = require('http');
http.globalAgent.maxSockets = 5


//set to 0 to only output the machine agent metric
var debug=2
const fs = require('fs');
 
// functino to call teh controller and pass the X-CSRF-TOKEN if available
function callcontroller(data){
  if(debug>=2)console.dir(options)
  return new Promise((resolve, reject) => {
	  var req = http.request(options, function(response) {
		if(debug>=2)console.log("http");
		var str = '';
	 
		//another chunk of data has been recieved, so append it to `str`
		response.on('data', function (chunk) {
		  str += chunk;
		});
	 
		//the whole response has been recieved, so we just print it out here
		response.on('end', function () {
		  if(debug>=4)console.dir(response.headers)
		  if(debug>=2)console.dir(response.headers['set-cookie'])
		  if ( response.headers['set-cookie'] !== undefined ) {
			options.headers['cookie']=(response.headers['set-cookie'])[0].split(';')[0]
			if ( (response.headers['set-cookie'])[1] !== undefined )
			  options.headers['X-CSRF-TOKEN']=(response.headers['set-cookie'])[1].split(';')[0].split('=')[1]
	 
		  }
		  if(debug>=2)console.log('calling callback');
		  if(debug>=3){console.log("response");console.log(str);}
		  return resolve(str)
		});
	 
		if(debug>=2)console.log("end");
	  });
	  if (data !== undefined) {
		if(debug>=2)console.log(data)
		req.write(data)
	  }
	  req.end();
  })
}

function getNodeInfo(appid)
{
	options.path='/controller/rest/applications/'+appid+'/nodes?output=json'
	return callcontroller()
}

function gethealth(data)
{
	options.path="/controller/restui/appInfra/healthStatsForNodes?time-range=last_5_minutes.BEFORE_NOW.-1.-1.5"
	options.method = 'POST'
	options.headers["Content-Type"] = "application/json;charset=UTF-8"
	return callcontroller(data)
}

function markAsHistoric(ids)
{
	options.path='/controller/rest/mark-nodes-historical?application-component-node-ids='+ids
	console.dir(options.path)
	options.method = 'GET'
	delete options.headers["Content-Type"]
	// don't actually mark as historic yet!
	//return callcontroller()
}

var applicationid= 56868

async function go() {
    await callcontroller()
	var n = JSON.parse(await getNodeInfo(applicationid))
	var nodes = []
 
    if(debug>=2)console.dir(n)
	for(var j=0; j<n.length; j++)
	{
		nodes[n[j].id]={
			Nodename: n[j].name,
			tierid: n[j].tierId, 
			appid: 56868, 
			agentType: n[j].agentType, 
			agentversion: n[j].appAgentVersion,
			machineName: n[j].machineName
		}
		if(debug>=2)console.log(nodes[n[j].id])
	}

	var postarr = [];
	for ( var key in nodes ) {
		nodes[key].AppPCAvail = 0;
		nodes[key].MachPCAvail = 0;
		postarr.push(key);
	}


    console.dir(postarr)
	var h = JSON.parse(await gethealth(JSON.stringify(postarr)))
    
    //console.log(JSON.stringify(postarr));
	
    if(debug>=2)console.dir(h)
    for (var i=0; i < h.length; i++)
    {
		var nodeid = h[i].appServerAgentAvailability.entityId
    	nodes[nodeid].AppPCAvail  = h[i].appServerAgentAvailability.percentage;  
    	nodes[nodeid].MachPCAvail = h[i].machineAgentAvailability.percentage; 
	}
    
	var ids = ""
	for ( var key in nodes ) {
		if (nodes[key].AppPCAvail <=0 )
		{
			ids += key + ','
		}
	}
	
	markAsHistoric(ids.substring(0, ids.length-1))

}

go()
