import stream from 'stream';

import request from 'request';
import say from 'say';

const host = 'localhost:9999';

const store = {
  getData(hash) {
    return new Promise((resolve, reject) => {
      request.get(`http://${host}/keccak/${hash}`, (error, response, body) => {
        console.log('l', body);
        if (error) reject(error);
        resolve(body);
      });
    });
  },

  subscribeJsonKeyValue(keyValue, incomingObjects) {
    const key = Object.keys(keyValue)[0],
          value = keyValue[key];

    return new Promise((resolve, reject) => {
      store.getSubscribeJsonKey(key, hashes => {
        hashes
          .reduce(
            (promise, hash) => 
              promise
                .then(store.getData(hash))
                .then(data => console.log('*', data) & JSON.parse(data))
                .then(object => object && object[key] === value ? incomingObjects([object]) : undefined), Promise.resolve());
      });
    });
  },

  getSubscribeJsonKey(key, incomingData) {
    return new Promise((resolve, reject) => {
      request(`http://${host}/keccak/subscribe/json/${key}`)
        .on('data', data => incomingData(data.toString().split('\n')))
        .on('error', error => console.error(error));
    });
  }
};

say.speak('subscribing', error => {
  if (error) console.error(error);
  console.log('text has been spoken');
});
subscribe();

function subscribe() {
  request(`http://${host}/keccak/subscribe/json/source`)
      .on('data', data => {
        const hashes = data.toString().split('\n');

        console.log(hashes.length, ' hashes');
        hashes.reduce((promise, hash) => promise.then(getData(hash)), Promise.resolve());
      })
      .on('error', error => {
          console.error(error);
          setTimeout(subscribe, 100);
      });
}

function subscribe() {
  return store.subscribeJsonKeyValue({'source': 'yours.org'}, objects => {
    const {length} = objects;

    say.speak(`${length} object${length > 1 ? 's' : ''}`);
  });

  // return (
  //   store
  //     .getSubscribeJsonKey('source', hashes => {
  //       console.log('hashes', hashes);
  //       hashes
  //         .reduce((promise, hash) =>
  //           !hash ? undefined
  //                 : store.getData(hash)
  //                        .then(data =>
  //                          setState(store.transforms['addData'].bind(home, hash, data)))
  //         , Promise.resolve())
  //     })
  //     .then(subscribe)
  //     .then(() => home.state.failCount = 0)
  //     .catch(() => setTimeout(subscribe, (home.state.delay = 100 * Math.pow(2, (home.state.failCount = (home.state.failCount || 0) + 1)))))
  // );
}