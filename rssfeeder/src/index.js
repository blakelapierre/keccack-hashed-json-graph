import xpath from 'xpath';
import {DOMParser} from 'xmldom';
import {parseString} from 'xml2js';
import request from 'request';
import keccak from './lib/keccak';

const parser = new DOMParser();

const host = process.argv[2] || 'localhost:9999';

const handlers = {
  'reddit': (result) => {
    result.feed.entry.forEach(({title, link, updated, author}) => {
      const hash = postData(JSON.stringify({
        title: title[0],
        link: link[0]['$']['href'], // jshint ignore:line
        updated: updated[0],
        subreddit: result.feed.title[0],
        author: {
          name: author[0]['name'][0], // jshint ignore:line
          uri: author[0]['uri'][0] // jshint ignore:line
        }
        // author: `[${author[0]['name'][0]}](${author[0]['uri']})` // jshint ignore:line
      })); // jshint ignore:line
      postData(JSON.stringify({received: new Date().getTime(), hash: `keccak:${hash}`}));
    });
  },
  'cnn': result => {
    console.log(result);
    result.rss.channel.forEach(channel => {
      console.log(channel);
      channel.item.forEach(({title, description, link, pubDate}) => {
        const hash = postData(JSON.stringify({
          title: title ? title[0] : undefined,
          description: description ? description[0].substring(0, description[0].indexOf('<')) : undefined,
          link: link ? link[0] : undefined,
          pubDate: pubDate ? pubDate[0] : undefined
        }));
      });
    });
  }
};

const feeds = [{
  url: 'https://www.reddit.com/r/programming/.rss',
  delay: 5 * 60 * 1000, // 5 minutes
  handler: handlers['reddit'] // jshint ignore:line
},{
  url: 'https://www.reddit.com/r/technology/.rss',
  delay: 5 * 60 * 1000, // 5 minutes
  handler: handlers['reddit'] // jshint ignore:line
},{
  url: 'http://rss.cnn.com/rss/cnn_topstories.rss',
  delay: 5 * 60 * 1000,
  handler: handlers['cnn'] // jshint ignore:line
},{
  url: 'http://rss.cnn.com/rss/cnn_allpolitics.rss',
  delay: 5 * 60 * 1000,
  handler: handlers['cnn'] // jshint ignore:line
}];

feeds.forEach(({url, delay, handler}) => {
  getAndHandle(url, handler);

  setInterval(() => getAndHandle(url, handler), delay);

  function getAndHandle(url, handler) {
    request.get(url, (error, response, body) => {
      console.log(url, body.substring(0, 200), '...');

      const obj = parseString(body, (err, result) => {
        if (err) return console.error('error parsing', url, err);

        handler(result, url);
      });
    });
  }
});

function postData(data) {
  const hash = keccak(data);

  request.post({url: `http://${host}/keccak/${hash}`, body: data});

  return hash;
}