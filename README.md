# reviewsampler

A simple node.js server to ("balanced-uniformly") sample from a list of reviews in a Google Sheet. 

## Setup

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

### SSL Certificates

I used [Let'sEncrypt](https://letsencrypt.org/)'s free `[certbot](https://certbot.eff.org/)` tool to generate SSL certs that can be used for `HTTPS`. 

### Apache

To run with apache, modify the `vhost.conf` and `vhost_ssl.conf` files by entering your DNS name in place of `my.server.com` as well as the webmaster email address (if desired). These need to be placed in `/etc/apache/sites-available` and enabled with 

```
$ sudo a2ensite vhost vhost_ssl
```

You need to make sure the right modules are enabled with, e.g., 

```
$ sudo a2enmod ssl proxy proxy_http
```

## Contact

morrowwr@gmail.com

wrossmorrow.com

www.linkedin.com/in/wrossmorrow
