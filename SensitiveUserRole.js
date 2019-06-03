#!/usr/bin/env node
//tobydavies draft
btoa = function (str) {return new Buffer(str).toString('base64');};
var util = require('util');
 
// Config
 
var auth =  "Basic "+btoa("username@account:password")
var options = {
  host: 'domain',
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
//throttle if necessary
//http.globalAgent.maxSockets = 5

var debug=0
 
// function to call the controller and pass the X-CSRF-TOKEN if available
function callcontroller(data){
  return new Promise((resolve, reject) => {
	  var req = http.request(options, function(response) {
		var str = '';
	 
		// receive next chunk; append to str
		response.on('data', function (chunk) {
		  str += chunk;
		});
	 
		//all chunks recieved
		response.on('end', function () {
		  if ( response.headers['set-cookie'] !== undefined ) {
			options.headers['cookie']=(response.headers['set-cookie'])[0].split(';')[0]
			if ( (response.headers['set-cookie'])[1] !== undefined )
			  options.headers['X-CSRF-TOKEN']=(response.headers['set-cookie'])[1].split(';')[0].split('=')[1]
		  }
		  // resolve promise
		  return resolve(str)
		});
	 
	  });
	  //post req
	  if (data !== undefined) {
		req.write(data)
	  }
	  req.end();
  })
}

function getUsers()
{
	options.path='/controller/api/rbac/v1/users'
	return callcontroller()
}

function getUser(id)
{
	options.path='/controller/api/rbac/v1/users/' + id
	return callcontroller()
}

function getRoles()
{
	options.path='/controller/api/rbac/v1/roles'
	return callcontroller()
}

function getGroups()
{
	options.path='/controller/api/rbac/v1/groups'
	return callcontroller()
}

function getGroup(id)
{
	options.path='/controller/api/rbac/v1/groups/' + id
	return callcontroller()
}


var sensitiveRoles = ["Account Administrator",
'Administrator',
'DB Monitoring Administrator',
'Analytics Administrator',
'Server Monitoring Administrator',
'Universal Agent Administrator']

console.dir(sensitiveRoles)

async function go() {
    // get a list of users
	var uo = JSON.parse(await getUsers())

	//get a list of roles
	var ro = JSON.parse(await getRoles())
	
	// do they match the sensitive role list? put them on a list
	var sensrolesids = []
	for (r in ro.roles){ 
		if (sensitiveRoles.includes(ro.roles[r].name))
		{
			sensrolesids.push(ro.roles[r].id)
		}
	}

	//get a list of groups
	var go = JSON.parse(await getGroups())
	var sensgroupids = []
	var gp = []
	// do they include a sensitive role? put them on a list
	for (g in go.groups){
	    gp.push(getGroup(go.groups[g].id).then((data) => {
			var ggo = JSON.parse(data) 
			for (gr in ggo.roles){
            	if (sensrolesids.includes(ggo.roles[gr])) {
                	sensgroupsids.push(go.groups[g].id);
                	break
            	}
        	}
		}))
	}
	await Promise.all(gp)

	// for all the users, do the have a sensitive role or group? put them on a list
	var sensusers = []
	var userpromises = []
	for(u in uo.users) {
	    userpromises.push(getUser(uo.users[u].id).then((data) =>{
			var uuo = JSON.parse(data)
			if (uuo.roles !== undefined) for (r in uuo.roles) {
            	if (sensrolesids.includes(uuo.roles[r].id))
            	{
                	sensusers.push(uuo.displayName)
                	break
            	}
        	}
			// TODO: bad logic; currently will add a user twice if it has a sensitive role and group
        	if (uuo.groups !== undefined) for (g in uuo.groups) {
            	if (sensgroupids.includes(uuo.groups[g].id))
            	{
                	sensusers.push(uuo.displayName)
                	break
            	}
        	}
		}))
	}
	Promise.all(userpromises).then( () => {
		console.dir(sensusers)
	})
}

go()
