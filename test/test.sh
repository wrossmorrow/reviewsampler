#!/bin/bash

curl localhost:4050/sheets/init \
		-XPOST -H "Content-type: application/json" \
		-d '{ "apikey" : "AIzaSyDnvnaJicnjr6EOuqAVdBV2mbHtC5Gtmdw" }'

curl localhost:4050/sheet/load \
		-XPOST -H "Content-type: application/json" \
		-d '{ "spreadsheetId" : "1mkZV-HqNhW3jIprvaO6rMSlMswyqFdGng7qbtqhQj1Y" , "range" : "Sheet1!A2:D6" }'

> testout.txt
for i in $( seq 1 100 ) ; do 
	curl -s localhost:4050/get/review >> testout.txt
	echo '' >> testout.txt
	sleep 0.1
done