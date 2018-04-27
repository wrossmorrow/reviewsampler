# reviewsampler

A simple node.js server to ("balanced-uniformly") sample from a list of reviews in a Google Sheet. 

## Use

This server is setup to allow you to make (simple) API calls to 

1. Initialize a Google Sheets API object with an API key (to be done _before_ launching an experiment)
2. Load a particular sheet by specifying a `spreadsheetId` and `range` (to be done _before_ launching an experiment)
3. Specify a sampling method, the default being "balanced-uniform" (to be done, if desired, _before_ launching an experiment)
4. Sample reviews one-by-one, returning data that can be used to construct questions in Qualtrics (_during_ experiment)

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

### javscript Fetch Examples

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
