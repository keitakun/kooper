class ExecStack
{
	protected _stdoutCallback:Function;
	protected _terminatedCallback:Function;
	protected _errorCallback:Function;

	protected _paramsList:Array<object> = [];
	protected _currentParams:object;
	protected _running:boolean = false;

	protected _stack:Array<object>;
	protected _execIndex:number = 0;

	protected _currentTask;
	protected _cwd;

	constructor(cwd:string, stack, stdoutCallback:Function = null, terminatedCallback:Function = null, errorCallback:Function = null)
	{
		if(stack.length == 0) throw new Error('No stacks to execute');
		this._cwd = cwd;
		this._stack = stack;
		this._stdoutCallback = stdoutCallback;
		this._terminatedCallback = terminatedCallback;
		this._errorCallback = errorCallback;
	}

	protected _execNext()
	{
		if(!this._running) return;
		if(this._execIndex >= this._stack.length){
			this._execIndex = 0;
			this._running = false;
			this._runNext();
			return;
		}

		let task = this._stack[this._execIndex++];

		let run = true;
		let params = this._currentParams;
		if(task['condition'])
		{
			let cond = task['condition'];
			cond = cond.replace(/\{(.*?)\}/g, 'params[\'$1\']');
			try
			{
				run = eval(cond);
			}catch(e)
			{
				run = false;
			}
		}

		if(run && task['exec'])
		{
			let opts = {};
			task['cwd'] = this._cwd + path.sep;
			if(task['cwd']) opts['cwd'] += task['cwd'];
			opts['cwd'] = path.resolve(task['cwd']);
			let args = task['args'] || [];
			for(let i in args)
			{
				for(let k in params)
				{
					args[i] = args[i].replace('{' + k + '}', params[k]);
				}
			}
			this._currentTask = child_process.spawn(task['exec'], args, opts);
			this._currentTask.stdout.on('data', this._onStdout);
			this._currentTask.on('close', this._onClose);
			this._currentTask.on('error', this._onError);
			this._currentTask.task = task;
		}else{
			this._execNext();
		}
	}

	protected _onStdout = (data) =>
	{
		if(this._stdoutCallback) this._stdoutCallback(data);
	}

	protected _onClose = () =>
	{
		this._removeListeners();
		this._execNext();
	}

	protected _onError = () =>
	{
		if(this._onError) this._errorCallback();
		this._removeListeners();
		this._execNext();
	}

	protected _removeListeners()
	{
		if(this._currentTask)
		{
			this._currentTask.off('close', this._onClose);
			this._currentTask.off('error', this._onError);
			this._currentTask.stdout.off('data', this._onStdout);
		}
	}

	protected _runNext()
	{
		if(this._running) return;
		let params;
		if(params = this._paramsList.shift())
		{
			this.run(params);
		}else{
			this._running = false;
			if(this._terminatedCallback) this._terminatedCallback();
		}
	}

	public get running() : boolean
	{
		return this._running;
	}

	public queue(paramsList):void
	{
		this._paramsList = [].concat(paramsList);
		this._runNext();
	}

	public run(params = null):void
	{
		if(this._running) return;
		this._currentParams = params;
		this._running = true;
		this._execNext();
	}

	public kill()
	{
		this._running = false;
		this._removeListeners();
		if(this._currentTask) this._currentTask.kill();
	}


}