/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * 
 *  reviewsampler API server: multi-thread server (both coordinator and servers)
 *
 *  Copyright 2018 William Ross Morrow
 *
 *  Licensed under a modified Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *       https://github.com/wrossmorrow/reviewsampler/LICENSE.md
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 * 
 * 
 *  This can be run (appropriate terms modified) with an apache load balancer configured 
 *  something like the following: 
 * 
 *      ...
 *
 *      ProxyRequests off
 *
 *      <Proxy balancer://reviewsampler>
 *            BalancerMember http://127.0.0.1:4050
 *            BalancerMember http://127.0.0.1:4051
 *              ...
 *            Require all granted
 *            ProxySet lbmethod=byrequests
 *      </Proxy>
 *
 *      <Location /balancer>
 *                SetHandler balancer-manager
 *      </Location>
 *
 *      ProxyPass /api balancer://reviewsampler
 * 
 *      ...
 * 
 * 
 *  with $ sudo a2enmod lbmethod_byrequests
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const _os = require( 'os' );
const _cluster = require( 'cluster' );

// customized logger
const logger = ( s ) => { console.log( ( new Date( Date.now() ).toISOString() ) + " | " + s ); }

if( _cluster.isMaster ) {

  /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * 
   * MASTER (SERVER COORDINATOR PROCESS)
   * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

  logger( 'Coordinator (' + process.pid + ') has started.' );

  // ports will be portBase , portBase + 1 , ... , portBase + numberOfServerProcesses - 1
  var numberOfServerProcesses = 2 , 
      portBase = 4050 , 
      pendingResponses = {};

  // coordinator message handler
  const messageHandler = ( msg ) => {

    // log that we have a message to handle
    // logger( 'Coordinator (' + process.pid + ') received message from a Worker (' + msg.pid + ') on port ' + msg.port + '.' );

    if( msg.action ) {

      // this are informational messages...

      pendingResponses[msg.rid] = { port : 0 , done : {} };
      pendingResponses[msg.rid].port = msg.port;
      for( var i = 0 ; i < numberOfServerProcesses ; i++ ) {
        pendingResponses[msg.rid].done[ portBase + i ] = false;
      }

      // need to (partially) coordinate "init" action... are we getting any feedback about errors? 
      if( msg.action === "hello" ) { 
        logger( 'Coordinator (' + process.pid 
                  + ') received \"hello\" message from a Server (' 
                  + msg.pid + ') on port ' + msg.port + '.' );
      }

      // need to (partially) centralize "error" action... are we getting any feedback about errors? 
      if( msg.action === "error" ) { logger( "CLIENT ERROR: " + JSON.stringify( msg.error ) ); } 

      // the following messages need to be broadcast...

      // need to coordinate "init" action... are we getting any feedback about errors? 
      if( msg.action === "init" ) { Object.keys( worker ).forEach( (w,i) => ( worker[w].send( msg ) ) ); }

      // need to coordinate "load" action... are we getting any feedback about errors? 
      /*if( msg.action === "load" ) { 
        Object.keys( worker ).forEach( (w,i) => { 
          var timeout = setTimeout( () => ( worker[w].send(msg) ) , Math.ceil( 10 * Math.random() ) * 1000 );
        } ); 
      }*/
      if( msg.action === "load" ) { Object.keys( worker ).forEach( (w,i) => ( worker[w].send( msg ) ) ); }

      // need to coordinate "reset" action... are we getting any feedback about errors? 
      if( msg.action === "strategy" ) { Object.keys( worker ).forEach( (w,i) => ( worker[w].send( msg ) ) ); }

      // need to coordinate "sample" action... are we getting any feedback about errors? 
      if( msg.action === "sample" ) { Object.keys( worker ).forEach( (w,i) => ( worker[w].send( msg ) ) ); }

      // need to coordinate "reset" action... are we getting any feedback about errors? 
      if( msg.action === "reset" ) { Object.keys( worker ).forEach( (w,i) => ( worker[w].send( msg ) ) ); }

    } else { 

      // handle errors... TBD
      if( msg.error ) {
        logger( "ERROR :: " + JSON.stringify( msg.message ) );
        if( msg.rid in pendingResponses ) {
          worker[ pendingResponses[msg.rid].port ].send( { action : 'done' , rid : msg.rid , status : 500 , error : msg.message } );
          delete pendingResponses[msg.rid];
        }
      }

      // 
      if( msg.done && msg.done in pendingResponses ) { 

        logger( "Server " + msg.port + " completed task " + msg.done );

        pendingResponses[msg.done].done[msg.port] = true;

        var allDone = true;
        for( var i = 0 ; i < numberOfServerProcesses ; i++ ) {
          if( ! pendingResponses[msg.done].done[portBase+i] ) {
            allDone = false; 
            break;
          }
        }

        if( allDone ) {
          worker[ pendingResponses[msg.done].port ].send( { action : 'done' , rid : msg.done , status : 200 } );
          delete pendingResponses[msg.done];
        }

      }

    }

  }

  // launch server processes in a few steps: 
  // 
  //    • Fork worker servers
  //    • Receive messages from workers and handle them in the master process
  //    • Send a message from the master process to the worker
  // 

  // first, fork worker servers
  worker = {};
  for( var i = 0 ; i < numberOfServerProcesses ; i++ ) {
    var port = portBase + i;
    worker[port] = _cluster.fork( { PROCESS_EXPRESS_PORT : port } );
    worker[port].on( 'message' , messageHandler );
    worker[port].send( { pid : process.pid } );
  }

  // Be notified when worker processes die... but what do we need to do? 
  _cluster.on( 'death' , function( w ) {
    logger( 'Coordinator: A Server (' + w.pid + ') died.' );
  });

  // Be notified when worker processes exit, so we can restart them and keep processes alive
  _cluster.on( 'exit' , ( w , c , s ) => {

    logger( 'Coordinator: A Server died ( code : ' + c + ' , signal : ' + s + ' ).' );

    // restart that process... 
    for( var i = 0 ; i < numberOfServerProcesses ; i++ ) {
      var port = portBase + i;
      if( worker[port].id == w.id ) {
        logger( 'Coordinator will restart Server ' + port + '.' );
        worker[port] = _cluster.fork( { PROCESS_EXPRESS_PORT : port } );
        worker[port].on( 'message' , messageHandler );
        break;
      }
    }

  });

  /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * 
   * 
   * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

} else { 

  /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * 
   * WORKER (ACTUAL SERVER PROCESS; LOAD BALANCING IN APACHE)
   * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

  logger( 'Server (' + process.pid + ') has started, with port ' + process.env.PROCESS_EXPRESS_PORT + '.' );

  // Send "hello" message to coordinator process.
  process.send( { action : "hello" , pid : process.pid , port : process.env.PROCESS_EXPRESS_PORT } );

  /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * 
   * IMPORTS
   * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

  const _express = require( 'express' );
  const _bodyParser = require( 'body-parser' );
  const _cors = require( 'cors' );
  const _rng = require( 'rng-js' );
  const _fs = require( 'fs' );
  const _crypto = require( 'crypto' );
  const { google } = require( 'googleapis' );

  // our own samplers
  const _samplers = require( "./samplers.js" ).samplers;

  /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * 
   * SERVER SETUP AND MIDDLEWARE
   * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

  var app = _express();
  app.set( 'port' , process.env.PROCESS_EXPRESS_PORT );
  app.use( _bodyParser.json() );
  app.use( _bodyParser.urlencoded({ extended: false }) );

  app.use( _cors() );

  /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * 
   * CONSTANTS AND (GLOBAL) VARIABLE DECLARATIONS
   * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

  // this is IF we want to use strict CORS during the survey... need to include in routes, though
  // maybe a better default behavior is to use this in routes and change origin string here to add
  // restrictions
  const corsOptions = {
      origin: "https://stanforduniversity.qualtrics.com" ,
      optionsSuccessStatus: 200
  };

  // set defaults
  var sheets = undefined , 
      storedSheetId = undefined , 
      logStream = undefined ,
      reviews = [] , 
      counts = [] , 
      maxResponsesPerReview = 5 , 
      strategy = 'b' , 
      reviewRequestCount = 0 ,          
      pendingResponses = {};            // holds responses this server is holding on to

  // set the actual map
  var sampleReview = _samplers[strategy].smpl;
  var sampleParams = { maxCount : maxResponsesPerReview };

  const openlog = () => {
      return _fs.createWriteStream( process.env.REVIEWSAMPLER_LOG_DIR + "/" 
                                                  + storedSheetId + "." 
                                                  + process.env.PROCESS_EXPRESS_PORT + "."
                                                  + Date.now() + ".log" , 
                                              { flags : 'a' } );
  };

  const cleanup = () => {
    if( logStream ) { logStream.end(); logStream = undefined; }
  };

  // get a request's IP address. From 
  //
  //      https://stackoverflow.com/questions/8107856/how-to-determine-a-users-ip-address-in-node
  //
  const reqIP = ( req ) => {
      return  ( req.headers 
                  ? ( 'x-forwarded-for' in req.headers 
                          ? req.headers['x-forwarded-for'].split(',').pop() 
                          : undefined )
                  : undefined ) || 
              ( req.connection 
                  ? req.connection.remoteAddress || 
                      ( req.connection.socket
                          ? req.connection.socket.remoteAddress 
                          : undefined )
                  : undefined ) || 
              ( req.socket 
                  ? req.socket.remoteAddress
                  : undefined );
  }

  // do app specific cleaning before exiting
  process.on('exit', () => ( cleanup() ) );

  // catch ctrl+c event and exit normally
  process.on('SIGINT', () => ( cleanup() ) );

  //catch uncaught exceptions, trace, then exit normally
  process.on( 'uncaughtException' , () => ( cleanup() ) );

  /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * 
   * SERVER ROUTES
   * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

  // app.options('/', _cors(corsOptions) , ... ) for more restrictive CORS settings

  //
  // POST METHODS, NEED TO BE COORDINATED
  //

  // load google sheets app using an API key passed in the request body (data)
  app.post( '/sheets/init' , ( req , res ) => {
      logger( "POST /sheets/init request (apikey sent not logged)" ); // log this request
      var id = _crypto.randomBytes(24).toString('hex'); // generate a random "response id"
      pendingResponses[id] = { time : Date.now() , responseObject : res }; // locally store the response object
      process.send( { action : 'init' , apikey : req.body.apikey , port : app.get('port') , rid : id } ); // notify coordinator that this request has been received
  }); 

  // reset the counts vector, in case we need to run multiple trials (for testing or otherwise)
  // over the same set of reviews. Same effect as reloading the set of reviews. 
  app.post( '/counts/reset' , ( req , res ) => { 
      logger( "POST /counts/reset request " );  // log request 
      var id = _crypto.randomBytes(24).toString('hex'); // generate a random "response id"
      pendingResponses[id] = { time : Date.now() , responseObject : res }; // locally store the response object
      process.send( { action : 'reset' , port : app.get('port') , rid : id } );     // notify coordinator that this request has been received
  } );

  // load actual google sheet, using body as the Google sheets request spec
  app.post( '/sheet/load' , ( req , res ) => {

      // for example, called with data like 
      // 
      //      req.body ~ { spreadsheetId : '...' , range : 'Sheet1!A2:D6' }
      //
      // that is, the request body (data) should contain the sheets request. 

      // log this request
      logger( "POST /sheet/load request for spreadsheet " + req.body.spreadsheetId + " and range " + req.body.range );

      if( !sheets ) { 
          res.write( "Cannot load a sheet before initializing Google API (POST to /sheets/init)" );
          res.status(500).send();
          return;
      }

      var id = _crypto.randomBytes(24).toString('hex'); // generate a random "response id"

      pendingResponses[id] = { time : Date.now() , responseObject : res }; // locally store the response object

      // notify coordinator that this request has been received
      // 
      // NOTE that we are doing this AFTER the init check... _could this be a coordination 
      // issue?_ one process gets init, sends that to coordinator; in the meantime, this process
      // is assigned to handle a load request but may NOT be initialized yet. Perhaps better to 
      // centralize these requests... 
      // 
      process.send( { action : 'load' , 
                      spreadsheetId : req.body.spreadsheetId , 
                      range : req.body.range , 
                      port : app.get('port') , 
                      rid : id } );

      // respond to the caller, so they aren't left hanging... but this isn't coordinated, so this isn't 
      // a meaningful message to the caller. 
      // res.send();

  }); 

  // set the sampling strategy... needs to be coordinated
  app.post( '/strategy/:s' , ( req , res ) => {

      // log this request
      logger( "POST /strategy request, change to " + req.params.s );

      // make sure we actually have something to respond to...
      if( req.params.s in _samplers ) {

        var id = _crypto.randomBytes(24).toString('hex'); // generate a random "response id"

        pendingResponses[id] = { time : Date.now() , responseObject : res }; // locally store the response object

        // coordinate...
        process.send( { action : 'strategy' , 
                        strategy : req.params.s , 
                        port : app.get('port') , 
                        rid : id } );

        // respond to client
        // res.send();

      } else {

        var message =  "Strategy code " + req.params.s + " not understood. Please use one of";
        Object.keys( _samplers ).map( (s,i) => {
          ( i == 0 ? message += " \"" + s + "\"": message += ", \"" + s + "\"" ); 
        } );
        message += "\n";
        res.write( message );
        res.status( 500 );
        res.send( );

      }

  });

  //
  // GET METHODS, (mostly) UNCOORDINATED
  // 

  // a blank request to serve as info... any process can respond
  app.get( '/' , (req,res) => {
    logger( "GET  / request" ); // log this request
    res.send( "reviewsampler :: API server to return balanced-uniformly sampled reviews.\n" ); // reply to the caller
  } );

  // get (text describing) the sampling strategy... any process can respond
  app.get( '/strategy' , ( req , res ) => {
    logger( "GET  /strategy request" );
    res.write( "Strategy: " + _samplers[strategy].name + " (" + strategy + ")\n" + _samplers[strategy].help );
    res.send();
  });

  // get an actual review (requires reviews loaded)... _need_ any process to respond, 
  // but we _DO_ have to coordinate side effects (counting)
  app.get( '/get/review' , (req,res) => {

    if( reviews.length == 0 ) {
        res.write( "Don't appear to have a reviews object to sample from yet." )
        res.status(500).send();
        return;
    }

    // actually sample review...
    var R = sampleReview( counts , sampleParams );

    // log request/result
    logger( "GET  /get/review request " + reviewRequestCount+1 + " sampled review " + reviews[R][0] );

    // respond to caller with review
    res.json( { ReviewId : reviews[R][0] , Product : reviews[R][1] , Rating : reviews[R][2] , Review : reviews[R][3] } );

    // write to this process' log
    logStream.write( ( new Date( Date.now() ).toISOString() )
                        + "|" + reqIP( req ) 
                        + "|" + R
                        + "|" + counts[R] + 1           // we increment later
                        + "|" + reviewRequestCount + 1  // we increment later
                        + "\n" );

    // notify the coordinator that we have sampled... to handle counts in (this and) different processes
    process.send( { action : 'sample' , row : R } );

  });

  // get the vector of counts (debugging, basically)... any process can respond
  app.get( '/counts' , (req,res) => { 
    logger( "GET  /counts request " );
    res.json(counts); 
  } );

  // naive error post back method... just send to coordinator, not really "coordinated"
  app.post( '/error' , (req,res) => { 
    logger( "POST /error request : " + JSON.stringify( req.body ) );
    process.send( { action : 'error' , error : req.body } );
    res.send(); 
  } );

  /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * 
   * SERVER LAUNCH
   * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

  server = app.listen( app.get('port') );
  logger( "listening on port " + app.get('port') );

  // for debugging reboot loop
  // setTimeout( () => ( process.exit() ) , 1000 * Math.ceil( 10 * Math.random() ) );

  /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * 
   * COORDINATED CALLS
   * 
   * Actions to handle coordinated requests
   * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

  // Receive messages from the master process.
  process.on( 'message' , ( msg ) => {

    // log message recieved
    logger( 'Server (' + app.get('port') + ') received message from Coordinator: ' + msg.action + '.' );

    // handle coordinated requests to initialize the sheets API... error checking?
    if( msg.action === "init" ) {
      sheets = google.sheets( { version : 'v4' , auth : msg.apikey } );
      process.send( { done : msg.rid , port : app.get('port') } );
    }

    // handle coordinated requests to load data from a spreadsheet
    if( msg.action === "load" ) {

      if( !sheets ) { 
          process.send( { error : 'load' , 
                          message : "Cannot load a sheet before initializing Google API (POST to /sheets/init)" ,
                          port : app.get('port') , 
                          rid : msg.rid } );
          return;
      }

      logger( "Attempting to load " + msg.range + " from " + msg.spreadsheetId )
      sheets.spreadsheets.values.get( { spreadsheetId : msg.spreadsheetId , range : msg.range } , 
                                      ( error , response ) => {

        // notify coordinator that we got an error instead of a response... 
        if( error ) { 
          process.send( { error : 'load' , 
                          message : error , 
                          port : app.get('port') , 
                          rid : msg.rid } ); 
        } else {

          storedSheetId = msg.spreadsheetId;

          closelog();
          openlog();

          // _actually_ load reviews and set counts vector
          reviews = Object.assign( [] , response.data.values );
          counts = new Array( reviews.length );
          for( var i = 0 ; i < reviews.length ; i++ ) { counts[i] = 0.0; }

          // submit some kind of signal to the coordinator? 
          process.send( { done : msg.rid , port : app.get('port') } );

        }

      } );

    }

    // handle coordinated requests to change the strategy
    if( msg.action === "strategy" ) {
      if( msg.strategy in _samplers ) { 
        logger( "Changing strategy to " + _samplers[msg.strategy].name );
        strategy = msg.strategy;
        sampleReview = _samplers[strategy].smpl;
        sampleParams = ( strategy == 'b' ? { maxCount : maxResponsesPerReview } : {} );
        process.send( { done : msg.rid , port : app.get('port') } );
      } else {
        process.send( { error : 'strategy' , 
                        message : "Strategy action in worker process failed: unknown code " + msg.strategy + "." , 
                        port : app.get('port') , 
                        rid : msg.rid } );
      }
    }

    // handle coordinated requests to increment counts because of a sample
    if( msg.action === "sample" ) {
      reviewRequestCount += 1;  // increment this process
      counts[ msg.row ]++;      // increment this process' count for the listed row
      process.send( { done : msg.rid , port : app.get('port') } );
    }

    // handle coordinated requests to reset counts
    if( msg.action === "reset" ) {
      closelog();
      openlog();
      for( var i = 0 ; i < reviews.length ; i++ ) { counts[i] = 0.0; }
      process.send( { done : msg.rid , port : app.get('port') } );
    }

    // handle _coordinated_ request completion
    if( msg.action === "done" ) {
      logger( "action " + msg.rid + " completed with status " + msg.status );
      if( msg.rid in pendingResponses ) {
        pendingResponses[msg.rid].responseObject.status( msg.status );
        if( msg.status != 200 ) {
          pendingResponses[msg.rid].responseObject.json( msg.error );
        } else {
          pendingResponses[msg.rid].responseObject.send();
        }
        delete pendingResponses[msg.rid];
      }
    }

  });

  /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * 
   * 
   * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * 
 * 
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
