#!/bin/sh

preact build --no-prerender && \

echo "fact.company" >> build/CNAME && \

cd build \
&& git init \
&& git checkout -b gh-pages \
&& git add . \
&& git commit -m "build" \
&& git remote add origin git@github.com:blakelapierre/keccak-hashed-json-graph

