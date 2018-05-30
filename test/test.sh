#!/bin/bash

REVIEWSAMPLER_PROT=https
REVIEWSAMPLER_HOST=www.wrossmorrow.org
REVIEWSAMPLER_PATH=reviewsampler/api

URL=${REVIEWSAMPLER_PROT}://${REVIEWSAMPLER_HOST}/${REVIEWSAMPLER_PATH}

URL=http://localhost:4050

curl ${URL}/sheets/init \
		-XPOST -H "Content-type: application/json" \
		-d '{ "apikey" : "AIzaSyDnvnaJicnjr6EOuqAVdBV2mbHtC5Gtmdw" }'

curl ${URL}/sheet/load \
		-XPOST -H "Content-type: application/json" \
		-d '{ "spreadsheetId" : "1mkZV-HqNhW3jIprvaO6rMSlMswyqFdGng7qbtqhQj1Y" , "range" : "Sheet1!A2:D6" }'

> testout.log
for i in $( seq 1 100 ) ; do 
	curl -s ${URL}/get/review >> testout.log
	echo '' >> testout.log
	sleep 0.1
done