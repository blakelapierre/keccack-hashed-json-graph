import xpath from 'xpath';
import {DOMParser} from 'xmldom';
import {parseString} from 'xml2js';
import request from 'request';
import keccak from './lib/keccak';

const parser = new DOMParser();

const url = 'https://www.reddit.com/r/programming/.rss',
      // host = 'db.fact.company';
      host = 'localhost:9999';

request.get(url, (error, response, body) => {
  console.log(body.substring(0, 200), '...');

  const js = parseString(body, (err, result) => {
    if (err) return console.error('error', err);

    result.feed.entry.forEach(({title, link, updated, author}) => {
      const hash = postData(JSON.stringify({
        title: title[0],
        link: link[0]['$']['href'], // jshint ignore:line
        updated: updated[0],
        author: {
          name: author[0]['name'][0], // jshint ignore:line
          uri: author[0]['uri'][0] // jshint ignore:line
        }
        // author: `[${author[0]['name'][0]}](${author[0]['uri']})` // jshint ignore:line
      })); // jshint ignore:line
      postData(JSON.stringify({received: new Date().getTime(), hash: `keccak:${hash}`}));
    });
  });
});

function postData(data) {
  const hash = keccak(data);

  request.post({url: `http://${host}/keccak/${hash}`, body: data});

  return hash;
}