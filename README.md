# reviewsampler

A simple node.js server to ("balanced-uniformly") sample from a list of reviews in a Google Sheet. 

## Use

This server is setup to allow you to make (simple) API calls to 

1. Initialize a Google Sheets API object with an API key (to be done _before_ launching an experiment)
2. Load a particular sheet by specifying a `spreadsheetId` and `range` (to be done _before_ launching an experiment)
3. Specify a sampling method, the default being "balanced-uniform" (to be done, if desired, _before_ launching an experiment)
4. Sample reviews one-by-one, returning data that can be used to construct questions in Qualtrics (_during_ experiment)
5. Report client-side errors during question loads back to the experimenter (_during_ experiment)

### curl Examples

You can use [`curl`](https://curl.haxx.se/) from the command line to play around: 

1. Initialize a Google Sheets API object with an API key: 

```
$ curl https://my.server.com/reviewsampler/api/sheets/init -XPOST -H "Content-type: application/json" -d '{ "apikey" : "..." }'
```

2. Load a particular sheet by specifying a `spreadsheetId` and `range`: 

```
$ curl https://my.server.com/reviewsampler/api/sheet/load -XPOST -H "Content-type: application/json" -d '{ "spreadsheetId" : "...-7KRloOBe3-4qUQ" , "range" : "..." }'
```

3. Specify a sampling method, e.g. _uniform_ sampling: 

```
$ curl https://my.server.com/reviewsampler/api/strategy/u -XPOST
```

4. Sample reviews one-by-one, returning data that can be used to construct questions in Qualtrics: 

```
$ curl https://my.server.com/reviewsampler/api/get/review
{"ReviewId":"4241","Product":"Sweatshirt","Rating":"5","Review":"My favorite sweater, will buy more colors"}
```

### javscript Fetch Example

I would only use `javascript` to get sampled reviews within Qualtrics questions. That is, I wouldn't use it to setup the data for the experiment. 

For that use case, a sample call might look like 

```
Qualtrics.SurveyEngine.addOnload( function()
{
	// question index. change this in different questions, so we don't have to make multiple changes below. 
	var questionIndex = 1;
	// get place to store custom HTML for reviews...
	var container = this.getQuestionTextContainer();
	// call review sampler API's main routine
	fetch( "https://my.server.com/reviewsampler/api/get/review" )
		.then( data => {
			// process data recieved as JSON data
			data.json().then( json => {
					// Replace question's text container with a custom format of the response 
					container.innerHTML = "<ins>Question " + questionIndex + "</ins><br><ul><li/><b>Product:</b> " + json.Product + " <br><li/><b>Rating:</b> " + json.Rating + "/5 stars <br><li/><b>Review:</b> " + json.Review + "</ul>";
					// store the Review ID embedded data so we have it later for response analysis
					Qualtrics.SurveyEngine.setEmbeddedData( 'R' + questionIndex , json.ReviewId );
				} )
			} , error => {
				// Dump error, if we can, to the server. Otherwise we have no window into client-side errors. 
				var postOpt = { method : 'post', body : JSON.stringify( error ) };
				fetch( "https://my.server.com/reviewsampler/api/error" , postOpt );
			} );
} );
```
This example is provided in `qualtrics.js`. 

## Route Index

### `/` (`GET`)

A generic route with a single sentence response. Useful for checking if the server is working as expected. 

### `/sheets/init` (`POST`)

Initialize the Google API by providing your API key. 

### `/sheet/load` (`POST`)

Load a spreadsheet's data by specifying its `spreadsheetId` and range. This reads the spreadsheet data into memory; if you change something in the spreadsheet that you want reflected in the sampled reviews, you need to reload the spreadsheet with this `POST` call. Loading destroyes the current counts vector, and creates a new one initialized to zeros. 

### `/strategy` (`GET`)

Get the current sampling strategy. 

### `/strategy/:c` (`POST`)

Set the sampling strategy to the value of `c`. Valid values are: `u` (uniform), `b` (balanced-uniform), `e` (exponentially weighted), `r` (reciprocally weighted). 

### `/get/sample` (`GET`)

Sample a uniform random number. 

### `/get/review` (`GET`)

Sample a review; returns review data in a `json` packet. 

### `/counts` (`GET`)

Get the current counts vector (note: possibly large). 

### `/counts/reset` (`POST`)

Reset the counts vector to all zeros, sizing based on the current spreadsheet. 

### `/error` (`POST`)

A "postback" routine to enable logging of client-side errors in a central location. 

## Setup

### node Server

Obviously you need `node.js` and `npm` to handle this repo. Install by running
```
npm install
```
in the repo directory. I run with
```
$ ./reviewsampler.start
... do other stuff, until we need to stop with:
$ ./reviewsampler.stop
```

Or, for production, use [`systemd`](https://www.freedesktop.org/wiki/Software/systemd/). Make sure `reviewsampler.service` is correct for your deployment, copy into place with
```
$ sudo cp reviewsampler.service /etc/systemd/system
```
and reload/launch/enable: 
```
$ sudo systemd daemon-reload
$ sudo systemd enable reviewsampler.service
$ sudo systemd start reviewsampler.service
$ sudo systemd status reviewsampler.service
```
Hopefully you don't hit errors. 

### SSL Certificates

I used [Let'sEncrypt](https://letsencrypt.org/)'s free [`certbot`](https://certbot.eff.org/) tool to generate SSL certs that can be used for `HTTPS`. Fairly easy to just follow the instructions. 

### Apache

To run with apache, modify the `vhost.conf` and `vhost_ssl.conf` files by entering your DNS name in place of `my.server.com` as well as the webmaster email address (if desired). These need to be placed in `/etc/apache/sites-available` and enabled with 

```
$ sudo a2ensite vhost vhost_ssl
```
Or you can just replace the content in the default sites enabled for `HTTP` and `HTTPS`. You also need to make sure the right modules are enabled with, e.g., 

```
$ sudo a2enmod ssl proxy proxy_http
```
And, of course, restart `apache`
```
$ sudo systemctl restart apache2.service
```
and check for errors
```
$ sudo systemctl status apache2.service
```

## Contact

morrowwr@gmail.com

wrossmorrow.com

www.linkedin.com/in/wrossmorrow
