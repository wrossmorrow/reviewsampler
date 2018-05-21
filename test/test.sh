#!/bin/bash

curl https://www.wrossmorrow.org/reviewsampler/api/sheets/init \
		-XPOST -H "Content-type: application/json" \
		-d '{ "apikey" : "AIzaSyDnvnaJicnjr6EOuqAVdBV2mbHtC5Gtmdw" }'

curl https://www.wrossmorrow.org/reviewsampler/api/sheet/load \
		-XPOST -H "Content-type: application/json" \
		-d '{ "spreadsheetId" : "1mkZV-HqNhW3jIprvaO6rMSlMswyqFdGng7qbtqhQj1Y" , "range" : "Sheet1!A2:D6" }'

> testout.log
for i in $( seq 1 100 ) ; do 
	curl -s https://www.wrossmorrow.org/reviewsampler/api/get/review >> testout.log
	echo '' >> testout.log
	sleep 0.1
done