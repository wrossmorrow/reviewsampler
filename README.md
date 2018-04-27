# reviewsampler

A simple node.js server to ("balanced-uniformly") sample from a list of reviews in a Google Sheet. 

## Setup

Obviously you need `node.js` and `npm` to handle this repo. Install by running

```
npm install
```

in the repo directory. I run with

```
$ node tester.js 2> error.log > info.log & 
$ echo $! > run.pid
... do other stuff, until we need to stop with:
$ kill $( cat run.pid )
```

## Contact

morrowwr@gmail.com
wrossmorrow.com
www.linkedin.com/in/wrossmorrow
