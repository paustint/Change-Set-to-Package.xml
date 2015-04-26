
var PG = {
	ApexClasses : [],
	ApexTriggers : [],
	CustomFields : [],
	Groups :[],
	CustomSettings : [],
	ApexPages : [],
	workflowrules : [],
	workflowfieldupdates : [],
	pagelayouts : [],
	queues : [],
	tab : null,
	baseURL : null,
	session : null,
	toolingservice:{
		'customField': '/services/data/v28.0/tooling/sobjects/CustomField',
		'workflowrule' : '/services/data/v30.0/tooling/sobjects/workflowrule',
		'workflowfieldupdate': '/services/data/v32.0/tooling/sobjects/workflowfieldupdate',
		'coverage' : '/services/data/v29.0/tooling/query/?q=SELECT+Coverage+FROM+ApexCodeCoverageAggregate',

	},
	
	init : function(){
		chrome.tabs.query( {active:true}, function callback(tabs){
		  PG.tab = tabs[0];
		  PG.baseURL = PG.tab.url.substr( 0, PG.tab.url.indexOf('.com/') + 4 );
		  PG.isInboundChangeSet = PG.tab.url.indexOf('changemgmt/inboundChangeSetDetailPage') != -1;
		  PG.isOutboundChangeSet = PG.tab.url.indexOf('changemgmt/outboundChangeSetDetailPage') != -1;
		  PG.isUnmanagedPackage = PG.tab.url.indexOf('/033') != -1;
		  PG.sessionId = PG.getSessionId();
		});
	},

	resetVariables : function(){
		PG.ApexClasses = [];
		PG.ApexTriggers = [];
		PG.CustomFields =  [];
		PG.Groups =  [];
		PG.CustomSettings  =  [];
		PG.ApexPages  =  [];
		PG.workflowrules =  [];
		PG.workflowfieldupdates =  [];
		PG.pagelayouts =  [];
		PG.queues = [];
	},
	
	
	handleGetPackage : function (e){
		document.getElementById('loading').style.display = 'inline-block';
		PG.resetVariables();
		
		chrome.tabs.sendMessage(
			PG.tab.id,
			{'request':'GET'}, 
			function(response){
				if( response === undefined ){
						document.getElementById('output').innerHTML = 'Something went wrong. Try again after reloading the page. If problem persists then contact bhupendrasyadav@gmail.com';
						document.getElementById('loading').style.display = 'none';
						return;
				}
				document.getElementById('output').innerHTML = JSON.stringify(response.json);
				
				if( PG.isUnmanagedPackage ){
					PG.extractComponentsFromUnmanagedPackage(response);
				}else if( PG.isInboundChangeSet ){
					PG.extractComponentsFromInboundChangeSet(response);
				}else if( PG.isOutboundChangeSet ){
					PG.extractComponentsFromOutboundChangeSet(response);
				}
			}
		);
	},
	
	extractComponentsFromInboundChangeSet : function (response){
		if( response.json.TBODY != undefined && response.json.TBODY.TR != undefined){
			for(var i=0; i < response.json.TBODY.TR.length; i++ ){
				var tr = response.json.TBODY.TR[i];
				var type = tr.TD[3];
				if( type['text'] == 'Custom Field' ){
					var name = tr.TD[4].text;
					PG.CustomFields.push( '<members>' + name + '</members>' );
				}else if( type['text'] == 'Apex Class' ){
					var name = tr.TD[4].text;
					PG.ApexClasses.push( '<members>' + name + '</members>' );
				}else if( type['text'] == 'Apex Trigger' ){
					var name = tr.TD[4].text;
					PG.ApexTriggers.push( '<members>' + name + '</members>' );
				}
			}
			PG.generatePackage();
		}
	},
	/* 					Outbound changeset */
	extractComponentsFromOutboundChangeSet : function (response){
		var xhrCounter = 0;
		if( response.json.TBODY != undefined && response.json.TBODY.TR != undefined){
			for(var i=0; i < response.json.TBODY.TR.length; i++ ){
				var tr = response.json.TBODY.TR[i];
				var type = tr.TD[3];
				if( type['text'] == 'Custom Field' ){
					xhrCounter++;
					var toolingcustomfield = PG.baseURL + PG.toolingservice.customField + tr.TD[1].A.attributes.href;
					
					var xhr = new XMLHttpRequest();
					xhr.open("GET", toolingcustomfield , true);
					xhr.setRequestHeader("Content-type","application/json");
					xhr.setRequestHeader("Authorization", "Bearer " + PG.session);
					xhr.onreadystatechange = function(x) {
						if (x.currentTarget.readyState == 4 && x.currentTarget.status == 200 ) {
							var apiName = JSON.parse(x.currentTarget.responseText).FullName;
							console.log( apiName );
							PG.CustomFields.push( '<members>' + apiName + '</members>' );
							
							xhrCounter--;
							if( xhrCounter == 0 )
								PG.generatePackage();
						}
					}
					xhr.send();
					
				}else if( type['text'] == 'Apex Class' ){
					var name = tr.TD[4].text;
					PG.ApexClasses.push( '<members>' + name + '</members>' );
				}else if( type['text'] == 'Apex Trigger' ){
					var name = tr.TD[4].text;
					PG.ApexTriggers.push( '<members>' + name + '</members>' );
				}else if( type['text'] == 'Group' ){
					var name = tr.TD[4].text;
					PG.Groups.push( '<members>' + name + '</members>' );
				}else if( type['text'] == 'Custom Setting' ){
					var name = tr.TD[4].text;
					PG.CustomSettings.push( '<members>' + name + '__c' + '</members>' );
				}else if( type['text'] == 'Visualforce Page' ){
					var name = tr.TD[4].text;
					PG.ApexPages.push( '<members>' + name + '</members>' );
				}else if( type['text'] == 'Page Layout' ){
					var name = tr.TD[4].text;
					PG.pagelayouts.push( '<members>' + name + '</members>' );
				}else if( type['text'] == 'Queue' ){
					var name = tr.TD[4].text;
					PG.queues.push( '<members>' + name + '</members>' );
				}else if( type['text'] == 'Workflow Rule' ){
			
					xhrCounter++;
					var toolingcustomfield = PG.baseURL + PG.toolingservice.workflowrule + tr.TD[1].A.attributes.href;
					
					var xhr = new XMLHttpRequest();
					xhr.open("GET", toolingcustomfield , true);
					xhr.setRequestHeader("Content-type","application/json");
					xhr.setRequestHeader("Authorization", "Bearer " + PG.session);
					xhr.onreadystatechange = function(x) {
						if (x.currentTarget.readyState == 4 && x.currentTarget.status == 200 ) {
							var apiName = JSON.parse(x.currentTarget.responseText).FullName;
							console.log( apiName );
							PG.workflowrules.push( '<members>' + apiName + '</members>' );
							
							xhrCounter--;
							if( xhrCounter == 0 )
								PG.generatePackage();
						}
					}
					xhr.send();
				}else if( type['text'] == 'Workflow Field Update' ){
			
					xhrCounter++;
					var toolingcustomfield = PG.baseURL + PG.toolingservice.workflowfieldupdate + tr.TD[1].A.attributes.href;
					
					var xhr = new XMLHttpRequest();
					xhr.open("GET", toolingcustomfield , true);
					xhr.setRequestHeader("Content-type","application/json");
					xhr.setRequestHeader("Authorization", "Bearer " + PG.session);
					xhr.onreadystatechange = function(x) {
						if (x.currentTarget.readyState == 4 && x.currentTarget.status == 200 ) {
							var apiName = JSON.parse(x.currentTarget.responseText).FullName;
							console.log( apiName );
							PG.workflowfieldupdates.push( '<members>' + apiName + '</members>' );
							
							xhrCounter--;
							if( xhrCounter == 0 )
								PG.generatePackage();
						}
					}
					xhr.send();
				}
			}
			if( xhrCounter == 0 )
				PG.generatePackage();
		
		}
	},
	
	extractComponentsFromUnmanagedPackage : function (response){
		if( response.json.TBODY != undefined && response.json.TBODY.TR != undefined){
			for(var i=0; i < response.json.TBODY.TR.length; i++ ){
				var tr = response.json.TBODY.TR[i];
				var type = tr.TD[4];
				if( type['text'] == 'Custom Field' ){
					var name = tr.TD[2].A.text;
				}else if( type['text'] == 'Apex Class' ){
					var name = tr.TD[2].A.text;
					PG.ApexClasses.push( '<members>' + name + '</members>' );
				}else if( type['text'] == 'Apex Trigger' ){
					var name = tr.TD[2].A.text;
					PG.ApexTriggers.push( '<members>' + name + '</members>' );
				}
			}
			PG.generatePackage();
		}
	},
	
	/* Generic for all pages */
	generatePackage : function (){
		var package = '';
			package += '<?xml version="1.0" encoding="UTF-8"?>\n';
			package += '<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n';
		if( PG.ApexClasses.length > 0 ){
			package += '<type>\n';
			for( var i = 0; i < PG.ApexClasses.length; i++){
				package += '\t' + PG.ApexClasses[i] + '\n';
			}
			package += '\t<name>ApexClass</name>\n';
			package += '</type>\n';
		}
		
		if( PG.ApexPages.length > 0 ){
			package += '<type>\n';
			for( var i = 0; i < PG.ApexPages.length; i++){
				package += '\t' + PG.ApexPages[i] + '\n';
			}
			package += '\t<name>ApexPage</name>\n';
			package += '</type>\n';
		}
		
		if( PG.ApexTriggers.length > 0 ){
			package += '<type>\n';
			for( var i = 0; i < PG.ApexTriggers.length; i++){
				package += '\t' + PG.ApexTriggers[i] + '\n';
			}
			package += '\t<name>ApexTrigger</name>\n';
			package += '</type>\n';
		}
		
		if( PG.CustomFields.length > 0 ){
			package += '<type>\n';
			for( var i = 0; i < PG.CustomFields.length; i++){
				package += '\t' + PG.CustomFields[i] + '\n';
			}
			package += '\t<name>CustomField</name>\n';
			package += '</type>\n';
		}
		
		if( PG.CustomSettings.length > 0 ){
			package += '<type>\n';
			for( var i = 0; i < PG.CustomSettings.length; i++){
				package += '\t' + PG.CustomSettings[i] + '\n';
			}
			package += '\t<name>CustomObject</name>\n';
			package += '</type>\n';
		}
		
		if( PG.Groups.length > 0 ){
			package += '<type>\n';
			for( var i = 0; i < PG.Groups.length; i++){
				package += '\t' + PG.Groups[i] + '\n';
			}
			package += '\t<name>Group</name>\n';
			package += '</type>\n';
		}
		
		if( PG.workflowrules.length > 0 ){
			package += '<type>\n';
			for( var i = 0; i < PG.workflowrules.length; i++){
				package += '\t' + PG.workflowrules[i] + '\n';
			}
			package += '\t<name>WorkflowRule</name>\n';
			package += '</type>\n';
		}
		
		
		if( PG.workflowfieldupdates.length > 0 ){
			package += '<type>\n';
			for( var i = 0; i < PG.workflowfieldupdates.length; i++){
				package += '\t' + PG.workflowfieldupdates[i] + '\n';
			}
			package += '\t<name>WorkflowFieldUpdate</name>\n';
			package += '</type>\n';
		}
		
		if( PG.pagelayouts.length > 0 ){
			package += '<type>\n';
			for( var i = 0; i < PG.pagelayouts.length; i++){
				package += '\t' + PG.pagelayouts[i] + '\n';
			}
			package += '\t<name>Layout</name>\n';
			package += '</type>\n';
		}
		
		if( PG.queues.length > 0 ){
			package += '<type>\n';
			for( var i = 0; i < PG.queues.length; i++){
				package += '\t' + PG.queues[i] + '\n';
			}
			package += '\t<name>Queue</name>\n';
			package += '</type>\n';
		}
		
			package += '<version>30.0</version>\n';
			package += '</package>';
		
		document.getElementById('output').value = package;
		console.log( package );
		document.getElementById('loading').style.display = 'none';
	},
	
	getSessionId : function(){
		 chrome.tabs.query({"status":"complete","windowId":chrome.windows.WINDOW_ID_CURRENT,"active":true}, function(tab){
				chrome.cookies.getAll({"url":tab[0].url, "name":"sid"},function (cookie){
					console.table(cookie);
					allCookieInfo = "";
					for(i=0;i<cookie.length;i++){
						if(cookie[i].name = 'sid' && cookie[i].session == true && cookie[i].secure == true){
							PG.session = cookie[i].value;
							document.getElementById('output').innerHTML = PG.session;
						}
					}
				});
		});

	}

}

