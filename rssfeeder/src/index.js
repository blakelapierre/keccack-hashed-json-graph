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
        subreddit: result.feed.title[0],
        author: {
          name: author[0]['name'][0], // jshint ignore:line
          uri: author[0]['uri'][0] // jshint ignore:line
        }
        // author: `[${author[0]['name'][0]}](${author[0]['uri']})` // jshint ignore:line
      })); // jshint ignore:line

      postData(JSON.stringify({
        about: `keccak:${hash}`,
        updated: updated[0]
      }));
      // postData(JSON.stringify({received: new Date().getTime(), hash: `keccak:${hash}`}));
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
          channel: channel.title
        }));

        postData(JSON.stringify({
          about: `keccak:${hash}`,
          pubDate: pubDate ? pubDate[0] : undefined
        }));
      });
    });
  },
  'yours': results => {
    results.forEach(({title, amountVoted, titleUrlString, createdAt}) => {
      const hash = postData(JSON.stringify({
        title,
        url: `https://yours.org/content/${titleUrlString}`,
        source: 'yours.org'
      }));

      postData(JSON.stringify({
        about: `keccak:${hash}`,
        amountVoted,
        createdAt
      }));
    });
  },
  'nytimes': result => {
    result.rss.channel.forEach(channel => {
      channel.item.forEach(({title, description, link, pubDate}) => {
        const hash = postData(JSON.stringify({
          title: title ? title[0] : undefined,
          link: link ? link[0] : undefined,
          channel: channel.title[0],
          source: 'nytimes.com'
        }));

        postData(JSON.stringify({
          about: `keccak:${hash}`,
          pubDate: pubDate ? pubDate[0] : undefined
        }));
      });
    });
  }
};

const feeds = {
  'rss': [{
    url: 'http://rss.cnn.com/rss/cnn_topstories.rss',
    delay: 5 * 60 * 1000,
    handler: handlers['cnn'] // jshint ignore:line
  },{
    url: 'http://rss.cnn.com/rss/cnn_allpolitics.rss',
    delay: 5 * 60 * 1000,
    handler: handlers['cnn'] // jshint ignore:line
  },{
    url: 'http://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
    delay: 5 * 60 * 1000,
    handler: handlers['nytimes'] // jshint ignore:line
  }],
  'json': [{
    url: 'https://www.yours.org/api/contents/page/new/0',
    headers: {
      'content-type': 'application/json'
    },
    delay: 5 * 60 * 1000,
    handler: handlers['yours'] // jshint ignore:line
  }]
};

addSubreddits(feeds, ['programming', 'technology', 'politics', 'btc', 'bitcoin', 'science'], 1 * 60 * 1000);

function addSubreddits(feeds, subreddits, delay) {
  feeds['rss'].push(...subreddits.map(name => ({ // jshint ignore:line
    url: `https://www.reddit.com/r/${name}/.rss`,
    delay,
    handler: handlers['reddit'] // jshint ignore:line
  })));
}

const typeHandlers = {
  'rss': (body, {url, handler}) => {
    return parseString(body, (err, result) => {
      if (err) return console.error('error parsing', url, err);

      handler(result, url);
    });
  },
  'json': (body, {url, handler}) => {
    try {
      return handler(JSON.parse(body));
    }
    catch (e) {throw e;}
  }
};

Object.keys(feeds).map(type => feeds[type].map(feed => handleFeed(feed, typeHandlers[type])));

function handleFeed(config, responseHandler) {
  const {url, headers, delay, handler} = config;

  console.log('handle', url);
  getAndHandle(url, handler);

  setInterval(() => getAndHandle(url, handler), delay);

  return {};

  function getAndHandle(url, handler) { // jshint ignore:line
    request.get(Object.assign({url}, {headers}), (error, response, body) => { // jshint ignore:line
      if (error) return console.error(error);
      console.log(url, body.substring(0, 200), '...');
      responseHandler(body, config);
    }); // jshint ignore:line
  }
} // jshint ignore:line

const known = {};
function checkItem(titleUrlString) {
  if (known[titleUrlString]) return true;

  known[titleUrlString] = true;

  // maybe cleanup really old knowns?
}

function postData(data) {
  const hash = keccak(data);

  request.post({url: `http://${host}/keccak/${hash}`, body: data});

  return hash;
}