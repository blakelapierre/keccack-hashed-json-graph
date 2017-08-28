#!/bin/sh

preact build --no-prerender && \

cd build && \
git init && \
git checkout -b gh-pages \
&& git add . \
&& git commit -m "build" \
&& git remote add origin git@github.com:blakelapierre/keccak-hashed-json-graph

