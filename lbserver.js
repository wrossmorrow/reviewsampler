
/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * 
 * LOAD-BALANCED REVIEW-SAMPLER SERVER
 * 
 * This can be run (appropriate terms modified) with an apache load balancer configured 
 * something like the following: 
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
      portBase = 4050;

  // coordinator message handler
  const messageHandler = ( msg ) => {

    // log that we have a message to handle
    // logger( 'Coordinator (' + process.pid + ') received message from a Worker (' + msg.pid + ') on port ' + msg.port + '.' );

    if( msg.action ) {

      // this are informational messages...

      // need to coordinate "init" action... are we getting any feedback about errors? 
      if( msg.action === "hello" ) { 
        logger( 'Coordinator (' + process.pid 
                  + ') received \"hello\" message from a Worker (' 
                  + msg.pid + ') on port ' + msg.port + '.' );
      }

      // need to centralize "error" action... are we getting any feedback about errors? 
      if( msg.action === "error" ) { logger( "CLIENT ERROR: " + JSON.stringify( msg.error ) ); } 

      // the following messages need to be broadcast...

      // need to coordinate "init" action... are we getting any feedback about errors? 
      if( msg.action === "init" ) { worker.forEach( (w,i) => ( w.send( msg ) ) ); }

      // need to coordinate "load" action... are we getting any feedback about errors? 
      if( msg.action === "load" ) { worker.forEach( (w,i) => ( w.send( msg ) ) ); }

      // need to coordinate "reset" action... are we getting any feedback about errors? 
      if( msg.action === "strategy" ) { worker.forEach( (w,i) => ( w.send( msg ) ) ); }

      // need to coordinate "sample" action... are we getting any feedback about errors? 
      if( msg.action === "sample" ) { worker.forEach( (w,i) => ( w.send( msg ) ) ); }

      // need to coordinate "reset" action... are we getting any feedback about errors? 
      if( msg.action === "reset" ) { worker.forEach( (w,i) => ( w.send( msg ) ) ); }     

    } else { 

      // handle errors... TBD
      if( msg.error ) {



      }

    }

  }

  // launch server processes in a few steps: 
  // 
  //    • Fork worker servers
  //    • Receive messages from workers and handle them in the master process
  //    • Send a message from the master process to the worker
  // 
  worker = [];
  for( var i = 0 ; i < numberOfServerProcesses ; i++ ) {
    worker[i] = _cluster.fork( { PROCESS_EXPRESS_PORT : portBase + i } );
    worker[i].on( 'message' , messageHandler );
    worker[i].send( { pid : process.pid } );
  }

  // Be notified when worker processes die... but what do we need to do? 
  _cluster.on( 'death' , function( w ) {
    logger( 'Coordinator: A Worker (' + w.pid + ') died.' );
  });

  // Be notified when worker processes exit, so we can restart them and keep processes alive
  _cluster.on( 'exit' , ( w , c , s ) => {

    logger( 'Coordinator: A Worker died ( code : ' + c + ' , signal : ' + s + ' ).' );

    // restart that process... 
    for( var i = 0 ; i < numberOfServerProcesses ; i++ ) {
      if( worker[i].id == w.id ) {
        logger( 'Coordinator will restart Worker ' + i + '.' );
        worker[i] = _cluster.fork( { PROCESS_EXPRESS_PORT : portBase + i } );
        worker[i].on( 'message' , messageHandler );
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
  const { google } = require( 'googleapis' );

  // out own samplers
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
      reviews = [] , 
      counts = [] , 
      maxResponsesPerReview = 5 , 
      strategy = 'b' , 
      reviewRequestCount = 0;

  // set the actual map
  var sampleReview = _samplers[strategy].smpl;
  var sampleParams = { maxCount : maxResponsesPerReview };

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
      process.send( { action : 'init' , apikey : req.body.apikey } ); // notify coordinator that this request has been received
      res.send(); // reply to the caller
  }); 

  // reset the counts vector, in case we need to run multiple trials (for testing or otherwise)
  // over the same set of reviews. Same effect as reloading the set of reviews. 
  app.post( '/counts/reset' , (req,res) => { 
      logger( "POST /counts/reset request " );  // log request 
      process.send( { action : 'reset' } );     // notify coordinator that this request has been received
      res.send();                               // respond to client... too early? 
  } );

  // naive error post back method... send to coordinator
  app.post( '/error' , (req,res) => { 
      logger( "POST /error request : " + JSON.stringify( req.body ) );
      process.send( { action : 'error' , error : req.body } );
      res.send(); 
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

      // notify coordinator that this request has been received
      // 
      // NOTE that we are doing this AFTER the init check... _could this be a coordination 
      // issue?_ one process gets init, sends that to coordinator; in the meantime, this process
      // is assigned to handle a load request but may NOT be initialized yet. Perhaps better to 
      // centralize these requests... 
      // 
      process.send( { action : 'load' , spreadsheetId : req.body.spreadsheetId , range : req.body.range } );

      // respond to the caller, so they aren't left hanging...
      res.send();

  }); 

  // set the sampling strategy... needs to be coordinated
  app.post( '/strategy/:s' , ( req , res ) => {

      // log this request
      logger( "POST /strategy request, change to " + req.params.s );

      // make sure we actually have something to respond to...
      if( req.params.s in _samplers ) {

        // coordinate...
        process.send( { action : 'strategy' , strategy : req.params.s } );

        // respond to client
        res.send();

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

      // notify the coordinator that we have sampled... to handle counts in different processes
      process.send( { action : 'sample' , row : R } );

  });

  // get the vector of counts (debugging, basically)... any process can respond
  app.get( '/counts' , (req,res) => { 
      logger( "GET  /counts request " );
      res.json(counts); 
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

    // handle coordinated requests to initialize the sheets API
    if( msg.action === "init" ) {

      // load the Google API in _this_ process... HOW DO WE ERROR CHECK??????? (Thanks, Google)
      sheets = google.sheets( { version : 'v4' , auth : msg.apikey } );

    }

    // handle coordinated requests to load data from a spreadsheet
    if( msg.action === "load" ) {

      sheets.spreadsheets.values.get( { spreadsheetId : msg.spreadsheetId , range : msg.range } , 
                                      ( error , response ) => {

            // notify coordinator that we got an error has been received
          if( error ) { process.send( { error : 'load' , message : error } ); }
          else {

            // _actually_ load reviews and set counts vector
            reviews = Object.assign( [] , response.data.values );
            counts = new Array( reviews.length );
            for( var i = 0 ; i < reviews.length ; i++ ) { counts[i] = 0.0; }

            // submit some kind of signal to the coordinator? 

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
      } else {
        process.send( { error : 'strategy' , 
                        message : "Strategy action in worker process failed: unknown code " + msg.strategy + "." } );
      }
    }

    // handle coordinated requests to increment counts because of a sample
    if( msg.action === "sample" ) {
      reviewRequestCount += 1;  // increment this process
      counts[ msg.row ]++;      // increment this process' count for the listed row
    }

    // handle coordinated requests to reset counts
    if( msg.action === "reset" ) {
      for( var i = 0 ; i < reviews.length ; i++ ) { counts[i] = 0.0; }
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
