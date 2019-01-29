/// <reference path="ExecStack.ts" />

class Task
{
	protected _terminatedCallback:Function;
	protected _errorCallback:Function;
	protected _watch;
	protected _watchStack:boolean = false;
	protected _watchStackFiles:Array<object> = [];
	protected _watchStackTimeout:number = -1;
	protected _outputPrefix:string;
	protected _execStack:ExecStack;

	protected _name:string;
	
	constructor(name:string, task:object, terminatedCallback:Function = null, errorCallback:Function = null)
	{
		this._name = name;
		this._outputPrefix = '[' + this._name + ']';
		this._terminatedCallback = terminatedCallback;
		this._errorCallback = errorCallback;
		this._parseTask(task);
	}

	protected output(...args)
	{
		args.unshift(this._outputPrefix.bold);
		console.log.apply(this, args);
	}

	protected _parseTask (task:object):void
	{
		let args:Array<object> = task['args'] || [];
		let opts:object = {};
		let execs:Array<object>;
		if(task['exec'])
		{
			execs = [{exec: task['exec'], cwd: task['cwd'], args: task['args']}];
		}else if(task['tasks'])
		{
			execs = task['tasks'];
		}

		if(execs && execs.length)
		{
			this._execStack = new ExecStack(task['_cwd'], execs, this._onStdout, this._onClose, this._onError);
		}

		if(task['watch'] || task['watchStack'])
		{
			let watch = task['watch'] || task['watchStack'];
			if(task['watchStack']) this._watchStack = true;
			if(!fs.existsSync(watch))
			{
				this.output('File/directory doesn\'t exist to watch: '.red + watch.bold);
				if(this._errorCallback) this._errorCallback();
				return;
			}
			this.output('Watching: '.green + watch.bold);
			this._watch = fs.watch(watch, this._fileChange);
		}else{
			this._execStack.run();
		}
	}

	protected _execFileChange = () =>
	{
		let params = [];

		if(this._watchStack)
		{
			params.push({dir: this._watchStack});
		}else{
			params = this._watchStackFiles;
		}
		if(params.length > 0)
		{
			if(this._execStack)
			{
				this._execStack.queue(params);
			}else{
				let files = {};
				let states = {'changed': [], 'removed': []}
				for(let o of this._watchStackFiles)
				{
					files[o['path']] = o['type'];
				}

				for(let k in files)
				{
					states[files[k]].push(k);
				}
				if(states['changed'].length > 0) this.output("Changed files:\n".yellow + states['changed'].join('\n').yellow);
				if(states['removed'].length > 0) this.output("Removed files:\n".red + states['removed'].join('\n').red);
			}
		}
		this._watchStackFiles = [];
	}

	protected _fileChange = (e, f) =>
	{
		let type:string = 'changed';
		if(!fs.existsSync(f)) {
			type = 'removed';
		}
		this._watchStackFiles.push({path: f, type: type});

		if(this._watchStack)
		{
			clearTimeout(this._watchStackTimeout);
			this._watchStackTimeout = setTimeout(this._execFileChange, 100);
		}else{
			this._execFileChange();
		}
	}

	protected _onStdout = (data):void =>
	{
		this.output(data.toString());
	}

	protected _onClose = (data):void =>
	{
		this.output('Task terminated'.yellow);
		if(this._terminatedCallback) this._terminatedCallback();
	}

	protected _onError = (data):void =>
	{
		this.output('Error running task: '.red);
		if(this._errorCallback) this._errorCallback();
	}

	public get name() : string
	{	
		return this._name;
	}

	public get running() : boolean
	{

		return (this._watch || (this._execStack && this._execStack.running));
	}
	public kill():void
	{
		clearTimeout(this._watchStackTimeout);
		if(this._watch){
			this._watch.close();
			this._watch = null;
		}
		if(this._execStack)
		{
			this._execStack.kill();
		}
		this.output('Task terminated'.yellow);
	}
}