#!/bin/sh

cd build \
&& (git push origin :gh-pages; git push origin gh-pages)

# cd build && \
# git push origin gh-pages
