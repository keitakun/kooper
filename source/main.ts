#!/usr/bin/env node

/// <reference path="colors.ts" />
/// <reference path="Task.ts" />

let fs = require('fs');
let process = require('process');
let child_process = require('child_process');
let path = require('path');

let args = process.argv.splice(2);

function parseArgs(args, map = {})
{
	let parsed = {'-': []};
	let currName = null;
	for(let v of args)
	{
		if(/^\-/.test(v))
		{
			currName = v.replace(/^\-+/, '');
			if(map[currName]) currName = map[currName];
			if(!parsed[currName]) parsed[currName] = [];
		}else{
			if(!currName)
			{
				currName = '-';
			}
			parsed[currName].push(v);
			currName = null;
		}
	}
	return parsed;
}

args = parseArgs(args, {t: 'task'});
let configFiles = ['cooper.json'];
let filteredConfigFiles = [];
if(args['-'].length > 0)
{
	configFiles = args['-'];
}
for(let cf of configFiles)
{
	if(!fs.existsSync(cf))
	{
		console.log('Config file '.red + cf.bold + ' not found'.red);
	}else{
		filteredConfigFiles.push(cf);
	}
}

if(filteredConfigFiles.length == 0)
{
	console.log('No config files found.\nTerminating... '.red);
	process.exit();
}

let taskFilter = [];
if(args['task'] && args['task'].length > 0)
{
	taskFilter = args['task'];
	taskFilter = taskFilter.join(',').split(',');
}


let currentTasks = [];
let currentConfig = {};

function handleClose(data)
{
	checkTasks();
}

function handleError(data)
{
	checkTasks();
}

function checkTasks()
{
	let i = currentTasks.length;
	while(i-- > 0)
	{
		if(!currentTasks[i].running) currentTasks.splice(i, 1);
	}
	if(currentTasks.length == 0)
	{
		console.log("All tasks terminated.".green);
		process.exit();
	}
}

function resetTasks()
{
	let i = currentTasks.length;
	while(i-- > 0)
	{
		currentTasks[i].kill();
	}
	currentTasks.length = 0;
}

function reloadTasks()
{
	resetTasks();
	loadTasks();
}

function getRunningTask(name)
{
	let i = currentTasks.length;
	while(i-- > 0)
	{
		if(currentTasks[i].name == name) return currentTasks[i];
	}
	return null;
}

function runTask(name)
{
	let task = getRunningTask(name);
	if(task)
	{
		console.log('Task already running: '.yellow + name.bold);
		return;
	}
	if(!currentConfig[name])
	{
		console.log('Task not found: '.red + name.bold);
		return;
	}

	task = new Task(name, currentConfig[name], handleClose, handleError);
	currentTasks.push(task);
}

function stopTask(name)
{
	let task = getRunningTask(name);
	if(!task)
	{
		console.log('Task not running: '.yellow + name.bold);
		return;
	}
	task.kill();
	checkTasks();
}

function loadTasks()
{
	let tasks = {};
	let c = 0;
	configFiles.length = 0;
	for(let cf of filteredConfigFiles)
	{
		try{
			let t = JSON.parse(fs.readFileSync(cf));
			let basedir = path.dirname(path.resolve(cf));
			for(var k in t)
			{
				t[k]['_cwd'] = basedir;
			}
			tasks = Object.assign(tasks, t);
			configFiles.push(cf);
			console.log("Loaded config: ".green + cf.bold);
			c++;
		}catch(e)
		{
			console.log('Couldn\'t parse '.red + cf.bold + ' config file'.red);
		}
	}
	if(c == 0)
	{
		console.log('Couldn\'t load any config file.\nTerminating...'.red);
	}

	currentConfig = tasks;
	for(let k in tasks)
	{
		if(taskFilter.length > 0 && taskFilter.indexOf(k) < 0) continue;
		if(taskFilter.length == 0 && tasks.hasOwnProperty('run') && !tasks['run']) continue;
		runTask(k);
	}
}

function hahdleInput(data)
{
	let chunk;
	let o;
	while ((chunk = process.stdin.read()) !== null) {
		if(o = /^(run|stop) (.+)/m.exec(chunk))
		{
			switch(o[1])
			{
				case 'run':
					runTask(o[2]);
					break;
				case 'stop':
					stopTask(o[2]);
					break;
			}
		}
	}
}

for(cf of filteredConfigFiles)
{
	fs.watchFile(cf, {presistent: true, recursive: true}, reloadTasks);
}

loadTasks();

process.stdin.resume();
process.stdin.on('readable', hahdleInput);

