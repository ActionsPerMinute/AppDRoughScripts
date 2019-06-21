#!/usr/bin/env node 

var debug=0
var harfile = process.argv[2]

const fs = require('fs');
var obj;
fs.readFile(harfile, 'utf8', function (err, data) {
  if (err) throw err;
  data = data.trim()
  obj = JSON.parse(data);
  if(debug)console.dir(obj)
  if(debug)console.log(obj.log.entries[0].request.url)
  if(debug)console.log(obj.log.entries.length)
  for(var i=0; i < obj.log.entries.length; i++)
  {
    var req = obj.log.entries[i].request
    var url = req.url
	var url2 = url.split('?')[0]
	//console.log(url2)
	if ( url2.endsWith('js') || url2.endsWith('css') || url2.endsWith('png') || url2.endsWith('notify.htm') || url2.endsWith('gif') || url2.endsWith('.properties')) continue;
    
	if ( url.indexOf('eumcollector') > -1 ) continue; 
	if ( url.endsWith('adrum') ) console.log('')
	else //console.log(obj.log.entries[i].request.url)
	{ 
	  url = url.split('?')[0]
	  url = url.replace(/\([^\)]*\)/g, "(ID)");
	  url = url.replace(/\~[^\~]*\~/g, "~ID~");
    
	  var urlarr = url.split('/')
	  urlarr.shift()
	  urlarr.shift()
	  urlarr.shift()
	  console.log(urlarr.join('/'))
	}
	/*if( req.method == 'POST' )
	{
	  console.dir(req.postData)
	}*/
  }
});
