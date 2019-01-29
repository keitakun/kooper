# kooper
Lightweight task automator in NodeJS with no dependencies.

[![NPM Version][npm-image]][npm-url]
<!---  [![NPM Downloads][downloads-image]][downloads-url]
  [![Linux Build][travis-image]][travis-url]
  [![Windows Build][appveyor-image]][appveyor-url]
  [![Test Coverage][coveralls-image]][coveralls-url]
--->

---

[kooper](https://github.com/keitakun/kooper) is a lightweight task automator written in NodeJS with no external dependencies.

## Installation

```
npm install -g kooper
```

## Running

By default, [kooper](https://github.com/keitakun/kooper) will look for *kooper.json* [configuration file](#configFile) inside the executing directory.
```
kooper
```

To specify a [configuration file](#configFile) you just need to add the path to the configuration file.
```
kooper someconfig.json
```

If you need to run a specific task you can use the *-t* or *--task* parameter to specify one or more tasks to run. The task name is the object key of the [configuration file](#configFile)

```
kooper -t task1
kooper -t task1,task2
kooper -t task1 -t task2
kooper --task task1
```

## <a name="configFile"></a>Configuration file

The configuration file defines the tasks for kooper and it uses the object key for the task name.
All paths used in the configuration file are relative to the it's location.

A task executable accepts 3 parameters:
Parameter | Description 
---|---
**exec** | Executable command.
cwd (optional) | Directory from where the command needs to be executed
args (optional) | Array of arguments
condition (optional) | javascript boolean condition

If the task has multiple executions, it can be stacked inside *tasks* array as in *example2* task below.

The **run** parameter defines if a task should run when [kooper](https://github.com/keitakun/kooper) is initialized.
Setting it to *false* will not run when initialized.
This can be overriden by using the *-t | --task* command line parameter or using the [in app command](#inAppCommand)

### <a name="watch"></a>watch
Using watch property, it'll execute the task for every file changed in the specified path.

The watch command will generate local variables *{path}* and *{type}*
which are replaced whithin the task values.

**{path}** will give the relative path of the changed file
**{type}** *changed* or *removed*

### watchStack
It works like [watch](#watch) property, but it'll wait a while before executing the task to call only once when multiple files are changed, such as in a copy or delete actions.

### Example

```
{
    "example1": { # Simply running Typescript in watch mode
        "exec": "tsc",
        "cwd": "./",
        "args": [
            "-w",
            "-p",
            "./"
        ]
    },
    "example2": { # Run list directory and after print out "done"
        "run": false,
        "tasks": [
            {
                "exec": "ls",
                "cwd": "./"
            },
            {
                "exec": "echo",
                "args": [
                    "done"
                ]
            }
        ]
    },
    "example3": { # Watch for any file change
        "watch": "./",
        "tasks": [
            {
                # Will only execute if the path is cooper.json
                "condition": "{path} == 'cooper.json'",
                "exec": "echo",
                "args": [
                    "{path}"
                ]
            }
        ]
    },
    "example4": {
        "watchStack": "./",
        "tasks": [
            {
                "exec": "./doSomething.sh"
            }
        ]
    },

}
```

## <a name="inAppCommand"></a>In app commands

While [kooper](https://github.com/keitakun/kooper) is running there's 2 commands you can use.

### run [task]
By typing *run* with the task name, it'll run the specified task.
```
> kooper         # initializing kooper
run example2     # invoke example2 task
```

### stop [task]
By typing *stop* with the task name, it'll kill the specified running task.
```
> kooper         # initializing kooper
stop example2     # stop example2 task
```

[npm-image]: https://img.shields.io/npm/v/kooper.svg
[npm-url]: https://npmjs.org/package/kooper
[downloads-image]: https://img.shields.io/npm/dm/kooper.svg
[downloads-url]: https://npmjs.org/package/kooper
[travis-image]: https://img.shields.io/travis/kooperjs/kooper/master.svg?label=linux
[travis-url]: https://travis-ci.org/kooperjs/kooper
[appveyor-image]: https://img.shields.io/appveyor/ci/dougwilson/kooper/master.svg?label=windows
[appveyor-url]: https://ci.appveyor.com/project/dougwilson/kooper
[coveralls-image]: https://img.shields.io/coveralls/kooperjs/kooper/master.svg
[coveralls-url]: https://coveralls.io/r/kooperjs/kooper?branch=master