/*** Code Coverage Provider **/
var CCP = {
	clsssNamesLoaded : false,
	triggerNamesLoaded : false,
	classNames: {}, 
	triggerNames : {},
	triggerCoverage: {},
	apexclassCoverage: {},
	
	EndPoint :{
		'apexclasses': '/services/data/v29.0/query/?q=select+name,Id+from+apexclass+WHERE+NamespacePrefix+=+null',
		'apextriggeres': '/services/data/v29.0/query/?q=select+name,Id+from+apextrigger+WHERE+NamespacePrefix+=+null',
		'coverage' : '/services/data/v29.0/tooling/query/?q=SELECT+Coverage,ApexClassOrTriggerId+FROM+ApexCodeCoverageAggregate',
	},
	
	handleGetCoverage : function(e){
		document.getElementById('loading').style.display = 'inline-block';
		CCP.loadClasses();
		CCP.loadTrigger();
		CCP.loadCoverage();
	},
	
	loadTrigger : function(){
		var toolingCoverageEndPoint = PG.baseURL + CCP.EndPoint.apextriggeres;
		var xhr = new XMLHttpRequest();
		xhr.open("GET", toolingCoverageEndPoint , true);
		xhr.setRequestHeader("Content-type","application/json");
		xhr.setRequestHeader("Authorization", "Bearer " + PG.session);
		xhr.onreadystatechange = function(x) {
			if (x.currentTarget.readyState == 4 && x.currentTarget.status == 200 ) {
				var triggerResp = JSON.parse(x.currentTarget.responseText);
				console.log( triggerResp );
				if( triggerResp.done == true ){
					CCP.triggerNames = {};
					for( var index = 0 ; index < triggerResp.records.length; index++ ){
						var trig = triggerResp.records[index];
						CCP.triggerNames[trig.Id] = trig.Name;
					}
					console.table( CCP.triggerNames );
					CCP.triggerNamesLoaded = true;
					CCP.loadCoverage();
				}
			}
		};
		xhr.send();
	},
	
	loadClasses : function(){
		var toolingCoverageEndPoint = PG.baseURL + CCP.EndPoint.apexclasses;
		var xhr = new XMLHttpRequest();
		xhr.open("GET", toolingCoverageEndPoint , true);
		xhr.setRequestHeader("Content-type","application/json");
		xhr.setRequestHeader("Authorization", "Bearer " + PG.session);
		xhr.onreadystatechange = function(x) {
			if (x.currentTarget.readyState == 4 && x.currentTarget.status == 200 ) {
				triggerResp = JSON.parse(x.currentTarget.responseText);
				console.log( triggerResp );
				if( triggerResp.done == true ){
					CCP.classNames = [];
					for( var index = 0 ; index < triggerResp.records.length; index++ ){
						var cls = triggerResp.records[index];
						CCP.classNames[cls.Id] = cls.Name;
					}
					console.table( CCP.classNames );
					CCP.clsssNamesLoaded = true;
					CCP.loadCoverage();
				}
			}
		};
		xhr.send();
	},

	loadCoverage : function(){
		if( CCP.clsssNamesLoaded == false || CCP.triggerNamesLoaded == false )
			return;
		
		var toolingCoverageEndPoint = PG.baseURL + CCP.EndPoint.coverage;
		var xhr = new XMLHttpRequest();
		xhr.open("GET", toolingCoverageEndPoint , true);
		xhr.setRequestHeader("Content-type","application/json");
		xhr.setRequestHeader("Authorization", "Bearer " + PG.session);
		xhr.onreadystatechange = function(x) {
			if (x.currentTarget.readyState == 4 && x.currentTarget.status == 200 ) {
				var coverage = JSON.parse(x.currentTarget.responseText);
				console.log( coverage );
				if( coverage.done == true ){
					var lstcoverage = [];
					for( var index = 0 ; index < coverage.records.length; index++ ){
						var cov = coverage.records[index];
						var covered = cov.Coverage.coveredLines.length;
						var uncovered = cov.Coverage.uncoveredLines.length;
						
						var percentage = Math.round ( ( covered *100 ) / (uncovered + covered) );
						var id = cov.ApexClassOrTriggerId;
						var name = CCP.triggerNames[id] || CCP.classNames[id];
						lstcoverage.push( {'classname' : name, 'percentage' : percentage } );
					}
					console.table( lstcoverage );
					CCP.generateCoverage(lstcoverage);
				}
			}
		};
		xhr.send();
	},
	
	generateCoverage : function (lstcoverage){
		var coverage = '';
		for(var index = 0; index < lstcoverage.length; index++){
			coverage += lstcoverage[index].classname + ', ' + lstcoverage[index].percentage + '%\n';
		}
		document.getElementById('output').innerHTML = coverage;
		document.getElementById('loading').style.display = 'none';
	}
}

document.addEventListener('DOMContentLoaded', function () {
  PG.init();
  document.getElementById('btn').addEventListener('click', PG.handleGetPackage );
  document.getElementById('testcoveragebtn').addEventListener( 'click', CCP.handleGetCoverage );

});