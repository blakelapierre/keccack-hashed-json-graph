import xpath from 'xpath';
import {DOMParser} from 'xmldom';
import {parseString} from 'xml2js';
import request from 'request';
import keccak from './lib/keccak';

const parser = new DOMParser();

const url = 'https://www.reddit.com/r/programming/.rss';

request.get(url, (error, response, body) => {
  console.log(body.substring(0, 200), '...');

  const js = parseString(body, (err, result) => {
    if (err) return console.error('error', err);

    result.feed.entry.forEach(({title, link}) => {
      const hash = postData(JSON.stringify({title: title[0], link: link[0]['$']['href']})); // jshint ignore:line
      postData(JSON.stringify({received: new Date().getTime(), hash: `keccak:${hash}`}));
    });
  });
});

function postData(data) {
  const hash = keccak(data);

  request.post({url: `http://localhost:9999/keccak/${hash}`, body: data});

  return hash;
}